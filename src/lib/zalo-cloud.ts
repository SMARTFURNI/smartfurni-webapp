/**
 * zalo-cloud.ts — Zalo Cloud Connect (ZCC) Integration
 * Handles: Token refresh, click-to-call, call status webhook
 *
 * API Reference: https://developers.zalo.me/docs/official-account/goi-thoai
 * Base URL: https://openapi.zalo.me/v2.0/oa
 */

const ZALO_API_BASE = "https://openapi.zalo.me/v2.0/oa";
const ZALO_OAUTH_URL = "https://oauth.zaloapp.com/v4/oa/access_token";

export type ZaloCallType = "audio" | "video" | "audio_and_video";
export type ZaloCallReasonCode =
  | "product_service_consulting"
  | "order_appointment_confirmation"
  | "delivery_notification"
  | "flight_announcement"
  | "update_order";

export interface ZaloCallRequest {
  phone: string;
  callType?: ZaloCallType;
  reasonCode?: ZaloCallReasonCode;
}

export interface ZaloCallResponse {
  id: string;
  callType: ZaloCallType;
  phone: string;
  status: string;
  deliveryStatus: string;
  replyStatus: string;
  isCharged: boolean;
  errorCode: number;
  errorMessage: string;
  createdAt: string;
  expiresAt: string;
}

export interface ZaloTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ─── Token Management ─────────────────────────────────────────────────────────

/**
 * Lấy access token từ env hoặc DB (ưu tiên env)
 */
export function getZaloAccessToken(): string {
  return process.env.ZALO_ACCESS_TOKEN ?? "";
}

export function getZaloRefreshToken(): string {
  return process.env.ZALO_REFRESH_TOKEN ?? "";
}

export function getZaloAppId(): string {
  return process.env.ZALO_APP_ID ?? "";
}

export function getZaloAppSecret(): string {
  return process.env.ZALO_APP_SECRET ?? "";
}

export function getZaloOaId(): string {
  return process.env.ZALO_OFFICIAL_ACCOUNT_ID ?? "4257599883815905691";
}

/**
 * Làm mới access token bằng refresh token
 */
export async function refreshZaloToken(refreshToken?: string): Promise<ZaloTokenResponse | null> {
  const token = refreshToken ?? getZaloRefreshToken();
  const appId = getZaloAppId();
  const appSecret = getZaloAppSecret();

  if (!token || !appId || !appSecret) {
    console.warn("[ZaloCloud] Missing refresh token, app_id, or app_secret");
    return null;
  }

  try {
    const res = await fetch(ZALO_OAUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "secret_key": appSecret,
      },
      body: new URLSearchParams({
        app_id: appId,
        grant_type: "refresh_token",
        refresh_token: token,
      }),
    });

    const data = await res.json() as ZaloTokenResponse & { error?: number; message?: string };
    if (data.error && data.error !== 0) {
      console.error("[ZaloCloud] Token refresh failed:", data.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error("[ZaloCloud] Token refresh error:", e);
    return null;
  }
}

// ─── Click-to-Call API ────────────────────────────────────────────────────────

/**
 * Gửi yêu cầu cấp quyền gọi đến người dùng (ZCC click-to-call)
 * Người dùng sẽ nhận được thông báo Zalo để chấp nhận/từ chối cuộc gọi
 */
export async function requestZaloCall(
  req: ZaloCallRequest,
  accessToken?: string
): Promise<{ ok: boolean; data?: ZaloCallResponse; error?: string }> {
  const token = accessToken ?? getZaloAccessToken();
  if (!token) {
    return { ok: false, error: "Chưa cấu hình Zalo access token" };
  }

  // Chuẩn hóa số điện thoại sang định dạng quốc tế
  const phone = normalizeVietnamesePhone(req.phone);

  try {
    const res = await fetch(`${ZALO_API_BASE}/call/requestconsent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": token,
      },
      body: JSON.stringify({
        phone,
        call_type: req.callType ?? "audio",
        reason_code: req.reasonCode ?? "product_service_consulting",
      }),
    });

    const data = await res.json() as {
      error: number;
      message: string;
      data?: {
        id: string;
        call_type: string;
        phone: string;
        status: string;
        delivery_status: string;
        reply_status: string;
        is_charged: boolean;
        error_code: number;
        error_message: string;
        created_at: string;
        expires_at: string;
      };
    };

    if (data.error !== 0) {
      return { ok: false, error: `Zalo API lỗi ${data.error}: ${data.message}` };
    }

    if (!data.data) {
      return { ok: false, error: "Không có dữ liệu phản hồi từ Zalo" };
    }

    return {
      ok: true,
      data: {
        id: data.data.id,
        callType: data.data.call_type as ZaloCallType,
        phone: data.data.phone,
        status: data.data.status,
        deliveryStatus: data.data.delivery_status,
        replyStatus: data.data.reply_status,
        isCharged: data.data.is_charged,
        errorCode: data.data.error_code,
        errorMessage: data.data.error_message,
        createdAt: data.data.created_at,
        expiresAt: data.data.expires_at,
      },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Kiểm tra người dùng đã cấp quyền gọi chưa
 */
export async function checkZaloCallConsent(
  phone: string,
  accessToken?: string
): Promise<{ ok: boolean; hasConsent?: boolean; error?: string }> {
  const token = accessToken ?? getZaloAccessToken();
  if (!token) return { ok: false, error: "Chưa cấu hình Zalo access token" };

  const normalizedPhone = normalizeVietnamesePhone(phone);

  try {
    const res = await fetch(
      `${ZALO_API_BASE}/call/checkconsent?phone=${encodeURIComponent(normalizedPhone)}`,
      {
        headers: { "access_token": token },
      }
    );
    const data = await res.json() as { error: number; message: string; data?: { has_consent: boolean } };

    if (data.error !== 0) {
      return { ok: false, error: data.message };
    }
    return { ok: true, hasConsent: data.data?.has_consent ?? false };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Lấy danh sách yêu cầu gọi đã gửi
 */
export async function getZaloCallRequests(
  params?: { limit?: number; offset?: number },
  accessToken?: string
): Promise<{ ok: boolean; data?: ZaloCallResponse[]; error?: string }> {
  const token = accessToken ?? getZaloAccessToken();
  if (!token) return { ok: false, error: "Chưa cấu hình Zalo access token" };

  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;

  try {
    const res = await fetch(
      `${ZALO_API_BASE}/call/getlistconsent?limit=${limit}&offset=${offset}`,
      { headers: { "access_token": token } }
    );
    const data = await res.json() as { error: number; message: string; data?: unknown[] };

    if (data.error !== 0) return { ok: false, error: data.message };
    return { ok: true, data: (data.data ?? []) as ZaloCallResponse[] };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Chuẩn hóa số điện thoại Việt Nam sang định dạng quốc tế (84xxxxxxxxx)
 */
export function normalizeVietnamesePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("0")) {
    normalized = "84" + normalized.slice(1);
  } else if (!normalized.startsWith("84")) {
    normalized = "84" + normalized;
  }
  return normalized;
}

/**
 * Map Zalo reply_status sang trạng thái cuộc gọi CRM
 */
export function mapZaloReplyStatus(replyStatus: string): "answered" | "missed" | "busy" | "failed" {
  switch (replyStatus) {
    case "P": return "answered";   // Accepted
    case "N": return "missed";     // Rejected / No response
    case "Z": return "failed";     // Unknown
    default: return "failed";
  }
}

/**
 * Map Zalo delivery_status sang mô tả
 */
export function mapZaloDeliveryStatus(deliveryStatus: string): string {
  switch (deliveryStatus) {
    case "Unknown": return "Không xác định";
    case "Received": return "Đã nhận";
    case "Seen": return "Đã xem";
    default: return deliveryStatus;
  }
}
