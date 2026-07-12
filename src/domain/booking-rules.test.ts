import { describe, expect, it } from "vitest";

import {
  assertValidBookingInterval,
  bookingIntervalsOverlap,
  findBookingConflict,
} from "./booking-rules";

function interval(start: string, end: string) {
  return { startAt: new Date(start), endAt: new Date(end) };
}

describe("resource booking overlap", () => {
  const nineToTen = interval(
    "2026-07-13T09:00:00.000Z",
    "2026-07-13T10:00:00.000Z",
  );

  it("rejects the assignment example's overlapping 09:30-10:30 slot", () => {
    const nineThirtyToTenThirty = interval(
      "2026-07-13T09:30:00.000Z",
      "2026-07-13T10:30:00.000Z",
    );

    expect(bookingIntervalsOverlap(nineToTen, nineThirtyToTenThirty)).toBe(
      true,
    );
  });

  it("accepts an adjacent booking beginning at the existing end time", () => {
    const tenToEleven = interval(
      "2026-07-13T10:00:00.000Z",
      "2026-07-13T11:00:00.000Z",
    );

    expect(bookingIntervalsOverlap(nineToTen, tenToEleven)).toBe(false);
  });

  it("detects containment in either direction", () => {
    const shortMeeting = interval(
      "2026-07-13T09:15:00.000Z",
      "2026-07-13T09:45:00.000Z",
    );
    const fullMorning = interval(
      "2026-07-13T08:00:00.000Z",
      "2026-07-13T12:00:00.000Z",
    );

    expect(bookingIntervalsOverlap(nineToTen, shortMeeting)).toBe(true);
    expect(bookingIntervalsOverlap(nineToTen, fullMorning)).toBe(true);
  });

  it("rejects zero-length and reversed intervals", () => {
    expect(() =>
      assertValidBookingInterval(
        interval(
          "2026-07-13T10:00:00.000Z",
          "2026-07-13T10:00:00.000Z",
        ),
      ),
    ).toThrow(/end time/i);
    expect(() =>
      assertValidBookingInterval(
        interval(
          "2026-07-13T11:00:00.000Z",
          "2026-07-13T10:00:00.000Z",
        ),
      ),
    ).toThrow(/end time/i);
  });

  it("returns the exact interval that conflicts", () => {
    const requested = interval(
      "2026-07-13T09:45:00.000Z",
      "2026-07-13T10:15:00.000Z",
    );

    expect(findBookingConflict([nineToTen], requested)).toEqual(nineToTen);
  });
});
