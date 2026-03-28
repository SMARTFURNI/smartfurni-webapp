import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getEmailCampaigns, saveEmailCampaign, initEmailMarketingSchema } from "@/lib/email-marketing-store";
import type { EmailCampaign } from "@/lib/email-marketing-store";

export async function GET() {
  try {
    await initEmailMarketingSchema();
    const campaigns = await getEmailCampaigns();
    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    console.error("[email-campaigns] GET error:", error);
    return NextResponse.json({ success: false, error: "Lỗi lấy danh sách chiến dịch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initEmailMarketingSchema();
    const body = await request.json();
    const { name, description, targetSegments } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tên chiến dịch không được để trống" },
        { status: 400 }
      );
    }

    const campaign: EmailCampaign = {
      id: randomUUID(),
      name,
      description: description || "",
      status: "draft",
      targetSegments: targetSegments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveEmailCampaign(campaign);
    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("[email-campaigns] POST error:", error);
    return NextResponse.json({ success: false, error: "Lỗi tạo chiến dịch" }, { status: 500 });
  }
}
