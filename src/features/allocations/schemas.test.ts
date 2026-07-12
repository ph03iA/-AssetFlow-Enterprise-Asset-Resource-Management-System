import { describe, expect, it } from "vitest";

import {
  allocationInputSchema,
  assigneeSchema,
  transferInputSchema,
} from "./schemas";

describe("allocation targets", () => {
  it("requires exactly one employee or department", () => {
    expect(
      assigneeSchema.safeParse({ assigneeUserId: "user-1", assigneeDepartmentId: null })
        .success,
    ).toBe(true);
    expect(
      assigneeSchema.safeParse({
        assigneeUserId: "user-1",
        assigneeDepartmentId: "department-1",
      }).success,
    ).toBe(false);
    expect(
      assigneeSchema.safeParse({ assigneeUserId: null, assigneeDepartmentId: null })
        .success,
    ).toBe(false);
  });

  it("normalizes an optional expected return date", () => {
    const result = allocationInputSchema.parse({
      assetId: "asset-1",
      assigneeUserId: "user-1",
      assigneeDepartmentId: null,
      expectedReturnAt: "2026-07-20T17:00",
      checkoutNotes: "Issued for field work",
    });

    expect(result.expectedReturnAt).toBeInstanceOf(Date);
  });
});

describe("transfer targets", () => {
  it("applies the same exactly-one invariant", () => {
    expect(
      transferInputSchema.safeParse({
        allocationId: "allocation-1",
        targetUserId: "user-2",
        targetDepartmentId: null,
        reason: "Responsibility changed",
      }).success,
    ).toBe(true);
    expect(
      transferInputSchema.safeParse({
        allocationId: "allocation-1",
        targetUserId: "user-2",
        targetDepartmentId: "department-2",
        reason: "Responsibility changed",
      }).success,
    ).toBe(false);
  });
});
