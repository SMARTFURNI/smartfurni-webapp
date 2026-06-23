import { NextResponse } from "next/server";
import { getGoogleAdsAgentSession } from "@/lib/google-ads-agent/auth";
import { listPerformance } from "@/lib/google-ads-agent/store";

export async function GET() {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await listPerformance();
  const suggestions = rows.flatMap((row) => {
    const items = [];
    if (row.conversions === 0 && row.cost > 300000) {
      items.push({ type: "negative_keyword", severity: "high", title: `${row.adGroupName}: tốn tiền chưa ra chuyển đổi`, action: "Rà soát search terms và thêm phủ định." });
    }
    if (row.cpa > 500000) {
      items.push({ type: "high_cpa", severity: "medium", title: `${row.campaignName}: CPA cao`, action: "Giảm bid nhóm rộng, ưu tiên exact/phrase có intent mua." });
    }
    if (row.ctr < 2) {
      items.push({ type: "rewrite_ads", severity: "medium", title: `${row.adGroupName}: CTR thấp`, action: "Viết lại headline nhấn mạnh đặt size, giao lắp và bảo hành." });
    }
    if (row.roas >= 4 && row.conversions >= 3) {
      items.push({ type: "increase_budget", severity: "low", title: `${row.productSku}: có thể tăng ngân sách`, action: "Đề xuất tăng 15-20%, cần duyệt thủ công trước khi áp dụng." });
    }
    return items;
  });
  return NextResponse.json(suggestions);
}
