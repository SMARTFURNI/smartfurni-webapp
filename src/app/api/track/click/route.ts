import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("c");
  const logId = searchParams.get("l");
  const url = searchParams.get("url");

  // Validate URL đích
  const redirectUrl = url ? decodeURIComponent(url) : "https://smartfurni.vn";

  if (campaignId && logId) {
    try {
      // Cập nhật log: status → clicked (nếu chưa clicked)
      await query(
        `UPDATE crm_email_logs
         SET status = 'clicked', clicked_at = NOW()
         WHERE id = $1 AND campaign_id = $2 AND status IN ('sent', 'opened')`,
        [logId, campaignId]
      );

      // Cập nhật click_count trên campaign
      await query(
        `UPDATE crm_email_campaigns
         SET click_count = (
           SELECT COUNT(*) FROM crm_email_logs
           WHERE campaign_id = $1 AND status = 'clicked'
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [campaignId]
      );
    } catch (err) {
      console.error("[track/click] DB error:", err);
    }
  }

  // Redirect tới URL đích
  return NextResponse.redirect(redirectUrl, { status: 302 });
}
