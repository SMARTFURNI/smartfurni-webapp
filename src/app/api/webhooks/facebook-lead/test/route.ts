/**
 * Test endpoint cho Facebook Lead Ads webhook
 * POST /api/webhooks/facebook-lead/test
 *
 * Gửi một lead giả để kiểm tra luồng từ Facebook → Data Pool
 * Chỉ dùng trong môi trường development/staging
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getCrmSettings } from "@/lib/crm-settings-store";

export async function POST(req: NextRequest) {
  // Lấy settings
  let settings;
  try {
    settings = await getCrmSettings();
  } catch (e) {
    return NextResponse.json({ error: "Cannot load settings" }, { status: 500 });
  }

  const fbConfig = settings.webhook;

  // Tạo payload giả giống Facebook gửi
  const body = {
    object: "page",
    entry: [
      {
        id: "PAGE_ID_TEST",
        time: Date.now(),
        changes: [
          {
            field: "leadgen",
            value: {
              leadgen_id: `test_lead_${Date.now()}`,
              page_id: "PAGE_ID_TEST",
              form_id: "FORM_ID_TEST",
              ad_id: "AD_ID_TEST",
              ad_name: "SmartFurni - Lead Test",
              campaign_name: "Test Campaign",
              form_name: "Form Tư vấn SmartFurni",
              created_time: Math.floor(Date.now() / 1000),
              field_data: [
                { name: "full_name",    values: ["Nguyễn Test Lead"] },
                { name: "phone_number", values: ["0901234567"] },
                { name: "email",        values: ["test@smartfurni.vn"] },
                { name: "nhu_cau",      values: ["Quan tâm giường thông minh 1m8"] },
              ],
            },
          },
        ],
      },
    ],
  };

  const rawBody = JSON.stringify(body);

  // Tạo chữ ký HMAC nếu có App Secret
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (fbConfig.fbAppSecret) {
    const sig = `sha256=${createHmac("sha256", fbConfig.fbAppSecret).update(rawBody).digest("hex")}`;
    headers["x-hub-signature-256"] = sig;
  }

  // Gọi webhook endpoint thật
  const webhookUrl = `${req.nextUrl.origin}/api/webhooks/facebook-lead`;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: rawBody,
    });

    const result = await res.json();

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      webhookResponse: result,
      testPayload: body,
      signatureUsed: !!fbConfig.fbAppSecret,
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
