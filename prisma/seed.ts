import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";
import { resolve } from "node:path";

import {
  AllocationStatus,
  AssetCondition,
  AssetStatus,
  AuditCycleStatus,
  AuditResult,
  BookingStatus,
  MaintenancePriority,
  MaintenanceStatus,
  NotificationType,
  PrismaClient,
  Role,
  UserStatus,
} from "../src/generated/prisma/client";

function databasePath() {
  const configuredUrl = process.env.DATABASE_URL ?? "file:./data/assetflow.db";

  if (configuredUrl.startsWith("file:./")) {
    return resolve(
      process.cwd(),
      "prisma",
      configuredUrl.slice("file:./".length),
    );
  }

  return configuredUrl.replace(/^file:/, "");
}

const adapter = new PrismaBetterSqlite3({ url: databasePath() });
const db = new PrismaClient({ adapter });

const ids = {
  organization: "org-northstar-works",
  operations: "dept-operations",
  engineering: "dept-engineering",
  facilities: "dept-facilities",
  admin: "user-admin-anika",
  manager: "user-manager-maya",
  head: "user-head-arun",
  priya: "user-employee-priya",
  raj: "user-employee-raj",
  electronics: "category-electronics",
  furniture: "category-furniture",
  vehicles: "category-vehicles",
  spaces: "category-spaces",
  laptop: "asset-thinkpad-x1",
  monitor: "asset-studio-display",
  room: "asset-room-b2",
  vehicle: "asset-innova-crysta",
  desk: "asset-ergonomic-desk",
  projector: "asset-projector",
} as const;

function daysFromNow(days: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function clearDatabase() {
  await db.attachment.deleteMany();
  await db.auditDiscrepancy.deleteMany();
  await db.auditItem.deleteMany();
  await db.auditAuditor.deleteMany();
  await db.auditCycle.deleteMany();
  await db.maintenanceRequest.deleteMany();
  await db.resourceBooking.deleteMany();
  await db.returnRequest.deleteMany();
  await db.transferRequest.deleteMany();
  await db.assetAllocation.deleteMany();
  await db.assetStatusHistory.deleteMany();
  await db.notification.deleteMany();
  await db.activityLog.deleteMany();
  await db.asset.deleteMany();
  await db.assetTagCounter.deleteMany();
  await db.assetCategory.deleteMany();
  await db.session.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.mailOutbox.deleteMany();
  await db.user.deleteMany();
  await db.department.deleteMany();
  await db.organization.deleteMany();
}

async function seed() {
  const passwordHash = await hash("AssetFlow2026!", 12);
  await clearDatabase();

  await db.organization.create({
    data: {
      id: ids.organization,
      name: "Northstar Works",
      slug: "northstar-works",
      timezone: "Asia/Kolkata",
      currency: "INR",
      assetTagPrefix: "AF",
    },
  });

  await db.department.createMany({
    data: [
      {
        id: ids.operations,
        organizationId: ids.organization,
        name: "Operations",
        code: "OPS",
        description: "Organization-wide operating services",
      },
      {
        id: ids.facilities,
        organizationId: ids.organization,
        name: "Facilities",
        code: "FAC",
        description: "Workplace, fleet, and shared-space operations",
        parentId: ids.operations,
      },
      {
        id: ids.engineering,
        organizationId: ids.organization,
        name: "Engineering",
        code: "ENG",
        description: "Product and platform engineering",
        parentId: ids.operations,
      },
    ],
  });

  await db.user.createMany({
    data: [
      {
        id: ids.admin,
        organizationId: ids.organization,
        departmentId: ids.operations,
        name: "Anika Deshmukh",
        email: "admin@assetflow.local",
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        avatarColor: "amber",
      },
      {
        id: ids.manager,
        organizationId: ids.organization,
        departmentId: ids.facilities,
        name: "Maya Iyer",
        email: "manager@assetflow.local",
        passwordHash,
        role: Role.ASSET_MANAGER,
        status: UserStatus.ACTIVE,
        avatarColor: "emerald",
      },
      {
        id: ids.head,
        organizationId: ids.organization,
        departmentId: ids.engineering,
        name: "Arun Menon",
        email: "head@assetflow.local",
        passwordHash,
        role: Role.DEPARTMENT_HEAD,
        status: UserStatus.ACTIVE,
        avatarColor: "sky",
      },
      {
        id: ids.priya,
        organizationId: ids.organization,
        departmentId: ids.engineering,
        name: "Priya Nair",
        email: "employee@assetflow.local",
        passwordHash,
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        avatarColor: "rose",
      },
      {
        id: ids.raj,
        organizationId: ids.organization,
        departmentId: ids.facilities,
        name: "Raj Kulkarni",
        email: "technician@assetflow.local",
        passwordHash,
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        avatarColor: "violet",
      },
    ],
  });

  await db.department.update({
    where: { id: ids.engineering },
    data: { headId: ids.head },
  });

  await db.assetCategory.createMany({
    data: [
      {
        id: ids.electronics,
        organizationId: ids.organization,
        name: "Electronics",
        description: "Computers, displays, and presentation equipment",
        fieldDefinitions: JSON.stringify([
          { key: "warrantyMonths", label: "Warranty period", type: "number" },
          { key: "manufacturer", label: "Manufacturer", type: "text" },
        ]),
      },
      {
        id: ids.furniture,
        organizationId: ids.organization,
        name: "Furniture",
        description: "Workstations and office furniture",
        fieldDefinitions: JSON.stringify([
          { key: "material", label: "Primary material", type: "text" },
        ]),
      },
      {
        id: ids.vehicles,
        organizationId: ids.organization,
        name: "Vehicles",
        description: "Shared organization fleet",
        fieldDefinitions: JSON.stringify([
          { key: "registration", label: "Registration number", type: "text" },
        ]),
      },
      {
        id: ids.spaces,
        organizationId: ids.organization,
        name: "Shared Spaces",
        description: "Bookable rooms and collaboration spaces",
        fieldDefinitions: JSON.stringify([
          { key: "capacity", label: "Capacity", type: "number" },
        ]),
      },
    ],
  });

  await db.assetTagCounter.create({
    data: { organizationId: ids.organization, value: 6 },
  });

  await db.asset.createMany({
    data: [
      {
        id: ids.laptop,
        organizationId: ids.organization,
        categoryId: ids.electronics,
        departmentId: ids.engineering,
        assetTag: "AF-0001",
        qrValue: "assetflow:AF-0001",
        name: "ThinkPad X1 Carbon",
        serialNumber: "PF4Z8K2Q",
        acquisitionDate: daysFromNow(-180),
        acquisitionCost: "146850.00",
        condition: AssetCondition.GOOD,
        location: "Bengaluru - Engineering Floor",
        status: AssetStatus.ALLOCATED,
        customValues: JSON.stringify({ warrantyMonths: 36, manufacturer: "Lenovo" }),
        nextMaintenanceAt: daysFromNow(42),
        retirementDate: daysFromNow(910),
      },
      {
        id: ids.monitor,
        organizationId: ids.organization,
        categoryId: ids.electronics,
        departmentId: ids.facilities,
        assetTag: "AF-0002",
        qrValue: "assetflow:AF-0002",
        name: "Studio Display 27",
        serialNumber: "C02M-27-8841",
        acquisitionDate: daysFromNow(-420),
        acquisitionCost: "159900.00",
        condition: AssetCondition.FAIR,
        location: "Bengaluru - Service Bay",
        status: AssetStatus.ALLOCATED,
        customValues: JSON.stringify({ warrantyMonths: 24, manufacturer: "Apple" }),
        nextMaintenanceAt: daysFromNow(12),
        retirementDate: daysFromNow(530),
      },
      {
        id: ids.room,
        organizationId: ids.organization,
        categoryId: ids.spaces,
        departmentId: ids.facilities,
        assetTag: "AF-0003",
        qrValue: "assetflow:AF-0003",
        name: "Conference Room B2",
        condition: AssetCondition.GOOD,
        location: "Bengaluru - Level 2",
        status: AssetStatus.AVAILABLE,
        isBookable: true,
        customValues: JSON.stringify({ capacity: 12 }),
      },
      {
        id: ids.vehicle,
        organizationId: ids.organization,
        categoryId: ids.vehicles,
        departmentId: ids.facilities,
        assetTag: "AF-0004",
        qrValue: "assetflow:AF-0004",
        name: "Toyota Innova Crysta",
        serialNumber: "MAK-2025-7719",
        acquisitionDate: daysFromNow(-260),
        acquisitionCost: "2487500.00",
        condition: AssetCondition.GOOD,
        location: "Bengaluru - Fleet Parking",
        status: AssetStatus.AVAILABLE,
        isBookable: true,
        customValues: JSON.stringify({ registration: "KA-03-NX-4187" }),
        nextMaintenanceAt: daysFromNow(18),
        retirementDate: daysFromNow(1650),
      },
      {
        id: ids.desk,
        organizationId: ids.organization,
        categoryId: ids.furniture,
        departmentId: ids.engineering,
        assetTag: "AF-0005",
        qrValue: "assetflow:AF-0005",
        name: "Aeron Workstation Desk",
        serialNumber: "DSK-ENG-087",
        acquisitionDate: daysFromNow(-680),
        acquisitionCost: "68400.00",
        condition: AssetCondition.GOOD,
        location: "Bengaluru - Engineering Floor",
        status: AssetStatus.AVAILABLE,
        customValues: JSON.stringify({ material: "Powder-coated steel and oak" }),
        retirementDate: daysFromNow(1320),
      },
      {
        id: ids.projector,
        organizationId: ids.organization,
        categoryId: ids.electronics,
        departmentId: ids.facilities,
        assetTag: "AF-0006",
        qrValue: "assetflow:AF-0006",
        name: "Epson Laser Projector",
        serialNumber: "EPS-LS-6218",
        acquisitionDate: daysFromNow(-510),
        acquisitionCost: "237400.00",
        condition: AssetCondition.FAIR,
        location: "Bengaluru - Equipment Store",
        status: AssetStatus.AVAILABLE,
        isBookable: true,
        customValues: JSON.stringify({ warrantyMonths: 36, manufacturer: "Epson" }),
        nextMaintenanceAt: daysFromNow(3),
        retirementDate: daysFromNow(780),
      },
    ],
  });

  await db.assetStatusHistory.createMany({
    data: Object.values({
      laptop: ids.laptop,
      monitor: ids.monitor,
      room: ids.room,
      vehicle: ids.vehicle,
      desk: ids.desk,
      projector: ids.projector,
    }).map((assetId) => ({
      assetId,
      toStatus:
        assetId === ids.laptop || assetId === ids.monitor
          ? AssetStatus.ALLOCATED
          : AssetStatus.AVAILABLE,
      reason: "Imported during initial organization setup",
      actorId: ids.manager,
    })),
  });

  await db.assetAllocation.createMany({
    data: [
      {
        id: "allocation-laptop-priya",
        assetId: ids.laptop,
        assigneeUserId: ids.priya,
        expectedReturnAt: daysFromNow(5, 17),
        checkoutCondition: AssetCondition.GOOD,
        checkoutNotes: "Issued for platform engineering work",
        status: AllocationStatus.ACTIVE,
        createdById: ids.manager,
      },
      {
        id: "allocation-monitor-raj",
        assetId: ids.monitor,
        assigneeUserId: ids.raj,
        expectedReturnAt: daysFromNow(-3, 17),
        checkoutCondition: AssetCondition.FAIR,
        checkoutNotes: "Temporary display for service-bay diagnostics",
        status: AllocationStatus.ACTIVE,
        createdById: ids.manager,
      },
    ],
  });

  await db.resourceBooking.createMany({
    data: [
      {
        id: "booking-room-design-review",
        assetId: ids.room,
        bookedById: ids.priya,
        purpose: "Engineering design review",
        startAt: daysFromNow(1, 9),
        endAt: daysFromNow(1, 10),
        status: BookingStatus.UPCOMING,
      },
      {
        id: "booking-vehicle-site-visit",
        assetId: ids.vehicle,
        bookedById: ids.head,
        onBehalfOfDepartmentId: ids.engineering,
        purpose: "Data-centre site visit",
        startAt: daysFromNow(2, 11),
        endAt: daysFromNow(2, 15, 30),
        status: BookingStatus.UPCOMING,
      },
    ],
  });

  await db.maintenanceRequest.createMany({
    data: [
      {
        id: "maintenance-laptop-battery",
        assetId: ids.laptop,
        requestedById: ids.priya,
        issue: "Battery capacity has dropped sharply during field use.",
        priority: MaintenancePriority.HIGH,
        status: MaintenanceStatus.PENDING,
        dueAt: daysFromNow(4, 17),
      },
      {
        id: "maintenance-projector-filter",
        assetId: ids.projector,
        requestedById: ids.manager,
        issue: "Replace air filter and recalibrate image alignment.",
        priority: MaintenancePriority.MEDIUM,
        status: MaintenanceStatus.TECHNICIAN_ASSIGNED,
        previousAssetStatus: AssetStatus.AVAILABLE,
        approvedById: ids.manager,
        approvedAt: daysFromNow(-1, 10),
        technicianId: ids.raj,
        assignedAt: daysFromNow(-1, 11),
        scheduledFor: daysFromNow(0, 14),
        dueAt: daysFromNow(1, 17),
      },
    ],
  });

  await db.auditCycle.create({
    data: {
      id: "audit-q3-engineering",
      organizationId: ids.organization,
      name: "Q3 Engineering Floor Verification",
      scopeDepartmentId: ids.engineering,
      scopeLocation: "Bengaluru - Engineering Floor",
      startDate: daysFromNow(-1, 8),
      endDate: daysFromNow(6, 18),
      status: AuditCycleStatus.IN_PROGRESS,
      createdById: ids.admin,
      auditors: { create: { userId: ids.raj } },
      items: {
        create: [
          {
            assetId: ids.laptop,
            expectedStatus: AssetStatus.ALLOCATED,
            expectedCondition: AssetCondition.GOOD,
            expectedLocation: "Bengaluru - Engineering Floor",
            result: AuditResult.PENDING,
          },
          {
            assetId: ids.desk,
            expectedStatus: AssetStatus.AVAILABLE,
            expectedCondition: AssetCondition.GOOD,
            expectedLocation: "Bengaluru - Engineering Floor",
            result: AuditResult.PENDING,
          },
        ],
      },
    },
  });

  await db.notification.createMany({
    data: [
      {
        userId: ids.priya,
        type: NotificationType.ASSET_ASSIGNED,
        title: "ThinkPad X1 Carbon assigned",
        body: "AF-0001 is assigned to you until the expected return date.",
        entityType: "asset",
        entityId: ids.laptop,
        actionUrl: `/assets/${ids.laptop}`,
        dedupeKey: "seed:assignment:laptop:priya",
      },
      {
        userId: ids.raj,
        type: NotificationType.OVERDUE_RETURN,
        title: "Studio Display return is overdue",
        body: "AF-0002 passed its expected return date and needs an update.",
        entityType: "allocation",
        entityId: "allocation-monitor-raj",
        actionUrl: "/allocations?filter=overdue",
        dedupeKey: "seed:overdue:allocation-monitor-raj",
      },
      {
        userId: ids.raj,
        type: NotificationType.TECHNICIAN_ASSIGNED,
        title: "Projector maintenance assigned",
        body: "The Epson projector is scheduled for service today.",
        entityType: "maintenance",
        entityId: "maintenance-projector-filter",
        actionUrl: "/maintenance/maintenance-projector-filter",
        dedupeKey: "seed:technician:maintenance-projector-filter",
      },
    ],
  });

  await db.activityLog.createMany({
    data: [
      {
        organizationId: ids.organization,
        actorId: ids.admin,
        action: "organization.seeded",
        entityType: "organization",
        entityId: ids.organization,
        metadata: JSON.stringify({ source: "development-seed" }),
      },
      {
        organizationId: ids.organization,
        actorId: ids.manager,
        action: "asset.allocated",
        entityType: "asset",
        entityId: ids.laptop,
        metadata: JSON.stringify({ assigneeUserId: ids.priya }),
      },
      {
        organizationId: ids.organization,
        actorId: ids.priya,
        action: "booking.created",
        entityType: "booking",
        entityId: "booking-room-design-review",
        metadata: JSON.stringify({ assetId: ids.room }),
      },
    ],
  });

  console.info("AssetFlow demo data seeded.");
  console.info("Demo password for all accounts: AssetFlow2026!");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
