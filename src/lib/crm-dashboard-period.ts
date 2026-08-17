export const DASHBOARD_PERIODS = ["today", "yesterday", "7d", "14d", "30d"] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export function isDashboardPeriod(value: string | null): value is DashboardPeriod {
  return value !== null && DASHBOARD_PERIODS.some(period => period === value);
}

export function vietnamDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).formatToParts(date);
  const value = (type: "year" | "month" | "day") => parts.find(part => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function dashboardPeriodWindow(
  period: DashboardPeriod,
  now = new Date(),
): { start: Date; end: Date; days: number } {
  const todayStart = new Date(`${vietnamDateKey(now)}T00:00:00+07:00`);
  const dayMs = 24 * 60 * 60 * 1000;

  if (period === "yesterday") {
    return { start: new Date(todayStart.getTime() - dayMs), end: todayStart, days: 1 };
  }

  const days = period === "7d" ? 7 : period === "14d" ? 14 : period === "30d" ? 30 : 1;
  return {
    start: new Date(todayStart.getTime() - (days - 1) * dayMs),
    end: new Date(todayStart.getTime() + dayMs),
    days,
  };
}
