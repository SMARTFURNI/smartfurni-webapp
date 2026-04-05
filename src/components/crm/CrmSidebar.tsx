'use client';

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
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Database,
  Crosshair,
  Zap,
  Lock,
  ChevronDown,
  PhoneCall,
  Share2,
} from "lucide-react";
import { useState, useEffect } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  showPendingBadge?: boolean;
  badge?: string;
};

type NavGroup = {
  label: string;
  icon?: React.ElementType;
  items: NavItem[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  collapsible?: boolean;
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { label: "Dashboard", href: "/crm", icon: LayoutDashboard, exact: true },
      { label: "Bảng Kanban", href: "/crm/kanban", icon: Kanban },
      { label: "Kế hoạch 12 Tuần", href: "/crm/twelve-week-plan", icon: Crosshair },
      { label: "Quản lý Kế hoạch", href: "/crm/plans-management", icon: Settings, adminOnly: true },
    ],
  },
  {
    label: "Khách hàng",
    items: [
      { label: "Data Pool", href: "/crm/data-pool", icon: Database, showPendingBadge: true },
      { label: "Danh sách KH", href: "/crm/leads", icon: Users },
      { label: "Phân loại Lead", href: "/crm/lead-segmentation", icon: TrendingUp, adminOnly: true },
      { label: "Báo giá", href: "/crm/quotes", icon: FileText },
      { label: "Cuộc gọi", href: "/crm/call-logs", icon: PhoneCall },
      { label: "Việc cần làm", href: "/crm/tasks", icon: CheckSquare },
      { label: "Lịch hẹn", href: "/crm/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Marketing & CS",
    items: [
      { label: "Email Marketing", href: "/crm/email", icon: Mail, adminOnly: true },
      { label: "Hợp đồng điện tử", href: "/crm/contracts", icon: FileText },
      { label: "Khảo sát NPS", href: "/crm/nps", icon: TrendingUp, adminOnly: true },
      { label: "Nhắc nhở Zalo/SMS", href: "/crm/notifications", icon: Bell },
      { label: "Zalo OA", href: "/crm/zalo", icon: MessageSquare, superAdminOnly: true },
      { label: "Zalo Inbox", href: "/crm/zalo-inbox", icon: MessageSquare },
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
    label: "Quản lý & Báo cáo",
    items: [
      { label: "Nhân viên", href: "/crm/staff", icon: UserCog, superAdminOnly: true },
      { label: "Báo cáo & Phân tích", href: "/crm/reports", icon: BarChart3, adminOnly: true },
      { label: "Cài đặt CRM", href: "/crm/settings", icon: SlidersHorizontal, superAdminOnly: true },
    ],
    adminOnly: true,
  },
  {
    label: "Tự động hóa & Bảo mật",
    icon: Zap,
    items: [
      { label: "AI Agent", href: "/crm/ai-agent", icon: Bot, superAdminOnly: true },
      { label: "Automation Rules", href: "/crm/automation", icon: Zap, superAdminOnly: true },
      { label: "Lịch đăng bài FB", href: "/crm/facebook-scheduler", icon: Share2, superAdminOnly: true },
      { label: "Nhật ký hoạt động", href: "/crm/audit", icon: Shield, superAdminOnly: true },
      { label: "Phân quyền & API Keys", href: "/crm/permissions", icon: Key, superAdminOnly: true },
      { label: "Import / Export", href: "/crm/import-export", icon: Upload, superAdminOnly: true },
    ],
    superAdminOnly: true,
    collapsible: true,
  },
];

function canSeeItem(item: NavItem, role: string, isAdmin: boolean): boolean {
  if (item.superAdminOnly) return isAdmin || role === "super_admin";
  if (item.adminOnly) return isAdmin || role === "super_admin" || role === "manager";
  return true;
}

function canSeeGroup(group: NavGroup, role: string, isAdmin: boolean): boolean {
  if (group.superAdminOnly) return isAdmin || role === "super_admin";
  if (group.adminOnly) return isAdmin || role === "super_admin" || role === "manager";
  return true;
}

function getRoleLabel(role: string) {
  if (role === "manager") return "Trưởng nhóm";
  if (role === "sales") return "Kinh doanh";
  if (role === "support") return "Hỗ trợ";
  if (role === "super_admin") return "Quản trị viên";
  return role;
}

interface CrmSidebarProps {
  isAdmin?: boolean;
  staffRole?: string;
  staffName?: string;
}

export default function CrmSidebar({ isAdmin = false, staffRole = "sales", staffName }: CrmSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({ "Tự động hóa & Bảo mật": true });

  useEffect(() => {
    let mounted = true;
    async function fetchPending() {
      try {
        const res = await fetch("/api/crm/raw-leads/stats", { cache: "no-store" });
        if (res.ok && mounted) {
          const data = await res.json();
          setPendingCount(data.pending ?? 0);
        }
      } catch { /* silent */ }
    }
    fetchPending();
    const interval = setInterval(fetchPending, 60_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  function toggleGroup(label: string) {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  }

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (isAdmin) {
        await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
        window.location.href = "/admin/login";
      } else {
        await fetch("/api/crm/staff/logout", { method: "POST", credentials: "include" });
        window.location.href = "/crm-login";
      }
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = isAdmin ? "/admin/login" : "/crm-login";
    }
  };

  // Color tokens
  const C = {
    bg: "#0F172A",           // slate-900
    bgHover: "#1E293B",      // slate-800
    bgActive: "#1E3A5F",     // custom blue-navy
    border: "#1E293B",       // slate-800
    groupLabel: "#64748B",   // slate-500
    text: "#94A3B8",         // slate-400
    textActive: "#F1F5F9",   // slate-100
    textHover: "#CBD5E1",    // slate-300
    accent: "#C9A84C",       // gold
    accentLight: "#FDE68A",  // gold light
    activeIndicator: "#3B82F6", // blue-500
    logo: "linear-gradient(135deg, #C9A84C 0%, #E2C97E 100%)",
  };

  return (
    <aside
      className="flex flex-col h-full transition-all duration-300 flex-shrink-0 relative select-none"
      style={{
        width: collapsed ? "60px" : "220px",
        background: C.bg,
        borderRight: `1px solid ${C.border}`,
      }}
    >
      {/* ── Logo header ── */}
      <div
        className="flex items-center gap-3 px-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${C.border}`, height: 68 }}
      >
        {/* Preload cả 2 ảnh để không bị flash khi chuyển */}
        <img src="/smartfurni-icon.png" alt="" style={{ display: "none" }} />
        <img src="/smartfurni-logo.png" alt="" style={{ display: "none" }} />
        {collapsed ? (
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40 }}>
            <img
              src="/smartfurni-icon.png"
              alt="SF"
              style={{ width: 40, height: 40, objectFit: "contain" }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <img
              src="/smartfurni-logo.png"
              alt="SmartFurni"
              style={{ height: 42, objectFit: "contain", maxWidth: 180 }}
            />
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{ color: C.groupLabel }}
          onMouseEnter={e => (e.currentTarget.style.color = C.textHover)}
          onMouseLeave={e => (e.currentTarget.style.color = C.groupLabel)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── User badge ── */}
      {!collapsed && !isAdmin && staffName && (
        <div
          className="mx-3 mt-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ background: "#1E293B", border: `1px solid #334155` }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", color: "#fff" }}
          >
            {(staffName[0] || "U").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate" style={{ color: "#F1F5F9" }}>{staffName}</div>
            <div className="text-[10px]" style={{ color: C.groupLabel }}>{getRoleLabel(staffRole)}</div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" style={{ scrollbarWidth: "none" }}>
        {NAV_GROUPS.map(group => {
          if (!canSeeGroup(group, staffRole, isAdmin)) return null;
          const visibleItems = group.items.filter(item => canSeeItem(item, staffRole, isAdmin));
          if (visibleItems.length === 0) return null;

          const isGroupCollapsed = group.collapsible && collapsedGroups[group.label];

          return (
            <div key={group.label} className="mb-1">
              {/* Group label */}
              {!collapsed && (
                <div
                  className={`flex items-center gap-1 px-2 py-1.5 mb-0.5 ${group.collapsible ? "cursor-pointer rounded-lg hover:bg-slate-800" : ""}`}
                  onClick={group.collapsible ? () => toggleGroup(group.label) : undefined}
                >
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase flex-1"
                    style={{ color: C.groupLabel, letterSpacing: "0.1em" }}
                  >
                    {group.label}
                  </span>
                  {group.collapsible && (
                    <ChevronDown
                      size={12}
                      style={{
                        color: C.groupLabel,
                        transform: isGroupCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  )}
                </div>
              )}
              {collapsed && <div className="h-px mx-2 my-2" style={{ background: C.border }} />}

              {/* Items */}
              {!isGroupCollapsed && visibleItems.map(item => {
                const active = isActive(item.href, item.exact);
                const showBadge = item.showPendingBadge && pendingCount > 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    title={collapsed ? item.label : undefined}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all mb-0.5 group relative"
                    style={{
                      background: active ? C.bgActive : "transparent",
                      color: active ? C.textActive : C.text,
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = C.bgHover;
                        (e.currentTarget as HTMLElement).style.color = C.textHover;
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = C.text;
                      }
                    }}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                        style={{ background: C.activeIndicator }}
                      />
                    )}

                    {/* Icon */}
                    <div className="relative flex-shrink-0">
                      <item.icon
                        size={15}
                        style={{ color: active ? "#93C5FD" : C.text }}
                      />
                      {showBadge && collapsed && (
                        <span
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                          style={{ background: "#EF4444" }}
                        />
                      )}
                    </div>

                    {/* Label */}
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1 text-[13px] font-medium">{item.label}</span>
                        {showBadge && (
                          <span
                            className="flex-shrink-0 min-w-[20px] h-4 px-1.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                            style={{ background: "#EF4444" }}
                          >
                            {pendingCount > 99 ? "99+" : pendingCount}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div
        className="px-2 pb-3 pt-2 space-y-0.5"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        {!isAdmin && (
          <Link
            href="/crm/profile"
            prefetch={false}
            title={collapsed ? "Hồ sơ cá nhân" : undefined}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all"
            style={{ color: C.text }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = C.bgHover;
              (e.currentTarget as HTMLElement).style.color = C.textHover;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = C.text;
            }}
          >
            <UserCircle size={15} style={{ color: C.text, flexShrink: 0 }} />
            {!collapsed && (
              <span className="text-[13px] font-medium truncate flex-1">Hồ sơ cá nhân</span>
            )}
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            prefetch={false}
            title={collapsed ? "Quản trị Admin" : undefined}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all"
            style={{ color: C.text }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = C.bgHover;
              (e.currentTarget as HTMLElement).style.color = C.textHover;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = C.text;
            }}
          >
            <Settings size={15} style={{ color: C.text, flexShrink: 0 }} />
            {!collapsed && <span className="text-[13px] font-medium">Quản trị Admin</span>}
          </Link>
        )}
        <button
          onClick={handleLogout}
          type="button"
          title={collapsed ? "Đăng xuất" : undefined}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all w-full"
          style={{ color: "#F87171", background: "transparent", border: "none", cursor: "pointer" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "#2D1515";
            (e.currentTarget as HTMLElement).style.color = "#FCA5A5";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#F87171";
          }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span className="text-[13px] font-medium">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
