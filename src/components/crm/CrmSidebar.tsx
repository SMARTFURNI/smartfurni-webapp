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
  UserCircle,
  Database,
} from "lucide-react";
import { useState } from "react";

// Roles: "super_admin" | "manager" | "sales" | "support"
// adminOnly: chỉ super_admin và manager mới thấy
// superAdminOnly: chỉ super_admin (admin) mới thấy
type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  adminOnly?: boolean;      // manager + super_admin
  superAdminOnly?: boolean; // chỉ super_admin (admin hệ thống)
};

type NavGroup = {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
};

const NAV_GROUPS: NavGroup[] = [
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
      { label: "Data Pool", href: "/crm/data-pool", icon: Database },
      { label: "Danh sách KH", href: "/crm/leads", icon: Users },
      { label: "Báo giá", href: "/crm/quotes", icon: FileText },
      { label: "Việc cần làm", href: "/crm/tasks", icon: CheckSquare },
      { label: "Lịch hẹn", href: "/crm/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Email Marketing", href: "/crm/email", icon: Mail, adminOnly: true },
    ],
    adminOnly: true,
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
      { label: "Nhân viên", href: "/crm/staff", icon: UserCog, superAdminOnly: true },
      { label: "Báo cáo & Phân tích", href: "/crm/reports", icon: BarChart3, adminOnly: true },
      { label: "Cài đặt CRM", href: "/crm/settings", icon: SlidersHorizontal, superAdminOnly: true },
    ],
  },
  {
    label: "Tự động hóa",
    items: [
      { label: "Automation Rules", href: "/crm/automation", icon: Bot, superAdminOnly: true },
    ],
    superAdminOnly: true,
  },
  {
    label: "Bảo mật",
    items: [
      { label: "Nhật ký hoạt động", href: "/crm/audit", icon: Shield, superAdminOnly: true },
      { label: "Phân quyền & API Keys", href: "/crm/permissions", icon: Key, superAdminOnly: true },
    ],
    superAdminOnly: true,
  },
  {
    label: "Chăm sóc KH",
    items: [
      { label: "Hợp đồng điện tử", href: "/crm/contracts", icon: FileText },
      { label: "Khảo sát NPS", href: "/crm/nps", icon: TrendingUp, adminOnly: true },
      { label: "Nhắc nhở Zalo/SMS", href: "/crm/notifications", icon: Bell },
      { label: "Zalo OA", href: "/crm/zalo", icon: MessageSquare, superAdminOnly: true },
    ],
  },
  {
    label: "Dữ liệu",
    items: [
      { label: "Import / Export", href: "/crm/import-export", icon: Upload, superAdminOnly: true },
    ],
    superAdminOnly: true,
  },
];

function canSeeItem(
  item: NavItem,
  role: string,
  isAdmin: boolean
): boolean {
  if (item.superAdminOnly) return isAdmin || role === "super_admin";
  if (item.adminOnly) return isAdmin || role === "super_admin" || role === "manager";
  return true;
}

function canSeeGroup(
  group: NavGroup,
  role: string,
  isAdmin: boolean
): boolean {
  if (group.superAdminOnly) return isAdmin || role === "super_admin";
  if (group.adminOnly) return isAdmin || role === "super_admin" || role === "manager";
  return true;
}

interface CrmSidebarProps {
  isAdmin?: boolean;
  staffRole?: string;
  staffName?: string;
}

export default function CrmSidebar({ isAdmin = false, staffRole = "sales", staffName }: CrmSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const logoutHref = isAdmin ? "/admin/logout" : "/api/crm/staff/logout-redirect";

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

      {/* User info badge (chỉ hiện khi không collapsed và là staff) */}
      {!collapsed && !isAdmin && staffName && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg" style={{ background: "#fefce8", border: "1px solid #fde68a" }}>
          <div className="text-xs text-amber-700 font-medium truncate">{staffName}</div>
          <div className="text-[10px] text-amber-600 capitalize">{staffRole === "manager" ? "Trưởng nhóm" : staffRole === "sales" ? "Kinh doanh" : staffRole === "support" ? "Hỗ trợ" : staffRole}</div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_GROUPS.map(group => {
          if (!canSeeGroup(group, staffRole, isAdmin)) return null;
          const visibleItems = group.items.filter(item => canSeeItem(item, staffRole, isAdmin));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <div className="px-2 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-gray-500">
                  {group.label}
                </div>
              )}
              {visibleItems.map(item => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
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
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-2 border-t border-gray-100 space-y-0.5">
        {!collapsed && (
          <div className="px-2 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-gray-500">
            Tài khoản
          </div>
        )}
        {!isAdmin && (
          <Link
            href="/crm/profile"
            prefetch={false}
            title={collapsed ? "Hồ sơ cá nhân" : undefined}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <UserCircle size={16} className="text-gray-500 flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-700 truncate">{staffName || "Hồ sơ"}</div>
                <div className="text-[10px] text-gray-400 truncate">Chỉnh sửa thông tin</div>
              </div>
            )}
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            prefetch={false}
            title={collapsed ? "Quản trị Admin" : undefined}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Settings size={16} className="text-gray-500 flex-shrink-0" />
            {!collapsed && <span>Quản trị Admin</span>}
          </Link>
        )}
        <Link
          href={logoutHref}
          prefetch={false}
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
