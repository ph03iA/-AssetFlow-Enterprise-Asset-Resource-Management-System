import {
  Buildings,
  CaretDown,
  PencilSimple,
  Plus,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { CategoryForm } from "@/components/organization/category-form";
import { DepartmentForm } from "@/components/organization/department-form";
import { EmployeeAccessForm } from "@/components/organization/employee-access-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { getOrganizationSetupData } from "@/features/organization/service";
import type { CategoryField } from "@/features/organization/schemas";
import { Role } from "@/generated/prisma/enums";
import { formatDate, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Organization setup" };

const tabs = [
  { id: "departments", label: "Departments", icon: Buildings },
  { id: "categories", label: "Asset categories", icon: SquaresFour },
  { id: "employees", label: "Employee directory", icon: UsersThree },
] as const;

type TabId = (typeof tabs)[number]["id"];

function parseFields(value: string): CategoryField[] {
  try {
    const fields = JSON.parse(value);
    return Array.isArray(fields) ? fields : [];
  } catch {
    return [];
  }
}

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await requirePermission("organization.manage");
  const data = await getOrganizationSetupData(actor);
  const requestedTab = (await searchParams).tab;
  const activeTab: TabId = tabs.some((tab) => tab.id === requestedTab)
    ? (requestedTab as TabId)
    : "departments";
  const departmentOptions = data.departments.map((department) => ({
    id: department.id,
    name: department.name,
    isActive: department.isActive,
  }));
  const headOptions = data.employees
    .filter(
      (employee) =>
        employee.role === Role.DEPARTMENT_HEAD && employee.status === "ACTIVE",
    )
    .map((employee) => ({
      id: employee.id,
      name: employee.name,
      email: employee.email,
    }));

  return (
    <div className="space-y-7">
      <header className="max-w-3xl">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39755b]">
          Admin workspace
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
          Organization setup
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#68766d]">
          Maintain the departments, asset taxonomy, and employee access that every
          operational workflow depends on.
        </p>
      </header>

      <nav
        aria-label="Organization setup sections"
        className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[#d9e0da] bg-white p-1"
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const count =
            id === "departments"
              ? data.departments.length
              : id === "categories"
                ? data.categories.length
                : data.employees.length;
          return (
            <Link
              key={id}
              href={`/organization?tab=${id}`}
              aria-current={activeTab === id ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
                activeTab === id
                  ? "bg-[#e8f0eb] text-[#285642]"
                  : "text-[#67756d] hover:bg-[#f1f4f1] hover:text-[#28362e]",
              )}
            >
              <Icon className="size-4" weight={activeTab === id ? "fill" : "regular"} />
              {label}
              <span className="rounded-full bg-black/[0.05] px-1.5 font-mono text-[9px]">
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {activeTab === "departments" ? (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,.65fr)]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
            <div className="border-b border-[#e3e8e4] px-5 py-5 sm:px-6">
              <h2 className="font-bold tracking-tight">Department structure</h2>
              <p className="mt-1 text-xs text-[#718078]">
                Hierarchy, ownership, people, and asset scope.
              </p>
            </div>
            <div className="divide-y divide-[#e8ece9]">
              {data.departments.map((department) => (
                <details key={department.id} className="group">
                  <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 hover:bg-[#fafbfa] sm:grid-cols-[minmax(0,1fr)_120px_120px_auto] sm:items-center sm:px-6 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <p className="truncate text-sm font-bold text-[#27342c]">
                          {department.name}
                        </p>
                        <StatusBadge tone={department.isActive ? "success" : "neutral"}>
                          {department.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-[#7a877f]">
                        {department.code}
                        {department.parent ? ` / ${department.parent.name}` : " / Root"}
                      </p>
                    </div>
                    <p className="truncate text-xs text-[#637168]">
                      {department.head?.name ?? "No head"}
                    </p>
                    <p className="font-mono text-[10px] text-[#718078]">
                      {department._count.members} people / {department._count.assets} assets
                    </p>
                    <CaretDown className="size-4 text-[#7b8880] transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-[#e4e9e5] bg-[#f8faf8] px-5 py-5 sm:px-6">
                    <DepartmentForm
                      departments={departmentOptions}
                      heads={headOptions}
                      initial={{
                        id: department.id,
                        name: department.name,
                        code: department.code,
                        description: department.description,
                        parentId: department.parentId,
                        headId: department.headId,
                        isActive: department.isActive,
                      }}
                    />
                  </div>
                </details>
              ))}
            </div>
          </section>

          <aside className="self-start rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6 xl:sticky xl:top-24">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-[#e8f0eb] text-[#39755b]">
                <Plus className="size-4" weight="bold" />
              </div>
              <div>
                <h2 className="font-bold tracking-tight">New department</h2>
                <p className="mt-0.5 text-xs text-[#718078]">Add a master-data record.</p>
              </div>
            </div>
            <DepartmentForm departments={departmentOptions} heads={headOptions} />
          </aside>
        </div>
      ) : null}

      {activeTab === "categories" ? (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(400px,.8fr)]">
          <section className="min-w-0 space-y-3">
            {data.categories.map((category) => {
              const fields = parseFields(category.fieldDefinitions);
              return (
                <details
                  key={category.id}
                  className="group overflow-hidden rounded-2xl border border-[#d9e0da] bg-white"
                >
                  <summary className="grid cursor-pointer list-none gap-3 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h2 className="truncate font-bold tracking-tight">{category.name}</h2>
                        <StatusBadge tone={category.isActive ? "success" : "neutral"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-[#718078]">
                        {category.description ?? "No description"}
                      </p>
                    </div>
                    <p className="font-mono text-[10px] text-[#718078]">
                      {category._count.assets} assets / {fields.length} custom fields
                    </p>
                    <PencilSimple className="size-4 text-[#718078]" />
                  </summary>
                  <div className="border-t border-[#e4e9e5] bg-[#f8faf8] px-5 py-5 sm:px-6">
                    <CategoryForm
                      initial={{
                        id: category.id,
                        name: category.name,
                        description: category.description,
                        isActive: category.isActive,
                        fieldDefinitions: fields,
                      }}
                    />
                  </div>
                </details>
              );
            })}
          </section>
          <aside className="self-start rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6 xl:sticky xl:top-24">
            <h2 className="font-bold tracking-tight">New asset category</h2>
            <p className="mt-1 mb-5 text-xs text-[#718078]">
              Define a reusable asset class and its additional fields.
            </p>
            <CategoryForm />
          </aside>
        </div>
      ) : null}

      {activeTab === "employees" ? (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
          <div className="border-b border-[#e3e8e4] px-5 py-5 sm:px-6">
            <h2 className="font-bold tracking-tight">Employee directory</h2>
            <p className="mt-1 text-xs leading-5 text-[#718078]">
              This is the only place Asset Manager and Department Head roles can be assigned.
            </p>
          </div>
          <div className="divide-y divide-[#e8ece9]">
            {data.employees.map((employee) => (
              <details key={employee.id} className="group">
                <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 hover:bg-[#fafbfa] sm:grid-cols-[minmax(0,1.2fr)_minmax(120px,.7fr)_140px_100px_auto] sm:items-center sm:px-6 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{employee.name}</p>
                    <p className="mt-1 truncate text-[11px] text-[#718078]">{employee.email}</p>
                  </div>
                  <p className="truncate text-xs text-[#637168]">
                    {employee.department?.name ?? "No department"}
                  </p>
                  <p className="text-xs font-semibold text-[#526158]">
                    {humanizeEnum(employee.role)}
                  </p>
                  <StatusBadge tone={employee.status === "ACTIVE" ? "success" : "neutral"}>
                    {humanizeEnum(employee.status)}
                  </StatusBadge>
                  <CaretDown className="size-4 text-[#7b8880] transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-[#e4e9e5] bg-[#f8faf8] px-5 py-5 sm:px-6">
                  {employee.role === Role.ADMIN ? (
                    <div className="rounded-xl border border-[#d7dfd9] bg-white p-4 text-sm text-[#5f6d65]">
                      <p className="font-bold text-[#2e3b33]">Bootstrap Administrator</p>
                      <p className="mt-1 text-xs leading-5">
                        This account is protected from directory role or status changes. Last sign-in:{" "}
                        {employee.lastLoginAt ? formatDate(employee.lastLoginAt) : "not recorded"}.
                      </p>
                    </div>
                  ) : (
                    <EmployeeAccessForm employee={employee} departments={departmentOptions} />
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
