import {
  ArrowRight,
  CaretDown,
  ClockCountdown,
  Plus,
  Swap,
  TrayArrowDown,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { DecisionForm } from "@/components/allocations/decision-form";
import { ReturnRequestForm } from "@/components/allocations/return-request-form";
import { TransferRequestForm } from "@/components/allocations/transfer-request-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { canAct } from "@/domain/permissions";
import {
  getAllocationWorkspace,
  getCustodyTargets,
} from "@/features/allocations/service";
import { formatDate, formatDateTime, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Allocations" };

const tabs = [
  { id: "active", label: "Active custody", icon: TrayArrowDown },
  { id: "overdue", label: "Overdue", icon: ClockCountdown },
  { id: "transfers", label: "Transfers", icon: Swap },
  { id: "returns", label: "Returns", icon: TrayArrowDown },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default async function AllocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; created?: string }>;
}) {
  const user = await requireUser();
  const canRequestTransfer = canAct(user, "transfers.request");
  const canRequestReturn = canAct(user, "returns.request");
  const [workspace, targets] = await Promise.all([
    getAllocationWorkspace(user),
    canRequestTransfer || canRequestReturn
      ? getCustodyTargets(user)
      : Promise.resolve({ employees: [], departments: [] }),
  ]);
  const params = await searchParams;
  const activeTab: TabId = tabs.some((tab) => tab.id === params.tab)
    ? (params.tab as TabId)
    : "active";
  const visibleAllocations = workspace.allocations.filter((allocation) =>
    activeTab === "overdue" ? allocation.overdue : true,
  );
  const pendingTransfers = workspace.transferRequests.filter(
    (request) => request.status === "REQUESTED",
  ).length;
  const pendingReturns = workspace.returnRequests.filter(
    (request) => request.status === "REQUESTED",
  ).length;

  return (
    <div className="space-y-7">
      <header className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39755b]">
            Custody control
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            Allocations & transfers
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68766d]">
            Track who holds each asset, prevent double-allocation, and route
            custody changes through explicit approvals.
          </p>
        </div>
        {canAct(user, "assets.allocate") ? (
          <Link
            href="/allocations/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#39755b] px-4 text-sm font-semibold text-white hover:bg-[#285642]"
          >
            <Plus className="size-4" weight="bold" />
            Allocate asset
          </Link>
        ) : null}
      </header>

      {params.created === "1" ? (
        <div role="status" className="rounded-xl border border-[#bdd6c7] bg-[#edf7f1] px-4 py-3 text-sm text-[#2f6a50]">
          Asset allocation created and the new holder was notified.
        </div>
      ) : null}

      <nav className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[#d9e0da] bg-white p-1" aria-label="Allocation sections">
        {tabs.map(({ id, label, icon: Icon }) => {
          const count =
            id === "active"
              ? workspace.allocations.length
              : id === "overdue"
                ? workspace.allocations.filter((item) => item.overdue).length
                : id === "transfers"
                  ? pendingTransfers
                  : pendingReturns;
          return (
            <Link
              key={id}
              href={`/allocations?tab=${id}`}
              aria-current={activeTab === id ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold",
                activeTab === id
                  ? "bg-[#e8f0eb] text-[#285642]"
                  : "text-[#67756d] hover:bg-[#f1f4f1]",
              )}
            >
              <Icon className="size-4" weight={activeTab === id ? "fill" : "regular"} />
              {label}
              <span className="rounded-full bg-black/[0.05] px-1.5 font-mono text-[9px]">{count}</span>
            </Link>
          );
        })}
      </nav>

      {activeTab === "active" || activeTab === "overdue" ? (
        <section className="overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
          <div className="border-b border-[#e3e8e4] px-5 py-4 sm:px-6">
            <h2 className="font-bold tracking-tight">
              {activeTab === "overdue" ? "Overdue allocations" : "Active custody"}
            </h2>
          </div>
          {visibleAllocations.length ? (
            <div className="divide-y divide-[#e8ece9]">
              {visibleAllocations.map((allocation) => {
                const holder =
                  allocation.assigneeUser?.name ??
                  allocation.assigneeDepartment?.name ??
                  "Unassigned";
                return (
                  <details key={allocation.id} className="group">
                    <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 hover:bg-[#fafbfa] sm:grid-cols-[minmax(0,1.3fr)_minmax(130px,.7fr)_130px_120px_auto] sm:items-center sm:px-6 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{allocation.asset.name}</p>
                        <p className="mt-1 font-mono text-[10px] text-[#7a877f]">{allocation.asset.assetTag}</p>
                      </div>
                      <p className="truncate text-xs font-semibold text-[#526158]">{holder}</p>
                      <p className="text-xs text-[#718078]">
                        {allocation.expectedReturnAt
                          ? formatDate(allocation.expectedReturnAt)
                          : "No return date"}
                      </p>
                      <StatusBadge tone={allocation.overdue ? "danger" : "info"}>
                        {allocation.overdue ? "Overdue" : "Active"}
                      </StatusBadge>
                      <CaretDown className="size-4 text-[#7b8880] transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-6 border-t border-[#e4e9e5] bg-[#f8faf8] px-5 py-5 lg:grid-cols-2 sm:px-6">
                      <div>
                        <h3 className="mb-4 text-sm font-bold">Request transfer</h3>
                        {!canRequestTransfer ? (
                          <p className="text-xs leading-5 text-[#718078]">
                            You have read-only access to this custody record.
                          </p>
                        ) : allocation.transferRequests.length ||
                          allocation.returnRequests.length ? (
                          <p className="rounded-xl border border-[#e4d2b9] bg-[#fff8ea] px-3 py-3 text-xs text-[#7f5c2c]">
                            An open custody request must be decided before another can be created.
                          </p>
                        ) : (
                          <TransferRequestForm
                            allocationId={allocation.id}
                            employees={targets.employees}
                            departments={targets.departments}
                          />
                        )}
                      </div>
                      <div>
                        <h3 className="mb-4 text-sm font-bold">Request return</h3>
                        {!canRequestReturn ? (
                          <p className="text-xs leading-5 text-[#718078]">
                            Return decisions are handled by the Asset Manager.
                          </p>
                        ) : allocation.returnRequests.length ||
                          allocation.transferRequests.length ? (
                          <p className="rounded-xl border border-[#d4dce5] bg-[#f3f7fa] px-3 py-3 text-xs text-[#506878]">
                            An open custody request must be decided before another can be created.
                          </p>
                        ) : (
                          <ReturnRequestForm
                            allocationId={allocation.id}
                            currentCondition={allocation.checkoutCondition}
                          />
                        )}
                      </div>
                      <Link
                        href={`/allocations/${allocation.id}`}
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#39755b] hover:underline lg:col-span-2"
                      >
                        View allocation record
                        <ArrowRight className="size-3.5" weight="bold" />
                      </Link>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <p className="px-6 py-14 text-center text-sm text-[#718078]">
              {activeTab === "overdue" ? "No allocations are overdue." : "No active allocations in your scope."}
            </p>
          )}
        </section>
      ) : null}

      {activeTab === "transfers" ? (
        <section className="space-y-3">
          {workspace.transferRequests.length ? (
            workspace.transferRequests.map((request) => (
              <details key={request.id} className="group overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
                <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(120px,.6fr)_minmax(140px,.7fr)_120px_auto] sm:items-center sm:px-6 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{request.asset.name}</p>
                    <p className="mt-1 font-mono text-[10px] text-[#7a877f]">{request.asset.assetTag}</p>
                  </div>
                  <p className="truncate text-xs text-[#637168]">By {request.requestedBy.name}</p>
                  <p className="truncate text-xs font-semibold text-[#526158]">
                    To {request.targetUser?.name ?? request.targetDepartment?.name}
                  </p>
                  <StatusBadge tone={request.status === "REQUESTED" ? "warning" : request.status === "APPROVED" ? "success" : "neutral"}>
                    {humanizeEnum(request.status)}
                  </StatusBadge>
                  <CaretDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-[#e4e9e5] bg-[#f8faf8] px-5 py-5 sm:px-6">
                  <p className="mb-4 text-sm leading-6 text-[#526158]">{request.reason}</p>
                  {request.status === "REQUESTED" && canAct(user, "transfers.decide") ? (
                    <DecisionForm requestId={request.id} type="transfer" />
                  ) : (
                    <p className="text-xs text-[#718078]">Requested {formatDateTime(request.createdAt)}</p>
                  )}
                </div>
              </details>
            ))
          ) : (
            <p className="rounded-2xl border border-[#d9e0da] bg-white px-6 py-14 text-center text-sm text-[#718078]">No transfer requests.</p>
          )}
        </section>
      ) : null}

      {activeTab === "returns" ? (
        <section className="space-y-3">
          {workspace.returnRequests.length ? (
            workspace.returnRequests.map((request) => (
              <details key={request.id} className="group overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
                <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(120px,.6fr)_140px_120px_auto] sm:items-center sm:px-6 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{request.allocation.asset.name}</p>
                    <p className="mt-1 font-mono text-[10px] text-[#7a877f]">{request.allocation.asset.assetTag}</p>
                  </div>
                  <p className="truncate text-xs text-[#637168]">By {request.requestedBy.name}</p>
                  <p className="text-xs font-semibold">{humanizeEnum(request.condition)}</p>
                  <StatusBadge tone={request.status === "REQUESTED" ? "warning" : request.status === "APPROVED" ? "success" : "neutral"}>
                    {humanizeEnum(request.status)}
                  </StatusBadge>
                  <CaretDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-[#e4e9e5] bg-[#f8faf8] px-5 py-5 sm:px-6">
                  <p className="mb-4 text-sm leading-6 text-[#526158]">{request.checkInNotes}</p>
                  {request.status === "REQUESTED" && canAct(user, "returns.decide") ? (
                    <DecisionForm requestId={request.id} type="return" />
                  ) : (
                    <p className="text-xs text-[#718078]">Requested {formatDateTime(request.createdAt)}</p>
                  )}
                </div>
              </details>
            ))
          ) : (
            <p className="rounded-2xl border border-[#d9e0da] bg-white px-6 py-14 text-center text-sm text-[#718078]">No return requests.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
