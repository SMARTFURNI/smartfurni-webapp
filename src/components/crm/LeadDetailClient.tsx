"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, User, Store,
  Calendar, Edit3, Trash2, Plus, CheckSquare, FileText,
  Clock, MessageSquare, Users, Send, FileCheck, Loader2,
  ChevronDown, AlertCircle, Tag, DollarSign, Home, X,
} from "lucide-react";
import type { Lead, Activity, Quote, CrmTask, LeadStage, ActivityType } from "@/lib/crm-store";
import {
  STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS,
  ACTIVITY_LABELS, DISTRICTS, SOURCES, formatVND, isOverdue,
} from "@/lib/crm-store";

interface Props {
  lead: Lead;
  initialActivities: Activity[];
  initialQuotes: Quote[];
  initialTasks: CrmTask[];
}

const TABS = ["timeline", "quotes", "tasks", "info"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  timeline: "Lịch sử",
  quotes: "Báo giá",
  tasks: "Việc cần làm",
  info: "Thông tin",
};

const ACTIVITY_TYPE_ICONS: Record<ActivityType, React.ElementType> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  note: MessageSquare,
  quote_sent: Send,
  contract: FileCheck,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  call: "#22c55e",
  meeting: "#3b82f6",
  email: "#8b5cf6",
  note: "#f59e0b",
  quote_sent: "#f97316",
  contract: "#06b6d4",
};

export default function LeadDetailClient({ lead: initialLead, initialActivities, initialQuotes, initialTasks }: Props) {
  const [lead, setLead] = useState(initialLead);
  const [activities, setActivities] = useState(initialActivities);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState<Tab>("timeline");
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);

  const overdue = isOverdue(lead);
  const TypeIcon = lead.type === "architect" ? User : lead.type === "investor" ? Building2 : Store;

  async function changeStage(stage: LeadStage) {
    setShowStageMenu(false);
    const prev = lead.stage;
    setLead(l => ({ ...l, stage }));
    try {
      await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
    } catch {
      setLead(l => ({ ...l, stage: prev }));
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#f0f2f5" }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-6 py-4"
        style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/crm/kanban"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} />
            Kanban
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
              {lead.company && <span className="text-sm text-gray-500">{lead.company}</span>}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${TYPE_COLORS[lead.type]}15`, color: TYPE_COLORS[lead.type] }}>
                {TYPE_LABELS[lead.type]}
              </span>
              {overdue && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  <AlertCircle size={11} /> Quá hạn tương tác
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stage selector */}
            <div className="relative">
              <button
                onClick={() => setShowStageMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: `${STAGE_COLORS[lead.stage]}15`, color: STAGE_COLORS[lead.stage], border: `1px solid ${STAGE_COLORS[lead.stage]}30` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[lead.stage] }} />
                {STAGE_LABELS[lead.stage]}
                <ChevronDown size={14} />
              </button>
              {showStageMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl z-50 py-1 min-w-[180px]"
                  style={{ border: "1px solid #e5e7eb" }}>
                  {(Object.keys(STAGE_LABELS) as LeadStage[]).map(s => (
                    <button key={s} onClick={() => changeStage(s)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-left">
                      <div className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[s] }} />
                      {STAGE_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setShowEditLead(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Edit3 size={14} /> Sửa
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Left: Main content */}
        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          {/* Quick info cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <InfoCard icon={DollarSign} label="Giá trị dự kiến" value={formatVND(lead.expectedValue)} color="#C9A84C" />
            <InfoCard icon={Home} label="Số căn" value={lead.unitCount > 0 ? `${lead.unitCount} căn` : "—"} color="#3b82f6" />
            <InfoCard icon={MapPin} label="Khu vực" value={lead.district || "—"} color="#8b5cf6" />
            <InfoCard icon={Tag} label="Nguồn" value={lead.source} color="#22c55e" />
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ border: "1px solid #e5e7eb" }}>
            <div className="flex border-b border-gray-100">
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="flex-1 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: activeTab === tab ? "#C9A84C" : "#6b7280",
                    borderBottom: activeTab === tab ? "2px solid #C9A84C" : "2px solid transparent",
                    background: activeTab === tab ? "#fffbf0" : "transparent",
                  }}>
                  {TAB_LABELS[tab]}
                  {tab === "timeline" && activities.length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                      {activities.length}
                    </span>
                  )}
                  {tab === "tasks" && tasks.filter(t => !t.done).length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      {tasks.filter(t => !t.done).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Timeline */}
              {activeTab === "timeline" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Lịch sử tương tác</h3>
                    <button onClick={() => setShowAddActivity(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
                      style={{ background: "#C9A84C" }}>
                      <Plus size={14} /> Thêm hoạt động
                    </button>
                  </div>

                  {activities.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Clock size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Chưa có hoạt động nào</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((act, idx) => {
                        const Icon = ACTIVITY_TYPE_ICONS[act.type];
                        const color = ACTIVITY_COLORS[act.type];
                        return (
                          <div key={act.id} className="flex gap-3">
                            {/* Timeline line */}
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: `${color}15`, border: `1.5px solid ${color}40` }}>
                                <Icon size={14} style={{ color }} />
                              </div>
                              {idx < activities.length - 1 && (
                                <div className="w-px flex-1 mt-1" style={{ background: "#e5e7eb", minHeight: "16px" }} />
                              )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                    style={{ background: `${color}15`, color }}>
                                    {ACTIVITY_LABELS[act.type]}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-2">
                                    {new Date(act.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {act.createdBy && <span className="text-xs text-gray-400 ml-1">· {act.createdBy}</span>}
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!confirm("Xóa hoạt động này?")) return;
                                    await fetch(`/api/crm/activities/${act.id}`, { method: "DELETE" });
                                    setActivities(prev => prev.filter(a => a.id !== act.id));
                                  }}
                                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              {act.title && <p className="text-sm font-medium text-gray-800 mt-1">{act.title}</p>}
                              {act.content && <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{act.content}</p>}
                              {act.attachments?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {act.attachments.map((att, i) => (
                                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                                      <FileText size={11} /> {att.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Quotes */}
              {activeTab === "quotes" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Báo giá</h3>
                    <Link href={`/crm/quotes/new?leadId=${lead.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
                      style={{ background: "#C9A84C" }}>
                      <Plus size={14} /> Tạo báo giá
                    </Link>
                  </div>
                  {quotes.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <FileText size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Chưa có báo giá nào</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quotes.map(q => (
                        <Link key={q.id} href={`/crm/quotes/${q.id}`}
                          className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                          <div>
                            <div className="font-semibold text-sm text-gray-900">{q.quoteNumber}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{q.items.length} sản phẩm · {new Date(q.createdAt).toLocaleDateString("vi-VN")}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm" style={{ color: "#C9A84C" }}>{formatVND(q.total)}</div>
                            <QuoteStatusBadge status={q.status} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tasks */}
              {activeTab === "tasks" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Việc cần làm</h3>
                    <button onClick={() => setShowAddTask(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
                      style={{ background: "#C9A84C" }}>
                      <Plus size={14} /> Thêm việc
                    </button>
                  </div>
                  {tasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Chưa có việc cần làm</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map(task => (
                        <TaskItem key={task.id} task={task}
                          onToggle={async () => {
                            const updated = { ...task, done: !task.done };
                            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
                            await fetch(`/api/crm/tasks/${task.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ done: !task.done }),
                            });
                          }}
                          onDelete={async () => {
                            if (!confirm("Xóa việc này?")) return;
                            setTasks(prev => prev.filter(t => t.id !== task.id));
                            await fetch(`/api/crm/tasks/${task.id}`, { method: "DELETE" });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Info */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <InfoRow label="Số điện thoại" value={lead.phone} />
                  <InfoRow label="Email" value={lead.email || "—"} />
                  <InfoRow label="Tên dự án" value={lead.projectName || "—"} />
                  <InfoRow label="Địa chỉ dự án" value={lead.projectAddress || "—"} />
                  <InfoRow label="Sales phụ trách" value={lead.assignedTo || "—"} />
                  <InfoRow label="Ngày tạo" value={new Date(lead.createdAt).toLocaleDateString("vi-VN")} />
                  {lead.notes && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ghi chú</div>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">{lead.notes}</p>
                    </div>
                  )}
                  {lead.lostReason && (
                    <div>
                      <div className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Lý do thất bại</div>
                      <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{lead.lostReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Side panel */}
        <div className="w-72 flex-shrink-0 p-4 overflow-y-auto hidden lg:block">
          <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
            <h3 className="font-semibold text-sm text-gray-900 mb-3">Liên hệ nhanh</h3>
            <div className="space-y-2">
              <a href={`tel:${lead.phone}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-green-50 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Phone size={14} className="text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Gọi điện</div>
                  <div className="text-sm font-medium text-gray-900">{lead.phone}</div>
                </div>
              </a>
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{lead.email}</div>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddActivity && (
        <AddActivityModal
          leadId={lead.id}
          onClose={() => setShowAddActivity(false)}
          onCreated={act => {
            setActivities(prev => [act, ...prev]);
            setShowAddActivity(false);
          }}
        />
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <AddTaskModal
          leadId={lead.id}
          leadName={lead.name}
          onClose={() => setShowAddTask(false)}
          onCreated={task => {
            setTasks(prev => [task, ...prev]);
            setShowAddTask(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color }} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-sm font-bold text-gray-900 truncate">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: "1px solid #f9fafb" }}>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  );
}

function QuoteStatusBadge({ status }: { status: Quote["status"] }) {
  const map = {
    draft: { label: "Nháp", color: "#6b7280" },
    sent: { label: "Đã gửi", color: "#3b82f6" },
    accepted: { label: "Chấp nhận", color: "#22c55e" },
    rejected: { label: "Từ chối", color: "#ef4444" },
  };
  const s = map[status];
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
      style={{ background: `${s.color}15`, color: s.color }}>
      {s.label}
    </span>
  );
}

function TaskItem({ task, onToggle, onDelete }: { task: CrmTask; onToggle: () => void; onDelete: () => void }) {
  const isOverdueTask = !task.done && new Date(task.dueDate) < new Date();
  const priorityColor = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" }[task.priority];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border transition-all"
      style={{ borderColor: isOverdueTask ? "#fca5a5" : "#f3f4f6", background: task.done ? "#f9fafb" : "#fff" }}>
      <button onClick={onToggle}
        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ borderColor: task.done ? "#22c55e" : "#d1d5db", background: task.done ? "#22c55e" : "transparent" }}>
        {task.done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.done ? "line-through text-gray-400" : "text-gray-900"}`}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: isOverdueTask ? "#ef4444" : "#9ca3af" }}>
            {new Date(task.dueDate).toLocaleDateString("vi-VN")}
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: priorityColor }} />
        </div>
      </div>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function AddActivityModal({ leadId, onClose, onCreated }: { leadId: string; onClose: () => void; onCreated: (a: Activity) => void }) {
  const [type, setType] = useState<ActivityType>("call");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, type, title, content, createdBy, attachments: [] }),
      });
      if (!res.ok) throw new Error();
      onCreated(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <h2 className="text-lg font-bold text-gray-900">Thêm hoạt động</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Loại hoạt động</label>
            <div className="grid grid-cols-3 gap-2">
              {(["call","meeting","email","note","quote_sent","contract"] as ActivityType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className="py-2 text-xs font-medium rounded-lg border transition-colors"
                  style={{
                    background: type === t ? `${ACTIVITY_COLORS[t]}15` : "#f9fafb",
                    borderColor: type === t ? ACTIVITY_COLORS[t] : "#e5e7eb",
                    color: type === t ? ACTIVITY_COLORS[t] : "#6b7280",
                  }}>
                  {ACTIVITY_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tiêu đề</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder="VD: Gọi tư vấn lần 1" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nội dung *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} required
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
              placeholder="Mô tả chi tiết..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Người thực hiện</label>
            <input value={createdBy} onChange={e => setCreatedBy(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder="Tên sales" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white flex items-center justify-center gap-2"
              style={{ background: "#C9A84C" }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTaskModal({ leadId, leadName, onClose, onCreated }: { leadId: string; leadName: string; onClose: () => void; onCreated: (t: CrmTask) => void }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [priority, setPriority] = useState<CrmTask["priority"]>("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, leadName, title, dueDate, priority, assignedTo, done: false }),
      });
      if (!res.ok) throw new Error();
      onCreated(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <h2 className="text-lg font-bold text-gray-900">Thêm việc cần làm</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nội dung *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder="VD: Gọi lại cho khách sau 2 ngày" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hạn chót</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ưu tiên</label>
              <select value={priority} onChange={e => setPriority(e.target.value as CrmTask["priority"])}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white">
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Giao cho</label>
            <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder="Tên sales" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white flex items-center justify-center gap-2"
              style={{ background: "#C9A84C" }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
