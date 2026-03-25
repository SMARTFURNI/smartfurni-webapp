"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, TrendingUp, FileText, CheckSquare, AlertCircle,
  Phone, Clock, ChevronRight, BarChart3, Target, Award,
} from "lucide-react";
import type { Lead, CrmTask, Quote, CrmStats } from "@/lib/crm-store";
import { STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS, formatVND, isOverdue } from "@/lib/crm-store";

interface Props {
  leads: Lead[];
  todayTasks: CrmTask[];
  quotes: Quote[];
  stats: CrmStats;
}

export default function CrmDashboardClient({ leads, todayTasks, quotes, stats }: Props) {
  const [tasks, setTasks] = useState(todayTasks);

  const overdueLeads = leads.filter(isOverdue);
  const wonLeads = leads.filter(l => l.stage === "won");
  const activeLeads = leads.filter(l => !["won", "lost"].includes(l.stage));
  const pendingTasks = tasks.filter(t => !t.done);

  async function toggleTask(task: CrmTask) {
    const updated = { ...task, done: !task.done };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    await fetch(`/api/crm/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#f0f2f5" }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <h1 className="text-xl font-bold text-gray-900">Tổng quan CRM</h1>
        <p className="text-sm text-gray-500 mt-0.5">SmartFurni B2B Sales Dashboard</p>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Users} label="Tổng khách hàng" value={leads.length.toString()} sub="tất cả giai đoạn" color="#3b82f6" />
          <KpiCard icon={Target} label="Đang theo dõi" value={activeLeads.length.toString()} sub="chưa chốt/thất bại" color="#C9A84C" />
          <KpiCard icon={Award} label="Đã chốt (Won)" value={wonLeads.length.toString()} sub={formatVND(wonLeads.reduce((s, l) => s + l.expectedValue, 0))} color="#22c55e" />
          <KpiCard icon={AlertCircle} label="Quá hạn tương tác" value={overdueLeads.length.toString()} sub="cần liên hệ ngay" color="#ef4444" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Charts */}
          <div className="lg:col-span-2 space-y-4">
            {/* Pipeline by stage */}
            <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900">Pipeline theo giai đoạn</h2>
              </div>
              <div className="space-y-2.5">
                {(Object.keys(STAGE_LABELS) as Array<keyof typeof STAGE_LABELS>).map(stage => {
                  const count = leads.filter(l => l.stage === stage).length;
                  const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                  const value = leads.filter(l => l.stage === stage).reduce((s, l) => s + l.expectedValue, 0);
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                          <span className="font-medium text-gray-700">{STAGE_LABELS[stage]}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{count} KH</span>
                          {value > 0 && <span className="font-semibold" style={{ color: "#C9A84C" }}>{formatVND(value)}</span>}
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: STAGE_COLORS[stage] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Source breakdown */}
            <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900">Nguồn khách hàng hiệu quả nhất</h2>
              </div>
              <div className="space-y-2.5">
                {stats.bySource.map(({ source, count, wonCount, totalValue }) => {
                  const winRate = count > 0 ? Math.round((wonCount / count) * 100) : 0;
                  const maxCount = Math.max(...stats.bySource.map(s => s.count), 1);
                  return (
                    <div key={source}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{source}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{count} KH</span>
                          <span className="text-green-600 font-semibold">Win {winRate}%</span>
                          {totalValue > 0 && <span style={{ color: "#C9A84C" }} className="font-semibold">{formatVND(totalValue)}</span>}
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                        <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, background: "#C9A84C" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer type breakdown */}
            <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900">Phân loại khách hàng</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["architect", "investor", "dealer"] as const).map(type => {
                  const count = leads.filter(l => l.type === type).length;
                  const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                  return (
                    <div key={type} className="text-center p-3 rounded-xl"
                      style={{ background: `${TYPE_COLORS[type]}08`, border: `1px solid ${TYPE_COLORS[type]}20` }}>
                      <div className="text-2xl font-black" style={{ color: TYPE_COLORS[type] }}>{count}</div>
                      <div className="text-xs font-medium text-gray-700 mt-0.5">{TYPE_LABELS[type]}</div>
                      <div className="text-xs text-gray-400">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Today's tasks + Overdue */}
          <div className="space-y-4">
            {/* Today tasks */}
            <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare size={18} className="text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Việc cần làm hôm nay</h2>
                </div>
                {pendingTasks.length > 0 && (
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {pendingTasks.length}
                  </span>
                )}
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckSquare size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Không có việc hôm nay</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl transition-colors"
                      style={{ background: task.done ? "#f9fafb" : "#fff", border: "1px solid #f3f4f6" }}>
                      <button onClick={() => toggleTask(task)}
                        className="w-4.5 h-4.5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ borderColor: task.done ? "#22c55e" : "#d1d5db", background: task.done ? "#22c55e" : "transparent", minWidth: "18px", minHeight: "18px" }}>
                        {task.done && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-snug ${task.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                          {task.title}
                        </p>
                        <Link href={`/crm/leads/${task.leadId}`}
                          className="text-[10px] text-amber-600 hover:underline truncate block mt-0.5">
                          {task.leadName}
                        </Link>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" }[task.priority] }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue leads */}
            {overdueLeads.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #fca5a5" }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-red-500" />
                  <h2 className="font-semibold text-red-700">Cần liên hệ ngay</h2>
                  <span className="text-xs font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full ml-auto">
                    {overdueLeads.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {overdueLeads.slice(0, 5).map(lead => {
                    const daysAgo = Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={lead.id} href={`/crm/leads/${lead.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-red-50 transition-colors"
                        style={{ border: "1px solid #fee2e2" }}>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-900 truncate">{lead.name}</div>
                          <div className="text-[10px] text-gray-500">{STAGE_LABELS[lead.stage]}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <Clock size={11} className="text-red-400" />
                          <span className="text-[10px] font-bold text-red-500">{daysAgo}n</span>
                          <ChevronRight size={11} className="text-gray-300" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent quotes */}
            <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Báo giá gần đây</h2>
                </div>
                <Link href="/crm/quotes" className="text-xs text-amber-600 hover:underline">Xem tất cả</Link>
              </div>
              {quotes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Chưa có báo giá</p>
              ) : (
                <div className="space-y-2">
                  {quotes.slice(0, 4).map(q => {
                    const statusColor = { draft: "#6b7280", sent: "#3b82f6", accepted: "#22c55e", rejected: "#ef4444" }[q.status];
                    return (
                      <Link key={q.id} href={`/crm/quotes/${q.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50/30 transition-colors"
                        style={{ border: "1px solid #f3f4f6" }}>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-900">{q.quoteNumber}</div>
                          <div className="text-[10px] text-gray-500 truncate">{q.leadName}</div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-xs font-bold" style={{ color: "#C9A84C" }}>{formatVND(q.total)}</div>
                          <div className="text-[10px] font-semibold" style={{ color: statusColor }}>
                            {{ draft: "Nháp", sent: "Đã gửi", accepted: "Chấp nhận", rejected: "Từ chối" }[q.status]}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className="text-xs font-semibold text-gray-700 mt-0.5">{label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</div>
    </div>
  );
}
