import { NextRequest, NextResponse } from "next/server";
import { createRawLead } from "@/lib/crm-raw-lead-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      phone,
      email,
      businessType,
      province,
      showroomName,
      message,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      landingPage,
    } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ error: "Thiếu họ tên hoặc số điện thoại" }, { status: 400 });
    }

    // Xác định source dựa trên UTM
    let source: "facebook_lead" | "tiktok_lead" | "manual" | "other" = "other";
    if (utmSource?.toLowerCase().includes("facebook") || utmSource?.toLowerCase().includes("fb")) {
      source = "facebook_lead";
    } else if (utmSource?.toLowerCase().includes("tiktok")) {
      source = "tiktok_lead";
    }

    const lead = await createRawLead({
      fullName,
      phone,
      email: email || "",
      source,
      adName: utmContent || landingPage || "LP Đối tác Showroom Nệm",
      campaignName: utmCampaign || "b2b-showroom-nem",
      formName: "Landing Page B2B - Đối tác Showroom Nệm",
      customerRole: businessType || "Chủ Showroom Nệm/Chăn ga gối",
      message: [
        showroomName ? `Showroom: ${showroomName}` : null,
        province ? `Tỉnh/TP: ${province}` : null,
        message ? `Ghi chú: ${message}` : null,
      ].filter(Boolean).join(" | ") || undefined,
      rawData: {
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        landingPage,
        businessType,
        province,
        showroomName,
        submittedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (e) {
    console.error("[lp/submit-lead]", e);
    return NextResponse.json({ error: "Có lỗi xảy ra, vui lòng thử lại" }, { status: 500 });
  }
}
