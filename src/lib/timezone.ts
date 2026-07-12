const localDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

function offsetAt(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ) - date.getTime()
  );
}

export function normalizeLocalDateTime(value: FormDataEntryValue | null, timeZone: string) {
  const input = String(value ?? "").trim();
  const match = localDateTimePattern.exec(input);
  if (!match) return input;

  const requested = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  };
  const localAsUtc = Date.UTC(
    requested.year,
    requested.month - 1,
    requested.day,
    requested.hour,
    requested.minute,
    requested.second,
  );

  try {
    let result = new Date(localAsUtc - offsetAt(new Date(localAsUtc), timeZone));
    result = new Date(localAsUtc - offsetAt(result, timeZone));
    const resolved = zonedParts(result, timeZone);
    const valid = Object.entries(requested).every(
      ([part, expected]) => resolved[part as keyof typeof resolved] === expected,
    );
    return valid ? result.toISOString() : "invalid";
  } catch {
    return "invalid";
  }
}

export function calendarDateKey(value: Date | string, timeZone: string) {
  const parts = zonedParts(new Date(value), timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function formatTimeInZone(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTimeLocalInZone(
  value: Date | string,
  timeZone: string,
) {
  const parts = zonedParts(new Date(value), timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}
