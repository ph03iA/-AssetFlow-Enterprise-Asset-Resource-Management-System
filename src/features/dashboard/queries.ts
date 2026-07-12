import "server-only";

import {
  AllocationStatus,
  BookingStatus,
  MaintenanceStatus,
  Role,
  TransferStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

type DashboardActor = {
  id: string;
  organizationId: string;
  departmentId: string | null;
  role: Role;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function assetScope(actor: DashboardActor): Prisma.AssetWhereInput {
  if (actor.role === Role.ADMIN || actor.role === Role.ASSET_MANAGER) {
    return { organizationId: actor.organizationId };
  }

  if (actor.role === Role.DEPARTMENT_HEAD && actor.departmentId) {
    return {
      organizationId: actor.organizationId,
      departmentId: actor.departmentId,
    };
  }

  return {
    organizationId: actor.organizationId,
    OR: [
      {
        allocations: {
          some: {
            assigneeUserId: actor.id,
            status: AllocationStatus.ACTIVE,
          },
        },
      },
      { isBookable: true },
    ],
  };
}

function allocationScope(
  actor: DashboardActor,
): Prisma.AssetAllocationWhereInput {
  const organizationScope = { asset: { organizationId: actor.organizationId } };

  if (actor.role === Role.ADMIN || actor.role === Role.ASSET_MANAGER) {
    return organizationScope;
  }

  if (actor.role === Role.DEPARTMENT_HEAD && actor.departmentId) {
    return {
      ...organizationScope,
      OR: [
        { assigneeDepartmentId: actor.departmentId },
        { assigneeUser: { departmentId: actor.departmentId } },
      ],
    };
  }

  return { ...organizationScope, assigneeUserId: actor.id };
}

function bookingScope(
  actor: DashboardActor,
): Prisma.ResourceBookingWhereInput {
  const organizationScope = { asset: { organizationId: actor.organizationId } };

  if (actor.role === Role.ADMIN || actor.role === Role.ASSET_MANAGER) {
    return organizationScope;
  }

  if (actor.role === Role.DEPARTMENT_HEAD && actor.departmentId) {
    return {
      ...organizationScope,
      OR: [
        { onBehalfOfDepartmentId: actor.departmentId },
        { bookedBy: { departmentId: actor.departmentId } },
      ],
    };
  }

  return { ...organizationScope, bookedById: actor.id };
}

function maintenanceScope(
  actor: DashboardActor,
): Prisma.MaintenanceRequestWhereInput {
  const organizationScope = { asset: { organizationId: actor.organizationId } };

  if (actor.role === Role.ADMIN || actor.role === Role.ASSET_MANAGER) {
    return organizationScope;
  }

  if (actor.role === Role.DEPARTMENT_HEAD && actor.departmentId) {
    return {
      ...organizationScope,
      asset: {
        organizationId: actor.organizationId,
        departmentId: actor.departmentId,
      },
    };
  }

  return { ...organizationScope, requestedById: actor.id };
}

export async function getDashboardData(
  actor: DashboardActor,
  now = new Date(),
) {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const upcomingHorizon = endOfDay(addDays(now, 7));
  const assetWhere = assetScope(actor);
  const allocationWhere = allocationScope(actor);
  const bookingWhere = bookingScope(actor);
  const maintenanceWhere = maintenanceScope(actor);

  const transferWhere: Prisma.TransferRequestWhereInput = {
    asset: { organizationId: actor.organizationId },
    status: TransferStatus.REQUESTED,
    ...(actor.role === Role.DEPARTMENT_HEAD && actor.departmentId
      ? {
          OR: [
            { asset: { departmentId: actor.departmentId } },
            { targetDepartmentId: actor.departmentId },
          ],
        }
      : actor.role === Role.EMPLOYEE
        ? { requestedById: actor.id }
        : {}),
  };

  const [
    assetsAvailable,
    assetsAllocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturns,
    overdueAllocations,
    upcomingAllocationRows,
    maintenanceQueue,
  ] = await Promise.all([
    db.asset.count({ where: { ...assetWhere, status: "AVAILABLE" } }),
    db.assetAllocation.count({
      where: { ...allocationWhere, status: AllocationStatus.ACTIVE },
    }),
    db.maintenanceRequest.count({
      where: {
        ...maintenanceWhere,
        scheduledFor: { gte: todayStart, lte: todayEnd },
        status: {
          in: [
            MaintenanceStatus.APPROVED,
            MaintenanceStatus.TECHNICIAN_ASSIGNED,
            MaintenanceStatus.IN_PROGRESS,
          ],
        },
      },
    }),
    db.resourceBooking.count({
      where: {
        ...bookingWhere,
        status: { in: [BookingStatus.UPCOMING, BookingStatus.ONGOING] },
        endAt: { gt: now },
      },
    }),
    db.transferRequest.count({ where: transferWhere }),
    db.assetAllocation.count({
      where: {
        ...allocationWhere,
        status: AllocationStatus.ACTIVE,
        expectedReturnAt: { gte: now, lte: upcomingHorizon },
      },
    }),
    db.assetAllocation.findMany({
      where: {
        ...allocationWhere,
        status: AllocationStatus.ACTIVE,
        expectedReturnAt: { lt: now },
      },
      take: 6,
      orderBy: { expectedReturnAt: "asc" },
      select: {
        id: true,
        expectedReturnAt: true,
        asset: { select: { id: true, name: true, assetTag: true } },
        assigneeUser: { select: { name: true } },
        assigneeDepartment: { select: { name: true } },
      },
    }),
    db.assetAllocation.findMany({
      where: {
        ...allocationWhere,
        status: AllocationStatus.ACTIVE,
        expectedReturnAt: { gte: now, lte: upcomingHorizon },
      },
      take: 5,
      orderBy: { expectedReturnAt: "asc" },
      select: {
        id: true,
        expectedReturnAt: true,
        asset: { select: { id: true, name: true, assetTag: true } },
        assigneeUser: { select: { name: true } },
        assigneeDepartment: { select: { name: true } },
      },
    }),
    db.maintenanceRequest.findMany({
      where: {
        ...maintenanceWhere,
        status: {
          in: [
            MaintenanceStatus.PENDING,
            MaintenanceStatus.APPROVED,
            MaintenanceStatus.TECHNICIAN_ASSIGNED,
            MaintenanceStatus.IN_PROGRESS,
          ],
        },
      },
      take: 5,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        issue: true,
        priority: true,
        status: true,
        scheduledFor: true,
        asset: { select: { name: true, assetTag: true } },
      },
    }),
  ]);

  return {
    metrics: {
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
    },
    overdueAllocations,
    upcomingAllocationRows,
    maintenanceQueue,
  };
}
