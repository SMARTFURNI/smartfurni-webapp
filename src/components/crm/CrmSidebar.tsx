"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  Package,
  FileText,
  CheckSquare,
  ChevronRight,
  Zap,
  LogOut,
  Settings,
  Bell,
  UserCog,
  TrendingUp,
  BarChart3,
  Mail,
  CalendarDays,
  SlidersHorizontal,
  Bot,
  Shield,
  Key,
  Upload,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

const NAV_GROUPS = [
  {
    label: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/crm", icon: LayoutDashboard, exact: true },
      { label: "Bảng Kanban", href: "/crm/kanban", icon: Kanban },
    ],
  },
  {
    label: "Khách hàng",
    items: [
      { label: "Danh sách KH", href: "/crm/leads", icon: Users },
      { label: "Báo giá", href: "/crm/quotes", icon: FileText },
      { label: "Việc cần làm", href: "/crm/tasks", icon: CheckSquare },
      { label: "Lịch hẹn", href: "/crm/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Email Marketing", href: "/crm/email", icon: Mail },
    ],
  },
  {
    label: "Sản phẩm",
    items: [
      { label: "Danh mục SP", href: "/crm/products", icon: Package },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { label: "Nhân viên", href: "/crm/staff", icon: UserCog },
      { label: "Báo cáo & Phân tích", href: "/crm/reports", icon: BarChart3 },
      { label: "Cài đặt CRM", href: "/crm/settings", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Tự động hóa",
    items: [
      { label: "Automation Rules", href: "/crm/automation", icon: Bot },
    ],
  },
  {
    label: "Bảo mật",
    items: [
      { label: "Nhật ký hoạt động", href: "/crm/audit", icon: Shield },
      { label: "Phân quyền & API Keys", href: "/crm/permissions", icon: Key },
    ],
  },
  {
    label: "Dữ liệu",
    items: [
      { label: "Import / Export", href: "/crm/import-export", icon: Upload },
      { label: "Zalo OA", href: "/crm/import-export", icon: MessageSquare },
    ],
  },
];

export default function CrmSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="flex flex-col h-full transition-all duration-300 flex-shrink-0 relative"
      style={{
        width: collapsed ? "64px" : "224px",
        background: "linear-gradient(180deg, #0d0f14 0%, #0f1117 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Ambient glow top */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)" }} />

      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0 relative"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", minHeight: "64px" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
          style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E2C97E 100%)" }}
        >
          <span className="text-black font-black text-sm tracking-tight">SF</span>
          {/* Glow */}
          <div className="absolute inset-0 rounded-xl blur-md opacity-40"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-white font-bold text-sm leading-tight tracking-tight">SmartFurni</div>
            <div className="text-[10px] font-semibold tracking-[0.2em] uppercase mt-0.5"
              style={{ color: "#C9A84C" }}>CRM B2B</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="ml-auto flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          <ChevronRight size={13} className={`transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden scrollbar-none">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={collapsed ? "mb-2" : "mb-4"}>
            {!collapsed && (
              <div className="px-5 mb-1.5">
                <span
                  className="text-[9px] font-bold tracking-[0.2em] uppercase"
                  style={{ color: "rgba(255,255,255,0.18)" }}
                >
                  {group.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5 px-2">
              {group.items.map(item => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden"
                    style={{
                      background: active
                        ? "linear-gradient(90deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)"
                        : "transparent",
                      color: active ? "#E2C97E" : "rgba(255,255,255,0.45)",
                      borderLeft: active ? "2px solid #C9A84C" : "2px solid transparent",
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active shimmer */}
                    {active && (
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.03), transparent)" }} />
                    )}
                    <item.icon
                      size={17}
                      className="flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ color: active ? "#C9A84C" : "rgba(255,255,255,0.35)" }}
                    />
                    {!collapsed && (
                      <span className="text-[13px] font-medium truncate">{item.label}</span>
                    )}
                    {/* Tooltip when collapsed */}
                    {collapsed && (
                      <div
                        className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-all translate-x-1 group-hover:translate-x-0"
                        style={{
                          background: "#1e2130",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.08)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        }}
                      >
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Divider */}
        <div className="mx-4 my-2 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

        {/* Webhook status */}
        <div className="px-2">
          <Link
            href="/crm/webhook"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.03] group"
            title={collapsed ? "Webhook" : undefined}
          >
            <div className="relative flex-shrink-0">
              <Zap size={17} style={{ color: "#22c55e" }} />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Webhook</div>
                <div className="text-[10px] font-medium" style={{ color: "#22c55e" }}>Đang hoạt động</div>
              </div>
            )}
          </Link>
        </div>
      </nav>

      {/* Bottom */}
      <div
        className="flex-shrink-0 px-2 py-3 space-y-0.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-white/[0.04]"
          style={{ color: "rgba(255,255,255,0.25)" }}
          title={collapsed ? "Admin Panel" : undefined}
        >
          <Settings size={15} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Admin Panel</span>}
        </Link>
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-red-500/10 group"
          style={{ color: "rgba(255,255,255,0.25)" }}
          title={collapsed ? "Đăng xuất" : undefined}
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}
        >
          <LogOut size={15} className="flex-shrink-0 group-hover:text-red-400 transition-colors" />
          {!collapsed && <span className="text-xs font-medium group-hover:text-red-400 transition-colors">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
