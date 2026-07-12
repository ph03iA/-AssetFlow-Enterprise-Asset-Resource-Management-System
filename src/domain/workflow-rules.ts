import {
  AssetStatus,
  AuditCycleStatus,
  BookingStatus,
  MaintenanceStatus,
} from "../generated/prisma/enums";
import { DomainError } from "./errors";

const assetTransitions: Record<AssetStatus, ReadonlySet<AssetStatus>> = {
  [AssetStatus.AVAILABLE]: new Set([
    AssetStatus.ALLOCATED,
    AssetStatus.RESERVED,
    AssetStatus.UNDER_MAINTENANCE,
    AssetStatus.LOST,
    AssetStatus.RETIRED,
    AssetStatus.DISPOSED,
  ]),
  [AssetStatus.ALLOCATED]: new Set([
    AssetStatus.AVAILABLE,
    AssetStatus.UNDER_MAINTENANCE,
    AssetStatus.LOST,
  ]),
  [AssetStatus.RESERVED]: new Set([
    AssetStatus.AVAILABLE,
    AssetStatus.ALLOCATED,
    AssetStatus.UNDER_MAINTENANCE,
  ]),
  [AssetStatus.UNDER_MAINTENANCE]: new Set([
    AssetStatus.AVAILABLE,
    AssetStatus.LOST,
    AssetStatus.RETIRED,
  ]),
  [AssetStatus.LOST]: new Set([
    AssetStatus.AVAILABLE,
    AssetStatus.RETIRED,
    AssetStatus.DISPOSED,
  ]),
  [AssetStatus.RETIRED]: new Set([AssetStatus.DISPOSED]),
  [AssetStatus.DISPOSED]: new Set(),
};

const maintenanceTransitions: Record<
  MaintenanceStatus,
  ReadonlySet<MaintenanceStatus>
> = {
  [MaintenanceStatus.PENDING]: new Set([
    MaintenanceStatus.APPROVED,
    MaintenanceStatus.REJECTED,
  ]),
  [MaintenanceStatus.APPROVED]: new Set([
    MaintenanceStatus.TECHNICIAN_ASSIGNED,
  ]),
  [MaintenanceStatus.REJECTED]: new Set(),
  [MaintenanceStatus.TECHNICIAN_ASSIGNED]: new Set([
    MaintenanceStatus.IN_PROGRESS,
  ]),
  [MaintenanceStatus.IN_PROGRESS]: new Set([MaintenanceStatus.RESOLVED]),
  [MaintenanceStatus.RESOLVED]: new Set(),
};

const auditTransitions: Record<
  AuditCycleStatus,
  ReadonlySet<AuditCycleStatus>
> = {
  [AuditCycleStatus.DRAFT]: new Set([AuditCycleStatus.IN_PROGRESS]),
  [AuditCycleStatus.IN_PROGRESS]: new Set([AuditCycleStatus.CLOSED]),
  [AuditCycleStatus.CLOSED]: new Set(),
};

export function canTransitionAsset(from: AssetStatus, to: AssetStatus) {
  return assetTransitions[from].has(to);
}

export function assertAssetTransition(from: AssetStatus, to: AssetStatus) {
  if (!canTransitionAsset(from, to)) {
    throw new DomainError(
      `Asset cannot move from ${from} to ${to}.`,
      "INVALID_ASSET_TRANSITION",
      { from, to },
    );
  }
}

export function canTransitionMaintenance(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
) {
  return maintenanceTransitions[from].has(to);
}

export function assertMaintenanceTransition(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
) {
  if (!canTransitionMaintenance(from, to)) {
    throw new DomainError(
      `Maintenance request cannot move from ${from} to ${to}.`,
      "INVALID_MAINTENANCE_TRANSITION",
      { from, to },
    );
  }
}

export function canTransitionAudit(
  from: AuditCycleStatus,
  to: AuditCycleStatus,
) {
  return auditTransitions[from].has(to);
}

export function deriveBookingStatus(
  startAt: Date,
  endAt: Date,
  now: Date,
  cancelledAt: Date | null = null,
) {
  if (cancelledAt) {
    return BookingStatus.CANCELLED;
  }

  if (now < startAt) {
    return BookingStatus.UPCOMING;
  }

  if (now >= endAt) {
    return BookingStatus.COMPLETED;
  }

  return BookingStatus.ONGOING;
}
