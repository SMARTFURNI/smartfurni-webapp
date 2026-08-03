import { createHash, timingSafeEqual } from "crypto";
import OpenAI from "openai";
import { query } from "@/lib/db";

export type ZaloMessageCategory = "consultation" | "zbs_transaction" | "zbs_after_sale";
export type ZaloMessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";
export type ZaloQueueStatus = "draft" | "approved" | "sent" | "rejected" | "failed";
export type ZaloHistorySyncStatus = "never" | "running" | "completed" | "partial" | "failed";

export interface ZaloHistorySyncSummary {
  status: ZaloHistorySyncStatus;
  startedAt: string | null;
  finishedAt: string | null;
  customersSeen: number;
  customersUpserted: number;
  conversationsSeen: number;
  messagesSeen: number;
  messagesInserted: number;
  messagesSkipped: number;
  profilesUpdated: number;
  warnings: string[];
  error: string;
}

export interface ZaloOAConfig {
  oaId: string;
  appId: string;
  appSecret: string;
  oaSecretKey: string;
  accessToken: string;
  refreshToken: string;
  isActive: boolean;
  aiEnabled: boolean;
  aiAutoSend: boolean;
  requireApproval: boolean;
  aiModel: string;
  aiConfidenceThreshold: number;
  maxAutoMessagesPerDay: number;
  businessHoursStart: string;
  businessHoursEnd: string;
  zbsEnabled: boolean;
  updatedAt: string;
}

export interface ZaloOAPublicConfig extends Omit<ZaloOAConfig, "appSecret" | "oaSecretKey" | "accessToken" | "refreshToken"> {
  appSecretConfigured: boolean;
  oaSecretKeyConfigured: boolean;
  accessTokenConfigured: boolean;
  refreshTokenConfigured: boolean;
  webhookUrl: string;
  webhookLastReceivedAt: string | null;
  webhookLastEvent: string;
  webhookLastStatus: string;
  webhookLastError: string;
  historySync: ZaloHistorySyncSummary;
}

export interface ZaloTemplate {
  id: string;
  name: string;
  category: ZaloMessageCategory;
  content: string;
  zbsTemplateId: string;
  variables: string[];
  isActive: boolean;
  requiresApproval: boolean;
  updatedAt: string;
}

export interface ZaloConversation {
  userId: string;
  displayName: string;
  phone: string;
  avatar: string;
  lastUserInteraction: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
  tags: string[];
  aiStatus: string;
}

export interface ZaloMessageRecord {
  id: string;
  userId: string;
  displayName: string;
  direction: "inbound" | "outbound";
  category: ZaloMessageCategory;
  content: string;
  status: ZaloMessageStatus;
  source: "manual" | "ai" | "webhook" | "sync";
  templateId: string;
  zaloMessageId: string;
  aiConfidence: number | null;
  error: string;
  attachment: Record<string, unknown>;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface ZaloAiQueueItem {
  id: string;
  userId: string;
  customerName: string;
  incomingMessage: string;
  suggestedReply: string;
  confidence: number;
  reasoning: string;
  status: ZaloQueueStatus;
  scheduledAt: string | null;
  createdAt: string;
}

export interface ZaloDashboard {
  config: ZaloOAPublicConfig;
  stats: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    conversations: number;
    unread: number;
    aiDrafts: number;
    sentToday: number;
  };
  templates: ZaloTemplate[];
  conversations: ZaloConversation[];
  messages: ZaloMessageRecord[];
  aiQueue: ZaloAiQueueItem[];
}

const DEFAULT_MODEL = "gpt-5.6-terra";
const WEBHOOK_PATH = "/api/crm/zalo/webhook";

export async function initZaloOASchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_zalo_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      oa_id TEXT NOT NULL DEFAULT '',
      access_token TEXT NOT NULL DEFAULT '',
      refresh_token TEXT NOT NULL DEFAULT '',
      webhook_verify_token TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS app_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS app_secret TEXT NOT NULL DEFAULT '';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS oa_secret_key TEXT NOT NULL DEFAULT '';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS ai_auto_send BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS ai_model TEXT NOT NULL DEFAULT '${DEFAULT_MODEL}';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS ai_confidence_threshold NUMERIC NOT NULL DEFAULT 0.9;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS max_auto_messages_per_day INTEGER NOT NULL DEFAULT 30;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS business_hours_start TEXT NOT NULL DEFAULT '08:00';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS business_hours_end TEXT NOT NULL DEFAULT '20:00';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS zbs_enabled BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS webhook_last_received_at TIMESTAMPTZ;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS webhook_last_event TEXT NOT NULL DEFAULT '';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS webhook_last_status TEXT NOT NULL DEFAULT '';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS webhook_last_error TEXT NOT NULL DEFAULT '';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS history_sync_status TEXT NOT NULL DEFAULT 'never';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS history_sync_started_at TIMESTAMPTZ;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS history_sync_finished_at TIMESTAMPTZ;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS history_sync_summary JSONB NOT NULL DEFAULT '{}';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS history_sync_error TEXT NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS crm_zalo_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'consultation',
      content TEXT NOT NULL DEFAULT '',
      zbs_template_id TEXT NOT NULL DEFAULT '',
      variables JSONB NOT NULL DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT true,
      requires_approval BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_zalo_conversations (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT 'Khách Zalo',
      phone TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      last_user_interaction TIMESTAMPTZ,
      last_message_preview TEXT NOT NULL DEFAULT '',
      last_message_at TIMESTAMPTZ,
      unread_count INTEGER NOT NULL DEFAULT 0,
      tags JSONB NOT NULL DEFAULT '[]',
      ai_status TEXT NOT NULL DEFAULT 'idle',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_zalo_messages (
      id TEXT PRIMARY KEY,
      conversation_user_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'consultation',
      content TEXT NOT NULL DEFAULT '',
      attachment JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      source TEXT NOT NULL DEFAULT 'manual',
      template_id TEXT NOT NULL DEFAULT '',
      zalo_message_id TEXT NOT NULL DEFAULT '',
      ai_confidence NUMERIC,
      error TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      read_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS crm_zalo_ai_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      customer_name TEXT NOT NULL DEFAULT 'Khách Zalo',
      incoming_message TEXT NOT NULL DEFAULT '',
      suggested_reply TEXT NOT NULL DEFAULT '',
      confidence NUMERIC NOT NULL DEFAULT 0,
      reasoning TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS crm_zalo_messages_user_idx ON crm_zalo_messages(conversation_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS crm_zalo_messages_status_idx ON crm_zalo_messages(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS crm_zalo_ai_queue_status_idx ON crm_zalo_ai_queue(status, created_at DESC);
    INSERT INTO crm_zalo_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
  `);

  const defaults: Array<[string, string, ZaloMessageCategory, string, string[]]> = [
    ["zalo-consult-new", "Tư vấn khách vừa nhắn OA", "consultation", "Chào {{name}}, SmartFurni đã nhận được tin nhắn của mình. Anh/chị cho SmartFurni biết thêm nhu cầu để đội ngũ tư vấn đúng sản phẩm nhé.", ["name"]],
    ["zalo-zbs-quote", "Thông báo báo giá", "zbs_transaction", "Thông báo báo giá {{quote_id}} đã sẵn sàng. Giá trị: {{total}}.", ["quote_id", "total"]],
    ["zalo-zbs-appointment", "Xác nhận lịch hẹn", "zbs_transaction", "Lịch hẹn của {{name}} được xác nhận vào {{time}} ngày {{date}}.", ["name", "time", "date"]],
    ["zalo-zbs-after-sale", "Chăm sóc sau giao hàng", "zbs_after_sale", "SmartFurni xin phép hỏi thăm trải nghiệm sau khi nhận sản phẩm {{product}}.", ["product"]],
  ];
  for (const [id, name, category, content, variables] of defaults) {
    await query(
      `INSERT INTO crm_zalo_templates (id, name, category, content, variables)
       VALUES ($1, $2, $3, $4, $5::jsonb) ON CONFLICT (id) DO NOTHING`,
      [id, name, category, content, JSON.stringify(variables)],
    );
  }
}

function mapConfig(row?: Record<string, unknown>): ZaloOAConfig {
  return {
    oaId: String(row?.oa_id || ""),
    appId: String(row?.app_id || ""),
    appSecret: String(row?.app_secret || ""),
    oaSecretKey: String(row?.oa_secret_key || ""),
    accessToken: String(row?.access_token || ""),
    refreshToken: String(row?.refresh_token || ""),
    isActive: Boolean(row?.is_active),
    aiEnabled: row?.ai_enabled !== false,
    aiAutoSend: Boolean(row?.ai_auto_send),
    requireApproval: row?.require_approval !== false,
    aiModel: String(row?.ai_model || DEFAULT_MODEL),
    aiConfidenceThreshold: Number(row?.ai_confidence_threshold ?? 0.9),
    maxAutoMessagesPerDay: Number(row?.max_auto_messages_per_day ?? 30),
    businessHoursStart: String(row?.business_hours_start || "08:00"),
    businessHoursEnd: String(row?.business_hours_end || "20:00"),
    zbsEnabled: Boolean(row?.zbs_enabled),
    updatedAt: String(row?.updated_at || new Date().toISOString()),
  };
}

export async function getZaloOAConfig(): Promise<ZaloOAConfig> {
  await initZaloOASchema();
  const rows = await query<Record<string, unknown>>(`SELECT * FROM crm_zalo_config WHERE id = 'default'`);
  return mapConfig(rows[0]);
}

export async function saveZaloOAConfig(input: Partial<ZaloOAConfig>): Promise<void> {
  await initZaloOASchema();
  const current = await getZaloOAConfig();
  const keep = (next: string | undefined, old: string) => next?.trim() ? next.trim() : old;
  await query(
    `UPDATE crm_zalo_config SET
      oa_id=$1, app_id=$2, app_secret=$3, oa_secret_key=$4, access_token=$5, refresh_token=$6,
      is_active=$7, ai_enabled=$8, ai_auto_send=$9, require_approval=$10,
      ai_model=$11, ai_confidence_threshold=$12, max_auto_messages_per_day=$13,
      business_hours_start=$14, business_hours_end=$15, zbs_enabled=$16, updated_at=NOW()
     WHERE id='default'`,
    [
      input.oaId ?? current.oaId,
      input.appId ?? current.appId,
      keep(input.appSecret, current.appSecret),
      keep(input.oaSecretKey, current.oaSecretKey),
      keep(input.accessToken, current.accessToken),
      keep(input.refreshToken, current.refreshToken),
      input.isActive ?? current.isActive,
      input.aiEnabled ?? current.aiEnabled,
      input.aiAutoSend ?? current.aiAutoSend,
      input.requireApproval ?? current.requireApproval,
      input.aiModel || current.aiModel,
      Math.max(0.5, Math.min(1, Number(input.aiConfidenceThreshold ?? current.aiConfidenceThreshold))),
      Math.max(1, Math.min(500, Number(input.maxAutoMessagesPerDay ?? current.maxAutoMessagesPerDay))),
      input.businessHoursStart || current.businessHoursStart,
      input.businessHoursEnd || current.businessHoursEnd,
      input.zbsEnabled ?? current.zbsEnabled,
    ],
  );
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch { return {}; }
  }
  return {};
}

function mapHistorySync(row?: Record<string, unknown>): ZaloHistorySyncSummary {
  const raw = asRecord(row?.history_sync_summary);
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map(String) : [];
  const status = String(row?.history_sync_status || raw.status || "never") as ZaloHistorySyncStatus;
  return {
    status: ["never", "running", "completed", "partial", "failed"].includes(status) ? status : "never",
    startedAt: row?.history_sync_started_at ? String(row.history_sync_started_at) : raw.startedAt ? String(raw.startedAt) : null,
    finishedAt: row?.history_sync_finished_at ? String(row.history_sync_finished_at) : raw.finishedAt ? String(raw.finishedAt) : null,
    customersSeen: Number(raw.customersSeen || 0),
    customersUpserted: Number(raw.customersUpserted || 0),
    conversationsSeen: Number(raw.conversationsSeen || 0),
    messagesSeen: Number(raw.messagesSeen || 0),
    messagesInserted: Number(raw.messagesInserted || 0),
    messagesSkipped: Number(raw.messagesSkipped || 0),
    profilesUpdated: Number(raw.profilesUpdated || 0),
    warnings,
    error: String(row?.history_sync_error || raw.error || ""),
  };
}

function mapTemplate(row: Record<string, unknown>): ZaloTemplate {
  return {
    id: String(row.id), name: String(row.name), category: String(row.category) as ZaloMessageCategory,
    content: String(row.content || ""), zbsTemplateId: String(row.zbs_template_id || ""),
    variables: asArray(row.variables), isActive: Boolean(row.is_active),
    requiresApproval: row.requires_approval !== false, updatedAt: String(row.updated_at),
  };
}

export async function getZaloTemplates(): Promise<ZaloTemplate[]> {
  await initZaloOASchema();
  return (await query<Record<string, unknown>>(`SELECT * FROM crm_zalo_templates ORDER BY updated_at DESC`)).map(mapTemplate);
}

export async function saveZaloTemplate(input: Partial<ZaloTemplate> & { name: string; category: ZaloMessageCategory }): Promise<ZaloTemplate> {
  await initZaloOASchema();
  const id = input.id || `zt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO crm_zalo_templates (id,name,category,content,zbs_template_id,variables,is_active,requires_approval)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,content=EXCLUDED.content,
       zbs_template_id=EXCLUDED.zbs_template_id,variables=EXCLUDED.variables,is_active=EXCLUDED.is_active,
       requires_approval=EXCLUDED.requires_approval,updated_at=NOW()
     RETURNING *`,
    [id, input.name.trim(), input.category, input.content || "", input.zbsTemplateId || "", JSON.stringify(input.variables || []), input.isActive !== false, input.requiresApproval !== false],
  );
  return mapTemplate(rows[0]);
}

export async function deleteZaloTemplate(id: string): Promise<void> {
  await initZaloOASchema();
  await query(`DELETE FROM crm_zalo_templates WHERE id=$1`, [id]);
}

function mapConversation(row: Record<string, unknown>): ZaloConversation {
  return {
    userId: String(row.user_id), displayName: String(row.display_name || "Khách Zalo"), phone: String(row.phone || ""),
    avatar: String(row.avatar || ""), lastUserInteraction: row.last_user_interaction ? String(row.last_user_interaction) : null,
    lastMessagePreview: String(row.last_message_preview || ""), lastMessageAt: row.last_message_at ? String(row.last_message_at) : null,
    unreadCount: Number(row.unread_count || 0), tags: asArray(row.tags), aiStatus: String(row.ai_status || "idle"),
  };
}

function mapMessage(row: Record<string, unknown>): ZaloMessageRecord {
  return {
    id: String(row.id), userId: String(row.conversation_user_id), displayName: String(row.display_name || "Khách Zalo"),
    direction: String(row.direction) as "inbound" | "outbound", category: String(row.category) as ZaloMessageCategory,
    content: String(row.content || ""), status: String(row.status) as ZaloMessageStatus,
    source: String(row.source) as "manual" | "ai" | "webhook" | "sync", templateId: String(row.template_id || ""),
    zaloMessageId: String(row.zalo_message_id || ""), aiConfidence: row.ai_confidence == null ? null : Number(row.ai_confidence),
    error: String(row.error || ""), attachment: asRecord(row.attachment), createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : null, deliveredAt: row.delivered_at ? String(row.delivered_at) : null,
    readAt: row.read_at ? String(row.read_at) : null,
  };
}

function mapQueue(row: Record<string, unknown>): ZaloAiQueueItem {
  return {
    id: String(row.id), userId: String(row.user_id), customerName: String(row.customer_name || "Khách Zalo"),
    incomingMessage: String(row.incoming_message || ""), suggestedReply: String(row.suggested_reply || ""),
    confidence: Number(row.confidence || 0), reasoning: String(row.reasoning || ""), status: String(row.status) as ZaloQueueStatus,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null, createdAt: String(row.created_at),
  };
}

export async function getZaloDashboard(baseUrl = ""): Promise<ZaloDashboard> {
  await initZaloOASchema();
  const [config, templates, conversationRows, messageRows, queueRows, statRows] = await Promise.all([
    getZaloOAConfig(),
    getZaloTemplates(),
    query<Record<string, unknown>>(`SELECT * FROM crm_zalo_conversations ORDER BY last_message_at DESC NULLS LAST LIMIT 100`),
    query<Record<string, unknown>>(`SELECT m.*,c.display_name FROM crm_zalo_messages m LEFT JOIN crm_zalo_conversations c ON c.user_id=m.conversation_user_id ORDER BY m.created_at DESC LIMIT 200`),
    query<Record<string, unknown>>(`SELECT * FROM crm_zalo_ai_queue ORDER BY created_at DESC LIMIT 100`),
    query<Record<string, unknown>>(`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('sent','delivered','read'))::int AS sent,
      COUNT(*) FILTER (WHERE status='failed')::int AS failed,
      COUNT(*) FILTER (WHERE status='pending')::int AS pending,
      COUNT(*) FILTER (WHERE status IN ('sent','delivered','read') AND created_at >= CURRENT_DATE)::int AS sent_today
      FROM crm_zalo_messages`),
  ]);
  const conversations = conversationRows.map(mapConversation);
  const aiQueue = queueRows.map(mapQueue);
  const s = statRows[0] || {};
  const { appSecret: _appSecret, oaSecretKey: _oaSecretKey, accessToken: _accessToken, refreshToken: _refreshToken, ...safeConfig } = config;
  const configMeta = await query<Record<string, unknown>>(
    `SELECT webhook_last_received_at,webhook_last_event,webhook_last_status,webhook_last_error,
      history_sync_status,history_sync_started_at,history_sync_finished_at,history_sync_summary,history_sync_error
     FROM crm_zalo_config WHERE id='default'`,
  );
  const meta = configMeta[0] || {};
  return {
    config: {
      ...safeConfig,
      appSecretConfigured: Boolean(config.appSecret), oaSecretKeyConfigured: Boolean(config.oaSecretKey), accessTokenConfigured: Boolean(config.accessToken),
      refreshTokenConfigured: Boolean(config.refreshToken), webhookUrl: `${baseUrl}${WEBHOOK_PATH}`,
      webhookLastReceivedAt: meta.webhook_last_received_at ? String(meta.webhook_last_received_at) : null,
      webhookLastEvent: String(meta.webhook_last_event || ""),
      webhookLastStatus: String(meta.webhook_last_status || ""),
      webhookLastError: String(meta.webhook_last_error || ""),
      historySync: mapHistorySync(meta),
    },
    stats: {
      total: Number(s.total || 0), sent: Number(s.sent || 0), failed: Number(s.failed || 0), pending: Number(s.pending || 0),
      conversations: conversations.length, unread: conversations.reduce((sum, item) => sum + item.unreadCount, 0),
      aiDrafts: aiQueue.filter(item => item.status === "draft").length, sentToday: Number(s.sent_today || 0),
    },
    templates, conversations, messages: messageRows.map(mapMessage), aiQueue,
  };
}

export async function getZaloConversationMessages(userId: string, limit = 300): Promise<ZaloMessageRecord[]> {
  await initZaloOASchema();
  const safeLimit = Math.max(20, Math.min(500, Math.trunc(limit)));
  const rows = await query<Record<string, unknown>>(
    `SELECT recent.*,c.display_name FROM (
       SELECT * FROM crm_zalo_messages
       WHERE conversation_user_id=$1 ORDER BY created_at DESC LIMIT $2
     ) recent
     LEFT JOIN crm_zalo_conversations c ON c.user_id=recent.conversation_user_id
     ORDER BY recent.created_at ASC`,
    [userId, safeLimit],
  );
  return rows.map(mapMessage);
}

export async function getZaloConversation(userId: string): Promise<ZaloConversation | null> {
  await initZaloOASchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM crm_zalo_conversations WHERE user_id=$1 LIMIT 1`,
    [userId],
  );
  return rows[0] ? mapConversation(rows[0]) : null;
}

export async function syncZaloUserProfile(userId: string): Promise<ZaloConversation | null> {
  await initZaloOASchema();
  const [config, stored] = await Promise.all([getZaloOAConfig(), getZaloConversation(userId)]);
  if (!config.accessToken || !userId) return stored;

  try {
    const dataParam = JSON.stringify({ user_id: userId });
    const response = await fetch(`https://openapi.zalo.me/v3.0/oa/user/detail?data=${encodeURIComponent(dataParam)}`, {
      headers: { access_token: config.accessToken },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({})) as {
      error?: number;
      message?: string;
      data?: { display_name?: string; name?: string; avatar?: string; avatar_url?: string; user_id?: string };
    };
    if (!response.ok || Number(body.error || 0) !== 0 || !body.data) return stored;

    const displayName = String(body.data.display_name || body.data.name || "").trim();
    const avatar = String(body.data.avatar || body.data.avatar_url || "").trim();
    if (!displayName && !avatar) return stored;

    await query(
      `UPDATE crm_zalo_conversations SET
       display_name=CASE WHEN $2<>'' THEN $2 ELSE display_name END,
       avatar=CASE WHEN $3<>'' THEN $3 ELSE avatar END,
       updated_at=NOW()
       WHERE user_id=$1`,
      [userId, displayName, avatar],
    );
    return await getZaloConversation(userId);
  } catch {
    // Hồ sơ chỉ làm giàu giao diện; lỗi API không được làm gián đoạn hội thoại.
    return stored;
  }
}

function historyItems(body: Record<string, unknown>): Record<string, unknown>[] {
  const data = asRecord(body.data);
  const candidates = [
    body.items, body.followers, body.conversations, body.messages,
    data.items, data.followers, data.conversations, data.messages, data.users,
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value.map(asRecord).filter(item => Object.keys(item).length > 0);
  }
  return Array.isArray(body.data) ? body.data.map(asRecord).filter(item => Object.keys(item).length > 0) : [];
}

async function fetchZaloHistoryPage(
  path: string,
  data: Record<string, unknown>,
  accessToken: string,
): Promise<Record<string, unknown>> {
  const url = new URL(path);
  url.searchParams.set("data", JSON.stringify(data));
  const response = await fetch(url, {
    headers: { access_token: accessToken },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  const errorCode = Number(body.error || 0);
  if (!response.ok || errorCode !== 0) {
    throw new Error(String(body.message || body.error_name || `Zalo HTTP ${response.status}`));
  }
  return body;
}

function historyUserId(item: Record<string, unknown>, oaId: string): string {
  const direct = String(item.user_id || item.uid || item.anonymous_id || "").trim();
  if (direct && direct !== oaId) return direct;
  const sender = zaloPartyId(asRecord(item.sender));
  const recipient = zaloPartyId(asRecord(item.recipient));
  if (sender && sender !== oaId) return sender;
  if (recipient && recipient !== oaId) return recipient;
  const id = String(item.id || "").trim();
  return id && id !== oaId ? id : "";
}

function historyDirection(item: Record<string, unknown>, userId: string, oaId: string): "inbound" | "outbound" {
  const value = String(item.direction || item.event_name || item.type || "").toLowerCase();
  if (value === "outbound" || value.startsWith("oa_send_")) return "outbound";
  if (value === "inbound" || value.startsWith("user_send_") || value.startsWith("anonymous_send_")) return "inbound";
  const sender = zaloPartyId(asRecord(item.sender));
  if (sender === oaId) return "outbound";
  if (sender === userId) return "inbound";
  return "inbound";
}

async function saveHistorySync(summary: ZaloHistorySyncSummary): Promise<void> {
  summary.warnings = Array.from(new Set(summary.warnings)).slice(0, 30);
  await query(
    `UPDATE crm_zalo_config SET history_sync_status=$1,history_sync_started_at=$2,
     history_sync_finished_at=$3,history_sync_summary=$4::jsonb,history_sync_error=$5,updated_at=NOW()
     WHERE id='default'`,
    [summary.status, summary.startedAt, summary.finishedAt, JSON.stringify(summary), summary.error.slice(0, 500)],
  );
}

/**
 * Nhập phần lịch sử mà OA OpenAPI hiện tại thực sự cho phép đọc. Các endpoint V2
 * không còn được cấp cho mọi ứng dụng, vì vậy kết quả luôn ghi rõ completed/partial/failed.
 */
export async function syncZaloOAHistory(): Promise<ZaloHistorySyncSummary> {
  await initZaloOASchema();
  const startedAt = new Date().toISOString();
  const summary: ZaloHistorySyncSummary = {
    status: "running", startedAt, finishedAt: null,
    customersSeen: 0, customersUpserted: 0, conversationsSeen: 0,
    messagesSeen: 0, messagesInserted: 0, messagesSkipped: 0,
    profilesUpdated: 0, warnings: [], error: "",
  };
  await saveHistorySync(summary);

  try {
    const config = await getZaloOAConfig();
    if (!config.isActive || !config.accessToken) throw new Error("Zalo OA chưa kích hoạt hoặc thiếu Access Token.");

    const users = new Set<string>();
    const existing = await query<{ user_id: string }>(`SELECT user_id FROM crm_zalo_conversations`);
    existing.forEach(row => row.user_id && users.add(String(row.user_id)));

    const collectUsers = async (label: string, path: string, pageSize: number, maxItems: number) => {
      let offset = 0;
      try {
        while (offset < maxItems) {
          const body = await fetchZaloHistoryPage(path, { offset, count: pageSize }, config.accessToken);
          const items = historyItems(body);
          for (const item of items) {
            const userId = historyUserId(item, config.oaId);
            if (userId) users.add(userId);
          }
          if (items.length < pageSize) break;
          offset += items.length;
        }
        if (offset >= maxItems) summary.warnings.push(`${label}: đã chạm giới hạn an toàn ${maxItems} bản ghi mỗi lần chạy.`);
      } catch (error) {
        summary.warnings.push(`${label}: ${error instanceof Error ? error.message : "API không khả dụng"}.`);
      }
    };

    await collectUsers("Danh sách người quan tâm", "https://openapi.zalo.me/v2.0/oa/getfollowers", 50, 500);
    await collectUsers("Danh sách hội thoại gần đây", "https://openapi.zalo.me/v2.0/oa/listrecentchat", 10, 500);
    summary.customersSeen = users.size;

    for (const userId of users) {
      await query(
        `INSERT INTO crm_zalo_conversations (user_id,display_name,unread_count,ai_status)
         VALUES ($1,'Khách Zalo',0,'idle') ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );
      summary.customersUpserted += 1;
      const before = await getZaloConversation(userId);
      const profile = await syncZaloUserProfile(userId);
      if (profile && before && (profile.displayName !== before.displayName || profile.avatar !== before.avatar)) summary.profilesUpdated += 1;

      let offset = 0;
      let conversationAvailable = true;
      while (offset < 200 && conversationAvailable) {
        let items: Record<string, unknown>[] = [];
        try {
          const body = await fetchZaloHistoryPage(
            "https://openapi.zalo.me/v2.0/oa/conversation",
            { user_id: userId, offset, count: 10 },
            config.accessToken,
          );
          items = historyItems(body);
        } catch (error) {
          summary.warnings.push(`Hội thoại ${userId}: ${error instanceof Error ? error.message : "API không khả dụng"}.`);
          conversationAvailable = false;
          break;
        }
        if (!items.length) break;
        summary.conversationsSeen += offset === 0 ? 1 : 0;
        for (const raw of items) {
          const message = Object.keys(asRecord(raw.message)).length ? asRecord(raw.message) : raw;
          const eventName = String(raw.event_name || message.event_name || raw.type || message.type || "");
          const direction = historyDirection(raw, userId, config.oaId);
          const { content, attachment } = zaloEventContent(eventName, message);
          const eventAt = zaloEventTime({ ...raw, created_at: raw.created_at || message.created_at || message.time || message.timestamp });
          const messageId = zaloMessageId(raw, message) || String(raw.msg_id || raw.message_id || raw.id || "").trim();
          const stable = createHash("sha256")
            .update(JSON.stringify([userId, direction, eventAt, content, attachment]))
            .digest("hex").slice(0, 32);
          const id = messageId ? `zalo-${messageId}` : `zsync-${stable}`;
          summary.messagesSeen += 1;
          const duplicate = await query<{ id: string }>(
            `SELECT id FROM crm_zalo_messages WHERE id=$1 OR ($2<>'' AND zalo_message_id=$2) LIMIT 1`,
            [id, messageId],
          );
          if (duplicate.length) {
            summary.messagesSkipped += 1;
            continue;
          }
          const inserted = await query<{ id: string }>(
            `INSERT INTO crm_zalo_messages
             (id,conversation_user_id,direction,category,content,attachment,status,source,zalo_message_id,created_at,sent_at,delivered_at)
             VALUES ($1,$2,$3,'consultation',$4,$5::jsonb,'delivered','sync',$6,$7::timestamptz,
               CASE WHEN $3='outbound' THEN $7::timestamptz ELSE NULL END,$7::timestamptz)
             ON CONFLICT (id) DO NOTHING RETURNING id`,
            [id, userId, direction, content, JSON.stringify(attachment), messageId, eventAt],
          );
          if (inserted.length) summary.messagesInserted += 1;
          else summary.messagesSkipped += 1;
          await query(
            `UPDATE crm_zalo_conversations SET
             last_user_interaction=CASE WHEN $2='inbound' AND (last_user_interaction IS NULL OR last_user_interaction<$3) THEN $3 ELSE last_user_interaction END,
             last_message_preview=CASE WHEN last_message_at IS NULL OR last_message_at<$3 THEN $4 ELSE last_message_preview END,
             last_message_at=CASE WHEN last_message_at IS NULL OR last_message_at<$3 THEN $3 ELSE last_message_at END,
             updated_at=NOW() WHERE user_id=$1`,
            [userId, direction, eventAt, content],
          );
        }
        if (items.length < 10) break;
        offset += items.length;
      }
      if (offset >= 200) summary.warnings.push(`Hội thoại ${userId}: đã chạm giới hạn an toàn 200 tin mỗi lần chạy.`);
    }

    if (!users.size) {
      summary.status = "failed";
      summary.error = "Zalo không trả về danh sách khách hoặc hội thoại lịch sử cho quyền OpenAPI hiện tại.";
    } else {
      summary.status = summary.warnings.length ? "partial" : "completed";
    }
  } catch (error) {
    summary.status = "failed";
    summary.error = error instanceof Error ? error.message : "Không thể đồng bộ lịch sử Zalo OA.";
  }
  summary.finishedAt = new Date().toISOString();
  await saveHistorySync(summary);
  return summary;
}

export async function markZaloConversationRead(userId: string): Promise<void> {
  await initZaloOASchema();
  await query(`UPDATE crm_zalo_conversations SET unread_count=0,updated_at=NOW() WHERE user_id=$1`, [userId]);
}

async function insertOutboundMessage(input: {
  userId: string; content: string; category: ZaloMessageCategory; source: "manual" | "ai";
  templateId?: string; aiConfidence?: number; attachment?: Record<string, unknown>;
}): Promise<string> {
  const id = `zm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO crm_zalo_messages (id,conversation_user_id,direction,category,content,status,source,template_id,ai_confidence,attachment)
     VALUES ($1,$2,'outbound',$3,$4,'pending',$5,$6,$7,$8::jsonb)`,
    [id, input.userId, input.category, input.content, input.source, input.templateId || "", input.aiConfidence ?? null, JSON.stringify(input.attachment || {})],
  );
  return id;
}

function isWithinSevenDays(value: string | null): boolean {
  if (!value) return false;
  const at = new Date(value).getTime();
  return Number.isFinite(at) && Date.now() - at <= 7 * 24 * 60 * 60 * 1000;
}

async function finalizeMessage(id: string, ok: boolean, zaloMessageId = "", error = ""): Promise<void> {
  await query(
    `UPDATE crm_zalo_messages SET status=$2,zalo_message_id=$3,error=$4,sent_at=CASE WHEN $2='sent' THEN NOW() ELSE sent_at END WHERE id=$1`,
    [id, ok ? "sent" : "failed", zaloMessageId, error],
  );
  if (ok) {
    await query(
      `UPDATE crm_zalo_conversations c SET
       last_message_preview=m.content,last_message_at=COALESCE(m.sent_at,m.created_at),updated_at=NOW()
       FROM crm_zalo_messages m WHERE m.id=$1 AND c.user_id=m.conversation_user_id`,
      [id],
    );
  }
}

async function parseZaloResponse(res: Response): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const data = await res.json().catch(() => ({})) as { error?: number; message?: string; data?: { message_id?: string } };
  if (!res.ok || Number(data.error || 0) !== 0) return { ok: false, error: data.message || `Zalo HTTP ${res.status}` };
  return { ok: true, messageId: data.data?.message_id || "" };
}

export async function sendZaloConsultation(input: {
  userId: string; content: string; source?: "manual" | "ai"; aiConfidence?: number;
}): Promise<{ ok: boolean; error?: string }> {
  await initZaloOASchema();
  const [config, conversationRows] = await Promise.all([
    getZaloOAConfig(),
    query<Record<string, unknown>>(`SELECT * FROM crm_zalo_conversations WHERE user_id=$1`, [input.userId]),
  ]);
  if (!config.isActive || !config.accessToken) {
    const error = "Zalo OA chưa kích hoạt hoặc thiếu Access Token.";
    const id = await insertOutboundMessage({ userId: input.userId, content: input.content, category: "consultation", source: input.source || "manual", aiConfidence: input.aiConfidence });
    await finalizeMessage(id, false, "", error);
    return { ok: false, error };
  }
  const conversation = conversationRows[0] ? mapConversation(conversationRows[0]) : null;
  if (!conversation || !isWithinSevenDays(conversation.lastUserInteraction)) {
    const error = "Tin tư vấn bị chặn: khách chưa tương tác hoặc lần tương tác cuối đã quá 7 ngày.";
    const id = await insertOutboundMessage({ userId: input.userId, content: input.content, category: "consultation", source: input.source || "manual", aiConfidence: input.aiConfidence });
    await finalizeMessage(id, false, "", error);
    return { ok: false, error };
  }
  const id = await insertOutboundMessage({ userId: input.userId, content: input.content, category: "consultation", source: input.source || "manual", aiConfidence: input.aiConfidence });
  try {
    const res = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
      method: "POST", headers: { "Content-Type": "application/json", access_token: config.accessToken },
      body: JSON.stringify({ recipient: { user_id: input.userId }, message: { text: input.content } }),
    });
    const result = await parseZaloResponse(res);
    await finalizeMessage(id, result.ok, result.messageId, result.error);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không gọi được Zalo OA API";
    await finalizeMessage(id, false, "", message);
    return { ok: false, error: message };
  }
}

type ZaloAttachmentKind = "image" | "file";

async function getConsultationContext(userId: string): Promise<{
  config: ZaloOAConfig;
  conversation: ZaloConversation | null;
  error?: string;
}> {
  const [config, conversation] = await Promise.all([getZaloOAConfig(), getZaloConversation(userId)]);
  if (!config.isActive || !config.accessToken) {
    return { config, conversation, error: "Zalo OA chưa kích hoạt hoặc thiếu Access Token." };
  }
  if (!conversation || !isWithinSevenDays(conversation.lastUserInteraction)) {
    return { config, conversation, error: "Tin tư vấn bị chặn: khách chưa tương tác hoặc lần tương tác cuối đã quá 7 ngày." };
  }
  return { config, conversation };
}

function getUploadedAttachmentId(body: Record<string, unknown>): string {
  const data = (body.data || {}) as Record<string, unknown>;
  return String(data.attachment_id || data.token || body.attachment_id || "");
}

export async function sendZaloAttachment(input: {
  userId: string;
  file: Blob;
  filename: string;
  mimeType: string;
  kind: ZaloAttachmentKind;
  source?: "manual" | "ai";
}): Promise<{ ok: boolean; error?: string }> {
  await initZaloOASchema();
  const context = await getConsultationContext(input.userId);
  const preview = input.kind === "image" ? "[Hình ảnh]" : `[Tệp] ${input.filename}`;
  const baseAttachment = {
    items: [{ type: input.kind, name: input.filename, size: input.file.size, mimeType: input.mimeType }],
  };
  const messageId = await insertOutboundMessage({
    userId: input.userId,
    content: preview,
    category: "consultation",
    source: input.source || "manual",
    attachment: baseAttachment,
  });

  if (context.error) {
    await finalizeMessage(messageId, false, "", context.error);
    return { ok: false, error: context.error };
  }

  try {
    const uploadForm = new FormData();
    uploadForm.append("file", input.file, input.filename);
    const uploadEndpoint = input.kind === "image"
      ? "https://openapi.zalo.me/v2.0/oa/upload/image"
      : "https://openapi.zalo.me/v2.0/oa/upload/file";
    const uploadResponse = await fetch(uploadEndpoint, {
      method: "POST",
      headers: { access_token: context.config.accessToken },
      body: uploadForm,
    });
    const uploadBody = await uploadResponse.json().catch(() => ({})) as Record<string, unknown>;
    const uploadError = Number(uploadBody.error || 0);
    const attachmentId = getUploadedAttachmentId(uploadBody);
    if (!uploadResponse.ok || uploadError !== 0 || !attachmentId) {
      const error = String(uploadBody.message || `Zalo upload HTTP ${uploadResponse.status}`);
      await finalizeMessage(messageId, false, "", error);
      return { ok: false, error };
    }

    const message = input.kind === "image"
      ? {
          attachment: {
            type: "template",
            payload: {
              template_type: "media",
              elements: [{ media_type: "image", attachment_id: attachmentId }],
            },
          },
        }
      : { attachment: { type: "file", payload: { token: attachmentId } } };
    const sendResponse = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: context.config.accessToken },
      body: JSON.stringify({ recipient: { user_id: input.userId }, message }),
    });
    const result = await parseZaloResponse(sendResponse);
    await query(
      `UPDATE crm_zalo_messages SET attachment=$2::jsonb WHERE id=$1`,
      [messageId, JSON.stringify({ items: [{ ...baseAttachment.items[0], attachmentId }] })],
    );
    await finalizeMessage(messageId, result.ok, result.messageId, result.error);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không gửi được tệp qua Zalo OA";
    await finalizeMessage(messageId, false, "", message);
    return { ok: false, error: message };
  }
}

export async function sendZaloZbs(input: {
  userId?: string; phone?: string; templateId: string; templateData: Record<string, string>;
  category: "zbs_transaction" | "zbs_after_sale"; source?: "manual" | "ai";
}): Promise<{ ok: boolean; error?: string }> {
  await initZaloOASchema();
  const config = await getZaloOAConfig();
  if (!config.isActive || !config.zbsEnabled || !config.accessToken) return { ok: false, error: "ZBS chưa được kích hoạt hoặc thiếu Access Token." };
  if (!input.templateId.trim()) return { ok: false, error: "Cần chọn mẫu ZBS đã được Zalo duyệt." };
  if (!input.userId && !input.phone) return { ok: false, error: "Cần Zalo UID hoặc số điện thoại đã có căn cứ đồng ý nhận tin." };
  const recipient = input.userId || normalizePhone(input.phone || "");
  const content = `ZBS #${input.templateId}: ${JSON.stringify(input.templateData)}`;
  const id = await insertOutboundMessage({ userId: recipient, content, category: input.category, source: input.source || "manual", templateId: input.templateId });
  try {
    const byUid = Boolean(input.userId);
    const endpoint = byUid
      ? "https://openapi.zalo.me/v3.0/oa/message/template"
      : "https://business.openapi.zalo.me/message/template/hashphone";
    const body = byUid
      ? { user_id: input.userId, template_id: input.templateId, template_data: input.templateData }
      : { hash_phone: createHash("sha256").update(normalizePhone(input.phone || "")).digest("hex"), template_id: input.templateId, template_data: input.templateData, tracking_id: id };
    const res = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json", access_token: config.accessToken }, body: JSON.stringify(body),
    });
    const result = await parseZaloResponse(res);
    await finalizeMessage(id, result.ok, result.messageId, result.error);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không gọi được ZBS API";
    await finalizeMessage(id, false, "", message);
    return { ok: false, error: message };
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `84${digits.slice(1)}`;
  if (digits.startsWith("84")) return digits;
  return digits;
}

export async function testZaloConnection(): Promise<{ ok: boolean; name?: string; error?: string }> {
  const config = await getZaloOAConfig();
  if (!config.accessToken) return { ok: false, error: "Chưa có Access Token." };
  try {
    const res = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", { headers: { access_token: config.accessToken } });
    const data = await res.json() as { error?: number; message?: string; data?: { name?: string } };
    if (!res.ok || Number(data.error || 0) !== 0) return { ok: false, error: data.message || `Zalo HTTP ${res.status}` };
    return { ok: true, name: data.data?.name || "Zalo OA" };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Không kết nối được Zalo" }; }
}

export async function refreshZaloOAAccessToken(): Promise<{ ok: boolean; expiresIn?: number; error?: string }> {
  const config = await getZaloOAConfig();
  if (!config.appId || !config.appSecret || !config.refreshToken) {
    return { ok: false, error: "Cần App ID, App Secret và Refresh Token để làm mới token." };
  }
  try {
    const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: config.appSecret },
      body: new URLSearchParams({ app_id: config.appId, grant_type: "refresh_token", refresh_token: config.refreshToken }),
    });
    const data = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: number; message?: string };
    if (!res.ok || data.error || !data.access_token) return { ok: false, error: data.message || `Zalo OAuth HTTP ${res.status}` };
    await saveZaloOAConfig({ accessToken: data.access_token, refreshToken: data.refresh_token || config.refreshToken });
    return { ok: true, expiresIn: Number(data.expires_in || 0) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Không thể làm mới Zalo token" };
  }
}

function parseAiJson(value: string): { reply: string; confidence: number; reasoning: string } {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as { reply?: string; confidence?: number; reasoning?: string };
  if (!parsed.reply?.trim()) throw new Error("AI không trả về nội dung hợp lệ");
  return { reply: parsed.reply.trim(), confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0))), reasoning: String(parsed.reasoning || "") };
}

export async function generateZaloAiDraft(input: {
  userId: string; incomingMessage?: string; customerName?: string;
}): Promise<{ item: ZaloAiQueueItem; autoSend?: boolean }> {
  await initZaloOASchema();
  const config = await getZaloOAConfig();
  if (!config.aiEnabled) throw new Error("AI Agent Zalo đang tắt.");
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY chưa được cấu hình trên Railway.");
  const conversationRows = await query<Record<string, unknown>>(`SELECT * FROM crm_zalo_conversations WHERE user_id=$1`, [input.userId]);
  const conversation = conversationRows[0] ? mapConversation(conversationRows[0]) : null;
  const messageRows = await query<Record<string, unknown>>(
    `SELECT direction,content,created_at FROM crm_zalo_messages WHERE conversation_user_id=$1 ORDER BY created_at DESC LIMIT 16`, [input.userId],
  );
  const customerName = input.customerName || conversation?.displayName || "khách hàng";
  const incomingMessage = input.incomingMessage || conversation?.lastMessagePreview || "";
  const history = messageRows.reverse().map(row => ({ direction: row.direction, content: String(row.content).slice(0, 800), at: row.created_at }));
  const client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 2 });
  const response = await client.chat.completions.create({
    model: config.aiModel || DEFAULT_MODEL,
    response_format: { type: "json_object" },
    max_completion_tokens: 1000,
    messages: [
      { role: "system", content: "Bạn là trợ lý CSKH Zalo OA của SmartFurni. Soạn câu trả lời tiếng Việt ngắn, tự nhiên, tiếp nối đúng cách xưng hô của hội thoại. Không bịa giá, khuyến mãi, tồn kho, bảo hành hoặc chính sách. Không gây áp lực mua, không yêu cầu dữ liệu nhạy cảm. Nếu thiếu dữ liệu thì chuyển nhân viên. Chỉ trả JSON hợp lệ dạng {reply,confidence,reasoning}." },
      { role: "user", content: JSON.stringify({ customerName, latestIncomingMessage: incomingMessage, conversation: history }) },
    ],
  });
  const result = parseAiJson(response.choices[0]?.message?.content || "");
  const id = `zq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO crm_zalo_ai_queue (id,user_id,customer_name,incoming_message,suggested_reply,confidence,reasoning,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'draft') RETURNING *`,
    [id, input.userId, customerName, incomingMessage, result.reply, result.confidence, result.reasoning],
  );
  await query(`UPDATE crm_zalo_conversations SET ai_status='draft_ready',updated_at=NOW() WHERE user_id=$1`, [input.userId]);
  const autoSend = await canAutoSend(config, conversation, result.confidence);
  if (autoSend) {
    const sent = await sendZaloConsultation({ userId: input.userId, content: result.reply, source: "ai", aiConfidence: result.confidence });
    await query(`UPDATE crm_zalo_ai_queue SET status=$2,updated_at=NOW() WHERE id=$1`, [id, sent.ok ? "sent" : "failed"]);
    rows[0].status = sent.ok ? "sent" : "failed";
  }
  return { item: mapQueue(rows[0]), autoSend };
}

async function canAutoSend(config: ZaloOAConfig, conversation: ZaloConversation | null, confidence: number): Promise<boolean> {
  if (!config.aiAutoSend || config.requireApproval || confidence < config.aiConfidenceThreshold || !isWithinSevenDays(conversation?.lastUserInteraction || null)) return false;
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  if (hour < config.businessHoursStart || hour > config.businessHoursEnd) return false;
  const rows = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM crm_zalo_messages WHERE source='ai' AND status IN ('sent','delivered','read') AND created_at >= CURRENT_DATE`);
  return Number(rows[0]?.count || 0) < config.maxAutoMessagesPerDay;
}

export async function reviewZaloAiQueue(id: string, action: "approve" | "reject"): Promise<{ ok: boolean; error?: string }> {
  await initZaloOASchema();
  const rows = await query<Record<string, unknown>>(`SELECT * FROM crm_zalo_ai_queue WHERE id=$1`, [id]);
  if (!rows[0]) return { ok: false, error: "Không tìm thấy bản nháp AI." };
  const item = mapQueue(rows[0]);
  if (item.status !== "draft") return { ok: false, error: "Bản nháp này đã được xử lý." };
  if (action === "reject") {
    await query(`UPDATE crm_zalo_ai_queue SET status='rejected',updated_at=NOW() WHERE id=$1`, [id]);
    return { ok: true };
  }
  await query(`UPDATE crm_zalo_ai_queue SET status='approved',updated_at=NOW() WHERE id=$1`, [id]);
  const result = await sendZaloConsultation({ userId: item.userId, content: item.suggestedReply, source: "ai", aiConfidence: item.confidence });
  await query(`UPDATE crm_zalo_ai_queue SET status=$2,updated_at=NOW() WHERE id=$1`, [id, result.ok ? "sent" : "failed"]);
  return result;
}

function zaloEventContent(eventName: string, message?: Record<string, unknown>): { content: string; attachment: Record<string, unknown> } {
  const text = String(message?.text || message?.content || "").trim();
  const rawAttachments = message?.attachments ?? message?.attachment;
  const sourceItems = Array.isArray(rawAttachments) ? rawAttachments : rawAttachments ? [rawAttachments] : [];
  const items = sourceItems.map(value => {
    const item = asRecord(value);
    const payload = asRecord(item.payload);
    return {
      type: String(item.type || payload.type || eventName.replace(/^(user|oa|anonymous)_send_/, "") || "file"),
      url: String(payload.url || item.url || payload.download_url || item.download_url || ""),
      thumbnail: String(payload.thumbnail || payload.thumbnail_url || item.thumbnail || item.thumbnail_url || ""),
      name: String(payload.name || payload.file_name || item.name || item.file_name || ""),
      size: Number(payload.size || item.size || 0),
      raw: item,
    };
  });
  if (!items.length && (message?.url || message?.thumbnail)) {
    items.push({
      type: eventName.replace(/^(user|oa|anonymous)_send_/, "") || "file",
      url: String(message.url || ""), thumbnail: String(message.thumbnail || ""),
      name: String(message.file_name || message.name || ""), size: Number(message.size || 0), raw: message,
    });
  }
  const attachment = items.length ? { items } : {};
  if (text) return { content: text, attachment };
  const labels: Record<string, string> = {
    image: "[Hình ảnh]", link: "[Liên kết]", audio: "[Âm thanh]", video: "[Video]",
    sticker: "[Sticker]", location: "[Vị trí]", business_card: "[Danh thiếp]", file: "[Tệp đính kèm]", gif: "[Ảnh GIF]",
  };
  const suffix = Object.keys(labels).find(key => eventName.includes(key));
  return { content: suffix ? labels[suffix] : "[Tin nhắn Zalo]", attachment };
}

function zaloPartyId(value?: Record<string, unknown>): string {
  return String(value?.id || value?.user_id || value?.anonymous_id || value?.uid || "").trim();
}

function zaloMessageId(event: Record<string, unknown>, message?: Record<string, unknown>): string {
  return String(
    message?.msg_id || message?.message_id || event.msg_id || event.message_id ||
    event.source_message_id || event.user_message_id || "",
  ).trim();
}

function zaloEventTime(event: Record<string, unknown>): string {
  const raw = event.timestamp || event.time || event.created_at;
  const numeric = Number(raw);
  const date = Number.isFinite(numeric) && numeric > 0
    ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : new Date(String(raw || ""));
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

async function updateZaloDeliveryReceipt(
  eventName: string,
  event: Record<string, unknown>,
  message?: Record<string, unknown>,
): Promise<boolean> {
  if (!new Set(["user_received_message", "user_seen_message"]).has(eventName)) return false;
  const sender = asRecord(event.sender);
  const recipient = asRecord(event.recipient);
  const userId = zaloPartyId(sender) || zaloPartyId(recipient);
  const messageId = zaloMessageId(event, message);
  const read = eventName === "user_seen_message";
  const status = read ? "read" : "delivered";
  const atColumn = read ? "read_at" : "delivered_at";
  if (messageId) {
    const updated = await query<{ id: string }>(
      `UPDATE crm_zalo_messages SET status=$2,${atColumn}=NOW()
       WHERE direction='outbound' AND (zalo_message_id=$1 OR id=$3) RETURNING id`,
      [messageId, status, `zalo-${messageId}`],
    );
    if (updated.length) return true;
  }
  if (!userId) return false;
  await query(
    `UPDATE crm_zalo_messages SET status=$2,${atColumn}=NOW()
     WHERE conversation_user_id=$1 AND direction='outbound' AND status IN ('pending','sent','delivered')`,
    [userId, status],
  );
  return true;
}

export async function recordZaloWebhookReceipt(input: {
  eventName: string; status: "received" | "processed" | "ignored" | "error"; error?: string;
}): Promise<void> {
  await initZaloOASchema();
  await query(
    `UPDATE crm_zalo_config SET webhook_last_received_at=NOW(),webhook_last_event=$1,webhook_last_status=$2,webhook_last_error=$3 WHERE id='default'`,
    [input.eventName.slice(0, 100), input.status, String(input.error || "").slice(0, 240)],
  );
}

export async function recordZaloWebhookEvent(payload: Record<string, unknown>): Promise<{ handled: boolean; aiQueued?: boolean }> {
  await initZaloOASchema();
  const nested = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : null;
  const event = nested && nested.event_name ? nested : payload;
  const eventName = String(event.event_name || payload.event_name || "").trim();
  const sender = asRecord(event.sender);
  const recipient = asRecord(event.recipient);
  const message = Object.keys(asRecord(event.message)).length ? asRecord(event.message) : undefined;
  if (await updateZaloDeliveryReceipt(eventName, event, message)) return { handled: true, aiQueued: false };
  const inbound = eventName.startsWith("user_send_") || eventName.startsWith("anonymous_send_");
  const outbound = eventName.startsWith("oa_send_") && !eventName.startsWith("oa_send_group_");
  if (!inbound && !outbound) return { handled: false };
  const userId = zaloPartyId(inbound ? sender : recipient);
  if (!userId || !message) return { handled: false };
  const { content, attachment } = zaloEventContent(eventName, message);
  const messageId = zaloMessageId(event, message);
  const id = messageId ? `zalo-${messageId}` : `zin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (messageId) {
    const existing = await query<{ id: string; direction: string }>(
      `SELECT id,direction FROM crm_zalo_messages WHERE id=$1 OR zalo_message_id=$2 ORDER BY created_at DESC LIMIT 1`,
      [id, messageId],
    );
    if (existing.length) {
      if (outbound) {
        await query(
          `UPDATE crm_zalo_messages SET status='delivered',delivered_at=COALESCE(delivered_at,NOW()),
           attachment=CASE WHEN $2::jsonb='{}'::jsonb THEN attachment ELSE $2::jsonb END,error=''
           WHERE id=$1`,
          [existing[0].id, JSON.stringify(attachment)],
        );
      }
      return { handled: true, aiQueued: false };
    }
  }
  const person = inbound ? sender : recipient;
  const displayName = String(person.name || person.display_name || "Khách Zalo");
  const avatar = String(person.avatar || person.avatar_url || "");
  const eventAt = zaloEventTime(event);
  if (inbound) {
    await query(
      `INSERT INTO crm_zalo_conversations (user_id,display_name,avatar,last_user_interaction,last_message_preview,last_message_at,unread_count,ai_status)
       VALUES ($1,$2,$3,$4,$5,$4,1,'analyzing')
       ON CONFLICT (user_id) DO UPDATE SET display_name=CASE WHEN EXCLUDED.display_name='Khách Zalo' THEN crm_zalo_conversations.display_name ELSE EXCLUDED.display_name END,
       avatar=CASE WHEN EXCLUDED.avatar='' THEN crm_zalo_conversations.avatar ELSE EXCLUDED.avatar END,
       last_user_interaction=EXCLUDED.last_user_interaction,last_message_preview=EXCLUDED.last_message_preview,last_message_at=EXCLUDED.last_message_at,
       unread_count=crm_zalo_conversations.unread_count+1,ai_status='analyzing',updated_at=NOW()`,
      [userId, displayName, avatar, eventAt, content],
    );
  } else {
    await query(
      `INSERT INTO crm_zalo_conversations (user_id,display_name,avatar,last_message_preview,last_message_at,unread_count,ai_status)
       VALUES ($1,$2,$3,$4,$5,0,'idle')
       ON CONFLICT (user_id) DO UPDATE SET display_name=CASE WHEN EXCLUDED.display_name='Khách Zalo' THEN crm_zalo_conversations.display_name ELSE EXCLUDED.display_name END,
       avatar=CASE WHEN EXCLUDED.avatar='' THEN crm_zalo_conversations.avatar ELSE EXCLUDED.avatar END,
       last_message_preview=EXCLUDED.last_message_preview,last_message_at=EXCLUDED.last_message_at,updated_at=NOW()`,
      [userId, displayName, avatar, content, eventAt],
    );
  }
  const inserted = await query<{ id: string }>(
    `INSERT INTO crm_zalo_messages (id,conversation_user_id,direction,category,content,attachment,status,source,zalo_message_id,created_at,sent_at,delivered_at)
     VALUES ($1,$2,$3,'consultation',$4,$5::jsonb,'delivered','webhook',$6,$7,CASE WHEN $3='outbound' THEN $7::timestamptz ELSE NULL END,$7)
     ON CONFLICT (id) DO NOTHING RETURNING id`,
    [id, userId, inbound ? "inbound" : "outbound", content, JSON.stringify(attachment), messageId, eventAt],
  );
  if (!inserted.length) return { handled: true, aiQueued: false };
  if (inbound && eventName === "user_send_text" && String(message.text || "").trim()) {
    try { await generateZaloAiDraft({ userId, incomingMessage: content, customerName: displayName }); return { handled: true, aiQueued: true }; }
    catch (error) {
      await query(`UPDATE crm_zalo_conversations SET ai_status=$2,updated_at=NOW() WHERE user_id=$1`, [userId, `error:${error instanceof Error ? error.message.slice(0, 160) : "unknown"}`]);
      return { handled: true, aiQueued: false };
    }
  }
  if (inbound) await query(`UPDATE crm_zalo_conversations SET ai_status='idle',updated_at=NOW() WHERE user_id=$1`, [userId]);
  return { handled: true, aiQueued: false };
}

export function verifyZaloWebhookSignature(rawBody: string, signature: string | null, config: ZaloOAConfig): boolean {
  const secret = config.oaSecretKey || config.appSecret;
  if (!signature || !config.appId || !secret) return false;
  let timestamp = "";
  const dataCandidates = new Set<string>([rawBody]);
  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    const nested = parsed.data && typeof parsed.data === "object" ? parsed.data as Record<string, unknown> : null;
    timestamp = String(parsed.timestamp || nested?.timestamp || "");
    if (parsed.data !== undefined) dataCandidates.add(typeof parsed.data === "string" ? parsed.data : JSON.stringify(parsed.data));
  } catch { return false; }
  const supplied = signature.replace(/^mac=/i, "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  const suppliedBuffer = Buffer.from(supplied, "hex");
  for (const data of dataCandidates) {
    const expected = createHash("sha256").update(`${config.appId}${data}${timestamp}${secret}`).digest();
    if (expected.length === suppliedBuffer.length && timingSafeEqual(expected, suppliedBuffer)) return true;
  }
  return false;
}
