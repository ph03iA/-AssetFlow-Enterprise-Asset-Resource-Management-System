import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { AllocationForm } from "@/components/allocations/allocation-form";
import { getAllocationOptions } from "@/features/allocations/service";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Allocate asset" };

export default async function NewAllocationPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const actor = await requirePermission("assets.allocate");
  const assetId = (await searchParams).assetId;
  const options = await getAllocationOptions(actor, assetId);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <Link href="/allocations" className="inline-flex items-center gap-2 text-xs font-bold text-[#39755b] hover:underline">
          <ArrowLeft className="size-3.5" weight="bold" />
          Allocations
        </Link>
        <p className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39755b]">New custody record</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Allocate asset</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68766d]">
          Assign one Available asset to exactly one Employee or Department.
        </p>
      </header>
      <AllocationForm {...options} />
    </div>
  );
}
