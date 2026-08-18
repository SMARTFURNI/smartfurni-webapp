import "server-only";

import { randomUUID } from "crypto";
import { query, queryOne } from "./db";
import type { Lead } from "./crm-types";
import type {
  ZaloFriendshipSettings,
  ZaloFriendshipStatus,
  ZaloFriendshipSummary,
} from "./crm-zalo-friendship-types";
import { listZaloAccounts, type ZaloAccountRecord } from "./zalo-account-store";
import {
  acceptZaloFriendRequest,
  findZaloUserByPhone,
  getZaloFriendRequestStatus,
  sendZaloFriendRequest,
  undoZaloFriendRequest,
} from "./zalo-gateway";
import {
  buildZaloFriendRequestMessage,
  cleanZaloFriendshipText,
  getLeadProductLabel,
  normalizeZaloFriendPhone,
} from "./crm-zalo-friendship-message";

export { buildZaloFriendRequestMessage, getLeadProductLabel, normalizeZaloFriendPhone } from "./crm-zalo-friendship-message";

const DEFAULT_SETTINGS: ZaloFriendshipSettings = {
  enabled: true,
  initialDelayMinutes: 0,
  retryAfterHours: 72,
  resendDelayMinutes: 15,
  maxRetries: 2,
  dailyCapPerAccount: 30,
  sendStartHour: 8,
  sendStartMinute: 30,
  sendEndHour: 19,
  sendEndMinute: 30,
  reconciliationMinutes: 30,
  initialMessageTemplate: "Chào {first_name}, tôi là {staff_name}. Mình kết bạn để tiện tư vấn {product} nhé.",
  retryMessageTemplate: "Chào {first_name}, {staff_name} xin gửi lại lời mời. Mình kết bạn để tiện tư vấn {product} nhé.",
};

interface FriendshipRow {
  lead_id: string;
  phone: string;
  zalo_uid: string | null;
  zalo_display_name: string | null;
  zalo_avatar: string | null;
  account_id: string | null;
  account_label: string | null;
  status: ZaloFriendshipStatus;
  product_label: string | null;
  request_message: string | null;
  attempt_count: number;
  last_sent_at: string | null;
  next_action_at: string | null;
  accepted_at: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  auto_enabled: boolean;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
  previous_status?: ZaloFriendshipStatus;
}

let schemaPromise: Promise<void> | null = null;

async function createSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_zalo_friendship_settings (
      settings_key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS crm_zalo_friendships (
      lead_id TEXT PRIMARY KEY,
      phone TEXT NOT NULL DEFAULT '',
      zalo_uid TEXT,
      zalo_display_name TEXT,
      zalo_avatar TEXT,
      account_id TEXT,
      account_label TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      product_label TEXT,
      request_message TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMPTZ,
      next_action_at TIMESTAMPTZ,
      accepted_at TIMESTAMPTZ,
      last_checked_at TIMESTAMPTZ,
      last_error TEXT,
      auto_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      claimed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS crm_zalo_friendship_events (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      account_id TEXT,
      attempt_number INTEGER,
      detail JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_crm_zalo_friendships_due ON crm_zalo_friendships(status, next_action_at)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crm_zalo_friendships_uid ON crm_zalo_friendships(zalo_uid, account_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crm_zalo_friendship_events_lead ON crm_zalo_friendship_events(lead_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crm_zalo_friendship_events_daily ON crm_zalo_friendship_events(account_id, event_type, created_at DESC)`);
  await query(
    `INSERT INTO crm_zalo_friendship_settings (settings_key, data)
     VALUES ('default', $1::jsonb)
     ON CONFLICT (settings_key) DO NOTHING`,
    [JSON.stringify(DEFAULT_SETTINGS)],
  );
}

export async function ensureZaloFriendshipSchema() {
  if (!schemaPromise) schemaPromise = createSchema().catch(error => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

export async function getZaloFriendshipSettings(): Promise<ZaloFriendshipSettings> {
  await ensureZaloFriendshipSchema();
  const row = await queryOne<{ data: Partial<ZaloFriendshipSettings> | string }>(
    `SELECT data FROM crm_zalo_friendship_settings WHERE settings_key='default'`,
  );
  const data = typeof row?.data === "string" ? JSON.parse(row.data) : row?.data;
  return { ...DEFAULT_SETTINGS, ...(data || {}) };
}

export async function updateZaloFriendshipSettings(
  updates: Partial<ZaloFriendshipSettings>,
): Promise<ZaloFriendshipSettings> {
  const next = { ...(await getZaloFriendshipSettings()), ...updates };
  next.initialDelayMinutes = Math.max(0, Math.min(60, Number(next.initialDelayMinutes) || 0));
  next.retryAfterHours = Math.max(12, Math.min(720, Number(next.retryAfterHours) || 72));
  next.resendDelayMinutes = Math.max(5, Math.min(1440, Number(next.resendDelayMinutes) || 15));
  next.maxRetries = Math.max(0, Math.min(5, Number(next.maxRetries) || 0));
  next.dailyCapPerAccount = Math.max(1, Math.min(100, Number(next.dailyCapPerAccount) || 30));
  next.sendStartHour = Math.max(0, Math.min(23, Number(next.sendStartHour) || 0));
  next.sendStartMinute = Math.max(0, Math.min(59, Number(next.sendStartMinute) || 0));
  next.sendEndHour = Math.max(0, Math.min(23, Number(next.sendEndHour) || 0));
  next.sendEndMinute = Math.max(0, Math.min(59, Number(next.sendEndMinute) || 0));
  next.reconciliationMinutes = Math.max(5, Math.min(1440, Number(next.reconciliationMinutes) || 30));
  next.initialMessageTemplate = cleanZaloFriendshipText(next.initialMessageTemplate).slice(0, 300) || DEFAULT_SETTINGS.initialMessageTemplate;
  next.retryMessageTemplate = cleanZaloFriendshipText(next.retryMessageTemplate).slice(0, 300) || DEFAULT_SETTINGS.retryMessageTemplate;
  await query(
    `INSERT INTO crm_zalo_friendship_settings (settings_key, data, updated_at)
     VALUES ('default', $1::jsonb, NOW())
     ON CONFLICT (settings_key) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()`,
    [JSON.stringify(next)],
  );
  return next;
}

function isoDate(value: string | Date | null | undefined) {
  return value ? new Date(value).toISOString() : undefined;
}

function rowToSummary(row: FriendshipRow): ZaloFriendshipSummary {
  return {
    leadId: row.lead_id,
    status: row.status,
    accountId: row.account_id || undefined,
    accountLabel: row.account_label || undefined,
    zaloUid: row.zalo_uid || undefined,
    zaloDisplayName: row.zalo_display_name || undefined,
    zaloAvatar: row.zalo_avatar || undefined,
    attemptCount: Number(row.attempt_count || 0),
    requestMessage: row.request_message || undefined,
    lastSentAt: isoDate(row.last_sent_at),
    nextActionAt: isoDate(row.next_action_at),
    acceptedAt: isoDate(row.accepted_at),
    lastCheckedAt: isoDate(row.last_checked_at),
    lastError: row.last_error || undefined,
    autoEnabled: row.auto_enabled,
    updatedAt: isoDate(row.updated_at) || new Date().toISOString(),
  };
}

async function addEvent(row: FriendshipRow, eventType: string, detail: Record<string, unknown> = {}) {
  await query(
    `INSERT INTO crm_zalo_friendship_events
       (id, lead_id, event_type, account_id, attempt_number, detail)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [randomUUID(), row.lead_id, eventType, row.account_id, row.attempt_count, JSON.stringify(detail)],
  );
}

async function pauseSofaJourneyForLostFriendship(leadId: string): Promise<void> {
  const [{ B2C_SOFA_BED_JOURNEY_CODE }, store] = await Promise.all([
    import("@/lib/crm-b2c-sofa-bed-journey"),
    import("@/lib/crm-b2b-sofa-journey-store"),
  ]);
  const enrollment = await store.getJourneyEnrollmentForCode(B2C_SOFA_BED_JOURNEY_CODE, leadId);
  if (enrollment?.status === "active") {
    await store.pauseJourneyEnrollment(enrollment.id, "Tạm dừng – mất kết nối Zalo");
  }
}

function vietnamMinutes(date: Date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes() + 7 * 60;
}

function nextAllowedTime(date: Date, settings: ZaloFriendshipSettings) {
  const start = settings.sendStartHour * 60 + settings.sendStartMinute;
  const end = settings.sendEndHour * 60 + settings.sendEndMinute;
  const localMinutes = ((vietnamMinutes(date) % 1440) + 1440) % 1440;
  if (localMinutes >= start && localMinutes <= end) return date;
  const addMinutes = localMinutes < start ? start - localMinutes : 1440 - localMinutes + start;
  return new Date(date.getTime() + addMinutes * 60_000);
}

function nextPendingCheck(lastSentAt: Date, settings: ZaloFriendshipSettings) {
  const reconciliationAt = Date.now() + settings.reconciliationMinutes * 60_000;
  const retryAt = lastSentAt.getTime() + settings.retryAfterHours * 3600_000;
  return new Date(Math.min(reconciliationAt, retryAt));
}

export async function enqueueZaloFriendshipForLead(lead: Lead): Promise<void> {
  await ensureZaloFriendshipSchema();
  const settings = await getZaloFriendshipSettings();
  const phone = normalizeZaloFriendPhone(lead.zaloPhone || lead.phone);
  const productLabel = getLeadProductLabel(lead.interestedProducts);
  const status: ZaloFriendshipStatus = phone && productLabel ? "queued" : "waiting_data";
  const due = nextAllowedTime(new Date(Date.now() + settings.initialDelayMinutes * 60_000), settings);
  await query(
    `INSERT INTO crm_zalo_friendships
       (lead_id, phone, status, product_label, request_message, next_action_at, auto_enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (lead_id) DO UPDATE SET
       phone=EXCLUDED.phone,
       product_label=EXCLUDED.product_label,
       request_message=CASE WHEN crm_zalo_friendships.attempt_count=0 THEN EXCLUDED.request_message ELSE crm_zalo_friendships.request_message END,
       status=CASE
         WHEN crm_zalo_friendships.status='waiting_data' AND EXCLUDED.status='queued' THEN 'queued'
         ELSE crm_zalo_friendships.status
       END,
       next_action_at=CASE
         WHEN crm_zalo_friendships.status='waiting_data' AND EXCLUDED.status='queued' THEN EXCLUDED.next_action_at
         ELSE crm_zalo_friendships.next_action_at
       END,
       updated_at=NOW()`,
    [lead.id, phone, status, productLabel || null, buildZaloFriendRequestMessage(lead, 1, settings), due.toISOString(), true],
  );
}

export async function getZaloFriendshipSummary(leadId: string): Promise<ZaloFriendshipSummary | null> {
  await ensureZaloFriendshipSchema();
  const row = await queryOne<FriendshipRow>(`SELECT * FROM crm_zalo_friendships WHERE lead_id=$1`, [leadId]);
  return row ? rowToSummary(row) : null;
}

export async function getZaloFriendshipSummaries(leadIds: string[]): Promise<Map<string, ZaloFriendshipSummary>> {
  if (!leadIds.length) return new Map();
  await ensureZaloFriendshipSchema();
  const rows = await query<FriendshipRow>(`SELECT * FROM crm_zalo_friendships WHERE lead_id=ANY($1::text[])`, [leadIds]);
  return new Map(rows.map(row => [row.lead_id, rowToSummary(row)]));
}

function normalizeMatch(value: string) {
  return cleanZaloFriendshipText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function resolveAccount(lead: Lead, row: FriendshipRow): Promise<ZaloAccountRecord | null> {
  const accounts = (await listZaloAccounts()).filter(account => account.isActive);
  if (row.account_id) return accounts.find(account => account.id === row.account_id) || null;
  const assignee = normalizeMatch(lead.assignedTo);
  if (assignee) {
    const assigned = accounts.find(account => {
      const haystack = normalizeMatch(`${account.label} ${account.displayName}`);
      return haystack.includes(assignee) || assignee.includes(haystack);
    });
    if (assigned) return assigned;
  }
  return accounts.find(account => normalizeMatch(`${account.label} ${account.displayName}`).includes("smartfurni")) || accounts[0] || null;
}

async function readLead(leadId: string): Promise<Lead | null> {
  const row = await queryOne<{ data: Lead | string }>(`SELECT data FROM crm_leads WHERE id=$1`, [leadId]);
  if (!row) return null;
  return typeof row.data === "string" ? JSON.parse(row.data) : row.data;
}

async function updateRow(leadId: string, values: Partial<Record<keyof FriendshipRow, unknown>>) {
  const columnMap: Partial<Record<keyof FriendshipRow, string>> = {
    phone: "phone", zalo_uid: "zalo_uid", zalo_display_name: "zalo_display_name", zalo_avatar: "zalo_avatar",
    account_id: "account_id", account_label: "account_label", status: "status", product_label: "product_label",
    request_message: "request_message", attempt_count: "attempt_count", last_sent_at: "last_sent_at",
    next_action_at: "next_action_at", accepted_at: "accepted_at", last_checked_at: "last_checked_at",
    last_error: "last_error", auto_enabled: "auto_enabled", claimed_at: "claimed_at",
  };
  const entries = Object.entries(values).filter(([key]) => columnMap[key as keyof FriendshipRow]);
  const params = entries.map(([, value]) => value);
  const setters = entries.map(([key], index) => `${columnMap[key as keyof FriendshipRow]}=$${index + 1}`);
  params.push(leadId);
  await query(`UPDATE crm_zalo_friendships SET ${setters.join(",")}, updated_at=NOW() WHERE lead_id=$${params.length}`, params);
}

function hasDoNotContact(lead: Lead) {
  return (lead.tags || []).some(tag => ["do_not_contact", "dnc", "khong_lien_he", "không liên hệ"].includes(normalizeMatch(tag)));
}

async function dailySentCount(accountId: string) {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM crm_zalo_friendship_events
     WHERE account_id=$1 AND event_type='request_sent'
       AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'`,
    [accountId],
  );
  return Number(row?.count || 0);
}

async function processRow(row: FriendshipRow, settings: ZaloFriendshipSettings) {
  const lead = await readLead(row.lead_id);
  if (!lead) {
    await updateRow(row.lead_id, { status: "stopped", last_error: "Khách hàng không còn tồn tại", next_action_at: null, claimed_at: null });
    return "stopped";
  }
  if (!row.auto_enabled || hasDoNotContact(lead) || lead.stage === "lost") {
    await updateRow(row.lead_id, { status: "stopped", last_error: hasDoNotContact(lead) ? "Khách hàng không nhận liên hệ" : null, next_action_at: null, claimed_at: null });
    return "stopped";
  }

  const phone = normalizeZaloFriendPhone(lead.zaloPhone || lead.phone);
  const productLabel = getLeadProductLabel(lead.interestedProducts);
  if (!phone || !productLabel) {
    await updateRow(row.lead_id, {
      phone, product_label: productLabel || null, status: "waiting_data",
      last_error: !phone ? "Thiếu số điện thoại Zalo" : "Chưa chọn sản phẩm quan tâm",
      next_action_at: new Date(Date.now() + 6 * 3600_000).toISOString(), claimed_at: null,
    });
    return "waiting_data";
  }

  const account = await resolveAccount(lead, row);
  if (!account) {
    await updateRow(row.lead_id, { status: "waiting_account", last_error: "Chưa có tài khoản Zalo cá nhân đang hoạt động", next_action_at: new Date(Date.now() + 30 * 60_000).toISOString(), claimed_at: null });
    return "waiting_account";
  }
  row.account_id = account.id;
  row.account_label = account.label || account.displayName;
  await updateRow(row.lead_id, { phone, product_label: productLabel, account_id: account.id, account_label: row.account_label });

  let uid = row.zalo_uid;
  if (!uid) {
    const found = await findZaloUserByPhone(phone, account.id);
    if (!found.success || !found.user) {
      await updateRow(row.lead_id, { status: "not_found", last_error: found.error || "Không tìm thấy Zalo", next_action_at: new Date(Date.now() + 24 * 3600_000).toISOString(), claimed_at: null });
      await addEvent(row, "user_not_found", { phone, error: found.error });
      return "not_found";
    }
    uid = found.user.uid;
    row.zalo_uid = uid;
    await updateRow(row.lead_id, { zalo_uid: uid, zalo_display_name: found.user.displayName, zalo_avatar: found.user.avatar });
  }

  const current = await getZaloFriendRequestStatus(uid, account.id);
  if (!current.success || !current.status) {
    await updateRow(row.lead_id, { status: "failed", last_error: current.error || "Không kiểm tra được trạng thái", next_action_at: new Date(Date.now() + 30 * 60_000).toISOString(), claimed_at: null });
    return "failed";
  }
  await updateRow(row.lead_id, { last_checked_at: new Date().toISOString() });
  if (current.status.isFriend) {
    const newlyAccepted = row.status !== "accepted";
    await updateRow(row.lead_id, {
      status: "accepted",
      accepted_at: row.accepted_at || new Date().toISOString(),
      last_error: null,
      next_action_at: new Date(Date.now() + settings.reconciliationMinutes * 60_000).toISOString(),
      claimed_at: null,
    });
    if (newlyAccepted) await addEvent(row, "accepted");
    return "accepted";
  }
  if (current.status.isRequesting) {
    const accepted = await acceptZaloFriendRequest(uid, account.id);
    if (accepted.success) {
      await updateRow(row.lead_id, { status: "accepted", accepted_at: new Date().toISOString(), last_error: null, next_action_at: new Date(Date.now() + settings.reconciliationMinutes * 60_000).toISOString(), claimed_at: null });
      await addEvent(row, "incoming_accepted");
      return "accepted";
    }
    await updateRow(row.lead_id, { status: "failed", last_error: accepted.error || "Không chấp nhận được lời mời đến", next_action_at: new Date(Date.now() + 30 * 60_000).toISOString(), claimed_at: null });
    return "failed";
  }

  if (row.status === "accepted") {
    await updateRow(row.lead_id, {
      status: "disconnected",
      last_error: "Khách hàng không còn trong danh sách bạn bè Zalo",
      next_action_at: null,
      claimed_at: null,
    });
    await addEvent(row, "friendship_disconnected");
    await pauseSofaJourneyForLostFriendship(row.lead_id).catch(error =>
      console.error("[ZaloFriendship] Không tạm dừng được workflow sau khi mất kết nối:", error),
    );
    return "disconnected";
  }

  if (row.status === "pending") {
    if (!current.status.isRequested) {
      await updateRow(row.lead_id, { status: "rejected", last_error: "Lời mời không còn ở trạng thái chờ", next_action_at: null, claimed_at: null });
      await addEvent(row, "rejected_or_removed");
      return "rejected";
    }
    const lastSentAt = row.last_sent_at ? new Date(row.last_sent_at) : new Date();
    const retryAt = lastSentAt.getTime() + settings.retryAfterHours * 3600_000;
    if (Date.now() < retryAt) {
      await updateRow(row.lead_id, { status: "pending", last_sent_at: lastSentAt.toISOString(), last_error: null, next_action_at: nextPendingCheck(lastSentAt, settings).toISOString(), claimed_at: null });
      return "pending";
    }
    if (row.attempt_count >= 1 + settings.maxRetries) {
      const finalUndo = await undoZaloFriendRequest(uid, account.id);
      await updateRow(row.lead_id, { status: "stopped", last_error: finalUndo.success ? "Đã đạt số lần gửi tối đa" : `Đã đạt số lần gửi tối đa; chưa thu hồi được: ${finalUndo.error || "lỗi Zalo"}`, next_action_at: null, claimed_at: null });
      await addEvent(row, "max_attempts_reached", { invitationWithdrawn: finalUndo.success });
      return "stopped";
    }
    const undone = await undoZaloFriendRequest(uid, account.id);
    if (!undone.success) {
      await updateRow(row.lead_id, { status: "failed", last_error: undone.error || "Không thu hồi được lời mời", next_action_at: new Date(Date.now() + 30 * 60_000).toISOString(), claimed_at: null });
      return "failed";
    }
    const nextAction = nextAllowedTime(new Date(Date.now() + settings.resendDelayMinutes * 60_000), settings);
    await updateRow(row.lead_id, { status: "retry_scheduled", last_error: null, next_action_at: nextAction.toISOString(), claimed_at: null });
    await addEvent(row, "request_withdrawn");
    return "retry_scheduled";
  }

  if (current.status.isRequested) {
    const sentAt = new Date(row.last_sent_at || Date.now());
    await updateRow(row.lead_id, { status: "pending", last_sent_at: sentAt.toISOString(), next_action_at: nextPendingCheck(sentAt, settings).toISOString(), claimed_at: null });
    return "pending";
  }

  if ((await dailySentCount(account.id)) >= settings.dailyCapPerAccount) {
    const nextAction = nextAllowedTime(new Date(Date.now() + 24 * 3600_000), settings);
    await updateRow(row.lead_id, { status: row.status === "retry_scheduled" ? "retry_scheduled" : "queued", last_error: "Đã đạt giới hạn gửi hôm nay", next_action_at: nextAction.toISOString(), claimed_at: null });
    return "daily_cap";
  }

  const attempt = row.attempt_count + 1;
  const message = buildZaloFriendRequestMessage(lead, attempt, settings);
  const sent = await sendZaloFriendRequest({ userId: uid, message, accountId: account.id });
  if (!sent.success) {
    await updateRow(row.lead_id, { status: "failed", request_message: message, last_error: sent.error || "Không gửi được lời mời", next_action_at: new Date(Date.now() + 30 * 60_000).toISOString(), claimed_at: null });
    await addEvent(row, "request_failed", { error: sent.error });
    return "failed";
  }
  row.attempt_count = attempt;
  const now = new Date();
  await updateRow(row.lead_id, {
    status: "pending", attempt_count: attempt, request_message: message, last_sent_at: now.toISOString(),
    last_error: null, next_action_at: nextPendingCheck(now, settings).toISOString(), claimed_at: null,
  });
  await addEvent(row, "request_sent", { message });
  return "sent";
}

export async function runZaloFriendshipAutomation(limit = 20) {
  await ensureZaloFriendshipSchema();
  const settings = await getZaloFriendshipSettings();
  if (!settings.enabled) return { enabled: false, claimed: 0, results: {} as Record<string, number> };
  const now = new Date();
  if (nextAllowedTime(now, settings).getTime() !== now.getTime()) {
    return { enabled: true, outsideWorkingHours: true, claimed: 0, results: {} as Record<string, number> };
  }
  const rows = await query<FriendshipRow>(
    `WITH due AS (
       SELECT lead_id, status FROM crm_zalo_friendships
       WHERE auto_enabled=TRUE
         AND status IN ('queued','waiting_data','waiting_account','not_found','pending','retry_scheduled','failed','accepted','processing')
         AND (next_action_at IS NULL OR next_action_at <= NOW())
         AND (status <> 'processing' OR claimed_at < NOW() - INTERVAL '15 minutes')
       ORDER BY next_action_at NULLS FIRST, created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE crm_zalo_friendships f SET status='processing', claimed_at=NOW(), updated_at=NOW()
     FROM due WHERE f.lead_id=due.lead_id RETURNING f.*, due.status AS previous_status`,
    [Math.max(1, Math.min(limit, 50))],
  );
  const results: Record<string, number> = {};
  for (const row of rows) {
    const originalStatus = row.previous_status || row.status;
    row.status = originalStatus;
    try {
      const result = await processRow(row, settings);
      results[result] = (results[result] || 0) + 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi không xác định";
      await updateRow(row.lead_id, { status: "failed", last_error: message, next_action_at: new Date(Date.now() + 30 * 60_000).toISOString(), claimed_at: null });
      results.failed = (results.failed || 0) + 1;
      console.error(`[ZaloFriendship] Lead ${row.lead_id} failed from ${originalStatus}:`, error);
    }
  }
  return { enabled: true, claimed: rows.length, results };
}

/**
 * Process one specific lead immediately after it is saved. This deliberately
 * bypasses the background queue delay, while keeping working-hour, account and
 * daily-cap safeguards. The regular cron remains the recovery path when the
 * request cannot be completed synchronously.
 */
export async function runZaloFriendshipForLeadNow(leadId: string) {
  await ensureZaloFriendshipSchema();
  const settings = await getZaloFriendshipSettings();
  if (!settings.enabled) {
    return { enabled: false, claimed: false, result: "disabled" };
  }

  const now = new Date();
  if (nextAllowedTime(now, settings).getTime() !== now.getTime()) {
    return { enabled: true, outsideWorkingHours: true, claimed: false, result: "outside_working_hours" };
  }

  const row = await queryOne<FriendshipRow>(
    `WITH target AS (
       SELECT lead_id, status FROM crm_zalo_friendships
       WHERE lead_id=$1
         AND auto_enabled=TRUE
         AND status IN ('queued','waiting_data','waiting_account','not_found','retry_scheduled','failed','processing')
         AND (status <> 'processing' OR claimed_at < NOW() - INTERVAL '15 minutes')
       FOR UPDATE SKIP LOCKED
     )
     UPDATE crm_zalo_friendships f SET status='processing', claimed_at=NOW(), updated_at=NOW()
     FROM target WHERE f.lead_id=target.lead_id
     RETURNING f.*, target.status AS previous_status`,
    [leadId],
  );
  if (!row) {
    return { enabled: true, claimed: false, result: "not_actionable" };
  }

  const originalStatus = row.previous_status || row.status;
  row.status = originalStatus;
  try {
    const result = await processRow(row, settings);
    return { enabled: true, claimed: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định";
    await updateRow(row.lead_id, {
      status: "failed",
      last_error: message,
      next_action_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      claimed_at: null,
    });
    console.error(`[ZaloFriendship] Immediate lead ${row.lead_id} failed from ${originalStatus}:`, error);
    return { enabled: true, claimed: true, result: "failed", error: message };
  }
}

export async function requestZaloFriendshipAction(leadId: string, action: "retry" | "stop" | "resume" | "check") {
  await ensureZaloFriendshipSchema();
  let row = await queryOne<FriendshipRow>(`SELECT * FROM crm_zalo_friendships WHERE lead_id=$1`, [leadId]);
  if (!row && (action === "resume" || action === "retry")) {
    const lead = await readLead(leadId);
    if (!lead) throw new Error("Không tìm thấy khách hàng");
    await enqueueZaloFriendshipForLead(lead);
    row = await queryOne<FriendshipRow>(`SELECT * FROM crm_zalo_friendships WHERE lead_id=$1`, [leadId]);
  }
  if (!row) throw new Error("Khách hàng chưa có quy trình kết bạn Zalo");
  if (action === "stop") {
    await updateRow(leadId, { auto_enabled: false, status: "stopped", next_action_at: null, claimed_at: null, last_error: "Đã dừng thủ công" });
  } else {
    const status = action === "resume" || action === "retry" ? (row.attempt_count > 0 ? "retry_scheduled" : "queued") : row.status;
    await updateRow(leadId, { auto_enabled: true, status, next_action_at: new Date().toISOString(), claimed_at: null, last_error: null });
  }
  return getZaloFriendshipSummary(leadId);
}

export async function recordZaloFriendshipGatewayEvent(input: {
  type: "accepted" | "incoming" | "rejected";
  userId: string;
  accountId: string;
}) {
  if (!input.userId) return;
  await ensureZaloFriendshipSchema();
  const rows = await query<FriendshipRow>(
    `SELECT * FROM crm_zalo_friendships WHERE zalo_uid=$1 AND account_id=$2`,
    [input.userId, input.accountId],
  );
  for (const row of rows) {
    if (input.type === "accepted") {
      await updateRow(row.lead_id, { status: "accepted", accepted_at: new Date().toISOString(), last_checked_at: new Date().toISOString(), last_error: null, next_action_at: null, claimed_at: null });
      await addEvent(row, "accepted_realtime");
    } else if (input.type === "incoming" && row.auto_enabled && row.status !== "stopped") {
      await updateRow(row.lead_id, { status: "queued", next_action_at: new Date().toISOString(), last_error: null, claimed_at: null });
      await addEvent(row, "incoming_request_realtime");
    } else if (row.status === "accepted") {
      await updateRow(row.lead_id, { status: "disconnected", next_action_at: null, last_checked_at: new Date().toISOString(), last_error: "Khách hàng đã hủy kết bạn Zalo", claimed_at: null });
      await addEvent(row, "friendship_disconnected_realtime");
      await pauseSofaJourneyForLostFriendship(row.lead_id).catch(error =>
        console.error("[ZaloFriendship] Không tạm dừng được workflow sau sự kiện mất kết nối:", error),
      );
    } else if (row.status === "pending") {
      await updateRow(row.lead_id, { status: "rejected", next_action_at: null, last_checked_at: new Date().toISOString(), last_error: "Khách hàng đã từ chối lời mời", claimed_at: null });
      await addEvent(row, "rejected_realtime");
    }
  }
}
