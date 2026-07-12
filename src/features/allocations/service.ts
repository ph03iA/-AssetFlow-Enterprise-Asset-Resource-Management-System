import "server-only";

import { DomainError } from "@/domain/errors";
import { canAct, canAccessDepartment, type PermissionActor } from "@/domain/permissions";
import {
  AllocationStatus,
  AssetStatus,
  NotificationType,
  ReturnStatus,
  Role,
  TransferStatus,
  UserStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type {
  AllocationInput,
  DecisionInput,
  ReturnRequestInput,
  TransferInput,
} from "./schemas";

function allocationScope(actor: PermissionActor): Prisma.AssetAllocationWhereInput {
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

function holderName(allocation: {
  assigneeUser: { name: string } | null;
  assigneeDepartment: { name: string } | null;
}) {
  return (
    allocation.assigneeUser?.name ??
    allocation.assigneeDepartment?.name ??
    "another holder"
  );
}

async function validateTarget(
  actor: PermissionActor,
  userId: string | null,
  departmentId: string | null,
) {
  const [user, department] = await Promise.all([
    userId
      ? db.user.findFirst({
          where: {
            id: userId,
            organizationId: actor.organizationId,
            status: UserStatus.ACTIVE,
          },
          select: { id: true, name: true, departmentId: true },
        })
      : Promise.resolve(null),
    departmentId
      ? db.department.findFirst({
          where: {
            id: departmentId,
            organizationId: actor.organizationId,
            isActive: true,
          },
          select: { id: true, name: true, headId: true },
        })
      : Promise.resolve(null),
  ]);

  if ((userId && !user) || (departmentId && !department)) {
    throw new DomainError(
      "Choose an active employee or department from this organization.",
      "INVALID_ASSIGNEE",
    );
  }

  const targetDepartmentId = department?.id ?? user?.departmentId ?? null;
  if (
    actor.role === Role.DEPARTMENT_HEAD &&
    (!actor.departmentId || targetDepartmentId !== actor.departmentId)
  ) {
    throw new DomainError(
      "Department Heads can manage custody only within their own department.",
      "OUT_OF_SCOPE",
    );
  }

  return { user, department, targetDepartmentId };
}

export async function getAllocationWorkspace(actor: PermissionActor) {
  if (!canAct(actor, "assets.read")) {
    throw new DomainError("You cannot view allocations.", "FORBIDDEN");
  }
  const scope = allocationScope(actor);
  const now = new Date();

  const [allocations, transferRequests, returnRequests] = await Promise.all([
    db.assetAllocation.findMany({
      where: { ...scope, status: AllocationStatus.ACTIVE },
      orderBy: [{ expectedReturnAt: "asc" }, { allocatedAt: "desc" }],
      select: {
        id: true,
        expectedReturnAt: true,
        allocatedAt: true,
        checkoutCondition: true,
        asset: {
          select: { id: true, assetTag: true, name: true, status: true },
        },
        assigneeUser: { select: { id: true, name: true, departmentId: true } },
        assigneeDepartment: { select: { id: true, name: true } },
        transferRequests: {
          where: { status: TransferStatus.REQUESTED },
          select: { id: true },
        },
        returnRequests: {
          where: { status: ReturnStatus.REQUESTED },
          select: { id: true },
        },
      },
    }),
    db.transferRequest.findMany({
      where: {
        allocation: scope,
        ...(actor.role === Role.EMPLOYEE ? { requestedById: actor.id } : {}),
      },
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        asset: { select: { assetTag: true, name: true } },
        requestedBy: { select: { name: true } },
        targetUser: { select: { name: true } },
        targetDepartment: { select: { name: true } },
      },
    }),
    db.returnRequest.findMany({
      where: {
        allocation: scope,
        ...(actor.role === Role.EMPLOYEE ? { requestedById: actor.id } : {}),
      },
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        allocation: {
          include: { asset: { select: { assetTag: true, name: true } } },
        },
        requestedBy: { select: { name: true } },
      },
    }),
  ]);

  return {
    allocations: allocations.map((allocation) => ({
      ...allocation,
      overdue: Boolean(
        allocation.expectedReturnAt && allocation.expectedReturnAt < now,
      ),
    })),
    transferRequests,
    returnRequests,
  };
}

export async function getAllocationOptions(
  actor: PermissionActor,
  preferredAssetId?: string,
) {
  if (!canAct(actor, "assets.allocate")) {
    throw new DomainError("You cannot allocate assets.", "FORBIDDEN");
  }

  const departmentFilter =
    actor.role === Role.DEPARTMENT_HEAD ? actor.departmentId : undefined;
  const [assets, employees, departments, preferredAsset] = await Promise.all([
    db.asset.findMany({
      where: {
        organizationId: actor.organizationId,
        status: AssetStatus.AVAILABLE,
        ...(departmentFilter ? { departmentId: departmentFilter } : {}),
      },
      orderBy: { assetTag: "asc" },
      select: { id: true, assetTag: true, name: true, condition: true },
    }),
    db.user.findMany({
      where: {
        organizationId: actor.organizationId,
        status: UserStatus.ACTIVE,
        ...(departmentFilter ? { departmentId: departmentFilter } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, departmentId: true, department: { select: { name: true } } },
    }),
    db.department.findMany({
      where: {
        organizationId: actor.organizationId,
        isActive: true,
        ...(departmentFilter ? { id: departmentFilter } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    preferredAssetId
      ? db.asset.findFirst({
          where: { id: preferredAssetId, organizationId: actor.organizationId },
          select: {
            id: true,
            assetTag: true,
            name: true,
            status: true,
            allocations: {
              where: { status: AllocationStatus.ACTIVE },
              take: 1,
              select: {
                id: true,
                assigneeUser: { select: { name: true } },
                assigneeDepartment: { select: { name: true } },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return { assets, employees, departments, preferredAsset };
}

export async function allocateAsset(
  actor: PermissionActor,
  input: AllocationInput,
) {
  if (!canAct(actor, "assets.allocate")) {
    throw new DomainError("You cannot allocate assets.", "FORBIDDEN");
  }

  const [asset, target] = await Promise.all([
    db.asset.findFirst({
      where: { id: input.assetId, organizationId: actor.organizationId },
      select: {
        id: true,
        assetTag: true,
        name: true,
        status: true,
        condition: true,
        departmentId: true,
        allocations: {
          where: { status: AllocationStatus.ACTIVE },
          take: 1,
          select: {
            id: true,
            assigneeUser: { select: { name: true } },
            assigneeDepartment: { select: { name: true } },
          },
        },
      },
    }),
    validateTarget(actor, input.assigneeUserId, input.assigneeDepartmentId),
  ]);

  if (!asset) {
    throw new DomainError("Asset was not found.", "NOT_FOUND");
  }
  if (
    actor.role === Role.DEPARTMENT_HEAD &&
    asset.departmentId !== actor.departmentId
  ) {
    throw new DomainError("This asset is outside your department.", "OUT_OF_SCOPE");
  }
  if (asset.status !== AssetStatus.AVAILABLE || asset.allocations[0]) {
    const current = asset.allocations[0];
    throw new DomainError(
      current
        ? `${asset.assetTag} is currently held by ${holderName(current)}. Create a transfer request instead.`
        : `${asset.assetTag} is ${asset.status.toLowerCase().replaceAll("_", " ")} and cannot be allocated.`,
      "ASSET_ALREADY_ALLOCATED",
      current ? { allocationId: current.id, holder: holderName(current) } : undefined,
    );
  }

  try {
    return await db.$transaction(async (transaction) => {
      const allocation = await transaction.assetAllocation.create({
        data: {
          assetId: asset.id,
          assigneeUserId: input.assigneeUserId,
          assigneeDepartmentId: input.assigneeDepartmentId,
          expectedReturnAt: input.expectedReturnAt,
          checkoutCondition: asset.condition,
          checkoutNotes: input.checkoutNotes || null,
          createdById: actor.id,
        },
      });
      await transaction.asset.update({
        where: { id: asset.id },
        data: {
          status: AssetStatus.ALLOCATED,
          departmentId: target.targetDepartmentId ?? asset.departmentId,
        },
      });
      await transaction.assetStatusHistory.create({
        data: {
          assetId: asset.id,
          fromStatus: AssetStatus.AVAILABLE,
          toStatus: AssetStatus.ALLOCATED,
          reason: `Allocated to ${target.user?.name ?? target.department?.name}`,
          actorId: actor.id,
        },
      });
      if (target.user) {
        await transaction.notification.create({
          data: {
            userId: target.user.id,
            type: NotificationType.ASSET_ASSIGNED,
            title: `${asset.assetTag} assigned to you`,
            body: `${asset.name} is now recorded in your custody.`,
            entityType: "allocation",
            entityId: allocation.id,
            actionUrl: `/allocations/${allocation.id}`,
            dedupeKey: `allocation:${allocation.id}:assigned:${target.user.id}`,
          },
        });
      }
      await transaction.activityLog.create({
        data: {
          organizationId: actor.organizationId,
          actorId: actor.id,
          action: "asset.allocated",
          entityType: "allocation",
          entityId: allocation.id,
          metadata: JSON.stringify({ assetId: asset.id, assetTag: asset.assetTag }),
        },
      });
      return allocation;
    });
  } catch (error) {
    const conflict = await db.assetAllocation.findFirst({
      where: { assetId: asset.id, status: AllocationStatus.ACTIVE },
      include: {
        assigneeUser: { select: { name: true } },
        assigneeDepartment: { select: { name: true } },
      },
    });
    if (conflict) {
      throw new DomainError(
        `${asset.assetTag} was just allocated to ${holderName(conflict)}. Create a transfer request instead.`,
        "ASSET_ALREADY_ALLOCATED",
        { allocationId: conflict.id, holder: holderName(conflict) },
      );
    }
    throw error;
  }
}

export async function requestTransfer(
  actor: PermissionActor,
  input: TransferInput,
) {
  if (!canAct(actor, "transfers.request")) {
    throw new DomainError("You cannot request transfers.", "FORBIDDEN");
  }
  const allocation = await db.assetAllocation.findFirst({
    where: {
      id: input.allocationId,
      status: AllocationStatus.ACTIVE,
      asset: { organizationId: actor.organizationId },
    },
    include: {
      asset: { select: { id: true, assetTag: true, name: true } },
      assigneeUser: { select: { id: true, name: true, departmentId: true } },
      assigneeDepartment: { select: { id: true, name: true } },
    },
  });
  if (!allocation) throw new DomainError("Active allocation not found.", "NOT_FOUND");

  const sourceDepartmentId =
    allocation.assigneeDepartmentId ?? allocation.assigneeUser?.departmentId ?? null;
  if (
    actor.role === Role.EMPLOYEE &&
    allocation.assigneeUserId !== actor.id
  ) {
    throw new DomainError("Only the current holder can request this transfer.", "FORBIDDEN");
  }
  if (
    actor.role === Role.DEPARTMENT_HEAD &&
    (!sourceDepartmentId || !canAccessDepartment(actor, sourceDepartmentId))
  ) {
    throw new DomainError("This allocation is outside your department.", "OUT_OF_SCOPE");
  }

  const target = await validateTarget(actor, input.targetUserId, input.targetDepartmentId);
  if (
    input.targetUserId === allocation.assigneeUserId ||
    input.targetDepartmentId === allocation.assigneeDepartmentId
  ) {
    throw new DomainError("Choose a different transfer target.", "SAME_TARGET");
  }

  const approvers = await db.user.findMany({
    where: {
      organizationId: actor.organizationId,
      status: UserStatus.ACTIVE,
      OR: [
        { role: Role.ASSET_MANAGER },
        ...(sourceDepartmentId
          ? [{ role: Role.DEPARTMENT_HEAD, departmentId: sourceDepartmentId }]
          : []),
      ],
    },
    select: { id: true },
  });

  return db.$transaction(async (transaction) => {
    const request = await transaction.transferRequest.create({
      data: {
        assetId: allocation.asset.id,
        allocationId: allocation.id,
        requestedById: actor.id,
        targetUserId: target.user?.id,
        targetDepartmentId: target.department?.id,
        reason: input.reason,
      },
    });
    if (approvers.length) {
      await transaction.notification.createMany({
        data: approvers.map((approver) => ({
          userId: approver.id,
          type: NotificationType.TRANSFER_REQUESTED,
          title: `Transfer requested for ${allocation.asset.assetTag}`,
          body: `${allocation.asset.name} needs a custody decision.`,
          entityType: "transfer",
          entityId: request.id,
          actionUrl: "/allocations?tab=transfers",
          dedupeKey: `transfer:${request.id}:requested:${approver.id}`,
        })),
      });
    }
    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "transfer.requested",
        entityType: "transfer",
        entityId: request.id,
      },
    });
    return request;
  });
}

export async function decideTransfer(
  actor: PermissionActor,
  input: DecisionInput,
) {
  if (!canAct(actor, "transfers.decide")) {
    throw new DomainError("You cannot decide transfer requests.", "FORBIDDEN");
  }
  const request = await db.transferRequest.findFirst({
    where: {
      id: input.requestId,
      status: TransferStatus.REQUESTED,
      asset: { organizationId: actor.organizationId },
    },
    include: {
      asset: true,
      allocation: {
        include: { assigneeUser: { select: { departmentId: true } } },
      },
      targetUser: { select: { id: true, name: true, departmentId: true } },
      targetDepartment: { select: { id: true, name: true } },
    },
  });
  if (!request) throw new DomainError("Open transfer request not found.", "NOT_FOUND");

  const sourceDepartmentId =
    request.allocation.assigneeDepartmentId ??
    request.allocation.assigneeUser?.departmentId ??
    null;
  if (
    actor.role === Role.DEPARTMENT_HEAD &&
    actor.departmentId !== sourceDepartmentId &&
    actor.departmentId !== request.targetDepartmentId
  ) {
    throw new DomainError("This transfer is outside your department.", "OUT_OF_SCOPE");
  }

  const now = new Date();
  return db.$transaction(async (transaction) => {
    if (!input.approved) {
      const rejected = await transaction.transferRequest.update({
        where: { id: request.id },
        data: {
          status: TransferStatus.REJECTED,
          decidedById: actor.id,
          decisionNotes: input.decisionNotes || null,
          decidedAt: now,
        },
      });
      await transaction.notification.create({
        data: {
          userId: request.requestedById,
          type: NotificationType.TRANSFER_REJECTED,
          title: `Transfer rejected for ${request.asset.assetTag}`,
          body: input.decisionNotes || "The current custody remains unchanged.",
          entityType: "transfer",
          entityId: request.id,
          actionUrl: "/allocations?tab=transfers",
          dedupeKey: `transfer:${request.id}:rejected`,
        },
      });
      return rejected;
    }

    await transaction.assetAllocation.update({
      where: { id: request.allocationId },
      data: {
        status: AllocationStatus.TRANSFERRED,
        returnedAt: now,
        closedById: actor.id,
        returnNotes: `Transferred: ${input.decisionNotes || request.reason}`,
      },
    });
    const newAllocation = await transaction.assetAllocation.create({
      data: {
        assetId: request.assetId,
        assigneeUserId: request.targetUserId,
        assigneeDepartmentId: request.targetDepartmentId,
        checkoutCondition: request.asset.condition,
        checkoutNotes: `Transfer from allocation ${request.allocationId}`,
        createdById: actor.id,
      },
    });
    await transaction.asset.update({
      where: { id: request.assetId },
      data: {
        departmentId:
          request.targetDepartmentId ??
          request.targetUser?.departmentId ??
          request.asset.departmentId,
      },
    });
    const approved = await transaction.transferRequest.update({
      where: { id: request.id },
      data: {
        status: TransferStatus.APPROVED,
        decidedById: actor.id,
        decisionNotes: input.decisionNotes || null,
        decidedAt: now,
      },
    });
    await transaction.assetStatusHistory.create({
      data: {
        assetId: request.assetId,
        fromStatus: AssetStatus.ALLOCATED,
        toStatus: AssetStatus.ALLOCATED,
        reason: `Custody transferred to ${request.targetUser?.name ?? request.targetDepartment?.name}`,
        actorId: actor.id,
      },
    });
    const notificationRecipients = new Set([
      request.requestedById,
      ...(request.targetUserId ? [request.targetUserId] : []),
    ]);
    await transaction.notification.createMany({
      data: [...notificationRecipients].map((userId) => ({
        userId,
        type: NotificationType.TRANSFER_APPROVED,
        title: `Transfer approved for ${request.asset.assetTag}`,
        body: `${request.asset.name} custody has been updated.`,
        entityType: "allocation",
        entityId: newAllocation.id,
        actionUrl: `/allocations/${newAllocation.id}`,
        dedupeKey: `transfer:${request.id}:approved:${userId}`,
      })),
    });
    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "transfer.approved",
        entityType: "transfer",
        entityId: request.id,
        metadata: JSON.stringify({ newAllocationId: newAllocation.id }),
      },
    });
    return approved;
  });
}

export async function requestReturn(
  actor: PermissionActor,
  input: ReturnRequestInput,
) {
  if (!canAct(actor, "returns.request")) {
    throw new DomainError("You cannot request returns.", "FORBIDDEN");
  }
  const allocation = await db.assetAllocation.findFirst({
    where: {
      id: input.allocationId,
      status: AllocationStatus.ACTIVE,
      asset: { organizationId: actor.organizationId },
    },
    include: { asset: { select: { assetTag: true, name: true } } },
  });
  if (!allocation) throw new DomainError("Active allocation not found.", "NOT_FOUND");
  if (actor.role === Role.EMPLOYEE && allocation.assigneeUserId !== actor.id) {
    throw new DomainError("Only the current holder can request this return.", "FORBIDDEN");
  }

  const managers = await db.user.findMany({
    where: {
      organizationId: actor.organizationId,
      role: Role.ASSET_MANAGER,
      status: UserStatus.ACTIVE,
    },
    select: { id: true },
  });

  return db.$transaction(async (transaction) => {
    const request = await transaction.returnRequest.create({
      data: {
        allocationId: allocation.id,
        requestedById: actor.id,
        condition: input.condition,
        checkInNotes: input.checkInNotes,
      },
    });
    if (managers.length) {
      await transaction.notification.createMany({
        data: managers.map((manager) => ({
          userId: manager.id,
          type: NotificationType.RETURN_REQUESTED,
          title: `Return requested for ${allocation.asset.assetTag}`,
          body: `${allocation.asset.name} needs a condition check-in decision.`,
          entityType: "return",
          entityId: request.id,
          actionUrl: "/allocations?tab=returns",
          dedupeKey: `return:${request.id}:requested:${manager.id}`,
        })),
      });
    }
    return request;
  });
}

export async function decideReturn(
  actor: PermissionActor,
  input: DecisionInput,
) {
  if (!canAct(actor, "returns.decide")) {
    throw new DomainError("Only an Asset Manager can approve returns.", "FORBIDDEN");
  }
  const request = await db.returnRequest.findFirst({
    where: {
      id: input.requestId,
      status: ReturnStatus.REQUESTED,
      allocation: { asset: { organizationId: actor.organizationId } },
    },
    include: {
      allocation: { include: { asset: true } },
    },
  });
  if (!request) throw new DomainError("Open return request not found.", "NOT_FOUND");
  const now = new Date();

  return db.$transaction(async (transaction) => {
    if (!input.approved) {
      const rejected = await transaction.returnRequest.update({
        where: { id: request.id },
        data: {
          status: ReturnStatus.REJECTED,
          decidedById: actor.id,
          decisionNotes: input.decisionNotes || null,
          decidedAt: now,
        },
      });
      await transaction.notification.create({
        data: {
          userId: request.requestedById,
          type: NotificationType.RETURN_REJECTED,
          title: `Return needs revision for ${request.allocation.asset.assetTag}`,
          body: input.decisionNotes || "Update the check-in information and try again.",
          entityType: "return",
          entityId: request.id,
          actionUrl: "/allocations?tab=returns",
          dedupeKey: `return:${request.id}:rejected`,
        },
      });
      return rejected;
    }

    await transaction.assetAllocation.update({
      where: { id: request.allocationId },
      data: {
        status: AllocationStatus.RETURNED,
        returnedAt: now,
        returnCondition: request.condition,
        returnNotes: request.checkInNotes,
        closedById: actor.id,
      },
    });
    await transaction.asset.update({
      where: { id: request.allocation.assetId },
      data: {
        status: AssetStatus.AVAILABLE,
        condition: request.condition,
      },
    });
    const approved = await transaction.returnRequest.update({
      where: { id: request.id },
      data: {
        status: ReturnStatus.APPROVED,
        decidedById: actor.id,
        decisionNotes: input.decisionNotes || null,
        decidedAt: now,
      },
    });
    await transaction.assetStatusHistory.create({
      data: {
        assetId: request.allocation.assetId,
        fromStatus: AssetStatus.ALLOCATED,
        toStatus: AssetStatus.AVAILABLE,
        reason: `Return approved: ${request.checkInNotes}`,
        actorId: actor.id,
      },
    });
    await transaction.notification.create({
      data: {
        userId: request.requestedById,
        type: NotificationType.RETURN_APPROVED,
        title: `Return approved for ${request.allocation.asset.assetTag}`,
        body: `${request.allocation.asset.name} is now available.`,
        entityType: "return",
        entityId: request.id,
        actionUrl: `/assets/${request.allocation.assetId}`,
        dedupeKey: `return:${request.id}:approved`,
      },
    });
    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "return.approved",
        entityType: "return",
        entityId: request.id,
      },
    });
    return approved;
  });
}
