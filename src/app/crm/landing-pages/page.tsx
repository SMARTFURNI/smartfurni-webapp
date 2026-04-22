import { requireCrmAccess } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function CrmLandingPagesPage() {
  await requireCrmAccess();

  type LeadRow = {
    id: number;
    full_name: string;
    phone: string;
    raw_data: Record<string, string> | null;
    created_at: Date;
    source: string | null;
    customer_role: string | null;
  };

  let leads: LeadRow[] = [];
  let totalCount = 0;
  let newToday = 0;
  let newThisWeek = 0;
  let convertedCount = 0;

  try {
    const result = await db.query<LeadRow>(
      `SELECT id, full_name, phone, raw_data, created_at, source, customer_role
       FROM crm_raw_leads
       WHERE campaign_name ILIKE '%showroom%' OR campaign_name ILIKE '%b2b%'
          OR form_name ILIKE '%landing%' OR ad_name ILIKE '%LP%'
       ORDER BY created_at DESC
       LIMIT 200`,
      []
    );
    leads = result.rows ?? [];
    totalCount = leads.length;
    const today = new Date().toDateString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    newToday = leads.filter((l) => new Date(l.created_at).toDateString() === today).length;
    newThisWeek = leads.filter((l) => new Date(l.created_at) >= weekAgo).length;
    convertedCount = leads.filter((l) => l.customer_role?.includes("convert") || l.source === "converted").length;
  } catch {
    // Table may not exist yet
  }

  const convertRate = totalCount > 0 ? ((convertedCount / totalCount) * 100).toFixed(1) : "0";

  const pages = [
    {
      slug: "doi-tac-showroom-nem",
      title: "Đối tác Showroom Nệm",
      description: "Landing page B2B thu hút chủ showroom nệm đăng ký đại lý SmartFurni",
      url: "/lp/doi-tac-showroom-nem",
      status: "active",
      leads: totalCount,
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Landing Pages</h1>
        <p className="text-muted text-sm">Theo dõi hiệu quả và quản lý nội dung các trang landing page</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Tổng LP", value: pages.length, color: "#C9A84C", icon: "◧" },
          { label: "Tổng Leads", value: totalCount, color: "#C9A84C", icon: "👥" },
          { label: "Lead mới hôm nay", value: newToday, color: "#22c55e", icon: "🆕" },
          { label: "Tuần này", value: newThisWeek, color: "#3b82f6", icon: "📅" },
          { label: "Tỉ lệ convert", value: `${convertRate}%`, color: "#a855f7", icon: "📈" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface border border-border rounded-xl p-3 text-center">
            <div className="text-lg mb-0.5">{kpi.icon}</div>
            <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-xs text-muted mt-0.5 leading-tight">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Pages list */}
      <div className="grid gap-4 mb-6">
        {pages.map((page) => (
          <div key={page.slug} className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-base font-semibold text-foreground">{page.title}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium border"
                    style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", borderColor: "rgba(34,197,94,0.2)" }}
                  >
                    ● Đang hoạt động
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium border"
                    style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", borderColor: "rgba(201,168,76,0.2)" }}
                  >
                    {page.leads} leads
                  </span>
                </div>
                <p className="text-sm text-muted">{page.description}</p>
                <p className="text-xs text-muted mt-1 font-mono">{page.url}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <Link
                  href={`/admin/landing-pages/leads?slug=${page.slug}`}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-background transition-colors"
                >
                  📋 Xem Leads
                </Link>
                <Link
                  href={page.url}
                  target="_blank"
                  className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-background transition-colors"
                >
                  👁 Xem trang
                </Link>
                <Link
                  href={`${page.url}?edit=1`}
                  target="_blank"
                  className="text-sm px-3 py-1.5 rounded-lg text-white font-medium"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
                >
                  ✏️ Chỉnh sửa
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent leads preview */}
      {leads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Leads gần đây</h2>
            <Link
              href="/admin/landing-pages/leads"
              className="text-sm text-primary hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left p-3 text-muted font-medium">Thời gian</th>
                  <th className="text-left p-3 text-muted font-medium">Tên / Showroom</th>
                  <th className="text-left p-3 text-muted font-medium">SĐT Zalo</th>
                  <th className="text-left p-3 text-muted font-medium">Tỉnh/TP</th>
                  <th className="text-left p-3 text-muted font-medium">Nguồn</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 10).map((lead) => {
                  const raw = (lead.raw_data as Record<string, string>) || {};
                  return (
                    <tr key={lead.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                      <td className="p-3 text-muted text-xs whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString("vi-VN", {
                          day: "2-digit", month: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{lead.full_name}</div>
                        {raw.showroomName && (
                          <div className="text-muted text-xs">🏪 {raw.showroomName}</div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <a href={`tel:${lead.phone}`} className="font-mono text-xs hover:underline" style={{ color: "#C9A84C" }}>
                          {lead.phone}
                        </a>
                      </td>
                      <td className="p-3 text-muted text-xs">{raw.province || "—"}</td>
                      <td className="p-3 text-xs text-muted">{raw.utmSource || lead.source || "Direct"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="mt-6 p-4 bg-surface border border-border rounded-xl text-sm text-muted">
        <strong className="text-foreground">Hướng dẫn chỉnh sửa nội dung:</strong> Nhấn{" "}
        <span className="font-semibold" style={{ color: "#C9A84C" }}>✏️ Chỉnh sửa</span> để mở trang landing page ở chế độ chỉnh sửa inline.
        Hover vào bất kỳ đoạn văn bản → nhấn biểu tượng bút → sửa → nhấn <span className="font-semibold text-foreground">Lưu</span>.
      </div>
    </div>
  );
}
