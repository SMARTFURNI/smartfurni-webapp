"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, TrendingUp, FileText, CheckSquare, AlertCircle,
  Clock, ChevronRight, Target, Award, DollarSign,
  Phone, Mail, Calendar, ArrowUpRight, Zap, Activity,
  BarChart2, PieChart, Plus, RefreshCw, Star, Trophy,
  TrendingDown, Minus, ArrowRight, Briefcase, UserCheck,
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
  high:   { color: "#ef4444", bg: "#fef2f2", label: "Cao" },
  medium: { color: "#f59e0b", bg: "#fffbeb", label: "TB" },
  low:    { color: "#22c55e", bg: "#f0fdf4", label: "Thấp" },
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
  "KTS giới thiệu": "#8b5cf6",
  "Khách hàng cũ giới thiệu": "#f97316",
  "Zalo": "#0068ff",
  "Website": "#22c55e",
  "Triển lãm": "#f59e0b",
  "Telesale": "#ec4899",
};

export default function CrmDashboardClient({ leads, todayTasks, quotes, stats, currentUser }: Props) {
  const [tasks, setTasks] = useState(todayTasks);
  const [allLeads, setAllLeads] = useState(leads);
  const [showAddModal, setShowAddModal] = useState(false);

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

  // Tính % thay đổi so với tháng trước
  const monthlyRevArr = stats.monthlyRevenue;
  const currentMonthRev = monthlyRevArr[monthlyRevArr.length - 1]?.value ?? 0;
  const prevMonthRev = monthlyRevArr[monthlyRevArr.length - 2]?.value ?? 0;
  const revenueChange = prevMonthRev > 0 ? Math.round(((currentMonthRev - prevMonthRev) / prevMonthRev) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] overflow-y-auto">

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid #e8eaed" }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500 font-medium">{dateStr}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}{currentUser?.name ? `, ${currentUser.name}` : ""} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            SmartFurni CRM — {currentUser?.isAdmin ? "Tổng quan kinh doanh B2B" : `Dữ liệu của bạn · ${ROLE_LABELS[currentUser?.role ?? ""] ?? currentUser?.role}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {overdueLeads.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <AlertCircle size={13} />
              {overdueLeads.length} KH quá hạn
            </div>
          )}
          {currentUser && (
            <Link
              href="/crm/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              {!currentUser.isAdmin && (
                <div className="text-left">
                  <div className="text-xs font-semibold text-gray-800 leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] text-gray-500 leading-tight">{currentUser.username}</div>
                </div>
              )}
            </Link>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #C9A84C 0%, #9A7A2E 100%)", letterSpacing: "0.01em" }}
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
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
            color="#6366f1"
            badge={`${stats.newLeadsThisMonth} mới tháng này`}
            badgeColor="#6366f1"
          />
          <KpiCard
            icon={DollarSign}
            label="Pipeline giá trị"
            value={totalValue >= 1e9 ? `${(totalValue/1e9).toFixed(1)}B` : totalValue >= 1e6 ? `${(totalValue/1e6).toFixed(0)}tr` : formatVND(totalValue)}
            sub={`Won: ${wonValue >= 1e9 ? `${(wonValue/1e9).toFixed(1)}B` : wonValue >= 1e6 ? `${(wonValue/1e6).toFixed(0)}tr` : formatVND(wonValue)}`}
            color="#C9A84C"
            badge={revenueChange !== 0 ? `${revenueChange > 0 ? "+" : ""}${revenueChange}% so tháng trước` : undefined}
            badgeColor={revenueChange >= 0 ? "#22c55e" : "#ef4444"}
            isText
          />
          <KpiCard
            icon={Trophy}
            label="Tỷ lệ chốt đơn"
            value={`${winRate}%`}
            sub={`${wonLeads.length} đơn thành công`}
            color="#22c55e"
            badge={`${stats.wonLeadsThisMonth} chốt tháng này`}
            badgeColor="#22c55e"
            isText
          />
          <KpiCard
            icon={AlertCircle}
            label="Cần liên hệ ngay"
            value={overdueLeads.length}
            sub="Quá 3 ngày không tương tác"
            color="#ef4444"
            urgent={overdueLeads.length > 0}
            badge={overdueLeads.length > 0 ? "Cần xử lý" : "Tốt"}
            badgeColor={overdueLeads.length > 0 ? "#ef4444" : "#22c55e"}
          />
        </div>

        {/* ── Admin: This Month Summary ─────────────────────────────────── */}
        {currentUser?.isAdmin && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 flex items-center gap-4"
              style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #C9A84C20, #9A7A2E10)" }}>
                <DollarSign size={22} style={{ color: "#C9A84C" }} />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Doanh thu tháng này</div>
                <div className="text-xl font-black text-gray-900 leading-tight mt-0.5">
                  {stats.wonValueThisMonth >= 1e9
                    ? `${(stats.wonValueThisMonth/1e9).toFixed(2)}B`
                    : stats.wonValueThisMonth >= 1e6
                    ? `${(stats.wonValueThisMonth/1e6).toFixed(0)}tr`
                    : formatVND(stats.wonValueThisMonth)}
                </div>
                <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${revenueChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {revenueChange > 0 ? <TrendingUp size={10} /> : revenueChange < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                  {revenueChange > 0 ? "+" : ""}{revenueChange}% so tháng trước
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 flex items-center gap-4"
              style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#6366f115" }}>
                <UserCheck size={22} style={{ color: "#6366f1" }} />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">KH mới tháng này</div>
                <div className="text-xl font-black text-gray-900 leading-tight mt-0.5">{stats.newLeadsThisMonth}</div>
                <div className="text-[10px] text-gray-500 mt-1">Tổng {leads.length} khách hàng</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 flex items-center gap-4"
              style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#22c55e15" }}>
                <Trophy size={22} style={{ color: "#22c55e" }} />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Đơn chốt tháng này</div>
                <div className="text-xl font-black text-gray-900 leading-tight mt-0.5">{stats.wonLeadsThisMonth}</div>
                <div className="text-[10px] text-gray-500 mt-1">Tỷ lệ chốt {winRate}%</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left col (2/3) */}
          <div className="xl:col-span-2 space-y-5">

            {/* ── Admin: Monthly Revenue Chart ── */}
            {currentUser?.isAdmin && (
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #C9A84C20, #9A7A2E10)" }}>
                      <BarChart2 size={16} style={{ color: "#C9A84C" }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Doanh thu theo tháng</h2>
                      <p className="text-[10px] text-gray-500">6 tháng gần nhất (đơn đã chốt)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-gray-900">
                      {stats.wonValueThisMonth >= 1e9
                        ? `${(stats.wonValueThisMonth/1e9).toFixed(2)}B`
                        : `${(stats.wonValueThisMonth/1e6).toFixed(0)}tr`}
                    </div>
                    <div className="text-[10px] text-gray-500">Tháng hiện tại</div>
                  </div>
                </div>
                <div className="p-6">
                  {stats.monthlyRevenue.every(m => m.value === 0) ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <BarChart2 size={32} className="mb-2 opacity-20" />
                      <p className="text-xs">Chưa có dữ liệu doanh thu</p>
                    </div>
                  ) : (
                    <div>
                      {/* Bar chart */}
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
                                <div className="text-[9px] font-bold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {valLabel}
                                </div>
                              )}
                              <div className="w-full relative flex-1 flex items-end">
                                <div className="w-full rounded-t-lg transition-all duration-700 relative overflow-hidden"
                                  style={{
                                    height: `${Math.max(6, pct)}%`,
                                    background: isCurrentMonth
                                      ? "linear-gradient(180deg, #E2C97E, #C9A84C)"
                                      : "#e5e7eb",
                                    minHeight: 6,
                                    boxShadow: isCurrentMonth ? "0 2px 8px rgba(201,168,76,0.3)" : "none",
                                  }}>
                                  {isCurrentMonth && (
                                    <div className="absolute inset-0 opacity-30"
                                      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.4), transparent)" }} />
                                  )}
                                </div>
                              </div>
                              <span className={`text-[10px] font-semibold ${isCurrentMonth ? "text-amber-600" : "text-gray-500"}`}>
                                {m.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Summary row */}
                      <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: "1px solid #f3f4f6" }}>
                        <div className="text-center p-3 rounded-xl" style={{ background: "#f9fafb" }}>
                          <div className="text-sm font-black text-gray-900">{stats.newLeadsThisMonth}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">KH mới</div>
                        </div>
                        <div className="text-center p-3 rounded-xl" style={{ background: "#f0fdf4" }}>
                          <div className="text-sm font-black text-green-700">{stats.wonLeadsThisMonth}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">Đơn chốt</div>
                        </div>
                        <div className="text-center p-3 rounded-xl" style={{ background: "#fffbeb" }}>
                          <div className="text-sm font-black" style={{ color: "#C9A84C" }}>
                            {stats.wonValueThisMonth >= 1e9
                              ? `${(stats.wonValueThisMonth/1e9).toFixed(2)}B`
                              : `${(stats.wonValueThisMonth/1e6).toFixed(0)}tr`}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">Doanh thu</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pipeline Funnel */}
            <div className="bg-white rounded-2xl overflow-hidden"
              style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#f0f4ff" }}>
                    <BarChart2 size={16} style={{ color: "#6366f1" }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Pipeline Sales</h2>
                    <p className="text-[10px] text-gray-500">Phân bổ theo giai đoạn</p>
                  </div>
                </div>
                <Link href="/crm/kanban" className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium">
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
                            <span className="text-xs font-semibold text-gray-700">{STAGE_LABELS[stage]}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-900">{count} KH</span>
                              {value > 0 && (
                                <span className="text-[10px] font-semibold" style={{ color: "#C9A84C" }}>
                                  {value >= 1e9 ? `${(value/1e9).toFixed(1)}B` : value >= 1e6 ? `${(value/1e6).toFixed(0)}tr` : formatVND(value)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
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
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fff7ed" }}>
                    <TrendingUp size={15} style={{ color: "#f97316" }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Nguồn khách hàng</h2>
                    <p className="text-[10px] text-gray-500">Hiệu quả theo nguồn</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {stats.bySource.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Chưa có dữ liệu</p>
                  ) : stats.bySource.slice(0, 5).map(({ source, count, wonCount }) => {
                    const wr = count > 0 ? Math.round((wonCount / count) * 100) : 0;
                    const maxCount = Math.max(...stats.bySource.map(s => s.count), 1);
                    const color = SOURCE_COLORS[source] || "#6b7280";
                    return (
                      <div key={source}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[110px]">{source}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">{count} KH</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: wr >= 30 ? "#dcfce7" : "#f3f4f6",
                                color: wr >= 30 ? "#16a34a" : "#6b7280",
                              }}>
                              {wr}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(count / maxCount) * 100}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Type */}
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f5f3ff" }}>
                    <PieChart size={15} style={{ color: "#8b5cf6" }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Phân loại khách</h2>
                    <p className="text-[10px] text-gray-500">Theo nhóm đối tượng</p>
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
                      <div key={type} className="p-3 rounded-xl transition-colors hover:opacity-90"
                        style={{ background: `${TYPE_COLORS[type]}08`, border: `1px solid ${TYPE_COLORS[type]}20` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                              style={{ background: TYPE_COLORS[type] }}>
                              {count}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-800">{TYPE_LABELS[type]}</div>
                              <div className="text-[10px] text-gray-500">{pct}% · {wonCount} đã chốt</div>
                            </div>
                          </div>
                          {typeValue > 0 && (
                            <div className="text-[10px] font-bold text-right" style={{ color: TYPE_COLORS[type] }}>
                              {typeValue >= 1e9 ? `${(typeValue/1e9).toFixed(1)}B` : typeValue >= 1e6 ? `${(typeValue/1e6).toFixed(0)}tr` : formatVND(typeValue)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Admin: Staff Performance Table ── */}
            {currentUser?.isAdmin && stats.staffPerformance.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#fefce8" }}>
                      <Trophy size={16} style={{ color: "#ca8a04" }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Hiệu suất nhân viên</h2>
                      <p className="text-[10px] text-gray-500">Xếp hạng theo doanh số</p>
                    </div>
                  </div>
                  <Link href="/crm/staff" className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                    Quản lý nhân viên <ArrowUpRight size={12} />
                  </Link>
                </div>
                {/* Table header */}
                <div className="px-6 py-2 grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide"
                  style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Nhân viên</div>
                  <div className="col-span-2 text-center">KH phụ trách</div>
                  <div className="col-span-2 text-center">Đã chốt</div>
                  <div className="col-span-2 text-center">Tỷ lệ</div>
                  <div className="col-span-2 text-right">Doanh số</div>
                </div>
                <div className="divide-y divide-gray-50">
                  {stats.staffPerformance.slice(0, 8).map((s, i) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const maxWonValue = Math.max(...stats.staffPerformance.map(x => x.wonValue), 1);
                    const barPct = maxWonValue > 0 ? (s.wonValue / maxWonValue) * 100 : 0;
                    const isTop = i === 0;
                    return (
                      <div key={s.staffName}
                        className="px-6 py-3 grid grid-cols-12 gap-2 items-center hover:bg-gray-50 transition-colors"
                        style={{ background: isTop ? "#fffbeb" : undefined }}>
                        <div className="col-span-1 text-sm">{medals[i] ?? <span className="text-xs font-bold text-gray-400">{i+1}</span>}</div>
                        <div className="col-span-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                              style={{ background: isTop ? "linear-gradient(135deg, #C9A84C, #9A7A2E)" : "#e5e7eb", color: isTop ? "white" : "#6b7280" }}>
                              {s.staffName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-gray-800 truncate">{s.staffName}</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-xs font-bold text-gray-700">{s.leadsCount}</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-xs font-bold text-green-600">{s.wonCount}</span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: s.conversionRate >= 40 ? "#dcfce7" : s.conversionRate >= 20 ? "#fefce8" : "#f3f4f6",
                              color: s.conversionRate >= 40 ? "#16a34a" : s.conversionRate >= 20 ? "#ca8a04" : "#6b7280",
                            }}>
                            {s.conversionRate}%
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <div className="text-xs font-black" style={{ color: isTop ? "#C9A84C" : "#374151" }}>
                            {s.wonValue >= 1e9 ? `${(s.wonValue/1e9).toFixed(1)}B` : s.wonValue >= 1e6 ? `${(s.wonValue/1e6).toFixed(0)}tr` : `${(s.wonValue/1000).toFixed(0)}k`}
                          </div>
                          <div className="w-full h-1 rounded-full mt-1 overflow-hidden" style={{ background: "#f3f4f6" }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${barPct}%`, background: isTop ? "linear-gradient(90deg, #C9A84C, #9A7A2E)" : "#d1d5db" }} />
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
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f0fdf4" }}>
                      <Activity size={15} style={{ color: "#22c55e" }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Hoạt động gần đây</h2>
                      <p className="text-[10px] text-gray-500">10 hoạt động mới nhất</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {stats.recentActivities.slice(0, 6).map((act) => {
                    const IconComp = ACTIVITY_TYPE_ICONS[act.type] || FileText;
                    const actColors: Record<string, { bg: string; color: string }> = {
                      call: { bg: "#eff6ff", color: "#3b82f6" },
                      meeting: { bg: "#f5f3ff", color: "#8b5cf6" },
                      email: { bg: "#fff7ed", color: "#f97316" },
                      note: { bg: "#f9fafb", color: "#6b7280" },
                      quote_sent: { bg: "#fefce8", color: "#ca8a04" },
                      contract: { bg: "#f0fdf4", color: "#22c55e" },
                    };
                    const c = actColors[act.type] || { bg: "#f9fafb", color: "#6b7280" };
                    const timeAgo = (() => {
                      const diff = Date.now() - new Date(act.createdAt).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 60) return `${mins}p trước`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs}h trước`;
                      return `${Math.floor(hrs / 24)}n trước`;
                    })();
                    return (
                      <div key={act.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: c.bg }}>
                          <IconComp size={13} style={{ color: c.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{act.title}</p>
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{act.content}</p>
                        </div>
                        <div className="flex-shrink-0 text-[10px] text-gray-400 mt-0.5">{timeAgo}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Quotes */}
            <div className="bg-white rounded-2xl overflow-hidden"
              style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f0fdf4" }}>
                    <FileText size={15} style={{ color: "#22c55e" }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Báo giá gần đây</h2>
                    <p className="text-[10px] text-gray-500">{quotes.length} báo giá</p>
                  </div>
                </div>
                <Link href="/crm/quotes" className="text-[10px] text-indigo-500 hover:underline font-medium flex items-center gap-0.5">
                  Tất cả <ArrowUpRight size={10} />
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {quotes.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <FileText size={22} className="mx-auto mb-1.5 opacity-20" />
                    <p className="text-xs">Chưa có báo giá</p>
                  </div>
                ) : quotes.slice(0, 4).map(q => {
                  const statusConfig = {
                    draft:    { label: "Nháp",      color: "#6b7280", bg: "#f9fafb" },
                    sent:     { label: "Đã gửi",    color: "#3b82f6", bg: "#eff6ff" },
                    accepted: { label: "Chấp nhận", color: "#22c55e", bg: "#f0fdf4" },
                    rejected: { label: "Từ chối",   color: "#ef4444", bg: "#fef2f2" },
                  }[q.status];
                  return (
                    <Link key={q.id} href={`/crm/quotes/${q.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900">{q.quoteNumber}</div>
                        <div className="text-[10px] text-gray-500 truncate">{q.leadName}</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-xs font-bold" style={{ color: "#C9A84C" }}>
                          {q.total >= 1e9 ? `${(q.total/1e9).toFixed(1)}B` : q.total >= 1e6 ? `${(q.total/1e6).toFixed(0)}tr` : formatVND(q.total)}
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: statusConfig.bg, color: statusConfig.color }}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {quotes.length > 0 && (
                <div className="px-5 py-3" style={{ borderTop: "1px solid #f3f4f6" }}>
                  <Link href="/crm/quotes/new"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-amber-50"
                    style={{ border: "1px dashed #C9A84C", color: "#C9A84C" }}>
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
            <div className="bg-white rounded-2xl overflow-hidden"
              style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fefce8" }}>
                    <CheckSquare size={15} style={{ color: "#ca8a04" }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Việc hôm nay</h2>
                    <p className="text-[10px] text-gray-500">{doneTasks.length}/{tasks.length} hoàn thành</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/crm/tasks" className="text-xs font-medium hover:underline" style={{ color: "#C9A84C" }}>Xem tất cả</Link>
                  {pendingTasks.length > 0 && (
                    <span className="text-xs font-black px-2 py-0.5 rounded-full text-amber-700"
                      style={{ background: "#fef3c7" }}>
                      {pendingTasks.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {tasks.length > 0 && (
                <div className="px-5 pt-3 pb-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0}%`,
                        background: "linear-gradient(90deg, #22c55e, #16a34a)",
                      }} />
                  </div>
                </div>
              )}

              <div className="p-4 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: "#f9fafb" }}>
                      <CheckSquare size={18} className="text-gray-600" />
                    </div>
                    <p className="text-xs text-gray-500">Không có việc hôm nay</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Tận hưởng ngày của bạn! 🎉</p>
                  </div>
                ) : (
                  tasks.map(task => {
                    const pc = PRIORITY_CONFIG[task.priority];
                    return (
                      <div key={task.id}
                        className="flex items-start gap-2.5 p-3 rounded-xl transition-all"
                        style={{
                          background: task.done ? "#fafafa" : "#fff",
                          border: `1px solid ${task.done ? "#f3f4f6" : "#e8eaed"}`,
                        }}>
                        <button onClick={() => toggleTask(task)}
                          className="flex-shrink-0 mt-0.5 rounded-md transition-all flex items-center justify-center"
                          style={{
                            width: 18, height: 18,
                            border: `2px solid ${task.done ? "#22c55e" : "#d1d5db"}`,
                            background: task.done ? "#22c55e" : "transparent",
                          }}>
                          {task.done && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold leading-snug ${task.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {task.title}
                          </p>
                          <Link href={`/crm/leads/${task.leadId}`}
                            className="text-[10px] font-medium hover:underline mt-0.5 block truncate"
                            style={{ color: "#C9A84C" }}>
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
              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ border: "1px solid #fecaca", boxShadow: "0 1px 3px rgba(239,68,68,0.08)" }}>
                <div className="px-5 py-4 flex items-center justify-between"
                  style={{ background: "linear-gradient(135deg, #fef2f2, #fff)", borderBottom: "1px solid #fecaca" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fee2e2" }}>
                      <Zap size={14} style={{ color: "#ef4444" }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-red-700">Cần liên hệ ngay</h2>
                      <p className="text-[10px] text-red-400">Quá 3 ngày không tương tác</p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full text-red-600" style={{ background: "#fee2e2" }}>
                    {overdueLeads.length}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {overdueLeads.slice(0, 5).map(lead => {
                    const daysAgo = Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={lead.id} href={`/crm/leads/${lead.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-red-50 transition-colors group"
                        style={{ border: "1px solid #fee2e2" }}>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-900 truncate">{lead.name}</div>
                          <div className="text-[10px] text-gray-500 truncate">{lead.company || STAGE_LABELS[lead.stage]}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md" style={{ background: "#fee2e2" }}>
                            <Clock size={9} style={{ color: "#ef4444" }} />
                            <span className="text-[10px] font-black text-red-500">{daysAgo}n</span>
                          </div>
                          <ChevronRight size={12} className="text-gray-400 group-hover:text-red-400 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl overflow-hidden"
              style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
                <h2 className="text-sm font-bold text-gray-900">Thống kê nhanh</h2>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: "Đang thương thảo", value: (stats.byStage["negotiating"] || 0), color: "#f97316", icon: Target },
                  { label: "Đã báo giá", value: (stats.byStage["quoted"] || 0), color: "#f59e0b", icon: FileText },
                  { label: "Đã khảo sát", value: (stats.byStage["surveyed"] || 0), color: "#8b5cf6", icon: Briefcase },
                  { label: "Đã gửi Profile", value: (stats.byStage["profile_sent"] || 0), color: "#3b82f6", icon: Mail },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                        <Icon size={12} style={{ color }} />
                      </div>
                      <span className="text-xs text-gray-700 font-medium">{label}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl overflow-hidden"
              style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
                <h2 className="text-sm font-bold text-gray-900">Truy cập nhanh</h2>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { href: "/crm/leads", label: "Khách hàng", icon: Users, color: "#6366f1" },
                  { href: "/crm/kanban", label: "Kanban", icon: BarChart2, color: "#f97316" },
                  { href: "/crm/quotes/new", label: "Báo giá mới", icon: FileText, color: "#22c55e" },
                  { href: "/crm/calendar", label: "Lịch hẹn", icon: Calendar, color: "#3b82f6" },
                  ...(currentUser?.isAdmin ? [
                    { href: "/crm/reports", label: "Báo cáo", icon: TrendingUp, color: "#8b5cf6" },
                    { href: "/crm/staff", label: "Nhân viên", icon: Award, color: "#C9A84C" },
                  ] : []),
                ].map(({ href, label, icon: Icon, color }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-2 p-3 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                      <Icon size={12} style={{ color }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{label}</span>
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
  badge?: string;
  badgeColor?: string;
  isText?: boolean;
  urgent?: boolean;
}

function KpiCard({ icon: Icon, label, value, sub, color, badge, badgeColor, urgent }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 relative overflow-hidden transition-all hover:shadow-md"
      style={{
        border: urgent ? `1px solid ${color}40` : "1px solid #e8eaed",
        boxShadow: urgent ? `0 1px 3px ${color}15` : "0 1px 3px rgba(0,0,0,0.04)",
      }}>
      {urgent && <div className="absolute inset-0 opacity-[0.02]" style={{ background: color }} />}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}12` }}>
          <Icon size={20} style={{ color }} />
        </div>
        {urgent && (
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        )}
      </div>
      <div className="text-2xl font-black text-gray-900 leading-none mb-1">{value}</div>
      <div className="text-xs font-semibold text-gray-600 mb-1">{label}</div>
      <div className="text-[10px] text-gray-500 truncate">{sub}</div>
      {badge && (
        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
          style={{ background: `${badgeColor}15`, color: badgeColor }}>
          {badge}
        </div>
      )}
    </div>
  );
}
