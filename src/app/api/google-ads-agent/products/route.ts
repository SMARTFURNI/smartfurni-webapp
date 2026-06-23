import { NextResponse } from "next/server";
import { getGoogleAdsAgentSession } from "@/lib/google-ads-agent/auth";
import { getAdProducts } from "@/lib/google-ads-agent/store";

export async function GET() {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getAdProducts());
}
