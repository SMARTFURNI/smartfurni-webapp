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

export type TrafficSourceGroupKey =
  | "organic_search"
  | "social"
  | "paid"
  | "referral"
  | "direct"
  | "email"
  | "other";

const TRAFFIC_GROUP_LABELS: Record<TrafficSourceGroupKey, string> = {
  organic_search: "SEO / Tìm kiếm tự nhiên",
  social: "Mạng xã hội",
  paid: "Quảng cáo trả phí",
  referral: "Website giới thiệu",
  direct: "Truy cập trực tiếp",
  email: "Email",
  other: "Nguồn khác",
};

const SOURCE_NAMES: Record<string, string> = {
  google: "Google",
  bing: "Bing",
  coccoc: "Cốc Cốc",
  yahoo: "Yahoo",
  duckduckgo: "DuckDuckGo",
  baidu: "Baidu",
  yandex: "Yandex",
  facebook: "Facebook",
  fb: "Facebook",
  instagram: "Instagram",
  ig: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  zalo: "Zalo",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  x: "X / Twitter",
  pinterest: "Pinterest",
  threads: "Threads",
  newsletter: "Email",
};

const SEARCH_HOSTS = ["google.", "bing.com", "search.yahoo.", "coccoc.com", "duckduckgo.com", "baidu.com", "yandex."];
const SOCIAL_HOSTS = ["facebook.com", "fb.com", "instagram.com", "tiktok.com", "youtube.com", "youtu.be", "zalo.me", "zalo.com", "linkedin.com", "twitter.com", "x.com", "pinterest.com", "threads.net"];
const PAID_MEDIUM_RE = /(^|[_\s-])(cpc|ppc|paid|paidsearch|paid_social|display|cpm|cpv|ads?|remarketing|retargeting|affiliate)([_\s-]|$)/i;

function cleanSourceToken(value?: string): string {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function readableSource(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const token = cleanSourceToken(raw);
  return SOURCE_NAMES[token] || raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hostnameFromReferrer(referrer?: string): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function knownSourceFromHost(host: string): string {
  if (!host) return "";
  if (host.includes("google.")) return "Google";
  if (host.includes("bing.com")) return "Bing";
  if (host.includes("search.yahoo.")) return "Yahoo";
  if (host.includes("coccoc.com")) return "Cốc Cốc";
  if (host.includes("duckduckgo.com")) return "DuckDuckGo";
  if (host.includes("baidu.com")) return "Baidu";
  if (host.includes("yandex.")) return "Yandex";
  if (host.includes("facebook.com") || host.includes("fb.com")) return "Facebook";
  if (host.includes("instagram.com")) return "Instagram";
  if (host.includes("tiktok.com")) return "TikTok";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
  if (host.includes("zalo.me") || host.includes("zalo.com")) return "Zalo";
  if (host.includes("linkedin.com")) return "LinkedIn";
  if (host.includes("twitter.com") || host === "x.com" || host.endsWith(".x.com")) return "X / Twitter";
  if (host.includes("pinterest.com")) return "Pinterest";
  if (host.includes("threads.net")) return "Threads";
  return "";
}

function attributionFromPath(path?: string): Partial<TrafficAttribution> {
  if (!path || !path.includes("?")) return {};
  try {
    const url = new URL(path, "https://smartfurni.com.vn");
    return {
      utmSource: url.searchParams.get("utm_source") || "",
      utmMedium: url.searchParams.get("utm_medium") || "",
      utmCampaign: url.searchParams.get("utm_campaign") || "",
      gclid: url.searchParams.get("gclid") || "",
      fbclid: url.searchParams.get("fbclid") || "",
      ttclid: url.searchParams.get("ttclid") || "",
      msclkid: url.searchParams.get("msclkid") || "",
    };
  } catch {
    return {};
  }
}

interface TrafficAttribution {
  path?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gclid?: string;
  fbclid?: string;
  ttclid?: string;
  msclkid?: string;
}

export function classifyTrafficSource(input: TrafficAttribution): {
  group: TrafficSourceGroupKey;
  name: string;
} {
  const fromPath = attributionFromPath(input.path);
  const source = String(input.utmSource || fromPath.utmSource || "").trim();
  const sourceToken = cleanSourceToken(source);
  const medium = String(input.utmMedium || fromPath.utmMedium || "").trim().toLowerCase();
  const host = hostnameFromReferrer(input.referrer);
  const hasGoogleClick = Boolean(input.gclid || fromPath.gclid);
  const hasMetaClick = Boolean(input.fbclid || fromPath.fbclid);
  const hasTikTokClick = Boolean(input.ttclid || fromPath.ttclid);
  const hasMicrosoftClick = Boolean(input.msclkid || fromPath.msclkid);
  const isPaid = PAID_MEDIUM_RE.test(medium) || hasGoogleClick || hasMetaClick || hasTikTokClick || hasMicrosoftClick;

  if (isPaid) {
    if (hasGoogleClick) return { group: "paid", name: "Google Ads" };
    if (hasMetaClick) return { group: "paid", name: "Meta Ads" };
    if (hasTikTokClick) return { group: "paid", name: "TikTok Ads" };
    if (hasMicrosoftClick) return { group: "paid", name: "Microsoft Ads" };
    const paidName = readableSource(source) || knownSourceFromHost(host) || "Quảng cáo khác";
    return { group: "paid", name: /ads$/i.test(paidName) ? paidName : `${paidName} Ads` };
  }

  if (medium === "email" || sourceToken === "newsletter" || sourceToken === "email") {
    return { group: "email", name: readableSource(source) || "Email" };
  }

  if (medium.includes("organic") || SEARCH_HOSTS.some((item) => host.includes(item))) {
    const engine = readableSource(source) || knownSourceFromHost(host) || "Tìm kiếm";
    return { group: "organic_search", name: `${engine} Organic` };
  }

  if (medium.includes("social") || SOCIAL_HOSTS.some((item) => host.includes(item)) || Object.keys(SOURCE_NAMES).some((item) => sourceToken === item && ["facebook", "fb", "instagram", "ig", "tiktok", "youtube", "zalo", "linkedin", "twitter", "x", "pinterest", "threads"].includes(item))) {
    const network = readableSource(source) || knownSourceFromHost(host) || "Mạng xã hội";
    return { group: "social", name: network };
  }

  if (source) return { group: "other", name: readableSource(source) || "Nguồn khác" };
  if (host && !host.includes("smartfurni.com.vn")) return { group: "referral", name: host };
  return { group: "direct", name: "Trực tiếp" };
}

const PUBLIC_EVENT_SQL = `split_part(path, '?', 1) !~ '^/(admin|api|crm|dashboard|smart-bed|choose-module)(/|$)'`;

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
        full_url TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        gclid TEXT,
        fbclid TEXT,
        ttclid TEXT,
        msclkid TEXT,
        source_group TEXT,
        source_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS full_url TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_source TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_medium TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_term TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_content TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS gclid TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS fbclid TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS ttclid TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS msclkid TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS source_group TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS source_name TEXT;
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events(path);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_source_group ON analytics_events(source_group);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_campaign ON analytics_events(utm_campaign);
      CREATE TABLE IF NOT EXISTS blog_product_clicks (
        id BIGSERIAL PRIMARY KEY,
        event_id TEXT,
        post_slug TEXT NOT NULL,
        product_slug TEXT NOT NULL,
        product_name TEXT,
        target_path TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'direct',
        cta_event_id TEXT,
        cta_id TEXT,
        cta_label TEXT,
        session_id TEXT,
        ip_hash TEXT,
        ua TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE blog_product_clicks ADD COLUMN IF NOT EXISTS event_id TEXT;
      ALTER TABLE blog_product_clicks ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'direct';
      ALTER TABLE blog_product_clicks ADD COLUMN IF NOT EXISTS cta_event_id TEXT;
      ALTER TABLE blog_product_clicks ADD COLUMN IF NOT EXISTS cta_id TEXT;
      ALTER TABLE blog_product_clicks ADD COLUMN IF NOT EXISTS cta_label TEXT;
      CREATE INDEX IF NOT EXISTS idx_blog_product_clicks_post_created
        ON blog_product_clicks(post_slug, created_at);
      CREATE INDEX IF NOT EXISTS idx_blog_product_clicks_product
        ON blog_product_clicks(product_slug);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_product_clicks_event_id
        ON blog_product_clicks(event_id) WHERE event_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_blog_product_clicks_cta_event
        ON blog_product_clicks(cta_event_id) WHERE cta_event_id IS NOT NULL;
      CREATE TABLE IF NOT EXISTS blog_cta_clicks (
        id BIGSERIAL PRIMARY KEY,
        event_id TEXT NOT NULL UNIQUE,
        post_slug TEXT NOT NULL,
        cta_id TEXT NOT NULL,
        cta_label TEXT,
        target_path TEXT NOT NULL,
        session_id TEXT,
        ip_hash TEXT,
        ua TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_blog_cta_clicks_post_created
        ON blog_cta_clicks(post_slug, created_at);
      CREATE INDEX IF NOT EXISTS idx_blog_cta_clicks_session
        ON blog_cta_clicks(session_id) WHERE session_id IS NOT NULL;
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
  fullUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  ttclid?: string;
  msclkid?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    const source = classifyTrafficSource(params);
    await pool.query(
      `INSERT INTO analytics_events
        (path, referrer, ua, ip_hash, session_id, full_url,
         utm_source, utm_medium, utm_campaign, utm_term, utm_content,
         gclid, fbclid, ttclid, msclkid, source_group, source_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        params.path,
        params.referrer || null,
        params.ua || null,
        params.ipHash || null,
        params.sessionId || null,
        params.fullUrl || null,
        params.utmSource || null,
        params.utmMedium || null,
        params.utmCampaign || null,
        params.utmTerm || null,
        params.utmContent || null,
        params.gclid || null,
        params.fbclid || null,
        params.ttclid || null,
        params.msclkid || null,
        source.group,
        source.name,
      ]
    );
  } catch (err) {
    // Silently fail — don't break the page
    console.error("[analytics] trackPageView error:", (err as Error).message);
  }
}

export async function trackBlogProductClick(params: {
  eventId?: string;
  postSlug: string;
  productSlug: string;
  productName?: string;
  targetPath: string;
  sourceType?: "direct" | "cta_assisted";
  ctaEventId?: string;
  ctaId?: string;
  ctaLabel?: string;
  sessionId?: string;
  ipHash?: string;
  ua?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO blog_product_clicks
        (event_id, post_slug, product_slug, product_name, target_path, source_type,
         cta_event_id, cta_id, cta_label, session_id, ip_hash, ua)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (event_id) WHERE event_id IS NOT NULL DO NOTHING`,
      [
        params.eventId || null,
        params.postSlug,
        params.productSlug,
        params.productName || null,
        params.targetPath,
        params.sourceType || "direct",
        params.ctaEventId || null,
        params.ctaId || null,
        params.ctaLabel || null,
        params.sessionId || null,
        params.ipHash || null,
        params.ua || null,
      ]
    );
  } catch (err) {
    console.error("[analytics] trackBlogProductClick error:", (err as Error).message);
  }
}

export async function trackBlogCtaClick(params: {
  eventId: string;
  postSlug: string;
  ctaId: string;
  ctaLabel?: string;
  targetPath: string;
  sessionId?: string;
  ipHash?: string;
  ua?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO blog_cta_clicks
        (event_id, post_slug, cta_id, cta_label, target_path, session_id, ip_hash, ua)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (event_id) DO NOTHING`,
      [
        params.eventId,
        params.postSlug,
        params.ctaId,
        params.ctaLabel || null,
        params.targetPath,
        params.sessionId || null,
        params.ipHash || null,
        params.ua || null,
      ]
    );
  } catch (err) {
    console.error("[analytics] trackBlogCtaClick error:", (err as Error).message);
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
  totalSessions: number;
  avgViewsPerDay: number;
  topPage: string;
  bounceRate: number; // estimated
  prevTotalViews: number;
  prevTotalUniques: number;
  viewsGrowth: number;
  uniquesGrowth: number;
}

export interface TrafficSourceGroupRow {
  key: TrafficSourceGroupKey;
  label: string;
  views: number;
  sessions: number;
  visitors: number;
  pct: number;
}

export interface TrafficSourceDetailRow {
  group: TrafficSourceGroupKey;
  groupLabel: string;
  source: string;
  medium: string;
  campaign: string;
  views: number;
  sessions: number;
  visitors: number;
  pct: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  byDay: AnalyticsRow[];
  byWeek: AnalyticsRow[];
  byMonth: AnalyticsRow[];
  byYear: AnalyticsRow[];
  topPages: TopPage[];
  referrers: ReferrerRow[];
  sourceGroups: TrafficSourceGroupRow[];
  sourceDetails: TrafficSourceDetailRow[];
  devices: DeviceRow[];
  hourly: { hour: number; label: string; views: number; uniques: number }[];
}

export interface BlogPostAnalyticsSummary {
  slug: string;
  totalViews: number;
  todayViews: number;
  weekViews: number;
  monthViews: number;
  totalCtaClicks: number;
  totalProductClicks: number;
  directProductClicks: number;
  assistedProductClicks: number;
}

export interface BlogAnalyticsDailyRow {
  date: string;
  label: string;
  views: number;
  ctaClicks: number;
  productClicks: number;
}

export interface BlogProductClickRow {
  productSlug: string;
  productName: string;
  targetPath: string;
  clicks: number;
  directClicks: number;
  assistedClicks: number;
  lastClickedAt: string | null;
}

export interface BlogCtaClickRow {
  ctaId: string;
  ctaLabel: string;
  targetPath: string;
  clicks: number;
  assistedProductClicks: number;
  convertedCtaClicks: number;
  conversionRate: number;
}

export interface BlogPostAnalyticsDetail extends BlogPostAnalyticsSummary {
  todayProductClicks: number;
  weekProductClicks: number;
  monthProductClicks: number;
  todayCtaClicks: number;
  weekCtaClicks: number;
  monthCtaClicks: number;
  clickThroughRate: number;
  ctaToProductRate: number;
  daily: BlogAnalyticsDailyRow[];
  products: BlogProductClickRow[];
  ctas: BlogCtaClickRow[];
}

function emptyBlogSummary(slug: string): BlogPostAnalyticsSummary {
  return {
    slug,
    totalViews: 0,
    todayViews: 0,
    weekViews: 0,
    monthViews: 0,
    totalCtaClicks: 0,
    totalProductClicks: 0,
    directProductClicks: 0,
    assistedProductClicks: 0,
  };
}

export async function getBlogPostAnalyticsSummaries(
  slugs: string[]
): Promise<Record<string, BlogPostAnalyticsSummary>> {
  const summaries = Object.fromEntries(slugs.map((slug) => [slug, emptyBlogSummary(slug)]));
  const pool = getPool();
  if (!pool || slugs.length === 0) return summaries;

  try {
    const paths = slugs.map((slug) => `/blog/${slug}`);
    const viewsRes = await pool.query(
      `SELECT split_part(path, '?', 1) AS clean_path,
              COUNT(*)::INT AS total_views,
              COUNT(*) FILTER (
                WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE =
                      (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE
              )::INT AS today_views,
              COUNT(*) FILTER (
                WHERE date_trunc('week', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') =
                      date_trunc('week', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
              )::INT AS week_views,
              COUNT(*) FILTER (
                WHERE date_trunc('month', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') =
                      date_trunc('month', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
              )::INT AS month_views
       FROM analytics_events
       WHERE split_part(path, '?', 1) = ANY($1::TEXT[])
       GROUP BY 1`,
      [paths]
    );

    for (const row of viewsRes.rows) {
      const slug = String(row.clean_path).replace(/^\/blog\//, "");
      if (!summaries[slug]) continue;
      summaries[slug] = {
        ...summaries[slug],
        totalViews: Number(row.total_views || 0),
        todayViews: Number(row.today_views || 0),
        weekViews: Number(row.week_views || 0),
        monthViews: Number(row.month_views || 0),
      };
    }

    const clicksRes = await pool.query(
      `SELECT post_slug, COUNT(*)::INT AS total_clicks,
              COUNT(*) FILTER (WHERE source_type = 'direct')::INT AS direct_clicks,
              COUNT(*) FILTER (WHERE source_type = 'cta_assisted')::INT AS assisted_clicks
       FROM blog_product_clicks
       WHERE post_slug = ANY($1::TEXT[])
       GROUP BY post_slug`,
      [slugs]
    );
    for (const row of clicksRes.rows) {
      if (!summaries[row.post_slug]) continue;
      summaries[row.post_slug].totalProductClicks = Number(row.total_clicks || 0);
      summaries[row.post_slug].directProductClicks = Number(row.direct_clicks || 0);
      summaries[row.post_slug].assistedProductClicks = Number(row.assisted_clicks || 0);
    }

    const ctaRes = await pool.query(
      `SELECT post_slug, COUNT(*)::INT AS total_clicks
       FROM blog_cta_clicks
       WHERE post_slug = ANY($1::TEXT[])
       GROUP BY post_slug`,
      [slugs]
    );
    for (const row of ctaRes.rows) {
      if (!summaries[row.post_slug]) continue;
      summaries[row.post_slug].totalCtaClicks = Number(row.total_clicks || 0);
    }
  } catch (err) {
    console.error("[analytics] getBlogPostAnalyticsSummaries error:", (err as Error).message);
  }

  return summaries;
}

export async function getBlogPostAnalyticsDetail(slug: string): Promise<BlogPostAnalyticsDetail> {
  const summary = (await getBlogPostAnalyticsSummaries([slug]))[slug] || emptyBlogSummary(slug);
  const empty: BlogPostAnalyticsDetail = {
    ...summary,
    todayProductClicks: 0,
    weekProductClicks: 0,
    monthProductClicks: 0,
    todayCtaClicks: 0,
    weekCtaClicks: 0,
    monthCtaClicks: 0,
    clickThroughRate: summary.totalViews > 0
      ? Math.round((summary.totalProductClicks / summary.totalViews) * 1000) / 10
      : 0,
    ctaToProductRate: 0,
    daily: [],
    products: [],
    ctas: [],
  };
  const pool = getPool();
  if (!pool) return empty;

  try {
    const path = `/blog/${slug}`;
    const [clickPeriodRes, ctaPeriodRes, viewDailyRes, ctaDailyRes, clickDailyRes, productsRes, ctasRes] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (
             WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE =
                   (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE
           )::INT AS today_clicks,
           COUNT(*) FILTER (
             WHERE date_trunc('week', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') =
                   date_trunc('week', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
           )::INT AS week_clicks,
           COUNT(*) FILTER (
             WHERE date_trunc('month', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') =
                   date_trunc('month', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
           )::INT AS month_clicks
         FROM blog_product_clicks WHERE post_slug = $1`,
        [slug]
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (
             WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE =
                   (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE
           )::INT AS today_clicks,
           COUNT(*) FILTER (
             WHERE date_trunc('week', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') =
                   date_trunc('week', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
           )::INT AS week_clicks,
           COUNT(*) FILTER (
             WHERE date_trunc('month', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') =
                   date_trunc('month', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
           )::INT AS month_clicks
         FROM blog_cta_clicks WHERE post_slug = $1`,
        [slug]
      ),
      pool.query(
        `SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
                COUNT(*)::INT AS views
         FROM analytics_events
         WHERE split_part(path, '?', 1) = $1
           AND created_at >= NOW() - INTERVAL '29 days'
         GROUP BY 1 ORDER BY 1`,
        [path]
      ),
      pool.query(
        `SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
                COUNT(*)::INT AS clicks
         FROM blog_cta_clicks
         WHERE post_slug = $1 AND created_at >= NOW() - INTERVAL '29 days'
         GROUP BY 1 ORDER BY 1`,
        [slug]
      ),
      pool.query(
        `SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
                COUNT(*)::INT AS clicks
         FROM blog_product_clicks
         WHERE post_slug = $1 AND created_at >= NOW() - INTERVAL '29 days'
         GROUP BY 1 ORDER BY 1`,
        [slug]
      ),
      pool.query(
        `SELECT product_slug, COALESCE(MAX(product_name), product_slug) AS product_name,
                MAX(target_path) AS target_path, COUNT(*)::INT AS clicks,
                COUNT(*) FILTER (WHERE source_type = 'direct')::INT AS direct_clicks,
                COUNT(*) FILTER (WHERE source_type = 'cta_assisted')::INT AS assisted_clicks,
                MAX(created_at) AS last_clicked_at
         FROM blog_product_clicks
         WHERE post_slug = $1
         GROUP BY product_slug
         ORDER BY clicks DESC, product_name ASC`,
        [slug]
      ),
      pool.query(
        `SELECT c.cta_id,
                COALESCE(MAX(c.cta_label), c.cta_id) AS cta_label,
                MAX(c.target_path) AS target_path,
                COUNT(DISTINCT c.event_id)::INT AS clicks,
                COUNT(p.id)::INT AS assisted_product_clicks,
                COUNT(DISTINCT p.cta_event_id)::INT AS converted_cta_clicks
         FROM blog_cta_clicks c
         LEFT JOIN blog_product_clicks p
           ON p.cta_event_id = c.event_id AND p.source_type = 'cta_assisted'
         WHERE c.post_slug = $1
         GROUP BY c.cta_id
         ORDER BY clicks DESC, cta_label ASC`,
        [slug]
      ),
    ]);

    const viewsByDate = new Map(viewDailyRes.rows.map((row) => [row.date, Number(row.views || 0)]));
    const ctaByDate = new Map(ctaDailyRes.rows.map((row) => [row.date, Number(row.clicks || 0)]));
    const clicksByDate = new Map(clickDailyRes.rows.map((row) => [row.date, Number(row.clicks || 0)]));
    const daily: BlogAnalyticsDailyRow[] = [];
    const today = new Date();
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      daily.push({
        date: key,
        label: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        views: viewsByDate.get(key) || 0,
        ctaClicks: ctaByDate.get(key) || 0,
        productClicks: clicksByDate.get(key) || 0,
      });
    }

    const period = clickPeriodRes.rows[0] || {};
    const ctaPeriod = ctaPeriodRes.rows[0] || {};
    const ctas = ctasRes.rows.map((row) => {
      const clicks = Number(row.clicks || 0);
      const convertedCtaClicks = Number(row.converted_cta_clicks || 0);
      return {
        ctaId: row.cta_id,
        ctaLabel: row.cta_label,
        targetPath: row.target_path,
        clicks,
        assistedProductClicks: Number(row.assisted_product_clicks || 0),
        convertedCtaClicks,
        conversionRate: clicks > 0 ? Math.round((convertedCtaClicks / clicks) * 1000) / 10 : 0,
      };
    });
    const convertedCtaClicks = ctas.reduce((total, row) => total + row.convertedCtaClicks, 0);
    return {
      ...empty,
      todayProductClicks: Number(period.today_clicks || 0),
      weekProductClicks: Number(period.week_clicks || 0),
      monthProductClicks: Number(period.month_clicks || 0),
      todayCtaClicks: Number(ctaPeriod.today_clicks || 0),
      weekCtaClicks: Number(ctaPeriod.week_clicks || 0),
      monthCtaClicks: Number(ctaPeriod.month_clicks || 0),
      ctaToProductRate: summary.totalCtaClicks > 0
        ? Math.round((convertedCtaClicks / summary.totalCtaClicks) * 1000) / 10
        : 0,
      daily,
      products: productsRes.rows.map((row) => ({
        productSlug: row.product_slug,
        productName: row.product_name,
        targetPath: row.target_path,
        clicks: Number(row.clicks || 0),
        directClicks: Number(row.direct_clicks || 0),
        assistedClicks: Number(row.assisted_clicks || 0),
        lastClickedAt: row.last_clicked_at ? new Date(row.last_clicked_at).toISOString() : null,
      })),
      ctas,
    };
  } catch (err) {
    console.error("[analytics] getBlogPostAnalyticsDetail error:", (err as Error).message);
    return empty;
  }
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

export type AnalyticsRange = "day" | "week" | "month" | "quarter" | "year" | "all";

export async function getAnalyticsData(range: AnalyticsRange = "month"): Promise<AnalyticsData> {
  const pool = getPool();

  // Return empty data if no DB
  const empty: AnalyticsData = {
    summary: { totalViews: 0, totalUniques: 0, totalSessions: 0, avgViewsPerDay: 0, topPage: "/", bounceRate: 0, prevTotalViews: 0, prevTotalUniques: 0, viewsGrowth: 0, uniquesGrowth: 0 },
    byDay: [],
    byWeek: [],
    byMonth: [],
    byYear: [],
    topPages: [],
    referrers: [],
    sourceGroups: [],
    sourceDetails: [],
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
      case "quarter":
        startDate = new Date(now); startDate.setDate(now.getDate() - 89); startDate.setHours(0, 0, 0, 0);
        prevStartDate = new Date(startDate); prevStartDate.setDate(prevStartDate.getDate() - 90);
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
      `SELECT COUNT(*) as views,
              COUNT(DISTINCT COALESCE(NULLIF(ip_hash, ''), NULLIF(session_id, ''), ua)) as uniques,
              COUNT(DISTINCT COALESCE(NULLIF(session_id, ''), NULLIF(ip_hash, ''), ua)) as sessions
       FROM analytics_events WHERE created_at >= $1 AND ${PUBLIC_EVENT_SQL}`,
      [startDate]
    );
    const totalViews = parseInt(totalRes.rows[0]?.views || "0");
    const totalUniques = parseInt(totalRes.rows[0]?.uniques || "0");
    const totalSessions = parseInt(totalRes.rows[0]?.sessions || "0");

    // Previous period total
    const prevRes = await pool.query(
      `SELECT COUNT(*) as views, COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events WHERE created_at >= $1 AND created_at < $2 AND ${PUBLIC_EVENT_SQL}`,
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
       WHERE created_at >= NOW() - INTERVAL '30 days' AND ${PUBLIC_EVENT_SQL}
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
       WHERE created_at >= NOW() - INTERVAL '12 weeks' AND ${PUBLIC_EVENT_SQL}
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
       WHERE created_at >= NOW() - INTERVAL '12 months' AND ${PUBLIC_EVENT_SQL}
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
       WHERE ${PUBLIC_EVENT_SQL}
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
      `SELECT split_part(path, '?', 1) AS path,
              COUNT(*) as views,
              COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
       FROM analytics_events
       WHERE created_at >= $1 AND ${PUBLIC_EVENT_SQL}
       GROUP BY 1 ORDER BY views DESC LIMIT 10`,
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
       WHERE created_at >= $1 AND ${PUBLIC_EVENT_SQL}
       GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      [startDate]
    );
    const referrers: ReferrerRow[] = referrersRes.rows.map((r) => ({
      referrer: r.referrer,
      count: parseInt(r.count),
    }));

    // Traffic acquisition — first-touch attribution persisted on each pageview.
    // Older rows are classified from the raw referrer and UTM parameters still present in path.
    const sourceRes = await pool.query(
      `SELECT source_group, source_name,
              COALESCE(NULLIF(utm_source, ''), substring(path from '[?&]utm_source=([^&]+)')) AS utm_source,
              COALESCE(NULLIF(utm_medium, ''), substring(path from '[?&]utm_medium=([^&]+)')) AS utm_medium,
              COALESCE(NULLIF(utm_campaign, ''), substring(path from '[?&]utm_campaign=([^&]+)')) AS utm_campaign,
              referrer,
              COUNT(*)::INT AS views,
              COUNT(DISTINCT COALESCE(NULLIF(session_id, ''), NULLIF(ip_hash, ''), ua))::INT AS sessions,
              COUNT(DISTINCT COALESCE(NULLIF(ip_hash, ''), NULLIF(session_id, ''), ua))::INT AS visitors
       FROM analytics_events
       WHERE created_at >= $1 AND ${PUBLIC_EVENT_SQL}
       GROUP BY 1, 2, 3, 4, 5, 6`,
      [startDate]
    );

    type MutableSource = Omit<TrafficSourceDetailRow, "pct" | "groupLabel">;
    const detailMap = new Map<string, MutableSource>();
    for (const row of sourceRes.rows) {
      const fallback = classifyTrafficSource({
        referrer: row.referrer,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
      });
      const storedGroup = String(row.source_group || "") as TrafficSourceGroupKey;
      const group = storedGroup && TRAFFIC_GROUP_LABELS[storedGroup] ? storedGroup : fallback.group;
      const source = String(row.source_name || fallback.name || TRAFFIC_GROUP_LABELS[group]);
      const medium = String(row.utm_medium || (group === "organic_search" ? "organic" : group === "paid" ? "paid" : group));
      const campaign = String(row.utm_campaign || "");
      const key = `${group}\u0000${source}\u0000${medium}\u0000${campaign}`;
      const current = detailMap.get(key) || { group, source, medium, campaign, views: 0, sessions: 0, visitors: 0 };
      current.views += Number(row.views || 0);
      current.sessions += Number(row.sessions || 0);
      current.visitors += Number(row.visitors || 0);
      detailMap.set(key, current);
    }

    const groupOrder: TrafficSourceGroupKey[] = ["organic_search", "social", "paid", "referral", "direct", "email", "other"];
    const groupTotals = groupOrder.map((key) => {
      const rows = Array.from(detailMap.values()).filter((row) => row.group === key);
      const views = rows.reduce((sum, row) => sum + row.views, 0);
      const sessions = rows.reduce((sum, row) => sum + row.sessions, 0);
      const visitors = rows.reduce((sum, row) => sum + row.visitors, 0);
      return { key, label: TRAFFIC_GROUP_LABELS[key], views, sessions, visitors };
    });
    const attributedSessions = groupTotals.reduce((sum, row) => sum + row.sessions, 0);
    const sourceGroups: TrafficSourceGroupRow[] = groupTotals.map((row) => ({
      ...row,
      pct: attributedSessions > 0 ? Math.round((row.sessions / attributedSessions) * 1000) / 10 : 0,
    }));
    const sourceDetails: TrafficSourceDetailRow[] = Array.from(detailMap.values())
      .map((row) => ({
        ...row,
        groupLabel: TRAFFIC_GROUP_LABELS[row.group],
        pct: attributedSessions > 0 ? Math.round((row.sessions / attributedSessions) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions || b.views - a.views)
      .slice(0, 20);

    // Devices (from UA)
    const uaRes = await pool.query(
      `SELECT ua, COUNT(*) as count FROM analytics_events WHERE created_at >= $1 AND ${PUBLIC_EVENT_SQL} GROUP BY ua`,
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
       WHERE created_at >= NOW() - INTERVAL '7 days' AND ${PUBLIC_EVENT_SQL}
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
        totalSessions,
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
      sourceGroups,
      sourceDetails,
      devices,
      hourly,
    };
  } catch (err) {
    console.error("[analytics] getAnalyticsData error:", (err as Error).message);
    return empty;
  }
}
