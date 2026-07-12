import {
  ArrowLeft,
  CalendarBlank,
  ClockCounterClockwise,
  FileText,
  MapPin,
  Package,
  QrCode,
  Swap,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/ui/status-badge";
import { canAct } from "@/domain/permissions";
import { getAssetDetail } from "@/features/assets/service";
import { formatCurrency, formatDate, formatDateTime, humanizeEnum } from "@/lib/format";
import { requireUser } from "@/server/auth/session";

const statusTone = {
  AVAILABLE: "success",
  ALLOCATED: "info",
  RESERVED: "warning",
  UNDER_MAINTENANCE: "warning",
  LOST: "danger",
  RETIRED: "neutral",
  DISPOSED: "neutral",
} as const;

function parseValues(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const asset = await getAssetDetail(user, (await params).id);

  if (!asset) notFound();

  const activeAllocation = asset.allocations.find(
    (allocation) => allocation.status === "ACTIVE",
  );
  const holder =
    activeAllocation?.assigneeUser?.name ??
    activeAllocation?.assigneeDepartment?.name ??
    "Organization pool";
  const customValues = parseValues(asset.customValues);

  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/assets"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#39755b] hover:underline"
        >
          <ArrowLeft className="size-3.5" weight="bold" aria-hidden="true" />
          Asset directory
        </Link>
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#39755b]">
                {asset.assetTag}
              </p>
              <StatusBadge tone={statusTone[asset.status]}>
                {humanizeEnum(asset.status)}
              </StatusBadge>
              {asset.isBookable ? <StatusBadge tone="info">Bookable</StatusBadge> : null}
            </div>
            <h1 className="mt-3 truncate text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
              {asset.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68766d]">
              {asset.description ?? `${asset.category.name} asset at ${asset.location}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canAct(user, "assets.allocate") ? (
              <Link
                href={`/allocations/new?assetId=${asset.id}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#39755b] px-3.5 text-sm font-semibold text-white hover:bg-[#285642]"
              >
                <Swap className="size-4" weight="bold" aria-hidden="true" />
                Allocate or transfer
              </Link>
            ) : null}
            {canAct(user, "maintenance.request") ? (
              <Link
                href={`/maintenance/new?assetId=${asset.id}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ccd5ce] bg-white px-3.5 text-sm font-semibold text-[#34423a] hover:border-[#9fad9f]"
              >
                <Wrench className="size-4" aria-hidden="true" />
                Raise maintenance
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid overflow-hidden rounded-2xl border border-[#d9e0da] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Current holder", value: holder, icon: Package },
          { label: "Location", value: asset.location, icon: MapPin },
          { label: "Category", value: asset.category.name, icon: FileText },
          { label: "QR identity", value: asset.qrValue, icon: QrCode },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="min-w-0 border-b border-r border-[#e4e9e5] px-5 py-5 xl:border-b-0">
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

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
            <div className="border-b border-[#e4e9e5] px-5 py-4">
              <h2 className="font-bold tracking-tight">Asset record</h2>
            </div>
            <dl className="divide-y divide-[#e8ece9] px-5">
              {[
                ["Serial number", asset.serialNumber ?? "Not recorded"],
                ["Condition", humanizeEnum(asset.condition)],
                ["Department", asset.department?.name ?? "Organization pool"],
                ["Acquired", asset.acquisitionDate ? formatDate(asset.acquisitionDate) : "Not recorded"],
                [
                  "Acquisition cost",
                  asset.acquisitionCost
                    ? formatCurrency(asset.acquisitionCost.toString(), asset.organization.currency)
                    : "Not recorded",
                ],
                ["Next maintenance", asset.nextMaintenanceAt ? formatDate(asset.nextMaintenanceAt) : "Not planned"],
                ["Planned retirement", asset.retirementDate ? formatDate(asset.retirementDate) : "Not planned"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 py-3.5 text-xs">
                  <dt className="text-[#718078]">{label}</dt>
                  <dd className="min-w-0 break-words text-right font-semibold text-[#36443c]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {Object.keys(customValues).length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
              <div className="border-b border-[#e4e9e5] px-5 py-4">
                <h2 className="font-bold tracking-tight">Category details</h2>
              </div>
              <dl className="divide-y divide-[#e8ece9] px-5">
                {Object.entries(customValues).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3.5 text-xs">
                    <dt className="text-[#718078]">{humanizeEnum(key.replace(/([A-Z])/g, "_$1"))}</dt>
                    <dd className="font-semibold text-[#36443c]">{String(value ?? "-")}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
          <div className="flex items-center gap-3 border-b border-[#e4e9e5] px-5 py-5 sm:px-6">
            <div className="grid size-9 place-items-center rounded-xl bg-[#e8f0eb] text-[#39755b]">
              <ClockCounterClockwise className="size-[18px]" weight="duotone" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold tracking-tight">Lifecycle history</h2>
              <p className="mt-0.5 text-xs text-[#718078]">Status, custody, maintenance, and audit events.</p>
            </div>
          </div>
          <div className="divide-y divide-[#e8ece9]">
            {asset.statusHistory.map((history) => (
              <div key={history.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[22px_minmax(0,1fr)_auto] sm:px-6">
                <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-[#dce9e0] text-[#39755b]">
                  <span className="size-1.5 rounded-full bg-current" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#2e3b33]">
                    {history.fromStatus
                      ? `${humanizeEnum(history.fromStatus)} to ${humanizeEnum(history.toStatus)}`
                      : humanizeEnum(history.toStatus)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#718078]">{history.reason}</p>
                  <p className="mt-1 text-[10px] text-[#8a968f]">By {history.actor?.name ?? "System"}</p>
                </div>
                <time className="font-mono text-[10px] text-[#7a877f]">{formatDateTime(history.createdAt)}</time>
              </div>
            ))}
            {asset.allocations.map((allocation) => (
              <div key={allocation.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[22px_minmax(0,1fr)_auto] sm:px-6">
                <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-[#e8edf3] text-[#4f7286]">
                  <Swap className="size-3" weight="bold" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Allocated to {allocation.assigneeUser?.name ?? allocation.assigneeDepartment?.name}</p>
                  <p className="mt-1 text-xs text-[#718078]">{humanizeEnum(allocation.status)} / by {allocation.createdBy.name}</p>
                </div>
                <time className="font-mono text-[10px] text-[#7a877f]">{formatDateTime(allocation.allocatedAt)}</time>
              </div>
            ))}
            {asset.maintenanceRequests.map((request) => (
              <div key={request.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[22px_minmax(0,1fr)_auto] sm:px-6">
                <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-[#f7ecd9] text-[#936329]">
                  <Wrench className="size-3" weight="fill" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Maintenance {humanizeEnum(request.status)}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#718078]">{request.issue}</p>
                </div>
                <time className="font-mono text-[10px] text-[#7a877f]">{formatDateTime(request.createdAt)}</time>
              </div>
            ))}
            {asset.auditItems.map((item) => (
              <Link
                key={item.id}
                href={`/audits/${item.cycle.id}`}
                className="grid gap-3 px-5 py-4 hover:bg-[#fafbfa] sm:grid-cols-[22px_minmax(0,1fr)_auto] sm:px-6"
              >
                <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-[#e7ebef] text-[#566b79]">
                  <CalendarBlank className="size-3" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.cycle.name}</p>
                  <p className="mt-1 text-xs text-[#718078]">Audit result: {humanizeEnum(item.result)}</p>
                </div>
                <time className="font-mono text-[10px] text-[#7a877f]">{formatDate(item.createdAt, { year: undefined })}</time>
              </Link>
            ))}
            {asset.statusHistory.length + asset.allocations.length + asset.maintenanceRequests.length + asset.auditItems.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-[#718078]">No lifecycle events have been recorded.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
