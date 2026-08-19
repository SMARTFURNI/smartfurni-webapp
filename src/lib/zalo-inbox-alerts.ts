import "server-only";

import { query, queryOne } from "./db";
import { sendAutomationEmail } from "./crm-automation-email";
import { sendPushNotification } from "./pwa-server";

export type ZaloFriendAlertKind = "incoming_request" | "became_friends";

export interface ActiveZaloConnectionAlert {
  accountId: string;
  accountName: string;
  reason: string;
  disconnectedAt: string;
  notifiedAt: string;
}

let schemaPromise: Promise<void> | null = null;

async function ensureAlertSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS zalo_inbox_alert_events (
          event_key TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          account_id TEXT NOT NULL,
          subject_id TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS zalo_inbox_connection_alerts (
          account_id TEXT PRIMARY KEY,
          account_name TEXT NOT NULL DEFAULT '',
          reason TEXT NOT NULL DEFAULT '',
          disconnected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_notified_at TIMESTAMPTZ,
          resolved_at TIMESTAMPTZ
        )
      `);
    })().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : fallback;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value;
}

function eventDay(value?: number): string {
  const date = value && Number.isFinite(value) ? new Date(value) : new Date();
  return date.toISOString().slice(0, 10);
}

async function claimFriendEvent(input: {
  kind: ZaloFriendAlertKind;
  accountId: string;
  userId: string;
  eventAt?: number;
}) {
  await ensureAlertSchema();
  const key = `${input.kind}:${input.accountId}:${input.userId}:${eventDay(input.eventAt)}`;
  const claimed = await queryOne<{ event_key: string }>(`
    INSERT INTO zalo_inbox_alert_events (event_key, event_type, account_id, subject_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (event_key) DO NOTHING
    RETURNING event_key
  `, [key, input.kind, input.accountId, input.userId]);
  return { claimed: Boolean(claimed), key };
}

async function releaseFriendEvent(key: string) {
  await query(`DELETE FROM zalo_inbox_alert_events WHERE event_key = $1`, [key]);
}

/** Gửi sự kiện kết bạn tới toàn bộ tài khoản đã đăng ký nhận PWA. */
export async function notifyZaloFriendEvent(input: {
  kind: ZaloFriendAlertKind;
  accountId: string;
  accountName?: string | null;
  userId: string;
  customerName?: string | null;
  message?: string | null;
  eventAt?: number;
}) {
  const accountName = cleanText(input.accountName, "tài khoản Zalo");
  const customerName = cleanText(input.customerName, "Khách hàng Zalo");
  const { claimed, key } = await claimFriendEvent(input);
  if (!claimed) return { deduplicated: true, crm: null, admin: null };

  const isIncoming = input.kind === "incoming_request";
  const note = cleanText(input.message);
  const body = isIncoming
    ? truncate(`${customerName} vừa gửi lời mời kết bạn tới ${accountName}.${note ? ` Lời nhắn: ${note}` : ""}`, 180)
    : truncate(`${customerName} và ${accountName} đã trở thành bạn bè trên Zalo.`, 180);
  const notification = {
    title: isIncoming ? "Lời mời kết bạn Zalo mới" : "Đã trở thành bạn bè trên Zalo",
    body,
    url: `/crm/zalo-inbox?account=${encodeURIComponent(input.accountId)}&conversation=${encodeURIComponent(input.userId)}`,
    tag: `zalo-friend-${input.kind}-${input.accountId}-${input.userId}`,
    renotify: true,
    urgency: "high" as const,
    data: {
      type: isIncoming ? "zalo-friend-request" : "zalo-friend-accepted",
      accountId: input.accountId,
      conversationId: input.userId,
      customerName,
    },
  };

  const [crm, admin] = await Promise.allSettled([
    sendPushNotification({ ...notification, ownerScope: "crm" }),
    sendPushNotification({ ...notification, ownerScope: "admin" }),
  ]);
  if (crm.status === "rejected" && admin.status === "rejected") {
    await releaseFriendEvent(key).catch(() => undefined);
    throw new AggregateError([crm.reason, admin.reason], "Không gửi được thông báo kết bạn Zalo");
  }
  if (crm.status === "rejected") console.error("[Zalo Friend Push] CRM:", crm.reason);
  if (admin.status === "rejected") console.error("[Zalo Friend Push] Admin:", admin.reason);
  return {
    deduplicated: false,
    crm: crm.status === "fulfilled" ? crm.value : null,
    admin: admin.status === "fulfilled" ? admin.value : null,
  };
}

/**
 * Claim cảnh báo mất kết nối theo vòng đời của một lần rớt mạng. Khi chưa
 * kết nối lại, tối đa nhắc lại mỗi 6 giờ để tránh bắn PWA/email liên tục.
 */
export async function notifyZaloAccountDisconnected(input: {
  accountId: string;
  accountName?: string | null;
  reason?: string | null;
  disconnectedAt?: Date;
}) {
  await ensureAlertSchema();
  const accountName = cleanText(input.accountName, input.accountId);
  const reason = truncate(cleanText(input.reason, "Phiên Zalo không còn phản hồi"), 300);
  const disconnectedAt = input.disconnectedAt || new Date();
  const claimed = await queryOne<{ account_id: string }>(`
    INSERT INTO zalo_inbox_connection_alerts (
      account_id, account_name, reason, disconnected_at, last_notified_at, resolved_at
    ) VALUES ($1, $2, $3, $4, NOW(), NULL)
    ON CONFLICT (account_id) DO UPDATE SET
      account_name = EXCLUDED.account_name,
      reason = EXCLUDED.reason,
      disconnected_at = CASE
        WHEN zalo_inbox_connection_alerts.resolved_at IS NOT NULL THEN EXCLUDED.disconnected_at
        ELSE zalo_inbox_connection_alerts.disconnected_at
      END,
      last_notified_at = NOW(),
      resolved_at = NULL
    WHERE zalo_inbox_connection_alerts.resolved_at IS NOT NULL
       OR zalo_inbox_connection_alerts.last_notified_at IS NULL
       OR zalo_inbox_connection_alerts.last_notified_at < NOW() - INTERVAL '6 hours'
    RETURNING account_id
  `, [input.accountId, accountName, reason, disconnectedAt.toISOString()]);
  if (!claimed) return { deduplicated: true, pwa: null, email: null };

  const url = `/crm/zalo-inbox?account=${encodeURIComponent(input.accountId)}&reconnect=1`;
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_BASE_URL
    || process.env.SITE_URL
    || "https://smartfurni.com.vn"
  ).replace(/\/$/, "");
  const time = disconnectedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const body = `Tài khoản ${accountName} đã mất kết nối với Zalo Inbox. Hãy mở CRM để kiểm tra và kết nối lại.`;
  const [pwa, email] = await Promise.allSettled([
    sendPushNotification({
      ownerScope: "admin",
      title: "Zalo Inbox mất kết nối",
      body,
      url,
      tag: `zalo-disconnected-${input.accountId}`,
      renotify: true,
      urgency: "high",
      data: { type: "zalo-account-disconnected", accountId: input.accountId, accountName, reason },
    }),
    sendAutomationEmail({
      to: "phamtuat0820@gmail.com",
      fromName: "SmartFurni CRM",
      subject: `[SmartFurni CRM] ${accountName} mất kết nối Zalo`,
      body: [
        "Cảnh báo kết nối Zalo Inbox",
        `Tài khoản: ${accountName}`,
        `Thời điểm: ${time}`,
        `Lý do: ${reason}`,
        `Kết nối lại: ${siteUrl}${url}`,
      ].join("\n"),
    }),
  ]);

  if (pwa.status === "rejected") console.error("[Zalo Disconnect Push]", pwa.reason);
  if (email.status === "rejected") console.error("[Zalo Disconnect Email]", email.reason);
  if (email.status === "fulfilled" && email.value.outcome !== "sent") {
    console.error("[Zalo Disconnect Email]", email.value.error || email.value.outcome);
  }
  return {
    deduplicated: false,
    pwa: pwa.status === "fulfilled" ? pwa.value : null,
    email: email.status === "fulfilled" ? email.value : null,
  };
}

export async function resolveZaloAccountDisconnectAlert(accountId: string) {
  await ensureAlertSchema();
  await query(`
    UPDATE zalo_inbox_connection_alerts
    SET resolved_at = NOW()
    WHERE account_id = $1 AND resolved_at IS NULL
  `, [accountId]);
}

export async function listActiveZaloConnectionAlerts(): Promise<ActiveZaloConnectionAlert[]> {
  await ensureAlertSchema();
  const rows = await query<{
    account_id: string;
    account_name: string;
    reason: string;
    disconnected_at: Date | string;
    last_notified_at: Date | string;
  }>(`
    SELECT account_id, account_name, reason, disconnected_at, last_notified_at
    FROM zalo_inbox_connection_alerts
    WHERE resolved_at IS NULL AND last_notified_at IS NOT NULL
    ORDER BY disconnected_at DESC
  `);
  return rows.map(row => ({
    accountId: row.account_id,
    accountName: row.account_name,
    reason: row.reason,
    disconnectedAt: new Date(row.disconnected_at).toISOString(),
    notifiedAt: new Date(row.last_notified_at).toISOString(),
  }));
}
