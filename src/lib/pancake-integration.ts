/**
 * Pancake Integration Store
 * Lưu trữ và quản lý cấu hình Pancake API để gửi tin nhắn qua Pancake
 * khi Facebook thread bị Pancake kiểm soát (lỗi #10).
 *
 * Pancake API Base: https://pages.fm/api/public_api/v2
 * Auth: page_access_token (query param, không expire)
 */

import { query } from "@/lib/db";

export interface PancakePageConfig {
  /** Facebook Page ID (fbPageId) — dùng để map với fanpage trong CRM */
  fbPageId: string;
  /** Pancake page_access_token — lấy từ Pancake Settings → Tools */
  pageAccessToken: string;
  /** Tên hiển thị (optional) */
  pageName?: string;
  /** Thời điểm cập nhật */
  updatedAt?: string;
}

export interface PancakeIntegrationConfig {
  /** Danh sách cấu hình theo từng fanpage */
  pages: PancakePageConfig[];
  /** Bật/tắt tính năng fallback qua Pancake khi gặp lỗi #10 */
  enabled: boolean;
}

const TABLE_KEY = "pancake_integration";

async function ensureTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function getPancakeConfig(): Promise<PancakeIntegrationConfig> {
  await ensureTable();
  const rows = await query<{ value: PancakeIntegrationConfig }>(
    "SELECT value FROM crm_settings WHERE key = $1",
    [TABLE_KEY]
  );
  if (rows.length > 0) return rows[0].value;
  return { pages: [], enabled: true };
}

export async function savePancakeConfig(config: PancakeIntegrationConfig): Promise<void> {
  await ensureTable();
  await query(
    `INSERT INTO crm_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
    [TABLE_KEY, JSON.stringify(config)]
  );
}

/**
 * Lấy Pancake page_access_token cho một Facebook Page ID cụ thể.
 * Trả về null nếu chưa cấu hình.
 */
export async function getPancakeTokenForPage(fbPageId: string): Promise<string | null> {
  const config = await getPancakeConfig();
  if (!config.enabled) return null;
  const pageConfig = config.pages.find(p => p.fbPageId === fbPageId);
  return pageConfig?.pageAccessToken || null;
}

/**
 * Gửi tin nhắn qua Pancake API.
 * Pancake là thread owner nên không bị lỗi #10.
 *
 * Pancake conversation ID cho INBOX = customer's PSID (user ID)
 * POST https://pages.fm/api/public_api/v2/pages/{page_id}/conversations/{conversation_id}/messages
 */
export async function sendViaPancake(params: {
  fbPageId: string;
  pancakePageAccessToken: string;
  recipientPsid: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { fbPageId, pancakePageAccessToken, recipientPsid, message } = params;

  const url = `https://pages.fm/api/public_api/v2/pages/${fbPageId}/conversations/${recipientPsid}/messages?page_access_token=${pancakePageAccessToken}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();

    // Pancake trả về { success: true, message: {...} } hoặc { success: false, error: "..." }
    if (data.success === false || data.error) {
      const errMsg = data.error || data.message || "Pancake API error";
      console.error("[pancake] send error:", errMsg, "| data:", JSON.stringify(data));
      return { success: false, error: errMsg };
    }

    // Thành công
    const msgId = data.message?.id || data.id || `pancake_${Date.now()}`;
    return { success: true, messageId: msgId };
  } catch (err) {
    console.error("[pancake] send exception:", err);
    return { success: false, error: String(err) };
  }
}
