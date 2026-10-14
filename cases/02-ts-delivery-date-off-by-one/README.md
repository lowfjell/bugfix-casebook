# Delivery date is one day early for US customers

> Customers in the US keep asking why the order page says their package arrives on Friday when the confirmation email says Saturday. When we open the same order in the office in Oslo, it says Saturday. The "Arriving today" badge also shows up the evening before.

## Cause

The order API sends the delivery date as `"2026-03-14"`: a calendar day with no time and no zone. JavaScript reads a date-only ISO string as midnight UTC. (A date and time without an offset is read as local time, which makes this easy to miss.) In New York that instant is 8 PM on March 13, so formatting it for the viewer prints the 13th. Oslo is ahead of UTC, so the office always saw the right day. The badge compares calendar days in local time and is off in the same way.

## Fix

Take the three numbers from the string and build the date with `new Date(year, month - 1, day)`, which is midnight on that day wherever the viewer is. Both functions use the same parser. It also throws on anything that is not `YYYY-MM-DD`, where the old code would have shown "Invalid Date".

```diff
+function parseCalendarDate(isoDate: string): Date {
+  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
+  if (!match) throw new Error(`expected YYYY-MM-DD, got "${isoDate}"`);
+  const [, year, month, day] = match.map(Number);
+  return new Date(year, month - 1, day);
+}
+
 export function formatDeliveryDate(isoDate: string, locale = "en-US"): string {
-  return new Date(isoDate).toLocaleDateString(locale, {
+  return parseCalendarDate(isoDate).toLocaleDateString(locale, {
```

## Test

The suite runs each test in four time zones: Oslo, New York, Los Angeles, and Honolulu. `bun test` runs in UTC unless told otherwise, and in UTC this bug cannot show up. On the original code the Oslo tests pass and every US zone fails, which matches the report.

```sh
bun test ./cases/02-ts-delivery-date-off-by-one                 # fixed
VARIANT=buggy bun test ./cases/02-ts-delivery-date-off-by-one   # original
```
