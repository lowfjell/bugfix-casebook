// The order API sends the estimated delivery date as a plain "YYYY-MM-DD" string.

export function formatDeliveryDate(isoDate: string, locale = "en-US"): string {
  return new Date(isoDate).toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Drives the "Arriving today" badge on the order page.
export function isDeliveryToday(isoDate: string, now: Date = new Date()): boolean {
  return new Date(isoDate).toDateString() === now.toDateString();
}
