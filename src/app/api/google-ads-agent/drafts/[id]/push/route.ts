import { NextResponse } from "next/server";
import { getGoogleAdsAgentSession } from "@/lib/google-ads-agent/auth";
import { getDraftById, saveDraft, setDraftStatus } from "@/lib/google-ads-agent/store";
import { GoogleAdsService } from "@/services/google-ads/GoogleAdsService";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const draft = await getDraftById(id);
  if (!draft) return NextResponse.json({ error: "Không tìm thấy bản nháp" }, { status: 404 });
  try {
    const service = new GoogleAdsService();
    const result = await service.pushApprovedDraftAsPausedCampaign(draft, session.actor);
    const updated = {
      ...draft,
      googleCampaignId: result.campaignId,
      updatedAt: new Date().toISOString(),
    };
    await saveDraft(updated);
    if (!result.dryRun) await setDraftStatus(id, "pushed_to_google", session.actor);
    return NextResponse.json({ draft: updated, result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
