/**
 * Webhook nhận data từ Facebook Lead Ads
 * Cấu hình trong Facebook Business Manager → Lead Ads → Webhook
 *
 * Tài liệu: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 *
 * Luồng hoạt động:
 * 1. GET  → Facebook gọi để verify webhook (hub.mode=subscribe)
 * 2. POST → Facebook gửi lead data khi có người điền form
 *
 * Bảo mật:
 * - Xác thực chữ ký X-Hub-Signature-256 bằng App Secret (HMAC SHA256)
 * - Verify Token phải khớp khi đăng ký webhook
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createRawLead } from "@/lib/crm-raw-lead-store";
import { getCrmSettings } from "@/lib/crm-settings-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Xác thực chữ ký HMAC SHA256 từ Facebook
 * Facebook gửi header: X-Hub-Signature-256: sha256=<hex>
 */
function verifyFacebookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature || !appSecret) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  // Constant-time comparison để tránh timing attack
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── GET: Facebook webhook verification ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  // Lấy verify token từ CRM settings (ưu tiên) hoặc env var
  let verifyToken: string;
  try {
    const settings = await getCrmSettings();
    verifyToken = settings.webhook.fbVerifyToken ||
      process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ||
      "smartfurni_fb_webhook_2026";
  } catch {
    verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || "smartfurni_fb_webhook_2026";
  }

  if (token === verifyToken) {
    console.log("[fb-webhook] ✅ Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[fb-webhook] ❌ Verification failed — token mismatch");
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ─── POST: Nhận data lead từ Facebook ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Đọc raw body để xác thực chữ ký
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  // Lấy settings từ DB
  let settings;
  try {
    settings = await getCrmSettings();
  } catch (e) {
    console.error("[fb-webhook] Failed to load settings:", e);
    return NextResponse.json({ error: "Settings unavailable" }, { status: 500 });
  }

  const fbConfig = settings.webhook;

  // Kiểm tra tích hợp có được bật không
  if (!fbConfig.fbEnabled) {
    console.warn("[fb-webhook] Integration disabled — ignoring request");
    // Vẫn trả 200 để Facebook không retry
    return NextResponse.json({ received: true, skipped: true });
  }

  // Xác thực chữ ký nếu App Secret đã được cấu hình
  if (fbConfig.fbAppSecret) {
    const valid = verifyFacebookSignature(rawBody, signature, fbConfig.fbAppSecret);
    if (!valid) {
      console.warn("[fb-webhook] ❌ Invalid signature — possible spoofing attempt");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.log("[fb-webhook] ✅ Signature verified");
  } else {
    console.warn("[fb-webhook] ⚠️  App Secret not configured — skipping signature check");
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[fb-webhook] Received payload:", JSON.stringify(body).slice(0, 300));

  // Facebook gửi array of entry
  const entries = (body?.entry as unknown[]) || [];
  const created: string[] = [];
  const errors: string[] = [];

  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    const changes = (e?.changes as unknown[]) || [];

    for (const change of changes) {
      const c = change as Record<string, unknown>;
      if (c?.field !== "leadgen") continue;

      const value = (c?.value as Record<string, unknown>) || {};

      // Trích xuất field_data từ Facebook Lead form
      const fieldData = (value.field_data as { name: string; values: string[] }[]) || [];
      const getField = (name: string) =>
        fieldData.find(f => f.name === name)?.values?.[0] || "";

      // Ghép tên đầy đủ từ nhiều field khả dĩ
      const fullName =
        getField("full_name") ||
        [getField("first_name"), getField("last_name")].filter(Boolean).join(" ") ||
        getField("name") ||
        "Khách hàng Facebook";

      const phone =
        getField("phone_number") ||
        getField("phone") ||
        getField("mobile_phone") || "";

      const email = getField("email") || "";

      // Các field bổ sung phổ biến trong form SmartFurni
      const message =
        getField("message") ||
        getField("note") ||
        getField("ghi_chu") ||
        getField("nhu_cau") || "";

      try {
        const lead = await createRawLead({
          source: "facebook_lead",
          fullName,
          phone,
          email,
          adName:       (value.ad_name       as string) || undefined,
          campaignName: (value.campaign_name as string) || undefined,
          formName:     (value.form_name     as string) || undefined,
          message:      message || undefined,
          rawData:      value,
        });
        created.push(lead.id);
        console.log(`[fb-webhook] ✅ Created raw lead: ${lead.id} — ${fullName} (${phone})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
        console.error("[fb-webhook] ❌ Failed to create lead:", msg);
      }
    }
  }

  console.log(`[fb-webhook] Summary: ${created.length} created, ${errors.length} errors`);
  return NextResponse.json({
    received: true,
    created: created.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
