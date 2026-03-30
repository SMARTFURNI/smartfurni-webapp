"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Users, TrendingUp, FileText, CheckSquare, AlertCircle,
  Clock, ChevronRight, Target, Award, DollarSign,
  Phone, Mail, Calendar, ArrowUpRight, Zap, Activity,
  BarChart2, PieChart, Plus, Star, Trophy,
  TrendingDown, Minus, ArrowRight, Briefcase, UserCheck,
  Database, Bell, ChevronDown, ChevronUp, Sun, Moon,
  Flame, Crosshair, Wifi, WifiOff, RefreshCw, Eye,
  AlertTriangle, CheckCircle2, Info, X, Filter, Flag,
} from "lucide-react";
import type { Lead, CrmTask, Quote, CrmStats } from "@/lib/crm-types";
import { STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS, formatVND, isOverdue } from "@/lib/crm-types";
import type { DashboardTheme, DashboardSectionId } from "@/lib/crm-settings-store";
import { DEFAULT_SETTINGS } from "@/lib/crm-settings-store";
import AddLeadModal from "./AddLeadModal";
import { TwelveWeekReportDashboard, GoalDetailDashboard } from "./TwelveWeekReportWidgets";

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
  dashboardTheme?: DashboardTheme;
  currentUser?: CurrentUser;
}

const PRIORITY_CONFIG = {
  high:   { color: "#DC2626", bg: "#FEF2F2", label: "Cao" },
  medium: { color: "#D97706", bg: "#FFFBEB", label: "TB" },
  low:    { color: "#059669", bg: "#ECFDF5", label: "Thấp" },
};

const ACTIVITY_TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone, meeting: Users, email: Mail,
  note: FileText, quote_sent: FileText, contract: FileText,
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Quản trị viên", manager: "Trưởng nhóm",
  senior_sales: "Kinh doanh cấp cao", sales: "Kinh doanh", intern: "Thực tập sinh",
};

const SOURCE_COLORS: Record<string, string> = {
  "Facebook Ads": "#1877f2", "Google Ads": "#ea4335",
  "KTS giới thiệu": "#7C3AED", "Khách hàng cũ giới thiệu": "#EA580C",
  "Zalo": "#0068ff", "Website": "#059669",
  "Triển lãm": "#D97706", "Telesale": "#DB2777",
};

const T = {
  bg: "#F7F8FA", card: "#FFFFFF", cardBorder: "#EAECF0",
  cardShadow: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
  headerBg: "#FFFFFF", headerBorder: "#F2F4F7", divider: "#F2F4F7",
  textPrimary: "#101828", textSecondary: "#344054",
  textMuted: "#98A2B3", textLabel: "#667085",
  gold: "#C9A84C", goldDark: "#9A7A2E", goldLight: "#FEF3C7", goldBg: "#FFFBEB",
  indigo: "#4F46E5", indigoBg: "#EEF2FF", indigoLight: "#C7D2FE",
  green: "#059669", greenBg: "#ECFDF5",
  red: "#DC2626", redBg: "#FEF2F2",
  orange: "#EA580C", orangeBg: "#FFF7ED",
  purple: "#7C3AED", purpleBg: "#F5F3FF",
  blue: "#2563EB", blueBg: "#EFF6FF",
};

// ── Revenue Chart (Doanh thu & Dự báo) ─────────────────────────────────────
interface RevenueChartProps {
  forecast: { forecastValue: number; pipelineCount: number; monthlyData: Array<{ label: string; actual: number; isForecast: boolean }> } | null;
  stats: import("@/lib/crm-types").CrmStats;
  periodStats: { newLeads: number; wonLeads: number; wonValue: number; convRate: number; sparkline: number[]; wonSparkline: number[] } | null;
  theme: import("@/lib/crm-settings-store").DashboardTheme;
  fmtVal: (v: number) => string;
}

function RevenueChart({ forecast, stats, periodStats, theme, fmtVal }: RevenueChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = forecast?.monthlyData ?? stats.monthlyRevenue.map(m => ({ label: m.label, actual: m.value, isForecast: false }));
  const maxVal = Math.max(...data.map(x => x.actual), 1);
  const totalActual = data.filter(m => !m.isForecast).reduce((s, m) => s + m.actual, 0);
  const currentIdx = forecast ? data.length - 2 : data.length - 1;
  const currentVal = data[currentIdx]?.actual ?? 0;
  const prevVal = data[currentIdx - 1]?.actual ?? 0;
  const growthPct = prevVal > 0 ? Math.round(((currentVal - prevVal) / prevVal) * 100) : 0;

  // SVG trend line
  const CHART_W = 520;
  const CHART_H = 56;
  const nonForecast = data.filter(m => !m.isForecast);
  const trendPts = nonForecast.map((m, i) => {
    const x = (i / Math.max(nonForecast.length - 1, 1)) * CHART_W;
    const y = CHART_H - (m.actual / maxVal) * (CHART_H - 8) - 4;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="px-5 pb-5 pt-2">
      {/* ── Header KPIs ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {
            label: "Doanh thu tháng này",
            value: fmtVal(periodStats?.wonValue ?? stats.wonValueThisMonth),
            sub: growthPct !== 0 ? `${growthPct > 0 ? "+" : ""}${growthPct}% so tháng trước` : "So tháng trước",
            subColor: growthPct >= 0 ? T.green : T.red,
            icon: "$",
            color: theme.accentColor,
            bg: theme.accentColor + "10",
            border: theme.accentColor + "30",
          },
          {
            label: "KH mới tháng này",
            value: String(periodStats?.newLeads ?? stats.newLeadsThisMonth),
            sub: `Tổng ${stats.totalLeads} khách hàng`,
            subColor: T.textMuted,
            icon: "👥",
            color: theme.kpiCustomerColor,
            bg: theme.kpiCustomerColor + "10",
            border: theme.kpiCustomerColor + "30",
          },
          {
            label: "Dự báo tháng tới",
            value: forecast ? `~${fmtVal(forecast.forecastValue)}` : "—",
            sub: forecast ? `Từ ${forecast.pipelineCount} deal trong pipeline` : "Chưa có dữ liệu",
            subColor: T.textMuted,
            icon: "📈",
            color: T.indigo,
            bg: T.indigoBg,
            border: T.indigo + "30",
          },
        ].map(({ label, value, sub, subColor, icon, color, bg, border }) => (
          <div key={label} className="rounded-2xl p-3.5" style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base leading-none">{icon}</span>
              <span className="text-[11px] font-semibold" style={{ color: T.textMuted }}>{label}</span>
            </div>
            <div className="text-xl font-black tracking-tight" style={{ color }}>{value}</div>
            <div className="text-[10px] mt-1 font-medium" style={{ color: subColor }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Bar Chart ── */}
      <div className="rounded-2xl p-4" style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
        {/* Y-axis labels */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold" style={{ color: T.textMuted }}>Doanh thu (VNĐ)</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: `linear-gradient(180deg, ${theme.accentColor}CC, ${theme.accentColor})` }} />
              <span className="text-[10px]" style={{ color: T.textMuted }}>Thực tế</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: T.indigoBg, border: `1.5px dashed ${T.indigo}` }} />
              <span className="text-[10px]" style={{ color: T.textMuted }}>Dự báo</span>
            </div>
          </div>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-2" style={{ height: 140 }}>
          {data.map((m, i) => {
            const pct = maxVal > 0 ? (m.actual / maxVal) * 100 : 0;
            const isCurrent = i === currentIdx;
            const isForecast = m.isForecast;
            const isHovered = hoveredIdx === i;
            const barH = Math.max(8, (pct / 100) * 116);

            return (
              <div
                key={m.label}
                className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                <div
                  className="text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap transition-all duration-150"
                  style={{
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? "translateY(0)" : "translateY(4px)",
                    background: isForecast ? T.indigoBg : T.card,
                    color: isForecast ? T.indigo : theme.accentColor,
                    border: `1px solid ${isForecast ? T.indigo + "40" : theme.accentColor + "40"}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    pointerEvents: "none",
                  }}
                >
                  {m.actual > 0 ? fmtVal(m.actual) : "—"}
                </div>

                {/* Bar container */}
                <div className="w-full flex items-end" style={{ height: 116 }}>
                  <div
                    className="w-full rounded-t-xl transition-all duration-500 relative overflow-hidden"
                    style={{
                      height: barH,
                      background: isForecast
                        ? `repeating-linear-gradient(135deg, ${T.indigo}25, ${T.indigo}25 4px, ${T.indigoBg} 4px, ${T.indigoBg} 8px)`
                        : isCurrent
                        ? `linear-gradient(180deg, ${theme.accentColor}EE 0%, ${theme.accentColor} 100%)`
                        : isHovered
                        ? `linear-gradient(180deg, ${theme.accentColor}99 0%, ${theme.accentColor}CC 100%)`
                        : `linear-gradient(180deg, ${theme.accentColor}45 0%, ${theme.accentColor}70 100%)`,
                      border: isForecast ? `1.5px dashed ${T.indigo}80` : "none",
                      transform: isHovered ? "scaleX(0.92)" : "scaleX(1)",
                      transformOrigin: "bottom",
                      boxShadow: isCurrent ? `0 -2px 12px ${theme.accentColor}50` : "none",
                    }}
                  >
                    {/* Shine effect for current month */}
                    {isCurrent && (
                      <div className="absolute inset-0" style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                      }} />
                    )}
                  </div>
                </div>

                {/* Label */}
                <span
                  className="text-[10px] font-bold"
                  style={{
                    color: isForecast ? T.indigo : isCurrent ? theme.accentColor : T.textMuted,
                  }}
                >
                  {m.label}{isForecast ? " *" : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* SVG Trend Line */}
        {nonForecast.length >= 2 && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.divider}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={11} style={{ color: T.indigo }} />
              <span className="text-[10px] font-semibold" style={{ color: T.textMuted }}>Xu hướng 6 tháng</span>
              <span className="ml-auto text-[10px] font-bold" style={{ color: T.textMuted }}>
                Tổng: <span style={{ color: T.textSecondary }}>{fmtVal(totalActual)}</span>
              </span>
            </div>
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ height: 40 }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.indigo} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={T.indigo} stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Area fill */}
              <polygon
                points={`0,${CHART_H} ${trendPts} ${CHART_W},${CHART_H}`}
                fill="url(#trendGrad)"
              />
              {/* Line */}
              <polyline
                points={trendPts}
                fill="none"
                stroke={T.indigo}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
              />
              {/* Dots */}
              {nonForecast.map((m, i) => {
                const x = (i / Math.max(nonForecast.length - 1, 1)) * CHART_W;
                const y = CHART_H - (m.actual / maxVal) * (CHART_H - 8) - 4;
                return (
                  <circle key={i} cx={x} cy={y} r="3" fill={T.indigo} opacity="0.8" />
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ──// ── 12 Week Plan Widget (Dashboard) ─────────────────────────────────────
function TwelveWeekWidget({ plan, loadingPlan }: {
  plan: { id: string; title: string; startDate: string; endDate: string; goals: Array<{ id: string; title: string; color: string }>; tasks: Array<{ id: string; goalId: string; weekNumber: number; status: string }> } | null;
  loadingPlan: boolean;
}) {

  const GOAL_COLORS_MAP: Record<string, string> = {
    indigo: "#4F46E5", green: "#059669", gold: "#D97706",
    red: "#DC2626", purple: "#7C3AED", blue: "#2563EB",
  };

  function getCurrentWeek(startDate: string) {
    const diff = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(12, Math.max(1, Math.ceil((diff + 1) / 7)));
  }

  if (loadingPlan) return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
      <div className="h-4 rounded w-1/2 mb-3" style={{ background: `${T.textMuted}20` }} />
      <div className="h-2 rounded w-full mb-2" style={{ background: `${T.textMuted}10` }} />
      <div className="h-2 rounded w-3/4" style={{ background: `${T.textMuted}10` }} />
    </div>
  );

  if (!plan) return (
    <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EEF2FF" }}>
          <Crosshair size={14} style={{ color: "#4F46E5" }} />
        </div>
        <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Kế hoạch 12 Tuần</span>
      </div>
      <p className="text-xs mb-3" style={{ color: T.textMuted }}>Chưa có kế hoạch nào. Bắt đầu ngay!</p>
      <Link href="/crm/twelve-week-plan"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-white"
        style={{ background: "#4F46E5" }}>
        <Plus size={12} /> Tạo kế hoạch
      </Link>
    </div>
  );

  const currentWeek = getCurrentWeek(plan.startDate);
  const totalTasks = plan.tasks.filter((t) => t.status !== "skipped").length;
  const doneTasks = plan.tasks.filter((t) => t.status === "done").length;
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Current week tasks
  const thisWeekTasks = plan.tasks.filter((t) => t.weekNumber === currentWeek && t.status !== "skipped");
  const thisWeekDone = thisWeekTasks.filter((t) => t.status === "done").length;
  const thisWeekPct = thisWeekTasks.length > 0 ? Math.round((thisWeekDone / thisWeekTasks.length) * 100) : 0;

  // 12-week progress bar
  const weekBars = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    const wT = plan.tasks.filter((t) => t.weekNumber === w && t.status !== "skipped");
    const wD = plan.tasks.filter((t) => t.weekNumber === w && t.status === "done");
    return { pct: wT.length > 0 ? Math.round((wD.length / wT.length) * 100) : 0, isCurrent: w === currentWeek, hasData: wT.length > 0 };
  });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: "1px solid #C7D2FE", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#EEF2FF", borderBottom: "1px solid #C7D2FE" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#4F46E520" }}>
          <Crosshair size={14} style={{ color: "#4F46E5" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black truncate" style={{ color: "#4F46E5" }}>{plan.title}</p>
          <p className="text-[10px]" style={{ color: "#6366F1" }}>Tuần {currentWeek}/12 • {overallPct}% hoàn thành</p>
        </div>
        <Link href="/crm/twelve-week-plan"
          className="text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
          style={{ background: "#4F46E5", color: "#fff" }}>
          Xem <ChevronRight size={10} />
        </Link>
      </div>

      <div className="p-4 space-y-3">
        {/* Overall progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold" style={{ color: T.textMuted }}>Tiến độ tổng thể</span>
            <span className="text-[10px] font-black" style={{ color: "#4F46E5" }}>{doneTasks}/{totalTasks} việc</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#EEF2FF" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${overallPct}%`, background: "linear-gradient(90deg, #4F46E5, #818CF8)" }} />
          </div>
        </div>

        {/* Current week */}
        <div className="rounded-xl p-3" style={{ background: "#EEF2FF" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold" style={{ color: "#4F46E5" }}>★ Tuần {currentWeek} (Hiện tại)</span>
            <span className="text-[10px] font-black" style={{ color: thisWeekPct === 100 ? "#059669" : "#4F46E5" }}>{thisWeekPct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.5)" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${thisWeekPct}%`, background: thisWeekPct === 100 ? "#059669" : "#4F46E5" }} />
          </div>
          <p className="text-[9px] mt-1" style={{ color: "#6366F1" }}>{thisWeekDone}/{thisWeekTasks.length} công việc tuần này</p>
        </div>

        {/* 12-week mini bars */}
        <div>
          <p className="text-[10px] font-semibold mb-1.5" style={{ color: T.textMuted }}>12 tuần</p>
          <div className="flex items-end gap-0.5 h-8">
            {weekBars.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full rounded-t overflow-hidden" style={{ height: 20, background: bar.isCurrent ? "#C7D2FE" : "#EEF2FF" }}>
                  <div className="w-full rounded-t transition-all"
                    style={{ height: `${bar.pct}%`, background: bar.pct === 100 ? "#059669" : bar.isCurrent ? "#4F46E5" : "#818CF8" }} />
                </div>
                {bar.isCurrent && <div className="w-1 h-1 rounded-full" style={{ background: "#D97706" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Goals */}
        {plan.goals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold" style={{ color: T.textMuted }}>Mục tiêu</p>
            {plan.goals.slice(0, 3).map((goal) => {
              const gColor = GOAL_COLORS_MAP[goal.color] ?? "#4F46E5";
              const gTasks = plan.tasks.filter((t) => t.goalId === goal.id && t.status !== "skipped");
              const gDone = plan.tasks.filter((t) => t.goalId === goal.id && t.status === "done");
              const gPct = gTasks.length > 0 ? Math.round((gDone.length / gTasks.length) * 100) : 0;
              return (
                <div key={goal.id}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gColor }} />
                    <span className="text-[10px] font-medium flex-1 truncate" style={{ color: T.textPrimary }}>{goal.title}</span>
                    <span className="text-[10px] font-black" style={{ color: gColor }}>{gPct}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden ml-3" style={{ background: `${gColor}20` }}>
                    <div className="h-full rounded-full" style={{ width: `${gPct}%`, background: gColor }} />
                  </div>
                </div>
              );
            })}
            {plan.goals.length > 3 && (
              <p className="text-[9px] text-center" style={{ color: T.textMuted }}>+{plan.goals.length - 3} mục tiêu khác</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared 12-Week Plan Widget (Kế hoạch chung của team) ─────────────────────
function SharedPlanWidget({
  plan, loading, taskUpdating, onToggleTask, isAdmin,
}: {
  plan: { id: string; title: string; startDate: string; endDate: string; isActive: boolean;
    goals: Array<{ id: string; title: string; color: string; description?: string }>;
    tasks: Array<{ id: string; goalId: string; weekNumber: number; status: string; title: string; priority?: string; dueDate?: string }>;
  } | null;
  loading: boolean;
  taskUpdating: string | null;
  onToggleTask: (taskId: string, currentStatus: string) => void;
  isAdmin: boolean;
}) {
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const GOAL_COLORS_MAP: Record<string, string> = {
    indigo: "#4F46E5", green: "#059669", gold: "#D97706",
    red: "#DC2626", purple: "#7C3AED", blue: "#2563EB",
  };

  function getCurrentWeek(startDate: string) {
    const diff = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(12, Math.max(1, Math.ceil((diff + 1) / 7)));
  }

  if (loading) return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
      <div className="h-4 rounded w-2/3 mb-3" style={{ background: `${T.textMuted}20` }} />
      <div className="h-2 rounded w-full mb-2" style={{ background: `${T.textMuted}10` }} />
      <div className="h-2 rounded w-3/4" style={{ background: `${T.textMuted}10` }} />
    </div>
  );

  if (!plan) return null;

  const currentWeek = getCurrentWeek(plan.startDate);
  const totalTasks = plan.tasks.filter(t => t.status !== "skipped").length;
  const doneTasks = plan.tasks.filter(t => t.status === "done").length;
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const thisWeekTasks = plan.tasks.filter(t => t.weekNumber === currentWeek && t.status !== "skipped");
  const thisWeekDone = thisWeekTasks.filter(t => t.status === "done").length;
  const thisWeekPct = thisWeekTasks.length > 0 ? Math.round((thisWeekDone / thisWeekTasks.length) * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: "1px solid #D1FAE5", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#ECFDF5", borderBottom: "1px solid #D1FAE5" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#05966920" }}>
          <Target size={14} style={{ color: "#059669" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-black truncate" style={{ color: "#059669" }}>Kế hoạch chung</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#059669", color: "#fff" }}>TEAM</span>
          </div>
          <p className="text-[10px] truncate" style={{ color: "#065F46" }}>Tuần {currentWeek}/12 • {overallPct}% hoàn thành</p>
        </div>
        <Link href="/crm/twelve-week-plan"
          className="text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
          style={{ background: "#059669", color: "#fff" }}>
          Xem <ChevronRight size={10} />
        </Link>
      </div>

      <div className="p-4 space-y-3">
        {/* Overall progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold" style={{ color: T.textMuted }}>Tiến độ tổng thể</span>
            <span className="text-[10px] font-black" style={{ color: "#059669" }}>{doneTasks}/{totalTasks} việc</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#ECFDF5" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${overallPct}%`, background: "linear-gradient(90deg, #059669, #34D399)" }} />
          </div>
        </div>

        {/* Current week tasks */}
        <div className="rounded-xl p-3" style={{ background: "#ECFDF5" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold" style={{ color: "#059669" }}>★ Tuần {currentWeek} (Hiện tại)</span>
            <span className="text-[10px] font-black" style={{ color: thisWeekPct === 100 ? "#059669" : "#065F46" }}>{thisWeekPct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.5)" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${thisWeekPct}%`, background: thisWeekPct === 100 ? "#059669" : "#34D399" }} />
          </div>
          <p className="text-[9px] mt-1" style={{ color: "#065F46" }}>{thisWeekDone}/{thisWeekTasks.length} công việc tuần này</p>
        </div>

        {/* Goals with tasks */}
        {plan.goals.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold" style={{ color: T.textMuted }}>Mục tiêu & Công việc tuần này</p>
            {plan.goals.map(goal => {
              const gColor = GOAL_COLORS_MAP[goal.color] ?? "#059669";
              const gWeekTasks = plan.tasks.filter(t => t.goalId === goal.id && t.weekNumber === currentWeek && t.status !== "skipped");
              const gDone = gWeekTasks.filter(t => t.status === "done").length;
              const gPct = gWeekTasks.length > 0 ? Math.round((gDone / gWeekTasks.length) * 100) : 0;
              const isExpanded = expandedGoal === goal.id;
              if (gWeekTasks.length === 0) return null;
              return (
                <div key={goal.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${gColor}20`, background: `${gColor}05` }}>
                  {/* Goal header */}
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-left"
                    style={{ background: `${gColor}10` }}
                    onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: gColor }} />
                    <span className="text-[10px] font-bold flex-1 truncate" style={{ color: gColor }}>{goal.title}</span>
                    <span className="text-[9px] font-black" style={{ color: gColor }}>{gDone}/{gWeekTasks.length}</span>
                    {isExpanded ? <ChevronUp size={10} style={{ color: gColor }} /> : <ChevronDown size={10} style={{ color: gColor }} />}
                  </button>
                  {/* Progress bar */}
                  <div className="h-1 mx-3" style={{ background: `${gColor}15` }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${gPct}%`, background: gColor }} />
                  </div>
                  {/* Tasks list (expanded) */}
                  {isExpanded && (
                    <div className="px-3 py-2 space-y-1.5">
                      {gWeekTasks.map(task => {
                        const isDone = task.status === "done";
                        const isUpdating = taskUpdating === task.id;
                        return (
                          <div key={task.id} className="flex items-start gap-2">
                            <button
                              onClick={() => onToggleTask(task.id, task.status)}
                              disabled={isUpdating}
                              className="flex-shrink-0 mt-0.5 rounded-md transition-all flex items-center justify-center"
                              style={{ width: 16, height: 16, border: `2px solid ${isDone ? gColor : T.cardBorder}`, background: isDone ? gColor : "transparent", opacity: isUpdating ? 0.5 : 1 }}
                            >
                              {isDone && (
                                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                  <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                            <span className="text-[10px] leading-tight flex-1" style={{ color: isDone ? T.textMuted : T.textPrimary, textDecoration: isDone ? "line-through" : "none" }}>
                              {task.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Admin note */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "#ECFDF5", border: "1px solid #D1FAE5" }}>
            <Info size={10} style={{ color: "#059669" }} />
            <span className="text-[9px]" style={{ color: "#065F46" }}>Nhân viên thấy kế hoạch này trên dashboard của họ</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 12-Week KPI Row ──────────────────────────────────────────────────────────
function TwelveWeekKpiRow({ leads, activeLeads, overdueLeads, wonLeads, totalValue, wonValue, stats, theme, fmtVal, darkMode, dm, plan, loadingPlan }: {
  leads: Lead[]; activeLeads: Lead[]; overdueLeads: Lead[]; wonLeads: Lead[];
  totalValue: number; wonValue: number; stats: CrmStats;
  theme: DashboardTheme; fmtVal: (v: number) => string; darkMode: boolean;
  dm: { card: string; cardBorder: string; textPrimary: string; textMuted: string };
  plan: { id: string; startDate: string; endDate: string; tasks: Array<{ weekNumber: number; status: string; goalId: string }>; goals: Array<{ id: string; title: string; color: string }> } | null;
  loadingPlan: boolean;
}) {

  function getCurrentWeek(startDate: string) {
    const diff = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(12, Math.max(1, Math.ceil((diff + 1) / 7)));
  }

  const currentWeek = plan ? getCurrentWeek(plan.startDate) : 0;
  const totalTasks = plan ? plan.tasks.filter(t => t.status !== "skipped").length : 0;
  const doneTasks = plan ? plan.tasks.filter(t => t.status === "done").length : 0;
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const thisWeekTasks = plan ? plan.tasks.filter(t => t.weekNumber === currentWeek && t.status !== "skipped") : [];
  const thisWeekDone = thisWeekTasks.filter(t => t.status === "done").length;
  const thisWeekPct = thisWeekTasks.length > 0 ? Math.round((thisWeekDone / thisWeekTasks.length) * 100) : 0;

  const kpis = [
    {
      icon: Crosshair,
      label: "Tiến độ 12 tuần",
      value: plan ? `${overallPct}%` : "—",
      sub: plan ? `${doneTasks}/${totalTasks} việc hoàn thành` : "Chưa có kế hoạch",
      color: "#4F46E5",
      colorBg: "#EEF2FF",
      badge: plan ? `Tuần ${currentWeek}/12` : undefined,
      badgeColor: "#4F46E5",
      href: "/crm/twelve-week-plan",
    },
    {
      icon: Target,
      label: "Tuần hiện tại",
      value: plan ? `${thisWeekPct}%` : "—",
      sub: plan ? `${thisWeekDone}/${thisWeekTasks.length} việc tuần ${currentWeek}` : "Chưa có kế hoạch",
      color: thisWeekPct >= 100 ? T.green : thisWeekPct >= 60 ? T.gold : T.red,
      colorBg: thisWeekPct >= 100 ? T.greenBg : thisWeekPct >= 60 ? T.goldBg : T.redBg,
      badge: thisWeekPct >= 100 ? "Hoàn thành!" : `${thisWeekTasks.length - thisWeekDone} việc còn lại`,
      badgeColor: thisWeekPct >= 100 ? T.green : T.gold,
      href: "/crm/twelve-week-plan",
    },
    {
      icon: Users,
      label: "Khách hàng",
      value: leads.length,
      sub: `${activeLeads.length} đang theo dõi`,
      color: theme.kpiCustomerColor,
      colorBg: theme.kpiCustomerColor + "18",
      badge: `${wonLeads.length} đã chốt`,
      badgeColor: T.green,
      href: "/crm/leads",
    },
    {
      icon: AlertCircle,
      label: "Cần liên hệ",
      value: overdueLeads.length,
      sub: "Quá 3 ngày không tương tác",
      color: overdueLeads.length > 0 ? theme.kpiOverdueColor : T.green,
      colorBg: overdueLeads.length > 0 ? theme.kpiOverdueColor + "18" : T.greenBg,
      badge: overdueLeads.length > 0 ? "Cần xử lý" : "Tốt",
      badgeColor: overdueLeads.length > 0 ? theme.kpiOverdueColor : T.green,
      href: "/crm/leads?filter=overdue",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {kpis.map(({ icon: Icon, label, value, sub, color, colorBg, badge, badgeColor, href }) => (
        <Link key={label} href={href}
          className="rounded-2xl p-3.5 md:p-5 relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 block"
          style={{ background: dm.card, border: `1px solid ${dm.cardBorder}`, boxShadow: T.cardShadow }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -translate-y-4 translate-x-4"
            style={{ background: color }} />
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: colorBg }}>
              <Icon size={18} style={{ color }} />
            </div>
            {badge && (
              <span className="text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${badgeColor}15`, color: badgeColor }}>{badge}</span>
            )}
          </div>
          <div className="text-xl md:text-2xl font-black" style={{ color }}>{value}</div>
          <div className="text-[10px] md:text-xs font-semibold mt-0.5" style={{ color: dm.textPrimary }}>{label}</div>
          <div className="text-[9px] md:text-[10px] mt-0.5" style={{ color: dm.textMuted }}>{sub}</div>
        </Link>
      ))}
    </div>
  );
}

// ── 12-Week Progress Board ────────────────────────────────────────────────────
function TwelveWeekProgressBoard({ dm, fmtVal, leads, wonLeads, stats, plan, loadingPlan }: {
  dm: { card: string; cardBorder: string; textPrimary: string; textMuted: string };
  fmtVal: (v: number) => string;
  leads: Lead[]; wonLeads: Lead[]; stats: CrmStats;
  plan: { id: string; title: string; startDate: string; endDate: string; goals: Array<{ id: string; title: string; color: string; kpis?: Array<{ label: string; unit: string; targetTotal: number; weeklyTarget: number; currentValue?: number; format: string }> }>; tasks: Array<{ id: string; goalId: string; weekNumber: number; status: string; title: string }> } | null;
  loadingPlan: boolean;
}) {
  const GOAL_COLORS_MAP: Record<string, string> = {
    indigo: "#4F46E5", green: "#059669", gold: "#D97706",
    red: "#DC2626", purple: "#7C3AED", blue: "#2563EB",
  };

  function getCurrentWeek(startDate: string) {
    const diff = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(12, Math.max(1, Math.ceil((diff + 1) / 7)));
  }

  if (loadingPlan) return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: dm.card, border: `1px solid ${dm.cardBorder}` }}>
      <div className="h-4 rounded w-1/3 mb-3" style={{ background: `${T.textMuted}20` }} />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl" style={{ background: `${T.textMuted}10` }} />)}
      </div>
    </div>
  );

  if (!plan) return (
    <div className="rounded-2xl p-5 flex items-center justify-between"
      style={{ background: dm.card, border: `1px solid ${dm.cardBorder}`, boxShadow: T.cardShadow }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
          <Crosshair size={18} style={{ color: "#4F46E5" }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: dm.textPrimary }}>Kế hoạch 12 Tuần</p>
          <p className="text-xs" style={{ color: dm.textMuted }}>Chưa có kế hoạch nào. Bắt đầu ngay!</p>
        </div>
      </div>
      <Link href="/crm/twelve-week-plan"
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
        style={{ background: "#4F46E5" }}>
        <Plus size={14} /> Tạo kế hoạch
      </Link>
    </div>
  );

  const currentWeek = getCurrentWeek(plan.startDate);
  const totalTasks = plan.tasks.filter(t => t.status !== "skipped").length;
  const doneTasks = plan.tasks.filter(t => t.status === "done").length;
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const thisWeekTasks = plan.tasks.filter(t => t.weekNumber === currentWeek && t.status !== "skipped");
  const thisWeekDone = thisWeekTasks.filter(t => t.status === "done").length;
  const thisWeekPct = thisWeekTasks.length > 0 ? Math.round((thisWeekDone / thisWeekTasks.length) * 100) : 0;
  const barColor = overallPct >= 80 ? T.green : overallPct >= 50 ? T.gold : "#4F46E5";

  // Helper format KPI value
  function fmtKpi(v: number, format: string): string {
    if (format === "currency") {
      if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
      if (v >= 1_000_000) return `${Math.round(v / 1_000_000)}tr`;
      return `${Math.round(v / 1000)}K`;
    }
    if (format === "percent") return `${v}%`;
    return String(Math.round(v));
  }

  // Tính mục tiêu lũy kế đến tuần hiện tại
  function cumulativeTarget(weeklyTarget: number, week: number): number {
    return Math.round(weeklyTarget * week);
  }

  // Lấy KPI chính của từng mục tiêu (KPI đầu tiên)
  const goalKpiCards = plan.goals.map(goal => {
    const gColor = GOAL_COLORS_MAP[goal.color] ?? "#4F46E5";
    const gTasks = plan.tasks.filter(t => t.goalId === goal.id && t.status !== "skipped");
    const gDone = plan.tasks.filter(t => t.goalId === goal.id && t.status === "done");
    const gPct = gTasks.length > 0 ? Math.round((gDone.length / gTasks.length) * 100) : 0;
    const kpi = goal.kpis?.[0];
    const weekTarget = kpi ? Math.round(kpi.weeklyTarget) : null;
    const cumTarget = kpi ? cumulativeTarget(kpi.weeklyTarget, currentWeek) : null;
    const current = kpi?.currentValue ?? null;
    const kpiPct = (cumTarget && current !== null && cumTarget > 0) ? Math.min(150, Math.round((current / cumTarget) * 100)) : null;
    return { goal, gColor, gPct, kpi, weekTarget, cumTarget, current, kpiPct };
  });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: dm.card, border: `1px solid ${dm.cardBorder}`, boxShadow: T.cardShadow }}>
      {/* Header */}
      <div className="px-4 md:px-5 py-3 md:py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${dm.cardBorder}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
            <Crosshair size={15} style={{ color: "#4F46E5" }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: dm.textPrimary }}>Mục tiêu tuần {currentWeek}</p>
            <p className="text-[10px]" style={{ color: dm.textMuted }}>{plan.title} • Còn {12 - currentWeek} tuần</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-black" style={{ color: barColor }}>{overallPct}%</div>
            <div className="text-[9px]" style={{ color: dm.textMuted }}>tổng tiến độ</div>
          </div>
          <Link href="/crm/twelve-week-plan"
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
            style={{ background: "#EEF2FF", color: "#4F46E5" }}>
            Chi tiết <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* KPI cards per goal - mục tiêu tuần hiện tại */}
      <div className="p-4 md:p-5 space-y-3">
        {goalKpiCards.map(({ goal, gColor, gPct, kpi, weekTarget, cumTarget, current, kpiPct }) => (
          <div key={goal.id} className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${gColor}25`, background: `${gColor}06` }}>
            {/* Goal header */}
            <div className="px-3.5 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${gColor}15` }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: gColor }} />
                <span className="text-xs font-bold truncate max-w-[180px]" style={{ color: dm.textPrimary }}>{goal.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold" style={{ color: dm.textMuted }}>{thisWeekDone}/{thisWeekTasks.length} việc tuần này</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: `${gColor}15`, color: gColor }}>{gPct}%</span>
              </div>
            </div>

            {/* KPI row */}
            {kpi ? (
              <div className="px-3.5 py-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: dm.textMuted }}>{kpi.label}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black" style={{ color: gColor }}>
                        {current !== null ? fmtKpi(current, kpi.format) : "—"}
                      </span>
                      <span className="text-xs" style={{ color: dm.textMuted }}>/ {fmtKpi(kpi.targetTotal, kpi.format)} mục tiêu</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold" style={{ color: dm.textMuted }}>Tuần {currentWeek} cần</div>
                    <div className="text-base font-black" style={{ color: dm.textPrimary }}>{fmtKpi(kpi.weeklyTarget, kpi.format)}</div>
                    <div className="text-[9px]" style={{ color: dm.textMuted }}>/{kpi.unit}/tuần</div>
                  </div>
                </div>

                {/* Progress vs cumulative target */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px]" style={{ color: dm.textMuted }}>Lũy kế đến tuần {currentWeek}: {fmtKpi(cumTarget ?? 0, kpi.format)}</span>
                    {kpiPct !== null && (
                      <span className="text-[9px] font-black" style={{ color: kpiPct >= 100 ? T.green : kpiPct >= 80 ? T.gold : T.red }}>
                        {kpiPct >= 100 ? "✓ Đúng hướng" : kpiPct >= 80 ? `Gần đạt (${kpiPct}%)` : `Cần tăng tốc (${kpiPct}%)`}
                      </span>
                    )}
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: `${gColor}15` }}>
                    <div className="h-full rounded-full transition-all duration-700 relative"
                      style={{ width: `${Math.min(100, kpiPct ?? gPct)}%`, background: `linear-gradient(90deg, ${gColor}CC, ${gColor})` }}>
                    </div>
                  </div>
                  {/* Target marker */}
                  {cumTarget && kpi.targetTotal > 0 && (
                    <div className="flex items-center justify-between text-[8px]" style={{ color: dm.textMuted }}>
                      <span>0</span>
                      <span style={{ color: gColor }}>▲ Mục tiêu lũy kế: {fmtKpi(cumTarget, kpi.format)}</span>
                      <span>{fmtKpi(kpi.targetTotal, kpi.format)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-3.5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: dm.textMuted }}>Tiến độ công việc</span>
                  <span className="text-sm font-black" style={{ color: gColor }}>{gPct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: `${gColor}15` }}>
                  <div className="h-full rounded-full" style={{ width: `${gPct}%`, background: gColor }} />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Overall progress bar */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold" style={{ color: dm.textMuted }}>Tiến độ tổng thể ({doneTasks}/{totalTasks} việc)</span>
            <span className="text-[10px] font-black" style={{ color: barColor }}>{overallPct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#EEF2FF" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${overallPct}%`, background: `linear-gradient(90deg, #4F46E5, ${barColor})` }} />
          </div>
          <div className="flex justify-between mt-1">
            {Array.from({ length: 12 }, (_, i) => {
              const w = i + 1;
              const wT = plan.tasks.filter(t => t.weekNumber === w && t.status !== "skipped").length;
              const wD = plan.tasks.filter(t => t.weekNumber === w && t.status === "done").length;
              const pct = wT > 0 ? Math.round((wD / wT) * 100) : 0;
              return (
                <div key={w} className="flex flex-col items-center gap-0.5" style={{ width: `${100/12}%` }}>
                  <div className="w-full rounded-sm" style={{ height: 3, background: w === currentWeek ? "#4F46E5" : pct === 100 ? T.green : pct > 0 ? "#818CF8" : "#E0E7FF" }} />
                  <span className="text-[6px]" style={{ color: w === currentWeek ? "#4F46E5" : dm.textMuted }}>{w}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 12-Week Goals Board (replaces Revenue Chart) ──────────────────────────────
function TwelveWeekGoalsBoard({ dm, fmtVal, leads, wonLeads, stats, plan, loadingPlan }: {
  dm: { card: string; cardBorder: string; textPrimary: string; textMuted: string };
  fmtVal: (v: number) => string;
  leads: Lead[]; wonLeads: Lead[]; stats: CrmStats;
  plan: { id: string; title: string; startDate: string; endDate: string; goals: Array<{ id: string; title: string; color: string; description?: string; kpis?: Array<{ label: string; unit: string; targetTotal: number; weeklyTarget: number; weeklyAllocations?: Array<{ weekNumber: number; target: number }>; currentValue?: number; format: string }> }>; tasks: Array<{ id: string; goalId: string; weekNumber: number; status: string; title: string; scheduledDate?: string }> } | null;
  loadingPlan: boolean;
}) {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  useEffect(() => {
    if (plan?.goals?.length && !selectedGoal) {
      setSelectedGoal(plan.goals[0].id);
    }
  }, [plan, selectedGoal]);

  const GOAL_COLORS_MAP: Record<string, string> = {
    indigo: "#4F46E5", green: "#059669", gold: "#D97706",
    red: "#DC2626", purple: "#7C3AED", blue: "#2563EB",
  };

  function getCurrentWeek(startDate: string) {
    const diff = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(12, Math.max(1, Math.ceil((diff + 1) / 7)));
  }

  function getWeeklyKpiTarget(kpi: { weeklyTarget: number; weeklyAllocations?: Array<{ weekNumber: number; target: number }> }, weekNumber: number): number {
    const alloc = kpi.weeklyAllocations?.find(a => a.weekNumber === weekNumber);
    if (alloc) return alloc.target;
    return Math.round(kpi.weeklyTarget);
  }

  if (loadingPlan) return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: dm.card, border: `1px solid ${dm.cardBorder}` }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${dm.cardBorder}` }}>
        <div className="w-9 h-9 rounded-xl" style={{ background: `${T.textMuted}15` }} />
        <div className="flex-1">
          <div className="h-3.5 rounded w-1/3 mb-1.5" style={{ background: `${T.textMuted}20` }} />
          <div className="h-2.5 rounded w-1/4" style={{ background: `${T.textMuted}10` }} />
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-8 rounded-xl flex-1" style={{ background: `${T.textMuted}10` }} />)}
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({length:12}).map((_,i) => <div key={i} className="h-14 rounded-lg" style={{ background: `${T.textMuted}08` }} />)}
        </div>
      </div>
    </div>
  );

  if (!plan) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: dm.card, border: `1px solid ${dm.cardBorder}`, boxShadow: T.cardShadow }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#EEF2FF" }}>
        <Crosshair size={24} style={{ color: "#4F46E5" }} />
      </div>
      <h3 className="text-base font-bold mb-2" style={{ color: dm.textPrimary }}>Chưa có kế hoạch 12 tuần</h3>
      <p className="text-sm mb-4" style={{ color: dm.textMuted }}>Tạo kế hoạch để theo dõi tiến độ mục tiêu và công việc hàng tuần</p>
      <Link href="/crm/twelve-week-plan"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: "#4F46E5" }}>
        <Plus size={16} /> Tạo kế hoạch ngay
      </Link>
    </div>
  );

  const currentWeek = getCurrentWeek(plan.startDate);
  const activeGoal = plan.goals.find(g => g.id === selectedGoal) ?? plan.goals[0];
  const activeGoalColor = activeGoal ? (GOAL_COLORS_MAP[activeGoal.color] ?? "#4F46E5") : "#4F46E5";

  function fmtKpi(v: number, format: string): string {
    if (format === "currency") {
      if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
      if (v >= 1_000_000) return `${Math.round(v / 1_000_000)}tr`;
      return `${Math.round(v / 1000)}K`;
    }
    if (format === "percent") return `${v}%`;
    return String(Math.round(v));
  }

  // Build 12-week grid for selected goal
  const weekData = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    const wTasks = plan.tasks.filter(t => t.goalId === (activeGoal?.id ?? "") && t.weekNumber === w);
    const done = wTasks.filter(t => t.status === "done").length;
    const total = wTasks.filter(t => t.status !== "skipped").length;
    const kpi = activeGoal?.kpis?.[0];
    const kpiTarget = kpi ? getWeeklyKpiTarget(kpi, w) : null;
    return { week: w, tasks: wTasks, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0, isCurrent: w === currentWeek, isPast: w < currentWeek, kpiTarget, kpi };
  });

  // Tasks for current week of selected goal
  const currentWeekTasks = plan.tasks.filter(t => t.goalId === (activeGoal?.id ?? "") && t.weekNumber === currentWeek);
  const activeKpi = activeGoal?.kpis?.[0];
  const currentWeekKpiTarget = activeKpi ? getWeeklyKpiTarget(activeKpi, currentWeek) : null;
  const cumKpiTarget = activeKpi ? Array.from({ length: currentWeek }, (_, i) => getWeeklyKpiTarget(activeKpi, i + 1)).reduce((a, b) => a + b, 0) : null;
  const kpiProgress = (cumKpiTarget && activeKpi && cumKpiTarget > 0) ? Math.min(150, Math.round(((activeKpi.currentValue ?? 0) / cumKpiTarget) * 100)) : null;

  // Overall stats for active goal
  const activeDone = plan.tasks.filter(t => t.goalId === (activeGoal?.id ?? "") && t.status === "done").length;
  const activeTotal = plan.tasks.filter(t => t.goalId === (activeGoal?.id ?? "") && t.status !== "skipped").length;
  const activePct = activeTotal > 0 ? Math.round((activeDone / activeTotal) * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: dm.card, border: `1px solid ${dm.cardBorder}`, boxShadow: T.cardShadow }}>
      {/* Header */}
      <div className="px-4 md:px-5 py-3 md:py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${dm.cardBorder}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
            <Target size={16} style={{ color: "#4F46E5" }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: dm.textPrimary }}>Mục tiêu tuần {currentWeek}</p>
            <p className="text-[10px]" style={{ color: dm.textMuted }}>Tuần {currentWeek}/12 • {plan.title}</p>
          </div>
        </div>
        <Link href="/crm/twelve-week-plan"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "#EEF2FF", color: "#4F46E5" }}>
          Xem đầy đủ <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="p-4 md:p-5">
        {/* Goal tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {plan.goals.map(goal => {
            const gColor = GOAL_COLORS_MAP[goal.color] ?? "#4F46E5";
            const gTasks = plan.tasks.filter(t => t.goalId === goal.id && t.status !== "skipped");
            const gDone = plan.tasks.filter(t => t.goalId === goal.id && t.status === "done");
            const gPct = gTasks.length > 0 ? Math.round((gDone.length / gTasks.length) * 100) : 0;
            const isActive = selectedGoal === goal.id;
            return (
              <button key={goal.id} onClick={() => setSelectedGoal(goal.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: isActive ? `${gColor}15` : dm.cardBorder + "40",
                  border: `1.5px solid ${isActive ? gColor : "transparent"}`,
                  color: isActive ? gColor : dm.textMuted,
                }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: gColor }} />
                <span className="max-w-[100px] truncate">{goal.title}</span>
                <span className="font-black">{gPct}%</span>
              </button>
            );
          })}
        </div>

        {/* ── Current week focus ── */}
        {activeGoal && (
          <div className="rounded-xl overflow-hidden mb-4" style={{ border: `1.5px solid ${activeGoalColor}25` }}>
            {/* Week header */}
            <div className="px-3.5 py-2.5 flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, ${activeGoalColor}10, ${activeGoalColor}05)`, borderBottom: `1px solid ${activeGoalColor}15` }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{ background: activeGoalColor }}>
                  Tuần {currentWeek} ★
                </span>
                <span className="text-[10px] font-semibold" style={{ color: dm.textMuted }}>Hiện tại</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: dm.textMuted }}>
                  {currentWeekTasks.filter(t => t.status === "done").length}/{currentWeekTasks.filter(t => t.status !== "skipped").length} việc
                </span>
                <span className="text-xs font-black" style={{ color: activePct >= 80 ? T.green : activePct >= 50 ? T.gold : T.red }}>{activePct}%</span>
              </div>
            </div>

            {/* KPI for current week */}
            {activeKpi && currentWeekKpiTarget !== null && (
              <div className="px-3.5 py-2.5" style={{ borderBottom: `1px solid ${activeGoalColor}10` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <BarChart2 size={11} style={{ color: activeGoalColor }} />
                    <span className="text-[10px] font-bold" style={{ color: dm.textPrimary }}>{activeKpi.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black" style={{ color: activeGoalColor }}>
                      {fmtKpi(activeKpi.currentValue ?? 0, activeKpi.format)}
                    </span>
                    <span className="text-[9px]" style={{ color: dm.textMuted }}>/ {fmtKpi(activeKpi.targetTotal, activeKpi.format)}</span>
                    {kpiProgress !== null && (
                      <span className="text-[9px] font-black" style={{ color: kpiProgress >= 100 ? T.green : kpiProgress >= 80 ? T.gold : T.red }}>
                        {kpiProgress}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${activeGoalColor}12` }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, kpiProgress ?? 0)}%`, background: kpiProgress && kpiProgress >= 100 ? T.green : activeGoalColor }} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-[9px]" style={{ color: dm.textMuted }}>Tuần này cần</div>
                    <div className="text-sm font-black" style={{ color: dm.textPrimary }}>{fmtKpi(currentWeekKpiTarget, activeKpi.format)}</div>
                    <div className="text-[8px]" style={{ color: dm.textMuted }}>{activeKpi.unit}</div>
                  </div>
                  {cumKpiTarget !== null && (
                    <div className="flex-shrink-0 text-right">
                      <div className="text-[9px]" style={{ color: dm.textMuted }}>Lũy kế cần</div>
                      <div className="text-xs font-bold" style={{ color: dm.textPrimary }}>{fmtKpi(cumKpiTarget, activeKpi.format)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current week tasks */}
            <div className="px-3.5 py-2.5">
              {currentWeekTasks.length === 0 ? (
                <p className="text-[10px] text-center py-2" style={{ color: dm.textMuted }}>Chưa có công việc nào tuần này</p>
              ) : (
                <div className="space-y-1.5">
                  {currentWeekTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center gap-2.5 p-2 rounded-lg"
                      style={{ background: task.status === "done" ? `${T.green}08` : `${activeGoalColor}06`, border: `1px solid ${task.status === "done" ? T.green + "25" : activeGoalColor + "15"}` }}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: task.status === "done" ? T.green : `${activeGoalColor}15`, border: `1.5px solid ${task.status === "done" ? T.green : activeGoalColor}` }}>
                        {task.status === "done" && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-xs flex-1 truncate"
                        style={{ color: task.status === "done" ? dm.textMuted : dm.textPrimary, textDecoration: task.status === "done" ? "line-through" : "none" }}>
                        {task.title}
                      </span>
                      {task.status === "skipped" && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: `${dm.textMuted}15`, color: dm.textMuted }}>bỏ qua</span>
                      )}
                    </div>
                  ))}
                  {currentWeekTasks.length > 5 && (
                    <Link href="/crm/twelve-week-plan" className="block text-center text-[10px] font-semibold py-1.5 rounded-lg"
                      style={{ background: `${activeGoalColor}10`, color: activeGoalColor }}>
                      +{currentWeekTasks.length - 5} việc nữa →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 12-week grid overview ── */}
        {activeGoal && (
          <div>
            <p className="text-[10px] font-semibold mb-2" style={{ color: dm.textMuted }}>TẤT CẢ 12 TUẦN</p>
            <div className="grid grid-cols-6 gap-1">
              {weekData.map(({ week, done, total, pct, isCurrent, isPast, kpiTarget, kpi: wKpi }) => {
                const bg = isCurrent ? `${activeGoalColor}15` : pct === 100 ? `${T.green}10` : isPast && total > 0 ? `${T.red}06` : `${dm.textMuted}06`;
                const border = isCurrent ? activeGoalColor : pct === 100 ? T.green + "40" : isPast && pct < 100 && total > 0 ? T.red + "30" : "transparent";
                return (
                  <div key={week} className="rounded-lg p-1.5 transition-all"
                    style={{ background: bg, border: `1.5px solid ${border}` }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] font-bold" style={{ color: isCurrent ? activeGoalColor : dm.textMuted }}>T{week}</span>
                      {isCurrent && <div className="w-1 h-1 rounded-full" style={{ background: activeGoalColor }} />}
                      {isPast && pct === 100 && <span className="text-[7px]" style={{ color: T.green }}>✓</span>}
                      {isPast && pct < 100 && total > 0 && <span className="text-[7px]" style={{ color: T.red }}>!</span>}
                    </div>
                    {kpiTarget !== null && wKpi ? (
                      <div className="text-[9px] font-black" style={{ color: isCurrent ? activeGoalColor : dm.textPrimary }}>
                        {fmtKpi(kpiTarget, wKpi.format)}
                      </div>
                    ) : null}
                    {total > 0 ? (
                      <>
                        <div className="text-[7px]" style={{ color: dm.textMuted }}>{done}/{total}</div>
                        <div className="h-0.5 rounded-full mt-0.5 overflow-hidden" style={{ background: `${activeGoalColor}15` }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? T.green : activeGoalColor }} />
                        </div>
                      </>
                    ) : (
                      <div className="text-[7px]" style={{ color: `${dm.textMuted}50` }}>—</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sparkline mini chart ───────────────────────────────────────────
function Sparkline({ data, color, height = 28 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 56, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={pts.split(" ").pop()?.split(",")[0]} cy={pts.split(" ").pop()?.split(",")[1]} r="2.5" fill={color} />
    </svg>
  );
}

// ── Period selector ──────────────────────────────────────────────────────────
type Period = "month" | "quarter" | "year";
const PERIOD_LABELS: Record<Period, string> = {
  month: "Tháng này", quarter: "Quý này", year: "Năm nay",
};

// ── Notification bell ────────────────────────────────────────────────────────
interface InboxItem {
  id: string; type: "warning" | "info" | "alert";
  title: string; body: string; href: string; time: string; read: boolean;
}

function NotificationBell({ currentUser }: { currentUser?: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/crm/dashboard-extras?type=inbox");
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = items.filter(i => !i.read).length;
  const iconMap = { warning: AlertTriangle, info: Info, alert: Flame };
  const colorMap = { warning: T.gold, info: T.blue, alert: T.red };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
        style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}
      >
        <Bell size={16} style={{ color: T.textSecondary }} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
            style={{ background: T.red }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-2xl overflow-hidden z-50"
          style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: "0 8px 32px rgba(16,24,40,0.12)" }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${T.divider}` }}>
            <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Thông báo</span>
            {loading && <RefreshCw size={12} className="animate-spin" style={{ color: T.textMuted }} />}
          </div>
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={24} className="mx-auto mb-2 opacity-30" style={{ color: T.green }} />
              <p className="text-xs" style={{ color: T.textMuted }}>Không có thông báo mới</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: T.divider }}>
              {items.map(item => {
                const Icon = iconMap[item.type];
                const color = colorMap[item.type];
                return (
                  <Link key={item.id} href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:opacity-90 transition-opacity">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${color}15` }}>
                      <Icon size={13} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: T.textPrimary }}>{item.title}</p>
                      <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: T.textMuted }}>{item.body}</p>
                    </div>
                    {!item.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: T.blue }} />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Collapsible section ──────────────────────────────────────────────────────
function Section({ title, icon: Icon, iconColor, iconBg, children, defaultOpen = true, badge }: {
  title: string; icon: React.ElementType; iconColor: string; iconBg: string;
  children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 md:px-5 py-3 md:py-4 flex items-center justify-between hover:opacity-90 transition-opacity"
        style={{ borderBottom: open ? `1px solid ${T.divider}` : "none" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
            <Icon size={14} style={{ color: iconColor }} />
          </div>
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>{title}</span>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${T.red}15`, color: T.red }}>{badge}</span>
          )}
        </div>
        {open ? <ChevronUp size={14} style={{ color: T.textMuted }} /> : <ChevronDown size={14} style={{ color: T.textMuted }} />}
      </button>
      {open && children}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function CrmDashboardClient({ leads, todayTasks, quotes, stats, dashboardTheme: themeProp, currentUser }: Props) {
  // Merge with defaults so all keys are always defined
  const theme: DashboardTheme = { ...DEFAULT_SETTINGS.dashboardTheme, ...(themeProp ?? {}) };
  // Section ordering & visibility helpers
  const ALL_SECTION_IDS: DashboardSectionId[] = [
    "kpiCards", "dataPool", "monthSummary", "revenueChart",
    "pipeline", "funnel", "staleDeals", "staffPerformance",
    "recentActivities", "recentQuotes",
    "teamOnline", "tasks", "overdue", "quickStats", "quickLinks",
    "leaderboard", "heatmap",
  ];
  const effectiveSectionOrder: DashboardSectionId[] = (() => {
    const saved = theme.sectionOrder;
    if (!saved || saved.length === 0) return ALL_SECTION_IDS;
    const missing = ALL_SECTION_IDS.filter(id => !saved.includes(id));
    return [...saved, ...missing];
  })();
  const hiddenSet = new Set(theme.hiddenSections ?? []);
  const isVisible = (id: DashboardSectionId) => !hiddenSet.has(id);
  const [tasks, setTasks] = useState(todayTasks);
  const [showAddModal, setShowAddModal] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [darkMode, setDarkMode] = useState(false);

  // API data states
  const [poolStats, setPoolStats] = useState<{ pending: number; claimed: number; converted: number; total: number; bySource: { source: string; count: number }[] } | null>(null);
  const [periodStats, setPeriodStats] = useState<{ newLeads: number; wonLeads: number; wonValue: number; convRate: number; sparkline: number[]; wonSparkline: number[] } | null>(null);
  const [staleDeals, setStaleDeals] = useState<Array<{ id: string; name: string; company: string; stage: string; expectedValue: number; lastContactAt: string; assignedTo: string; daysStale: number }>>([]);
  const [teamOnline, setTeamOnline] = useState<Array<{ id: string; name: string; role: string; online: boolean; lastLoginAt: string | null; loginedToday: boolean }>>([]);
  const [forecast, setForecast] = useState<{ forecastValue: number; pipelineCount: number; monthlyData: Array<{ label: string; actual: number; isForecast: boolean }> } | null>(null);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [twelveWeekPlan, setTwelveWeekPlan] = useState<{
    id: string; title: string; startDate: string; endDate: string; isActive: boolean;
    goals: Array<{ id: string; title: string; color: string; description?: string; kpis?: Array<{ id: string; label: string; unit: string; targetTotal: number; weeklyTarget: number; currentValue?: number; format: string; weeklyAllocations?: Array<{ weekNumber: number; target: number }> }> }>;
    tasks: Array<{ id: string; goalId: string; weekNumber: number; status: string; title: string; scheduledDate?: string; assignedDate?: string; dueDate?: string; priority?: string }>;
  } | null>(null);
  const [loadingTwelveWeek, setLoadingTwelveWeek] = useState(true);
  // Kế hoạch 12 tuần chung của admin (shared) - tất cả nhân viên cùng xem
  const [sharedPlan, setSharedPlan] = useState<typeof twelveWeekPlan>(null);
  const [loadingSharedPlan, setLoadingSharedPlan] = useState(true);
  const [sharedPlanTaskUpdating, setSharedPlanTaskUpdating] = useState<string | null>(null);

  // Fetch twelve-week plan once at top level (prevents flash in child components)
  useEffect(() => {
    let mounted = true;
    setLoadingTwelveWeek(true);
    fetch("/api/crm/twelve-week-plan")
      .then(r => r.ok ? r.json() : [])
      .then(plans => {
        if (!mounted) return;
        const active = plans.find((p: { isActive: boolean }) => p.isActive) ?? plans[0] ?? null;
        setTwelveWeekPlan(active);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingTwelveWeek(false); });
    return () => { mounted = false; };
  }, []);

  // Fetch kế hoạch chung của admin cho tất cả nhân viên
  useEffect(() => {
    let mounted = true;
    setLoadingSharedPlan(true);
    fetch("/api/crm/twelve-week-plan?shared=1")
      .then(r => r.ok ? r.json() : [])
      .then(plans => {
        if (!mounted) return;
        setSharedPlan(plans[0] ?? null);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingSharedPlan(false); });
    return () => { mounted = false; };
  }, []);

  // Cập nhật trạng thái task trong kế hoạch chung
  const toggleSharedPlanTask = useCallback(async (taskId: string, currentStatus: string) => {
    if (!sharedPlan) return;
    const newStatus = currentStatus === "done" ? "pending" : "done";
    setSharedPlanTaskUpdating(taskId);
    try {
      const res = await fetch("/api/crm/twelve-week-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: sharedPlan.id, action: "update_task", taskId, status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSharedPlan(updated);
      }
    } finally {
      setSharedPlanTaskUpdating(null);
    }
  }, [sharedPlan]);

  // Fetch all extras
  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      setLoadingExtras(true);
      try {
        const [pool, period_, stale, forecast_, heatmap_] = await Promise.all([
          fetch("/api/crm/raw-leads/stats").then(r => r.ok ? r.json() : null),
          fetch(`/api/crm/dashboard-extras?type=period_stats&period=${period}`).then(r => r.ok ? r.json() : null),
          fetch("/api/crm/dashboard-extras?type=stale_deals").then(r => r.ok ? r.json() : []),
          fetch("/api/crm/dashboard-extras?type=forecast").then(r => r.ok ? r.json() : null),
          fetch("/api/crm/dashboard-extras?type=heatmap").then(r => r.ok ? r.json() : {}),
        ]);
        if (!mounted) return;
        if (pool) setPoolStats(pool);
        if (period_) setPeriodStats(period_);
        if (stale) setStaleDeals(stale);
        if (forecast_) setForecast(forecast_);
        if (heatmap_) setHeatmap(heatmap_);
        if (currentUser?.isAdmin) {
          const team = await fetch("/api/crm/dashboard-extras?type=team_online").then(r => r.ok ? r.json() : []);
          if (mounted) setTeamOnline(team);
        }
      } finally {
        if (mounted) setLoadingExtras(false);
      }
    }
    fetchAll();
    const iv = setInterval(fetchAll, 60_000);
    return () => { mounted = false; clearInterval(iv); };
  }, [period, currentUser?.isAdmin]);

  const overdueLeads = leads.filter(isOverdue);
  const wonLeads = leads.filter(l => l.stage === "won");
  const activeLeads = leads.filter(l => !["won", "lost"].includes(l.stage));
  const pendingTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const totalValue = leads.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const wonValue = wonLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);

  // Personal rank
  const myRank = currentUser?.isAdmin ? null : (() => {
    const sorted = [...stats.staffPerformance].sort((a, b) => b.wonValue - a.wonValue);
    const idx = sorted.findIndex(s => s.staffName === currentUser?.name);
    return idx >= 0 ? { rank: idx + 1, total: sorted.length, nextName: sorted[idx - 1]?.staffName, nextGap: idx > 0 ? sorted[idx - 1].wonValue - sorted[idx].wonValue : 0 } : null;
  })();

  async function toggleTask(task: CrmTask) {
    const updated = { ...task, done: !task.done };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    await fetch(`/api/crm/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
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

  // Focus mode: top 3 priorities
  const focusItems = [
    ...overdueLeads.slice(0, 2).map(l => ({
      type: "overdue" as const, label: `Liên hệ ${l.name}`,
      sub: `Quá ${Math.floor((Date.now() - new Date(l.lastContactAt).getTime()) / 86400000)}n`,
      href: `/crm/leads/${l.id}`, color: T.red, icon: Zap,
    })),
    ...pendingTasks.slice(0, 2).map(t => ({
      type: "task" as const, label: t.title,
      sub: t.leadName, href: `/crm/leads/${t.leadId}`, color: T.gold, icon: CheckSquare,
    })),
    ...staleDeals.slice(0, 2).map(d => ({
      type: "stale" as const, label: `Follow-up ${d.name}`,
      sub: `${d.daysStale}n không liên hệ`, href: `/crm/leads/${d.id}`, color: T.orange, icon: AlertTriangle,
    })),
  ].slice(0, 3);

  const fmtVal = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(0)}tr` : formatVND(v);

  // Build effective theme (dark mode overrides theme settings)
  const dm = darkMode ? {
    bg: "#0F172A", card: "#1E293B", cardBorder: "#334155",
    textPrimary: "#F1F5F9", textSecondary: "#94A3B8", textMuted: "#64748B",
    divider: "#1E293B", headerBg: "#1E293B", headerBorder: "#334155",
    cardShadow: T.cardShadow,
  } : {
    bg: theme.pageBg,
    card: theme.kpiCardBg,
    cardBorder: theme.kpiCardBorder,
    textPrimary: theme.kpiCardTitleColor,
    textSecondary: T.textSecondary,
    textMuted: theme.kpiCardMutedColor,
    divider: T.divider,
    headerBg: theme.kpiCardBg,
    headerBorder: theme.kpiCardBorder,
    cardShadow: T.cardShadow,
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto transition-colors duration-300"
      style={{ background: dm.bg }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 md:px-8 py-3 md:py-5 flex items-center justify-between gap-2"
        style={{ background: dm.headerBg, borderBottom: `1px solid ${dm.headerBorder}` }}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {/* Brand mark */}
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
            style={{ background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldDark} 100%)`, color: "#fff", letterSpacing: "-0.5px" }}>
            SF
          </div>
          <div className="min-w-0">
            <div className="hidden md:flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.green }} />
              <span className="text-xs font-medium" style={{ color: dm.textMuted }}>{dateStr}</span>
            </div>
            <h1 className="text-sm md:text-xl font-bold leading-tight truncate" style={{ color: dm.textPrimary }}>
              {greeting}{currentUser?.name ? `, ${currentUser.name.split(" ").pop()}` : ""} 👋
            </h1>
            <p className="hidden md:block text-xs mt-0.5" style={{ color: dm.textSecondary }}>
              SmartFurni CRM — {currentUser?.isAdmin ? "Tổng quan kinh doanh B2B" : `${ROLE_LABELS[currentUser?.role ?? ""] ?? currentUser?.role}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {/* Period selector — pill group */}
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: `1px solid ${dm.cardBorder}`, background: dm.bg }}>
            {(["month", "quarter", "year"] as Period[]).map((p, i) => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-2.5 md:px-4 py-1.5 md:py-2 text-[11px] md:text-xs font-semibold transition-all"
                style={{
                  background: period === p ? T.gold : "transparent",
                  color: period === p ? "#fff" : dm.textMuted,
                  borderRight: i < 2 ? `1px solid ${dm.cardBorder}` : "none",
                }}>
                <span className="md:hidden">{p === "month" ? "Th" : p === "quarter" ? "Quý" : "Năm"}</span>
                <span className="hidden md:inline">{PERIOD_LABELS[p]}</span>
              </button>
            ))}
          </div>

          {/* Dark mode toggle */}
          <button onClick={() => setDarkMode(d => !d)}
            className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: dm.bg, border: `1px solid ${dm.cardBorder}` }}>
            {darkMode ? <Sun size={14} style={{ color: T.gold }} /> : <Moon size={14} style={{ color: dm.textSecondary }} />}
          </button>

          {/* Notification bell */}
          <NotificationBell currentUser={currentUser} />

          {overdueLeads.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: T.redBg, color: T.red, border: `1px solid #FECACA` }}>
              <AlertCircle size={13} />
              {overdueLeads.length} quá hạn
            </div>
          )}

          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-semibold text-white shadow-sm active:scale-[0.98] transition-all"
            style={{ background: `linear-gradient(135deg, ${T.indigo} 0%, #4338CA 100%)` }}>
            <Plus size={13} />
            <span className="hidden md:inline">Thêm KH</span>
            <span className="md:hidden">Thêm</span>
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => setShowAddModal(false)}
          isAdmin={currentUser?.isAdmin}
          currentUserName={currentUser?.name || ""}
        />
      )}

      <div className="p-3 md:p-6 space-y-4 md:space-y-5">

        {/* ── Focus Mode ──────────────────────────────────────────────────── */}
        {focusItems.length > 0 && (
          <div className="rounded-2xl px-5 py-4"
            style={{
              background: darkMode ? "#1E293B" : T.card,
              border: `1px solid ${darkMode ? "#334155" : T.cardBorder}`,
              borderLeft: `3px solid ${T.indigo}`,
              boxShadow: T.cardShadow,
            }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: T.indigoBg }}>
                <Crosshair size={11} style={{ color: T.indigo }} />
              </div>
              <span className="text-xs font-bold" style={{ color: darkMode ? "#F1F5F9" : T.textPrimary }}>Focus hôm nay</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: T.indigoBg, color: T.indigo }}>
                {focusItems.length} việc ưu tiên
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusItems.map((item, i) => (
                <Link key={i} href={item.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:opacity-80 transition-opacity"
                  style={{ background: darkMode ? "rgba(255,255,255,0.06)" : T.bg, border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : T.cardBorder}` }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}18` }}>
                    <item.icon size={11} style={{ color: item.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: darkMode ? "#F1F5F9" : T.textPrimary }}>{item.label}</p>
                    <p className="text-[10px] truncate" style={{ color: darkMode ? "rgba(255,255,255,0.4)" : T.textMuted }}>{item.sub}</p>
                  </div>
                  <ArrowRight size={11} style={{ color: darkMode ? "rgba(255,255,255,0.25)" : T.textMuted }} className="flex-shrink-0 ml-1" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── 12-Week KPI Row ──────────────────────────────────────────── */}
        {isVisible("kpiCards") && <TwelveWeekKpiRow
          leads={leads}
          activeLeads={activeLeads}
          overdueLeads={overdueLeads}
          wonLeads={wonLeads}
          totalValue={totalValue}
          wonValue={wonValue}
          stats={stats}
          theme={theme}
          fmtVal={fmtVal}
          darkMode={darkMode}
          dm={dm}
          plan={twelveWeekPlan}
          loadingPlan={loadingTwelveWeek}
        />}

        {/* ── Personal Rank (staff only) ───────────────────────────────── */}
        {isVisible("leaderboard") && !currentUser?.isAdmin && myRank && (
          <div className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: myRank.rank === 1 ? `linear-gradient(135deg, ${T.gold}, ${T.goldDark})` : T.bg }}>
              {myRank.rank === 1 ? "🥇" : myRank.rank === 2 ? "🥈" : myRank.rank === 3 ? "🥉" : `#${myRank.rank}`}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: T.textPrimary }}>
                  Hạng {myRank.rank}/{myRank.total} trong team
                </span>
                {myRank.rank === 1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: T.goldBg, color: T.gold }}>Dẫn đầu 🔥</span>
                )}
              </div>
              {myRank.rank > 1 && myRank.nextGap > 0 ? (
                <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                  Cần thêm <span className="font-bold" style={{ color: T.gold }}>{fmtVal(myRank.nextGap)}</span> để vượt {myRank.nextName}
                </p>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                  Doanh số của bạn: <span className="font-bold" style={{ color: T.green }}>{fmtVal(stats.staffPerformance.find(s => s.staffName === currentUser?.name)?.wonValue ?? 0)}</span>
                </p>
              )}
            </div>
            <Link href="/crm/leads"
              className="flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: T.indigo }}>
              Xem KH <ArrowUpRight size={12} />
            </Link>
          </div>
        )}        {/* ── Data Pool Banner ──────────────────────────────────────────────── */}
        {isVisible("dataPool") && poolStats !== null && poolStats.pending > 0 && (
          <Link href="/crm/data-pool"
            className="block rounded-2xl overflow-hidden transition-all hover:shadow-md"
            style={{
              background: darkMode ? "#1E293B" : T.card,
              border: `1px solid ${darkMode ? "#334155" : T.cardBorder}`,
              borderLeft: `3px solid ${T.gold}`,
              boxShadow: T.cardShadow,
            }}>          <div className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${T.gold}15`, border: `1px solid ${T.gold}30` }}>
                  <Database size={20} style={{ color: T.gold }} />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                    style={{ background: theme.kpiOverdueColor, boxShadow: `0 0 0 2px ${darkMode ? "#1E293B" : "#FFFFFF"}` }}>
                    {poolStats.pending > 9 ? "9+" : poolStats.pending}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: darkMode ? "#F1F5F9" : T.textPrimary }}>Data Pool</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black flex-shrink-0"
                      style={{ background: theme.kpiOverdueColor, color: "#fff" }}>
                      {poolStats.pending} chờ nhận
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: darkMode ? "rgba(241,245,249,0.6)" : T.textMuted }}>
                    <span className="font-bold" style={{ color: T.gold }}>{poolStats.pending}</span> data chưa có người nhận
                    {poolStats.bySource.length > 0 && (
                      <span style={{ color: darkMode ? "rgba(255,255,255,0.35)" : T.textMuted }}>
                        {" — "}{poolStats.bySource.slice(0, 2).map((s, i) => (
                          <span key={s.source}>{i > 0 && ", "}
                            <span style={{ color: darkMode ? "rgba(255,255,255,0.65)" : T.textSecondary }}>
                              {s.source === "facebook_lead" ? "Facebook" : s.source === "tiktok_lead" ? "TikTok" : s.source === "manual" ? "Nhập tay" : s.source}
                            </span> ({s.count})
                          </span>
                        ))}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0"
                style={{ background: T.gold, color: "#fff", boxShadow: `0 2px 8px ${T.gold}40` }}>
                Nhận ngay <ArrowRight size={14} />
              </div>
            </div>
            {poolStats.total > 0 && (
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px]" style={{ color: darkMode ? "rgba(255,255,255,0.35)" : T.textMuted }}>Tiến độ xử lý</span>
                  <span className="text-[10px] font-semibold" style={{ color: darkMode ? "rgba(255,255,255,0.55)" : T.textSecondary }}>
                    {poolStats.claimed + poolStats.converted}/{poolStats.total} đã xử lý
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: darkMode ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${Math.round(((poolStats.claimed + poolStats.converted) / poolStats.total) * 100)}%`, background: T.gold, transition: "width 0.7s ease" }} />
                </div>
              </div>
            )}
          </Link>
        )}

        {/* ── 12-Week Report Dashboard (replaces Progress Board) ──────────── */}
        {isVisible("monthSummary") && (
          <div className="rounded-2xl overflow-hidden" style={{ background: dm.card, border: `1px solid ${dm.cardBorder}`, boxShadow: T.cardShadow }}>
            <div className="px-4 md:px-5 py-3 md:py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${dm.cardBorder}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
                  <Crosshair size={15} style={{ color: "#4F46E5" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: dm.textPrimary }}>Báo cáo Kế hoạch 12 Tuần</p>
                  <p className="text-[10px]" style={{ color: dm.textMuted }}>{twelveWeekPlan ? twelveWeekPlan.title : "Chưa có kế hoạch"}</p>
                </div>
              </div>
              <Link href="/crm/twelve-week-plan"
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                Chi tiết <ChevronRight size={12} />
              </Link>
            </div>
            <div className="p-4 md:p-5">
              {loadingTwelveWeek ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-32 rounded-2xl" style={{ background: `${T.textMuted}08` }} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-48 rounded-2xl" style={{ background: `${T.textMuted}08` }} />
                    <div className="h-48 rounded-2xl" style={{ background: `${T.textMuted}08` }} />
                  </div>
                  <div className="h-32 rounded-2xl" style={{ background: `${T.textMuted}08` }} />
                </div>
              ) : !twelveWeekPlan ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#EEF2FF" }}>
                    <Crosshair size={24} style={{ color: "#4F46E5" }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: dm.textPrimary }}>Chưa có kế hoạch 12 tuần</h3>
                  <p className="text-sm mb-4" style={{ color: dm.textMuted }}>Tạo kế hoạch để theo dõi tiến độ mục tiêu và công việc hàng tuần</p>
                  <Link href="/crm/twelve-week-plan"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#4F46E5" }}>
                    <Plus size={16} /> Tạo kế hoạch ngay
                  </Link>
                </div>
              ) : (
                <TwelveWeekReportDashboard plan={twelveWeekPlan as Parameters<typeof TwelveWeekReportDashboard>[0]["plan"]} />
              )}
            </div>
          </div>
        )}

        {/* ── Main Grid ─────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">

          {/* Left col (2/3) */}
          <div className="xl:col-span-2 space-y-4 md:space-y-5">

            {/* ── Goal Detail Report ──────────────────────────────────────────────────── */}
            {isVisible("revenueChart") && twelveWeekPlan && (
              <div className="rounded-2xl overflow-hidden" style={{ background: dm.card, border: `1px solid ${dm.cardBorder}`, boxShadow: T.cardShadow }}>
                <div className="px-4 md:px-5 py-3 md:py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${dm.cardBorder}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
                      <Flag size={16} style={{ color: "#4F46E5" }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: dm.textPrimary }}>Báo cáo chi tiết từng mục tiêu</p>
                      <p className="text-[10px]" style={{ color: dm.textMuted }}>Phân tích tiến độ và dự báo từng mục tiêu</p>
                    </div>
                  </div>
                  <Link href="/crm/twelve-week-plan"
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                    Chi tiết <ArrowUpRight size={12} />
                  </Link>
                </div>
                <div className="p-4 md:p-5">
                  <GoalDetailDashboard plan={twelveWeekPlan as Parameters<typeof GoalDetailDashboard>[0]["plan"]} />
                </div>
              </div>
            )}

            {/* Conversion Funnel */}
            {isVisible("funnel") && <Section title="Conversion Funnel" icon={Filter} iconColor={theme.kpiCustomerColor} iconBg={theme.kpiCustomerColor + "18"}>
              <div className="p-5">
                <div className="space-y-2">
                  {(Object.keys(STAGE_LABELS) as Array<keyof typeof STAGE_LABELS>).map((stage, i) => {
                    const stageLeads = leads.filter(l => l.stage === stage);
                    const count = stageLeads.length;
                    const value = stageLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
                    const prevStage = i > 0 ? (Object.keys(STAGE_LABELS) as Array<keyof typeof STAGE_LABELS>)[i - 1] : null;
                    const prevCount = prevStage ? leads.filter(l => l.stage === prevStage).length : leads.length;
                    const convPct = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
                    const maxCount = Math.max(...Object.keys(STAGE_LABELS).map(s => leads.filter(l => l.stage === s).length), 1);
                    const barW = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                          style={{ background: STAGE_COLORS[stage] }}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold" style={{ color: T.textSecondary }}>{STAGE_LABELS[stage]}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold" style={{ color: T.textPrimary }}>{count} KH</span>
                              {value > 0 && <span className="text-[10px] font-semibold" style={{ color: T.gold }}>{fmtVal(value)}</span>}
                              {i > 0 && count > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: convPct >= 50 ? T.greenBg : T.bg, color: convPct >= 50 ? T.green : T.textMuted }}>
                                  {convPct}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: T.bg }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${barW}%`, background: STAGE_COLORS[stage], opacity: count === 0 ? 0.15 : 1 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 rounded-xl flex items-center justify-between"
                  style={{ background: T.greenBg, border: `1px solid ${T.green}20` }}>
                  <span className="text-xs font-semibold" style={{ color: T.green }}>Tỷ lệ chốt tổng thể</span>
                  <span className="text-sm font-black" style={{ color: T.green }}>{stats.conversionRate}%</span>
                </div>
              </div>
            </Section>}

            {/* Stale Deals Alert */}
            {isVisible("staleDeals") && staleDeals.length > 0 && (
              <Section title="Deal có nguy cơ mất" icon={AlertTriangle} iconColor={T.orange} iconBg={T.orangeBg}
                badge={`${staleDeals.length} deal`}>
                <div className="p-4 space-y-2">
                  {staleDeals.map(deal => (
                    <Link key={deal.id} href={`/crm/leads/${deal.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:opacity-90 transition-opacity"
                      style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-bold truncate" style={{ color: T.textPrimary }}>{deal.name}</div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: `${STAGE_COLORS[deal.stage as keyof typeof STAGE_COLORS]}15`, color: STAGE_COLORS[deal.stage as keyof typeof STAGE_COLORS] }}>
                            {STAGE_LABELS[deal.stage as keyof typeof STAGE_LABELS]}
                          </span>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>
                          {deal.company} · {deal.assignedTo}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <div className="text-right">
                          <div className="text-xs font-bold" style={{ color: T.gold }}>{fmtVal(deal.expectedValue)}</div>
                          <div className="flex items-center gap-0.5 justify-end">
                            <Clock size={9} style={{ color: T.orange }} />
                            <span className="text-[10px] font-bold" style={{ color: T.orange }}>{deal.daysStale}n</span>
                          </div>
                        </div>
                        <ChevronRight size={12} style={{ color: T.textMuted }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* Source + Type row */}
            {isVisible("pipeline") && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <Section title="Nguồn khách hàng" icon={TrendingUp} iconColor={T.orange} iconBg={T.orangeBg}>
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
                              style={{ background: wr >= 30 ? T.greenBg : T.bg, color: wr >= 30 ? T.green : T.textMuted }}>
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
              </Section>

              <Section title="Phân loại khách" icon={PieChart} iconColor={T.purple} iconBg={T.purpleBg}>
                <div className="p-4 space-y-3">
                  {(["architect", "investor", "dealer"] as const).map(type => {
                    const typeLeads = leads.filter(l => l.type === type);
                    const count = typeLeads.length;
                    const wonCount = typeLeads.filter(l => l.stage === "won").length;
                    const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                    const typeValue = typeLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
                    return (
                      <div key={type} className="p-3 rounded-xl"
                        style={{ background: `${TYPE_COLORS[type]}08`, border: `1px solid ${TYPE_COLORS[type]}18` }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLORS[type] }} />
                            <span className="text-xs font-semibold" style={{ color: T.textPrimary }}>{TYPE_LABELS[type]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black" style={{ color: T.textPrimary }}>{count}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${TYPE_COLORS[type]}18`, color: TYPE_COLORS[type] }}>{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${TYPE_COLORS[type]}15` }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TYPE_COLORS[type] }} />
                        </div>
                        <div className="text-[10px] mt-1.5" style={{ color: T.textMuted }}>
                          {wonCount} đã chốt · {typeValue >= 1e6 ? `${(typeValue/1e6).toFixed(0)}tr` : formatVND(typeValue)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>}

            {/* ── Business Metrics Row ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {/* Sales Velocity + AOV */}
              <Section title="Chỉ số bán hàng" icon={TrendingUp} iconColor={T.green} iconBg={T.greenBg}>
                <div className="p-4 space-y-3">
                  {(() => {
                    const wonLeadsAll = leads.filter(l => l.stage === "won");
                    const aov = wonLeadsAll.length > 0 ? Math.round(wonLeads.reduce((s, l) => s + (l.expectedValue || 0), 0) / Math.max(wonLeadsAll.length, 1)) : 0;
                    const activeCount = activeLeads.length;
                    const convRate = leads.length > 0 ? (wonLeadsAll.length / leads.length) : 0;
                    const avgCycleDays = 45; // B2B furniture avg
                    const velocity = activeCount > 0 ? Math.round((convRate * aov) / avgCycleDays * 30) : 0;
                    const lostLeads = leads.filter(l => l.stage === "lost");
                    const winRate = (wonLeadsAll.length + lostLeads.length) > 0
                      ? Math.round((wonLeadsAll.length / (wonLeadsAll.length + lostLeads.length)) * 100) : 0;
                    const items = [
                      { label: "Giá trị đơn TB (AOV)", value: aov >= 1e6 ? `${(aov/1e6).toFixed(0)}tr` : aov > 0 ? formatVND(aov) : "—", icon: DollarSign, color: T.gold, sub: "Trung bình đơn đã chốt" },
                      { label: "Tốc độ bán hàng", value: velocity >= 1e6 ? `${(velocity/1e6).toFixed(0)}tr/th` : velocity > 0 ? `${(velocity/1e3).toFixed(0)}k/th` : "—", icon: Zap, color: T.indigo, sub: "Doanh thu dự kiến/tháng" },
                      { label: "Win Rate thực tế", value: `${winRate}%`, icon: Trophy, color: winRate >= 40 ? T.green : winRate >= 20 ? T.gold : T.red, sub: `${wonLeadsAll.length} chốt / ${lostLeads.length} mất` },
                      { label: "Pipeline đang xử lý", value: activeCount, icon: Target, color: theme.accentColor, sub: `Tổng ${fmtVal(activeLeads.reduce((s,l) => s+(l.expectedValue||0),0))} giá trị` },
                    ];
                    return items.map(({ label, value, icon: Icon, color, sub }) => (
                      <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                          <Icon size={14} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-medium" style={{ color: T.textMuted }}>{label}</div>
                          <div className="text-sm font-black" style={{ color: T.textPrimary }}>{value}</div>
                        </div>
                        <div className="text-[9px] text-right" style={{ color: T.textMuted }}>{sub}</div>
                      </div>
                    ));
                  })()}
                </div>
              </Section>

              {/* Pipeline Health Score */}
              <Section title="Sức khỏe Pipeline" icon={Activity} iconColor={T.indigo} iconBg={T.indigoBg}>
                <div className="p-4">
                  {(() => {
                    const totalPipeline = activeLeads.length;
                    const highValueLeads = activeLeads.filter(l => (l.expectedValue || 0) >= 500_000_000);
                    const staleCount = staleDeals.length;
                    const overdueCount = overdueLeads.length;
                    const hotLeads = activeLeads.filter(l => ["negotiating", "quoted"].includes(l.stage));
                    // Health score 0-100
                    const staleRatio = totalPipeline > 0 ? staleCount / totalPipeline : 0;
                    const overdueRatio = totalPipeline > 0 ? overdueCount / totalPipeline : 0;
                    const hotRatio = totalPipeline > 0 ? hotLeads.length / totalPipeline : 0;
                    const score = Math.max(0, Math.min(100, Math.round(
                      100 - staleRatio * 40 - overdueRatio * 30 + hotRatio * 20
                    )));
                    const scoreColor = score >= 70 ? T.green : score >= 40 ? T.gold : T.red;
                    const scoreLabel = score >= 70 ? "Tốt" : score >= 40 ? "Trung bình" : "Cần cải thiện";
                    const metrics = [
                      { label: "Deal nóng (sắp chốt)", value: hotLeads.length, color: T.green, icon: Flame },
                      { label: "Deal giá trị cao (>500tr)", value: highValueLeads.length, color: T.gold, icon: Star },
                      { label: "Deal có nguy cơ mất", value: staleCount, color: T.orange, icon: AlertTriangle },
                      { label: "Quá hạn liên hệ", value: overdueCount, color: T.red, icon: Clock },
                    ];
                    return (
                      <>
                        {/* Score Circle */}
                        <div className="flex items-center gap-4 mb-4 p-3 rounded-2xl" style={{ background: `${scoreColor}08`, border: `1px solid ${scoreColor}20` }}>
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                              <circle cx="32" cy="32" r="26" fill="none" stroke={T.bg} strokeWidth="8" />
                              <circle cx="32" cy="32" r="26" fill="none" stroke={scoreColor} strokeWidth="8"
                                strokeDasharray={`${(score / 100) * 163.4} 163.4`}
                                strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-lg font-black leading-none" style={{ color: scoreColor }}>{score}</span>
                              <span className="text-[8px] font-bold" style={{ color: T.textMuted }}>/100</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-black" style={{ color: scoreColor }}>{scoreLabel}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>Pipeline Health Score</div>
                            <div className="text-[10px] mt-1" style={{ color: T.textMuted }}>{totalPipeline} deal đang xử lý</div>
                          </div>
                        </div>
                        {/* Breakdown */}
                        <div className="grid grid-cols-2 gap-2">
                          {metrics.map(({ label, value, color, icon: Icon }) => (
                            <div key={label} className="p-2.5 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Icon size={11} style={{ color }} />
                                <span className="text-[9px] font-semibold" style={{ color: T.textMuted }}>{label}</span>
                              </div>
                              <div className="text-xl font-black" style={{ color }}>{value}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Section>
            </div>

            {/* ── Win/Loss Analysis ─────────────────────────────────────────── */}
            <Section title="Phân tích Win/Loss" icon={PieChart} iconColor={T.purple} iconBg={T.purpleBg}>
              <div className="p-4">
                {(() => {
                  const wonLeadsAll = leads.filter(l => l.stage === "won");
                  const lostLeads = leads.filter(l => l.stage === "lost");
                  const wonVal = wonLeadsAll.reduce((s, l) => s + (l.expectedValue || 0), 0);
                  const lostVal = lostLeads.reduce((s, l) => s + (l.expectedValue || 0), 0);
                  const total = wonLeadsAll.length + lostLeads.length;
                  const wonPct = total > 0 ? Math.round((wonLeadsAll.length / total) * 100) : 0;
                  const lostPct = total > 0 ? 100 - wonPct : 0;

                  // By source win analysis
                  const sourceWinData = stats.bySource.slice(0, 4).map(s => ({
                    source: s.source,
                    winRate: s.count > 0 ? Math.round((s.wonCount / s.count) * 100) : 0,
                    count: s.count,
                    color: SOURCE_COLORS[s.source] || "#6b7280",
                  }));

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Win vs Loss */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: T.textMuted }}>Tổng kết</div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-semibold" style={{ color: T.green }}>Won</span>
                              <span className="text-[10px] font-black" style={{ color: T.green }}>{wonPct}%</span>
                            </div>
                            <div className="h-3 rounded-full overflow-hidden" style={{ background: T.bg }}>
                              <div className="h-full rounded-full" style={{ width: `${wonPct}%`, background: `linear-gradient(90deg, ${T.green}, #047857)` }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-semibold" style={{ color: T.red }}>Lost</span>
                              <span className="text-[10px] font-black" style={{ color: T.red }}>{lostPct}%</span>
                            </div>
                            <div className="h-3 rounded-full overflow-hidden" style={{ background: T.bg }}>
                              <div className="h-full rounded-full" style={{ width: `${lostPct}%`, background: `linear-gradient(90deg, ${T.red}, #B91C1C)` }} />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-xl text-center" style={{ background: T.greenBg, border: `1px solid ${T.green}20` }}>
                            <div className="text-lg font-black" style={{ color: T.green }}>{wonLeadsAll.length}</div>
                            <div className="text-[9px] font-semibold" style={{ color: T.green }}>Deal chốt</div>
                            <div className="text-[9px] mt-0.5" style={{ color: T.textMuted }}>{fmtVal(wonVal)}</div>
                          </div>
                          <div className="p-3 rounded-xl text-center" style={{ background: T.redBg, border: `1px solid ${T.red}20` }}>
                            <div className="text-lg font-black" style={{ color: T.red }}>{lostLeads.length}</div>
                            <div className="text-[9px] font-semibold" style={{ color: T.red }}>Deal mất</div>
                            <div className="text-[9px] mt-0.5" style={{ color: T.textMuted }}>{fmtVal(lostVal)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Win rate by source */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: T.textMuted }}>Win Rate theo nguồn</div>
                        <div className="space-y-2.5">
                          {sourceWinData.length === 0 ? (
                            <p className="text-xs text-center py-4" style={{ color: T.textMuted }}>Chưa có dữ liệu</p>
                          ) : sourceWinData.map(({ source, winRate, count, color }) => (
                            <div key={source}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                                  <span className="text-[10px] font-medium truncate max-w-[100px]" style={{ color: T.textSecondary }}>{source}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px]" style={{ color: T.textMuted }}>{count} KH</span>
                                  <span className="text-[10px] font-black" style={{ color: winRate >= 40 ? T.green : winRate >= 20 ? T.gold : T.red }}>{winRate}%</span>
                                </div>
                              </div>
                              <div className="h-2 rounded-full overflow-hidden" style={{ background: T.bg }}>
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${winRate}%`, background: winRate >= 40 ? T.green : winRate >= 20 ? T.gold : T.red }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Section>

            {/* Activity Heatmap */}
            {isVisible("heatmap") && Object.keys(heatmap).length > 0 && (
              <Section title="Heatmap hoạt động" icon={Activity} iconColor={T.purple} iconBg={T.purpleBg}>
                <div className="p-5">
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1 pt-6">
                      {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(d => (
                        <div key={d} className="h-6 flex items-center text-[9px] font-semibold w-6"
                          style={{ color: T.textMuted }}>{d}</div>
                      ))}
                    </div>
                    <div className="flex-1 overflow-x-auto">
                      <div className="flex gap-1 mb-1">
                        {Array.from({ length: 24 }, (_, h) => (
                          <div key={h} className="flex-1 text-center text-[8px] font-medium"
                            style={{ color: T.textMuted, minWidth: 16 }}>
                            {h % 6 === 0 ? `${h}h` : ""}
                          </div>
                        ))}
                      </div>
                      {Array.from({ length: 7 }, (_, day) => {
                        const maxVal = Math.max(...Object.values(heatmap), 1);
                        return (
                          <div key={day} className="flex gap-1 mb-1">
                            {Array.from({ length: 24 }, (_, hour) => {
                              const val = heatmap[`${day}-${hour}`] || 0;
                              const intensity = maxVal > 0 ? val / maxVal : 0;
                              return (
                                <div key={hour}
                                  className="flex-1 h-6 rounded-sm transition-all"
                                  title={`${["CN","T2","T3","T4","T5","T6","T7"][day]} ${hour}h: ${val} hoạt động`}
                                  style={{
                                    minWidth: 16,
                                    background: intensity === 0 ? T.bg : `rgba(79,70,229,${0.1 + intensity * 0.9})`,
                                    border: `1px solid ${intensity > 0.5 ? T.indigo + "30" : "transparent"}`,
                                  }} />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px]" style={{ color: T.textMuted }}>Ít</span>
                    <div className="flex gap-1">
                      {[0.1, 0.3, 0.5, 0.7, 0.9].map(i => (
                        <div key={i} className="w-4 h-4 rounded-sm"
                          style={{ background: `rgba(79,70,229,${i})` }} />
                      ))}
                    </div>
                    <span className="text-[10px]" style={{ color: T.textMuted }}>Nhiều</span>
                  </div>
                </div>
              </Section>
            )}

            {/* Staff Performance (admin only) */}
            {isVisible("staffPerformance") && currentUser?.isAdmin && stats.staffPerformance.length > 0 && (
              <Section title="Hiệu suất nhân viên" icon={Star} iconColor={T.gold} iconBg={T.goldBg}>
                <div className="px-6 py-2 grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: T.bg, borderBottom: `1px solid ${T.divider}`, color: T.textMuted }}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Nhân viên</div>
                  <div className="col-span-2 text-center">KH</div>
                  <div className="col-span-2 text-center">Chốt</div>
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
                        className="px-6 py-3 grid grid-cols-12 gap-2 items-center hover:opacity-90 transition-opacity"
                        style={{ background: isTop ? T.goldBg : undefined }}>
                        <div className="col-span-1 text-sm">{medals[i] ?? <span className="text-xs font-bold" style={{ color: T.textMuted }}>{i+1}</span>}</div>
                        <div className="col-span-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                              style={{ background: isTop ? `linear-gradient(135deg, ${T.gold}, ${T.goldDark})` : T.bg, color: isTop ? "white" : T.textMuted, border: isTop ? "none" : `1px solid ${T.cardBorder}` }}>
                              {s.staffName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold truncate" style={{ color: T.textPrimary }}>{s.staffName}</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center"><span className="text-xs font-bold" style={{ color: T.textSecondary }}>{s.leadsCount}</span></div>
                        <div className="col-span-2 text-center"><span className="text-xs font-bold" style={{ color: T.green }}>{s.wonCount}</span></div>
                        <div className="col-span-2 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: s.conversionRate >= 40 ? T.greenBg : s.conversionRate >= 20 ? T.goldBg : T.bg, color: s.conversionRate >= 40 ? T.green : s.conversionRate >= 20 ? T.gold : T.textMuted }}>
                            {s.conversionRate}%
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <div className="text-xs font-black" style={{ color: isTop ? T.gold : T.textPrimary }}>{fmtVal(s.wonValue)}</div>
                          <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ background: T.bg }}>
                            <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: isTop ? `linear-gradient(90deg, ${T.gold}, ${T.goldDark})` : T.cardBorder }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Recent Activities */}
            {isVisible("recentActivities") && stats.recentActivities.length > 0 && (
              <Section title="Hoạt động gần đây" icon={Activity} iconColor={T.green} iconBg={T.greenBg} defaultOpen={false}>
                <div className="divide-y" style={{ borderColor: T.divider }}>
                  {stats.recentActivities.slice(0, 6).map((act) => {
                    const IconComp = ACTIVITY_TYPE_ICONS[act.type] || FileText;
                    const actColors: Record<string, { bg: string; color: string }> = {
                      call: { bg: T.blueBg, color: T.blue }, meeting: { bg: T.purpleBg, color: T.purple },
                      email: { bg: T.orangeBg, color: T.orange }, note: { bg: T.bg, color: T.textMuted },
                      quote_sent: { bg: T.goldBg, color: T.gold }, contract: { bg: T.greenBg, color: T.green },
                    };
                    const c = actColors[act.type] || { bg: T.bg, color: T.textMuted };
                    const timeAgo = (() => {
                      const diff = Date.now() - new Date(act.createdAt).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 60) return `${mins}p`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}h`;
                      return `${Math.floor(hrs / 24)}n`;
                    })();
                    return (
                      <div key={act.id} className="flex items-start gap-3 px-5 py-3 hover:opacity-90 transition-opacity">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: c.bg }}>
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
              </Section>
            )}

            {/* Recent Quotes */}
            {isVisible("recentQuotes") && <Section title="Báo giá gần đây" icon={FileText} iconColor={T.green} iconBg={T.greenBg} defaultOpen={false}>
              <div className="divide-y" style={{ borderColor: T.divider }}>
                {quotes.length === 0 ? (
                  <div className="text-center py-6" style={{ color: T.textMuted }}>
                    <FileText size={22} className="mx-auto mb-1.5 opacity-20" />
                    <p className="text-xs">Chưa có báo giá</p>
                  </div>
                ) : quotes.slice(0, 4).map(q => {
                  const statusConfig = {
                    draft: { label: "Nháp", color: T.textMuted, bg: T.bg },
                    sent: { label: "Đã gửi", color: T.blue, bg: T.blueBg },
                    accepted: { label: "Chấp nhận", color: T.green, bg: T.greenBg },
                    rejected: { label: "Từ chối", color: T.red, bg: T.redBg },
                  }[q.status];
                  return (
                    <Link key={q.id} href={`/crm/quotes/${q.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:opacity-90 transition-opacity">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold" style={{ color: T.textPrimary }}>{q.quoteNumber}</div>
                        <div className="text-[10px] truncate" style={{ color: T.textMuted }}>{q.leadName}</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-xs font-bold" style={{ color: T.gold }}>{fmtVal(q.total)}</div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: statusConfig?.bg, color: statusConfig?.color }}>{statusConfig?.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {quotes.length > 0 && (
                <div className="px-5 py-3" style={{ borderTop: `1px solid ${T.divider}` }}>
                  <Link href="/crm/quotes/new"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                    style={{ border: `1px dashed ${T.gold}`, color: T.gold }}>
                    <Plus size={12} /> Tạo báo giá mới
                  </Link>
                </div>
              )}
            </Section>}

          </div>

          {/* Right col (1/3) */}
          <div className="space-y-4 md:space-y-5">

            {/* 12 Week Plan Widget (của nhân viên) */}
            <TwelveWeekWidget plan={twelveWeekPlan} loadingPlan={loadingTwelveWeek} />

            {/* Kế hoạch 12 tuần chung của team (admin tạo, nhân viên cùng thực hiện) */}
            <SharedPlanWidget
              plan={sharedPlan as Parameters<typeof SharedPlanWidget>[0]["plan"]}
              loading={loadingSharedPlan}
              taskUpdating={sharedPlanTaskUpdating}
              onToggleTask={toggleSharedPlanTask}
              isAdmin={currentUser?.isAdmin ?? false}
            />

            {/* Team Online (admin only) */}
            {isVisible("teamOnline") && currentUser?.isAdmin && teamOnline.length > 0 && (
              <Section title="Trạng thái team" icon={Wifi} iconColor={T.green} iconBg={T.greenBg}>
                <div className="p-4 space-y-2">
                  {teamOnline.slice(0, 6).map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                          style={{ background: member.online ? `linear-gradient(135deg, ${T.green}, #047857)` : T.cardBorder, color: member.online ? "white" : T.textMuted }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                          style={{ background: member.online ? T.green : member.loginedToday ? T.gold : T.cardBorder }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color: T.textPrimary }}>{member.name}</div>
                        <div className="text-[10px]" style={{ color: T.textMuted }}>
                          {member.online ? "Đang online" : member.loginedToday ? "Đã đăng nhập hôm nay" : "Chưa đăng nhập"}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {member.online ? <Wifi size={12} style={{ color: T.green }} /> : <WifiOff size={12} style={{ color: T.textMuted }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Today's Tasks */}
            {isVisible("tasks") && <Section title="Việc hôm nay" icon={CheckSquare} iconColor={T.gold} iconBg={T.goldBg}
              badge={pendingTasks.length > 0 ? `${pendingTasks.length}` : undefined}>
              <div>
                {tasks.length > 0 && (
                  <div className="px-5 pt-3 pb-1">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.bg }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(doneTasks.length / tasks.length) * 100}%`, background: `linear-gradient(90deg, ${T.green}, #047857)` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px]" style={{ color: T.textMuted }}>{doneTasks.length}/{tasks.length} hoàn thành</span>
                      <Link href="/crm/tasks" className="text-[10px] font-medium hover:opacity-80" style={{ color: T.gold }}>Xem tất cả</Link>
                    </div>
                  </div>
                )}
                <div className="p-4 space-y-2">
                  {tasks.length === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle2 size={22} className="mx-auto mb-2 opacity-20" style={{ color: T.green }} />
                      <p className="text-xs" style={{ color: T.textMuted }}>Không có việc hôm nay 🎉</p>
                    </div>
                  ) : tasks.map(task => {
                    const pc = PRIORITY_CONFIG[task.priority];
                    return (
                      <div key={task.id} className="flex items-start gap-2.5 p-3 rounded-xl transition-all"
                        style={{ background: task.done ? T.bg : T.card, border: `1px solid ${task.done ? T.divider : T.cardBorder}` }}>
                        <button onClick={() => toggleTask(task)}
                          className="flex-shrink-0 mt-0.5 rounded-md transition-all flex items-center justify-center"
                          style={{ width: 18, height: 18, border: `2px solid ${task.done ? T.green : T.cardBorder}`, background: task.done ? T.green : "transparent" }}>
                          {task.done && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-snug"
                            style={{ color: task.done ? T.textMuted : T.textPrimary, textDecoration: task.done ? "line-through" : "none" }}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Link href={`/crm/leads/${task.leadId}`}
                              className="text-[10px] font-medium hover:underline truncate"
                              style={{ color: T.gold }}>{task.leadName}</Link>
                            {/* Quick actions */}
                            {!task.done && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Link href={`tel:${task.leadId}`}
                                  className="w-5 h-5 rounded-md flex items-center justify-center hover:opacity-80"
                                  style={{ background: T.blueBg }}>
                                  <Phone size={9} style={{ color: T.blue }} />
                                </Link>
                                <Link href={`/crm/leads/${task.leadId}?tab=activities`}
                                  className="w-5 h-5 rounded-md flex items-center justify-center hover:opacity-80"
                                  style={{ background: T.greenBg }}>
                                  <FileText size={9} style={{ color: T.green }} />
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Section>}

            {/* Overdue Alert */}
            {isVisible("overdue") && overdueLeads.length > 0 && (
              <Section title="Cần liên hệ ngay" icon={Zap} iconColor={theme.kpiOverdueColor} iconBg={theme.kpiOverdueColor + "18"}
                badge={`${overdueLeads.length}`}>
                <div className="p-3 space-y-2">
                  {overdueLeads.slice(0, 5).map(lead => {
                    const daysAgo = Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={lead.id} href={`/crm/leads/${lead.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:opacity-90 transition-opacity"
                        style={{ border: "1px solid #FEE2E2" }}>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate" style={{ color: T.textPrimary }}>{lead.name}</div>
                          <div className="text-[10px] truncate" style={{ color: T.textMuted }}>{lead.company || STAGE_LABELS[lead.stage]}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md" style={{ background: "#FEE2E2" }}>
                            <Clock size={9} style={{ color: T.red }} />
                            <span className="text-[10px] font-black" style={{ color: T.red }}>{daysAgo}n</span>
                          </div>
                          <ChevronRight size={12} style={{ color: T.textMuted }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Quick Stats */}
            {isVisible("quickStats") && <Section title="Thống kê nhanh" icon={Eye} iconColor={theme.kpiPipelineColor} iconBg={theme.kpiPipelineColor + "18"}>
              <div className="p-4 space-y-2.5">
                {[
                  { label: "Đang thương thảo", value: (stats.byStage["negotiating"] || 0), color: theme.accentColor, bg: theme.accentColor + "12", icon: Target },
                  { label: "Đã báo giá", value: (stats.byStage["quoted"] || 0), color: theme.kpiPipelineColor, bg: theme.kpiPipelineColor + "12", icon: FileText },
                  { label: "Đã khảo sát", value: (stats.byStage["surveyed"] || 0), color: theme.kpiCustomerColor, bg: theme.kpiCustomerColor + "12", icon: Briefcase },
                  { label: "Đã gửi Profile", value: (stats.byStage["profile_sent"] || 0), color: theme.kpiWonColor, bg: theme.kpiWonColor + "12", icon: Mail },
                ].map(({ label, value, color, bg, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ background: bg, border: `1px solid ${color}18` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                        <Icon size={12} style={{ color }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: T.textSecondary }}>{label}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </Section>}

            {/* Quick Links */}
            {isVisible("quickLinks") && <Section title="Truy cập nhanh" icon={ArrowUpRight} iconColor={theme.kpiCustomerColor} iconBg={theme.kpiCustomerColor + "18"}>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { href: "/crm/twelve-week-plan", label: "Kế hoạch 12T", icon: Crosshair, color: "#4F46E5", bg: "#EEF2FF" },
                  { href: "/crm/leads", label: "Khách hàng", icon: Users, color: theme.kpiCustomerColor, bg: theme.kpiCustomerColor + "12" },
                  { href: "/crm/kanban", label: "Kanban", icon: BarChart2, color: theme.accentColor, bg: theme.accentColor + "12" },
                  { href: "/crm/quotes/new", label: "Báo giá mới", icon: FileText, color: theme.kpiWonColor, bg: theme.kpiWonColor + "12" },
                  { href: "/crm/calendar", label: "Lịch hẹn", icon: Calendar, color: theme.kpiPipelineColor, bg: theme.kpiPipelineColor + "12" },
                  ...(currentUser?.isAdmin ? [
                    { href: "/crm/reports", label: "Báo cáo", icon: TrendingUp, color: theme.kpiCustomerColor, bg: theme.kpiCustomerColor + "12" },
                    { href: "/crm/staff", label: "Nhân viên", icon: Award, color: theme.accentColor, bg: theme.accentColor + "12" },
                  ] : []),
                ].map(({ href, label, icon: Icon, color, bg }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-2 p-3 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: bg, border: `1px solid ${color}18` }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                      <Icon size={12} style={{ color }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: T.textSecondary }}>{label}</span>
                  </Link>
                ))}
              </div>
            </Section>}

          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ElementType; label: string; value: number | string; sub: string;
  color: string; colorBg: string; badge?: string; badgeColor?: string;
  isText?: boolean; urgent?: boolean; sparkline?: number[]; sparklineColor?: string;
  darkMode?: boolean;
}

function KpiCard({ icon: Icon, label, value, sub, color, colorBg, badge, badgeColor, urgent, sparkline, sparklineColor, darkMode }: KpiCardProps) {
  return (
    <div className="rounded-2xl p-3.5 md:p-5 relative overflow-hidden transition-all hover:shadow-md"
      style={{
        background: darkMode ? "#1E293B" : T.card,
        border: urgent ? `1px solid ${color}40` : `1px solid ${T.cardBorder}`,
        boxShadow: urgent ? `0 2px 8px ${color}15` : T.cardShadow,
      }}>
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: color }} />
      {urgent && <div className="absolute inset-0 opacity-[0.02]" style={{ background: color }} />}
      <div className="flex items-start justify-between mb-2.5 md:mb-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center" style={{ background: colorBg }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div className="flex items-center gap-2">
          {sparkline && <Sparkline data={sparkline} color={sparklineColor || color} />}
          {urgent && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />}
        </div>
      </div>
      <div className="text-xl md:text-2xl font-black leading-none mb-1" style={{ color: darkMode ? "#F1F5F9" : T.textPrimary }}>{value}</div>
      <div className="text-[11px] md:text-xs font-semibold mb-1" style={{ color: darkMode ? "#94A3B8" : T.textLabel }}>{label}</div>
      <div className="text-[10px] truncate" style={{ color: T.textMuted }}>{sub}</div>
      {badge && (
        <div className="mt-1.5 md:mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
          style={{ background: `${badgeColor}15`, color: badgeColor }}>
          {badge}
        </div>
      )}
    </div>
  );
}
