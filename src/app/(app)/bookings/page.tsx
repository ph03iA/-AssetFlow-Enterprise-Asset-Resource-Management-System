import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  Clock,
  Package,
  Plus,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { BookingCalendar } from "@/components/bookings/booking-calendar";
import { CancelBookingForm } from "@/components/bookings/cancel-booking-form";
import { RescheduleBookingForm } from "@/components/bookings/reschedule-booking-form";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { BookingStatus } from "@/generated/prisma/enums";
import { bookingCalendarQuerySchema } from "@/features/bookings/schemas";
import {
  getBookingWorkspace,
  reconcileBookingOperationalState,
} from "@/features/bookings/service";
import { formatDate, humanizeEnum } from "@/lib/format";
import {
  calendarDateKey,
  formatDateTimeLocalInZone,
  formatTimeInZone,
  normalizeLocalDateTime,
} from "@/lib/timezone";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Resource bookings" };

const statusTone = {
  UPCOMING: "info",
  ONGOING: "success",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
} as const;

function shiftDateKey(key: string, days: number) {
  const value = new Date(`${key}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function startOfWeekKey(key: string) {
  const value = new Date(`${key}T12:00:00.000Z`);
  const weekday = value.getUTCDay();
  return shiftDateKey(key, -(weekday === 0 ? 6 : weekday - 1));
}

function calendarHref(week: string, resourceId: string | null) {
  const query = new URLSearchParams({ week });
  if (resourceId) query.set("resourceId", resourceId);
  return `/bookings?${query.toString()}`;
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    resourceId?: string;
    created?: string;
  }>;
}) {
  const actor = await requirePermission("bookings.create");
  const params = await searchParams;
  const parsed = bookingCalendarQuerySchema.safeParse(params);
  const timezone = actor.organization.timezone;
  const requestedWeek =
    parsed.success && parsed.data.week
      ? parsed.data.week
      : calendarDateKey(new Date(), timezone);
  const weekKey = startOfWeekKey(requestedWeek);
  const weekStartValue = normalizeLocalDateTime(`${weekKey}T00:00`, timezone);
  const weekStart = new Date(weekStartValue);
  const resourceId = parsed.success ? parsed.data.resourceId : null;

  await reconcileBookingOperationalState(actor.organizationId);
  const workspace = await getBookingWorkspace(actor, {
    weekStart,
    resourceId,
  });
  const manageableBookings = workspace.bookings.filter(
    (booking) =>
      booking.manageable &&
      (booking.status === BookingStatus.UPCOMING ||
        booking.status === BookingStatus.ONGOING),
  );
  const weekLastDay = new Date(
    workspace.weekStart.getTime() + 6 * 24 * 60 * 60 * 1000,
  );
  const summaryCards = [
    { label: "Bookings this week", value: workspace.summary.total, icon: CalendarBlank },
    { label: "Your reservations", value: workspace.summary.mine, icon: UserCircle },
    { label: "In use now", value: workspace.summary.ongoing, icon: Clock },
    { label: "Bookable resources", value: workspace.summary.availableResources, icon: Package },
  ];

  return (
    <div className="space-y-7">
      <header className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39755b]">
            Shared resource control
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
            Resource bookings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68766d]">
            Reserve rooms, vehicles, equipment, and other shared assets without overlapping another team.
          </p>
        </div>
        <Link
          href="/bookings/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#39755b] px-4 text-sm font-semibold text-white hover:bg-[#285642]"
        >
          <Plus className="size-4" weight="bold" aria-hidden="true" />
          Book resource
        </Link>
      </header>

      {params.created === "1" ? (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-[#bdd6c7] bg-[#edf7f1] px-4 py-3 text-sm text-[#2f6a50]">
          <CheckCircle className="size-4" weight="fill" aria-hidden="true" />
          Booking confirmed. The slot is now protected from overlaps.
        </div>
      ) : null}

      <section className="grid overflow-hidden rounded-2xl border border-[#d9e0da] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="border-b border-r border-[#e4e9e5] px-5 py-5 xl:border-b-0">
            <div className="flex items-center gap-2 text-[#718078]">
              <Icon className="size-4" aria-hidden="true" />
              <p className="text-xs font-semibold">{label}</p>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-[-0.04em]">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[#d9e0da] bg-[#f8faf8] p-4 sm:p-5">
        <form method="get" className="grid gap-4 lg:grid-cols-[minmax(180px,.6fr)_minmax(220px,1fr)_auto] lg:items-end">
          <InputField label="Week of" name="week" type="date" defaultValue={weekKey} />
          <SelectField label="Resource" name="resourceId" defaultValue={resourceId ?? ""}>
            <option value="">All shared resources</option>
            {workspace.resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.assetTag} - {resource.name}
              </option>
            ))}
          </SelectField>
          <Button type="submit" variant="secondary">Apply view</Button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e0e6e1] pt-4">
          <Link href={calendarHref(shiftDateKey(weekKey, -7), resourceId)} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-bold text-[#39755b] hover:bg-[#e8f0eb]">
            <ArrowLeft className="size-3.5" weight="bold" aria-hidden="true" />
            Previous week
          </Link>
          <p className="text-center text-xs font-bold text-[#526158]">
            {formatDate(workspace.weekStart, { timeZone: timezone })} - {formatDate(weekLastDay, { timeZone: timezone })}
          </p>
          <Link href={calendarHref(shiftDateKey(weekKey, 7), resourceId)} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-bold text-[#39755b] hover:bg-[#e8f0eb]">
            Next week
            <ArrowRight className="size-3.5" weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <BookingCalendar
        weekStart={workspace.weekStart}
        bookings={workspace.bookings}
        timezone={timezone}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.03em]">Manage reservations</h2>
            <p className="mt-1 text-xs text-[#718078]">
              Reschedule future slots or cancel to release the time immediately.
            </p>
          </div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a877f]">
            {manageableBookings.length} actionable
          </p>
        </div>
        {manageableBookings.length ? (
          manageableBookings.map((booking) => (
            <details key={booking.id} className="group overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
              <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(140px,.7fr)_minmax(130px,.7fr)_110px_auto] sm:items-center sm:px-6 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{booking.asset.name}</p>
                  <p className="mt-1 font-mono text-[10px] text-[#7a877f]">{booking.asset.assetTag}</p>
                </div>
                <p className="text-xs font-semibold text-[#526158]">
                  {formatDate(booking.startAt, { timeZone: timezone })}
                </p>
                <p className="text-xs text-[#718078]">
                  {formatTimeInZone(booking.startAt, timezone)} - {formatTimeInZone(booking.endAt, timezone)}
                </p>
                <StatusBadge tone={statusTone[booking.status]}>{humanizeEnum(booking.status)}</StatusBadge>
                <CaretDown className="size-4 text-[#7b8880] transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="grid gap-6 border-t border-[#e4e9e5] bg-[#f8faf8] px-5 py-5 lg:grid-cols-2 sm:px-6">
                {booking.status === BookingStatus.UPCOMING ? (
                  <div>
                    <h3 className="mb-4 text-sm font-bold">Choose a new time</h3>
                    <RescheduleBookingForm
                      bookingId={booking.id}
                      startAt={formatDateTimeLocalInZone(booking.startAt, timezone)}
                      endAt={formatDateTimeLocalInZone(booking.endAt, timezone)}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#bdd6c7] bg-[#edf7f1] p-4 text-sm text-[#2f6a50]">
                    This resource is currently in use, so its start time can no longer be changed.
                  </div>
                )}
                <div>
                  <h3 className="mb-4 text-sm font-bold">Release this slot</h3>
                  <CancelBookingForm bookingId={booking.id} />
                </div>
              </div>
            </details>
          ))
        ) : (
          <p className="rounded-2xl border border-[#d9e0da] bg-white px-6 py-12 text-center text-sm text-[#718078]">
            You have no active bookings to manage in this week.
          </p>
        )}
      </section>
    </div>
  );
}
