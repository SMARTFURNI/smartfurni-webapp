import { NextRequest, NextResponse } from "next/server";
import { getGoogleAdsAgentSession } from "@/lib/google-ads-agent/auth";
import { getAdProducts, saveAdProduct } from "@/lib/google-ads-agent/store";
import type { GoogleAdsProduct } from "@/lib/google-ads-agent/types";

export async function GET() {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getAdProducts());
}

export async function PATCH(req: NextRequest) {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = (await req.json()) as GoogleAdsProduct;
  if (!input.id || !input.sku) return NextResponse.json({ error: "Thiếu mã sản phẩm" }, { status: 400 });
  if (!input.landingPageUrl?.startsWith("https://")) {
    return NextResponse.json({ error: "Landing page phải là đường dẫn HTTPS" }, { status: 400 });
  }
  return NextResponse.json(await saveAdProduct(input));
}
