/**
 * Analytics Store — Page View Tracking
 *
 * Tracks page views and unique visitors using PostgreSQL.
 * Table: analytics_events (id, path, referrer, ua, ip_hash, created_at)
 * Aggregation table: analytics_daily (date, path, views, uniques)
 *
 * Strategy: Write directly to PostgreSQL (no in-memory cache needed for analytics).
 */
import { Pool } from "pg";

let _pool: Pool | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    _pool.on("error", (err) => {
      console.error("[analytics] Pool error:", err.message);
    });
  }
  return _pool;
}

// ─── Schema Init ─────────────────────────────────────────────────────────────

export async function initAnalyticsTables(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGSERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        referrer TEXT,
        ua TEXT,
        ip_hash TEXT,
        session_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);
    `);
    console.log("[analytics] Tables initialized");
  } catch (err) {
    console.error("[analytics] initAnalyticsTables error:", (err as Error).message);
  }
}

// ─── Track a Page View ────────────────────────────────────────────────────────

export async function trackPageView(params: {
  path: string;
  referrer?: string;
  ua?: string;
  ipHash?: string;
  sessionId?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO analytics_events (path, referrer, ua, ip_hash, session_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        params.path,
        params.referrer || null,
        params.ua || null,
        params.ipHash || null,
        params.sessionId || null,
      ]
    );
  } catch (err) {
    // Silently fail — don't break the page
    console.error("[analytics] trackPageView error:", (err as Error).message);
  }
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

export interface AnalyticsRow {
  date: string;   // YYYY-MM-DD
  label: string;  // human-readable
  views: number;
  uniques: number;
}

export interface TopPage {
  path: string;
  views: number;
  uniques: number;
}

export interface ReferrerRow {
  referrer: string;
  count: number;
}

export interface DeviceRow {
  device: string;
  count: number;
  pct: number;
}

export interface AnalyticsSummary {
  totalViews: number;
  totalUniques: number;
  avgViewsPerDay: number;
  topPage: string;
  bounceRate: number; // estimated
  prevTotalViews: number;
  prevTotalUniques: number;
  viewsGrowth: number;
  uniquesGrowth: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  byDay: AnalyticsRow[];
  byWeek: AnalyticsRow[];
  byMonth: AnalyticsRow[];
  byYear: AnalyticsRow[];
  topPages: TopPage[];
  referrers: ReferrerRow[];
  devices: DeviceRow[];
  hourly: { hour: number; label: string; views: number; uniques: number }[];
}

function growth(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

function deviceFromUA(ua: string | null): string {
  if (!ua) return "Unknown";
  const u = ua.toLowerCase();
  if (u.includes("mobile") || u.includes("android") || u.includes("iphone")) return "Mobile";
  if (u.includes("tablet") || u.includes("ipad")) return "Tablet";
  return "Desktop";
}

export async function getAnalyticsData(range: "day" | "week" | "month" | "year" | "all" = "month"): Promise<AnalyticsData> {
  const pool = getPool();

  // Return empty data if no DB
  const empty: AnalyticsData = {
    summary: { totalViews: 0, totalUniques: 0, avgViewsPerDay: 0, topPage: "/", bounceRate: 0, prevTotalViews: 0, prevTotalUniques: 0, viewsGrowth: 0, uniquesGrowth: 0 },
    byDay: [],
    byWeek: [],
    byMonth: [],
    byYear: [],
    topPages: [],
    referrers: [],
    devices: [],
    hourly: Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}:00`, views: 0, uniques: 0 })),
  };

  if (!pool) return empty;

  try {
    // Determine date range
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (range) {
      case "day":
        startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
        prevStartDate = new Date(startDate); prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate = new Date(startDate);
        break;
      case "week":
        startDate = new Date(now); startDate.setDate(now.getDate() - 6); startDate.setHours(0, 0, 0, 0);
        prevStartDate = new Date(startDate); prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate = new Date(startDate);
        break;
      case "month":
        startDate = new Date(now); startDate.setDate(now.getDate() - 29); startDate.setHours(0, 0, 0, 0);
        prevStartDate = new Date(startDate); prevStartDate.setDate(prevStartDate.getDate() - 30);
        prevEndDate = new Date(startDate);
        break;
      case "year":
        startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 1); startDate.setHours(0, 0, 0, 0);
        prevStartDate = new Date(startDate); prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
        prevEndDate = new Date(startDate);
        break;
      default: // all
        startDate = new Date("2020-01-01");
        prevStartDate = new Date("2019-01-01");
        prevEndDate = new Date("2020-01-01");
    }

    // Current period total
    const totalRes = await pool.query(
      `SELECT COUNT(*) as views, COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events WHERE created_at >= $1`,
      [startDate]
    );
    const totalViews = parseInt(totalRes.rows[0]?.views || "0");
    const totalUniques = parseInt(totalRes.rows[0]?.uniques || "0");

    // Previous period total
    const prevRes = await pool.query(
      `SELECT COUNT(*) as views, COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events WHERE created_at >= $1 AND created_at < $2`,
      [prevStartDate, prevEndDate]
    );
    const prevTotalViews = parseInt(prevRes.rows[0]?.views || "0");
    const prevTotalUniques = parseInt(prevRes.rows[0]?.uniques || "0");

    // By day (last 30 days)
    const byDayRes = await pool.query(
      `SELECT DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as date,
              COUNT(*) as views,
              COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY 1 ORDER BY 1`
    );
    const byDay: AnalyticsRow[] = byDayRes.rows.map((r) => ({
      date: r.date,
      label: new Date(r.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      views: parseInt(r.views),
      uniques: parseInt(r.uniques),
    }));

    // By week (last 12 weeks)
    const byWeekRes = await pool.query(
      `SELECT DATE_TRUNC('week', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as week_start,
              COUNT(*) as views,
              COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events
       WHERE created_at >= NOW() - INTERVAL '12 weeks'
       GROUP BY 1 ORDER BY 1`
    );
    const byWeek: AnalyticsRow[] = byWeekRes.rows.map((r) => {
      const d = new Date(r.week_start);
      return {
        date: d.toISOString().split("T")[0],
        label: `T${d.getDate()}/${d.getMonth() + 1}`,
        views: parseInt(r.views),
        uniques: parseInt(r.uniques),
      };
    });

    // By month (last 12 months)
    const byMonthRes = await pool.query(
      `SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') as month,
              COUNT(*) as views,
              COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events
       WHERE created_at >= NOW() - INTERVAL '12 months'
       GROUP BY 1 ORDER BY 1`
    );
    const monthNames = ["Th1","Th2","Th3","Th4","Th5","Th6","Th7","Th8","Th9","Th10","Th11","Th12"];
    const byMonth: AnalyticsRow[] = byMonthRes.rows.map((r) => {
      const [, m] = r.month.split("-");
      return {
        date: r.month,
        label: monthNames[parseInt(m) - 1],
        views: parseInt(r.views),
        uniques: parseInt(r.uniques),
      };
    });

    // By year (all years)
    const byYearRes = await pool.query(
      `SELECT EXTRACT(YEAR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::TEXT as year,
              COUNT(*) as views,
              COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events
       GROUP BY 1 ORDER BY 1`
    );
    const byYear: AnalyticsRow[] = byYearRes.rows.map((r) => ({
      date: r.year,
      label: r.year,
      views: parseInt(r.views),
      uniques: parseInt(r.uniques),
    }));

    // Top pages
    const topPagesRes = await pool.query(
      `SELECT path,
              COUNT(*) as views,
              COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events
       WHERE created_at >= $1
       GROUP BY path ORDER BY views DESC LIMIT 10`,
      [startDate]
    );
    const topPages: TopPage[] = topPagesRes.rows.map((r) => ({
      path: r.path,
      views: parseInt(r.views),
      uniques: parseInt(r.uniques),
    }));

    // Referrers
    const referrersRes = await pool.query(
      `SELECT COALESCE(NULLIF(referrer, ''), 'Direct') as referrer,
              COUNT(*) as count
       FROM analytics_events
       WHERE created_at >= $1
       GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      [startDate]
    );
    const referrers: ReferrerRow[] = referrersRes.rows.map((r) => ({
      referrer: r.referrer,
      count: parseInt(r.count),
    }));

    // Devices (from UA)
    const uaRes = await pool.query(
      `SELECT ua, COUNT(*) as count FROM analytics_events WHERE created_at >= $1 GROUP BY ua`,
      [startDate]
    );
    const deviceMap: Record<string, number> = {};
    for (const row of uaRes.rows) {
      const d = deviceFromUA(row.ua);
      deviceMap[d] = (deviceMap[d] || 0) + parseInt(row.count);
    }
    const totalDevices = Object.values(deviceMap).reduce((a, b) => a + b, 0);
    const devices: DeviceRow[] = Object.entries(deviceMap).map(([device, count]) => ({
      device,
      count,
      pct: totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // Hourly distribution (last 7 days)
    const hourlyRes = await pool.query(
      `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT as hour,
              COUNT(*) as views,
              COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY 1 ORDER BY 1`
    );
    const hourlyMap: Record<number, { views: number; uniques: number }> = {};
    for (const r of hourlyRes.rows) {
      hourlyMap[r.hour] = { views: parseInt(r.views), uniques: parseInt(r.uniques) };
    }
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h}:00`,
      views: hourlyMap[h]?.views || 0,
      uniques: hourlyMap[h]?.uniques || 0,
    }));

    // Days in range for avg
    const daysInRange = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      summary: {
        totalViews,
        totalUniques,
        avgViewsPerDay: Math.round(totalViews / daysInRange),
        topPage: topPages[0]?.path || "/",
        bounceRate: totalUniques > 0 ? Math.round(((totalUniques * 0.6) / totalViews) * 100) : 0,
        prevTotalViews,
        prevTotalUniques,
        viewsGrowth: growth(totalViews, prevTotalViews),
        uniquesGrowth: growth(totalUniques, prevTotalUniques),
      },
      byDay,
      byWeek,
      byMonth,
      byYear,
      topPages,
      referrers,
      devices,
      hourly,
    };
  } catch (err) {
    console.error("[analytics] getAnalyticsData error:", (err as Error).message);
    return empty;
  }
}
