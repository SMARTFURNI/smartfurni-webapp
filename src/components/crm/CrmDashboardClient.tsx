"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, TrendingUp, FileText, CheckSquare, AlertCircle,
  Clock, ChevronRight, Target, Award, DollarSign,
  Phone, Mail, Calendar, ArrowUpRight, Zap, Activity,
  BarChart2, PieChart, Plus, Star, Trophy,
  TrendingDown, Minus, ArrowRight, Briefcase, UserCheck,
  Database,
} from "lucide-react";
import type { Lead, CrmTask, Quote, CrmStats } from "@/lib/crm-types";
import { STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS, formatVND, isOverdue } from "@/lib/crm-types";
import AddLeadModal from "./AddLeadModal";

interface CurrentUser {
  name: string;
  username: string;
  role: string;
  isAdmin: boolean;
  staffId?: string;
}

interface Props {
  leads: Lead[];
  todayTasks: CrmTask[];
  quotes: Quote[];
  stats: CrmStats;
  currentUser?: CurrentUser;
}

const PRIORITY_CONFIG = {
  high:   { color: "#DC2626", bg: "#FEF2F2", label: "Cao" },
  medium: { color: "#D97706", bg: "#FFFBEB", label: "TB" },
  low:    { color: "#059669", bg: "#ECFDF5", label: "Thấp" },
};

const ACTIVITY_TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  note: FileText,
  quote_sent: FileText,
  contract: FileText,
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Quản trị viên",
  manager: "Trưởng nhóm",
  senior_sales: "Kinh doanh cấp cao",
  sales: "Kinh doanh",
  intern: "Thực tập sinh",
};

const SOURCE_COLORS: Record<string, string> = {
  "Facebook Ads": "#1877f2",
  "Google Ads": "#ea4335",
  "KTS giới thiệu": "#7C3AED",
  "Khách hàng cũ giới thiệu": "#EA580C",
  "Zalo": "#0068ff",
  "Website": "#059669",
  "Triển lãm": "#D97706",
  "Telesale": "#DB2777",
};

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg:          "#F0F2F5",   // page background
  card:        "#FFFFFF",   // card background
  cardBorder:  "#E4E7EC",   // card border
  cardShadow:  "0 1px 4px rgba(16,24,40,0.06)",
  headerBg:    "#FFFFFF",
  headerBorder:"#E4E7EC",
  divider:     "#F2F4F7",

  // Text
  textPrimary:   "#101828",
  textSecondary: "#475467",
  textMuted:     "#98A2B3",
  textLabel:     "#667085",

  // Brand accent
  gold:        "#C9A84C",
  goldDark:    "#9A7A2E",
  goldLight:   "#FEF3C7",
  goldBg:      "#FFFBEB",

  // Semantic
  indigo:      "#4F46E5",
  indigoBg:    "#EEF2FF",
  green:       "#059669",
  greenBg:     "#ECFDF5",
  red:         "#DC2626",
  redBg:       "#FEF2F2",
  orange:      "#EA580C",
  orangeBg:    "#FFF7ED",
  purple:      "#7C3AED",
  purpleBg:    "#F5F3FF",
  blue:        "#2563EB",
  blueBg:      "#EFF6FF",
};

export default function CrmDashboardClient({ leads, todayTasks, quotes, stats, currentUser }: Props) {
  const [tasks, setTasks] = useState(todayTasks);
  const [allLeads, setAllLeads] = useState(leads);
  const [showAddModal, setShowAddModal] = useState(false);

  // Data Pool pending stats
  const [poolStats, setPoolStats] = useState<{ pending: number; claimed: number; converted: number; total: number; bySource: { source: string; count: number }[] } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchPoolStats() {
      try {
        const res = await fetch("/api/crm/raw-leads/stats", { cache: "no-store" });
        if (res.ok && mounted) setPoolStats(await res.json());
      } catch { /* silent */ }
    }
    fetchPoolStats();
    const iv = setInterval(fetchPoolStats, 60_000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const overdueLeads = leads.filter(isOverdue);
  const wonLeads = leads.filter(l => l.stage === "won");
  const activeLeads = leads.filter(l => !["won", "lost"].includes(l.stage));
  const pendingTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const totalValue = leads.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const wonValue = wonLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const winRate = stats.conversionRate;

  async function toggleTask(task: CrmTask) {
    const updated = { ...task, done: !task.done };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    await fetch(`/api/crm/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const dateStr = now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const monthlyRevArr = stats.monthlyRevenue;
  const currentMonthRev = monthlyRevArr[monthlyRevArr.length - 1]?.value ?? 0;
  const prevMonthRev = monthlyRevArr[monthlyRevArr.length - 2]?.value ?? 0;
  const revenueChange = prevMonthRev > 0 ? Math.round(((currentMonthRev - prevMonthRev) / prevMonthRev) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: T.bg }}>

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 py-5 flex items-center justify-between"
        style={{ background: T.headerBg, borderBottom: `1px solid ${T.headerBorder}` }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.green }} />
            <span className="text-xs font-medium" style={{ color: T.textMuted }}>{dateStr}</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: T.textPrimary }}>
            {greeting}{currentUser?.name ? `, ${currentUser.name}` : ""} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: T.textSecondary }}>
            SmartFurni CRM — {currentUser?.isAdmin ? "Tổng quan kinh doanh B2B" : `Dữ liệu của bạn · ${ROLE_LABELS[currentUser?.role ?? ""] ?? currentUser?.role}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {overdueLeads.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: T.redBg, color: T.red, border: `1px solid #FECACA` }}>
              <AlertCircle size={13} />
              {overdueLeads.length} KH quá hạn
            </div>
          )}
          {currentUser && (
            <Link
              href="/crm/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
              style={{ border: `1px solid ${T.cardBorder}`, background: T.card }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})` }}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              {!currentUser.isAdmin && (
                <div className="text-left">
                  <div className="text-xs font-semibold leading-tight" style={{ color: T.textPrimary }}>{currentUser.name}</div>
                  <div className="text-[10px] leading-tight" style={{ color: T.textMuted }}>{currentUser.username}</div>
                </div>
              )}
            </Link>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldDark} 100%)` }}
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Plus size={12} className="text-white" />
            </div>
            Thêm khách hàng
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreated={(lead) => {
            setAllLeads(prev => [lead, ...prev]);
            setShowAddModal(false);
          }}
          isAdmin={currentUser?.isAdmin}
          currentUserName={currentUser?.name || ""}
        />
      )}

      <div className="p-6 space-y-5">

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Tổng khách hàng"
            value={leads.length}
            sub={`${activeLeads.length} đang theo dõi`}
            color={T.indigo}
            colorBg={T.indigoBg}
            badge={`${stats.newLeadsThisMonth} mới tháng này`}
            badgeColor={T.indigo}
          />
          <KpiCard
            icon={DollarSign}
            label="Pipeline giá trị"
            value={totalValue >= 1e9 ? `${(totalValue/1e9).toFixed(1)}B` : totalValue >= 1e6 ? `${(totalValue/1e6).toFixed(0)}tr` : formatVND(totalValue)}
            sub={`Won: ${wonValue >= 1e9 ? `${(wonValue/1e9).toFixed(1)}B` : wonValue >= 1e6 ? `${(wonValue/1e6).toFixed(0)}tr` : formatVND(wonValue)}`}
            color={T.gold}
            colorBg={T.goldBg}
            badge={revenueChange !== 0 ? `${revenueChange > 0 ? "+" : ""}${revenueChange}% so tháng trước` : undefined}
            badgeColor={revenueChange >= 0 ? T.green : T.red}
            isText
          />
          <KpiCard
            icon={Trophy}
            label="Tỷ lệ chốt đơn"
            value={`${winRate}%`}
            sub={`${wonLeads.length} đơn thành công`}
            color={T.green}
            colorBg={T.greenBg}
            badge={`${stats.wonLeadsThisMonth} chốt tháng này`}
            badgeColor={T.green}
            isText
          />
          <KpiCard
            icon={AlertCircle}
            label="Cần liên hệ ngay"
            value={overdueLeads.length}
            sub="Quá 3 ngày không tương tác"
            color={T.red}
            colorBg={T.redBg}
            urgent={overdueLeads.length > 0}
            badge={overdueLeads.length > 0 ? "Cần xử lý" : "Tốt"}
            badgeColor={overdueLeads.length > 0 ? T.red : T.green}
          />
        </div>

        {/* ── Data Pool Banner ─────────────────────────────────────────── */}
        {poolStats !== null && poolStats.pending > 0 && (
          <Link
            href="/crm/data-pool"
            className="block rounded-2xl overflow-hidden transition-all hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #1E3A5F 100%)",
              border: "1px solid rgba(201,168,76,0.25)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(201,168,76,0.1)",
            }}
          >
            <div className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}
                >
                  <Database size={22} style={{ color: T.gold }} />
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                    style={{ background: T.red, boxShadow: "0 0 0 2px #0F172A" }}
                  >
                    {poolStats.pending > 9 ? "9+" : poolStats.pending}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-white font-bold text-sm">Data Pool</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-black text-white flex-shrink-0"
                      style={{ background: T.red }}
                    >
                      {poolStats.pending > 99 ? "99+" : poolStats.pending} chờ nhận
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Có{" "}
                    <span className="font-bold" style={{ color: T.gold }}>{poolStats.pending}</span>
                    {" "}data khách hàng mới chưa có người nhận
                    {poolStats.bySource.length > 0 && (
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>
                        {" — "}
                        {poolStats.bySource.slice(0, 2).map((s, i) => (
                          <span key={s.source}>
                            {i > 0 && ", "}
                            <span style={{ color: "rgba(255,255,255,0.65)" }}>
                              {s.source === "facebook_lead" ? "Facebook" : s.source === "tiktok_lead" ? "TikTok" : s.source === "manual" ? "Nhập tay" : s.source}
                            </span>
                            {" "}({s.count})
                          </span>
                        ))}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(201,168,76,0.35)",
                }}
              >
                Nhận ngay
                <ArrowRight size={14} />
              </div>
            </div>
            {poolStats.total > 0 && (
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Tiến độ xử lý</span>
                  <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {poolStats.claimed + poolStats.converted}/{poolStats.total} đã xử lý
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(((poolStats.claimed + poolStats.converted) / poolStats.total) * 100)}%`,
                      background: `linear-gradient(90deg, ${T.gold}, #E2C97E)`,
                      transition: "width 0.7s ease",
                    }}
                  />
                </div>
              </div>
            )}
          </Link>
        )}

        {/* ── This Month Summary ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Doanh thu */}
          <div className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.goldBg }}>
              <DollarSign size={20} style={{ color: T.gold }} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: T.textMuted }}>Doanh thu tháng này</div>
              <div className="text-xl font-black leading-tight" style={{ color: T.textPrimary }}>
                {stats.wonValueThisMonth >= 1e9
                  ? `${(stats.wonValueThisMonth/1e9).toFixed(2)}B`
                  : stats.wonValueThisMonth >= 1e6
                  ? `${(stats.wonValueThisMonth/1e6).toFixed(0)}tr`
                  : formatVND(stats.wonValueThisMonth)}
              </div>
              <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold`}
                style={{ color: revenueChange >= 0 ? T.green : T.red }}>
                {revenueChange > 0 ? <TrendingUp size={10} /> : revenueChange < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                {revenueChange > 0 ? "+" : ""}{revenueChange}% so tháng trước
              </div>
            </div>
          </div>

          {/* KH mới */}
          <div className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.indigoBg }}>
              <UserCheck size={20} style={{ color: T.indigo }} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: T.textMuted }}>KH mới tháng này</div>
              <div className="text-xl font-black leading-tight" style={{ color: T.textPrimary }}>{stats.newLeadsThisMonth}</div>
              <div className="text-[10px] mt-1" style={{ color: T.textMuted }}>Tổng {leads.length} khách hàng</div>
            </div>
          </div>

          {/* Đơn chốt */}
          <div className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.greenBg }}>
              <Trophy size={20} style={{ color: T.green }} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: T.textMuted }}>Đơn chốt tháng này</div>
              <div className="text-xl font-black leading-tight" style={{ color: T.textPrimary }}>{stats.wonLeadsThisMonth}</div>
              <div className="text-[10px] mt-1" style={{ color: T.textMuted }}>Tỷ lệ chốt {winRate}%</div>
            </div>
          </div>
        </div>

        {/* ── Main Grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left col (2/3) */}
          <div className="xl:col-span-2 space-y-5">

            {/* ── Monthly Revenue Chart ── */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${T.divider}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: T.goldBg }}>
                    <BarChart2 size={16} style={{ color: T.gold }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Doanh thu theo tháng</h2>
                    <p className="text-[10px]" style={{ color: T.textMuted }}>6 tháng gần nhất (đơn đã chốt)</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black" style={{ color: T.textPrimary }}>
                    {stats.wonValueThisMonth >= 1e9
                      ? `${(stats.wonValueThisMonth/1e9).toFixed(2)}B`
                      : `${(stats.wonValueThisMonth/1e6).toFixed(0)}tr`}
                  </div>
                  <div className="text-[10px]" style={{ color: T.textMuted }}>Tháng hiện tại</div>
                </div>
              </div>
              <div className="p-6">
                {stats.monthlyRevenue.every(m => m.value === 0) ? (
                  <div className="flex flex-col items-center justify-center py-10" style={{ color: T.textMuted }}>
                    <BarChart2 size={32} className="mb-2 opacity-20" />
                    <p className="text-xs">Chưa có dữ liệu doanh thu</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end gap-3 h-28 mb-4">
                      {stats.monthlyRevenue.map((m, i) => {
                        const maxVal = Math.max(...stats.monthlyRevenue.map(x => x.value), 1);
                        const pct = maxVal > 0 ? (m.value / maxVal) * 100 : 0;
                        const isCurrentMonth = i === stats.monthlyRevenue.length - 1;
                        const valLabel = m.value >= 1e9
                          ? `${(m.value/1e9).toFixed(1)}B`
                          : m.value >= 1e6
                          ? `${(m.value/1e6).toFixed(0)}tr`
                          : m.value > 0 ? `${(m.value/1000).toFixed(0)}k` : "0";
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                            {m.value > 0 && (
                              <div className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: T.textSecondary }}>
                                {valLabel}
                              </div>
                            )}
                            <div className="w-full relative flex-1 flex items-end">
                              <div className="w-full rounded-t-md transition-all duration-700 relative overflow-hidden"
                                style={{
                                  height: `${Math.max(6, pct)}%`,
                                  background: isCurrentMonth
                                    ? `linear-gradient(180deg, #E2C97E, ${T.gold})`
                                    : "#E4E7EC",
                                  minHeight: 6,
                                  boxShadow: isCurrentMonth ? `0 2px 8px rgba(201,168,76,0.25)` : "none",
                                }}>
                                {isCurrentMonth && (
                                  <div className="absolute inset-0 opacity-25"
                                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.5), transparent)" }} />
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold"
                              style={{ color: isCurrentMonth ? T.gold : T.textMuted }}>
                              {m.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: `1px solid ${T.divider}` }}>
                      <div className="text-center p-3 rounded-xl" style={{ background: T.bg }}>
                        <div className="text-sm font-black" style={{ color: T.textPrimary }}>{stats.newLeadsThisMonth}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>KH mới</div>
                      </div>
                      <div className="text-center p-3 rounded-xl" style={{ background: T.greenBg }}>
                        <div className="text-sm font-black" style={{ color: T.green }}>{stats.wonLeadsThisMonth}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>Đơn chốt</div>
                      </div>
                      <div className="text-center p-3 rounded-xl" style={{ background: T.goldBg }}>
                        <div className="text-sm font-black" style={{ color: T.gold }}>
                          {stats.wonValueThisMonth >= 1e9
                            ? `${(stats.wonValueThisMonth/1e9).toFixed(2)}B`
                            : `${(stats.wonValueThisMonth/1e6).toFixed(0)}tr`}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>Doanh thu</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline Funnel */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${T.divider}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: T.indigoBg }}>
                    <BarChart2 size={16} style={{ color: T.indigo }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Pipeline Sales</h2>
                    <p className="text-[10px]" style={{ color: T.textMuted }}>Phân bổ theo giai đoạn</p>
                  </div>
                </div>
                <Link href="/crm/kanban"
                  className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ color: T.indigo }}>
                  Xem Kanban <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {(Object.keys(STAGE_LABELS) as Array<keyof typeof STAGE_LABELS>).map((stage, i) => {
                    const stageLeads = leads.filter(l => l.stage === stage);
                    const count = stageLeads.length;
                    const value = stageLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
                    const maxCount = Math.max(...Object.keys(STAGE_LABELS).map(s => leads.filter(l => l.stage === s).length), 1);
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                          style={{ background: STAGE_COLORS[stage] }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold" style={{ color: T.textSecondary }}>{STAGE_LABELS[stage]}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold" style={{ color: T.textPrimary }}>{count} KH</span>
                              {value > 0 && (
                                <span className="text-[10px] font-semibold" style={{ color: T.gold }}>
                                  {value >= 1e9 ? `${(value/1e9).toFixed(1)}B` : value >= 1e6 ? `${(value/1e6).toFixed(0)}tr` : formatVND(value)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: T.bg }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: STAGE_COLORS[stage],
                                opacity: count === 0 ? 0.15 : 1,
                              }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Source + Type row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Source Effectiveness */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
                <div className="px-5 py-4 flex items-center gap-2"
                  style={{ borderBottom: `1px solid ${T.divider}` }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: T.orangeBg }}>
                    <TrendingUp size={14} style={{ color: T.orange }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Nguồn khách hàng</h2>
                    <p className="text-[10px]" style={{ color: T.textMuted }}>Hiệu quả theo nguồn</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {stats.bySource.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: T.textMuted }}>Chưa có dữ liệu</p>
                  ) : stats.bySource.slice(0, 5).map(({ source, count, wonCount }) => {
                    const wr = count > 0 ? Math.round((wonCount / count) * 100) : 0;
                    const maxCount = Math.max(...stats.bySource.map(s => s.count), 1);
                    const color = SOURCE_COLORS[source] || "#6b7280";
                    return (
                      <div key={source}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-xs font-medium truncate max-w-[110px]" style={{ color: T.textSecondary }}>{source}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px]" style={{ color: T.textMuted }}>{count} KH</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: wr >= 30 ? T.greenBg : T.bg,
                                color: wr >= 30 ? T.green : T.textMuted,
                              }}>
                              {wr}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.bg }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(count / maxCount) * 100}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Type */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
                <div className="px-5 py-4 flex items-center gap-2"
                  style={{ borderBottom: `1px solid ${T.divider}` }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: T.purpleBg }}>
                    <PieChart size={14} style={{ color: T.purple }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Phân loại khách</h2>
                    <p className="text-[10px]" style={{ color: T.textMuted }}>Theo nhóm đối tượng</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {(["architect", "investor", "dealer"] as const).map(type => {
                    const typeLeads = leads.filter(l => l.type === type);
                    const count = typeLeads.length;
                    const wonCount = typeLeads.filter(l => l.stage === "won").length;
                    const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                    const typeValue = typeLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
                    return (
                      <div key={type} className="p-3 rounded-xl transition-colors"
                        style={{ background: `${TYPE_COLORS[type]}08`, border: `1px solid ${TYPE_COLORS[type]}18` }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLORS[type] }} />
                            <span className="text-xs font-semibold" style={{ color: T.textPrimary }}>{TYPE_LABELS[type]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black" style={{ color: T.textPrimary }}>{count}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${TYPE_COLORS[type]}18`, color: TYPE_COLORS[type] }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${TYPE_COLORS[type]}15` }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: TYPE_COLORS[type] }} />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px]" style={{ color: T.textMuted }}>
                            {wonCount} đã chốt · {typeValue >= 1e6 ? `${(typeValue/1e6).toFixed(0)}tr` : formatVND(typeValue)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Staff Performance (admin only) */}
            {currentUser?.isAdmin && stats.staffPerformance.length > 0 && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
                <div className="px-6 py-4 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${T.divider}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: T.goldBg }}>
                      <Star size={15} style={{ color: T.gold }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Hiệu suất nhân viên</h2>
                      <p className="text-[10px]" style={{ color: T.textMuted }}>Xếp hạng theo doanh số</p>
                    </div>
                  </div>
                  <Link href="/crm/staff"
                    className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: T.indigo }}>
                    Quản lý nhân viên <ArrowUpRight size={12} />
                  </Link>
                </div>
                {/* Table header */}
                <div className="px-6 py-2 grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: T.bg, borderBottom: `1px solid ${T.divider}`, color: T.textMuted }}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Nhân viên</div>
                  <div className="col-span-2 text-center">KH phụ trách</div>
                  <div className="col-span-2 text-center">Đã chốt</div>
                  <div className="col-span-2 text-center">Tỷ lệ</div>
                  <div className="col-span-2 text-right">Doanh số</div>
                </div>
                <div className="divide-y" style={{ borderColor: T.divider }}>
                  {stats.staffPerformance.slice(0, 8).map((s, i) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const maxWonValue = Math.max(...stats.staffPerformance.map(x => x.wonValue), 1);
                    const barPct = maxWonValue > 0 ? (s.wonValue / maxWonValue) * 100 : 0;
                    const isTop = i === 0;
                    return (
                      <div key={s.staffName}
                        className="px-6 py-3 grid grid-cols-12 gap-2 items-center transition-colors hover:opacity-90"
                        style={{ background: isTop ? T.goldBg : undefined }}>
                        <div className="col-span-1 text-sm">{medals[i] ?? <span className="text-xs font-bold" style={{ color: T.textMuted }}>{i+1}</span>}</div>
                        <div className="col-span-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                              style={{
                                background: isTop ? `linear-gradient(135deg, ${T.gold}, ${T.goldDark})` : T.bg,
                                color: isTop ? "white" : T.textMuted,
                                border: isTop ? "none" : `1px solid ${T.cardBorder}`,
                              }}>
                              {s.staffName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold truncate" style={{ color: T.textPrimary }}>{s.staffName}</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-xs font-bold" style={{ color: T.textSecondary }}>{s.leadsCount}</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-xs font-bold" style={{ color: T.green }}>{s.wonCount}</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: s.conversionRate >= 40 ? T.greenBg : s.conversionRate >= 20 ? T.goldBg : T.bg,
                              color: s.conversionRate >= 40 ? T.green : s.conversionRate >= 20 ? T.gold : T.textMuted,
                            }}>
                            {s.conversionRate}%
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <div className="text-xs font-black" style={{ color: isTop ? T.gold : T.textPrimary }}>
                            {s.wonValue >= 1e9 ? `${(s.wonValue/1e9).toFixed(1)}B` : s.wonValue >= 1e6 ? `${(s.wonValue/1e6).toFixed(0)}tr` : `${(s.wonValue/1000).toFixed(0)}k`}
                          </div>
                          <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ background: T.bg }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${barPct}%`, background: isTop ? `linear-gradient(90deg, ${T.gold}, ${T.goldDark})` : T.cardBorder }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Activities */}
            {stats.recentActivities.length > 0 && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
                <div className="px-5 py-4 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${T.divider}` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: T.greenBg }}>
                      <Activity size={14} style={{ color: T.green }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Hoạt động gần đây</h2>
                      <p className="text-[10px]" style={{ color: T.textMuted }}>10 hoạt động mới nhất</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: T.divider }}>
                  {stats.recentActivities.slice(0, 6).map((act) => {
                    const IconComp = ACTIVITY_TYPE_ICONS[act.type] || FileText;
                    const actColors: Record<string, { bg: string; color: string }> = {
                      call:       { bg: T.blueBg,   color: T.blue },
                      meeting:    { bg: T.purpleBg, color: T.purple },
                      email:      { bg: T.orangeBg, color: T.orange },
                      note:       { bg: T.bg,       color: T.textMuted },
                      quote_sent: { bg: T.goldBg,   color: T.gold },
                      contract:   { bg: T.greenBg,  color: T.green },
                    };
                    const c = actColors[act.type] || { bg: T.bg, color: T.textMuted };
                    const timeAgo = (() => {
                      const diff = Date.now() - new Date(act.createdAt).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 60) return `${mins}p trước`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}h trước`;
                      return `${Math.floor(hrs / 24)}n trước`;
                    })();
                    return (
                      <div key={act.id} className="flex items-start gap-3 px-5 py-3 hover:opacity-90 transition-opacity">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: c.bg }}>
                          <IconComp size={13} style={{ color: c.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: T.textPrimary }}>{act.title}</p>
                          <p className="text-[10px] truncate mt-0.5" style={{ color: T.textMuted }}>{act.content}</p>
                        </div>
                        <div className="flex-shrink-0 text-[10px] mt-0.5" style={{ color: T.textMuted }}>{timeAgo}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Quotes */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${T.divider}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: T.greenBg }}>
                    <FileText size={14} style={{ color: T.green }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Báo giá gần đây</h2>
                    <p className="text-[10px]" style={{ color: T.textMuted }}>{quotes.length} báo giá</p>
                  </div>
                </div>
                <Link href="/crm/quotes"
                  className="text-[10px] font-medium flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                  style={{ color: T.indigo }}>
                  Tất cả <ArrowUpRight size={10} />
                </Link>
              </div>
              <div className="divide-y" style={{ borderColor: T.divider }}>
                {quotes.length === 0 ? (
                  <div className="text-center py-6" style={{ color: T.textMuted }}>
                    <FileText size={22} className="mx-auto mb-1.5 opacity-20" />
                    <p className="text-xs">Chưa có báo giá</p>
                  </div>
                ) : quotes.slice(0, 4).map(q => {
                  const statusConfig = {
                    draft:    { label: "Nháp",      color: T.textMuted,  bg: T.bg },
                    sent:     { label: "Đã gửi",    color: T.blue,       bg: T.blueBg },
                    accepted: { label: "Chấp nhận", color: T.green,      bg: T.greenBg },
                    rejected: { label: "Từ chối",   color: T.red,        bg: T.redBg },
                  }[q.status];
                  return (
                    <Link key={q.id} href={`/crm/quotes/${q.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:opacity-90 transition-opacity">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold" style={{ color: T.textPrimary }}>{q.quoteNumber}</div>
                        <div className="text-[10px] truncate" style={{ color: T.textMuted }}>{q.leadName}</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-xs font-bold" style={{ color: T.gold }}>
                          {q.total >= 1e9 ? `${(q.total/1e9).toFixed(1)}B` : q.total >= 1e6 ? `${(q.total/1e6).toFixed(0)}tr` : formatVND(q.total)}
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: statusConfig?.bg, color: statusConfig?.color }}>
                          {statusConfig?.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {quotes.length > 0 && (
                <div className="px-5 py-3" style={{ borderTop: `1px solid ${T.divider}` }}>
                  <Link href="/crm/quotes/new"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-80"
                    style={{ border: `1px dashed ${T.gold}`, color: T.gold }}>
                    <Plus size={12} />
                    Tạo báo giá mới
                  </Link>
                </div>
              )}
            </div>

          </div>

          {/* Right col (1/3) */}
          <div className="space-y-5">

            {/* Today's Tasks */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${T.divider}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: T.goldBg }}>
                    <CheckSquare size={14} style={{ color: T.gold }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Việc hôm nay</h2>
                    <p className="text-[10px]" style={{ color: T.textMuted }}>{doneTasks.length}/{tasks.length} hoàn thành</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/crm/tasks" className="text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: T.gold }}>Xem tất cả</Link>
                  {pendingTasks.length > 0 && (
                    <span className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background: T.goldBg, color: T.gold }}>
                      {pendingTasks.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {tasks.length > 0 && (
                <div className="px-5 pt-3 pb-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.bg }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0}%`,
                        background: `linear-gradient(90deg, ${T.green}, #047857)`,
                      }} />
                  </div>
                </div>
              )}

              <div className="p-4 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                      style={{ background: T.bg }}>
                      <CheckSquare size={18} style={{ color: T.textMuted }} />
                    </div>
                    <p className="text-xs" style={{ color: T.textMuted }}>Không có việc hôm nay</p>
                    <p className="text-[10px] mt-0.5" style={{ color: T.textLabel }}>Tận hưởng ngày của bạn! 🎉</p>
                  </div>
                ) : (
                  tasks.map(task => {
                    const pc = PRIORITY_CONFIG[task.priority];
                    return (
                      <div key={task.id}
                        className="flex items-start gap-2.5 p-3 rounded-xl transition-all"
                        style={{
                          background: task.done ? T.bg : T.card,
                          border: `1px solid ${task.done ? T.divider : T.cardBorder}`,
                        }}>
                        <button onClick={() => toggleTask(task)}
                          className="flex-shrink-0 mt-0.5 rounded-md transition-all flex items-center justify-center"
                          style={{
                            width: 18, height: 18,
                            border: `2px solid ${task.done ? T.green : T.cardBorder}`,
                            background: task.done ? T.green : "transparent",
                          }}>
                          {task.done && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold leading-snug`}
                            style={{ color: task.done ? T.textMuted : T.textPrimary,
                                     textDecoration: task.done ? "line-through" : "none" }}>
                            {task.title}
                          </p>
                          <Link href={`/crm/leads/${task.leadId}`}
                            className="text-[10px] font-medium hover:underline mt-0.5 block truncate"
                            style={{ color: T.gold }}>
                            {task.leadName}
                          </Link>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{ background: pc.bg, color: pc.color }}>
                          {pc.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Overdue Alert */}
            {overdueLeads.length > 0 && (
              <div className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid #FECACA`, boxShadow: `0 1px 4px rgba(220,38,38,0.08)` }}>
                <div className="px-5 py-4 flex items-center justify-between"
                  style={{ background: "linear-gradient(135deg, #FEF2F2, #FFFFFF)", borderBottom: "1px solid #FECACA" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "#FEE2E2" }}>
                      <Zap size={14} style={{ color: T.red }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold" style={{ color: "#991B1B" }}>Cần liên hệ ngay</h2>
                      <p className="text-[10px]" style={{ color: "#F87171" }}>Quá 3 ngày không tương tác</p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: "#FEE2E2", color: T.red }}>
                    {overdueLeads.length}
                  </span>
                </div>
                <div className="p-3 space-y-2" style={{ background: T.card }}>
                  {overdueLeads.slice(0, 5).map(lead => {
                    const daysAgo = Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={lead.id} href={`/crm/leads/${lead.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl transition-colors hover:opacity-90 group"
                        style={{ border: "1px solid #FEE2E2" }}>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate" style={{ color: T.textPrimary }}>{lead.name}</div>
                          <div className="text-[10px] truncate" style={{ color: T.textMuted }}>{lead.company || STAGE_LABELS[lead.stage]}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md"
                            style={{ background: "#FEE2E2" }}>
                            <Clock size={9} style={{ color: T.red }} />
                            <span className="text-[10px] font-black" style={{ color: T.red }}>{daysAgo}n</span>
                          </div>
                          <ChevronRight size={12} style={{ color: T.textMuted }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
                <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Thống kê nhanh</h2>
              </div>
              <div className="p-4 space-y-2.5">
                {[
                  { label: "Đang thương thảo", value: (stats.byStage["negotiating"] || 0), color: T.orange, bg: T.orangeBg, icon: Target },
                  { label: "Đã báo giá",        value: (stats.byStage["quoted"] || 0),       color: T.gold,   bg: T.goldBg,   icon: FileText },
                  { label: "Đã khảo sát",       value: (stats.byStage["surveyed"] || 0),     color: T.purple, bg: T.purpleBg, icon: Briefcase },
                  { label: "Đã gửi Profile",    value: (stats.byStage["profile_sent"] || 0), color: T.blue,   bg: T.blueBg,   icon: Mail },
                ].map(({ label, value, color, bg, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ background: bg, border: `1px solid ${color}18` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: `${color}18` }}>
                        <Icon size={12} style={{ color }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: T.textSecondary }}>{label}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
                <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Truy cập nhanh</h2>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { href: "/crm/leads",      label: "Khách hàng",  icon: Users,     color: T.indigo, bg: T.indigoBg },
                  { href: "/crm/kanban",     label: "Kanban",      icon: BarChart2, color: T.orange, bg: T.orangeBg },
                  { href: "/crm/quotes/new", label: "Báo giá mới", icon: FileText,  color: T.green,  bg: T.greenBg },
                  { href: "/crm/calendar",   label: "Lịch hẹn",   icon: Calendar,  color: T.blue,   bg: T.blueBg },
                  ...(currentUser?.isAdmin ? [
                    { href: "/crm/reports", label: "Báo cáo",    icon: TrendingUp, color: T.purple, bg: T.purpleBg },
                    { href: "/crm/staff",   label: "Nhân viên",  icon: Award,      color: T.gold,   bg: T.goldBg },
                  ] : []),
                ].map(({ href, label, icon: Icon, color, bg }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-2 p-3 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: bg, border: `1px solid ${color}18` }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}20` }}>
                      <Icon size={12} style={{ color }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: T.textSecondary }}>{label}</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card Component ──────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub: string;
  color: string;
  colorBg: string;
  badge?: string;
  badgeColor?: string;
  isText?: boolean;
  urgent?: boolean;
}

function KpiCard({ icon: Icon, label, value, sub, color, colorBg, badge, badgeColor, urgent }: KpiCardProps) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden transition-all hover:shadow-md"
      style={{
        background: "#FFFFFF",
        border: urgent ? `1px solid ${color}50` : `1px solid #E4E7EC`,
        boxShadow: urgent ? `0 1px 4px ${color}18` : "0 1px 4px rgba(16,24,40,0.06)",
      }}>
      {urgent && <div className="absolute inset-0 opacity-[0.025]" style={{ background: color }} />}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: colorBg }}>
          <Icon size={20} style={{ color }} />
        </div>
        {urgent && (
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        )}
      </div>
      <div className="text-2xl font-black leading-none mb-1" style={{ color: "#101828" }}>{value}</div>
      <div className="text-xs font-semibold mb-1" style={{ color: "#475467" }}>{label}</div>
      <div className="text-[10px] truncate" style={{ color: "#98A2B3" }}>{sub}</div>
      {badge && (
        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
          style={{ background: `${badgeColor}15`, color: badgeColor }}>
          {badge}
        </div>
      )}
    </div>
  );
}
