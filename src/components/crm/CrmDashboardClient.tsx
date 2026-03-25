"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, TrendingUp, FileText, CheckSquare, AlertCircle,
  Clock, ChevronRight, Target, Award, DollarSign,
  Phone, Mail, Calendar, ArrowUpRight, Zap, Activity,
  BarChart2, PieChart, Plus, RefreshCw,
} from "lucide-react";
import type { Lead, CrmTask, Quote, CrmStats } from "@/lib/crm-store";
import { STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS, formatVND, isOverdue } from "@/lib/crm-store";

interface Props {
  leads: Lead[];
  todayTasks: CrmTask[];
  quotes: Quote[];
  stats: CrmStats;
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

export default function CrmDashboardClient({ leads, todayTasks, quotes, stats }: Props) {
  const [tasks, setTasks] = useState(todayTasks);
  const [refreshing, setRefreshing] = useState(false);

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
          <h1 className="text-2xl font-bold text-gray-900">{greeting} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">SmartFurni CRM — Tổng quan kinh doanh B2B</p>
        </div>
        <div className="flex items-center gap-3">
          {overdueLeads.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <AlertCircle size={13} />
              {overdueLeads.length} KH quá hạn
            </div>
          )}
          <Link href="/crm/leads/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-gray-900 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}>
            <Plus size={13} />
            Thêm khách hàng
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* ── KPI Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users} label="Tổng khách hàng" value={leads.length}
            sub={`${activeLeads.length} đang theo dõi`}
            color="#6366f1" trend={null}
          />
          <KpiCard
            icon={DollarSign} label="Tổng giá trị pipeline" value={formatVND(totalValue)}
            sub={`Won: ${formatVND(wonValue)}`}
            color="#C9A84C" trend={null} isText
          />
          <KpiCard
            icon={Award} label="Tỷ lệ chốt" value={`${winRate}%`}
            sub={`${wonLeads.length} đơn thành công`}
            color="#22c55e" trend={null} isText
          />
          <KpiCard
            icon={AlertCircle} label="Cần liên hệ ngay" value={overdueLeads.length}
            sub="Quá 3 ngày không tương tác"
            color="#ef4444" trend={null} urgent={overdueLeads.length > 0}
          />
        </div>

        {/* ── Main Grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left col (2/3) */}
          <div className="xl:col-span-2 space-y-5">

            {/* Pipeline Funnel */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f0f4ff" }}>
                    <BarChart2 size={15} style={{ color: "#6366f1" }} />
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
                    const count = leads.filter(l => l.stage === stage).length;
                    const value = leads.filter(l => l.stage === stage).reduce((s, l) => s + (l.expectedValue || 0), 0);
                    const maxCount = Math.max(...Object.keys(STAGE_LABELS).map(s => leads.filter(l => l.stage === s).length), 1);
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-gray-900 flex-shrink-0"
                          style={{ background: STAGE_COLORS[stage] }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700">{STAGE_LABELS[stage]}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-900">{count} KH</span>
                              {value > 0 && (
                                <span className="text-[10px] font-semibold" style={{ color: "#C9A84C" }}>
                                  {formatVND(value)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: STAGE_COLORS[stage], opacity: count === 0 ? 0.2 : 1 }} />
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
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
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
                    const winRate = count > 0 ? Math.round((wonCount / count) * 100) : 0;
                    const maxCount = Math.max(...stats.bySource.map(s => s.count), 1);
                    const sourceColors: Record<string, string> = {
                      "Facebook Ads": "#1877f2",
                      "Google Ads": "#ea4335",
                      "KTS giới thiệu": "#8b5cf6",
                      "Zalo": "#0068ff",
                      "Triển lãm": "#f59e0b",
                      "Website": "#22c55e",
                    };
                    const color = sourceColors[source] || "#6b7280";
                    return (
                      <div key={source}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{source}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">{count} KH</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: winRate >= 30 ? "#dcfce7" : "#f3f4f6", color: winRate >= 30 ? "#16a34a" : "#6b7280" }}>
                              {winRate}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                          <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Type */}
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
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
                    const count = leads.filter(l => l.type === type).length;
                    const wonCount = leads.filter(l => l.type === type && l.stage === "won").length;
                    const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                    const typeValue = leads.filter(l => l.type === type).reduce((s, l) => s + (l.expectedValue || 0), 0);
                    return (
                      <div key={type} className="p-3 rounded-xl" style={{ background: `${TYPE_COLORS[type]}08`, border: `1px solid ${TYPE_COLORS[type]}18` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                              style={{ background: TYPE_COLORS[type], opacity: 0.9 }}>
                              <span className="text-gray-900 text-[9px] font-black">{count}</span>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-800">{TYPE_LABELS[type]}</div>
                              <div className="text-[10px] text-gray-500">{pct}% · {wonCount} đã chốt</div>
                            </div>
                          </div>
                          {typeValue > 0 && (
                            <div className="text-[10px] font-semibold text-right" style={{ color: TYPE_COLORS[type] }}>
                              {formatVND(typeValue)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            {stats.recentActivities.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
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
                  {stats.recentActivities.slice(0, 5).map((act) => {
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
                        <div className="flex-shrink-0 text-[10px] text-gray-500 mt-0.5">{timeAgo}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right col (1/3) */}
          <div className="space-y-5">

            {/* Today's Tasks */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
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
                {pendingTasks.length > 0 && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full text-amber-700"
                    style={{ background: "#fef3c7" }}>
                    {pendingTasks.length}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {tasks.length > 0 && (
                <div className="px-5 pt-3 pb-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0}%`, background: "#22c55e" }} />
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
                        style={{ background: task.done ? "#fafafa" : "#fff", border: `1px solid ${task.done ? "#f3f4f6" : "#e8eaed"}` }}>
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
                          <p className={`text-xs font-semibold leading-snug ${task.done ? "line-through text-gray-500" : "text-gray-800"}`}>
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
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #fecaca", boxShadow: "0 1px 3px rgba(239,68,68,0.08)" }}>
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
                          <ChevronRight size={12} className="text-gray-600 group-hover:text-red-400 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Quotes */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
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
                        <div className="text-xs font-bold" style={{ color: "#C9A84C" }}>{formatVND(q.total)}</div>
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
  trend: number | null;
  isText?: boolean;
  urgent?: boolean;
}

function KpiCard({ icon: Icon, label, value, sub, color, urgent }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 relative overflow-hidden transition-shadow hover:shadow-md"
      style={{ border: urgent ? `1px solid ${color}40` : "1px solid #e8eaed", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {urgent && <div className="absolute inset-0 opacity-[0.03]" style={{ background: color }} />}
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {urgent && (
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        )}
      </div>
      <div className="text-2xl font-black text-gray-900 leading-none mb-1">{value}</div>
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      <div className="text-[10px] text-gray-500 mt-0.5 truncate">{sub}</div>
    </div>
  );
}
