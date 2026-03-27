/**
 * Test endpoint cho Facebook Lead Ads webhook
 * POST /api/webhooks/facebook-lead/test
 *
 * Tạo lead giả trực tiếp vào Data Pool (không gọi HTTP loopback để tránh 503 trên Railway)
 */
import { NextResponse } from "next/server";
import { getCrmSettings } from "@/lib/crm-settings-store";
import { createRawLead } from "@/lib/crm-raw-lead-store";

export async function POST() {
  // Lấy settings để kiểm tra fbEnabled
  let settings;
  try {
    settings = await getCrmSettings();
  } catch (e) {
    return NextResponse.json({ error: "Cannot load settings" }, { status: 500 });
  }

  const fbConfig = settings.webhook;

  if (!fbConfig.fbEnabled) {
    return NextResponse.json({
      success: false,
      error: "Facebook Lead Ads chưa được bật. Hãy bật toggle và lưu cài đặt trước.",
      skipped: true,
    }, { status: 400 });
  }

  // Tạo lead giả trực tiếp (không qua HTTP để tránh loopback 503)
  const testPayload = {
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
  };

  try {
    const lead = await createRawLead({
      source: "facebook_lead",
      fullName: "Nguyễn Test Lead",
      phone: "0901234567",
      email: "test@smartfurni.vn",
      adName: "SmartFurni - Lead Test",
      campaignName: "Test Campaign",
      formName: "Form Tư vấn SmartFurni",
      message: "Quan tâm giường thông minh 1m8",
      rawData: testPayload,
    });

    return NextResponse.json({
      success: true,
      status: 200,
      created: 1,
      leadId: lead.id,
      webhookResponse: {
        received: true,
        created: 1,
      },
      testPayload: {
        object: "page",
        entry: [{
          id: "PAGE_ID_TEST",
          time: Date.now(),
          changes: [{ field: "leadgen", value: testPayload }],
        }],
      },
      signatureUsed: !!fbConfig.fbAppSecret,
      message: "Lead test đã được tạo thành công trong Data Pool",
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
