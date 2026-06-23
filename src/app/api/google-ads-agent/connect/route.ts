import { NextRequest, NextResponse } from "next/server";
import { getGoogleAdsAgentSession } from "@/lib/google-ads-agent/auth";
import { getGoogleAdsAccounts } from "@/lib/google-ads-agent/store";
import { GoogleAdsService } from "@/services/google-ads/GoogleAdsService";

export async function GET(req: NextRequest) {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const customerId = searchParams.get("customer_id") || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "";
  const service = new GoogleAdsService();
  if (code) {
    if (!customerId) return NextResponse.json({ error: "Thieu customer_id" }, { status: 400 });
    const account = await service.connectWithCode(code, customerId, session.actor);
    return NextResponse.json({ connected: true, account });
  }
  return NextResponse.json({
    accounts: await getGoogleAdsAccounts(),
    authUrl: service.getOAuthUrl(),
    envReady: Boolean(process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_CLIENT_SECRET),
  });
}
