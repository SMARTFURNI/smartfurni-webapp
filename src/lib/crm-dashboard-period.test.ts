import { describe, expect, it } from "vitest";
import { dashboardPeriodWindow, isDashboardPeriod, vietnamDateKey } from "./crm-dashboard-period";

describe("CRM dashboard period", () => {
  const now = new Date("2026-08-17T05:30:00.000Z");

  it("uses the Vietnam calendar day", () => {
    expect(vietnamDateKey(now)).toBe("2026-08-17");
    expect(vietnamDateKey(new Date("2026-08-16T18:00:00.000Z"))).toBe("2026-08-17");
  });

  it("defaults today to one Vietnam day", () => {
    expect(dashboardPeriodWindow("today", now)).toEqual({
      start: new Date("2026-08-16T17:00:00.000Z"),
      end: new Date("2026-08-17T17:00:00.000Z"),
      days: 1,
    });
  });

  it("keeps yesterday separate from today", () => {
    expect(dashboardPeriodWindow("yesterday", now)).toEqual({
      start: new Date("2026-08-15T17:00:00.000Z"),
      end: new Date("2026-08-16T17:00:00.000Z"),
      days: 1,
    });
  });

  it("uses inclusive trailing windows for 7, 14 and 30 days", () => {
    expect(dashboardPeriodWindow("7d", now).start.toISOString()).toBe("2026-08-10T17:00:00.000Z");
    expect(dashboardPeriodWindow("14d", now).start.toISOString()).toBe("2026-08-03T17:00:00.000Z");
    expect(dashboardPeriodWindow("30d", now).start.toISOString()).toBe("2026-07-18T17:00:00.000Z");
  });

  it("accepts only supported period keys", () => {
    expect(isDashboardPeriod("today")).toBe(true);
    expect(isDashboardPeriod("14d")).toBe(true);
    expect(isDashboardPeriod("month")).toBe(false);
    expect(isDashboardPeriod(null)).toBe(false);
  });
});
