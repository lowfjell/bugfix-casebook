import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type * as Subject from "./fixed/deliveryDate.ts";

// VARIANT=buggy runs this suite against the original code.
const variant = process.env.VARIANT === "buggy" ? "buggy" : "fixed";
const { formatDeliveryDate, isDeliveryToday } = (await import(
  `./${variant}/deliveryDate.ts`
)) as typeof Subject;

// bun test runs in UTC by default, which hides this bug. Check where the
// customers actually are: the office is in Oslo, most buyers are in the US.
const zones = ["Europe/Oslo", "America/New_York", "America/Los_Angeles", "Pacific/Honolulu"];

const originalTz = process.env.TZ;
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

for (const zone of zones) {
  describe(zone, () => {
    beforeAll(() => {
      process.env.TZ = zone;
    });

    test("shows the delivery date the API sent", () => {
      expect(formatDeliveryDate("2026-03-14")).toBe("Saturday, March 14");
      expect(formatDeliveryDate("2026-11-02")).toBe("Monday, November 2");
    });

    test("'Arriving today' shows on the delivery day, not the evening before", () => {
      const eveningBefore = new Date(2026, 2, 13, 21, 0);
      const morningOf = new Date(2026, 2, 14, 8, 30);
      expect(isDeliveryToday("2026-03-14", eveningBefore)).toBe(false);
      expect(isDeliveryToday("2026-03-14", morningOf)).toBe(true);
    });
  });
}
