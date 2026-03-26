/**
 * Webhook nhận data từ TikTok Lead Generation Ads
 * Cấu hình trong TikTok Ads Manager → Tools → Lead Generation → Webhook
 * 
 * Tài liệu: https://ads.tiktok.com/marketing_api/docs?id=1738855099573250
 */
import { NextRequest, NextResponse } from "next/server";
import { createRawLead } from "@/lib/crm-raw-lead-store";
import { createHmac } from "crypto";

const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET || "";

/** Verify TikTok webhook signature */
function verifyTikTokSignature(body: string, signature: string): boolean {
  if (!TIKTOK_APP_SECRET) return true; // Skip nếu chưa cấu hình
  const expected = createHmac("sha256", TIKTOK_APP_SECRET)
    .update(body)
    .digest("hex");
  return signature === expected;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-tiktok-signature") || "";

    if (TIKTOK_APP_SECRET && !verifyTikTokSignature(rawBody, signature)) {
      console.warn("[tiktok-webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("[tiktok-webhook] Received:", JSON.stringify(body).slice(0, 200));

    // TikTok gửi data theo format khác nhau tùy version API
    // Hỗ trợ cả v1 và v2 format
    const leads = body?.data?.leads || body?.leads || [body];
    const created: string[] = [];

    for (const leadData of leads) {
      // Trích xuất field_data từ TikTok Lead form
      const fieldData: { name: string; value: string }[] = leadData?.field_data || [];
      const getField = (name: string) =>
        fieldData.find(f => f.name === name)?.value || "";

      const fullName =
        getField("FULL_NAME") ||
        getField("full_name") ||
        `${getField("FIRST_NAME")} ${getField("LAST_NAME")}`.trim() ||
        leadData?.name || "Khách hàng TikTok";

      const phone =
        getField("PHONE_NUMBER") ||
        getField("phone_number") ||
        getField("PHONE") ||
        leadData?.phone || "";

      const email =
        getField("EMAIL") ||
        getField("email") ||
        leadData?.email || "";

      const lead = await createRawLead({
        source: "tiktok_lead",
        fullName,
        phone,
        email,
        adName: leadData?.ad_name || body?.ad_name || undefined,
        campaignName: leadData?.campaign_name || body?.campaign_name || undefined,
        formName: leadData?.form_name || body?.form_name || undefined,
        message: getField("MESSAGE") || getField("message") || undefined,
        rawData: leadData,
      });
      created.push(lead.id);
    }

    console.log(`[tiktok-webhook] Created ${created.length} raw leads`);
    return NextResponse.json({ received: true, created: created.length });
  } catch (e) {
    console.error("[tiktok-webhook] Error:", e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
