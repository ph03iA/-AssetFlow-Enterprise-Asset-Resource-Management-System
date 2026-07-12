import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { AssetRegistrationForm } from "@/components/assets/asset-registration-form";
import { getAssetRegistrationOptions } from "@/features/assets/service";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Register asset" };

export default async function RegisterAssetPage() {
  const actor = await requirePermission("assets.register");
  const options = await getAssetRegistrationOptions(actor);

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <Link
          href="/assets"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#39755b] hover:underline"
        >
          <ArrowLeft className="size-3.5" weight="bold" aria-hidden="true" />
          Asset directory
        </Link>
        <p className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39755b]">
          New lifecycle record
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
          Register asset
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68766d]">
          Capture the operational identity, condition, ownership scope, and planning dates for a new asset.
        </p>
      </header>
      <AssetRegistrationForm
        categories={options.categories}
        departments={options.departments}
      />
    </div>
  );
}
