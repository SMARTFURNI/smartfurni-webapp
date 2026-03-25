/**
 * CRM Notifications Store
 * Handles: Auto-assign rules, Zalo OA messaging, SMS reminders, overdue alerts
 */
import { query } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationChannel = "zalo" | "sms" | "email" | "in_app";
export type NotificationTrigger =
  | "lead_overdue"        // KH không tương tác quá X ngày
  | "stage_changed"       // KH chuyển giai đoạn
  | "task_due"            // Việc cần làm đến hạn
  | "appointment_remind"  // Nhắc lịch hẹn
  | "lead_assigned"       // KH được phân công
  | "quote_sent"          // Báo giá đã gửi
  | "contract_signed"     // Hợp đồng đã ký
  | "nps_survey";         // Gửi khảo sát NPS

export interface NotificationRule {
  id: string;
  name: string;
  trigger: NotificationTrigger;
  channels: NotificationChannel[];
  isActive: boolean;
  config: {
    // For overdue: days threshold
    overdueDays?: number;
    // For stage_changed: which stages
    stages?: string[];
    // For task_due: minutes before
    minutesBefore?: number;
    // Message template (supports {{name}}, {{stage}}, {{assignedTo}}, {{phone}})
    messageTemplate: string;
    // Zalo OA template ID (if using Zalo template message)
    zaloTemplateId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ZaloConfig {
  oaId: string;
  accessToken: string;
  refreshToken: string;
  webhookVerifyToken: string;
  isActive: boolean;
  updatedAt: string;
}

export interface SmsConfig {
  provider: "twilio" | "esms" | "speedsms" | "vietguys";
  apiKey: string;
  apiSecret: string;
  senderId: string;
  isActive: boolean;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  channel: NotificationChannel;
  recipient: string;       // phone or zalo uid
  leadId?: string;
  leadName?: string;
  message: string;
  status: "sent" | "failed" | "pending";
  error?: string;
  sentAt: string;
}

export interface AssignmentRule {
  id: string;
  name: string;
  province: string;         // Tỉnh/thành phố
  districts: string[];      // Quận/huyện (empty = all)
  staffId: string;          // ID nhân viên được phân công
  staffName: string;
  priority: number;         // Thứ tự ưu tiên (1 = cao nhất)
  isActive: boolean;
  leadTypes: string[];      // ["architect", "investor", "dealer"] or []
  sources: string[];        // ["Facebook Ads", ...] or []
}

// ─── Schema Init ──────────────────────────────────────────────────────────────

export async function initNotificationsSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_notification_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger TEXT NOT NULL,
      channels JSONB NOT NULL DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT true,
      config JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_notification_logs (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      lead_id TEXT,
      lead_name TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_zalo_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      oa_id TEXT NOT NULL DEFAULT '',
      access_token TEXT NOT NULL DEFAULT '',
      refresh_token TEXT NOT NULL DEFAULT '',
      webhook_verify_token TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_sms_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      provider TEXT NOT NULL DEFAULT 'esms',
      api_key TEXT NOT NULL DEFAULT '',
      api_secret TEXT NOT NULL DEFAULT '',
      sender_id TEXT NOT NULL DEFAULT 'SmartFurni',
      is_active BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_assignment_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      province TEXT NOT NULL,
      districts JSONB NOT NULL DEFAULT '[]',
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT true,
      lead_types JSONB NOT NULL DEFAULT '[]',
      sources JSONB NOT NULL DEFAULT '[]'
    );

    INSERT INTO crm_zalo_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
    INSERT INTO crm_sms_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
  `);
}

// ─── Notification Rules CRUD ──────────────────────────────────────────────────

export async function getNotificationRules(): Promise<NotificationRule[]> {
  try {
    await initNotificationsSchema();
    const rows = await query(
      `SELECT id, name, trigger, channels, is_active, config, created_at, updated_at
       FROM crm_notification_rules ORDER BY created_at DESC`
    );
    return rows.map(mapRule);
  } catch { return getDefaultRules(); }
}

export async function saveNotificationRule(rule: Omit<NotificationRule, "createdAt" | "updatedAt">): Promise<NotificationRule> {
  await initNotificationsSchema();
  const now = new Date().toISOString();
  const rows = await query(
    `INSERT INTO crm_notification_rules (id, name, trigger, channels, is_active, config, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, trigger = EXCLUDED.trigger,
       channels = EXCLUDED.channels, is_active = EXCLUDED.is_active,
       config = EXCLUDED.config, updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [rule.id, rule.name, rule.trigger, JSON.stringify(rule.channels), rule.isActive, JSON.stringify(rule.config), now]
  );
  return mapRule(rows[0]);
}

export async function deleteNotificationRule(id: string): Promise<void> {
  await query(`DELETE FROM crm_notification_rules WHERE id = $1`, [id]);
}

function mapRule(r: Record<string, unknown>): NotificationRule {
  return {
    id: r.id as string,
    name: r.name as string,
    trigger: r.trigger as NotificationTrigger,
    channels: (typeof r.channels === "string" ? JSON.parse(r.channels) : r.channels) as NotificationChannel[],
    isActive: r.is_active as boolean,
    config: (typeof r.config === "string" ? JSON.parse(r.config) : r.config) as NotificationRule["config"],
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function getDefaultRules(): NotificationRule[] {
  const now = new Date().toISOString();
  return [
    {
      id: "rule-overdue-3d",
      name: "Nhắc nhở KH quá hạn 3 ngày",
      trigger: "lead_overdue",
      channels: ["zalo", "in_app"],
      isActive: true,
      config: {
        overdueDays: 3,
        messageTemplate: "Xin chào {{assignedTo}}, khách hàng {{name}} chưa được liên hệ trong 3 ngày. Vui lòng follow-up sớm.",
      },
      createdAt: now, updatedAt: now,
    },
    {
      id: "rule-task-due-30m",
      name: "Nhắc lịch hẹn trước 30 phút",
      trigger: "appointment_remind",
      channels: ["zalo", "sms"],
      isActive: true,
      config: {
        minutesBefore: 30,
        messageTemplate: "SmartFurni nhắc: Bạn có lịch hẹn với {{name}} lúc {{time}}. Địa điểm: {{location}}",
      },
      createdAt: now, updatedAt: now,
    },
    {
      id: "rule-lead-assigned",
      name: "Thông báo khi được phân công KH",
      trigger: "lead_assigned",
      channels: ["zalo", "in_app"],
      isActive: true,
      config: {
        messageTemplate: "Bạn vừa được phân công khách hàng mới: {{name}} ({{phone}}). Nguồn: {{source}}. Vui lòng liên hệ sớm.",
      },
      createdAt: now, updatedAt: now,
    },
    {
      id: "rule-contract-signed",
      name: "Thông báo hợp đồng đã ký",
      trigger: "contract_signed",
      channels: ["zalo"],
      isActive: true,
      config: {
        messageTemplate: "🎉 Chúc mừng! Hợp đồng với {{name}} đã được ký thành công. Giá trị: {{value}} VND.",
      },
      createdAt: now, updatedAt: now,
    },
  ];
}

// ─── Zalo Config ──────────────────────────────────────────────────────────────

export async function getZaloConfig(): Promise<ZaloConfig> {
  try {
    await initNotificationsSchema();
    const rows = await query(`SELECT * FROM crm_zalo_config WHERE id = 'default'`);
    if (!rows[0]) return getDefaultZaloConfig();
    const r = rows[0] as Record<string, unknown>;
    return {
      oaId: r.oa_id as string,
      accessToken: r.access_token as string,
      refreshToken: r.refresh_token as string,
      webhookVerifyToken: r.webhook_verify_token as string,
      isActive: r.is_active as boolean,
      updatedAt: String(r.updated_at),
    };
  } catch { return getDefaultZaloConfig(); }
}

export async function saveZaloConfig(config: Partial<ZaloConfig>): Promise<void> {
  await initNotificationsSchema();
  await query(
    `UPDATE crm_zalo_config SET
      oa_id = COALESCE($1, oa_id),
      access_token = COALESCE($2, access_token),
      refresh_token = COALESCE($3, refresh_token),
      webhook_verify_token = COALESCE($4, webhook_verify_token),
      is_active = COALESCE($5, is_active),
      updated_at = NOW()
     WHERE id = 'default'`,
    [config.oaId, config.accessToken, config.refreshToken, config.webhookVerifyToken, config.isActive]
  );
}

function getDefaultZaloConfig(): ZaloConfig {
  return { oaId: "", accessToken: "", refreshToken: "", webhookVerifyToken: "", isActive: false, updatedAt: new Date().toISOString() };
}

// ─── SMS Config ───────────────────────────────────────────────────────────────

export async function getSmsConfig(): Promise<SmsConfig> {
  try {
    await initNotificationsSchema();
    const rows = await query(`SELECT * FROM crm_sms_config WHERE id = 'default'`);
    if (!rows[0]) return getDefaultSmsConfig();
    const r = rows[0] as Record<string, unknown>;
    return {
      provider: r.provider as SmsConfig["provider"],
      apiKey: r.api_key as string,
      apiSecret: r.api_secret as string,
      senderId: r.sender_id as string,
      isActive: r.is_active as boolean,
      updatedAt: String(r.updated_at),
    };
  } catch { return getDefaultSmsConfig(); }
}

export async function saveSmsConfig(config: Partial<SmsConfig>): Promise<void> {
  await initNotificationsSchema();
  await query(
    `UPDATE crm_sms_config SET
      provider = COALESCE($1, provider),
      api_key = COALESCE($2, api_key),
      api_secret = COALESCE($3, api_secret),
      sender_id = COALESCE($4, sender_id),
      is_active = COALESCE($5, is_active),
      updated_at = NOW()
     WHERE id = 'default'`,
    [config.provider, config.apiKey, config.apiSecret, config.senderId, config.isActive]
  );
}

function getDefaultSmsConfig(): SmsConfig {
  return { provider: "esms", apiKey: "", apiSecret: "", senderId: "SmartFurni", isActive: false, updatedAt: new Date().toISOString() };
}

// ─── Assignment Rules CRUD ────────────────────────────────────────────────────

export async function getAssignmentRules(): Promise<AssignmentRule[]> {
  try {
    await initNotificationsSchema();
    const rows = await query(`SELECT * FROM crm_assignment_rules ORDER BY priority ASC`);
    return rows.map(mapAssignmentRule);
  } catch { return []; }
}

export async function saveAssignmentRule(rule: AssignmentRule): Promise<AssignmentRule> {
  await initNotificationsSchema();
  const rows = await query(
    `INSERT INTO crm_assignment_rules (id, name, province, districts, staff_id, staff_name, priority, is_active, lead_types, sources)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, province = EXCLUDED.province,
       districts = EXCLUDED.districts, staff_id = EXCLUDED.staff_id,
       staff_name = EXCLUDED.staff_name, priority = EXCLUDED.priority,
       is_active = EXCLUDED.is_active, lead_types = EXCLUDED.lead_types,
       sources = EXCLUDED.sources
     RETURNING *`,
    [
      rule.id, rule.name, rule.province,
      JSON.stringify(rule.districts), rule.staffId, rule.staffName,
      rule.priority, rule.isActive,
      JSON.stringify(rule.leadTypes), JSON.stringify(rule.sources),
    ]
  );
  return mapAssignmentRule(rows[0]);
}

export async function deleteAssignmentRule(id: string): Promise<void> {
  await query(`DELETE FROM crm_assignment_rules WHERE id = $1`, [id]);
}

function mapAssignmentRule(r: Record<string, unknown>): AssignmentRule {
  return {
    id: r.id as string,
    name: r.name as string,
    province: r.province as string,
    districts: (typeof r.districts === "string" ? JSON.parse(r.districts) : r.districts) as string[],
    staffId: r.staff_id as string,
    staffName: r.staff_name as string,
    priority: r.priority as number,
    isActive: r.is_active as boolean,
    leadTypes: (typeof r.lead_types === "string" ? JSON.parse(r.lead_types) : r.lead_types) as string[],
    sources: (typeof r.sources === "string" ? JSON.parse(r.sources) : r.sources) as string[],
  };
}

// ─── Notification Logs ────────────────────────────────────────────────────────

export async function getNotificationLogs(limit = 50): Promise<NotificationLog[]> {
  try {
    await initNotificationsSchema();
    const rows = await query(
      `SELECT * FROM crm_notification_logs ORDER BY sent_at DESC LIMIT $1`, [limit]
    );
    return rows.map(r => ({
      id: r.id as string,
      ruleId: r.rule_id as string,
      ruleName: r.rule_name as string,
      channel: r.channel as NotificationChannel,
      recipient: r.recipient as string,
      leadId: r.lead_id as string | undefined,
      leadName: r.lead_name as string | undefined,
      message: r.message as string,
      status: r.status as NotificationLog["status"],
      error: r.error as string | undefined,
      sentAt: String(r.sent_at),
    }));
  } catch { return []; }
}

export async function logNotification(log: Omit<NotificationLog, "id" | "sentAt">): Promise<void> {
  try {
    await initNotificationsSchema();
    const id = `nlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await query(
      `INSERT INTO crm_notification_logs (id, rule_id, rule_name, channel, recipient, lead_id, lead_name, message, status, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, log.ruleId, log.ruleName, log.channel, log.recipient, log.leadId ?? null, log.leadName ?? null, log.message, log.status, log.error ?? null]
    );
  } catch { /* silent */ }
}

// ─── Zalo OA Message Sender ───────────────────────────────────────────────────

export async function sendZaloMessage(phone: string, message: string, zaloUid?: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getZaloConfig();
  if (!config.isActive || !config.accessToken) {
    return { ok: false, error: "Zalo OA chưa được cấu hình hoặc chưa kích hoạt" };
  }
  try {
    const recipient = zaloUid ? { user_id: zaloUid } : { phone };
    const res = await fetch("https://openapi.zalo.me/v2.0/oa/message/cs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": config.accessToken,
      },
      body: JSON.stringify({
        recipient,
        message: { text: message },
      }),
    });
    const data = await res.json() as { error: number; message: string };
    if (data.error !== 0) return { ok: false, error: data.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── SMS Sender (eSMS Vietnam) ────────────────────────────────────────────────

export async function sendSms(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getSmsConfig();
  if (!config.isActive || !config.apiKey) {
    return { ok: false, error: "SMS chưa được cấu hình hoặc chưa kích hoạt" };
  }
  try {
    if (config.provider === "esms") {
      const url = `http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ApiKey: config.apiKey,
          Content: message,
          Phone: phone,
          SecretKey: config.apiSecret,
          SmsType: "2",
          Brandname: config.senderId,
        }),
      });
      const data = await res.json() as { CodeResult: string; ErrorMessage: string };
      if (data.CodeResult !== "100") return { ok: false, error: data.ErrorMessage };
      return { ok: true };
    }
    // SpeedSMS
    if (config.provider === "speedsms") {
      const res = await fetch("https://api.speedsms.vn/index.php/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(`${config.apiKey}:x`).toString("base64")}`,
        },
        body: JSON.stringify({
          to: [phone],
          content: message,
          sms_type: 2,
          sender: config.senderId,
        }),
      });
      const data = await res.json() as { status: string; message: string };
      if (data.status !== "success") return { ok: false, error: data.message };
      return { ok: true };
    }
    return { ok: false, error: `Provider ${config.provider} chưa được hỗ trợ` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
