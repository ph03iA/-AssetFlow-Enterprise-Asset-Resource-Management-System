import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { BookingForm } from "@/components/bookings/booking-form";
import { getBookingOptions } from "@/features/bookings/service";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Book resource" };

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const actor = await requirePermission("bookings.create");
  const assetId = (await searchParams).assetId;
  const options = await getBookingOptions(actor, assetId);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#39755b] hover:underline"
        >
          <ArrowLeft className="size-3.5" weight="bold" aria-hidden="true" />
          Resource calendar
        </Link>
        <p className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39755b]">
          New reservation
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
          Book a shared resource
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68766d]">
          Choose a resource and time window. AssetFlow checks every active reservation before confirming the slot.
        </p>
      </header>
      <BookingForm {...options} />
    </div>
  );
}
