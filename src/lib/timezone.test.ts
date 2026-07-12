import { describe, expect, it } from "vitest";

import { calendarDateKey, normalizeLocalDateTime } from "./timezone";

describe("organization timezone conversion", () => {
  it("interprets booking form times in the organization timezone", () => {
    expect(
      normalizeLocalDateTime("2026-07-20T09:00", "Asia/Kolkata"),
    ).toBe("2026-07-20T03:30:00.000Z");
  });

  it("returns invalid input for nonexistent local DST times", () => {
    expect(
      normalizeLocalDateTime("2026-03-08T02:30", "America/New_York"),
    ).toBe("invalid");
  });

  it("builds date keys in the selected timezone", () => {
    expect(
      calendarDateKey("2026-07-19T20:00:00.000Z", "Asia/Kolkata"),
    ).toBe("2026-07-20");
  });
});
