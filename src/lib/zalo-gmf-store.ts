import "server-only";

import { createHash, randomUUID } from "crypto";
import OpenAI from "openai";
import sharp from "sharp";
import { getDb, query, queryOne } from "@/lib/db";
import { getZaloOAConfig, refreshZaloOAAccessToken } from "@/lib/zalo-oa-store";
import { decodeImageDataUrl, generateBlogImageVariants, getImageGenerationErrorMessage } from "@/lib/openai-blog-images";
import { sanitizeMediaSegment, storeMediaObject } from "@/lib/media-storage";

export type ZaloGmfContentStatus = "draft" | "pending" | "approved" | "rejected";
export type ZaloGmfScheduleStatus = "pending" | "sending" | "sent" | "failed" | "cancelled";

let zaloTokenRefreshInFlight: Promise<{ ok: boolean; expiresIn?: number; error?: string }> | null = null;

export interface ZaloGmfSettings {
  autoPublish: boolean;
  requireApproval: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  maxPostsPerGroupDay: number;
  minPostIntervalMinutes: number;
  memberSyncIntervalMinutes: number;
  paused: boolean;
}

export interface ZaloGmfGroup {
  groupId: string;
  oaId: string;
  name: string;
  description: string;
  avatar: string;
  groupLink: string;
  status: string;
  assetType: string;
  assetId: string;
  totalMember: number;
  maxMember: number;
  validThrough: string;
  autoRenew: boolean;
  autoDeleteDate: string;
  groupSettings: Record<string, unknown>;
  tag: string;
  automationEnabled: boolean;
  lastSyncedAt: string | null;
  lastMemberSyncAt: string | null;
  lastPostAt: string | null;
  syncError: string;
  joined7d: number;
  left7d: number;
  pendingPosts: number;
}

export interface ZaloGmfMember {
  groupId: string;
  userId: string;
  memberType: string;
  name: string;
  avatar: string;
  status: string;
  joinedAt: string | null;
  leftAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface ZaloGmfMemberEvent {
  eventKey: string;
  groupId: string;
  groupName: string;
  userId: string;
  memberName: string;
  eventType: string;
  source: string;
  occurredAt: string;
}

export interface ZaloGmfContent {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  imagePrompt: string;
  linkUrl: string;
  objective: string;
  status: ZaloGmfContentStatus;
  version: number;
  targetGroupIds: string[];
  scheduledAt: string | null;
  aiModel: string;
  approvedBy: string;
  approvedAt: string | null;
  rejectedReason: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ZaloGmfSchedule {
  id: string;
  contentId: string;
  contentTitle: string;
  groupId: string;
  groupName: string;
  scheduledAt: string;
  status: ZaloGmfScheduleStatus;
  attempts: number;
  nextAttemptAt: string | null;
  messageId: string;
  error: string;
  sentAt: string | null;
  createdAt: string;
}

export interface ZaloGmfMemberReport {
  range: { from: string; to: string };
  todayJoined: number;
  yesterdayJoined: number;
  last7DaysJoined: number;
  selectedJoined: number;
  selectedLeft: number;
  selectedNet: number;
  daily: Array<{ date: string; joined: number; left: number; net: number }>;
  groups: Array<{ groupId: string; groupName: string; totalMember: number; joined: number; left: number; net: number }>;
}

export interface ZaloGmfDashboard {
  configured: boolean;
  settings: ZaloGmfSettings;
  stats: {
    groups: number;
    activeGroups: number;
    members: number;
    joined30d: number;
    left30d: number;
    pendingApproval: number;
    scheduled: number;
    sent30d: number;
    failed30d: number;
  };
  groups: ZaloGmfGroup[];
  members: ZaloGmfMember[];
  memberEvents: ZaloGmfMemberEvent[];
  memberReport: ZaloGmfMemberReport;
  contents: ZaloGmfContent[];
  schedules: ZaloGmfSchedule[];
}

let schemaReady: Promise<void> | null = null;

export async function initZaloGmfSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = query(`
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_settings (
        id TEXT PRIMARY KEY DEFAULT 'default', auto_publish BOOLEAN NOT NULL DEFAULT false,
        require_approval BOOLEAN NOT NULL DEFAULT true, business_hours_start TEXT NOT NULL DEFAULT '08:00',
        business_hours_end TEXT NOT NULL DEFAULT '20:00', max_posts_per_group_day INTEGER NOT NULL DEFAULT 3,
        min_post_interval_minutes INTEGER NOT NULL DEFAULT 30, member_sync_interval_minutes INTEGER NOT NULL DEFAULT 15,
        paused BOOLEAN NOT NULL DEFAULT false, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO crm_zalo_gmf_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_groups (
        group_id TEXT PRIMARY KEY, oa_id TEXT NOT NULL DEFAULT '', name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '', avatar TEXT NOT NULL DEFAULT '', group_link TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'enabled', asset_type TEXT NOT NULL DEFAULT '', asset_id TEXT NOT NULL DEFAULT '',
        total_member INTEGER NOT NULL DEFAULT 0, max_member INTEGER NOT NULL DEFAULT 0,
        valid_through TEXT NOT NULL DEFAULT '', auto_renew BOOLEAN NOT NULL DEFAULT false,
        auto_delete_date TEXT NOT NULL DEFAULT '', settings JSONB NOT NULL DEFAULT '{}', tag TEXT NOT NULL DEFAULT 'Cộng đồng',
        automation_enabled BOOLEAN NOT NULL DEFAULT true, last_synced_at TIMESTAMPTZ,
        last_member_sync_at TIMESTAMPTZ, last_post_at TIMESTAMPTZ, sync_error TEXT NOT NULL DEFAULT '',
        raw_payload JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_members (
        group_id TEXT NOT NULL REFERENCES crm_zalo_gmf_groups(group_id) ON DELETE CASCADE, user_id TEXT NOT NULL,
        member_type TEXT NOT NULL DEFAULT 'user', name TEXT NOT NULL DEFAULT 'Thành viên Zalo', avatar TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active', joined_at TIMESTAMPTZ, left_at TIMESTAMPTZ,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (group_id,user_id)
      );
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_member_events (
        event_key TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES crm_zalo_gmf_groups(group_id) ON DELETE CASCADE,
        user_id TEXT NOT NULL, event_type TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'webhook',
        occurred_at TIMESTAMPTZ NOT NULL, payload JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_contents (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, image_url TEXT NOT NULL DEFAULT '',
        image_prompt TEXT NOT NULL DEFAULT '', link_url TEXT NOT NULL DEFAULT '', objective TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1, target_group_ids JSONB NOT NULL DEFAULT '[]',
        scheduled_at TIMESTAMPTZ, ai_model TEXT NOT NULL DEFAULT '', approved_by TEXT NOT NULL DEFAULT '',
        approved_at TIMESTAMPTZ, rejected_reason TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_schedules (
        id TEXT PRIMARY KEY, content_id TEXT NOT NULL REFERENCES crm_zalo_gmf_contents(id) ON DELETE CASCADE,
        group_id TEXT NOT NULL REFERENCES crm_zalo_gmf_groups(group_id) ON DELETE CASCADE,
        scheduled_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TIMESTAMPTZ, idempotency_key TEXT NOT NULL UNIQUE, content_version INTEGER NOT NULL DEFAULT 1,
        message_id TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '', payload JSONB NOT NULL DEFAULT '{}',
        claimed_at TIMESTAMPTZ, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS crm_zalo_gmf_webhook_receipts (
        event_key TEXT PRIMARY KEY, event_name TEXT NOT NULL, group_id TEXT NOT NULL DEFAULT '',
        signature_valid BOOLEAN NOT NULL DEFAULT true, processed BOOLEAN NOT NULL DEFAULT false,
        error TEXT NOT NULL DEFAULT '', payload JSONB NOT NULL DEFAULT '{}', received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_zalo_gmf_members_status ON crm_zalo_gmf_members(group_id,status,last_seen_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_gmf_member_events_time ON crm_zalo_gmf_member_events(group_id,occurred_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_gmf_contents_status ON crm_zalo_gmf_contents(status,created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_zalo_gmf_schedules_due ON crm_zalo_gmf_schedules(status,COALESCE(next_attempt_at,scheduled_at));
    `).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
  }
  return [];
}

function eventDate(value: unknown): string {
  const numeric = Number(value);
  const date = Number.isFinite(numeric) && numeric > 0
    ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : new Date(String(value || ""));
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function absoluteSiteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || "https://www.smartfurni.com.vn";
  return new URL(path, base).toString();
}

function isExpiredZaloToken(body: Record<string, unknown>): boolean {
  const message = String(body.message || "");
  const code = Number(body.error || 0);
  return code === -201 || /access\s*token.*expired|token.*expired|access\s*token.*hết hạn|token.*hết hạn/i.test(message);
}

function humanizeZaloGmfError(message: string): string {
  if (/personal information is limited due to ip address not inside vietnam/i.test(message)) {
    return "Nhóm đã đồng bộ; Zalo tạm giới hạn hồ sơ thành viên vì máy chủ Railway đặt ngoài Việt Nam. Tổng thành viên và biến động webhook vẫn được ghi nhận.";
  }
  return message;
}

async function refreshExpiredZaloToken() {
  if (!zaloTokenRefreshInFlight) {
    zaloTokenRefreshInFlight = refreshZaloOAAccessToken().finally(() => {
      zaloTokenRefreshInFlight = null;
    });
  }
  return zaloTokenRefreshInFlight;
}

async function zaloRequest(url: URL | string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const config = await getZaloOAConfig();
    if (!config.isActive || !config.accessToken) throw new Error("Zalo OA chưa kích hoạt hoặc thiếu Access Token.");
    const response = await fetch(url, {
      ...init,
      headers: {
        access_token: config.accessToken,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (response.ok && Number(body.error || 0) === 0) return body;
    if (attempt === 0 && isExpiredZaloToken(body) && config.refreshToken) {
      const refreshed = await refreshExpiredZaloToken();
      if (refreshed.ok) continue;
      throw new Error(`Access Token Zalo đã hết hạn và không thể tự gia hạn: ${refreshed.error || "Refresh Token không hợp lệ."}`);
    }
    throw new Error(humanizeZaloGmfError(String(body.message || `Zalo GMF HTTP ${response.status}`)));
  }
  throw new Error("Không thể gọi Zalo GMF OpenAPI sau khi gia hạn token.");
}

async function listRemoteGroups(): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const count = 50;
  for (let offset = 0; offset < 1_000; offset += count) {
    const url = new URL("https://openapi.zalo.me/v3.0/oa/group/getgroupsofoa");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("count", String(count));
    const body = await zaloRequest(url);
    const data = record(body.data);
    const page = records(data.groups);
    all.push(...page);
    const total = Number(data.total || all.length);
    if (page.length < count || all.length >= total) break;
  }
  return all;
}

async function getRemoteGroup(groupId: string): Promise<Record<string, unknown>> {
  const url = new URL("https://openapi.zalo.me/v3.0/oa/group/getgroup");
  url.searchParams.set("group_id", groupId);
  const body = await zaloRequest(url);
  return record(body.data);
}

async function upsertGroup(item: Record<string, unknown>, detail: Record<string, unknown> = {}): Promise<void> {
  const groupInfo = { ...item, ...record(detail.group_info) };
  const assetInfo = record(detail.asset_info);
  const groupSettings = record(detail.group_setting);
  const config = await getZaloOAConfig();
  const groupId = String(groupInfo.group_id || "").trim();
  if (!groupId) return;
  await query(
    `INSERT INTO crm_zalo_gmf_groups
      (group_id,oa_id,name,description,avatar,group_link,status,asset_type,asset_id,total_member,max_member,
       valid_through,auto_renew,auto_delete_date,settings,last_synced_at,sync_error,raw_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,NOW(),'',$16::jsonb)
     ON CONFLICT (group_id) DO UPDATE SET oa_id=EXCLUDED.oa_id,name=EXCLUDED.name,description=EXCLUDED.description,
       avatar=EXCLUDED.avatar,group_link=EXCLUDED.group_link,status=EXCLUDED.status,asset_type=EXCLUDED.asset_type,
       asset_id=EXCLUDED.asset_id,total_member=EXCLUDED.total_member,max_member=EXCLUDED.max_member,
       valid_through=EXCLUDED.valid_through,auto_renew=EXCLUDED.auto_renew,auto_delete_date=EXCLUDED.auto_delete_date,
       settings=EXCLUDED.settings,last_synced_at=NOW(),sync_error='',raw_payload=EXCLUDED.raw_payload,updated_at=NOW()`,
    [
      groupId, config.oaId, String(groupInfo.name || "Nhóm GMF"), String(groupInfo.group_description || ""),
      String(groupInfo.avatar || ""), String(groupInfo.group_link || ""), String(groupInfo.status || "enabled"),
      String(assetInfo.asset_type || ""), String(assetInfo.asset_id || ""), Number(groupInfo.total_member || 0),
      Number(groupInfo.max_member || 0), String(assetInfo.valid_through || ""), String(assetInfo.auto_renew) === "true" || assetInfo.auto_renew === true,
      String(groupInfo.auto_delete_date || ""), JSON.stringify(groupSettings), JSON.stringify({ list: item, detail }),
    ],
  );
}

export async function syncZaloGmfGroups(options: { syncMembers?: boolean } = {}): Promise<{ groups: number; members: number; warnings: string[] }> {
  await initZaloGmfSchema();
  const warnings: string[] = [];
  const remote = await listRemoteGroups();
  let memberCount = 0;
  for (const item of remote) {
    const groupId = String(item.group_id || "");
    try {
      // Keep the group visible even when the detail endpoint is temporarily unavailable.
      await upsertGroup(item);
      const detail = groupId ? await getRemoteGroup(groupId) : {};
      await upsertGroup(item, detail);
      if (options.syncMembers !== false && groupId) {
        const result = await syncZaloGmfMembers(groupId);
        memberCount += result.active;
      }
    } catch (error) {
      const message = humanizeZaloGmfError(error instanceof Error ? error.message : "Không đồng bộ được nhóm");
      warnings.push(`${String(item.name || groupId)}: ${message}`);
      if (groupId) await query(`UPDATE crm_zalo_gmf_groups SET sync_error=$2,updated_at=NOW() WHERE group_id=$1`, [groupId, message.slice(0, 300)]);
    }
  }
  return { groups: remote.length, members: memberCount, warnings };
}

async function listRemoteMembers(groupId: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const count = 50;
  for (let offset = 0; offset < 5_000; offset += count) {
    const url = new URL("https://openapi.zalo.me/v3.0/oa/group/listmember");
    url.searchParams.set("group_id", groupId);
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("count", String(count));
    const body = await zaloRequest(url);
    const data = record(body.data);
    const page = records(data.members);
    all.push(...page);
    const total = Number(data.total || all.length);
    if (page.length < count || all.length >= total) break;
  }
  return all;
}

function memberEventKey(groupId: string, userId: string, type: string, at: string, source: string) {
  return createHash("sha256").update(`${groupId}:${userId}:${type}:${at}:${source}`).digest("hex");
}

async function addMemberEvent(groupId: string, userId: string, eventType: string, at: string, source: string, payload: Record<string, unknown>) {
  await query(
    `INSERT INTO crm_zalo_gmf_member_events (event_key,group_id,user_id,event_type,source,occurred_at,payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT (event_key) DO NOTHING`,
    [memberEventKey(groupId, userId, eventType, at, source), groupId, userId, eventType, source, at, JSON.stringify(payload)],
  );
}

export async function syncZaloGmfMembers(groupId: string): Promise<{ active: number; joined: number; left: number }> {
  await initZaloGmfSchema();
  const group = await queryOne<{ last_member_sync_at: string | null }>(`SELECT last_member_sync_at FROM crm_zalo_gmf_groups WHERE group_id=$1`, [groupId]);
  if (!group) throw new Error("Nhóm GMF chưa được đồng bộ.");
  const baseline = !group.last_member_sync_at;
  const remote = await listRemoteMembers(groupId);
  const activeIds = new Set<string>();
  let joined = 0;
  for (const item of remote) {
    const userId = String(item.user_id || item.oa_id || "").trim();
    if (!userId) continue;
    activeIds.add(userId);
    const previous = await queryOne<{ status: string }>(`SELECT status FROM crm_zalo_gmf_members WHERE group_id=$1 AND user_id=$2`, [groupId, userId]);
    const now = new Date().toISOString();
    await query(
      `INSERT INTO crm_zalo_gmf_members
        (group_id,user_id,member_type,name,avatar,status,joined_at,first_seen_at,last_seen_at)
       VALUES ($1,$2,$3,$4,$5,'active',$6,$6,$6)
       ON CONFLICT (group_id,user_id) DO UPDATE SET member_type=EXCLUDED.member_type,name=EXCLUDED.name,
         avatar=EXCLUDED.avatar,status='active',left_at=NULL,last_seen_at=NOW(),
         joined_at=CASE WHEN crm_zalo_gmf_members.status<>'active' THEN NOW() ELSE crm_zalo_gmf_members.joined_at END,updated_at=NOW()`,
      [groupId, userId, item.oa_id ? "oa" : "user", String(item.name || "Thành viên Zalo"), String(item.avatar || ""), now],
    );
    if (!baseline && (!previous || previous.status !== "active")) {
      joined += 1;
      await addMemberEvent(groupId, userId, "joined", now, "reconciliation", item);
    }
  }
  const current = await query<{ user_id: string }>(`SELECT user_id FROM crm_zalo_gmf_members WHERE group_id=$1 AND status='active'`, [groupId]);
  let left = 0;
  const now = new Date().toISOString();
  for (const member of current) {
    if (activeIds.has(member.user_id)) continue;
    left += 1;
    await query(`UPDATE crm_zalo_gmf_members SET status='left',left_at=$3,updated_at=NOW() WHERE group_id=$1 AND user_id=$2`, [groupId, member.user_id, now]);
    if (!baseline) await addMemberEvent(groupId, member.user_id, "left", now, "reconciliation", {});
  }
  await query(
    `UPDATE crm_zalo_gmf_groups SET total_member=$2,last_member_sync_at=NOW(),sync_error='',updated_at=NOW() WHERE group_id=$1`,
    [groupId, activeIds.size],
  );
  return { active: activeIds.size, joined, left };
}

function mapSettings(row?: Record<string, unknown> | null): ZaloGmfSettings {
  return {
    autoPublish: Boolean(row?.auto_publish), requireApproval: row?.require_approval !== false,
    businessHoursStart: String(row?.business_hours_start || "08:00"), businessHoursEnd: String(row?.business_hours_end || "20:00"),
    maxPostsPerGroupDay: Number(row?.max_posts_per_group_day || 3), minPostIntervalMinutes: Number(row?.min_post_interval_minutes || 30),
    memberSyncIntervalMinutes: Number(row?.member_sync_interval_minutes || 15), paused: Boolean(row?.paused),
  };
}

export async function saveZaloGmfSettings(input: Partial<ZaloGmfSettings>): Promise<ZaloGmfSettings> {
  await initZaloGmfSchema();
  const current = mapSettings(await queryOne<Record<string, unknown>>(`SELECT * FROM crm_zalo_gmf_settings WHERE id='default'`));
  // Publishing always remains approval-gated. This is a server-side invariant,
  // not merely a UI preference that can be bypassed by a crafted request.
  const next = { ...current, ...input, requireApproval: true };
  await query(
    `UPDATE crm_zalo_gmf_settings SET auto_publish=$1,require_approval=$2,business_hours_start=$3,business_hours_end=$4,
     max_posts_per_group_day=$5,min_post_interval_minutes=$6,member_sync_interval_minutes=$7,paused=$8,updated_at=NOW() WHERE id='default'`,
    [next.autoPublish, next.requireApproval, next.businessHoursStart, next.businessHoursEnd,
      Math.max(1, Math.min(20, Number(next.maxPostsPerGroupDay))), Math.max(5, Math.min(1440, Number(next.minPostIntervalMinutes))),
      Math.max(5, Math.min(1440, Number(next.memberSyncIntervalMinutes))), next.paused],
  );
  return next;
}

export async function saveZaloGmfGroupPreferences(groupId: string, input: { tag?: string; automationEnabled?: boolean }): Promise<void> {
  await initZaloGmfSchema();
  await query(
    `UPDATE crm_zalo_gmf_groups SET tag=COALESCE(NULLIF($2,''),tag),automation_enabled=COALESCE($3,automation_enabled),updated_at=NOW() WHERE group_id=$1`,
    [groupId, input.tag || "", input.automationEnabled ?? null],
  );
}

function mapContent(row: Record<string, unknown>): ZaloGmfContent {
  return {
    id: String(row.id), title: String(row.title), body: String(row.body), imageUrl: String(row.image_url || ""),
    imagePrompt: String(row.image_prompt || ""), linkUrl: String(row.link_url || ""), objective: String(row.objective || ""),
    status: String(row.status) as ZaloGmfContentStatus, version: Number(row.version || 1), targetGroupIds: strings(row.target_group_ids),
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null, aiModel: String(row.ai_model || ""), approvedBy: String(row.approved_by || ""),
    approvedAt: row.approved_at ? String(row.approved_at) : null, rejectedReason: String(row.rejected_reason || ""),
    createdBy: String(row.created_by || ""), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function saveZaloGmfContent(input: Partial<ZaloGmfContent> & { title: string; body: string }, actor: string): Promise<ZaloGmfContent> {
  await initZaloGmfSchema();
  if (!input.title.trim() || !input.body.trim()) throw new Error("Tiêu đề và nội dung bài là bắt buộc.");
  const id = input.id || `gmfc-${randomUUID()}`;
  const existing = input.id ? await queryOne<Record<string, unknown>>(`SELECT * FROM crm_zalo_gmf_contents WHERE id=$1`, [input.id]) : null;
  const nextVersion = existing ? Number(existing.version || 1) + 1 : 1;
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO crm_zalo_gmf_contents
      (id,title,body,image_url,image_prompt,link_url,objective,status,version,target_group_ids,scheduled_at,ai_model,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9::jsonb,$10,$11,$12)
     ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,image_url=EXCLUDED.image_url,
       image_prompt=EXCLUDED.image_prompt,link_url=EXCLUDED.link_url,objective=EXCLUDED.objective,status='draft',
       version=EXCLUDED.version,target_group_ids=EXCLUDED.target_group_ids,scheduled_at=EXCLUDED.scheduled_at,
       approved_by='',approved_at=NULL,rejected_reason='',updated_at=NOW() RETURNING *`,
    [id, input.title.trim(), input.body.trim(), input.imageUrl || "", input.imagePrompt || "", input.linkUrl || "",
      input.objective || "", nextVersion, JSON.stringify(input.targetGroupIds || []), input.scheduledAt || null, input.aiModel || "", actor],
  );
  return mapContent(rows[0]);
}

export async function generateZaloGmfContent(input: { objective: string; groupIds: string[]; linkUrl?: string }, actor: string): Promise<ZaloGmfContent> {
  await initZaloGmfSchema();
  const objective = input.objective.trim();
  if (!objective) throw new Error("Hãy nhập mục tiêu nội dung cần AI thực hiện.");
  const config = await getZaloOAConfig();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY chưa được cấu hình trên Railway.");
  const groups = input.groupIds.length
    ? await query<Record<string, unknown>>(`SELECT name,description,tag,total_member FROM crm_zalo_gmf_groups WHERE group_id=ANY($1::text[])`, [input.groupIds])
    : [];
  let products: Record<string, unknown>[] = [];
  try { products = await query<Record<string, unknown>>(`SELECT id,data FROM crm_products ORDER BY updated_at DESC NULLS LAST LIMIT 8`); } catch { products = []; }
  const client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 2 });
  const response = await client.chat.completions.create({
    model: config.aiModel || "gpt-5.6-terra", response_format: { type: "json_object" }, max_completion_tokens: 1800,
    messages: [
      { role: "system", content: "Bạn là Content Strategist cho cộng đồng Zalo GMF của SmartFurni. Viết tiếng Việt tự nhiên, hữu ích, không spam, không bịa giá/chính sách. Nội dung phù hợp nhóm cộng đồng, tối đa 1800 ký tự, có mở bài, giá trị thực tế và CTA mềm. Chỉ trả JSON {title,body,imagePrompt}. imagePrompt mô tả ảnh nội thất cao cấp 16:9, không chữ, không logo giả." },
      { role: "user", content: JSON.stringify({ objective, targetGroups: groups, products: products.map(item => item.data).slice(0, 8) }) },
    ],
  });
  let generated: Record<string, unknown> = {};
  try { generated = JSON.parse(response.choices[0]?.message?.content || "{}") as Record<string, unknown>; } catch { generated = {}; }
  return saveZaloGmfContent({
    title: String(generated.title || objective).slice(0, 180), body: String(generated.body || "").trim(),
    imagePrompt: String(generated.imagePrompt || "Không gian nội thất SmartFurni hiện đại, ánh sáng tự nhiên, ảnh ngang 16:9, không chữ"),
    objective, targetGroupIds: input.groupIds, linkUrl: input.linkUrl || "", aiModel: config.aiModel,
  }, actor);
}

async function optimizeZaloImage(dataUrl: string): Promise<Buffer> {
  const source = decodeImageDataUrl(dataUrl);
  for (const quality of [82, 74, 66, 58]) {
    const output = await sharp(source).rotate().resize(1280, 720, { fit: "cover", position: "attention" }).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (output.length <= 950_000) return output;
  }
  throw new Error("Ảnh sau tối ưu vẫn vượt giới hạn 1 MB của Zalo GMF.");
}

export async function generateZaloGmfContentImage(contentId: string, actor: string): Promise<ZaloGmfContent> {
  await initZaloGmfSchema();
  const content = await queryOne<Record<string, unknown>>(`SELECT * FROM crm_zalo_gmf_contents WHERE id=$1`, [contentId]);
  if (!content) throw new Error("Không tìm thấy nội dung để tạo ảnh.");
  const prompt = String(content.image_prompt || "").trim() || `Ảnh nội thất SmartFurni minh họa cho: ${String(content.title)}. Bố cục 16:9, không chữ, không watermark.`;
  try {
    const generated = await generateBlogImageVariants({ prompt, aspectRatio: "16:9", variantCount: 1 });
    const image = generated.variants[0];
    if (!image) throw new Error("OpenAI không trả về ảnh.");
    const buffer = await optimizeZaloImage(image.dataUrl);
    const key = `public/social-scheduler/zalo-gmf/${sanitizeMediaSegment(contentId)}-${Date.now()}.jpg`;
    const stored = await storeMediaObject({
      body: buffer, key, contentType: "image/jpeg", visibility: "public", originalName: `${contentId}.jpg`,
      entityType: "zalo-gmf-content", entityId: contentId, createdBy: actor,
    });
    const rows = await query<Record<string, unknown>>(
      `UPDATE crm_zalo_gmf_contents SET image_url=$2,updated_at=NOW() WHERE id=$1 RETURNING *`,
      [contentId, absoluteSiteUrl(stored.url)],
    );
    return mapContent(rows[0]);
  } catch (error) {
    throw new Error(getImageGenerationErrorMessage(error));
  }
}

export async function reviewZaloGmfContent(contentId: string, decision: "approve" | "reject", actor: string, reason = ""): Promise<ZaloGmfContent> {
  await initZaloGmfSchema();
  const rows = await query<Record<string, unknown>>(
    `UPDATE crm_zalo_gmf_contents SET status=$2,approved_by=CASE WHEN $2='approved' THEN $3 ELSE '' END,
     approved_at=CASE WHEN $2='approved' THEN NOW() ELSE NULL END,rejected_reason=CASE WHEN $2='rejected' THEN $4 ELSE '' END,updated_at=NOW()
     WHERE id=$1 AND status IN ('draft','pending','rejected') RETURNING *`,
    [contentId, decision === "approve" ? "approved" : "rejected", actor, reason.slice(0, 500)],
  );
  if (!rows[0]) throw new Error("Nội dung không tồn tại hoặc đã được xử lý.");
  return mapContent(rows[0]);
}

export async function scheduleZaloGmfContent(input: { contentId: string; groupIds: string[]; scheduledAt: string }): Promise<{ created: number }> {
  await initZaloGmfSchema();
  const content = await queryOne<Record<string, unknown>>(`SELECT * FROM crm_zalo_gmf_contents WHERE id=$1`, [input.contentId]);
  if (!content) throw new Error("Không tìm thấy nội dung.");
  if (String(content.status) !== "approved") throw new Error("Nội dung phải được duyệt trước khi lên lịch.");
  const scheduled = new Date(input.scheduledAt);
  if (!Number.isFinite(scheduled.getTime())) throw new Error("Thời gian đăng không hợp lệ.");
  const groupIds = Array.from(new Set(input.groupIds.filter(Boolean)));
  if (!groupIds.length) throw new Error("Hãy chọn ít nhất một nhóm GMF.");
  const groups = await query<{ group_id: string; status: string; automation_enabled: boolean }>(
    `SELECT group_id,status,automation_enabled FROM crm_zalo_gmf_groups WHERE group_id=ANY($1::text[])`, [groupIds],
  );
  const valid = groups.filter(group => group.status === "enabled" && group.automation_enabled).map(group => group.group_id);
  if (!valid.length) throw new Error("Không có nhóm GMF đang hoạt động và được phép tự động hóa.");
  let created = 0;
  const payload = {
    text: String(content.body), imageUrl: String(content.image_url || ""), linkUrl: String(content.link_url || ""),
    title: String(content.title), version: Number(content.version || 1),
  };
  for (const groupId of valid) {
    const key = createHash("sha256").update(`${content.id}:${content.version}:${groupId}:${scheduled.toISOString()}`).digest("hex");
    const rows = await query<{ id: string }>(
      `INSERT INTO crm_zalo_gmf_schedules
        (id,content_id,group_id,scheduled_at,status,idempotency_key,content_version,payload)
       VALUES ($1,$2,$3,$4,'pending',$5,$6,$7::jsonb) ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
      [`gmfs-${randomUUID()}`, content.id, groupId, scheduled.toISOString(), key, Number(content.version || 1), JSON.stringify(payload)],
    );
    created += rows.length;
  }
  await query(`UPDATE crm_zalo_gmf_contents SET scheduled_at=$2,target_group_ids=$3::jsonb,updated_at=NOW() WHERE id=$1`, [content.id, scheduled.toISOString(), JSON.stringify(valid)]);
  return { created };
}

export async function cancelZaloGmfSchedule(id: string): Promise<void> {
  await initZaloGmfSchema();
  await query(`UPDATE crm_zalo_gmf_schedules SET status='cancelled',updated_at=NOW() WHERE id=$1 AND status IN ('pending','failed')`, [id]);
}

export async function retryZaloGmfSchedule(id: string): Promise<void> {
  await initZaloGmfSchema();
  await query(`UPDATE crm_zalo_gmf_schedules SET status='pending',next_attempt_at=NOW(),error='',updated_at=NOW() WHERE id=$1 AND status='failed'`, [id]);
}

async function sendGroupMessage(groupId: string, payload: Record<string, unknown>): Promise<string> {
  const text = [String(payload.text || "").trim(), String(payload.linkUrl || "").trim()].filter(Boolean).join("\n\n").slice(0, 2_000);
  const imageUrl = String(payload.imageUrl || "").trim();
  const message: Record<string, unknown> = imageUrl ? {
    text,
    attachment: { type: "template", payload: { template_type: "media", elements: [{ media_type: "image", url: absoluteSiteUrl(imageUrl) }] } },
  } : { text };
  const body = await zaloRequest("https://openapi.zalo.me/v3.0/oa/group/message", {
    method: "POST", body: JSON.stringify({ recipient: { group_id: groupId }, message }),
  });
  return String(record(body.data).message_id || "");
}

function vnMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function timeMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return Math.max(0, Math.min(1439, (hour || 0) * 60 + (minute || 0)));
}

export async function processDueZaloGmfSchedules(limit = 10): Promise<{ claimed: number; sent: number; failed: number; deferred: number; skipped?: string }> {
  await initZaloGmfSchema();
  const settings = mapSettings(await queryOne<Record<string, unknown>>(`SELECT * FROM crm_zalo_gmf_settings WHERE id='default'`));
  if (settings.paused) return { claimed: 0, sent: 0, failed: 0, deferred: 0, skipped: "paused" };
  const nowMinutes = vnMinutes();
  const start = timeMinutes(settings.businessHoursStart);
  const end = timeMinutes(settings.businessHoursEnd);
  if (nowMinutes < start || nowMinutes > end) return { claimed: 0, sent: 0, failed: 0, deferred: 0, skipped: "outside_business_hours" };
  const pool = getDb();
  const client = await pool.connect();
  let claimed: Array<{ id: string; group_id: string; payload: Record<string, unknown>; attempts: number }> = [];
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE crm_zalo_gmf_schedules SET status='pending',claimed_at=NULL,updated_at=NOW() WHERE status='sending' AND claimed_at<NOW()-INTERVAL '10 minutes'`);
    const result = await client.query(
      `SELECT s.id,s.group_id,s.payload,s.attempts FROM crm_zalo_gmf_schedules s
       JOIN crm_zalo_gmf_groups g ON g.group_id=s.group_id
       WHERE s.status='pending' AND COALESCE(s.next_attempt_at,s.scheduled_at)<=NOW()
         AND g.status='enabled' AND g.automation_enabled=true
       ORDER BY COALESCE(s.next_attempt_at,s.scheduled_at) ASC FOR UPDATE OF s SKIP LOCKED LIMIT $1`,
      [Math.max(1, Math.min(50, limit))],
    );
    claimed = result.rows;
    if (claimed.length) {
      await client.query(`UPDATE crm_zalo_gmf_schedules SET status='sending',claimed_at=NOW(),attempts=attempts+1,updated_at=NOW() WHERE id=ANY($1::text[])`, [claimed.map(item => item.id)]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }

  let sent = 0;
  let failed = 0;
  let deferred = 0;
  for (const job of claimed) {
    try {
      const sentToday = await queryOne<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM crm_zalo_gmf_schedules
         WHERE group_id=$1 AND status='sent'
           AND sent_at >= (date_trunc('day',NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh')`, [job.group_id],
      );
      const last = await queryOne<{ sent_at: string }>(
        `SELECT sent_at FROM crm_zalo_gmf_schedules WHERE group_id=$1 AND status='sent' ORDER BY sent_at DESC LIMIT 1`, [job.group_id],
      );
      const tooSoon = last?.sent_at && Date.now() - new Date(last.sent_at).getTime() < settings.minPostIntervalMinutes * 60_000;
      if (Number(sentToday?.count || 0) >= settings.maxPostsPerGroupDay || tooSoon) {
        const next = tooSoon ? new Date(new Date(last!.sent_at).getTime() + settings.minPostIntervalMinutes * 60_000) : new Date(Date.now() + 24 * 60 * 60_000);
        await query(`UPDATE crm_zalo_gmf_schedules SET status='pending',next_attempt_at=$2,claimed_at=NULL,error='Hoãn theo giới hạn tần suất',updated_at=NOW() WHERE id=$1`, [job.id, next.toISOString()]);
        deferred += 1;
        continue;
      }
      const messageId = await sendGroupMessage(job.group_id, record(job.payload));
      await query(
        `UPDATE crm_zalo_gmf_schedules SET status='sent',message_id=$2,sent_at=NOW(),claimed_at=NULL,error='',updated_at=NOW() WHERE id=$1`,
        [job.id, messageId],
      );
      await query(`UPDATE crm_zalo_gmf_groups SET last_post_at=NOW(),updated_at=NOW() WHERE group_id=$1`, [job.group_id]);
      sent += 1;
    } catch (error) {
      const attempts = Number(job.attempts || 0) + 1;
      const terminal = attempts >= 5;
      const next = new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000).toISOString();
      await query(
        `UPDATE crm_zalo_gmf_schedules SET status=$2,next_attempt_at=CASE WHEN $2='failed' THEN NULL ELSE $3::timestamptz END,
         claimed_at=NULL,error=$4,updated_at=NOW() WHERE id=$1`,
        [job.id, terminal ? "failed" : "pending", next, (error instanceof Error ? error.message : "Lỗi gửi GMF").slice(0, 500)],
      );
      failed += 1;
    }
  }
  return { claimed: claimed.length, sent, failed, deferred };
}

export async function recordZaloGmfWebhookEvent(payload: Record<string, unknown>): Promise<{ handled: boolean }> {
  await initZaloGmfSchema();
  const eventName = String(payload.event_name || "");
  const groupId = String(payload.group_id || "");
  const supported = new Set(["user_join_group", "user_out_group", "accept_request_join_group", "reject_request_join_group", "create_group", "update_group_info", "delete_group"]);
  if (!supported.has(eventName) || !groupId) return { handled: false };
  const at = eventDate(payload.timestamp);
  const users = records(payload.users);
  const receiptKey = createHash("sha256").update(JSON.stringify({ eventName, groupId, timestamp: payload.timestamp, users })).digest("hex");
  const existingReceipt = await queryOne<{ processed: boolean }>(
    `SELECT processed FROM crm_zalo_gmf_webhook_receipts WHERE event_key=$1`,
    [receiptKey],
  );
  if (existingReceipt?.processed) return { handled: true };
  const existingGroup = await queryOne<{ group_id: string }>(`SELECT group_id FROM crm_zalo_gmf_groups WHERE group_id=$1`, [groupId]);
  if (!existingGroup) {
    try { await upsertGroup({ group_id: groupId, name: "Nhóm GMF" }, await getRemoteGroup(groupId)); }
    catch {
      await upsertGroup({ group_id: groupId, name: "Nhóm GMF", status: "enabled" });
    }
  }
  await query(
     `INSERT INTO crm_zalo_gmf_webhook_receipts (event_key,event_name,group_id,payload)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (event_key) DO UPDATE SET payload=EXCLUDED.payload,error=''`,
    [receiptKey, eventName, groupId, JSON.stringify(payload)],
  );
  if (eventName === "delete_group") {
    await query(`UPDATE crm_zalo_gmf_groups SET status='disabled',automation_enabled=false,updated_at=NOW() WHERE group_id=$1`, [groupId]);
  } else if (eventName === "create_group" || eventName === "update_group_info") {
    try { await upsertGroup(record(payload.group_info || payload), await getRemoteGroup(groupId)); } catch { /* cron reconciliation will retry */ }
  }
  for (const user of users) {
    const userId = String(user.id || user.user_id || "");
    if (!userId) continue;
    const type = eventName === "user_join_group" ? "joined" : eventName === "user_out_group" ? "left" : eventName === "accept_request_join_group" ? "approved" : "rejected";
    await addMemberEvent(groupId, userId, type, at, "webhook", payload);
    if (type === "joined") {
      await query(
        `INSERT INTO crm_zalo_gmf_members (group_id,user_id,status,joined_at,first_seen_at,last_seen_at)
         VALUES ($1,$2,'active',$3,$3,$3) ON CONFLICT (group_id,user_id) DO UPDATE SET status='active',joined_at=$3,left_at=NULL,last_seen_at=$3,updated_at=NOW()`,
        [groupId, userId, at],
      );
    } else if (type === "left") {
      await query(`UPDATE crm_zalo_gmf_members SET status='left',left_at=$3,updated_at=NOW() WHERE group_id=$1 AND user_id=$2`, [groupId, userId, at]);
    }
  }
  if (eventName === "user_join_group") await query(`UPDATE crm_zalo_gmf_groups SET total_member=total_member+$2,updated_at=NOW() WHERE group_id=$1`, [groupId, users.length]);
  if (eventName === "user_out_group") await query(`UPDATE crm_zalo_gmf_groups SET total_member=GREATEST(0,total_member-$2),updated_at=NOW() WHERE group_id=$1`, [groupId, users.length]);
  await query(`UPDATE crm_zalo_gmf_webhook_receipts SET processed=true,processed_at=NOW() WHERE event_key=$1`, [receiptKey]);
  return { handled: true };
}

function vietnamDate(daysFromToday = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + daysFromToday * 86_400_000));
}

function validateReportRange(input: { from?: string; to?: string } = {}) {
  const valid = (value: string | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
  const from = valid(input.from) ? input.from! : vietnamDate(-29);
  const to = valid(input.to) ? input.to! : vietnamDate();
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  if (fromTime > toTime) throw new Error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
  if ((toTime - fromTime) / 86_400_000 > 365) throw new Error("Khoảng báo cáo tối đa là 366 ngày.");
  return { from, to };
}

export async function getZaloGmfDashboard(reportRange: { from?: string; to?: string } = {}): Promise<ZaloGmfDashboard> {
  await initZaloGmfSchema();
  const config = await getZaloOAConfig();
  const range = validateReportRange(reportRange);
  const [settingsRow, groupRows, memberRows, eventRows, contentRows, scheduleRows, statRows] = await Promise.all([
    queryOne<Record<string, unknown>>(`SELECT * FROM crm_zalo_gmf_settings WHERE id='default'`),
    query<Record<string, unknown>>(`SELECT g.*,
      COUNT(e.event_key) FILTER (WHERE e.event_type='joined' AND e.occurred_at>=NOW()-INTERVAL '7 days')::int AS joined_7d,
      COUNT(e.event_key) FILTER (WHERE e.event_type='left' AND e.occurred_at>=NOW()-INTERVAL '7 days')::int AS left_7d,
      (SELECT COUNT(*)::int FROM crm_zalo_gmf_schedules s WHERE s.group_id=g.group_id AND s.status='pending') AS pending_posts
      FROM crm_zalo_gmf_groups g LEFT JOIN crm_zalo_gmf_member_events e ON e.group_id=g.group_id GROUP BY g.group_id ORDER BY g.updated_at DESC`),
    query<Record<string, unknown>>(`SELECT * FROM crm_zalo_gmf_members ORDER BY last_seen_at DESC LIMIT 500`),
    query<Record<string, unknown>>(`SELECT e.*,g.name AS group_name,COALESCE(m.name,'Thành viên Zalo') AS member_name
      FROM crm_zalo_gmf_member_events e JOIN crm_zalo_gmf_groups g ON g.group_id=e.group_id
      LEFT JOIN crm_zalo_gmf_members m ON m.group_id=e.group_id AND m.user_id=e.user_id
      ORDER BY e.occurred_at DESC LIMIT 300`),
    query<Record<string, unknown>>(`SELECT * FROM crm_zalo_gmf_contents ORDER BY created_at DESC LIMIT 100`),
    query<Record<string, unknown>>(`SELECT s.*,c.title AS content_title,g.name AS group_name FROM crm_zalo_gmf_schedules s
      JOIN crm_zalo_gmf_contents c ON c.id=s.content_id JOIN crm_zalo_gmf_groups g ON g.group_id=s.group_id
      ORDER BY s.scheduled_at DESC LIMIT 200`),
    query<Record<string, unknown>>(`SELECT
      (SELECT COUNT(*) FROM crm_zalo_gmf_groups)::int AS groups,
      (SELECT COUNT(*) FROM crm_zalo_gmf_groups WHERE status='enabled')::int AS active_groups,
      COALESCE((SELECT SUM(total_member) FROM crm_zalo_gmf_groups WHERE status='enabled'),0)::int AS members,
      (SELECT COUNT(*) FROM crm_zalo_gmf_member_events WHERE event_type='joined' AND occurred_at>=NOW()-INTERVAL '30 days')::int AS joined_30d,
      (SELECT COUNT(*) FROM crm_zalo_gmf_member_events WHERE event_type='left' AND occurred_at>=NOW()-INTERVAL '30 days')::int AS left_30d,
      (SELECT COUNT(*) FROM crm_zalo_gmf_contents WHERE status IN ('draft','pending'))::int AS pending_approval,
      (SELECT COUNT(*) FROM crm_zalo_gmf_schedules WHERE status='pending')::int AS scheduled,
      (SELECT COUNT(*) FROM crm_zalo_gmf_schedules WHERE status='sent' AND sent_at>=NOW()-INTERVAL '30 days')::int AS sent_30d,
      (SELECT COUNT(*) FROM crm_zalo_gmf_schedules WHERE status='failed' AND updated_at>=NOW()-INTERVAL '30 days')::int AS failed_30d`),
  ]);
  const [memberSummary, memberDailyRows, memberGroupRows] = await Promise.all([
    queryOne<Record<string, unknown>>(`WITH bounds AS (
      SELECT
        date_trunc('day',NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh' AS today_start,
        (date_trunc('day',NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')+INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh' AS tomorrow_start,
        (date_trunc('day',NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')-INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh' AS yesterday_start,
        (date_trunc('day',NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')-INTERVAL '6 days') AT TIME ZONE 'Asia/Ho_Chi_Minh' AS seven_day_start,
        $1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AS selected_start,
        ($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AS selected_end
    ) SELECT
      COUNT(e.event_key) FILTER (WHERE e.event_type='joined' AND e.occurred_at>=b.today_start AND e.occurred_at<b.tomorrow_start)::int AS today_joined,
      COUNT(e.event_key) FILTER (WHERE e.event_type='joined' AND e.occurred_at>=b.yesterday_start AND e.occurred_at<b.today_start)::int AS yesterday_joined,
      COUNT(e.event_key) FILTER (WHERE e.event_type='joined' AND e.occurred_at>=b.seven_day_start AND e.occurred_at<b.tomorrow_start)::int AS last_7_days_joined,
      COUNT(e.event_key) FILTER (WHERE e.event_type='joined' AND e.occurred_at>=b.selected_start AND e.occurred_at<b.selected_end)::int AS selected_joined,
      COUNT(e.event_key) FILTER (WHERE e.event_type='left' AND e.occurred_at>=b.selected_start AND e.occurred_at<b.selected_end)::int AS selected_left
      FROM bounds b LEFT JOIN crm_zalo_gmf_member_events e ON true`, [range.from, range.to]),
    query<Record<string, unknown>>(`WITH days AS (
      SELECT generate_series($1::date,$2::date,INTERVAL '1 day')::date AS day
    ) SELECT TO_CHAR(d.day,'YYYY-MM-DD') AS date,
      COUNT(e.event_key) FILTER (WHERE e.event_type='joined')::int AS joined,
      COUNT(e.event_key) FILTER (WHERE e.event_type='left')::int AS left
      FROM days d LEFT JOIN crm_zalo_gmf_member_events e
        ON e.occurred_at >= (d.day::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
       AND e.occurred_at < ((d.day+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
      GROUP BY d.day ORDER BY d.day`, [range.from, range.to]),
    query<Record<string, unknown>>(`SELECT g.group_id,g.name AS group_name,g.total_member,
      COUNT(e.event_key) FILTER (WHERE e.event_type='joined')::int AS joined,
      COUNT(e.event_key) FILTER (WHERE e.event_type='left')::int AS left
      FROM crm_zalo_gmf_groups g LEFT JOIN crm_zalo_gmf_member_events e
        ON e.group_id=g.group_id
       AND e.occurred_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
       AND e.occurred_at < (($2::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
      GROUP BY g.group_id,g.name,g.total_member ORDER BY joined DESC,g.name`, [range.from, range.to]),
  ]);
  const stats = statRows[0] || {};
  const reportSummary = memberSummary || {};
  const selectedJoined = Number(reportSummary.selected_joined || 0);
  const selectedLeft = Number(reportSummary.selected_left || 0);
  return {
    configured: Boolean(config.isActive && config.accessToken), settings: mapSettings(settingsRow),
    stats: {
      groups: Number(stats.groups || 0), activeGroups: Number(stats.active_groups || 0), members: Number(stats.members || 0),
      joined30d: Number(stats.joined_30d || 0), left30d: Number(stats.left_30d || 0), pendingApproval: Number(stats.pending_approval || 0),
      scheduled: Number(stats.scheduled || 0), sent30d: Number(stats.sent_30d || 0), failed30d: Number(stats.failed_30d || 0),
    },
    groups: groupRows.map(row => ({
      groupId: String(row.group_id), oaId: String(row.oa_id || ""), name: String(row.name), description: String(row.description || ""),
      avatar: String(row.avatar || ""), groupLink: String(row.group_link || ""), status: String(row.status || "enabled"), assetType: String(row.asset_type || ""),
      assetId: String(row.asset_id || ""), totalMember: Number(row.total_member || 0), maxMember: Number(row.max_member || 0), validThrough: String(row.valid_through || ""),
      autoRenew: Boolean(row.auto_renew), autoDeleteDate: String(row.auto_delete_date || ""), groupSettings: record(row.settings), tag: String(row.tag || "Cộng đồng"),
      automationEnabled: Boolean(row.automation_enabled), lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : null,
      lastMemberSyncAt: row.last_member_sync_at ? String(row.last_member_sync_at) : null, lastPostAt: row.last_post_at ? String(row.last_post_at) : null,
      syncError: String(row.sync_error || ""), joined7d: Number(row.joined_7d || 0), left7d: Number(row.left_7d || 0), pendingPosts: Number(row.pending_posts || 0),
    })),
    members: memberRows.map(row => ({
      groupId: String(row.group_id), userId: String(row.user_id), memberType: String(row.member_type), name: String(row.name), avatar: String(row.avatar || ""),
      status: String(row.status), joinedAt: row.joined_at ? String(row.joined_at) : null, leftAt: row.left_at ? String(row.left_at) : null,
      firstSeenAt: String(row.first_seen_at), lastSeenAt: String(row.last_seen_at),
    })),
    memberEvents: eventRows.map(row => ({
      eventKey: String(row.event_key), groupId: String(row.group_id), groupName: String(row.group_name), userId: String(row.user_id),
      memberName: String(row.member_name), eventType: String(row.event_type), source: String(row.source), occurredAt: String(row.occurred_at),
    })),
    memberReport: {
      range,
      todayJoined: Number(reportSummary.today_joined || 0),
      yesterdayJoined: Number(reportSummary.yesterday_joined || 0),
      last7DaysJoined: Number(reportSummary.last_7_days_joined || 0),
      selectedJoined,
      selectedLeft,
      selectedNet: selectedJoined - selectedLeft,
      daily: memberDailyRows.map(row => {
        const joined = Number(row.joined || 0); const left = Number(row.left || 0);
        return { date: String(row.date), joined, left, net: joined - left };
      }),
      groups: memberGroupRows.map(row => {
        const joined = Number(row.joined || 0); const left = Number(row.left || 0);
        return { groupId: String(row.group_id), groupName: String(row.group_name), totalMember: Number(row.total_member || 0), joined, left, net: joined - left };
      }),
    },
    contents: contentRows.map(mapContent),
    schedules: scheduleRows.map(row => ({
      id: String(row.id), contentId: String(row.content_id), contentTitle: String(row.content_title), groupId: String(row.group_id), groupName: String(row.group_name),
      scheduledAt: String(row.scheduled_at), status: String(row.status) as ZaloGmfScheduleStatus, attempts: Number(row.attempts || 0),
      nextAttemptAt: row.next_attempt_at ? String(row.next_attempt_at) : null, messageId: String(row.message_id || ""), error: String(row.error || ""),
      sentAt: row.sent_at ? String(row.sent_at) : null, createdAt: String(row.created_at),
    })),
  };
}
