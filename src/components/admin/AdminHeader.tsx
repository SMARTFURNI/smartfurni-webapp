"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

// ─── Breadcrumb config ────────────────────────────────────────────────────────

const BREADCRUMB_MAP: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/posts": "Bài viết",
  "/admin/posts/new": "Viết bài mới",
  "/admin/products": "Sản phẩm",
  "/admin/products/new": "Thêm sản phẩm",
  "/admin/orders": "Đơn hàng",
  "/admin/orders/new": "Tạo đơn hàng",
  "/admin/contacts": "Liên hệ",
  "/admin/users": "Người dùng",
  "/admin/users/new": "Thêm khách hàng",
  "/admin/settings": "Cài đặt",
};

function getBreadcrumbs(pathname: string) {
  const crumbs: { label: string; href: string }[] = [
    { label: "Admin", href: "/admin" },
  ];

  const parts = pathname.split("/").filter(Boolean);
  let current = "";

  for (let i = 0; i < parts.length; i++) {
    current += "/" + parts[i];
    const label = BREADCRUMB_MAP[current];
    if (label && current !== "/admin") {
      // Check if it's a dynamic segment (edit pages)
      if (parts[i + 1] === "edit") {
        crumbs.push({ label: "Chi tiết", href: current });
        crumbs.push({ label: "Chỉnh sửa", href: current + "/edit" });
        break;
      }
      crumbs.push({ label, href: current });
    } else if (!label && current !== "/admin") {
      // Dynamic segment like [id] or [slug]
      const parentLabel = BREADCRUMB_MAP[current.split("/").slice(0, -1).join("/")];
      if (parts[i + 1] === "edit") {
        crumbs.push({ label: "Chi tiết", href: current });
        crumbs.push({ label: "Chỉnh sửa", href: current + "/edit" });
        break;
      }
    }
  }

  return crumbs;
}

// ─── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Viết bài mới", href: "/admin/posts/new", icon: "✏️", shortcut: "N" },
  { label: "Thêm sản phẩm", href: "/admin/products/new", icon: "🛏️", shortcut: "P" },
  { label: "Tạo đơn hàng", href: "/admin/orders/new", icon: "📋", shortcut: "O" },
  { label: "Thêm khách hàng", href: "/admin/users/new", icon: "👤", shortcut: "U" },
];

// ─── Search suggestions ────────────────────────────────────────────────────────

const SEARCH_SUGGESTIONS = [
  { label: "Bài viết", href: "/admin/posts", icon: "📝", category: "Trang" },
  { label: "Sản phẩm", href: "/admin/products", icon: "🛏️", category: "Trang" },
  { label: "Đơn hàng", href: "/admin/orders", icon: "📋", category: "Trang" },
  { label: "Liên hệ", href: "/admin/contacts", icon: "💬", category: "Trang" },
  { label: "Người dùng", href: "/admin/users", icon: "👥", category: "Trang" },
  { label: "Cài đặt", href: "/admin/settings", icon: "⚙️", category: "Trang" },
  { label: "Viết bài mới", href: "/admin/posts/new", icon: "✏️", category: "Thao tác" },
  { label: "Thêm sản phẩm", href: "/admin/products/new", icon: "➕", category: "Thao tác" },
  { label: "Tạo đơn hàng", href: "/admin/orders/new", icon: "📦", category: "Thao tác" },
  { label: "Thêm khách hàng", href: "/admin/users/new", icon: "👤", category: "Thao tác" },
  { label: "Cài đặt email", href: "/admin/settings", icon: "📧", category: "Thao tác" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = getBreadcrumbs(pathname);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl+K to open search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuickActionsOpen(false);
        setSearchQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredSuggestions = searchQuery
    ? SEARCH_SUGGESTIONS.filter((s) =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_SUGGESTIONS;

  function handleSearchSelect(href: string) {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-4">
        {/* Left: Breadcrumb + Title */}
        <div className="min-w-0">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-[rgba(245,237,214,0.45)] mb-2">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[rgba(245,237,214,0.35)]">/</span>}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-[rgba(245,237,214,0.70)]">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-[#C9A84C] transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Title */}
          {title && (
            <div>
              <h1 className="text-2xl font-bold text-white truncate">{title}</h1>
              {subtitle && <p className="text-[rgba(245,237,214,0.55)] text-sm mt-0.5">{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Right: Search + Quick Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search button */}
          <button
            onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
            className="flex items-center gap-2 text-sm text-[rgba(245,237,214,0.55)] hover:text-gray-300 bg-[#1a1200] border border-[rgba(255,200,100,0.14)] hover:border-[rgba(255,200,100,0.22)] px-4 py-2 rounded-xl transition-all"
          >
            <span>🔍</span>
            <span className="hidden sm:inline">Tìm kiếm...</span>
            <kbd className="hidden sm:inline text-xs bg-[#C9A84C]/10 text-[#C9A84C]/60 px-1.5 py-0.5 rounded border border-[rgba(255,200,100,0.14)]">⌘K</kbd>
          </button>

          {/* Quick actions */}
          <div className="relative">
            <button
              onClick={() => setQuickActionsOpen(!quickActionsOpen)}
              className="flex items-center gap-2 text-sm font-semibold bg-[#C9A84C] text-black px-4 py-2 rounded-xl hover:bg-[#E2C97E] transition-colors"
            >
              <span>+</span>
              <span className="hidden sm:inline">Tạo mới</span>
            </button>
            {quickActionsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setQuickActionsOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-2">
                    {QUICK_ACTIONS.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        onClick={() => setQuickActionsOpen(false)}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <span>{action.icon}</span>
                          <span>{action.label}</span>
                        </span>
                        <kbd className="text-xs text-[rgba(245,237,214,0.45)] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{action.shortcut}</kbd>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} />
          <div className="relative w-full max-w-lg bg-[#1a1200] border border-[rgba(255,200,100,0.22)] rounded-2xl shadow-2xl overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(255,200,100,0.14)]">
              <span className="text-[rgba(245,237,214,0.55)]">🔍</span>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm trang, thao tác..."
                className="flex-1 bg-transparent text-white text-sm placeholder-[rgba(245,237,214,0.30)] focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredSuggestions.length > 0) {
                    handleSearchSelect(filteredSuggestions[0].href);
                  }
                }}
              />
              <kbd className="text-xs text-[rgba(245,237,214,0.45)] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredSuggestions.length === 0 ? (
                <div className="text-center py-8 text-[rgba(245,237,214,0.45)] text-sm">Không tìm thấy kết quả</div>
              ) : (
                (() => {
                  const grouped = filteredSuggestions.reduce((acc, item) => {
                    if (!acc[item.category]) acc[item.category] = [];
                    acc[item.category].push(item);
                    return acc;
                  }, {} as Record<string, typeof filteredSuggestions>);

                  return Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="mb-2">
                      <p className="text-xs text-[rgba(245,237,214,0.35)] uppercase tracking-wider px-3 py-1.5 font-semibold">{category}</p>
                      {items.map((item) => (
                        <button
                          key={item.href}
                          onClick={() => handleSearchSelect(item.href)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                        >
                          <span className="text-base">{item.icon}</span>
                          <span>{item.label}</span>
                          <span className="ml-auto text-xs text-[rgba(245,237,214,0.45)]">{item.href}</span>
                        </button>
                      ))}
                    </div>
                  ));
                })()
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-[rgba(255,200,100,0.14)] flex items-center gap-4 text-xs text-[rgba(245,237,214,0.35)]">
              <span><kbd className="bg-white/5 px-1 py-0.5 rounded border border-white/10">↵</kbd> Chọn</span>
              <span><kbd className="bg-white/5 px-1 py-0.5 rounded border border-white/10">ESC</kbd> Đóng</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
