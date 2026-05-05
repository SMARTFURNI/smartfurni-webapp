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
  customDomain?: string;
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
  {
    slug: "gsf150",
    title: "SmartFurni GSF150 — Bán Lẻ",
    description: "Landing page bán lẻ khung giường công thái học GSF150 hướng tới khách hàng tiêu dùng cuối",
    url: "/lp/gsf150",
    status: "active",
    createdAt: "2026-04-25",
  },
];

export default function AdminLandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>(STATIC_PAGES);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPage, setNewPage] = useState({ slug: "", title: "", description: "" });
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cloneSource, setCloneSource] = useState<string | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneForm, setCloneForm] = useState({ title: "", slug: "", customDomain: "" });
  const [showDomainDialog, setShowDomainDialog] = useState<string | null>(null);
  const [domainForm, setDomainForm] = useState("");

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
        customDomain: `smartfurni.com.vn/lp/${slug}`,
      },
    ]);
    setNewPage({ slug: "", title: "", description: "" });
    setShowCreateForm(false);
  }

  function handleClone(e: React.FormEvent) {
    e.preventDefault();
    if (!cloneSource || !cloneForm.slug || !cloneForm.title) return;
    const sourcePage = pages.find((p) => p.slug === cloneSource);
    if (!sourcePage) return;
    const slug = cloneForm.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setPages((prev) => [
      ...prev,
      {
        slug,
        title: cloneForm.title,
        description: sourcePage.description,
        url: `/lp/${slug}`,
        status: "draft",
        createdAt: new Date().toISOString().split("T")[0],
        customDomain: cloneForm.customDomain || `smartfurni.com.vn/lp/${slug}`,
      },
    ]);
    setShowCloneDialog(false);
    setCloneSource(null);
    setCloneForm({ title: "", slug: "", customDomain: "" });
  }

  function handleUpdateDomain(slug: string, newDomain: string) {
    setPages((prev) =>
      prev.map((p) =>
        p.slug === slug ? { ...p, customDomain: newDomain } : p
      )
    );
    setShowDomainDialog(null);
    setDomainForm("");
  }

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);
  const activeCount = pages.filter((p) => p.status === "active").length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Landing Pages</h1>
        <p className="text-muted">Quản lý các trang landing page, theo dõi leads, và tối ưu hóa hiệu suất</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Tổng Landing Pages", value: pages.length, icon: "📄", color: "primary" },
          { label: "Đang hoạt động", value: activeCount, icon: "✓", color: "success" },
          { label: "Tổng Leads nhận được", value: totalLeads, icon: "👥", color: "warning" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className="text-4xl opacity-30">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Tìm kiếm landing page..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap"
          style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
        >
          + Tạo Landing Page
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-surface border border-border rounded-lg p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Tạo Landing Page mới</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Tiêu đề *</label>
              <input
                required
                value={newPage.title}
                onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                placeholder="VD: Đối tác Showroom Nệm"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Slug URL *</label>
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
            <label className="text-sm font-medium text-foreground mb-2 block">Mô tả</label>
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

      {/* Clone Dialog */}
      {showCloneDialog && cloneSource && (
        <form
          onSubmit={handleClone}
          className="mb-6 bg-surface border border-border rounded-lg p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Sao chép Landing Page: {pages.find((p) => p.slug === cloneSource)?.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Tiêu đề mới *</label>
              <input
                required
                value={cloneForm.title}
                onChange={(e) => setCloneForm({ ...cloneForm, title: e.target.value })}
                placeholder="VD: GSF150 - Phiên bản mới"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Slug URL *</label>
              <input
                required
                value={cloneForm.slug}
                onChange={(e) => setCloneForm({ ...cloneForm, slug: e.target.value })}
                placeholder="VD: gsf150-v2"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mb-2 block">Tên miền tùy chỉnh (tuỳ chọn)</label>
            <input
              value={cloneForm.customDomain}
              onChange={(e) => setCloneForm({ ...cloneForm, customDomain: e.target.value })}
              placeholder="VD: smartfurni.com.vn/lp/gsf150-v2"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
            >
              Sao chép ngay
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCloneDialog(false);
                setCloneSource(null);
                setCloneForm({ title: "", slug: "", customDomain: "" });
              }}
              className="px-4 py-2 rounded-lg text-sm border border-border text-muted hover:text-foreground"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Domain Dialog */}
      {showDomainDialog && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateDomain(showDomainDialog, domainForm);
          }}
          className="mb-6 bg-surface border border-border rounded-lg p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Thay đổi tên miền</h2>
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mb-2 block">Tên miền mới</label>
            <input
              required
              value={domainForm}
              onChange={(e) => setDomainForm(e.target.value)}
              placeholder="VD: smartfurni.com.vn/lp/gsf150-new"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
            >
              Cập nhật
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDomainDialog(null);
                setDomainForm("");
              }}
              className="px-4 py-2 rounded-lg text-sm border border-border text-muted hover:text-foreground"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-sm font-semibold text-muted">Tên Landing Page</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-muted">Tên miền</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-muted">Trạng thái</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-muted">Leads</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-muted">Ngày tạo</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-muted">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredPages.map((page) => (
            <tr
              key={page.slug}
              className="border-b border-border hover:bg-surface/50 transition-colors"
              style={{ opacity: deleting === page.slug ? 0.5 : 1 }}
            >
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{page.title}</p>
                  <p className="text-xs text-muted">{page.description}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-muted font-mono">{page.customDomain}</p>
              </td>
              <td className="px-4 py-3">
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium border inline-block"
                  style={
                    page.status === "active"
                      ? { background: "rgba(34,197,94,0.1)", color: "#22c55e", borderColor: "rgba(34,197,94,0.2)" }
                      : { background: "rgba(100,116,139,0.1)", color: "#64748b", borderColor: "rgba(100,116,139,0.2)" }
                  }
                >
                  {page.status === "active" ? "● Hoạt động" : "○ Tạm dừng"}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-foreground font-medium">{leadCounts[page.slug] ?? 0}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-muted">{page.createdAt}</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2 flex-wrap">
                  <Link
                    href={`/admin/landing-pages/leads?slug=${page.slug}`}
                    className="text-xs px-2 py-1 rounded border border-border text-foreground hover:bg-background transition-colors"
                    title="Xem leads"
                  >
                    Leads
                  </Link>
                  <button
                    onClick={() => copyUrl(page.url, page.slug)}
                    className="text-xs px-2 py-1 rounded border border-border text-foreground hover:bg-background transition-colors"
                    title="Copy URL"
                  >
                    {copied === page.slug ? "✓" : "Copy"}
                  </button>
                  <Link
                    href={page.url}
                    target="_blank"
                    className="text-xs px-2 py-1 rounded border border-border text-foreground hover:bg-background transition-colors"
                    title="Xem trang"
                  >
                    Xem
                  </Link>
                  <Link
                    href={`${page.url}?edit=1`}
                    target="_blank"
                    className="text-xs px-2 py-1 rounded text-white font-medium"
                    style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
                    title="Chỉnh sửa"
                  >
                    Sửa
                  </Link>
                  <button
                    onClick={() => {
                      setCloneSource(page.slug);
                      setShowCloneDialog(true);
                    }}
                    className="text-xs px-2 py-1 rounded border border-border text-foreground hover:bg-background transition-colors"
                    title="Sao chép"
                  >
                    Sao chép
                  </button>
                  <button
                    onClick={() => {
                      setShowDomainDialog(page.slug);
                      setDomainForm(page.customDomain || "");
                    }}
                    className="text-xs px-2 py-1 rounded border border-border text-foreground hover:bg-background transition-colors"
                    title="Thay đổi tên miền"
                  >
                    Domain
                  </button>
                  <button
                    onClick={() => toggleStatus(page.slug)}
                    className="text-xs px-2 py-1 rounded border border-border text-foreground hover:bg-background transition-colors"
                    title={page.status === "active" ? "Tạm dừng" : "Kích hoạt"}
                  >
                    {page.status === "active" ? "Dừng" : "Kích"}
                  </button>
                  {page.slug !== "doi-tac-showroom-nem" && page.slug !== "gsf150" && (
                    <button
                      onClick={() => deletePage(page.slug)}
                      className="text-xs px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Xóa"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </td>
            </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filteredPages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted mb-2">Không tìm thấy landing page nào</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-sm text-primary hover:underline"
          >
            Tạo landing page mới
          </button>
        </div>
      )}

      {/* Guide */}
      <div className="mt-8 p-4 bg-surface border border-border rounded-lg text-sm text-muted">
        <strong className="text-foreground">💡 Hướng dẫn:</strong>
        <ul className="mt-2 space-y-1 ml-4">
          <li>• Nhấn <strong>Sửa</strong> để chỉnh sửa nội dung landing page inline</li>
          <li>• Nhấn <strong>Sao chép</strong> để tạo landing page mới từ template hiện tại</li>
          <li>• Nhấn <strong>Domain</strong> để thay đổi tên miền tùy chỉnh</li>
          <li>• Nội dung được lưu vào PostgreSQL, không mất khi deploy lại</li>
        </ul>
      </div>
    </div>
  );
}
