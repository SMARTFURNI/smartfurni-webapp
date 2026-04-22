import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function AdminLpLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  await requireAdmin();
  const { slug } = await searchParams;

  type LeadRow = {
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
    source: string | null;
  };

  let leads: LeadRow[] = [];
  let totalCount = 0;
  let newToday = 0;
  let convertedCount = 0;

  try {
    const result = await db.query<LeadRow>(
      `SELECT id, full_name, phone, email, customer_role, message, ad_name, campaign_name, raw_data, created_at, source
       FROM crm_raw_leads
       WHERE campaign_name ILIKE '%showroom%' OR campaign_name ILIKE '%b2b%'
          OR form_name ILIKE '%landing%' OR ad_name ILIKE '%LP%'
          OR source IN ('facebook_lead', 'tiktok_lead', 'other')
       ORDER BY created_at DESC
       LIMIT 500`,
      []
    );
    leads = result.rows ?? [];
    totalCount = leads.length;
    const today = new Date().toDateString();
    newToday = leads.filter((l) => new Date(l.created_at).toDateString() === today).length;
    convertedCount = leads.filter((l) => l.customer_role?.includes("convert") || l.message?.includes("Đã chốt")).length;
  } catch {
    // Table may not exist yet
  }

  const convertRate = totalCount > 0 ? ((convertedCount / totalCount) * 100).toFixed(1) : "0";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/admin/landing-pages" className="text-muted hover:text-foreground transition-colors">
          ← Landing Pages
        </Link>
        <span className="text-muted">/</span>
        <span className="text-foreground font-medium">Leads đăng ký</span>
        {slug && <span className="text-muted">— {slug}</span>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Tổng Leads", value: totalCount, color: "#C9A84C", icon: "👥" },
          { label: "Lead hôm nay", value: newToday, color: "#22c55e", icon: "🆕" },
          { label: "Đã chuyển đổi", value: convertedCount, color: "#3b82f6", icon: "✅" },
          { label: "Tỉ lệ convert", value: `${convertRate}%`, color: "#a855f7", icon: "📈" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface border border-border rounded-xl p-4">
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-xs text-muted mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">
          Danh sách leads ({totalCount})
        </h2>
        {leads.length > 0 && (
          <a
            href="/api/admin/lp-content?action=export-leads"
            className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
          >
            ⬇ Xuất CSV
          </a>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-16 text-muted bg-surface border border-border rounded-xl">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">Chưa có leads nào từ landing page</p>
          <Link
            href="/lp/doi-tac-showroom-nem"
            target="_blank"
            className="text-primary text-sm mt-2 inline-block hover:underline"
          >
            Xem landing page →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left p-3 text-muted font-medium whitespace-nowrap">Thời gian</th>
                <th className="text-left p-3 text-muted font-medium">Tên / Showroom</th>
                <th className="text-left p-3 text-muted font-medium whitespace-nowrap">SĐT Zalo</th>
                <th className="text-left p-3 text-muted font-medium">Tỉnh/TP</th>
                <th className="text-left p-3 text-muted font-medium">Thương hiệu nệm</th>
                <th className="text-left p-3 text-muted font-medium">Ghi chú</th>
                <th className="text-left p-3 text-muted font-medium">Nguồn</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const raw = (lead.raw_data as Record<string, string>) || {};
                return (
                  <tr
                    key={lead.id}
                    className="border-b border-border hover:bg-surface/50 transition-colors"
                  >
                    <td className="p-3 text-muted whitespace-nowrap text-xs">
                      {new Date(lead.created_at).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{lead.full_name}</div>
                      {raw.showroomName && (
                        <div className="text-muted text-xs mt-0.5">🏪 {raw.showroomName}</div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <a
                        href={`tel:${lead.phone}`}
                        className="font-mono hover:underline"
                        style={{ color: "#C9A84C" }}
                      >
                        {lead.phone}
                      </a>
                    </td>
                    <td className="p-3 text-muted text-xs">{raw.province || "—"}</td>
                    <td className="p-3 text-muted text-xs">{raw.businessType || lead.customer_role || "—"}</td>
                    <td className="p-3 text-muted text-xs max-w-xs">
                      <span className="line-clamp-2">{lead.message || "—"}</span>
                    </td>
                    <td className="p-3 text-xs">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background:
                            lead.source === "facebook_lead"
                              ? "rgba(59,130,246,0.1)"
                              : lead.source === "tiktok_lead"
                              ? "rgba(168,85,247,0.1)"
                              : "rgba(100,116,139,0.1)",
                          color:
                            lead.source === "facebook_lead"
                              ? "#3b82f6"
                              : lead.source === "tiktok_lead"
                              ? "#a855f7"
                              : "#64748b",
                        }}
                      >
                        {raw.utmSource || lead.source || "Direct"}
                      </span>
                    </td>
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
