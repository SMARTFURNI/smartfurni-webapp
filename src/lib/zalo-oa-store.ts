import { createHash } from "crypto";
import OpenAI from "openai";
import { query } from "@/lib/db";

export type ZaloMessageCategory = "consultation" | "zbs_transaction" | "zbs_after_sale";
export type ZaloMessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";
export type ZaloQueueStatus = "draft" | "approved" | "sent" | "rejected" | "failed";

export interface ZaloOAConfig {
  oaId: string;
  appId: string;
  appSecret: string;
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

export interface ZaloOAPublicConfig extends Omit<ZaloOAConfig, "appSecret" | "accessToken" | "refreshToken"> {
  appSecretConfigured: boolean;
  accessTokenConfigured: boolean;
  refreshTokenConfigured: boolean;
  webhookUrl: string;
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
  source: "manual" | "ai" | "webhook";
  templateId: string;
  zaloMessageId: string;
  aiConfidence: number | null;
  error: string;
  createdAt: string;
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
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS ai_auto_send BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS ai_model TEXT NOT NULL DEFAULT '${DEFAULT_MODEL}';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS ai_confidence_threshold NUMERIC NOT NULL DEFAULT 0.9;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS max_auto_messages_per_day INTEGER NOT NULL DEFAULT 30;
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS business_hours_start TEXT NOT NULL DEFAULT '08:00';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS business_hours_end TEXT NOT NULL DEFAULT '20:00';
    ALTER TABLE crm_zalo_config ADD COLUMN IF NOT EXISTS zbs_enabled BOOLEAN NOT NULL DEFAULT false;

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
      oa_id=$1, app_id=$2, app_secret=$3, access_token=$4, refresh_token=$5,
      is_active=$6, ai_enabled=$7, ai_auto_send=$8, require_approval=$9,
      ai_model=$10, ai_confidence_threshold=$11, max_auto_messages_per_day=$12,
      business_hours_start=$13, business_hours_end=$14, zbs_enabled=$15, updated_at=NOW()
     WHERE id='default'`,
    [
      input.oaId ?? current.oaId,
      input.appId ?? current.appId,
      keep(input.appSecret, current.appSecret),
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
    source: String(row.source) as "manual" | "ai" | "webhook", templateId: String(row.template_id || ""),
    zaloMessageId: String(row.zalo_message_id || ""), aiConfidence: row.ai_confidence == null ? null : Number(row.ai_confidence),
    error: String(row.error || ""), createdAt: String(row.created_at),
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
  const { appSecret: _appSecret, accessToken: _accessToken, refreshToken: _refreshToken, ...safeConfig } = config;
  return {
    config: {
      ...safeConfig,
      appSecretConfigured: Boolean(config.appSecret), accessTokenConfigured: Boolean(config.accessToken),
      refreshTokenConfigured: Boolean(config.refreshToken), webhookUrl: `${baseUrl}${WEBHOOK_PATH}`,
    },
    stats: {
      total: Number(s.total || 0), sent: Number(s.sent || 0), failed: Number(s.failed || 0), pending: Number(s.pending || 0),
      conversations: conversations.length, unread: conversations.reduce((sum, item) => sum + item.unreadCount, 0),
      aiDrafts: aiQueue.filter(item => item.status === "draft").length, sentToday: Number(s.sent_today || 0),
    },
    templates, conversations, messages: messageRows.map(mapMessage), aiQueue,
  };
}

async function insertOutboundMessage(input: {
  userId: string; content: string; category: ZaloMessageCategory; source: "manual" | "ai";
  templateId?: string; aiConfidence?: number;
}): Promise<string> {
  const id = `zm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO crm_zalo_messages (id,conversation_user_id,direction,category,content,status,source,template_id,ai_confidence)
     VALUES ($1,$2,'outbound',$3,$4,'pending',$5,$6,$7)`,
    [id, input.userId, input.category, input.content, input.source, input.templateId || "", input.aiConfidence ?? null],
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

export async function recordZaloWebhookEvent(payload: Record<string, unknown>): Promise<{ handled: boolean; aiQueued?: boolean }> {
  await initZaloOASchema();
  const nested = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : null;
  const event = nested && nested.event_name ? nested : payload;
  const eventName = String(event.event_name || payload.event_name || "");
  const sender = event.sender as Record<string, unknown> | undefined;
  const message = event.message as Record<string, unknown> | undefined;
  const userId = String(sender?.id || "");
  const text = String(message?.text || "").trim();
  const messageId = String(message?.msg_id || message?.message_id || "");
  if (eventName === "user_send_text" && userId && text) {
    const id = messageId ? `zalo-${messageId}` : `zin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (messageId) {
      const existing = await query<{ id: string }>(`SELECT id FROM crm_zalo_messages WHERE id=$1 LIMIT 1`, [id]);
      if (existing.length) return { handled: true, aiQueued: false };
    }
    const displayName = String(sender?.name || "Khách Zalo");
    await query(
      `INSERT INTO crm_zalo_conversations (user_id,display_name,last_user_interaction,last_message_preview,last_message_at,unread_count,ai_status)
       VALUES ($1,$2,NOW(),$3,NOW(),1,'analyzing')
       ON CONFLICT (user_id) DO UPDATE SET display_name=CASE WHEN EXCLUDED.display_name='Khách Zalo' THEN crm_zalo_conversations.display_name ELSE EXCLUDED.display_name END,
       last_user_interaction=NOW(),last_message_preview=EXCLUDED.last_message_preview,last_message_at=NOW(),unread_count=crm_zalo_conversations.unread_count+1,ai_status='analyzing',updated_at=NOW()`,
      [userId, displayName, text],
    );
    const inserted = await query<{ id: string }>(
      `INSERT INTO crm_zalo_messages (id,conversation_user_id,direction,category,content,status,source,zalo_message_id)
       VALUES ($1,$2,'inbound','consultation',$3,'delivered','webhook',$4) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [id, userId, text, messageId],
    );
    if (!inserted.length) return { handled: true, aiQueued: false };
    try { await generateZaloAiDraft({ userId, incomingMessage: text, customerName: displayName }); return { handled: true, aiQueued: true }; }
    catch (error) {
      await query(`UPDATE crm_zalo_conversations SET ai_status=$2,updated_at=NOW() WHERE user_id=$1`, [userId, `error:${error instanceof Error ? error.message.slice(0, 160) : "unknown"}`]);
      return { handled: true, aiQueued: false };
    }
  }
  if (["oa_send_text", "oa_send_image"].includes(eventName)) return { handled: true };
  return { handled: false };
}

export function verifyZaloWebhookSignature(rawBody: string, signature: string | null, config: ZaloOAConfig): boolean {
  if (!signature || !config.appId || !config.appSecret) return false;
  let timestamp = "";
  let data = rawBody;
  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    timestamp = String(parsed.timestamp || "");
    if (parsed.data !== undefined) data = typeof parsed.data === "string" ? parsed.data : JSON.stringify(parsed.data);
  } catch { return false; }
  const expected = createHash("sha256").update(`${config.appId}${data}${timestamp}${config.appSecret}`).digest("hex");
  const supplied = signature.replace(/^mac=/i, "").trim().toLowerCase();
  return supplied === expected;
}
