/**
 * Pancake Integration
 * Gửi tin nhắn qua Pancake API khi Facebook thread bị Pancake kiểm soát (lỗi #10).
 *
 * Pancake API:
 *   - List pages:   GET  https://pages.fm/api/v1/pages?access_token=USER_TOKEN
 *   - Send message: POST https://pages.fm/api/public_api/v1/pages/{pancake_page_id}/conversations/{psid}/messages?page_access_token=PAGE_TOKEN
 *
 * QUAN TRỌNG:
 *   - page_id trong Pancake là ID nội bộ của Pancake (lấy từ GET /pages), KHÔNG phải Facebook Page ID
 *   - conversation_id = PSID của khách hàng (Facebook User ID)
 *   - page_access_token lấy từ Pancake Settings → Tools (không expire)
 */

import { query } from "@/lib/db";

export interface PancakePageConfig {
  /** Facebook Page ID — dùng để map với fanpage trong CRM */
  fbPageId: string;
  /** Pancake internal page_id — lấy từ GET /pages API */
  pancakePageId: string;
  /** Pancake page_access_token — lấy từ Pancake Settings → Tools */
  pageAccessToken: string;
  /** Tên hiển thị (optional) */
  pageName?: string;
  /** Thời điểm cập nhật */
  updatedAt?: string;
}

export interface PancakeIntegrationConfig {
  pages: PancakePageConfig[];
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

export async function getPancakeConfigForPage(fbPageId: string): Promise<PancakePageConfig | null> {
  const config = await getPancakeConfig();
  if (!config.enabled) return null;
  return config.pages.find(p => p.fbPageId === fbPageId) || null;
}

/**
 * Lấy danh sách pages từ Pancake API bằng User Access Token.
 * Dùng để giúp user tìm Pancake Page ID tương ứng với Facebook Page.
 */
export async function fetchPancakePages(userAccessToken: string): Promise<Array<{
  id: string;
  name: string;
  platform: string;
  avatar_url?: string;
}>> {
  const url = `https://pages.fm/api/v1/pages?access_token=${encodeURIComponent(userAccessToken)}`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Pancake API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.pages || [];
}

/**
 * Gửi tin nhắn qua Pancake API.
 *
 * POST https://pages.fm/api/public_api/v1/pages/{pancake_page_id}/conversations/{psid}/messages
 * Body: { action: "reply_inbox", message: "..." }
 */
export async function sendViaPancake(params: {
  pancakePageId: string;
  pancakePageAccessToken: string;
  recipientPsid: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { pancakePageId, pancakePageAccessToken, recipientPsid, message } = params;

  const url = `https://pages.fm/api/public_api/v1/pages/${pancakePageId}/conversations/${recipientPsid}/messages?page_access_token=${encodeURIComponent(pancakePageAccessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        action: "reply_inbox",
        message: message,
      }),
    });

    let data: Record<string, unknown>;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error("[pancake] non-JSON response:", text.substring(0, 200));
      return { success: false, error: `Pancake trả về lỗi không phải JSON (HTTP ${res.status}): ${text.substring(0, 100)}` };
    }

    if (!res.ok || data.success === false || data.error) {
      const errMsg = (data.error as string) || (data.message as string) || `HTTP ${res.status}`;
      console.error("[pancake] send error:", errMsg, "| data:", JSON.stringify(data));
      return { success: false, error: errMsg };
    }

    const msgId = (data as Record<string, Record<string, string>>).message?.id || (data.id as string) || `pancake_${Date.now()}`;
    return { success: true, messageId: msgId };
  } catch (err) {
    console.error("[pancake] send exception:", err);
    return { success: false, error: String(err) };
  }
}
