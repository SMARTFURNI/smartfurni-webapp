import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// 1x1 transparent GIF pixel (base64)
const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("c");
  const logId = searchParams.get("l");

  if (campaignId && logId) {
    try {
      // Cập nhật log: status → opened, opened_at = now
      await query(
        `UPDATE crm_email_logs
         SET status = 'opened', opened_at = NOW()
         WHERE id = $1 AND campaign_id = $2 AND status = 'sent'`,
        [logId, campaignId]
      );

      // Cập nhật open_count trên campaign
      await query(
        `UPDATE crm_email_campaigns
         SET open_count = (
           SELECT COUNT(*) FROM crm_email_logs
           WHERE campaign_id = $1 AND status = 'opened'
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [campaignId]
      );
    } catch (err) {
      console.error("[track/open] DB error:", err);
    }
  }

  // Luôn trả về pixel GIF dù có lỗi hay không
  return new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
