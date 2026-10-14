// The order API sends the estimated delivery date as a plain "YYYY-MM-DD" string.

// A date-only string is a calendar day, not a moment in time. new Date("2026-03-14")
// reads it as midnight UTC, which is still March 13 anywhere west of London.
// Build the date from its parts instead, so it is midnight in the viewer's zone.
function parseCalendarDate(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`expected YYYY-MM-DD, got "${isoDate}"`);
  const [, year, month, day] = match.map(Number);
  return new Date(year, month - 1, day);
}

export function formatDeliveryDate(isoDate: string, locale = "en-US"): string {
  return parseCalendarDate(isoDate).toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Drives the "Arriving today" badge on the order page.
export function isDeliveryToday(isoDate: string, now: Date = new Date()): boolean {
  return parseCalendarDate(isoDate).toDateString() === now.toDateString();
}
