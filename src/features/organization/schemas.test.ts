import { describe, expect, it } from "vitest";

import { Role, UserStatus } from "../../generated/prisma/enums";
import {
  categoryInputSchema,
  departmentInputSchema,
  employeeUpdateSchema,
  wouldCreateHierarchyCycle,
} from "./schemas";

describe("organization master-data validation", () => {
  it("normalizes department codes", () => {
    const value = departmentInputSchema.parse({
      name: "Engineering",
      code: " eng-01 ",
      parentId: "",
      headId: "",
      isActive: true,
    });

    expect(value.code).toBe("ENG-01");
    expect(value.parentId).toBeNull();
  });

  it("rejects duplicate category-specific field keys", () => {
    const result = categoryInputSchema.safeParse({
      name: "Electronics",
      isActive: true,
      fieldDefinitions: [
        { key: "warrantyMonths", label: "Warranty", type: "number" },
        { key: "warrantyMonths", label: "Warranty term", type: "number" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("does not allow Employee Directory actions to create Admins", () => {
    expect(
      employeeUpdateSchema.safeParse({
        departmentId: "dept-1",
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      }).success,
    ).toBe(false);
  });
});

describe("department hierarchy", () => {
  const parents = new Map<string, string | null>([
    ["operations", null],
    ["engineering", "operations"],
    ["platform", "engineering"],
  ]);

  it("rejects self-parenting and descendant parenting", () => {
    expect(wouldCreateHierarchyCycle("engineering", "engineering", parents)).toBe(
      true,
    );
    expect(wouldCreateHierarchyCycle("operations", "platform", parents)).toBe(
      true,
    );
  });

  it("accepts a valid parent change", () => {
    expect(wouldCreateHierarchyCycle("platform", "operations", parents)).toBe(
      false,
    );
  });
});
