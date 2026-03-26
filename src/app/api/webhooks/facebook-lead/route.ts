/**
 * Webhook nhận data từ Facebook Lead Ads
 * Cấu hình trong Facebook Business Manager → Lead Ads → Webhook
 * 
 * Verify token: FACEBOOK_WEBHOOK_VERIFY_TOKEN (env var)
 * 
 * Tài liệu: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 */
import { NextRequest, NextResponse } from "next/server";
import { createRawLead } from "@/lib/crm-raw-lead-store";

const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || "smartfurni_fb_webhook_2026";

/** GET: Facebook webhook verification */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[fb-webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/** POST: Nhận data lead từ Facebook */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[fb-webhook] Received:", JSON.stringify(body).slice(0, 200));

    // Facebook gửi array of entry
    const entries = body?.entry || [];
    const created: string[] = [];

    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        if (change?.field !== "leadgen") continue;
        const value = change?.value || {};

        // Trích xuất field_data từ Facebook Lead form
        const fieldData: { name: string; values: string[] }[] = value.field_data || [];
        const getField = (name: string) =>
          fieldData.find(f => f.name === name)?.values?.[0] || "";

        const fullName =
          getField("full_name") ||
          `${getField("first_name")} ${getField("last_name")}`.trim() ||
          getField("name") ||
          "Khách hàng Facebook";

        const phone =
          getField("phone_number") ||
          getField("phone") ||
          getField("mobile_phone") || "";

        const email = getField("email") || "";

        const lead = await createRawLead({
          source: "facebook_lead",
          fullName,
          phone,
          email,
          adName: value.ad_name || undefined,
          campaignName: value.campaign_name || undefined,
          formName: value.form_name || undefined,
          message: getField("message") || getField("note") || undefined,
          rawData: value,
        });
        created.push(lead.id);
      }
    }

    console.log(`[fb-webhook] Created ${created.length} raw leads`);
    return NextResponse.json({ received: true, created: created.length });
  } catch (e) {
    console.error("[fb-webhook] Error:", e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
