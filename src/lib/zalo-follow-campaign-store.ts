import "server-only";

import { createHash, randomUUID } from "crypto";
import { query, queryOne } from "@/lib/db";
import { absoluteUrl } from "@/lib/site-url";
import { normalizeZaloFollowLandingConfig, type ZaloFollowLandingConfig } from "@/lib/zalo-follow-content";
import { buildZaloOaChatUrl, normalizeZaloOaId } from "@/lib/zalo-follow-links";

export type ZaloFollowCampaignStatus = "active" | "paused";
export type ZaloFollowWidgetMode = "follow" | "interactive";
export type ZaloFollowEventAction = "sdk_loaded" | "follow_success" | "chat_open" | "fallback_open" | "dismiss" | "error" | "identify";

export interface ZaloFollowCareStep {
  week: number;
  title: string;
  content: string;
  cta: string;
}

export interface ZaloFollowSourceMetric {
  source: string;
  visits: number;
  oaOpens: number;
  followCallbacks: number;
  verifiedFollowers: number;
  openRate: number;
  conversionRate: number;
}

export interface ZaloFollowCampaign {
  id: string;
  slug: string;
  name: string;
  productKey: string;
  headline: string;
  description: string;
  benefits: string[];
  heroImage: string;
  galleryImages: string[];
  chatUrl: string;
  welcomeMessage: string;
  offerTitle: string;
  offerDescription: string;
  ctaLabel: string;
  audienceTags: string[];
  carePlan: ZaloFollowCareStep[];
  landingConfig: ZaloFollowLandingConfig;
  widgetMode: ZaloFollowWidgetMode;
  status: ZaloFollowCampaignStatus;
  trackingUrl: string;
  createdAt: string;
  metrics: {
    visits: number;
    uniqueVisitors: number;
    sdkLoaded: number;
    followCallbacks: number;
    verifiedFollowers: number;
    chatOpens: number;
    fallbackOpens: number;
    errors: number;
    conversionRate: number;
  };
}

export interface PublicZaloFollowCampaign extends Omit<ZaloFollowCampaign, "metrics" | "createdAt"> {
  oaId: string;
}

export interface ZaloFollowReport {
  range: { from: string; to: string };
  summary: ZaloFollowCampaign["metrics"];
  campaigns: ZaloFollowCampaign[];
  sources: ZaloFollowSourceMetric[];
}

export interface VerifiedZaloFollowAttribution {
  campaignId: string;
  campaignName: string;
  productKey: string;
  welcomeMessage: string;
}

let schemaReady: Promise<void> | null = null;

export async function initZaloFollowCampaignSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = query(`
      CREATE TABLE IF NOT EXISTS crm_zalo_follow_campaigns (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        product_key TEXT NOT NULL DEFAULT '',
        headline TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        benefits JSONB NOT NULL DEFAULT '[]',
        hero_image TEXT NOT NULL DEFAULT '',
        gallery_images JSONB NOT NULL DEFAULT '[]',
        chat_url TEXT NOT NULL DEFAULT '',
        welcome_message TEXT NOT NULL DEFAULT '',
        offer_title TEXT NOT NULL DEFAULT '',
        offer_description TEXT NOT NULL DEFAULT '',
        cta_label TEXT NOT NULL DEFAULT '',
        audience_tags JSONB NOT NULL DEFAULT '[]',
        care_plan JSONB NOT NULL DEFAULT '[]',
        landing_config JSONB NOT NULL DEFAULT '{}',
        widget_mode TEXT NOT NULL DEFAULT 'follow',
        status TEXT NOT NULL DEFAULT 'active',
        created_by TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS crm_zalo_follow_visits (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES crm_zalo_follow_campaigns(id) ON DELETE CASCADE,
        visitor_key TEXT NOT NULL,
        session_id TEXT NOT NULL DEFAULT '',
        ip_hash TEXT NOT NULL DEFAULT '',
        user_agent TEXT NOT NULL DEFAULT '',
        referrer TEXT NOT NULL DEFAULT '',
        query_params JSONB NOT NULL DEFAULT '{}',
        oa_user_id TEXT NOT NULL DEFAULT '',
        sdk_loaded_at TIMESTAMPTZ,
        callback_at TIMESTAMPTZ,
        identified_at TIMESTAMPTZ,
        chat_opened_at TIMESTAMPTZ,
        fallback_opened_at TIMESTAMPTZ,
        dismissed_at TIMESTAMPTZ,
        error_code TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS crm_zalo_follow_attributions (
        user_id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES crm_zalo_follow_campaigns(id) ON DELETE CASCADE,
        visit_id TEXT NOT NULL REFERENCES crm_zalo_follow_visits(id) ON DELETE CASCADE,
        confidence TEXT NOT NULL DEFAULT 'verified',
        verified_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_zalo_follow_campaign_status ON crm_zalo_follow_campaigns(status,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_follow_visit_campaign_time ON crm_zalo_follow_visits(campaign_id,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_follow_visit_visitor_time ON crm_zalo_follow_visits(visitor_key,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_follow_visit_user_time ON crm_zalo_follow_visits(oa_user_id,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_follow_attr_campaign_time ON crm_zalo_follow_attributions(campaign_id,verified_at DESC);

      ALTER TABLE crm_zalo_follow_campaigns ADD COLUMN IF NOT EXISTS gallery_images JSONB NOT NULL DEFAULT '[]';
      ALTER TABLE crm_zalo_follow_campaigns ADD COLUMN IF NOT EXISTS offer_title TEXT NOT NULL DEFAULT '';
      ALTER TABLE crm_zalo_follow_campaigns ADD COLUMN IF NOT EXISTS offer_description TEXT NOT NULL DEFAULT '';
      ALTER TABLE crm_zalo_follow_campaigns ADD COLUMN IF NOT EXISTS cta_label TEXT NOT NULL DEFAULT '';
      ALTER TABLE crm_zalo_follow_campaigns ADD COLUMN IF NOT EXISTS audience_tags JSONB NOT NULL DEFAULT '[]';
      ALTER TABLE crm_zalo_follow_campaigns ADD COLUMN IF NOT EXISTS care_plan JSONB NOT NULL DEFAULT '[]';
      ALTER TABLE crm_zalo_follow_campaigns ADD COLUMN IF NOT EXISTS landing_config JSONB NOT NULL DEFAULT '{}';

      INSERT INTO crm_zalo_follow_campaigns
        (id,slug,name,product_key,headline,description,benefits,hero_image,welcome_message,widget_mode,status,created_by)
      VALUES
        ('follow-sofa-bed-2026','sofa-giuong','Quảng cáo Sofa giường','sofa_bed',
         'Nhận tư vấn và báo giá Sofa giường SmartFurni',
         'Bấm Quan tâm Zalo OA để đội ngũ SmartFurni gửi mẫu, kích thước và báo giá phù hợp với không gian của Anh/Chị.',
         '["Catalogue mẫu mới 2026","Báo giá theo kích thước","Tư vấn chất liệu và công năng"]'::jsonb,
         '/uploads/migrated/THAO_TA-CC-81C_SMF12_DA_PU_a880rv-2f2905c3e0.webp',
         'Chào {{name}}, cảm ơn Anh/Chị đã quan tâm Sofa giường SmartFurni. Anh/Chị cần tư vấn mẫu, kích thước hay chất liệu nào để SmartFurni gửi báo giá phù hợp?',
         'follow','active','system'),
        ('follow-smart-bed-2026','giuong-cong-thai-hoc','Quảng cáo Giường công thái học','ergonomic_bed',
         'Nhận tư vấn Giường công thái học SmartFurni',
         'Bấm Quan tâm Zalo OA để nhận cấu hình, kích thước và báo giá dòng giường điều chỉnh điện phù hợp.',
         '["Tư vấn cấu hình motor","Báo giá theo kích thước","Thông tin bảo hành và lắp đặt"]'::jsonb,
         '/uploads/products/smartfurni-bed-main.webp',
         'Chào {{name}}, cảm ơn Anh/Chị đã quan tâm Giường công thái học SmartFurni. Anh/Chị cần tư vấn kích thước hay cấu hình nào để SmartFurni gửi thông tin phù hợp?',
         'follow','active','system'),
        ('follow-smartfurni-quote-2026','bao-gia-smartfurni','Nhận báo giá SmartFurni','all_products',
         'Quan tâm Zalo OA để nhận tư vấn và báo giá',
         'Đội ngũ SmartFurni hỗ trợ lựa chọn sản phẩm, gửi catalogue và báo giá theo đúng nhu cầu của Anh/Chị.',
         '["Catalogue sản phẩm mới","Báo giá theo nhu cầu","Tư vấn trực tiếp trên Zalo"]'::jsonb,
         '/uploads/migrated/THAO_TA-CC-81C_SMF12_DA_PU_a880rv-2f2905c3e0.webp',
         'Chào {{name}}, cảm ơn Anh/Chị đã quan tâm Zalo OA SmartFurni. Anh/Chị đang cần tư vấn sofa giường, giường công thái học hay sản phẩm nào khác?',
         'follow','active','system')
      ON CONFLICT (id) DO NOTHING;
    `).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function trackingUrl(slug: string): string {
  return absoluteUrl(`/zalo/quan-tam/${encodeURIComponent(slug)}`);
}

function vietnamDate(daysFromToday = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + daysFromToday * 86_400_000));
}

function reportRange(input: { from?: string; to?: string } = {}) {
  const valid = (value?: string) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
  const from = valid(input.from) ? input.from! : vietnamDate(-29);
  const to = valid(input.to) ? input.to! : vietnamDate();
  if (from > to) throw new Error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
  if ((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 > 366) throw new Error("Khoảng báo cáo tối đa là 367 ngày.");
  return { from, to };
}

function slugBase(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "zalo-quan-tam";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map(item => item.trim()).filter(Boolean).slice(0, 6) : [];
}

function imageArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map(item => item.trim()).filter(Boolean).slice(0, 12) : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function productLabel(productKey: string): string {
  return ({
    sofa_bed: "Sofa giường",
    electric_sofa: "Sofa chỉnh điện",
    ergonomic_bed: "Giường công thái học",
    care_bed: "Giường chăm sóc",
    adjustable_frame: "Khung giường điều chỉnh",
    mattress: "Nệm",
    all_products: "Sản phẩm SmartFurni",
  } as Record<string, string>)[productKey] || "Sản phẩm SmartFurni";
}

function defaultCarePlan(productKey: string): ZaloFollowCareStep[] {
  const product = productLabel(productKey);
  return [
    { week: 1, title: "Chọn đúng kích thước", content: `Hướng dẫn chọn kích thước ${product} phù hợp với diện tích và nhu cầu sử dụng.`, cta: "Gửi kích thước phòng" },
    { week: 2, title: "Xem công năng thực tế", content: `Video vận hành, vật liệu và các chi tiết quan trọng của ${product}.`, cta: "Xem mẫu phù hợp" },
    { week: 3, title: "Công trình & trải nghiệm", content: `Case study thực tế giúp khách hàng hình dung ${product} trong không gian sử dụng.`, cta: "Yêu cầu báo giá" },
    { week: 4, title: "Mẫu mới & showroom", content: `Cập nhật mẫu mới, hàng có sẵn và lịch trải nghiệm ${product} tại showroom.`, cta: "Đặt lịch xem" },
  ];
}

function carePlanArray(value: unknown, productKey: string): ZaloFollowCareStep[] {
  if (!Array.isArray(value)) return defaultCarePlan(productKey);
  const rows = value.slice(0, 4).map((item, index) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      week: index + 1,
      title: String(row.title || "").trim().slice(0, 120),
      content: String(row.content || "").trim().slice(0, 500),
      cta: String(row.cta || "").trim().slice(0, 80),
    };
  }).filter(item => item.title || item.content || item.cta);
  return rows.length ? rows : defaultCarePlan(productKey);
}

function campaignFromRow(row: Record<string, unknown>): ZaloFollowCampaign {
  const visits = Number(row.visits || 0);
  const followCallbacks = Number(row.follow_callbacks || 0);
  const productKey = String(row.product_key || "");
  const product = productLabel(productKey);
  const benefits = stringArray(row.benefits);
  return {
    id: String(row.id), slug: String(row.slug), name: String(row.name), productKey,
    headline: String(row.headline), description: String(row.description || ""), benefits,
    heroImage: String(row.hero_image || ""), galleryImages: imageArray(row.gallery_images),
    chatUrl: String(row.chat_url || "").trim(), welcomeMessage: String(row.welcome_message || ""),
    offerTitle: String(row.offer_title || "").trim() || `Nhận catalogue & báo giá ${product}`,
    offerDescription: String(row.offer_description || "").trim() || "Quyền lợi dành riêng cho người Quan tâm Zalo OA SmartFurni.",
    ctaLabel: String(row.cta_label || "").trim() || "Mở Zalo nhận catalogue & báo giá",
    audienceTags: stringArray(row.audience_tags), carePlan: carePlanArray(row.care_plan, productKey),
    landingConfig: normalizeZaloFollowLandingConfig(objectValue(row.landing_config), productKey, benefits),
    widgetMode: String(row.widget_mode) === "interactive" ? "interactive" : "follow",
    status: String(row.status) === "paused" ? "paused" : "active", trackingUrl: trackingUrl(String(row.slug)),
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    metrics: {
      visits, uniqueVisitors: Number(row.unique_visitors || 0), sdkLoaded: Number(row.sdk_loaded || 0), followCallbacks,
      verifiedFollowers: Number(row.verified_followers || 0), chatOpens: Number(row.chat_opens || 0),
      fallbackOpens: Number(row.fallback_opens || 0), errors: Number(row.errors || 0),
      conversionRate: visits ? Math.round((followCallbacks / visits) * 1000) / 10 : 0,
    },
  };
}

const REPORT_SQL = `
  SELECT c.*,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date AND v.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day')::int AS visits,
    COUNT(DISTINCT v.visitor_key) FILTER (WHERE v.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date AND v.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day')::int AS unique_visitors,
    COUNT(DISTINCT v.id) FILTER (WHERE v.sdk_loaded_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date AND v.sdk_loaded_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day')::int AS sdk_loaded,
    COUNT(DISTINCT v.id) FILTER (WHERE v.callback_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date AND v.callback_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day')::int AS follow_callbacks,
    COUNT(DISTINCT a.user_id) FILTER (WHERE a.verified_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date AND a.verified_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day')::int AS verified_followers,
    COUNT(DISTINCT v.id) FILTER (WHERE v.chat_opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date AND v.chat_opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day')::int AS chat_opens,
    COUNT(DISTINCT v.id) FILTER (WHERE v.fallback_opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date AND v.fallback_opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day')::int AS fallback_opens,
    COUNT(DISTINCT v.id) FILTER (WHERE v.error_code <> '' AND v.updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date AND v.updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day')::int AS errors
  FROM crm_zalo_follow_campaigns c
  LEFT JOIN crm_zalo_follow_visits v ON v.campaign_id=c.id
  LEFT JOIN crm_zalo_follow_attributions a ON a.campaign_id=c.id
  GROUP BY c.id
  ORDER BY c.created_at DESC`;

export async function getZaloFollowReport(input: { from?: string; to?: string } = {}): Promise<ZaloFollowReport> {
  await initZaloFollowCampaignSchema();
  const range = reportRange(input);
  const rows = await query<Record<string, unknown>>(REPORT_SQL, [range.from, range.to]);
  const campaigns = rows.map(campaignFromRow);
  const summary = campaigns.reduce<ZaloFollowCampaign["metrics"]>((total, campaign) => ({
    visits: total.visits + campaign.metrics.visits,
    uniqueVisitors: total.uniqueVisitors + campaign.metrics.uniqueVisitors,
    sdkLoaded: total.sdkLoaded + campaign.metrics.sdkLoaded,
    followCallbacks: total.followCallbacks + campaign.metrics.followCallbacks,
    verifiedFollowers: total.verifiedFollowers + campaign.metrics.verifiedFollowers,
    chatOpens: total.chatOpens + campaign.metrics.chatOpens,
    fallbackOpens: total.fallbackOpens + campaign.metrics.fallbackOpens,
    errors: total.errors + campaign.metrics.errors,
    conversionRate: 0,
  }), { visits: 0, uniqueVisitors: 0, sdkLoaded: 0, followCallbacks: 0, verifiedFollowers: 0, chatOpens: 0, fallbackOpens: 0, errors: 0, conversionRate: 0 });
  const unique = await queryOne<{ count: number }>(
    `SELECT COUNT(DISTINCT visitor_key)::int AS count FROM crm_zalo_follow_visits
     WHERE created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date
       AND created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day'`,
    [range.from, range.to],
  );
  summary.uniqueVisitors = Number(unique?.count || 0);
  summary.conversionRate = summary.visits ? Math.round((summary.followCallbacks / summary.visits) * 1000) / 10 : 0;
  const sourceRows = await query<Record<string, unknown>>(
    `SELECT COALESCE(NULLIF(LOWER(v.query_params->>'utm_source'),''),'trực tiếp / chưa rõ') AS source,
       COUNT(DISTINCT v.id)::int AS visits,
       COUNT(DISTINCT v.id) FILTER (WHERE v.fallback_opened_at IS NOT NULL OR v.chat_opened_at IS NOT NULL)::int AS oa_opens,
       COUNT(DISTINCT v.id) FILTER (WHERE v.callback_at IS NOT NULL)::int AS follow_callbacks,
       COUNT(DISTINCT a.user_id)::int AS verified_followers
     FROM crm_zalo_follow_visits v
     LEFT JOIN crm_zalo_follow_attributions a ON a.visit_id=v.id
     WHERE v.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' >= $1::date
       AND v.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < $2::date + INTERVAL '1 day'
     GROUP BY 1 ORDER BY visits DESC LIMIT 12`,
    [range.from, range.to],
  );
  const sources = sourceRows.map(row => {
    const visits = Number(row.visits || 0);
    const oaOpens = Number(row.oa_opens || 0);
    const followCallbacks = Number(row.follow_callbacks || 0);
    return {
      source: String(row.source || "trực tiếp / chưa rõ"), visits, oaOpens, followCallbacks,
      verifiedFollowers: Number(row.verified_followers || 0),
      openRate: visits ? Math.round((oaOpens / visits) * 1000) / 10 : 0,
      conversionRate: visits ? Math.round((followCallbacks / visits) * 1000) / 10 : 0,
    };
  });
  return { range, summary, campaigns, sources };
}

export async function saveZaloFollowCampaign(input: {
  id?: string; name: string; slug?: string; productKey?: string; headline: string; description?: string; benefits?: string[];
  heroImage?: string; galleryImages?: string[]; chatUrl?: string; welcomeMessage?: string; widgetMode?: ZaloFollowWidgetMode;
  offerTitle?: string; offerDescription?: string; ctaLabel?: string; audienceTags?: string[]; carePlan?: ZaloFollowCareStep[];
  landingConfig?: Partial<ZaloFollowLandingConfig>;
}, actor: string): Promise<{ id: string; slug: string; trackingUrl: string }> {
  await initZaloFollowCampaignSchema();
  const name = String(input.name || "").trim().slice(0, 120);
  const headline = String(input.headline || "").trim().slice(0, 180);
  if (name.length < 3 || headline.length < 8) throw new Error("Tên chiến dịch và tiêu đề popup chưa hợp lệ.");
  const galleryImages = imageArray(input.galleryImages).map(item => item.slice(0, 1000));
  const heroImage = String(galleryImages[0] || input.heroImage || "").trim().slice(0, 1000);
  if (heroImage && !galleryImages.includes(heroImage)) galleryImages.unshift(heroImage);
  const productKey = String(input.productKey || "").trim().slice(0, 80);
  const carePlan = carePlanArray(input.carePlan, productKey);
  const benefits = stringArray(input.benefits);
  const landingConfig = normalizeZaloFollowLandingConfig(input.landingConfig, productKey, benefits);
  const values = [
    name, productKey, headline, String(input.description || "").trim().slice(0, 600),
    JSON.stringify(benefits), heroImage, JSON.stringify(galleryImages), String(input.chatUrl || "").trim().slice(0, 1000),
    String(input.welcomeMessage || "").trim().slice(0, 2000), input.widgetMode === "interactive" ? "interactive" : "follow",
    String(input.offerTitle || "").trim().slice(0, 180), String(input.offerDescription || "").trim().slice(0, 500),
    String(input.ctaLabel || "").trim().slice(0, 100), JSON.stringify(stringArray(input.audienceTags)), JSON.stringify(carePlan),
    JSON.stringify(landingConfig),
  ];
  if (input.id) {
    const updated = await queryOne<{ id: string; slug: string }>(
      `UPDATE crm_zalo_follow_campaigns SET name=$2,product_key=$3,headline=$4,description=$5,benefits=$6::jsonb,hero_image=$7,gallery_images=$8::jsonb,chat_url=$9,welcome_message=$10,widget_mode=$11,offer_title=$12,offer_description=$13,cta_label=$14,audience_tags=$15::jsonb,care_plan=$16::jsonb,landing_config=$17::jsonb,updated_at=NOW()
       WHERE id=$1 RETURNING id,slug`, [input.id, ...values],
    );
    if (!updated) throw new Error("Không tìm thấy chiến dịch cần cập nhật.");
    return { id: updated.id, slug: updated.slug, trackingUrl: trackingUrl(updated.slug) };
  }
  const id = randomUUID();
  const requestedSlug = slugBase(String(input.slug || name));
  const slug = await queryOne<{ slug: string }>(`SELECT slug FROM crm_zalo_follow_campaigns WHERE slug=$1`, [requestedSlug])
    ? `${requestedSlug}-${randomUUID().replace(/-/g, "").slice(0, 6)}` : requestedSlug;
  await query(
    `INSERT INTO crm_zalo_follow_campaigns (id,slug,name,product_key,headline,description,benefits,hero_image,gallery_images,chat_url,welcome_message,widget_mode,offer_title,offer_description,cta_label,audience_tags,care_plan,landing_config,status,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb,'active',$19)`,
    [id, slug, ...values, actor],
  );
  return { id, slug, trackingUrl: trackingUrl(slug) };
}

export async function setZaloFollowCampaignStatus(id: string, status: ZaloFollowCampaignStatus): Promise<void> {
  await initZaloFollowCampaignSchema();
  if (!id || !["active", "paused"].includes(status)) throw new Error("Trạng thái chiến dịch không hợp lệ.");
  const updated = await queryOne<{ id: string }>(
    `UPDATE crm_zalo_follow_campaigns SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id`, [id, status],
  );
  if (!updated) throw new Error("Không tìm thấy chiến dịch.");
}

export async function getPublicZaloFollowCampaign(slug: string): Promise<PublicZaloFollowCampaign | null> {
  await initZaloFollowCampaignSchema();
  const row = await queryOne<Record<string, unknown>>(
    `SELECT c.*,z.oa_id FROM crm_zalo_follow_campaigns c CROSS JOIN crm_zalo_config z
     WHERE c.slug=$1 AND c.status='active' AND z.id='default' LIMIT 1`, [slug],
  );
  if (!row) return null;
  const campaign = campaignFromRow(row);
  const oaId = normalizeZaloOaId(row.oa_id);
  const galleryImages = campaign.galleryImages.length ? campaign.galleryImages : campaign.heroImage ? [campaign.heroImage] : [];
  return { ...campaign, galleryImages, oaId, chatUrl: buildZaloOaChatUrl(campaign.chatUrl, oaId) };
}

export async function recordZaloFollowVisit(slug: string, input: {
  visitorKey?: string; sessionId?: string; ip?: string; userAgent?: string; referrer?: string; queryParams?: Record<string, string>;
}): Promise<{ visitId: string; visitorKey: string; campaign: PublicZaloFollowCampaign }> {
  const campaign = await getPublicZaloFollowCampaign(slug);
  if (!campaign) throw new Error("Chiến dịch không tồn tại hoặc đã tạm dừng.");
  const visitorKey = input.visitorKey || randomUUID();
  const recent = await queryOne<{ id: string }>(
    `SELECT id FROM crm_zalo_follow_visits WHERE campaign_id=$1 AND visitor_key=$2 AND created_at>=NOW()-INTERVAL '30 minutes' ORDER BY created_at DESC LIMIT 1`,
    [campaign.id, visitorKey],
  );
  if (recent) return { visitId: recent.id, visitorKey, campaign };
  const visitId = randomUUID();
  const salt = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "smartfurni-zalo-follow";
  const ipHash = input.ip ? createHash("sha256").update(`${salt}:${vietnamDate()}:${input.ip}`).digest("hex") : "";
  await query(
    `INSERT INTO crm_zalo_follow_visits (id,campaign_id,visitor_key,session_id,ip_hash,user_agent,referrer,query_params)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [visitId, campaign.id, visitorKey, String(input.sessionId || "").slice(0, 160), ipHash, String(input.userAgent || "").slice(0, 500), String(input.referrer || "").slice(0, 1000), JSON.stringify(input.queryParams || {})],
  );
  return { visitId, visitorKey, campaign };
}

export async function recordZaloFollowVisitAction(slug: string, visitId: string, action: ZaloFollowEventAction, input: { userId?: string; error?: string } = {}): Promise<void> {
  await initZaloFollowCampaignSchema();
  const columns: Partial<Record<ZaloFollowEventAction, string>> = {
    sdk_loaded: "sdk_loaded_at", follow_success: "callback_at", chat_open: "chat_opened_at", fallback_open: "fallback_opened_at", dismiss: "dismissed_at",
  };
  if (action === "identify") {
    const userId = String(input.userId || "").trim().slice(0, 200);
    if (!userId) throw new Error("Thiếu Zalo UID để xác minh nguồn.");
    const updated = await queryOne<{ id: string }>(
      `UPDATE crm_zalo_follow_visits v SET oa_user_id=$3,identified_at=NOW(),updated_at=NOW()
       FROM crm_zalo_follow_campaigns c WHERE v.id=$1 AND v.campaign_id=c.id AND c.slug=$2 RETURNING v.id`, [visitId, slug, userId],
    );
    if (!updated) throw new Error("Lượt truy cập không hợp lệ.");
    const existingFollow = await queryOne<{ event_at: string }>(
      `SELECT event_at::text AS event_at FROM crm_zalo_follow_events
       WHERE user_id=$1 AND event_at>=NOW()-INTERVAL '7 days' ORDER BY event_at DESC LIMIT 1`, [userId],
    );
    if (existingFollow?.event_at) await attributeZaloFollowFromWebhook(userId, existingFollow.event_at);
    return;
  }
  if (action === "error") {
    await query(
      `UPDATE crm_zalo_follow_visits v SET error_code=$3,updated_at=NOW() FROM crm_zalo_follow_campaigns c
       WHERE v.id=$1 AND v.campaign_id=c.id AND c.slug=$2`, [visitId, slug, String(input.error || "sdk_error").slice(0, 160)],
    );
    return;
  }
  const column = columns[action];
  if (!column) return;
  await query(
    `UPDATE crm_zalo_follow_visits v SET ${column}=COALESCE(${column},NOW()),updated_at=NOW() FROM crm_zalo_follow_campaigns c
     WHERE v.id=$1 AND v.campaign_id=c.id AND c.slug=$2`, [visitId, slug],
  );
}

function tagId(name: string): string {
  return `follow-${createHash("md5").update(name.toLocaleLowerCase("vi")).digest("hex")}`;
}

export async function attributeZaloFollowFromWebhook(userId: string, occurredAt: string): Promise<VerifiedZaloFollowAttribution | null> {
  await initZaloFollowCampaignSchema();
  const visit = await queryOne<Record<string, unknown>>(
    `SELECT v.id AS visit_id,v.campaign_id,c.name,c.product_key,c.welcome_message,c.audience_tags,v.query_params
     FROM crm_zalo_follow_visits v JOIN crm_zalo_follow_campaigns c ON c.id=v.campaign_id
     WHERE v.oa_user_id=$1 AND v.created_at <= $2::timestamptz + INTERVAL '5 minutes'
       AND v.created_at >= $2::timestamptz - INTERVAL '7 days'
     ORDER BY COALESCE(v.identified_at,v.callback_at,v.created_at) DESC LIMIT 1`, [userId, occurredAt],
  );
  if (!visit) return null;
  await query(
    `INSERT INTO crm_zalo_follow_attributions (user_id,campaign_id,visit_id,confidence,verified_at)
     VALUES ($1,$2,$3,'verified',$4) ON CONFLICT (user_id) DO UPDATE SET
       campaign_id=EXCLUDED.campaign_id,visit_id=EXCLUDED.visit_id,confidence='verified',verified_at=EXCLUDED.verified_at,updated_at=NOW()`,
    [userId, visit.campaign_id, visit.visit_id, occurredAt],
  );
  const queryParams = visit.query_params && typeof visit.query_params === "object" ? visit.query_params as Record<string, unknown> : {};
  const names = [
    queryParams.utm_source ? `Nguồn: ${String(queryParams.utm_source).slice(0, 60)}` : "Nguồn: Zalo Follow Landing",
    `Chiến dịch: ${String(visit.name).slice(0, 80)}`,
    visit.product_key ? `Quan tâm: ${String(visit.product_key).replaceAll("_", " ").slice(0, 60)}` : "",
    ...stringArray(visit.audience_tags).map(tag => `Nhóm: ${tag.slice(0, 60)}`),
  ].filter(Boolean);
  for (const name of names) {
    const id = tagId(name);
    const tag = await queryOne<{ id: string }>(
      `INSERT INTO crm_zalo_tags (id,name,color,source) VALUES ($1,$2,'#1677ff','crm')
       ON CONFLICT (LOWER(name),source) DO UPDATE SET name=EXCLUDED.name,updated_at=NOW() RETURNING id`, [id, name],
    );
    await query(
      `INSERT INTO crm_zalo_customer_tags (user_id,tag_id,source) VALUES ($1,$2,'crm') ON CONFLICT (user_id,tag_id) DO NOTHING`, [userId, tag?.id || id],
    );
  }
  return {
    campaignId: String(visit.campaign_id), campaignName: String(visit.name), productKey: String(visit.product_key || ""),
    welcomeMessage: String(visit.welcome_message || ""),
  };
}
