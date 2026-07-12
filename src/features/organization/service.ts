import "server-only";

import { DomainError } from "@/domain/errors";
import { canAct, type PermissionActor } from "@/domain/permissions";
import { Role, UserStatus } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import type {
  CategoryInput,
  DepartmentInput,
  EmployeeUpdateInput,
} from "./schemas";
import { wouldCreateHierarchyCycle } from "./schemas";

function assertOrganizationAdmin(actor: PermissionActor) {
  if (!canAct(actor, "organization.manage")) {
    throw new DomainError(
      "Only an Administrator can change organization setup.",
      "FORBIDDEN",
    );
  }
}

async function validateHead(headId: string | null, organizationId: string) {
  if (!headId) return;

  const head = await db.user.findFirst({
    where: {
      id: headId,
      organizationId,
      role: Role.DEPARTMENT_HEAD,
      status: UserStatus.ACTIVE,
    },
    select: { id: true },
  });

  if (!head) {
    throw new DomainError(
      "Choose an active employee who was already promoted to Department Head.",
      "INVALID_DEPARTMENT_HEAD",
    );
  }
}

export async function getOrganizationSetupData(actor: PermissionActor) {
  assertOrganizationAdmin(actor);

  const [departments, categories, employees] = await Promise.all([
    db.department.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        parentId: true,
        headId: true,
        parent: { select: { name: true } },
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, assets: true } },
      },
    }),
    db.assetCategory.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        fieldDefinitions: true,
        _count: { select: { assets: true } },
      },
    }),
    db.user.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        department: { select: { name: true } },
        createdAt: true,
        lastLoginAt: true,
      },
    }),
  ]);

  return { departments, categories, employees };
}

export async function createDepartment(
  actor: PermissionActor,
  input: DepartmentInput,
) {
  assertOrganizationAdmin(actor);
  await validateHead(input.headId, actor.organizationId);

  if (input.parentId) {
    const parent = await db.department.findFirst({
      where: { id: input.parentId, organizationId: actor.organizationId },
      select: { id: true, isActive: true },
    });
    if (!parent?.isActive) {
      throw new DomainError(
        "Choose an active parent department.",
        "INVALID_PARENT_DEPARTMENT",
      );
    }
  }

  return db.$transaction(async (transaction) => {
    const department = await transaction.department.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        code: input.code,
        description: input.description || null,
        parentId: input.parentId,
        headId: input.headId,
        isActive: input.isActive,
      },
    });

    if (input.headId) {
      await transaction.user.update({
        where: { id: input.headId },
        data: { departmentId: department.id },
      });
    }

    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "department.created",
        entityType: "department",
        entityId: department.id,
        metadata: JSON.stringify({ name: department.name, code: department.code }),
      },
    });

    return department;
  });
}

export async function updateDepartment(
  actor: PermissionActor,
  departmentId: string,
  input: DepartmentInput,
) {
  assertOrganizationAdmin(actor);

  const [existing, departments] = await Promise.all([
    db.department.findFirst({
      where: { id: departmentId, organizationId: actor.organizationId },
    }),
    db.department.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, parentId: true },
    }),
  ]);

  if (!existing) {
    throw new DomainError("Department was not found.", "NOT_FOUND");
  }

  const parentsById = new Map(
    departments.map((department) => [department.id, department.parentId]),
  );
  if (wouldCreateHierarchyCycle(departmentId, input.parentId, parentsById)) {
    throw new DomainError(
      "That parent selection would create a department hierarchy cycle.",
      "DEPARTMENT_HIERARCHY_CYCLE",
    );
  }

  await validateHead(input.headId, actor.organizationId);

  return db.$transaction(async (transaction) => {
    const department = await transaction.department.update({
      where: { id: departmentId },
      data: {
        name: input.name,
        code: input.code,
        description: input.description || null,
        parentId: input.parentId,
        headId: input.headId,
        isActive: input.isActive,
      },
    });

    if (input.headId) {
      await transaction.user.update({
        where: { id: input.headId },
        data: { departmentId },
      });
    }

    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "department.updated",
        entityType: "department",
        entityId: departmentId,
        metadata: JSON.stringify({
          before: { name: existing.name, isActive: existing.isActive },
          after: { name: department.name, isActive: department.isActive },
        }),
      },
    });

    return department;
  });
}

export async function createCategory(
  actor: PermissionActor,
  input: CategoryInput,
) {
  assertOrganizationAdmin(actor);

  return db.$transaction(async (transaction) => {
    const category = await transaction.assetCategory.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        description: input.description || null,
        isActive: input.isActive,
        fieldDefinitions: JSON.stringify(input.fieldDefinitions),
      },
    });

    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "asset_category.created",
        entityType: "asset_category",
        entityId: category.id,
        metadata: JSON.stringify({ name: category.name }),
      },
    });

    return category;
  });
}

export async function updateCategory(
  actor: PermissionActor,
  categoryId: string,
  input: CategoryInput,
) {
  assertOrganizationAdmin(actor);
  const existing = await db.assetCategory.findFirst({
    where: { id: categoryId, organizationId: actor.organizationId },
  });

  if (!existing) {
    throw new DomainError("Asset category was not found.", "NOT_FOUND");
  }

  return db.$transaction(async (transaction) => {
    const category = await transaction.assetCategory.update({
      where: { id: categoryId },
      data: {
        name: input.name,
        description: input.description || null,
        isActive: input.isActive,
        fieldDefinitions: JSON.stringify(input.fieldDefinitions),
      },
    });
    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "asset_category.updated",
        entityType: "asset_category",
        entityId: categoryId,
        metadata: JSON.stringify({
          before: { name: existing.name, isActive: existing.isActive },
          after: { name: category.name, isActive: category.isActive },
        }),
      },
    });

    return category;
  });
}

export async function updateEmployee(
  actor: PermissionActor,
  employeeId: string,
  input: EmployeeUpdateInput,
) {
  assertOrganizationAdmin(actor);

  const employee = await db.user.findFirst({
    where: { id: employeeId, organizationId: actor.organizationId },
    select: {
      id: true,
      role: true,
      status: true,
      departmentId: true,
    },
  });

  if (!employee) {
    throw new DomainError("Employee was not found.", "NOT_FOUND");
  }
  if (employee.role === Role.ADMIN) {
    throw new DomainError(
      "Bootstrap Administrator access cannot be changed in the Employee Directory.",
      "BOOTSTRAP_ADMIN_PROTECTED",
    );
  }
  if (input.role === Role.DEPARTMENT_HEAD && !input.departmentId) {
    throw new DomainError(
      "A Department Head must belong to a department.",
      "DEPARTMENT_REQUIRED",
    );
  }

  if (input.departmentId) {
    const department = await db.department.findFirst({
      where: {
        id: input.departmentId,
        organizationId: actor.organizationId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!department) {
      throw new DomainError(
        "Choose an active department.",
        "INVALID_DEPARTMENT",
      );
    }
  }

  return db.$transaction(async (transaction) => {
    if (
      input.role !== Role.DEPARTMENT_HEAD ||
      input.status === UserStatus.INACTIVE
    ) {
      await transaction.department.updateMany({
        where: { headId: employeeId },
        data: { headId: null },
      });
    }

    const updated = await transaction.user.update({
      where: { id: employeeId },
      data: {
        departmentId: input.departmentId,
        role: input.role,
        status: input.status,
      },
    });

    if (input.status === UserStatus.INACTIVE) {
      await transaction.session.deleteMany({ where: { userId: employeeId } });
    }

    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "employee.access_updated",
        entityType: "user",
        entityId: employeeId,
        metadata: JSON.stringify({
          before: employee,
          after: {
            role: input.role,
            status: input.status,
            departmentId: input.departmentId,
          },
        }),
      },
    });

    return updated;
  });
}
