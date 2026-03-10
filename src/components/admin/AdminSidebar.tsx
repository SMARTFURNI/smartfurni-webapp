"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface SidebarStats {
  unreadContacts?: number;
  pendingOrders?: number;
  lowStockProducts?: number;
  draftPosts?: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact: boolean;
  subItems?: { href: string; label: string }[];
  badgeKey?: keyof SidebarStats;
  badgeLabel?: string;
  badgeColor?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
    ],
  },
  {
    label: "Nội dung",
    items: [
      {
        href: "/admin/posts",
        label: "Bài viết",
        icon: "📝",
        exact: false,
        subItems: [
          { href: "/admin/posts/new", label: "Viết bài mới" },
          { href: "/admin/posts", label: "Tất cả bài viết" },
        ],
        badgeKey: "draftPosts" as keyof SidebarStats,
        badgeLabel: "nháp",
        badgeColor: "bg-gray-600",
      },
    ],
  },
  {
    label: "Kinh doanh",
    items: [
      {
        href: "/admin/products",
        label: "Sản phẩm",
        icon: "🛏️",
        exact: false,
        subItems: [
          { href: "/admin/products/new", label: "Thêm sản phẩm" },
          { href: "/admin/products", label: "Danh sách sản phẩm" },
        ],
        badgeKey: "lowStockProducts" as keyof SidebarStats,
        badgeLabel: "sắp hết",
        badgeColor: "bg-orange-500",
      },
      {
        href: "/admin/orders",
        label: "Đơn hàng",
        icon: "📋",
        exact: false,
        subItems: [
          { href: "/admin/orders/new", label: "Tạo đơn hàng" },
          { href: "/admin/orders", label: "Tất cả đơn hàng" },
        ],
        badgeKey: "pendingOrders" as keyof SidebarStats,
        badgeLabel: "chờ",
        badgeColor: "bg-yellow-500",
      },
    ],
  },
  {
    label: "Khách hàng",
    items: [
      {
        href: "/admin/contacts",
        label: "Liên hệ",
        icon: "💬",
        exact: false,
        badgeKey: "unreadContacts" as keyof SidebarStats,
        badgeLabel: "mới",
        badgeColor: "bg-red-500",
      },
      {
        href: "/admin/users",
        label: "Người dùng",
        icon: "👥",
        exact: false,
        subItems: [
          { href: "/admin/users/new", label: "Thêm khách hàng" },
          { href: "/admin/users", label: "Danh sách" },
        ],
      },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/admin/homepage-products", label: "Sản phẩm trang chủ", icon: "🏠", exact: false },
      { href: "/admin/appearance", label: "Giao diện", icon: "🎨", exact: false },
      { href: "/admin/settings", label: "Cài đặt", icon: "⚙️", exact: false },
    ],
  },
];

export default function AdminSidebar({ stats = {} }: { stats?: SidebarStats; unreadCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Auto-expand active group
  useEffect(() => {
    const active: string[] = [];
    NAV_GROUPS.forEach((g) =>
      g.items.forEach((item) => {
        if (!item.exact && pathname.startsWith(item.href) && pathname !== "/admin") {
          active.push(item.href);
        }
      })
    );
    setExpandedItems(active);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function isActive(item: { href: string; exact?: boolean }) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  function toggleExpand(href: string) {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  }

  const totalAlerts =
    (stats.unreadContacts || 0) + (stats.pendingOrders || 0) + (stats.lowStockProducts || 0);

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-64"} min-h-screen bg-[#0D0B00] border-r border-[#C9A84C]/10 flex flex-col transition-all duration-200 flex-shrink-0`}
    >
      {/* Logo + Collapse toggle */}
      <div className="p-4 border-b border-[#C9A84C]/10 flex items-center justify-between">
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-[#0D0B00] font-bold text-sm">SF</span>
            </div>
            <div className="min-w-0">
              <div className="text-[#E2C97E] font-bold text-xs tracking-widest truncate">SMARTFURNI</div>
              <div className="text-gray-600 text-xs">Admin Panel</div>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/admin" className="mx-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center shadow-md relative">
              <span className="text-[#0D0B00] font-bold text-sm">SF</span>
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {totalAlerts > 9 ? "9+" : totalAlerts}
                </span>
              )}
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/5 flex-shrink-0"
          title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          <span className="text-xs">{collapsed ? "→" : "←"}</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-xs text-gray-700 uppercase tracking-widest font-semibold px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const badgeCount = item.badgeKey ? (stats[item.badgeKey] || 0) : 0;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedItems.includes(item.href);

                return (
                  <div key={item.href}>
                    <div className="flex items-center gap-1">
                      <Link
                        href={item.href}
                        className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                          active
                            ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/20"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="text-base flex-shrink-0">{item.icon}</span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {badgeCount > 0 && (
                              <span className={`${item.badgeColor || "bg-red-500"} text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold leading-none`}>
                                {badgeCount > 99 ? "99+" : badgeCount}
                              </span>
                            )}
                          </>
                        )}
                        {collapsed && badgeCount > 0 && (
                          <span className="absolute ml-4 -mt-4 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {badgeCount > 9 ? "9+" : badgeCount}
                          </span>
                        )}
                      </Link>
                      {!collapsed && hasSubItems && (
                        <button
                          onClick={() => toggleExpand(item.href)}
                          className="text-gray-600 hover:text-gray-300 p-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
                        >
                          <span className={`text-xs transition-transform inline-block ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                        </button>
                      )}
                    </div>

                    {/* Sub-items */}
                    {!collapsed && hasSubItems && isExpanded && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[#C9A84C]/10 pl-3">
                        {item.subItems!.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`block px-3 py-2 rounded-lg text-xs transition-colors ${
                              pathname === sub.href
                                ? "text-[#C9A84C] bg-[#C9A84C]/8"
                                : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-[#C9A84C]/10 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
          title={collapsed ? "Xem website" : undefined}
        >
          <span className="flex-shrink-0">🌐</span>
          {!collapsed && <span>Xem website</span>}
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          title={collapsed ? "Đăng xuất" : undefined}
        >
          <span className="flex-shrink-0">🚪</span>
          {!collapsed && <span>{loggingOut ? "Đang thoát..." : "Đăng xuất"}</span>}
        </button>
      </div>
    </aside>
  );
}
