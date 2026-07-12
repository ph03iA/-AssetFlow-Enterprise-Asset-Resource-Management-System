import "server-only";

import { deriveBookingStatus } from "@/domain/booking-rules";
import { DomainError } from "@/domain/errors";
import { canAct, type PermissionActor } from "@/domain/permissions";
import {
  AssetStatus,
  BookingStatus,
  NotificationType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type {
  BookingCancellationInput,
  BookingInput,
  BookingRescheduleInput,
} from "./schemas";

const unavailableResourceStatuses = [
  AssetStatus.UNDER_MAINTENANCE,
  AssetStatus.LOST,
  AssetStatus.RETIRED,
  AssetStatus.DISPOSED,
] as const;

type ManageableBooking = {
  bookedById: string;
  onBehalfOfDepartmentId: string | null;
};

function canManageBooking(
  actor: PermissionActor,
  booking: ManageableBooking,
) {
  if (
    booking.bookedById === actor.id &&
    canAct(actor, "bookings.manage-own")
  ) {
    return true;
  }

  return Boolean(
    actor.departmentId &&
      booking.onBehalfOfDepartmentId === actor.departmentId &&
      canAct(actor, "bookings.manage-department"),
  );
}

function assertFutureStart(startAt: Date, now: Date) {
  if (startAt <= now) {
    throw new DomainError(
      "Choose a start time in the future.",
      "BOOKING_START_IN_PAST",
    );
  }
}

async function lockResource(
  transaction: Prisma.TransactionClient,
  assetId: string,
) {
  const locked = await transaction.$executeRaw`
    UPDATE "Asset"
    SET "updatedAt" = "updatedAt"
    WHERE "id" = ${assetId}
  `;
  if (locked !== 1) {
    throw new DomainError("Resource was not found.", "NOT_FOUND");
  }
}

async function validateBookableResource(
  transaction: Prisma.TransactionClient,
  actor: PermissionActor,
  assetId: string,
) {
  const asset = await transaction.asset.findFirst({
    where: {
      id: assetId,
      organizationId: actor.organizationId,
      isBookable: true,
      status: { notIn: [...unavailableResourceStatuses] },
    },
    select: {
      id: true,
      assetTag: true,
      name: true,
      location: true,
      status: true,
    },
  });

  if (!asset) {
    throw new DomainError(
      "This resource is not bookable or is currently unavailable.",
      "RESOURCE_UNAVAILABLE",
    );
  }
  return asset;
}

async function validateBookingDepartment(
  transaction: Prisma.TransactionClient,
  actor: PermissionActor,
  departmentId: string | null,
) {
  if (!departmentId) return null;
  if (
    !actor.departmentId ||
    actor.departmentId !== departmentId ||
    !canAct(actor, "bookings.manage-department")
  ) {
    throw new DomainError(
      "You can book only on behalf of your own department.",
      "OUT_OF_SCOPE",
    );
  }

  const department = await transaction.department.findFirst({
    where: {
      id: departmentId,
      organizationId: actor.organizationId,
      isActive: true,
    },
    select: { id: true, name: true },
  });
  if (!department) {
    throw new DomainError(
      "Choose an active department in this organization.",
      "INVALID_DEPARTMENT",
    );
  }
  return department;
}

async function findConflict(
  transaction: Prisma.TransactionClient,
  assetId: string,
  startAt: Date,
  endAt: Date,
  excludedBookingId?: string,
) {
  return transaction.resourceBooking.findFirst({
    where: {
      assetId,
      status: { not: BookingStatus.CANCELLED },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludedBookingId ? { id: { not: excludedBookingId } } : {}),
    },
    orderBy: { startAt: "asc" },
    include: {
      bookedBy: { select: { name: true } },
      onBehalfOfDepartment: { select: { name: true } },
    },
  });
}

function throwBookingConflict(
  conflict: NonNullable<Awaited<ReturnType<typeof findConflict>>>,
) {
  const holder =
    conflict.onBehalfOfDepartment?.name ?? conflict.bookedBy.name;
  throw new DomainError(
    `That slot overlaps ${holder}'s booking from ${conflict.startAt.toLocaleString("en-IN")} to ${conflict.endAt.toLocaleString("en-IN")}.`,
    "BOOKING_CONFLICT",
    {
      bookingId: conflict.id,
      startAt: conflict.startAt.toISOString(),
      endAt: conflict.endAt.toISOString(),
    },
  );
}

export async function getBookingOptions(
  actor: PermissionActor,
  preferredAssetId?: string,
) {
  if (!canAct(actor, "bookings.create")) {
    throw new DomainError("You cannot book shared resources.", "FORBIDDEN");
  }

  const [resources, department, preferredAsset, organization] =
    await Promise.all([
      db.asset.findMany({
        where: {
          organizationId: actor.organizationId,
          isBookable: true,
          status: { notIn: [...unavailableResourceStatuses] },
        },
        orderBy: [{ name: "asc" }, { assetTag: "asc" }],
        select: {
          id: true,
          assetTag: true,
          name: true,
          location: true,
          status: true,
          category: { select: { name: true } },
        },
      }),
      actor.departmentId && canAct(actor, "bookings.manage-department")
        ? db.department.findFirst({
            where: {
              id: actor.departmentId,
              organizationId: actor.organizationId,
              isActive: true,
            },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      preferredAssetId
        ? db.asset.findFirst({
            where: {
              id: preferredAssetId,
              organizationId: actor.organizationId,
            },
            select: {
              id: true,
              assetTag: true,
              name: true,
              location: true,
              status: true,
              isBookable: true,
            },
          })
        : Promise.resolve(null),
      db.organization.findUnique({
        where: { id: actor.organizationId },
        select: { timezone: true },
      }),
    ]);

  return {
    resources,
    departments: department ? [department] : [],
    preferredAsset,
    timezone: organization?.timezone ?? "Asia/Kolkata",
  };
}

export async function getBookingWorkspace(
  actor: PermissionActor,
  input: { weekStart: Date; resourceId: string | null },
  now = new Date(),
) {
  if (!canAct(actor, "bookings.create")) {
    throw new DomainError("You cannot view resource bookings.", "FORBIDDEN");
  }
  const weekEnd = new Date(input.weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [resources, bookings, organization] = await Promise.all([
    db.asset.findMany({
      where: {
        organizationId: actor.organizationId,
        isBookable: true,
      },
      orderBy: [{ name: "asc" }, { assetTag: "asc" }],
      select: {
        id: true,
        assetTag: true,
        name: true,
        location: true,
        status: true,
      },
    }),
    db.resourceBooking.findMany({
      where: {
        asset: { organizationId: actor.organizationId },
        status: { not: BookingStatus.CANCELLED },
        startAt: { lt: weekEnd },
        endAt: { gt: input.weekStart },
        ...(input.resourceId ? { assetId: input.resourceId } : {}),
      },
      orderBy: [{ startAt: "asc" }, { asset: { name: "asc" } }],
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            location: true,
          },
        },
        bookedBy: { select: { id: true, name: true } },
        onBehalfOfDepartment: { select: { id: true, name: true } },
      },
    }),
    db.organization.findUnique({
      where: { id: actor.organizationId },
      select: { timezone: true },
    }),
  ]);

  const normalizedBookings = bookings.map((booking) => ({
    ...booking,
    status: deriveBookingStatus(booking, now),
    manageable: canManageBooking(actor, booking),
  }));

  return {
    weekStart: input.weekStart,
    weekEnd,
    resources,
    bookings: normalizedBookings,
    timezone: organization?.timezone ?? "Asia/Kolkata",
    summary: {
      total: normalizedBookings.length,
      mine: normalizedBookings.filter(
        (booking) => booking.bookedById === actor.id,
      ).length,
      ongoing: normalizedBookings.filter(
        (booking) => booking.status === BookingStatus.ONGOING,
      ).length,
      availableResources: resources.filter(
        (resource) =>
          !unavailableResourceStatuses.includes(
            resource.status as (typeof unavailableResourceStatuses)[number],
          ),
      ).length,
    },
  };
}

export async function createBooking(
  actor: PermissionActor,
  input: BookingInput,
  now = new Date(),
) {
  if (!canAct(actor, "bookings.create")) {
    throw new DomainError("You cannot book shared resources.", "FORBIDDEN");
  }
  assertFutureStart(input.startAt, now);

  const scopedAsset = await db.asset.findFirst({
    where: { id: input.assetId, organizationId: actor.organizationId },
    select: { id: true },
  });
  if (!scopedAsset) {
    throw new DomainError("Resource was not found.", "NOT_FOUND");
  }

  return db.$transaction(async (transaction) => {
    await lockResource(transaction, scopedAsset.id);
    const [asset, department] = await Promise.all([
      validateBookableResource(transaction, actor, scopedAsset.id),
      validateBookingDepartment(
        transaction,
        actor,
        input.onBehalfOfDepartmentId,
      ),
    ]);
    const conflict = await findConflict(
      transaction,
      asset.id,
      input.startAt,
      input.endAt,
    );
    if (conflict) throwBookingConflict(conflict);

    const booking = await transaction.resourceBooking.create({
      data: {
        assetId: asset.id,
        bookedById: actor.id,
        onBehalfOfDepartmentId: department?.id,
        purpose: input.purpose,
        startAt: input.startAt,
        endAt: input.endAt,
        status: BookingStatus.UPCOMING,
      },
    });
    await transaction.notification.create({
      data: {
        userId: actor.id,
        type: NotificationType.BOOKING_CONFIRMED,
        title: `${asset.assetTag} booking confirmed`,
        body: `${asset.name} is reserved for ${input.startAt.toLocaleString("en-IN")}.`,
        entityType: "booking",
        entityId: booking.id,
        actionUrl: "/bookings",
        dedupeKey: `booking:${booking.id}:confirmed`,
      },
    });
    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "booking.created",
        entityType: "booking",
        entityId: booking.id,
        metadata: JSON.stringify({
          assetId: asset.id,
          startAt: input.startAt.toISOString(),
          endAt: input.endAt.toISOString(),
          onBehalfOfDepartmentId: department?.id ?? null,
        }),
      },
    });
    return booking;
  });
}

export async function rescheduleBooking(
  actor: PermissionActor,
  input: BookingRescheduleInput,
  now = new Date(),
) {
  if (!canAct(actor, "bookings.manage-own") && !canAct(actor, "bookings.manage-department")) {
    throw new DomainError("You cannot reschedule bookings.", "FORBIDDEN");
  }
  assertFutureStart(input.startAt, now);

  const existing = await db.resourceBooking.findFirst({
    where: {
      id: input.bookingId,
      asset: { organizationId: actor.organizationId },
    },
    include: { asset: { select: { id: true, assetTag: true, name: true } } },
  });
  if (!existing) throw new DomainError("Booking was not found.", "NOT_FOUND");
  if (!canManageBooking(actor, existing)) {
    throw new DomainError("You cannot manage this booking.", "FORBIDDEN");
  }
  if (deriveBookingStatus(existing, now) !== BookingStatus.UPCOMING) {
    throw new DomainError(
      "Only upcoming bookings can be rescheduled.",
      "BOOKING_NOT_UPCOMING",
    );
  }

  return db.$transaction(async (transaction) => {
    await lockResource(transaction, existing.assetId);
    await validateBookableResource(transaction, actor, existing.assetId);
    const current = await transaction.resourceBooking.findFirst({
      where: {
        id: existing.id,
        asset: { organizationId: actor.organizationId },
      },
    });
    if (!current || !canManageBooking(actor, current)) {
      throw new DomainError("Booking is no longer manageable.", "FORBIDDEN");
    }
    if (deriveBookingStatus(current, now) !== BookingStatus.UPCOMING) {
      throw new DomainError(
        "Only upcoming bookings can be rescheduled.",
        "BOOKING_NOT_UPCOMING",
      );
    }
    const conflict = await findConflict(
      transaction,
      current.assetId,
      input.startAt,
      input.endAt,
      current.id,
    );
    if (conflict) throwBookingConflict(conflict);

    const updated = await transaction.resourceBooking.update({
      where: { id: current.id },
      data: {
        startAt: input.startAt,
        endAt: input.endAt,
        status: BookingStatus.UPCOMING,
        reminderSentAt: null,
      },
    });
    await transaction.notification.create({
      data: {
        userId: current.bookedById,
        type: NotificationType.BOOKING_CONFIRMED,
        title: `${existing.asset.assetTag} booking rescheduled`,
        body: `${existing.asset.name} is now reserved for ${input.startAt.toLocaleString("en-IN")}.`,
        entityType: "booking",
        entityId: current.id,
        actionUrl: "/bookings",
        dedupeKey: `booking:${current.id}:rescheduled:${input.startAt.getTime()}`,
      },
    });
    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "booking.rescheduled",
        entityType: "booking",
        entityId: current.id,
        metadata: JSON.stringify({
          previousStartAt: current.startAt.toISOString(),
          previousEndAt: current.endAt.toISOString(),
          startAt: input.startAt.toISOString(),
          endAt: input.endAt.toISOString(),
        }),
      },
    });
    return updated;
  });
}

export async function cancelBooking(
  actor: PermissionActor,
  input: BookingCancellationInput,
  now = new Date(),
) {
  if (!canAct(actor, "bookings.manage-own") && !canAct(actor, "bookings.manage-department")) {
    throw new DomainError("You cannot cancel bookings.", "FORBIDDEN");
  }

  const existing = await db.resourceBooking.findFirst({
    where: {
      id: input.bookingId,
      asset: { organizationId: actor.organizationId },
    },
    include: { asset: { select: { assetTag: true, name: true } } },
  });
  if (!existing) throw new DomainError("Booking was not found.", "NOT_FOUND");
  if (!canManageBooking(actor, existing)) {
    throw new DomainError("You cannot manage this booking.", "FORBIDDEN");
  }
  const operationalStatus = deriveBookingStatus(existing, now);
  if (
    operationalStatus === BookingStatus.COMPLETED ||
    operationalStatus === BookingStatus.CANCELLED
  ) {
    throw new DomainError(
      "Completed or cancelled bookings cannot be changed.",
      "BOOKING_IMMUTABLE",
    );
  }

  return db.$transaction(async (transaction) => {
    await lockResource(transaction, existing.assetId);
    const current = await transaction.resourceBooking.findFirst({
      where: {
        id: existing.id,
        asset: { organizationId: actor.organizationId },
      },
    });
    if (!current || !canManageBooking(actor, current)) {
      throw new DomainError("Booking is no longer manageable.", "FORBIDDEN");
    }
    const currentStatus = deriveBookingStatus(current, now);
    if (
      currentStatus === BookingStatus.COMPLETED ||
      currentStatus === BookingStatus.CANCELLED
    ) {
      throw new DomainError(
        "Completed or cancelled bookings cannot be changed.",
        "BOOKING_IMMUTABLE",
      );
    }

    const cancelled = await transaction.resourceBooking.update({
      where: { id: current.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: input.reason,
      },
    });
    await transaction.notification.create({
      data: {
        userId: current.bookedById,
        type: NotificationType.BOOKING_CANCELLED,
        title: `${existing.asset.assetTag} booking cancelled`,
        body: input.reason,
        entityType: "booking",
        entityId: current.id,
        actionUrl: "/bookings",
        dedupeKey: `booking:${current.id}:cancelled`,
      },
    });
    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "booking.cancelled",
        entityType: "booking",
        entityId: current.id,
        metadata: JSON.stringify({ reason: input.reason }),
      },
    });
    return cancelled;
  });
}

export async function reconcileBookingOperationalState(
  organizationId: string,
  now = new Date(),
) {
  const reminderWindowEnd = new Date(now.getTime() + 60 * 60 * 1000);

  return db.$transaction(async (transaction) => {
    const completed = await transaction.resourceBooking.updateMany({
      where: {
        asset: { organizationId },
        status: { in: [BookingStatus.UPCOMING, BookingStatus.ONGOING] },
        endAt: { lte: now },
      },
      data: { status: BookingStatus.COMPLETED },
    });
    const ongoing = await transaction.resourceBooking.updateMany({
      where: {
        asset: { organizationId },
        status: BookingStatus.UPCOMING,
        startAt: { lte: now },
        endAt: { gt: now },
      },
      data: { status: BookingStatus.ONGOING },
    });
    const reminderCandidates = await transaction.resourceBooking.findMany({
      where: {
        asset: { organizationId },
        status: BookingStatus.UPCOMING,
        reminderSentAt: null,
        startAt: { gt: now, lte: reminderWindowEnd },
      },
      select: {
        id: true,
        bookedById: true,
        startAt: true,
        asset: { select: { assetTag: true, name: true } },
      },
    });

    let reminders = 0;
    for (const booking of reminderCandidates) {
      const claimed = await transaction.resourceBooking.updateMany({
        where: {
          id: booking.id,
          status: BookingStatus.UPCOMING,
          reminderSentAt: null,
        },
        data: { reminderSentAt: now },
      });
      if (claimed.count !== 1) continue;
      await transaction.notification.create({
        data: {
          userId: booking.bookedById,
          type: NotificationType.BOOKING_REMINDER,
          title: `${booking.asset.assetTag} booking starts soon`,
          body: `${booking.asset.name} starts at ${booking.startAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`,
          entityType: "booking",
          entityId: booking.id,
          actionUrl: "/bookings",
          dedupeKey: `booking:${booking.id}:reminder`,
        },
      });
      reminders += 1;
    }

    return {
      completed: completed.count,
      ongoing: ongoing.count,
      reminders,
    };
  });
}
