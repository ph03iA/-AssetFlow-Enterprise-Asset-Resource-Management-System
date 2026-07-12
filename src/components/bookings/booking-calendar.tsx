import {
  Clock,
  MapPin,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";

import { StatusBadge } from "@/components/ui/status-badge";
import { BookingStatus } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/format";
import { calendarDateKey, formatTimeInZone } from "@/lib/timezone";
import { cn } from "@/lib/cn";

type CalendarBooking = {
  id: string;
  purpose: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  manageable: boolean;
  asset: {
    assetTag: string;
    name: string;
    location: string;
  };
  bookedBy: { name: string };
  onBehalfOfDepartment: { name: string } | null;
};

const statusTone = {
  UPCOMING: "info",
  ONGOING: "success",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
} as const;

function BookingCard({
  booking,
  timezone,
  compact = false,
}: {
  booking: CalendarBooking;
  timezone: string;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border border-[#dce3dd] bg-white p-3 shadow-[0_8px_22px_-20px_rgba(33,58,44,.5)]",
        booking.manageable && "border-l-[3px] border-l-[#39755b]",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-bold text-[#2e3b33]">
          {booking.asset.name}
        </p>
        {!compact ? (
          <StatusBadge tone={statusTone[booking.status]}>
            {booking.status === BookingStatus.ONGOING ? "In use" : booking.status.toLowerCase()}
          </StatusBadge>
        ) : null}
      </div>
      <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#39755b]">
        {booking.asset.assetTag}
      </p>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-[#526158]">
        <Clock className="size-3.5" aria-hidden="true" />
        <time dateTime={booking.startAt.toISOString()}>
          {formatTimeInZone(booking.startAt, timezone)}
        </time>
        <span aria-hidden="true">-</span>
        <time dateTime={booking.endAt.toISOString()}>
          {formatTimeInZone(booking.endAt, timezone)}
        </time>
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#69776f]">
        {booking.purpose}
      </p>
      {!compact ? (
        <div className="mt-3 grid gap-1.5 border-t border-[#e8ece9] pt-2.5 text-[10px] text-[#7a877f]">
          <span className="flex min-w-0 items-center gap-1.5">
            <UserCircle className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {booking.onBehalfOfDepartment?.name ?? booking.bookedBy.name}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{booking.asset.location}</span>
          </span>
        </div>
      ) : null}
    </article>
  );
}

export function BookingCalendar({
  weekStart,
  bookings,
  timezone,
}: {
  weekStart: Date;
  bookings: CalendarBooking[];
  timezone: string;
}) {
  const days = Array.from({ length: 7 }, (_, index) =>
    new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000),
  );
  const todayKey = calendarDateKey(new Date(), timezone);
  const bookingsByDay = new Map<string, CalendarBooking[]>();
  for (const booking of bookings) {
    const key = calendarDateKey(booking.startAt, timezone);
    bookingsByDay.set(key, [...(bookingsByDay.get(key) ?? []), booking]);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d9e0da] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e9e5] px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-bold tracking-tight">Shared calendar</h2>
          <p className="mt-1 text-xs text-[#718078]">
            All confirmed reservations are visible to prevent scheduling surprises.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#718078]">
          <span className="h-4 w-[3px] rounded-full bg-[#39755b]" />
          Manageable by you
        </span>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <div className="grid min-w-[1050px] grid-cols-7 divide-x divide-[#e4e9e5]">
          {days.map((day) => {
            const key = calendarDateKey(day, timezone);
            const dayBookings = bookingsByDay.get(key) ?? [];
            const today = key === todayKey;
            return (
              <div key={key} className="min-w-0 bg-[#fbfcfb]">
                <div className={cn("border-b border-[#e4e9e5] px-3 py-3", today && "bg-[#edf7f1]")}> 
                  <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a877f]", today && "text-[#39755b]")}> 
                    {formatDate(day, {
                      weekday: "short",
                      day: undefined,
                      month: undefined,
                      year: undefined,
                      timeZone: timezone,
                    })}
                  </p>
                  <p className="mt-1 text-lg font-bold tracking-tight">
                    {formatDate(day, {
                      day: "2-digit",
                      month: "short",
                      year: undefined,
                      timeZone: timezone,
                    })}
                  </p>
                </div>
                <div className="grid min-h-72 content-start gap-2 p-2.5">
                  {dayBookings.length ? (
                    dayBookings.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} timezone={timezone} compact />
                    ))
                  ) : (
                    <p className="px-2 py-8 text-center text-[10px] text-[#9aa49e]">
                      Open day
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-[#e4e9e5] lg:hidden">
        {days.map((day) => {
          const key = calendarDateKey(day, timezone);
          const dayBookings = bookingsByDay.get(key) ?? [];
          return (
            <div key={key} className="grid gap-3 px-4 py-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:px-5">
              <div>
                <p className="text-xs font-bold text-[#35443b]">
                  {formatDate(day, {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: undefined,
                    timeZone: timezone,
                  })}
                </p>
                {key === todayKey ? (
                  <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#39755b]">Today</p>
                ) : null}
              </div>
              {dayBookings.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {dayBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} timezone={timezone} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-[#d9e0da] bg-[#fafbfa] text-xs text-[#8a968f]">
                  No reservations
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
