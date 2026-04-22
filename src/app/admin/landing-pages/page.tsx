import { requireAdmin } from "@/lib/admin-auth";
import Link from "next/link";

export default async function AdminLandingPagesPage() {
  await requireAdmin();

  const pages = [
    {
      slug: "doi-tac-showroom-nem",
      title: "Đối tác Showroom Nệm",
      description: "Landing page B2B thu hút chủ showroom nệm đăng ký đại lý SmartFurni",
      url: "/lp/doi-tac-showroom-nem",
      status: "active",
      leads: "Xem leads →",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Landing Pages</h1>
        <p className="text-muted text-sm">Quản lý các trang landing page và theo dõi leads đăng ký</p>
      </div>

      <div className="grid gap-4">
        {pages.map((page) => (
          <div key={page.slug} className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-semibold text-foreground">{page.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 font-medium">
                  {page.status === "active" ? "Đang hoạt động" : "Tắt"}
                </span>
              </div>
              <p className="text-sm text-muted truncate">{page.description}</p>
              <p className="text-xs text-muted mt-1 font-mono">{page.url}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/admin/landing-pages/leads?slug=${page.slug}`}
                className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
              >
                📋 Leads
              </Link>
              <Link
                href={page.url}
                target="_blank"
                className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface transition-colors"
              >
                👁 Xem trang
              </Link>
              <Link
                href={`${page.url}?edit=1`}
                className="text-sm px-3 py-1.5 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
              >
                ✏️ Chỉnh sửa
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-surface border border-border rounded-xl text-sm text-muted">
        <strong className="text-foreground">Hướng dẫn chỉnh sửa nội dung:</strong> Nhấn nút{" "}
        <span className="font-semibold text-primary">✏️ Chỉnh sửa</span> để mở trang landing page ở chế độ chỉnh sửa.
        Hover vào bất kỳ đoạn văn bản nào → nhấn biểu tượng bút để sửa → nhấn{" "}
        <span className="font-semibold">Lưu</span> để cập nhật ngay lập tức.
      </div>
    </div>
  );
}
