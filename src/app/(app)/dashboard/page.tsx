import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  ClockCountdown,
  Package,
  Plus,
  Swap,
  Warning,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { canAct } from "@/domain/permissions";
import { getDashboardData } from "@/features/dashboard/queries";
import { daysOverdue, formatDate, humanizeEnum } from "@/lib/format";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

const metricDefinitions = [
  { key: "assetsAvailable", label: "Assets available", icon: Package },
  { key: "assetsAllocated", label: "Assets allocated", icon: CheckCircle },
  { key: "maintenanceToday", label: "Maintenance today", icon: Wrench },
  { key: "activeBookings", label: "Active bookings", icon: CalendarBlank },
  { key: "pendingTransfers", label: "Pending transfers", icon: Swap },
  { key: "upcomingReturns", label: "Upcoming returns", icon: ClockCountdown },
] as const;

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const firstName = user.name.split(/\s+/)[0];
  const quickActions = [
    canAct(user, "assets.register")
      ? { label: "Register asset", href: "/assets/new", icon: Plus }
      : null,
    canAct(user, "bookings.create")
      ? { label: "Book resource", href: "/bookings/new", icon: CalendarBlank }
      : null,
    canAct(user, "maintenance.request")
      ? { label: "Raise maintenance", href: "/maintenance/new", icon: Wrench }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <header className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39755b]">
            Operational overview
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#17211d] sm:text-4xl">
            Good day, {firstName}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68766d]">
            Here is what needs attention across assets, shared resources, and
            approvals in your scope.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => {
            if (!action) return null;
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ccd5ce] bg-white px-3.5 text-sm font-semibold text-[#34423a] transition-[border-color,transform] hover:border-[#9fad9f] active:translate-y-px"
              >
                <Icon className="size-4 text-[#39755b]" weight="bold" aria-hidden="true" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </header>

      <section
        aria-label="Key performance indicators"
        className="grid overflow-hidden rounded-2xl border border-[#d9e0da] bg-white grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
      >
        {metricDefinitions.map(({ key, label, icon: Icon }, index) => (
          <div
            key={key}
            className="min-w-0 border-b border-r border-[#e3e8e4] px-4 py-5 last:border-r-0 md:px-5 xl:border-b-0"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 text-xs font-semibold leading-5 text-[#718078]">
                {label}
              </p>
              <Icon
                className="size-4 shrink-0 text-[#789486]"
                weight={index === 0 ? "fill" : "regular"}
                aria-hidden="true"
              />
            </div>
            <p className="mt-4 font-mono text-3xl font-semibold tracking-[-0.05em] text-[#17211d]">
              {data.metrics[key].toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#dfc2c2] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eee0e0] bg-[#fff9f8] px-5 py-5 sm:px-6">
            <div className="flex gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f7e5e3] text-[#a34343]">
                <Warning className="size-[18px]" weight="fill" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-bold tracking-tight text-[#332522]">Overdue returns</h2>
                <p className="mt-1 text-xs leading-5 text-[#806d68]">
                  Open allocations past their expected return date.
                </p>
              </div>
            </div>
            <Link
              href="/allocations?filter=overdue"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#934441] hover:underline"
            >
              Review all
              <ArrowRight className="size-3.5" weight="bold" aria-hidden="true" />
            </Link>
          </div>

          {data.overdueAllocations.length > 0 ? (
            <div className="divide-y divide-[#ecefec]">
              {data.overdueAllocations.map((allocation) => (
                <Link
                  key={allocation.id}
                  href={`/allocations/${allocation.id}`}
                  className="grid min-w-0 gap-3 px-5 py-4 transition-colors hover:bg-[#fafbfa] sm:grid-cols-[minmax(0,1.3fr)_minmax(120px,.7fr)_auto] sm:items-center sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#253129]">
                      {allocation.asset.name}
                    </p>
                    <p className="mt-1 font-mono text-[10px] font-semibold text-[#7a877f]">
                      {allocation.asset.assetTag}
                    </p>
                  </div>
                  <p className="truncate text-xs text-[#647269]">
                    {allocation.assigneeUser?.name ??
                      allocation.assigneeDepartment?.name ??
                      "Unassigned"}
                  </p>
                  <div className="justify-self-start sm:justify-self-end">
                    <StatusBadge tone="danger">
                      {allocation.expectedReturnAt
                        ? `${daysOverdue(allocation.expectedReturnAt)}d overdue`
                        : "Overdue"}
                    </StatusBadge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid min-h-44 place-items-center px-6 text-center">
              <div>
                <CheckCircle className="mx-auto size-7 text-[#5c8c72]" weight="duotone" />
                <p className="mt-3 text-sm font-bold text-[#304038]">Nothing overdue</p>
                <p className="mt-1 text-xs text-[#718078]">Every expected return is currently on track.</p>
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
          <div className="border-b border-[#e3e8e4] px-5 py-5">
            <h2 className="font-bold tracking-tight">Upcoming returns</h2>
            <p className="mt-1 text-xs leading-5 text-[#718078]">Due in the next seven days.</p>
          </div>
          {data.upcomingAllocationRows.length > 0 ? (
            <div className="divide-y divide-[#ecefec]">
              {data.upcomingAllocationRows.map((allocation) => (
                <Link
                  key={allocation.id}
                  href={`/allocations/${allocation.id}`}
                  className="flex min-w-0 items-center gap-3 px-5 py-4 hover:bg-[#fafbfa]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf2ee] font-mono text-[9px] font-bold text-[#39755b]">
                    {allocation.asset.assetTag.replace("AF-", "")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#2b3830]">
                      {allocation.asset.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[#718078]">
                      {allocation.assigneeUser?.name ?? allocation.assigneeDepartment?.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-[10px] font-semibold text-[#58675f]">
                    {allocation.expectedReturnAt
                      ? formatDate(allocation.expectedReturnAt, { year: undefined })
                      : "-"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-xs text-[#718078]">No returns are due this week.</p>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#e3e8e4] px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-bold tracking-tight">Maintenance queue</h2>
            <p className="mt-1 text-xs text-[#718078]">Open requests ordered by urgency.</p>
          </div>
          <Link href="/maintenance" className="text-xs font-bold text-[#39755b] hover:underline">
            Open workspace
          </Link>
        </div>
        {data.maintenanceQueue.length > 0 ? (
          <div className="grid divide-y divide-[#ecefec] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {data.maintenanceQueue.map((request) => (
              <Link
                key={request.id}
                href={`/maintenance/${request.id}`}
                className="grid min-w-0 gap-3 px-5 py-4 hover:bg-[#fafbfa] sm:px-6"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="truncate text-sm font-bold">{request.asset.name}</p>
                  <StatusBadge tone={request.priority === "CRITICAL" || request.priority === "HIGH" ? "danger" : "warning"}>
                    {humanizeEnum(request.priority)}
                  </StatusBadge>
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-[#68766d]">{request.issue}</p>
                <div className="flex items-center justify-between font-mono text-[10px] text-[#7a877f]">
                  <span>{request.asset.assetTag}</span>
                  <span>{humanizeEnum(request.status)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-xs text-[#718078]">No maintenance work is waiting.</p>
        )}
      </section>
    </div>
  );
}
