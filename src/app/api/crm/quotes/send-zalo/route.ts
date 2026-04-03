import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getQuote, getLead } from "@/lib/crm-store";
import { getCrmSettings } from "@/lib/crm-settings-store";

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId, leadId, message } = await req.json();
  if (!quoteId || !message) {
    return NextResponse.json({ error: "Missing quoteId or message" }, { status: 400 });
  }

  const [quote, settings] = await Promise.all([getQuote(quoteId), getCrmSettings()]);
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const lead = leadId ? await getLead(leadId) : null;

  // Lấy Zalo access token từ settings hoặc env
  const zaloToken = process.env.ZALO_ACCESS_TOKEN || (settings as unknown as Record<string, unknown>)?.zaloAccessToken as string;
  if (!zaloToken) {
    return NextResponse.json({ error: "Zalo access token chưa được cấu hình" }, { status: 400 });
  }

  // Lấy zaloId hoặc phone của khách
  const zaloUserId = (lead as unknown as Record<string, unknown>)?.zaloId as string;
  if (!zaloUserId) {
    return NextResponse.json({ error: "Khách hàng chưa có Zalo ID. Vui lòng kết nối Zalo trước." }, { status: 400 });
  }

  try {
    const zaloRes = await fetch("https://openapi.zalo.me/v2.0/oa/message/cs/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": zaloToken,
      },
      body: JSON.stringify({
        recipient: { user_id: zaloUserId },
        message: { text: message },
      }),
    });

    const zaloData = await zaloRes.json();
    if (zaloData.error !== 0) {
      console.error("[Zalo Quote Send]", zaloData);
      return NextResponse.json({ error: `Zalo API lỗi: ${zaloData.message || "Unknown error"}` }, { status: 500 });
    }

    console.log(`[Quote Zalo] Sent quote ${quote.quoteNumber} to lead ${lead?.name || leadId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Quote Zalo Error]", err);
    return NextResponse.json({ error: "Lỗi kết nối Zalo API" }, { status: 500 });
  }
}
