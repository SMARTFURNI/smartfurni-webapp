import "server-only";

import { createHash, randomUUID } from "crypto";
import { query, queryOne } from "@/lib/db";

export type ZaloGmfSourceLinkStatus = "active" | "paused";

export interface ZaloGmfSourceLink {
  id: string;
  groupId: string;
  groupName: string;
  slug: string;
  sourceName: string;
  channel: string;
  campaign: string;
  targetUrl: string;
  trackingUrl: string;
  status: ZaloGmfSourceLinkStatus;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  visits: number;
  uniqueVisitors: number;
  opens: number;
  identified: number;
  requests: number;
  approved: number;
  joined: number;
  left: number;
  conversionRate: number;
}

export interface ZaloGmfTrackingReport {
  range: { from: string; to: string };
  summary: {
    visits: number;
    uniqueVisitors: number;
    opens: number;
    identified: number;
    requests: number;
    approved: number;
    joined: number;
    left: number;
    verifiedJoined: number;
    unattributedJoined: number;
    conversionRate: number;
  };
  links: ZaloGmfSourceLink[];
}

export interface PublicZaloGmfSourceLink {
  id: string;
  slug: string;
  sourceName: string;
  channel: string;
  campaign: string;
  groupId: string;
  groupName: string;
  groupAvatar: string;
  groupDescription: string;
  targetUrl: string;
  oaId: string;
}

let schemaReady: Promise<void> | null = null;

export async function initZaloGmfAttributionSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = query(`
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_source_links (
        id TEXT PRIMARY KEY, group_id TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
        source_name TEXT NOT NULL, channel TEXT NOT NULL DEFAULT '', campaign TEXT NOT NULL DEFAULT '',
        target_url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', expires_at TIMESTAMPTZ,
        created_by TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_link_visits (
        id TEXT PRIMARY KEY, link_id TEXT NOT NULL REFERENCES crm_zalo_gmf_source_links(id) ON DELETE CASCADE,
        visitor_key TEXT NOT NULL, ip_hash TEXT NOT NULL DEFAULT '', user_agent TEXT NOT NULL DEFAULT '',
        referrer TEXT NOT NULL DEFAULT '', query_params JSONB NOT NULL DEFAULT '{}', oa_user_id TEXT NOT NULL DEFAULT '',
        identified_at TIMESTAMPTZ, opened_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_member_attributions (
        group_id TEXT NOT NULL, user_id TEXT NOT NULL,
        link_id TEXT REFERENCES crm_zalo_gmf_source_links(id) ON DELETE SET NULL,
        visit_id TEXT REFERENCES crm_zalo_gmf_link_visits(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'unattributed', confidence TEXT NOT NULL DEFAULT 'unattributed',
        requested_at TIMESTAMPTZ, approved_at TIMESTAMPTZ, joined_at TIMESTAMPTZ, left_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (group_id,user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_zalo_gmf_source_links_group ON crm_zalo_gmf_source_links(group_id,status,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_gmf_visits_link_time ON crm_zalo_gmf_link_visits(link_id,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_gmf_visits_user_time ON crm_zalo_gmf_link_visits(oa_user_id,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_gmf_attributions_link ON crm_zalo_gmf_member_attributions(link_id,joined_at DESC);
    `).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || "https://www.smartfurni.com.vn").replace(/\/$/, "");
}

function trackingUrl(slug: string): string {
  return `${siteOrigin()}/zalo-group/${encodeURIComponent(slug)}`;
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
  if ((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 > 365) throw new Error("Khoảng báo cáo tối đa là 366 ngày.");
  return { from, to };
}

function slugBase(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "nguon-zalo";
}

function nullableDate(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value);
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59+07:00` : raw);
  if (!Number.isFinite(parsed.getTime())) throw new Error("Ngày hết hạn không hợp lệ.");
  return parsed.toISOString();
}

export async function saveZaloGmfSourceLink(input: {
  id?: string; groupId: string; sourceName: string; channel?: string; campaign?: string;
  targetUrl?: string; expiresAt?: string | null;
}, actor: string): Promise<{ id: string; slug: string; trackingUrl: string }> {
  await initZaloGmfAttributionSchema();
  const sourceName = input.sourceName.trim();
  if (sourceName.length < 2 || sourceName.length > 100) throw new Error("Tên nguồn cần từ 2 đến 100 ký tự.");
  const group = await queryOne<{ group_id: string; group_link: string }>(
    `SELECT group_id,group_link FROM crm_zalo_gmf_groups WHERE group_id=$1`, [input.groupId],
  );
  if (!group) throw new Error("Nhóm Zalo không tồn tại trong CRM.");
  const targetUrl = String(input.targetUrl || group.group_link || "").trim();
  if (!/^https?:\/\//i.test(targetUrl)) throw new Error("Nhóm chưa có link mời hợp lệ từ Zalo.");
  const expiresAt = nullableDate(input.expiresAt);
  if (input.id) {
    const updated = await queryOne<{ id: string; slug: string }>(
      `UPDATE crm_zalo_gmf_source_links SET group_id=$2,source_name=$3,channel=$4,campaign=$5,target_url=$6,expires_at=$7,updated_at=NOW()
       WHERE id=$1 RETURNING id,slug`,
      [input.id, input.groupId, sourceName, String(input.channel || "").trim().slice(0, 80), String(input.campaign || "").trim().slice(0, 120), targetUrl, expiresAt],
    );
    if (!updated) throw new Error("Không tìm thấy link nguồn cần cập nhật.");
    return { id: updated.id, slug: updated.slug, trackingUrl: trackingUrl(updated.slug) };
  }
  const id = randomUUID();
  const slug = `${slugBase(sourceName)}-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
  await query(
    `INSERT INTO crm_zalo_gmf_source_links (id,group_id,slug,source_name,channel,campaign,target_url,expires_at,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, input.groupId, slug, sourceName, String(input.channel || "").trim().slice(0, 80), String(input.campaign || "").trim().slice(0, 120), targetUrl, expiresAt, actor],
  );
  return { id, slug, trackingUrl: trackingUrl(slug) };
}

export async function setZaloGmfSourceLinkStatus(id: string, status: ZaloGmfSourceLinkStatus): Promise<void> {
  await initZaloGmfAttributionSchema();
  if (!id || !["active", "paused"].includes(status)) throw new Error("Trạng thái link không hợp lệ.");
  const result = await queryOne<{ id: string }>(
    `UPDATE crm_zalo_gmf_source_links SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id`, [id, status],
  );
  if (!result) throw new Error("Không tìm thấy link nguồn.");
}

export async function getPublicZaloGmfSourceLink(slug: string): Promise<PublicZaloGmfSourceLink | null> {
  await initZaloGmfAttributionSchema();
  const row = await queryOne<Record<string, unknown>>(
    `SELECT l.*,g.name AS group_name,g.avatar AS group_avatar,g.description AS group_description,g.oa_id
     FROM crm_zalo_gmf_source_links l JOIN crm_zalo_gmf_groups g ON g.group_id=l.group_id
     WHERE l.slug=$1 AND l.status='active' AND (l.expires_at IS NULL OR l.expires_at>NOW()) AND g.status='enabled' LIMIT 1`, [slug],
  );
  if (!row) return null;
  return {
    id: String(row.id), slug: String(row.slug), sourceName: String(row.source_name), channel: String(row.channel || ""),
    campaign: String(row.campaign || ""), groupId: String(row.group_id), groupName: String(row.group_name),
    groupAvatar: String(row.group_avatar || ""), groupDescription: String(row.group_description || ""),
    targetUrl: String(row.target_url), oaId: String(row.oa_id || ""),
  };
}

export async function recordZaloGmfSourceVisit(slug: string, input: {
  visitorKey?: string; ip?: string; userAgent?: string; referrer?: string; queryParams?: Record<string, string>;
}): Promise<{ visitId: string; visitorKey: string; link: PublicZaloGmfSourceLink }> {
  const link = await getPublicZaloGmfSourceLink(slug);
  if (!link) throw new Error("Link tham gia nhóm không tồn tại hoặc đã hết hạn.");
  const visitId = randomUUID();
  const visitorKey = input.visitorKey || randomUUID();
  const recent = await queryOne<{ id: string }>(
    `SELECT v.id FROM crm_zalo_gmf_link_visits v WHERE v.link_id=$1 AND v.visitor_key=$2
     AND v.created_at>=NOW()-INTERVAL '30 minutes' ORDER BY v.created_at DESC LIMIT 1`, [link.id, visitorKey],
  );
  if (recent) return { visitId: recent.id, visitorKey, link };
  const salt = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "smartfurni-gmf";
  const ipHash = input.ip ? createHash("sha256").update(`${salt}:${vietnamDate()}:${input.ip}`).digest("hex") : "";
  await query(
    `INSERT INTO crm_zalo_gmf_link_visits (id,link_id,visitor_key,ip_hash,user_agent,referrer,query_params)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [visitId, link.id, visitorKey, ipHash, String(input.userAgent || "").slice(0, 500), String(input.referrer || "").slice(0, 500), JSON.stringify(input.queryParams || {})],
  );
  return { visitId, visitorKey, link };
}

async function attributeMemberEvent(groupId: string, userId: string, eventType: string, occurredAt: string) {
  const visit = await queryOne<{ id: string; link_id: string }>(
    `SELECT v.id,v.link_id FROM crm_zalo_gmf_link_visits v
     JOIN crm_zalo_gmf_source_links l ON l.id=v.link_id
     WHERE l.group_id=$1 AND v.oa_user_id=$2
       AND v.created_at >= $3::timestamptz-INTERVAL '7 days' AND v.created_at <= $3::timestamptz+INTERVAL '5 minutes'
     ORDER BY COALESCE(v.identified_at,v.created_at) DESC LIMIT 1`, [groupId, userId, occurredAt],
  );
  await query(
    `INSERT INTO crm_zalo_gmf_member_attributions
      (group_id,user_id,link_id,visit_id,status,confidence,requested_at,approved_at,joined_at,left_at)
     VALUES ($1,$2,$3,$4,$5,$6,
       CASE WHEN $5='requested' THEN $7::timestamptz END,
       CASE WHEN $5='approved' THEN $7::timestamptz END,
       CASE WHEN $5='joined' THEN $7::timestamptz END,
       CASE WHEN $5='left' THEN $7::timestamptz END)
     ON CONFLICT (group_id,user_id) DO UPDATE SET
       link_id=COALESCE(EXCLUDED.link_id,crm_zalo_gmf_member_attributions.link_id),
       visit_id=COALESCE(EXCLUDED.visit_id,crm_zalo_gmf_member_attributions.visit_id),
       status=EXCLUDED.status,
       confidence=CASE WHEN EXCLUDED.link_id IS NOT NULL THEN 'verified' ELSE crm_zalo_gmf_member_attributions.confidence END,
       requested_at=COALESCE(EXCLUDED.requested_at,crm_zalo_gmf_member_attributions.requested_at),
       approved_at=COALESCE(EXCLUDED.approved_at,crm_zalo_gmf_member_attributions.approved_at),
       joined_at=COALESCE(EXCLUDED.joined_at,crm_zalo_gmf_member_attributions.joined_at),
       left_at=COALESCE(EXCLUDED.left_at,crm_zalo_gmf_member_attributions.left_at),updated_at=NOW()`,
    [groupId, userId, visit?.link_id || null, visit?.id || null, eventType, visit ? "verified" : "unattributed", occurredAt],
  );
}

export async function recordZaloGmfAttributionEvent(groupId: string, userId: string, eventType: string, occurredAt: string): Promise<void> {
  await initZaloGmfAttributionSchema();
  if (!["requested", "approved", "joined", "left", "rejected"].includes(eventType)) return;
  await attributeMemberEvent(groupId, userId, eventType, occurredAt);
}

export async function identifyZaloGmfVisit(slug: string, visitId: string, userId: string): Promise<void> {
  await initZaloGmfAttributionSchema();
  const cleanUserId = userId.trim().slice(0, 200);
  if (!cleanUserId) throw new Error("Zalo UID không hợp lệ.");
  const visit = await queryOne<{ group_id: string }>(
    `UPDATE crm_zalo_gmf_link_visits v SET oa_user_id=$3,identified_at=NOW()
     FROM crm_zalo_gmf_source_links l WHERE v.id=$1 AND v.link_id=l.id AND l.slug=$2
     RETURNING l.group_id`, [visitId, slug, cleanUserId],
  );
  if (!visit) throw new Error("Lượt truy cập không hợp lệ.");
  const latest = await queryOne<{ event_type: string; occurred_at: string }>(
    `SELECT event_type,occurred_at FROM crm_zalo_gmf_member_events
     WHERE group_id=$1 AND user_id=$2 AND occurred_at>=NOW()-INTERVAL '7 days'
     ORDER BY occurred_at DESC LIMIT 1`, [visit.group_id, cleanUserId],
  );
  if (latest) await attributeMemberEvent(visit.group_id, cleanUserId, latest.event_type, String(latest.occurred_at));
}

export async function markZaloGmfVisitOpened(slug: string, visitId: string): Promise<void> {
  await initZaloGmfAttributionSchema();
  await query(
    `UPDATE crm_zalo_gmf_link_visits v SET opened_at=COALESCE(opened_at,NOW())
     FROM crm_zalo_gmf_source_links l WHERE v.id=$1 AND v.link_id=l.id AND l.slug=$2`, [visitId, slug],
  );
}

export async function getZaloGmfTrackingReport(input: { from?: string; to?: string } = {}): Promise<ZaloGmfTrackingReport> {
  await initZaloGmfAttributionSchema();
  const range = reportRange(input);
  const [linkRows, visitRows, attributionRows, joinedSummary] = await Promise.all([
    query<Record<string, unknown>>(
      `SELECT l.*,g.name AS group_name FROM crm_zalo_gmf_source_links l
       LEFT JOIN crm_zalo_gmf_groups g ON g.group_id=l.group_id ORDER BY l.created_at DESC`,
    ),
    query<Record<string, unknown>>(
      `SELECT link_id,COUNT(*)::int AS visits,COUNT(DISTINCT visitor_key)::int AS unique_visitors,
       COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opens,
       COUNT(*) FILTER (WHERE oa_user_id<>'')::int AS identified
       FROM crm_zalo_gmf_link_visits
       WHERE created_at>=($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
         AND created_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') GROUP BY link_id`, [range.from, range.to],
    ),
    query<Record<string, unknown>>(
      `SELECT link_id,
       COUNT(*) FILTER (WHERE requested_at>=($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND requested_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))::int AS requests,
       COUNT(*) FILTER (WHERE approved_at>=($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND approved_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))::int AS approved,
       COUNT(*) FILTER (WHERE joined_at>=($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND joined_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))::int AS joined,
       COUNT(*) FILTER (WHERE left_at>=($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND left_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))::int AS left
       FROM crm_zalo_gmf_member_attributions WHERE link_id IS NOT NULL GROUP BY link_id`, [range.from, range.to],
    ),
    queryOne<Record<string, unknown>>(
      `SELECT COUNT(*)::int AS joined,
       COUNT(*) FILTER (WHERE a.link_id IS NOT NULL AND a.confidence='verified')::int AS verified_joined,
       COUNT(*) FILTER (WHERE a.link_id IS NULL)::int AS unattributed_joined
       FROM crm_zalo_gmf_member_events e LEFT JOIN crm_zalo_gmf_member_attributions a ON a.group_id=e.group_id AND a.user_id=e.user_id
       WHERE e.event_type='joined' AND e.occurred_at>=($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
         AND e.occurred_at<(($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`, [range.from, range.to],
    ),
  ]);
  const visits = new Map(visitRows.map(row => [String(row.link_id), row]));
  const attributions = new Map(attributionRows.map(row => [String(row.link_id), row]));
  const links = linkRows.map((row): ZaloGmfSourceLink => {
    const visit = visits.get(String(row.id)) || {};
    const attribution = attributions.get(String(row.id)) || {};
    const visitCount = Number(visit.visits || 0);
    const joined = Number(attribution.joined || 0);
    return {
      id: String(row.id), groupId: String(row.group_id), groupName: String(row.group_name || "Nhóm Zalo"), slug: String(row.slug),
      sourceName: String(row.source_name), channel: String(row.channel || ""), campaign: String(row.campaign || ""),
      targetUrl: String(row.target_url), trackingUrl: trackingUrl(String(row.slug)), status: String(row.status) as ZaloGmfSourceLinkStatus,
      expiresAt: row.expires_at ? String(row.expires_at) : null, createdBy: String(row.created_by || ""), createdAt: String(row.created_at),
      visits: visitCount, uniqueVisitors: Number(visit.unique_visitors || 0), opens: Number(visit.opens || 0), identified: Number(visit.identified || 0),
      requests: Number(attribution.requests || 0), approved: Number(attribution.approved || 0), joined, left: Number(attribution.left || 0),
      conversionRate: visitCount ? Math.round(joined / visitCount * 10_000) / 100 : 0,
    };
  });
  const sum = (key: keyof ZaloGmfSourceLink) => links.reduce((total, link) => total + Number(link[key] || 0), 0);
  const totalVisits = sum("visits");
  const verifiedJoined = Number(joinedSummary?.verified_joined || 0);
  return {
    range,
    summary: {
      visits: totalVisits, uniqueVisitors: sum("uniqueVisitors"), opens: sum("opens"), identified: sum("identified"),
      requests: sum("requests"), approved: sum("approved"), joined: Number(joinedSummary?.joined || 0), left: sum("left"),
      verifiedJoined, unattributedJoined: Number(joinedSummary?.unattributed_joined || 0),
      conversionRate: totalVisits ? Math.round(verifiedJoined / totalVisits * 10_000) / 100 : 0,
    },
    links,
  };
}
