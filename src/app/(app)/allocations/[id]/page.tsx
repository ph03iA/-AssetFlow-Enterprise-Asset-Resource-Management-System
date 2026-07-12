import {
  ArrowLeft,
  CalendarBlank,
  ClockCounterClockwise,
  Package,
  Swap,
  TrayArrowDown,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DecisionForm } from "@/components/allocations/decision-form";
import { ReturnRequestForm } from "@/components/allocations/return-request-form";
import { TransferRequestForm } from "@/components/allocations/transfer-request-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { canAct } from "@/domain/permissions";
import {
  getAllocationDetail,
  getCustodyTargets,
} from "@/features/allocations/service";
import { formatDate, formatDateTime, humanizeEnum } from "@/lib/format";
import { requireUser } from "@/server/auth/session";

const allocationTone = {
  ACTIVE: "info",
  RETURNED: "success",
  TRANSFERRED: "neutral",
  CANCELLED: "neutral",
} as const;

const requestTone = {
  REQUESTED: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  COMPLETED: "success",
  CANCELLED: "neutral",
} as const;

export default async function AllocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const allocation = await getAllocationDetail(user, (await params).id);

  if (!allocation) notFound();

  const active = allocation.status === "ACTIVE";
  const canRequestTransfer = active && canAct(user, "transfers.request");
  const canRequestReturn = active && canAct(user, "returns.request");
  const targets =
    canRequestTransfer || canRequestReturn
      ? await getCustodyTargets(user)
      : { employees: [], departments: [] };
  const holder =
    allocation.assigneeUser?.name ??
    allocation.assigneeDepartment?.name ??
    "Organization pool";
  const openTransfer = allocation.transferRequests.find(
    (request) => request.status === "REQUESTED",
  );
  const openReturn = allocation.returnRequests.find(
    (request) => request.status === "REQUESTED",
  );

  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/allocations"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#39755b] hover:underline"
        >
          <ArrowLeft className="size-3.5" weight="bold" aria-hidden="true" />
          Allocations
        </Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#39755b]">
                {allocation.asset.assetTag}
              </p>
              <StatusBadge tone={allocationTone[allocation.status]}>
                {humanizeEnum(allocation.status)}
              </StatusBadge>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
              {allocation.asset.name}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#68766d]">
              Custody record for {holder}.
            </p>
          </div>
          <Link
            href={`/assets/${allocation.asset.id}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ccd5ce] bg-white px-3.5 text-sm font-semibold text-[#34423a] hover:border-[#9fad9f]"
          >
            <Package className="size-4" aria-hidden="true" />
            View asset
          </Link>
        </div>
      </header>

      <section className="grid overflow-hidden rounded-2xl border border-[#d9e0da] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Current holder", value: holder, icon: UserCircle },
          {
            label: "Allocated",
            value: formatDate(allocation.allocatedAt),
            icon: CalendarBlank,
          },
          {
            label: "Expected return",
            value: allocation.expectedReturnAt
              ? formatDate(allocation.expectedReturnAt)
              : "No return date",
            icon: ClockCounterClockwise,
          },
          {
            label: "Checkout condition",
            value: humanizeEnum(allocation.checkoutCondition),
            icon: Package,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="min-w-0 border-b border-r border-[#e4e9e5] px-5 py-5 xl:border-b-0"
          >
            <div className="flex items-center gap-2 text-[#718078]">
              <Icon className="size-4" aria-hidden="true" />
              <p className="text-xs font-semibold">{label}</p>
            </div>
            <p className="mt-3 truncate text-sm font-bold text-[#2e3b33]" title={value}>
              {value}
            </p>
          </div>
        ))}
      </section>

      {active && (canRequestTransfer || canRequestReturn) ? (
        <section className="grid gap-6 lg:grid-cols-2">
          {canRequestTransfer ? (
            <div className="rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#e8f0eb] text-[#39755b]">
                  <Swap className="size-[18px]" weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold tracking-tight">Transfer custody</h2>
                  <p className="mt-0.5 text-xs text-[#718078]">Route a new custodian for approval.</p>
                </div>
              </div>
              {openTransfer || openReturn ? (
                <p className="rounded-xl border border-[#e4d2b9] bg-[#fff8ea] px-4 py-3 text-sm text-[#7f5c2c]">
                  An open custody request is already awaiting a decision.
                </p>
              ) : (
                <TransferRequestForm
                  allocationId={allocation.id}
                  employees={targets.employees}
                  departments={targets.departments}
                />
              )}
            </div>
          ) : null}

          {canRequestReturn ? (
            <div className="rounded-2xl border border-[#d9e0da] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#eef5f9] text-[#4f7286]">
                  <TrayArrowDown className="size-[18px]" weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold tracking-tight">Return asset</h2>
                  <p className="mt-0.5 text-xs text-[#718078]">Record the condition for manager check-in.</p>
                </div>
              </div>
              {openReturn || openTransfer ? (
                <p className="rounded-xl border border-[#d4dce5] bg-[#f3f7fa] px-4 py-3 text-sm text-[#506878]">
                  An open custody request is already awaiting a decision.
                </p>
              ) : (
                <ReturnRequestForm
                  allocationId={allocation.id}
                  currentCondition={allocation.checkoutCondition}
                />
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
          <div className="border-b border-[#e4e9e5] px-5 py-4 sm:px-6">
            <h2 className="font-bold tracking-tight">Transfer requests</h2>
          </div>
          {allocation.transferRequests.length ? (
            <div className="divide-y divide-[#e8ece9]">
              {allocation.transferRequests.map((request) => (
                <div key={request.id} className="px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        To {request.targetUser?.name ?? request.targetDepartment?.name}
                      </p>
                      <p className="mt-1 text-xs text-[#718078]">
                        Requested by {request.requestedBy.name} / {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                    <StatusBadge tone={requestTone[request.status]}>
                      {humanizeEnum(request.status)}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#526158]">{request.reason}</p>
                  {request.decisionNotes ? (
                    <p className="mt-2 text-xs leading-5 text-[#718078]">
                      Decision: {request.decisionNotes}
                    </p>
                  ) : null}
                  {request.status === "REQUESTED" && canAct(user, "transfers.decide") ? (
                    <div className="mt-5 border-t border-[#e4e9e5] pt-5">
                      <DecisionForm requestId={request.id} type="transfer" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-12 text-center text-sm text-[#718078]">No transfer requests.</p>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
          <div className="border-b border-[#e4e9e5] px-5 py-4 sm:px-6">
            <h2 className="font-bold tracking-tight">Return requests</h2>
          </div>
          {allocation.returnRequests.length ? (
            <div className="divide-y divide-[#e8ece9]">
              {allocation.returnRequests.map((request) => (
                <div key={request.id} className="px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        {humanizeEnum(request.condition)} at check-in
                      </p>
                      <p className="mt-1 text-xs text-[#718078]">
                        Requested by {request.requestedBy.name} / {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                    <StatusBadge tone={requestTone[request.status]}>
                      {humanizeEnum(request.status)}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#526158]">{request.checkInNotes}</p>
                  {request.decisionNotes ? (
                    <p className="mt-2 text-xs leading-5 text-[#718078]">
                      Decision: {request.decisionNotes}
                    </p>
                  ) : null}
                  {request.status === "REQUESTED" && canAct(user, "returns.decide") ? (
                    <div className="mt-5 border-t border-[#e4e9e5] pt-5">
                      <DecisionForm requestId={request.id} type="return" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-12 text-center text-sm text-[#718078]">No return requests.</p>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
        <div className="border-b border-[#e4e9e5] px-5 py-4 sm:px-6">
          <h2 className="font-bold tracking-tight">Record details</h2>
        </div>
        <dl className="grid divide-y divide-[#e8ece9] px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-0">
          <div className="px-0 py-4 sm:px-6">
            <dt className="text-xs text-[#718078]">Created by</dt>
            <dd className="mt-1 text-sm font-semibold">{allocation.createdBy.name}</dd>
          </div>
          <div className="px-0 py-4 sm:px-6">
            <dt className="text-xs text-[#718078]">Checkout notes</dt>
            <dd className="mt-1 text-sm font-semibold">
              {allocation.checkoutNotes ?? "No checkout notes"}
            </dd>
          </div>
          {allocation.returnedAt ? (
            <div className="px-0 py-4 sm:border-t sm:border-[#e8ece9] sm:px-6">
              <dt className="text-xs text-[#718078]">Closed</dt>
              <dd className="mt-1 text-sm font-semibold">
                {formatDateTime(allocation.returnedAt)} by {allocation.closedBy?.name ?? "System"}
              </dd>
            </div>
          ) : null}
          {allocation.returnNotes ? (
            <div className="px-0 py-4 sm:border-t sm:border-[#e8ece9] sm:px-6">
              <dt className="text-xs text-[#718078]">Closure notes</dt>
              <dd className="mt-1 text-sm font-semibold">{allocation.returnNotes}</dd>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}
