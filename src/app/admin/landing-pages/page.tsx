"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type LandingPage = {
  slug: string;
  title: string;
  description: string;
  url: string;
  status: "active" | "draft";
  leadCount?: number;
  createdAt?: string;
};

const STATIC_PAGES: LandingPage[] = [
  {
    slug: "doi-tac-showroom-nem",
    title: "Đối tác Showroom Nệm",
    description: "Landing page B2B thu hút chủ showroom nệm đăng ký đại lý SmartFurni",
    url: "/lp/doi-tac-showroom-nem",
    status: "active",
    createdAt: "2026-04-21",
  },
];

export default function AdminLandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>(STATIC_PAGES);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPage, setNewPage] = useState({ slug: "", title: "", description: "" });
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/lp-content?action=lead-counts")
      .then((r) => r.json())
      .then((data) => {
        if (data.counts) setLeadCounts(data.counts);
      })
      .catch(() => {});
  }, []);

  function copyUrl(url: string, slug: string) {
    const fullUrl = `https://smartfurni-webapp-production.up.railway.app${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function toggleStatus(slug: string) {
    setPages((prev) =>
      prev.map((p) =>
        p.slug === slug ? { ...p, status: p.status === "active" ? "draft" : "active" } : p
      )
    );
  }

  function deletePage(slug: string) {
    if (!confirm(`Xác nhận xóa landing page "${slug}"?`)) return;
    setDeleting(slug);
    setTimeout(() => {
      setPages((prev) => prev.filter((p) => p.slug !== slug));
      setDeleting(null);
    }, 800);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newPage.slug || !newPage.title) return;
    const slug = newPage.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setPages((prev) => [
      ...prev,
      {
        slug,
        title: newPage.title,
        description: newPage.description,
        url: `/lp/${slug}`,
        status: "draft",
        createdAt: new Date().toISOString().split("T")[0],
      },
    ]);
    setNewPage({ slug: "", title: "", description: "" });
    setShowCreateForm(false);
  }

  const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);
  const activeCount = pages.filter((p) => p.status === "active").length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Landing Pages</h1>
          <p className="text-muted text-sm">Quản lý các trang landing page và theo dõi leads đăng ký</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)", color: "#fff" }}
        >
          + Tạo Landing Page
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Tổng Landing Pages", value: pages.length, icon: "◧" },
          { label: "Đang hoạt động", value: activeCount, icon: "✓" },
          { label: "Tổng Leads nhận được", value: totalLeads, icon: "👥" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-surface border border-border rounded-xl p-5"
        >
          <h2 className="text-base font-semibold text-foreground mb-4">Tạo Landing Page mới</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted mb-1 block">Tiêu đề *</label>
              <input
                required
                value={newPage.title}
                onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                placeholder="VD: Đối tác Showroom Nệm"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Slug URL *</label>
              <input
                required
                value={newPage.slug}
                onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                placeholder="VD: doi-tac-showroom-nem"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-muted mb-1 block">Mô tả</label>
            <input
              value={newPage.description}
              onChange={(e) => setNewPage({ ...newPage, description: e.target.value })}
              placeholder="Mô tả ngắn về mục đích của landing page"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
            >
              Tạo ngay
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-lg text-sm border border-border text-muted hover:text-foreground"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Pages list */}
      <div className="grid gap-4">
        {pages.map((page) => (
          <div
            key={page.slug}
            className="bg-surface border border-border rounded-xl p-5"
            style={{ opacity: deleting === page.slug ? 0.5 : 1, transition: "opacity 0.3s" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-base font-semibold text-foreground">{page.title}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium border"
                    style={
                      page.status === "active"
                        ? { background: "rgba(34,197,94,0.1)", color: "#22c55e", borderColor: "rgba(34,197,94,0.2)" }
                        : { background: "rgba(100,116,139,0.1)", color: "#64748b", borderColor: "rgba(100,116,139,0.2)" }
                    }
                  >
                    {page.status === "active" ? "● Đang hoạt động" : "○ Tạm dừng"}
                  </span>
                  {leadCounts[page.slug] !== undefined && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                      {leadCounts[page.slug]} leads
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted truncate">{page.description}</p>
                <p className="text-xs text-muted mt-1 font-mono">{page.url}</p>
                {page.createdAt && (
                  <p className="text-xs text-muted mt-0.5">Tạo ngày: {page.createdAt}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <Link
                  href={`/admin/landing-pages/leads?slug=${page.slug}`}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-background transition-colors"
                >
                  📋 Leads
                </Link>
                <button
                  onClick={() => copyUrl(page.url, page.slug)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-background transition-colors"
                >
                  {copied === page.slug ? "✓ Đã copy" : "🔗 Copy URL"}
                </button>
                <Link
                  href={page.url}
                  target="_blank"
                  className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-background transition-colors"
                >
                  👁 Xem
                </Link>
                <Link
                  href={`${page.url}?edit=1`}
                  target="_blank"
                  className="text-sm px-3 py-1.5 rounded-lg text-white font-medium"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
                >
                  ✏️ Chỉnh sửa
                </Link>
                <button
                  onClick={() => toggleStatus(page.slug)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-background transition-colors"
                >
                  {page.status === "active" ? "⏸ Tạm dừng" : "▶ Kích hoạt"}
                </button>
                {page.slug !== "doi-tac-showroom-nem" && (
                  <button
                    onClick={() => deletePage(page.slug)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    🗑 Xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Guide */}
      <div className="mt-6 p-4 bg-surface border border-border rounded-xl text-sm text-muted">
        <strong className="text-foreground">Hướng dẫn:</strong> Nhấn{" "}
        <span className="font-semibold text-primary">✏️ Chỉnh sửa</span> để mở trang ở chế độ inline editing.
        Hover vào bất kỳ đoạn văn bản → nhấn bút → sửa → <span className="font-semibold">Lưu</span>.
        Nội dung được lưu vào PostgreSQL, không mất khi deploy lại.
      </div>
    </div>
  );
}
