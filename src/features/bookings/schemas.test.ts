import { describe, expect, it } from "vitest";

import {
  bookingCancellationSchema,
  bookingInputSchema,
  bookingRescheduleSchema,
} from "./schemas";

const validBooking = {
  assetId: "resource-1",
  onBehalfOfDepartmentId: "",
  purpose: "Weekly design review",
  startAt: "2026-07-20T09:00",
  endAt: "2026-07-20T10:00",
};

describe("booking validation", () => {
  it("normalizes local date-time values and an empty department", () => {
    const result = bookingInputSchema.parse(validBooking);

    expect(result.startAt).toBeInstanceOf(Date);
    expect(result.endAt).toBeInstanceOf(Date);
    expect(result.onBehalfOfDepartmentId).toBeNull();
  });

  it("rejects missing, reversed, and zero-length intervals", () => {
    expect(
      bookingInputSchema.safeParse({ ...validBooking, startAt: "" }).success,
    ).toBe(false);
    expect(
      bookingInputSchema.safeParse({
        ...validBooking,
        startAt: "2026-07-20T10:00",
        endAt: "2026-07-20T09:00",
      }).success,
    ).toBe(false);
    expect(
      bookingRescheduleSchema.safeParse({
        bookingId: "booking-1",
        startAt: "2026-07-20T10:00",
        endAt: "2026-07-20T10:00",
      }).success,
    ).toBe(false);
  });

  it("enforces useful purpose and cancellation context", () => {
    expect(
      bookingInputSchema.safeParse({ ...validBooking, purpose: "x" }).success,
    ).toBe(false);
    expect(
      bookingCancellationSchema.safeParse({ bookingId: "booking-1", reason: "" })
        .success,
    ).toBe(false);
  });
});
