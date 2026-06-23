import { NextRequest, NextResponse } from "next/server";
import { getGoogleAdsAgentSession } from "@/lib/google-ads-agent/auth";
import { getAdProductBySku, listDrafts, saveDraft } from "@/lib/google-ads-agent/store";
import { AIAdGenerator } from "@/services/google-ads/AIAdGenerator";
import type { CampaignInput } from "@/lib/google-ads-agent/types";

export async function GET() {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listDrafts());
}

export async function POST(req: NextRequest) {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await req.json() as CampaignInput;
  const product = await getAdProductBySku(input.productSku);
  if (!product) return NextResponse.json({ error: "Khong tim thay san pham" }, { status: 400 });
  if (!product.landingPageUrl) return NextResponse.json({ error: "San pham thieu landing page" }, { status: 400 });
  const generator = new AIAdGenerator();
  const draft = await generator.generateDraft(input, product, session.actor);
  await saveDraft(draft);
  return NextResponse.json(draft, { status: 201 });
}
