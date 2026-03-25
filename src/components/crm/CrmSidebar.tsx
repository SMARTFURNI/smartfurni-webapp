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
  Menu,
  X,
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
    label: "Chăm sóc KH",
    items: [
      { label: "Hợp đồng điện tử", href: "/crm/contracts", icon: FileText },
      { label: "Khảo sát NPS", href: "/crm/nps", icon: TrendingUp },
      { label: "Nhắc nhở Zalo/SMS", href: "/crm/notifications", icon: Bell },
      { label: "Zalo OA", href: "/crm/zalo", icon: MessageSquare },
    ],
  },
  {
    label: "Dữ liệu",
    items: [
      { label: "Import / Export", href: "/crm/import-export", icon: Upload },
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
        width: collapsed ? "64px" : "220px",
        background: "#ffffff",
        borderRight: "1px solid #e5e7eb",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #f3f4f6", minHeight: "64px" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E2C97E 100%)" }}
        >
          <span className="text-white font-black text-sm tracking-tight">SF</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-gray-900 font-bold text-sm leading-tight tracking-tight">SmartFurni</div>
            <div className="text-xs font-semibold tracking-widest uppercase mt-0.5" style={{ color: "#C9A84C" }}>CRM B2B</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1 rounded-lg text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <div className="px-2 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-gray-500">
                {group.label}
              </div>
            )}
            {group.items.map(item => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all mb-0.5 group ${
                    active
                      ? "bg-amber-50 text-amber-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  style={active ? { borderLeft: "3px solid #C9A84C", paddingLeft: "7px" } : {}}
                >
                  <item.icon
                    size={16}
                    className={`flex-shrink-0 ${active ? "text-amber-600" : "text-gray-500 group-hover:text-gray-600"}`}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-2 border-t border-gray-100 space-y-0.5">
        {!collapsed && (
          <div className="px-2 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-gray-500">
            Tài khoản
          </div>
        )}
        <Link
          href="/admin"
          title={collapsed ? "Quản trị Admin" : undefined}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Settings size={16} className="text-gray-500 flex-shrink-0" />
          {!collapsed && <span>Quản trị Admin</span>}
        </Link>
        <Link
          href="/admin/logout"
          title={collapsed ? "Đăng xuất" : undefined}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </Link>
      </div>
    </aside>
  );
}
