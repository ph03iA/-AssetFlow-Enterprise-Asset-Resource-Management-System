import { Role, UserStatus } from "../generated/prisma/enums";

export type Permission =
  | "organization.manage"
  | "employees.promote"
  | "assets.read"
  | "assets.register"
  | "assets.allocate"
  | "transfers.request"
  | "transfers.decide"
  | "returns.request"
  | "returns.decide"
  | "bookings.create"
  | "bookings.manage-own"
  | "bookings.manage-department"
  | "maintenance.request"
  | "maintenance.decide"
  | "maintenance.work"
  | "audits.manage"
  | "audits.verify-assigned"
  | "discrepancies.resolve"
  | "reports.view-organization"
  | "reports.view-department"
  | "activity.view"
  | "notifications.read-own";

export type PermissionActor = {
  id: string;
  organizationId: string;
  departmentId: string | null;
  role: Role;
  status: UserStatus;
};

const employeePermissions = [
  "assets.read",
  "transfers.request",
  "returns.request",
  "bookings.create",
  "bookings.manage-own",
  "maintenance.request",
  "audits.verify-assigned",
  "notifications.read-own",
] as const satisfies readonly Permission[];

const permissionsByRole: Record<Role, ReadonlySet<Permission>> = {
  [Role.ADMIN]: new Set<Permission>([
    "organization.manage",
    "employees.promote",
    "assets.read",
    "audits.manage",
    "reports.view-organization",
    "activity.view",
    "notifications.read-own",
  ]),
  [Role.ASSET_MANAGER]: new Set<Permission>([
    ...employeePermissions,
    "assets.register",
    "assets.allocate",
    "transfers.decide",
    "returns.decide",
    "maintenance.decide",
    "maintenance.work",
    "discrepancies.resolve",
    "reports.view-organization",
    "activity.view",
  ]),
  [Role.DEPARTMENT_HEAD]: new Set<Permission>([
    ...employeePermissions,
    "assets.allocate",
    "transfers.decide",
    "bookings.manage-department",
    "reports.view-department",
  ]),
  [Role.EMPLOYEE]: new Set<Permission>(employeePermissions),
};

export function hasPermission(role: Role, permission: Permission) {
  return permissionsByRole[role].has(permission);
}

export function canAct(actor: PermissionActor, permission: Permission) {
  return (
    actor.status === UserStatus.ACTIVE && hasPermission(actor.role, permission)
  );
}

export function isSameOrganization(
  actor: PermissionActor,
  organizationId: string,
) {
  return actor.organizationId === organizationId;
}

export function canAccessDepartment(
  actor: PermissionActor,
  departmentId: string,
) {
  if (actor.status !== UserStatus.ACTIVE) {
    return false;
  }

  if (actor.role === Role.ADMIN || actor.role === Role.ASSET_MANAGER) {
    return true;
  }

  return actor.departmentId === departmentId;
}

export function canAssignRole(actor: PermissionActor, nextRole: Role) {
  if (!canAct(actor, "employees.promote")) {
    return false;
  }

  return (
    nextRole === Role.EMPLOYEE ||
    nextRole === Role.ASSET_MANAGER ||
    nextRole === Role.DEPARTMENT_HEAD
  );
}

export function canPerformTechnicianWork(
  actor: PermissionActor,
  technicianId: string | null,
) {
  if (actor.status !== UserStatus.ACTIVE) {
    return false;
  }

  if (actor.role === Role.ADMIN || actor.role === Role.ASSET_MANAGER) {
    return true;
  }

  return actor.id === technicianId;
}
