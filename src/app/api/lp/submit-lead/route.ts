import { NextRequest, NextResponse } from "next/server";
import { createRawLead } from "@/lib/crm-raw-lead-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName: fullNameRaw,
      name: nameRaw,
      phone,
      email,
      businessType,
      province,
      showroomName,
      message,
      note,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      landingPage,
      landingPageSlug,
    } = body;
    // Support both 'fullName' (B2B form) and 'name' (quiz form)
    const fullName = fullNameRaw || nameRaw;

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

    const slug = landingPageSlug || landingPage || "sofa-giuong";
    const lead = await createRawLead({
      fullName,
      phone,
      email: email || "",
      source,
      adName: utmContent || slug || "LP Sofa Giường",
      campaignName: utmCampaign || slug || "sofa-giuong",
      formName: `Landing Page - ${slug}`,
      customerRole: businessType || "Khách hàng",
      message: [
        showroomName ? `Showroom: ${showroomName}` : null,
        province ? `Tỉnh/TP: ${province}` : null,
        note ? note : null,
        message ? `Ghi chú: ${message}` : null,
      ].filter(Boolean).join(" | ") || undefined,
      rawData: {
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        landingPage: slug,
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
