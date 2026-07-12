import { describe, expect, it } from "vitest";

import {
  AssetStatus,
  AuditCycleStatus,
  BookingStatus,
  MaintenanceStatus,
} from "../generated/prisma/enums";
import {
  assertAssetTransition,
  assertMaintenanceTransition,
  canTransitionAsset,
  canTransitionAudit,
  deriveBookingStatus,
} from "./workflow-rules";

describe("asset lifecycle", () => {
  it("allows the operational transitions required by the brief", () => {
    expect(
      canTransitionAsset(AssetStatus.AVAILABLE, AssetStatus.ALLOCATED),
    ).toBe(true);
    expect(
      canTransitionAsset(
        AssetStatus.AVAILABLE,
        AssetStatus.UNDER_MAINTENANCE,
      ),
    ).toBe(true);
    expect(
      canTransitionAsset(AssetStatus.ALLOCATED, AssetStatus.AVAILABLE),
    ).toBe(true);
    expect(
      canTransitionAsset(
        AssetStatus.UNDER_MAINTENANCE,
        AssetStatus.AVAILABLE,
      ),
    ).toBe(true);
  });

  it("keeps disposed assets terminal", () => {
    expect(
      canTransitionAsset(AssetStatus.DISPOSED, AssetStatus.AVAILABLE),
    ).toBe(false);
    expect(() =>
      assertAssetTransition(AssetStatus.DISPOSED, AssetStatus.AVAILABLE),
    ).toThrow(/cannot move/i);
  });
});

describe("maintenance workflow", () => {
  it("requires approval before technician assignment and work", () => {
    expect(() =>
      assertMaintenanceTransition(
        MaintenanceStatus.PENDING,
        MaintenanceStatus.IN_PROGRESS,
      ),
    ).toThrow(/cannot move/i);

    expect(() =>
      assertMaintenanceTransition(
        MaintenanceStatus.APPROVED,
        MaintenanceStatus.TECHNICIAN_ASSIGNED,
      ),
    ).not.toThrow();
  });

  it("does not reopen a resolved request", () => {
    expect(() =>
      assertMaintenanceTransition(
        MaintenanceStatus.RESOLVED,
        MaintenanceStatus.IN_PROGRESS,
      ),
    ).toThrow(/cannot move/i);
  });
});

describe("audit workflow", () => {
  it("locks the workflow after closure", () => {
    expect(
      canTransitionAudit(
        AuditCycleStatus.IN_PROGRESS,
        AuditCycleStatus.CLOSED,
      ),
    ).toBe(true);
    expect(
      canTransitionAudit(AuditCycleStatus.CLOSED, AuditCycleStatus.IN_PROGRESS),
    ).toBe(false);
  });
});

describe("booking status", () => {
  const start = new Date("2026-07-13T09:00:00.000Z");
  const end = new Date("2026-07-13T10:00:00.000Z");

  it("derives statuses at exact time boundaries", () => {
    expect(
      deriveBookingStatus(
        start,
        end,
        new Date("2026-07-13T08:59:59.000Z"),
      ),
    ).toBe(BookingStatus.UPCOMING);
    expect(deriveBookingStatus(start, end, start)).toBe(BookingStatus.ONGOING);
    expect(deriveBookingStatus(start, end, end)).toBe(BookingStatus.COMPLETED);
  });

  it("keeps cancellation authoritative at every time", () => {
    expect(deriveBookingStatus(start, end, start, start)).toBe(
      BookingStatus.CANCELLED,
    );
  });
});
