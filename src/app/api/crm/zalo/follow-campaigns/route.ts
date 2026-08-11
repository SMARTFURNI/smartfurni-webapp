import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  getZaloFollowReport,
  saveZaloFollowCampaign,
  setZaloFollowCampaignStatus,
  type ZaloFollowCampaignStatus,
} from "@/lib/zalo-follow-campaign-store";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Yêu cầu không hợp lệ." }, { status });
}

export async function GET(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getZaloFollowReport({
      from: req.nextUrl.searchParams.get("from") || undefined,
      to: req.nextUrl.searchParams.get("to") || undefined,
    }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return errorResponse(new Error("Chỉ quản trị viên được thay đổi chiến dịch Quan tâm Zalo OA."), 403);
  try {
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action || "save");
    if (action === "status") {
      await setZaloFollowCampaignStatus(String(body.id || ""), String(body.status || "") as ZaloFollowCampaignStatus);
      return NextResponse.json({ ok: true });
    }
    const campaign = body.campaign && typeof body.campaign === "object"
      ? body.campaign as Record<string, unknown>
      : body;
    const saved = await saveZaloFollowCampaign({
      id: String(campaign.id || "") || undefined,
      slug: String(campaign.slug || "") || undefined,
      name: String(campaign.name || ""),
      productKey: String(campaign.productKey || ""),
      headline: String(campaign.headline || ""),
      description: String(campaign.description || ""),
      benefits: Array.isArray(campaign.benefits) ? campaign.benefits.map(String) : [],
      heroImage: String(campaign.heroImage || ""),
      galleryImages: Array.isArray(campaign.galleryImages) ? campaign.galleryImages.map(String) : [],
      chatUrl: String(campaign.chatUrl || ""),
      welcomeMessage: String(campaign.welcomeMessage || ""),
      offerTitle: String(campaign.offerTitle || ""),
      offerDescription: String(campaign.offerDescription || ""),
      ctaLabel: String(campaign.ctaLabel || ""),
      audienceTags: Array.isArray(campaign.audienceTags) ? campaign.audienceTags.map(String) : [],
      carePlan: Array.isArray(campaign.carePlan) ? campaign.carePlan.map((item, index) => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          week: index + 1,
          title: String(row.title || ""),
          content: String(row.content || ""),
          cta: String(row.cta || ""),
        };
      }) : [],
      widgetMode: String(campaign.widgetMode) === "interactive" ? "interactive" : "follow",
    }, "admin");
    return NextResponse.json({ ok: true, campaign: saved });
  } catch (error) {
    return errorResponse(error);
  }
}
