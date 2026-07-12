import {
  ArrowRight,
  FunnelSimple,
  MagnifyingGlass,
  Package,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { canAct } from "@/domain/permissions";
import { assetSearchSchema } from "@/features/assets/schemas";
import { getAssetDirectory } from "@/features/assets/service";
import { AssetStatus } from "@/generated/prisma/enums";
import { humanizeEnum } from "@/lib/format";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Asset directory" };

const statusTone = {
  AVAILABLE: "success",
  ALLOCATED: "info",
  RESERVED: "warning",
  UNDER_MAINTENANCE: "warning",
  LOST: "danger",
  RETIRED: "neutral",
  DISPOSED: "neutral",
} as const;

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const parsedFilters = assetSearchSchema.safeParse({
    query: params.query ?? "",
    categoryId: params.categoryId ?? "",
    departmentId: params.departmentId ?? "",
    status: params.status || null,
    location: params.location ?? "",
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : assetSearchSchema.parse({});
  const data = await getAssetDirectory(user, filters);
  const hasFilters = Boolean(
    filters.query ||
      filters.categoryId ||
      filters.departmentId ||
      filters.status ||
      filters.location,
  );

  return (
    <div className="space-y-7">
      <header className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39755b]">
            Asset lifecycle
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            Asset directory
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68766d]">
            Search every asset in your scope by identity, lifecycle, ownership,
            and physical location.
          </p>
        </div>
        {canAct(user, "assets.register") ? (
          <Link
            href="/assets/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#39755b] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_-14px_rgba(40,86,66,.8)] hover:bg-[#285642]"
          >
            <Plus className="size-4" weight="bold" aria-hidden="true" />
            Register asset
          </Link>
        ) : null}
      </header>

      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-[#d9e0da] bg-white p-4 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(140px,.7fr))_auto]"
      >
        <label className="relative min-w-0">
          <span className="sr-only">Search assets</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#7b8880]" />
          <input
            name="query"
            defaultValue={filters.query}
            placeholder="Tag, serial, QR, or name"
            className="min-h-11 w-full rounded-xl border border-[#ccd5ce] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#39755b] focus:ring-4 focus:ring-[#39755b]/10"
          />
        </label>
        <select
          name="categoryId"
          defaultValue={filters.categoryId ?? ""}
          aria-label="Filter by category"
          className="min-h-11 min-w-0 rounded-xl border border-[#ccd5ce] bg-white px-3 text-sm text-[#526158]"
        >
          <option value="">All categories</option>
          {data.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          aria-label="Filter by lifecycle status"
          className="min-h-11 min-w-0 rounded-xl border border-[#ccd5ce] bg-white px-3 text-sm text-[#526158]"
        >
          <option value="">All statuses</option>
          {Object.values(AssetStatus).map((status) => (
            <option key={status} value={status}>
              {humanizeEnum(status)}
            </option>
          ))}
        </select>
        <select
          name="departmentId"
          defaultValue={filters.departmentId ?? ""}
          aria-label="Filter by department"
          className="min-h-11 min-w-0 rounded-xl border border-[#ccd5ce] bg-white px-3 text-sm text-[#526158]"
        >
          <option value="">All departments</option>
          {data.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select
          name="location"
          defaultValue={filters.location}
          aria-label="Filter by location"
          className="min-h-11 min-w-0 rounded-xl border border-[#ccd5ce] bg-white px-3 text-sm text-[#526158]"
        >
          <option value="">All locations</option>
          {data.locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b9c6bc] bg-[#edf2ee] px-4 text-sm font-bold text-[#355441] hover:bg-[#e2ebe5]"
        >
          <FunnelSimple className="size-4" weight="fill" aria-hidden="true" />
          Filter
        </button>
      </form>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e8e4] px-5 py-4 sm:px-6">
          <p className="text-sm font-bold">
            {data.assets.length.toLocaleString("en-IN")} visible assets
          </p>
          {hasFilters ? (
            <Link href="/assets" className="text-xs font-bold text-[#39755b] hover:underline">
              Clear all filters
            </Link>
          ) : null}
        </div>
        {data.assets.length > 0 ? (
          <div className="divide-y divide-[#e8ece9]">
            {data.assets.map((asset) => {
              const allocation = asset.allocations[0];
              const holder =
                allocation?.assigneeUser?.name ??
                allocation?.assigneeDepartment?.name ??
                "Unassigned";
              return (
                <Link
                  key={asset.id}
                  href={`/assets/${asset.id}`}
                  className="grid min-w-0 gap-3 px-5 py-4 transition-colors hover:bg-[#fafbfa] sm:grid-cols-[56px_minmax(0,1.4fr)_minmax(120px,.65fr)_minmax(150px,.8fr)_120px_auto] sm:items-center sm:px-6"
                >
                  <span className="grid size-11 place-items-center rounded-xl border border-[#d7dfd8] bg-[#edf2ee] font-mono text-[9px] font-bold text-[#39755b]">
                    {asset.assetTag.replace("AF-", "")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[#27342c]">
                      {asset.name}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] text-[#7a877f]">
                      {asset.assetTag} / {asset.serialNumber ?? "No serial"}
                    </span>
                  </span>
                  <span className="truncate text-xs text-[#637168]">{asset.category.name}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-[#526158]">{holder}</span>
                    <span className="mt-1 block truncate text-[10px] text-[#7a877f]">{asset.location}</span>
                  </span>
                  <StatusBadge tone={statusTone[asset.status]}>
                    {humanizeEnum(asset.status)}
                  </StatusBadge>
                  <ArrowRight className="size-4 text-[#7b8880]" weight="bold" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div className="max-w-sm">
              <div className="mx-auto grid size-11 place-items-center rounded-xl border border-[#d7dfd8] bg-[#edf2ee] text-[#39755b]">
                <Package className="size-5" weight="duotone" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-bold">No assets match</h2>
              <p className="mt-2 text-sm leading-6 text-[#718078]">
                Adjust the current filters or register the first asset for this organization.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
