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
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  {
    label: "Tổng quan",
    href: "/crm",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Bảng Kanban",
    href: "/crm/kanban",
    icon: Kanban,
  },
  {
    label: "Khách hàng",
    href: "/crm/leads",
    icon: Users,
  },
  {
    label: "Sản phẩm & Báo giá",
    href: "/crm/products",
    icon: Package,
  },
  {
    label: "Báo giá",
    href: "/crm/quotes",
    icon: FileText,
  },
  {
    label: "Việc cần làm",
    href: "/crm/tasks",
    icon: CheckSquare,
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
      className="flex flex-col h-full transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? "64px" : "220px",
        background: "#0f1117",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", minHeight: "60px" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
          <span className="text-black font-black text-sm">SF</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-white font-bold text-sm leading-tight truncate">SmartFurni</div>
            <div className="text-[10px] font-medium tracking-wider uppercase"
              style={{ color: "#C9A84C" }}>CRM B2B</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="ml-auto flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          <ChevronRight size={14} className={`transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <div className="px-4 mb-2">
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: "rgba(255,255,255,0.2)" }}>Menu</span>
          </div>
        )}
        <div className="space-y-0.5 px-2">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative"
                style={{
                  background: active ? "rgba(201,168,76,0.12)" : "transparent",
                  color: active ? "#C9A84C" : "rgba(255,255,255,0.5)",
                  borderLeft: active ? "2px solid #C9A84C" : "2px solid transparent",
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity"
                    style={{ background: "#1e2030", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-4 my-3 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Webhook status */}
        <div className="px-2">
          <Link href="/crm/webhook"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
            style={{ color: "rgba(255,255,255,0.35)" }}
            title={collapsed ? "Webhook" : undefined}
          >
            <Zap size={18} className="flex-shrink-0" style={{ color: "#22c55e" }} />
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>Webhook</div>
                <div className="text-[10px]" style={{ color: "#22c55e" }}>● Đang hoạt động</div>
              </div>
            )}
          </Link>
        </div>
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 px-2 py-3 space-y-0.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.3)" }}
          title={collapsed ? "Admin" : undefined}
        >
          <Settings size={16} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs">Admin Panel</span>}
        </Link>
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-red-500/10"
          style={{ color: "rgba(255,255,255,0.3)" }}
          title={collapsed ? "Đăng xuất" : undefined}
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
