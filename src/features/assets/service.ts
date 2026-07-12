import "server-only";

import { DomainError } from "@/domain/errors";
import { canAct, type PermissionActor } from "@/domain/permissions";
import { AllocationStatus, AssetStatus, Role } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import type { CategoryField } from "@/features/organization/schemas";
import type { AssetInput, AssetSearch } from "./schemas";
import { validateCategoryValues } from "./schemas";

function assertAssetAccess(actor: PermissionActor) {
  if (!canAct(actor, "assets.read")) {
    throw new DomainError("You cannot view the asset directory.", "FORBIDDEN");
  }
}

function assetScope(actor: PermissionActor): Prisma.AssetWhereInput {
  const organizationId = actor.organizationId;

  if (actor.role === Role.ADMIN || actor.role === Role.ASSET_MANAGER) {
    return { organizationId };
  }

  if (actor.role === Role.DEPARTMENT_HEAD && actor.departmentId) {
    return { organizationId, departmentId: actor.departmentId };
  }

  return {
    organizationId,
    OR: [
      {
        allocations: {
          some: { assigneeUserId: actor.id, status: AllocationStatus.ACTIVE },
        },
      },
      { isBookable: true },
    ],
  };
}

function parseDefinitions(value: string): CategoryField[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeCustomValues(
  definitions: readonly CategoryField[],
  values: AssetInput["customValues"],
) {
  return Object.fromEntries(
    definitions.map((definition) => {
      const value = values[definition.key];
      if (value === "" || value === undefined) return [definition.key, null];
      if (definition.type === "number") return [definition.key, Number(value)];
      if (definition.type === "boolean") {
        return [definition.key, value === true || value === "true"];
      }
      return [definition.key, value];
    }),
  );
}

export async function getAssetDirectory(
  actor: PermissionActor,
  filters: AssetSearch,
) {
  assertAssetAccess(actor);
  const scope = assetScope(actor);
  const where: Prisma.AssetWhereInput = {
    ...scope,
    ...(filters.query
      ? {
          AND: [
            {
              OR: [
                { name: { contains: filters.query } },
                { assetTag: { contains: filters.query } },
                { serialNumber: { contains: filters.query } },
                { qrValue: { contains: filters.query } },
              ],
            },
          ],
        }
      : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.location ? { location: { contains: filters.location } } : {}),
  };

  const [assets, categories, departments, locations] = await Promise.all([
    db.asset.findMany({
      where,
      take: 100,
      orderBy: [{ status: "asc" }, { assetTag: "asc" }],
      select: {
        id: true,
        assetTag: true,
        qrValue: true,
        name: true,
        serialNumber: true,
        condition: true,
        location: true,
        status: true,
        isBookable: true,
        nextMaintenanceAt: true,
        retirementDate: true,
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        allocations: {
          where: { status: AllocationStatus.ACTIVE },
          take: 1,
          select: {
            assigneeUser: { select: { name: true } },
            assigneeDepartment: { select: { name: true } },
          },
        },
      },
    }),
    db.assetCategory.findMany({
      where: { organizationId: actor.organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.department.findMany({
      where: { organizationId: actor.organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.asset.findMany({
      where: assetScope(actor),
      distinct: ["location"],
      orderBy: { location: "asc" },
      select: { location: true },
    }),
  ]);

  return {
    assets,
    categories,
    departments,
    locations: locations.map((item) => item.location),
  };
}

export async function getAssetRegistrationOptions(actor: PermissionActor) {
  if (!canAct(actor, "assets.register")) {
    throw new DomainError("Only an Asset Manager can register assets.", "FORBIDDEN");
  }

  const [categories, departments] = await Promise.all([
    db.assetCategory.findMany({
      where: { organizationId: actor.organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        fieldDefinitions: true,
      },
    }),
    db.department.findMany({
      where: { organizationId: actor.organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    categories: categories.map((category) => ({
      ...category,
      fields: parseDefinitions(category.fieldDefinitions),
    })),
    departments,
  };
}

export async function registerAsset(
  actor: PermissionActor,
  input: AssetInput,
) {
  if (!canAct(actor, "assets.register")) {
    throw new DomainError("Only an Asset Manager can register assets.", "FORBIDDEN");
  }

  const [organization, category, department, serialMatch] = await Promise.all([
    db.organization.findUnique({
      where: { id: actor.organizationId },
      select: { id: true, assetTagPrefix: true },
    }),
    db.assetCategory.findFirst({
      where: {
        id: input.categoryId,
        organizationId: actor.organizationId,
        isActive: true,
      },
      select: { id: true, fieldDefinitions: true },
    }),
    input.departmentId
      ? db.department.findFirst({
          where: {
            id: input.departmentId,
            organizationId: actor.organizationId,
            isActive: true,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.serialNumber
      ? db.asset.findUnique({
          where: { serialNumber: input.serialNumber },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!organization || !category) {
    throw new DomainError(
      "Choose an active category from this organization.",
      "INVALID_CATEGORY",
    );
  }
  if (input.departmentId && !department) {
    throw new DomainError(
      "Choose an active department from this organization.",
      "INVALID_DEPARTMENT",
    );
  }
  if (serialMatch) {
    throw new DomainError(
      "An asset with this serial number already exists.",
      "DUPLICATE_SERIAL_NUMBER",
    );
  }

  const definitions = parseDefinitions(category.fieldDefinitions);
  const customErrors = validateCategoryValues(definitions, input.customValues);
  if (Object.keys(customErrors).length > 0) {
    throw new DomainError(
      Object.values(customErrors)[0],
      "INVALID_CUSTOM_VALUES",
      customErrors,
    );
  }
  const customValues = normalizeCustomValues(definitions, input.customValues);

  return db.$transaction(async (transaction) => {
    const counter = await transaction.assetTagCounter.upsert({
      where: { organizationId: actor.organizationId },
      create: { organizationId: actor.organizationId, value: 1 },
      update: { value: { increment: 1 } },
      select: { value: true },
    });
    const assetTag = `${organization.assetTagPrefix}-${String(counter.value).padStart(4, "0")}`;
    const asset = await transaction.asset.create({
      data: {
        organizationId: actor.organizationId,
        categoryId: category.id,
        departmentId: input.departmentId,
        assetTag,
        qrValue: `assetflow:${assetTag}`,
        name: input.name,
        serialNumber: input.serialNumber,
        description: input.description || null,
        acquisitionDate: input.acquisitionDate,
        acquisitionCost: input.acquisitionCost,
        condition: input.condition,
        location: input.location,
        status: AssetStatus.AVAILABLE,
        isBookable: input.isBookable,
        customValues: JSON.stringify(customValues),
        nextMaintenanceAt: input.nextMaintenanceAt,
        retirementDate: input.retirementDate,
      },
    });

    await transaction.assetStatusHistory.create({
      data: {
        assetId: asset.id,
        toStatus: AssetStatus.AVAILABLE,
        reason: "Asset registered",
        actorId: actor.id,
      },
    });
    await transaction.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.id,
        action: "asset.registered",
        entityType: "asset",
        entityId: asset.id,
        metadata: JSON.stringify({ assetTag, categoryId: category.id }),
      },
    });

    return asset;
  });
}

export async function getAssetDetail(actor: PermissionActor, assetId: string) {
  assertAssetAccess(actor);

  return db.asset.findFirst({
    where: { id: assetId, ...assetScope(actor) },
    include: {
      organization: { select: { currency: true } },
      category: true,
      department: { select: { id: true, name: true } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      },
      allocations: {
        orderBy: { allocatedAt: "desc" },
        include: {
          assigneeUser: { select: { id: true, name: true } },
          assigneeDepartment: { select: { id: true, name: true } },
          createdBy: { select: { name: true } },
        },
      },
      maintenanceRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: { select: { name: true } },
          technician: { select: { name: true } },
        },
      },
      auditItems: {
        orderBy: { createdAt: "desc" },
        include: { cycle: { select: { id: true, name: true, status: true } } },
      },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });
}
