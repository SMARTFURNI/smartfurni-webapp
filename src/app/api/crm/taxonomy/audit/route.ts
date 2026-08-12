import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getLeads } from "@/lib/crm-store";
import { previewCanonicalLeadTaxonomy } from "@/lib/crm-taxonomy";

/**
 * Báo cáo xem trước, tuyệt đối không ghi dữ liệu.
 * Chỉ quản trị viên được phép xem danh sách cần chuẩn hóa.
 */
export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const leads = await getLeads({ canonicalize: false });
  const previews = leads.map(previewCanonicalLeadTaxonomy);
  const affected = previews.filter(item => item.changes.length > 0 || item.invalidStage || item.invalidType);

  return NextResponse.json({
    mode: "preview_only",
    totalLeads: leads.length,
    affectedLeads: affected.length,
    invalidStages: affected.filter(item => item.invalidStage).length,
    invalidTypes: affected.filter(item => item.invalidType).length,
    changesByField: affected.reduce<Record<string, number>>((summary, item) => {
      for (const field of item.changes) summary[field] = (summary[field] ?? 0) + 1;
      return summary;
    }, {}),
    preview: affected.slice(0, 100),
    note: "Endpoint này chỉ lập báo cáo. Cần xác nhận riêng trước khi cập nhật dữ liệu hiện có.",
  });
}
