"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserDashboardStats, AppUser, UserRole } from "@/lib/user-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`;
  return amount.toLocaleString("vi-VN");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  customer: { label: "Khách hàng", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  dealer: { label: "Đại lý", color: "text-[#C9A84C]", bg: "bg-[#C9A84C]/10", border: "border-[#C9A84C]/20" },
  vip: { label: "VIP", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  blocked: { label: "Bị khóa", color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20" },
};

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120 }: { segments: { label: string; count: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  if (total === 0) return <div className="text-gray-600 text-sm text-center py-4">Không có dữ liệu</div>;
  const r = 40; const cx = size / 2; const cy = size / 2;
  let cumAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const angle = (seg.count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    return { ...seg, x1, y1, x2, y2, large: angle > Math.PI ? 1 : 0, angle };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => arc.angle > 0.01 ? (
        <path key={i} d={`M ${cx} ${cy} L ${arc.x1} ${arc.y1} A ${r} ${r} 0 ${arc.large} 1 ${arc.x2} ${arc.y2} Z`} fill={arc.color} opacity="0.85" />
      ) : null)}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#0D0B00" />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#6B7280" fontSize="8">người dùng</text>
    </svg>
  );
}

// ─── Registration Line Chart ──────────────────────────────────────────────────
function RegLineChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 320; const h = 70;
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (d.count / max) * (h - 8) - 4,
    ...d,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 20}`} className="overflow-visible">
      <defs>
        <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#regGrad)" />
      <path d={pathD} fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#22C55E" />
          {p.count > 0 && <text x={p.x} y={p.y - 6} textAnchor="middle" fill="white" fontSize="9">{p.count}</text>}
          <text x={p.x} y={h + 14} textAnchor="middle" fill="#4B5563" fontSize="8">{p.label.split(",")[0]}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Revenue Bar Chart ────────────────────────────────────────────────────────
function RevenueBar({ data }: { data: { label: string; revenue: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{d.label}</span>
            <span className="text-xs font-semibold text-white">{formatVND(d.revenue)}đ</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(d.revenue / max) * 100}%`, backgroundColor: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── User Row (for list) ──────────────────────────────────────────────────────
function UserRow({ user, onBlock, onDelete }: {
  user: AppUser;
  onBlock: (id: string, block: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rc = ROLE_CONFIG[user.role];
  const isBlocked = user.status === "blocked";

  return (
    <>
      <tr
        className={`border-b border-[#C9A84C]/5 hover:bg-white/2 transition-colors cursor-pointer ${isBlocked ? "opacity-50" : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C]/30 to-[#C9A84C]/10 flex items-center justify-center text-sm font-bold text-[#C9A84C] flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${rc.color} ${rc.bg} ${rc.border}`}>
            {rc.label}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">{user.city}</td>
        <td className="px-4 py-3 text-right">
          <div className="text-sm font-semibold text-[#C9A84C]">{formatVND(user.totalSpent)}đ</div>
          <div className="text-xs text-gray-600">{user.totalOrders} đơn</div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{timeAgo(user.lastActiveAt)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/admin/users/${user.id}/edit`}
              className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              Sửa
            </Link>
            <button
              onClick={() => onBlock(user.id, !isBlocked)}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                isBlocked
                  ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
              }`}
            >
              {isBlocked ? "Mở khóa" : "Khóa"}
            </button>
            <button
              onClick={() => onDelete(user.id)}
              className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Xóa
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#0D0B00]/50">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-gray-600 mb-1 font-medium">Thông tin liên hệ</p>
                <p className="text-gray-400">📞 {user.phone}</p>
                <p className="text-gray-400">📧 {user.email}</p>
                <p className="text-gray-400">📍 {user.city}</p>
                <p className="text-gray-500 mt-1">Nguồn: {user.source}</p>
                <p className="text-gray-500">Đăng ký: {new Date(user.registeredAt).toLocaleDateString("vi-VN")}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1 font-medium">Thiết bị ({user.devices.length})</p>
                {user.devices.length === 0 ? (
                  <p className="text-gray-700">Chưa kết nối thiết bị</p>
                ) : (
                  user.devices.map((d, i) => (
                    <div key={i} className="mb-1">
                      <p className="text-gray-400">📱 {d.model}</p>
                      <p className="text-gray-600">Lần cuối: {timeAgo(d.lastActive)}</p>
                    </div>
                  ))
                )}
              </div>
              <div>
                <p className="text-gray-600 mb-1 font-medium">Đơn hàng gần đây</p>
                {user.orders.length === 0 ? (
                  <p className="text-gray-700">Chưa có đơn hàng</p>
                ) : (
                  user.orders.slice(0, 3).map((o) => {
                    const sc: Record<string, string> = { delivered: "text-green-400", confirmed: "text-blue-400", pending: "text-yellow-400", cancelled: "text-red-400" };
                    return (
                      <div key={o.id} className="mb-1 flex items-center justify-between">
                        <span className="text-gray-400 truncate flex-1">{o.product}</span>
                        <span className={`ml-2 ${sc[o.status] || "text-gray-500"}`}>{formatVND(o.amount)}đ</span>
                      </div>
                    );
                  })
                )}
                {user.notes && (
                  <div className="mt-2 p-2 bg-[#C9A84C]/5 border border-[#C9A84C]/10 rounded-lg">
                    <p className="text-gray-500">📝 {user.notes}</p>
                  </div>
                )}
              </div>
            </div>
            {user.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {user.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 text-gray-500 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserDashboardClient({ data: initialData }: { data: UserDashboardStats }) {
  const [data, setData] = useState(initialData);
  const [users, setUsers] = useState(initialData.recentUsers as AppUser[]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [view, setView] = useState<"dashboard" | "list">("dashboard");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [listLoaded, setListLoaded] = useState(false);
  const router = useRouter();

  async function loadAllUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const json = await res.json();
      setAllUsers(json.users);
      setListLoaded(true);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const [dashRes, listRes] = await Promise.all([
        fetch("/api/admin/users?mode=dashboard"),
        listLoaded ? fetch("/api/admin/users") : Promise.resolve(null),
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (listRes?.ok) {
        const json = await listRes.json();
        setAllUsers(json.users);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function switchToList() {
    setView("list");
    if (!listLoaded) await loadAllUsers();
  }

  async function handleBlock(id: string, block: boolean) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: block ? "block" : "unblock" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAllUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAllUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }

  // Filter logic
  const filteredUsers = allUsers.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search);
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const d = data;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản Lý Người Dùng</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1A1500] border border-[#C9A84C]/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setView("dashboard")}
              className={`px-4 py-2 text-sm transition-colors ${view === "dashboard" ? "bg-[#C9A84C]/15 text-[#C9A84C]" : "text-gray-500 hover:text-white"}`}
            >
              📊 Tổng quan
            </button>
            <button
              onClick={switchToList}
              className={`px-4 py-2 text-sm transition-colors ${view === "list" ? "bg-[#C9A84C]/15 text-[#C9A84C]" : "text-gray-500 hover:text-white"}`}
            >
              👥 Danh sách
            </button>
          </div>
          <button
            onClick={() => router.push("/admin/users/new")}
            className="flex items-center gap-2 text-sm font-semibold bg-[#C9A84C] text-black px-4 py-2 rounded-xl hover:bg-[#E2C97E] transition-colors"
          >
            + Thêm khách hàng
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            {refreshing ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {/* ── DASHBOARD VIEW ── */}
      {view === "dashboard" && (
        <>
          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5 cursor-pointer hover:border-[#C9A84C]/30 transition-all" onClick={switchToList}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Tổng người dùng</span>
                <span className="text-xs text-[#C9A84C]/50">→</span>
              </div>
              <div className="text-3xl font-bold text-[#C9A84C] mb-1">{d.stats.totalUsers}</div>
              <div className="flex gap-2 text-xs">
                <span className="text-green-400">{d.stats.activeUsers} hoạt động</span>
                {d.stats.blockedUsers > 0 && <><span className="text-gray-600">·</span><span className="text-red-400">{d.stats.blockedUsers} khóa</span></>}
              </div>
            </div>

            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Doanh thu</span>
                <span className="text-xs text-green-400">VNĐ</span>
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">{formatVND(d.stats.totalRevenue)}đ</div>
              <div className="text-xs text-gray-500">TB {formatVND(d.stats.avgOrderValue)}đ/đơn</div>
            </div>

            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Mới tuần này</span>
                <span className="text-xs text-blue-400">+{d.stats.newUsersThisWeek}</span>
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-1">{d.stats.newUsersThisMonth}</div>
              <div className="text-xs text-gray-500">người dùng mới tháng này</div>
            </div>

            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-600 uppercase tracking-wider">Đại lý & VIP</span>
              </div>
              <div className="text-3xl font-bold text-pink-400 mb-1">{d.stats.dealerCount + d.stats.vipCount}</div>
              <div className="flex gap-2 text-xs">
                <span className="text-[#C9A84C]">{d.stats.dealerCount} đại lý</span>
                <span className="text-gray-600">·</span>
                <span className="text-pink-400">{d.stats.vipCount} VIP</span>
              </div>
            </div>
          </div>

          {/* Row 2: Registration trend + Role donut */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Đăng ký mới 7 ngày qua</h3>
                  <p className="text-xs text-gray-600 mt-0.5">Số người dùng đăng ký mỗi ngày</p>
                </div>
                <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                  +{d.stats.newUsersThisWeek} tuần này
                </span>
              </div>
              <RegLineChart data={d.registrationsByDay} />
              <div className="mt-4 grid grid-cols-7 gap-1">
                {d.registrationsByDay.map((day, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-xs font-medium ${day.count > 0 ? "text-green-400" : "text-gray-700"}`}>{day.count}</div>
                    <div className="text-xs text-gray-700 truncate">{day.label.split(",")[0]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Phân loại người dùng</h3>
              <div className="flex flex-col items-center gap-4">
                <DonutChart segments={d.usersByRole} size={120} />
                <div className="w-full space-y-2">
                  {d.usersByRole.map((r) => (
                    <div key={r.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="text-xs text-gray-400">{r.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{r.count}</span>
                        <span className="text-xs text-gray-600">({d.stats.totalUsers > 0 ? Math.round((r.count / d.stats.totalUsers) * 100) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Revenue by role + Source breakdown */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Doanh thu theo phân khúc</h3>
              <RevenueBar data={d.revenueByRole} />
              <div className="mt-4 pt-4 border-t border-[#C9A84C]/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Tổng doanh thu</span>
                  <span className="text-sm font-bold text-[#C9A84C]">{formatVND(d.stats.totalRevenue)}đ</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Nguồn khách hàng</h3>
              <div className="space-y-3">
                {d.usersBySource.map((s, i) => (
                  <div key={s.source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{s.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{s.count}</span>
                        <span className="text-xs text-gray-600">{s.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.percentage}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Top spenders + City distribution + Recent users */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Top spenders */}
            <div className="lg:col-span-2 bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Top chi tiêu cao nhất</h3>
                <button onClick={switchToList} className="text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">Xem tất cả →</button>
              </div>
              <div className="space-y-3">
                {d.topSpenders.map((u, i) => {
                  const rc = ROLE_CONFIG[u.role];
                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center text-xs text-[#C9A84C] font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C]/30 to-[#C9A84C]/10 flex items-center justify-center text-sm font-bold text-[#C9A84C] flex-shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{u.name}</p>
                        <p className="text-xs text-gray-600 truncate">{u.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${rc.color} ${rc.bg} ${rc.border} flex-shrink-0`}>
                        {rc.label}
                      </span>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-[#C9A84C]">{formatVND(u.totalSpent)}đ</div>
                        <div className="text-xs text-gray-600">{u.totalOrders} đơn</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* City + Recent users */}
            <div className="space-y-6">
              <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4">Phân bố địa lý</h3>
                <div className="space-y-2">
                  {d.usersByCity.map((c) => (
                    <div key={c.city}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 truncate">{c.city}</span>
                        <span className="text-xs font-semibold text-white ml-2">{c.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${c.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Đăng ký gần đây</h3>
                <div className="space-y-2">
                  {d.recentUsers.map((u) => {
                    const rc = ROLE_CONFIG[u.role];
                    return (
                      <div key={u.id} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9A84C]/30 to-[#C9A84C]/10 flex items-center justify-center text-xs font-bold text-[#C9A84C] flex-shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 truncate">{u.name}</p>
                          <p className="text-xs text-gray-700">{timeAgo(u.registeredAt)}</p>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${rc.color} ${rc.bg}`}>{rc.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
              className="flex-1 min-w-48 bg-[#1A1500] border border-[#C9A84C]/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-[#1A1500] border border-[#C9A84C]/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
            >
              <option value="all">Tất cả loại</option>
              <option value="customer">Khách hàng</option>
              <option value="dealer">Đại lý</option>
              <option value="vip">VIP</option>
              <option value="blocked">Bị khóa</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1A1500] border border-[#C9A84C]/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
              <option value="blocked">Bị khóa</option>
            </select>
            <div className="flex items-center text-xs text-gray-500 px-3">
              {filteredUsers.length} / {allUsers.length} người dùng
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl overflow-hidden">
            {!listLoaded ? (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <span className="animate-spin mr-2">↻</span> Đang tải...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-gray-600">Không tìm thấy người dùng nào</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#C9A84C]/10">
                    <th className="px-4 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">Người dùng</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">Loại</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">Thành phố</th>
                    <th className="px-4 py-3 text-right text-xs text-gray-600 font-medium uppercase tracking-wider">Chi tiêu</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">Hoạt động</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <UserRow key={user.id} user={user} onBlock={handleBlock} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-gray-700 mt-3 text-center">Click vào hàng để xem chi tiết người dùng</p>
        </div>
      )}
    </div>
  );
}
