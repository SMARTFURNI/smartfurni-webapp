import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function AdminLpLeadsPage() {
  await requireAdmin();

  // Lấy leads từ crm_raw_leads với source liên quan đến LP
  let leads: Array<{
    id: number;
    full_name: string;
    phone: string;
    email: string | null;
    customer_role: string | null;
    message: string | null;
    ad_name: string | null;
    campaign_name: string | null;
    raw_data: Record<string, string> | null;
    created_at: Date;
  }> = [];

  try {
    const result = await db.query(
      `SELECT id, full_name, phone, email, customer_role, message, ad_name, campaign_name, raw_data, created_at
       FROM crm_raw_leads
       WHERE campaign_name ILIKE '%showroom%' OR campaign_name ILIKE '%b2b%' OR form_name ILIKE '%landing%' OR ad_name ILIKE '%LP%'
       ORDER BY created_at DESC
       LIMIT 200`,
      []
    );
    leads = result.rows;
  } catch {
    // Table may not exist yet
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/landing-pages" className="text-muted hover:text-foreground text-sm">← Landing Pages</Link>
        <span className="text-muted">/</span>
        <h1 className="text-xl font-bold text-foreground">Leads đăng ký — Đối tác Showroom Nệm</h1>
        <span className="ml-auto text-sm text-muted">{leads.length} leads</span>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <div className="text-4xl mb-3">📋</div>
          <p>Chưa có leads nào từ landing page</p>
          <Link href="/lp/doi-tac-showroom-nem" target="_blank" className="text-primary text-sm mt-2 inline-block hover:underline">
            Xem landing page →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left p-3 text-muted font-medium">Thời gian</th>
                <th className="text-left p-3 text-muted font-medium">Tên / Showroom</th>
                <th className="text-left p-3 text-muted font-medium">SĐT Zalo</th>
                <th className="text-left p-3 text-muted font-medium">Tỉnh/TP</th>
                <th className="text-left p-3 text-muted font-medium">Ghi chú</th>
                <th className="text-left p-3 text-muted font-medium">Nguồn</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const raw = lead.raw_data || {};
                return (
                  <tr key={lead.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                    <td className="p-3 text-muted whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{lead.full_name}</div>
                      {raw.showroomName && <div className="text-muted text-xs mt-0.5">🏪 {raw.showroomName}</div>}
                    </td>
                    <td className="p-3">
                      <a href={`tel:${lead.phone}`} className="text-primary hover:underline font-mono">{lead.phone}</a>
                    </td>
                    <td className="p-3 text-muted">{raw.province || "—"}</td>
                    <td className="p-3 text-muted max-w-xs truncate">{lead.message || "—"}</td>
                    <td className="p-3 text-muted text-xs">{raw.utmSource || lead.ad_name || "Direct"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
