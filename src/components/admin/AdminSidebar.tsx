"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3, BookOpenText, Boxes, ChevronLeft, ChevronRight, ExternalLink,
  FileChartColumn, FileText, GalleryHorizontalEnd, LayoutDashboard, LogOut,
  Palette, Route, Settings2, ShoppingCart, Store, UsersRound,
} from "lucide-react";

interface SidebarStats {
  unreadContacts?: number;
  pendingOrders?: number;
  lowStockProducts?: number;
  draftPosts?: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
  subItems?: { href: string; label: string }[];
  badgeKey?: keyof SidebarStats;
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
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
      { href: "/admin/sessions", label: "Hành trình", icon: Route, exact: false },
    ],
  },
  {
    label: "Nội dung",
    items: [
      {
        href: "/admin/catalogue",
        label: "Catalogue B2B",
        icon: FileChartColumn,
        exact: false,
      },
      {
        href: "/admin/posts",
        label: "Bài viết",
        icon: BookOpenText,
        exact: false,
        subItems: [
          { href: "/admin/posts/new", label: "Viết bài mới" },
          { href: "/admin/posts", label: "Tất cả bài viết" },
        ],
        badgeKey: "draftPosts",
        badgeColor: "bg-gray-600",
      },
      {
        href: "/admin/landing-pages",
        label: "Landing Pages",
        icon: FileText,
        exact: false,
        subItems: [
          { href: "/admin/landing-pages", label: "Quản lý landing page" },
          { href: "/admin/landing-pages/leads", label: "Leads đăng ký" },
        ],
      },
    ],
  },
  {
    label: "Kinh doanh",
    items: [
      {
        href: "/crm",
        label: "CRM B2B",
        icon: Store,
        exact: false,
      },
      {
        href: "/admin/products",
        label: "Sản phẩm",
        icon: Boxes,
        exact: false,
        subItems: [
          { href: "/admin/products/new", label: "Thêm sản phẩm" },
          { href: "/admin/products", label: "Danh sách sản phẩm" },
        ],
        badgeKey: "lowStockProducts",
        badgeColor: "bg-orange-500",
      },
      {
        href: "/admin/orders",
        label: "Đơn hàng",
        icon: ShoppingCart,
        exact: false,
        subItems: [
          { href: "/admin/orders/new", label: "Tạo đơn hàng" },
          { href: "/admin/orders", label: "Tất cả đơn hàng" },
        ],
        badgeKey: "pendingOrders",
        badgeColor: "bg-yellow-500",
      },
    ],
  },
  {
    label: "Khách hàng",
    items: [
      {
        href: "/crm/data-pool",
        label: "Khách hàng tiềm năng",
        icon: UsersRound,
        exact: false,
      },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/admin/homepage-products", label: "Sắp xếp SP trang chủ", icon: GalleryHorizontalEnd, exact: false },
      { href: "/admin/appearance", label: "Giao diện", icon: Palette, exact: false },
      { href: "/admin/settings", label: "Cài đặt", icon: Settings2, exact: false },
    ],
  },
];

export default function AdminSidebar({ stats = {} }: { stats?: SidebarStats }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const syncSidebar = () => {
      if (media.matches) setCollapsed(true);
    };
    syncSidebar();
    media.addEventListener("change", syncSidebar);
    return () => media.removeEventListener("change", syncSidebar);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore network errors, still redirect
    }
    window.location.href = "/admin/login";
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

  const totalAlerts = (stats.pendingOrders || 0) + (stats.lowStockProducts || 0);

  return (
    <aside
      className={`sf-admin-sidebar ${collapsed ? "w-[68px]" : "w-[236px]"} min-h-screen flex flex-col transition-all duration-200 flex-shrink-0`}
    >
      {/* Logo */}
      <div className="h-[68px] border-b border-[rgba(255,200,100,0.12)] flex items-center" style={{ paddingLeft: 12, paddingRight: 8 }}>
        {/* Preload cả 2 ảnh để không bị flash khi chuyển */}
        <img src="/smartfurni-icon-v2.png" alt="" style={{ display: "none" }} />
        <img src="/smartfurni-logo.png" alt="" style={{ display: "none" }} />
        {!collapsed && (
          <Link href="/admin" className="flex items-center flex-1 min-w-0" style={{ paddingRight: 4 }}>
            <img
              src="/smartfurni-logo.png"
              alt="SmartFurni"
              style={{ height: 42, objectFit: "contain", maxWidth: 160 }}
            />
          </Link>
        )}
        {collapsed && (
          <Link href="/admin" className="relative flex-1 flex items-center justify-center">
            <img
              src="/smartfurni-icon-v2.png"
              alt="SF"
              style={{ width: 40, height: 40, objectFit: "contain" }}
            />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                {totalAlerts > 9 ? "9+" : totalAlerts}
              </span>
            )}
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[rgba(245,237,214,0.35)] hover:text-[rgba(245,237,214,0.70)] transition-colors p-1 rounded flex-shrink-0"
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <p className="text-[10px] text-[rgba(245,237,214,0.35)] uppercase tracking-widest font-semibold px-4 py-1.5 mt-1">
                {group.label}
              </p>
            )}
            {collapsed && <div className="h-px bg-[#C9A84C]/5 mx-3 my-2" />}
            <div className="px-2 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                const badgeCount = item.badgeKey ? (stats[item.badgeKey] || 0) : 0;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedItems.includes(item.href);

                return (
                  <div key={item.href}>
                    <div className="flex items-center gap-0.5">
                      <Link
                        href={item.href}
                        className={`flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all ${
                          active
                            ? "sf-admin-nav-active text-[#E2C97E]"
                            : "text-[rgba(245,237,214,0.55)] hover:text-gray-200 hover:bg-white/4"
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className={`sf-admin-icon-tile h-7 w-7 rounded-lg ${active ? "text-[#E2C97E]" : "text-[rgba(245,237,214,0.50)]"}`}>
                          <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                        </span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate font-medium">{item.label}</span>
                            {badgeCount > 0 && (
                              <span className={`${item.badgeColor || "bg-red-500"} text-white text-[10px] rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center font-bold`}>
                                {badgeCount > 99 ? "99+" : badgeCount}
                              </span>
                            )}
                          </>
                        )}
                        {collapsed && badgeCount > 0 && (
                          <span className="absolute ml-3 -mt-3 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                            {badgeCount > 9 ? "9+" : badgeCount}
                          </span>
                        )}
                      </Link>
                      {!collapsed && hasSubItems && (
                        <button
                          onClick={() => toggleExpand(item.href)}
                          className="p-1.5 rounded transition-colors flex-shrink-0"
                          style={{ color: 'rgba(245,237,214,0.35)' }}
                        >
                          <svg
                            width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
                            className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                          >
                            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>

                    {!collapsed && hasSubItems && isExpanded && (
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l border-[rgba(255,200,100,0.12)] pl-3">
                        {item.subItems!.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`block px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                              pathname === sub.href
                                ? "text-[#C9A84C]"
                                : "text-[rgba(245,237,214,0.45)] hover:text-gray-300"
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

      {/* Bottom */}
      <div className="px-2 pb-3 border-t border-[rgba(255,200,100,0.12)] pt-2 space-y-0.5">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-[rgba(245,237,214,0.45)] hover:text-gray-300 hover:bg-white/4 transition-colors"
          title={collapsed ? "Xem website" : undefined}
        >
          <span className="sf-admin-icon-tile h-7 w-7 rounded-lg"><ExternalLink size={15} /></span>
          {!collapsed && <span className="font-medium">Xem website</span>}
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-[rgba(245,237,214,0.45)] hover:text-red-400 hover:bg-red-500/5 transition-colors"
          title={collapsed ? "Đăng xuất" : undefined}
        >
          <span className="sf-admin-icon-tile h-7 w-7 rounded-lg"><LogOut size={15} /></span>
          {!collapsed && <span className="font-medium">{loggingOut ? "Đang thoát..." : "Đăng xuất"}</span>}
        </button>
      </div>
    </aside>
  );
}
