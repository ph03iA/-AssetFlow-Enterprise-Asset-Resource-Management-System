import { describe, expect, it } from "vitest";

import { Role, UserStatus } from "../generated/prisma/enums";
import {
  canAccessDepartment,
  canAct,
  canAssignRole,
  canPerformTechnicianWork,
  type PermissionActor,
} from "./permissions";

function actor(overrides: Partial<PermissionActor> = {}): PermissionActor {
  return {
    id: "user-1",
    organizationId: "org-1",
    departmentId: "department-1",
    role: Role.EMPLOYEE,
    status: UserStatus.ACTIVE,
    ...overrides,
  };
}

describe("role permissions", () => {
  it("keeps organization setup and promotions admin-only", () => {
    expect(canAct(actor({ role: Role.ADMIN }), "organization.manage")).toBe(
      true,
    );
    expect(
      canAct(actor({ role: Role.ASSET_MANAGER }), "organization.manage"),
    ).toBe(false);
    expect(canAct(actor({ role: Role.EMPLOYEE }), "employees.promote")).toBe(
      false,
    );
  });

  it("never allows an ordinary directory action to assign Admin", () => {
    const admin = actor({ role: Role.ADMIN });

    expect(canAssignRole(admin, Role.ASSET_MANAGER)).toBe(true);
    expect(canAssignRole(admin, Role.DEPARTMENT_HEAD)).toBe(true);
    expect(canAssignRole(admin, Role.EMPLOYEE)).toBe(true);
    expect(canAssignRole(admin, Role.ADMIN)).toBe(false);
  });

  it("immediately disables permissions for inactive users", () => {
    expect(
      canAct(
        actor({ role: Role.ADMIN, status: UserStatus.INACTIVE }),
        "organization.manage",
      ),
    ).toBe(false);
  });

  it("scopes Department Heads to their own department", () => {
    const head = actor({ role: Role.DEPARTMENT_HEAD });

    expect(canAccessDepartment(head, "department-1")).toBe(true);
    expect(canAccessDepartment(head, "department-2")).toBe(false);
    expect(
      canAccessDepartment(actor({ role: Role.ASSET_MANAGER }), "department-2"),
    ).toBe(true);
  });

  it("treats technician access as an assignment, not a global role", () => {
    const assignedEmployee = actor({ id: "technician-1" });

    expect(canPerformTechnicianWork(assignedEmployee, "technician-1")).toBe(
      true,
    );
    expect(canPerformTechnicianWork(assignedEmployee, "technician-2")).toBe(
      false,
    );
    expect(
      canPerformTechnicianWork(
        actor({ role: Role.ASSET_MANAGER }),
        "technician-2",
      ),
    ).toBe(true);
  });
});
