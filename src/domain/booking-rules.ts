import { DomainError } from "./errors";

export type BookingInterval = {
  startAt: Date;
  endAt: Date;
};

export function isValidBookingInterval(interval: BookingInterval) {
  return interval.startAt < interval.endAt;
}

export function assertValidBookingInterval(interval: BookingInterval) {
  if (!isValidBookingInterval(interval)) {
    throw new DomainError(
      "Booking end time must be after its start time.",
      "INVALID_BOOKING_INTERVAL",
    );
  }
}

export function bookingIntervalsOverlap(
  existing: BookingInterval,
  requested: BookingInterval,
) {
  assertValidBookingInterval(existing);
  assertValidBookingInterval(requested);

  return (
    existing.startAt < requested.endAt && existing.endAt > requested.startAt
  );
}

export function findBookingConflict(
  existingIntervals: readonly BookingInterval[],
  requested: BookingInterval,
) {
  assertValidBookingInterval(requested);
  return existingIntervals.find((existing) =>
    bookingIntervalsOverlap(existing, requested),
  );
}
