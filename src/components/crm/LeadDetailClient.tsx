"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, User, Store,
  Calendar, Edit3, Trash2, Plus, CheckSquare, FileText,
  Clock, MessageSquare, Users, Send, FileCheck, Loader2,
  ChevronDown, AlertCircle, Tag, DollarSign, Home, X,
  ShoppingCart, ExternalLink, Star, TrendingUp, Hash,
  PhoneCall, PhoneMissed, PhoneIncoming, Mic, Play, Pause, Volume2, Save,
} from "lucide-react";
import type { Lead, Activity, Quote, CrmTask, LeadStage, ActivityType, CallLog } from "@/lib/crm-types";
import { formatDuration } from "@/lib/crm-types";
import {
  STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS,
  ACTIVITY_LABELS, DISTRICTS, SOURCES, formatVND, isOverdue,
} from "@/lib/crm-types";

interface Props {
  lead: Lead;
  initialActivities: Activity[];
  initialQuotes: Quote[];
  initialTasks: CrmTask[];
  isAdmin?: boolean;
  currentUserName?: string;
  staffList?: { id: string; fullName: string }[];
}

const TABS = ["timeline", "calls", "quotes", "tasks", "info"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  timeline: "Lịch sử",
  calls: "Cuộc gọi",
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

export default function LeadDetailClient({ lead: initialLead, initialActivities, initialQuotes, initialTasks, isAdmin = false, currentUserName = "", staffList = [] }: Props) {
  const [lead, setLead] = useState(initialLead);
  const [activities, setActivities] = useState(initialActivities);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState<Tab>("timeline");
  const [showAddActivity, setShowAddActivity] = useState(false);
  // Call logs state
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [callLogsLoaded, setCallLogsLoaded] = useState(false);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  const loadCallLogs = async () => {
    if (callLogsLoaded) return;
    setCallLogsLoading(true);
    try {
      const res = await fetch(`/api/crm/call-logs?leadId=${initialLead.id}&limit=50`);
      if (res.ok) { const data = await res.json(); setCallLogs(data); }
    } finally { setCallLogsLoading(false); setCallLogsLoaded(true); }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "calls") loadCallLogs();
  };

  const saveCallNote = async (callId: string) => {
    setSavingNote(callId);
    try {
      await fetch("/api/crm/call-logs", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: callId, note: callNotes[callId] ?? "" }),
      });
      setCallLogs(prev => prev.map(l => l.id === callId ? { ...l, note: callNotes[callId] ?? l.note } : l));
    } finally { setSavingNote(null); }
  };
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const overdue = isOverdue(lead);
  const TypeIcon = lead.type === "architect" ? User : lead.type === "investor" ? Building2 : Store;

  async function deleteLead() {
    setDeleting(true);
    try {
      await fetch(`/api/crm/leads/${lead.id}`, { method: "DELETE" });
      window.location.href = "/crm/leads";
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

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

            <Link href={`/admin/orders/new?customerId=${lead.id}&customerName=${encodeURIComponent(lead.name)}&customerPhone=${encodeURIComponent(lead.phone)}&customerEmail=${encodeURIComponent(lead.email || "")}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              <ShoppingCart size={14} /> Tạo đơn hàng
            </Link>
            <Link href={`/crm/quotes/new?leadId=${lead.id}&leadName=${encodeURIComponent(lead.name)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-900 transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}>
              <FileText size={14} /> Tạo báo giá
            </Link>
            <button onClick={() => setShowEditLead(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Edit3 size={14} /> Sửa
            </button>
            {isAdmin && (
              <button onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={14} /> Xóa
              </button>
            )}
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
                <button key={tab} onClick={() => handleTabChange(tab)}
                  className="flex-1 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: activeTab === tab ? "#C9A84C" : "#6b7280",
                    borderBottom: activeTab === tab ? "2px solid #C9A84C" : "2px solid transparent",
                    background: activeTab === tab ? "#fffbf0" : "transparent",
                  }}>
                  {TAB_LABELS[tab]}
                  {tab === "calls" && callLogs.length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                      {callLogs.length}
                    </span>
                  )}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-900"
                      style={{ background: "#C9A84C" }}>
                      <Plus size={14} /> Thêm hoạt động
                    </button>
                  </div>

                  {activities.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
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
                                  <span className="text-xs text-gray-500 ml-2">
                                    {new Date(act.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {act.createdBy && <span className="text-xs text-gray-500 ml-1">· {act.createdBy}</span>}
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!confirm("Xóa hoạt động này?")) return;
                                    await fetch(`/api/crm/activities/${act.id}`, { method: "DELETE" });
                                    setActivities(prev => prev.filter(a => a.id !== act.id));
                                  }}
                                  className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
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

              {/* Call Logs */}
              {activeTab === "calls" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Lịch sử cuộc gọi</h3>
                    <span className="text-xs text-gray-500">{callLogs.length} cuộc gọi</span>
                  </div>
                  {callLogsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-blue-500" />
                    </div>
                  ) : callLogs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <PhoneCall size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Chưa có cuộc gọi nào được ghi nhận</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {callLogs.map(call => {
                        const isSuccess = call.status === "answered";
                        const isMissed = call.status === "missed";
                        const StatusIcon = isMissed ? PhoneMissed : isSuccess ? PhoneCall : PhoneIncoming;
                        const statusColor = isMissed ? "#ef4444" : isSuccess ? "#22c55e" : "#f59e0b";
                        const statusBg = isMissed ? "#fef2f2" : isSuccess ? "#f0fdf4" : "#fffbeb";
                        const statusLabel = isMissed ? "Nhỡ" : isSuccess ? "Thành công" : "Không trả lời";
                        const noteKey = call.id;
                        const currentNote = callNotes[noteKey] !== undefined ? callNotes[noteKey] : (call.note ?? "");
                        return (
                          <div key={call.id} className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: statusBg, border: `1.5px solid ${statusColor}30` }}>
                                <StatusIcon size={15} style={{ color: statusColor }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: statusBg, color: statusColor }}>
                                    {statusLabel}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(call.callTime).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {call.duration > 0 && (
                                    <span className="text-xs text-gray-500">· {formatDuration(call.duration)}</span>
                                  )}
                                  {call.staffName && (
                                    <span className="text-xs text-gray-500">· {call.staffName}</span>
                                  )}
                                </div>
                                {call.recordingUrl && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <audio
                                      id={`audio-${call.id}`}
                                      src={call.recordingUrl}
                                      className="hidden"
                                      onEnded={() => setPlayingCallId(null)}
                                    />
                                    <button
                                      onClick={() => {
                                        const audio = document.getElementById(`audio-${call.id}`) as HTMLAudioElement;
                                        if (playingCallId === call.id) {
                                          audio?.pause();
                                          setPlayingCallId(null);
                                        } else {
                                          if (playingCallId) {
                                            const prev = document.getElementById(`audio-${playingCallId}`) as HTMLAudioElement;
                                            prev?.pause();
                                          }
                                          audio?.play();
                                          setPlayingCallId(call.id);
                                        }
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                      style={{
                                        background: playingCallId === call.id ? "#dbeafe" : "#eff6ff",
                                        color: "#2563eb",
                                        border: "1px solid #bfdbfe",
                                      }}>
                                      {playingCallId === call.id ? <Pause size={12} /> : <Play size={12} />}
                                      {playingCallId === call.id ? "Dừng" : "Nghe lại"}
                                    </button>
                                    <Mic size={13} className="text-blue-400" />
                                    <span className="text-xs text-gray-400">Ghi âm</span>
                                  </div>
                                )}
                                {/* Quick note */}
                                <div className="mt-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder="Ghi chú nhanh sau cuộc gọi..."
                                      value={currentNote}
                                      onChange={e => setCallNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
                                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400 bg-gray-50"
                                    />
                                    {callNotes[noteKey] !== undefined && callNotes[noteKey] !== (call.note ?? "") && (
                                      <button
                                        onClick={() => saveCallNote(call.id)}
                                        disabled={savingNote === call.id}
                                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                                        {savingNote === call.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                        Lưu
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-900"
                      style={{ background: "#C9A84C" }}>
                      <Plus size={14} /> Tạo báo giá
                    </Link>
                  </div>
                  {quotes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-900"
                      style={{ background: "#C9A84C" }}>
                      <Plus size={14} /> Thêm việc
                    </button>
                  </div>
                  {tasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
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
        <div className="w-80 flex-shrink-0 p-4 overflow-y-auto hidden lg:block space-y-4">

          {/* Customer Profile Card */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
            <div className="p-4" style={{ background: "linear-gradient(135deg, #fffbf0, #fff)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${TYPE_COLORS[lead.type]}, ${TYPE_COLORS[lead.type]}cc)` }}>
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 truncate">{lead.name}</div>
                  {lead.company && <div className="text-xs text-gray-500 truncate">{lead.company}</div>}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${TYPE_COLORS[lead.type]}15`, color: TYPE_COLORS[lead.type] }}>
                      {TYPE_LABELS[lead.type]}
                    </span>
                  </div>
                </div>
              </div>
              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-2">
                <a href={`tel:${lead.phone}`}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-green-50 transition-colors group" style={{ border: "1px solid #dcfce7" }}>
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone size={13} className="text-green-600" />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-600">Gọi</span>
                </a>
                {lead.email ? (
                  <a href={`mailto:${lead.email}`}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-blue-50 transition-colors" style={{ border: "1px solid #dbeafe" }}>
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                      <Mail size={13} className="text-blue-600" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600">Email</span>
                  </a>
                ) : (
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl opacity-30" style={{ border: "1px solid #e5e7eb" }}>
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                      <Mail size={13} className="text-gray-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400">Email</span>
                  </div>
                )}
                <Link href={`/crm/quotes/new?leadId=${lead.id}`}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-amber-50 transition-colors" style={{ border: "1px solid #fde68a" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#fef3c7" }}>
                    <FileText size={13} style={{ color: "#C9A84C" }} />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-600">Báo giá</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Key Info */}
          <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid #e5e7eb" }}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Thông tin chính</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f0fdf4" }}>
                  <Phone size={11} className="text-green-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-400">Điện thoại</div>
                  <div className="text-xs font-semibold text-gray-800">{lead.phone}</div>
                </div>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
                    <Mail size={11} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-gray-400">Email</div>
                    <div className="text-xs font-semibold text-gray-800 truncate">{lead.email}</div>
                  </div>
                </div>
              )}
              {lead.district && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f5f3ff" }}>
                    <MapPin size={11} className="text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-gray-400">Khu vực</div>
                    <div className="text-xs font-semibold text-gray-800">{lead.district}</div>
                  </div>
                </div>
              )}
              {lead.assignedTo && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#fffbeb" }}>
                    <User size={11} style={{ color: "#C9A84C" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-gray-400">Sales phụ trách</div>
                    <div className="text-xs font-semibold text-gray-800">{lead.assignedTo}</div>
                  </div>
                </div>
              )}
              {lead.source && (
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#fef2f2" }}>
                    <TrendingUp size={11} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-gray-400">Nguồn</div>
                    <div className="text-xs font-semibold text-gray-800">{lead.source}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f9fafb" }}>
                  <Calendar size={11} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-400">Ngày tạo</div>
                  <div className="text-xs font-semibold text-gray-800">{new Date(lead.createdAt).toLocaleDateString("vi-VN")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Value Summary */}
          <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid #e5e7eb" }}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Giá trị</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                <div className="flex items-center gap-2">
                  <DollarSign size={13} style={{ color: "#C9A84C" }} />
                  <span className="text-xs text-gray-600">Giá trị dự kiến</span>
                </div>
                <span className="text-sm font-black" style={{ color: "#C9A84C" }}>
                  {lead.expectedValue > 0 ? (lead.expectedValue >= 1e9 ? `${(lead.expectedValue/1e9).toFixed(1)}B` : lead.expectedValue >= 1e6 ? `${(lead.expectedValue/1e6).toFixed(0)}tr` : `${lead.expectedValue.toLocaleString()}đ`) : "—"}
                </span>
              </div>
              {lead.unitCount > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <div className="flex items-center gap-2">
                    <Home size={13} className="text-blue-500" />
                    <span className="text-xs text-gray-600">Số căn</span>
                  </div>
                  <span className="text-sm font-black text-blue-600">{lead.unitCount} căn</span>
                </div>
              )}
            </div>
          </div>

          {/* Create Order CTA */}
          <Link href={`/admin/orders/new?customerId=${lead.id}&customerName=${encodeURIComponent(lead.name)}&customerPhone=${encodeURIComponent(lead.phone)}&customerEmail=${encodeURIComponent(lead.email || "")}`}
            className="block w-full p-4 rounded-2xl text-center transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", border: "none" }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <ShoppingCart size={16} className="text-white" />
              <span className="text-sm font-bold text-white">Tạo đơn hàng</span>
            </div>
            <p className="text-[10px] text-indigo-200">Chuyển khách hàng thành đơn hàng</p>
          </Link>

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
          isAdmin={isAdmin}
          currentUserName={currentUserName}
          staffList={staffList}
          onClose={() => setShowAddTask(false)}
          onCreated={task => {
            setTasks(prev => [task, ...prev]);
            setShowAddTask(false);
          }}
        />
      )}

      {/* Edit Lead Modal */}
      {showEditLead && (
        <EditLeadModal
          lead={lead}
          onClose={() => setShowEditLead(false)}
          onUpdated={updated => {
            setLead(updated);
            setShowEditLead(false);
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Xóa khách hàng?</h2>
                <p className="text-sm text-gray-500 mt-0.5">Thao tác này không thể hoàn tác</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5 p-3 bg-gray-50 rounded-lg">
              Bạn có chắc muốn xóa <strong>{lead.name}</strong>? Tất cả hoạt động, báo giá và công việc liên quan cũng sẽ bị xóa.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={deleteLead} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white flex items-center justify-center gap-2"
                style={{ background: "#ef4444" }}>
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Xóa khách hàng
              </button>
            </div>
          </div>
        </div>
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
        <p className={`text-sm font-medium ${task.done ? "line-through text-gray-500" : "text-gray-900"}`}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: isOverdueTask ? "#ef4444" : "#9ca3af" }}>
            {new Date(task.dueDate).toLocaleDateString("vi-VN")}
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: priorityColor }} />
        </div>
      </div>
      <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
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
              className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder="VD: Gọi tư vấn lần 1" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nội dung *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} required
              className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
              placeholder="Mô tả chi tiết..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Người thực hiện</label>
            <input value={createdBy} onChange={e => setCreatedBy(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder="Tên sales" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-gray-900 flex items-center justify-center gap-2"
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

function AddTaskModal({ leadId, leadName, isAdmin = false, currentUserName = "", staffList = [], onClose, onCreated }: { leadId: string; leadName: string; isAdmin?: boolean; currentUserName?: string; staffList?: { id: string; fullName: string }[]; onClose: () => void; onCreated: (t: CrmTask) => void }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [priority, setPriority] = useState<CrmTask["priority"]>("medium");
  const [assignedTo, setAssignedTo] = useState(isAdmin ? "" : currentUserName);
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
              className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder="VD: Gọi lại cho khách sau 2 ngày" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hạn chót</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ưu tiên</label>
              <select value={priority} onChange={e => setPriority(e.target.value as CrmTask["priority"])}
                className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white">
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>
          {isAdmin && staffList.length > 0 ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Giao cho nhân viên</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white">
                <option value="">— Chưa phân công —</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.fullName}>{s.fullName}</option>
                ))}
              </select>
            </div>
          ) : !isAdmin && currentUserName ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Giao cho</label>
              <div className="w-full px-3 py-2 text-sm rounded-lg border border-gray-100 bg-gray-50 text-gray-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{currentUserName[0]}</span>
                {currentUserName}
                <span className="ml-auto text-xs text-gray-400">(bạn)</span>
              </div>
            </div>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-gray-900 flex items-center justify-center gap-2"
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

// ─── Edit Lead Modal ──────────────────────────────────────────────────────────
function EditLeadModal({ lead, onClose, onUpdated }: { lead: Lead; onClose: () => void; onUpdated: (l: Lead) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: lead.name,
    company: lead.company || "",
    phone: lead.phone,
    email: lead.email || "",
    type: lead.type,
    district: lead.district || "",
    expectedValue: lead.expectedValue > 0 ? String(lead.expectedValue) : "",
    source: lead.source || "",
    assignedTo: lead.assignedTo || "",
    projectName: lead.projectName || "",
    projectAddress: lead.projectAddress || "",
    unitCount: lead.unitCount > 0 ? String(lead.unitCount) : "",
    notes: lead.notes || "",
  });

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập tên khách hàng"); return; }
    if (!form.phone.trim()) { setError("Vui lòng nhập số điện thoại"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expectedValue: parseFloat(form.expectedValue) || 0,
          unitCount: parseInt(form.unitCount) || 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onUpdated(updated);
    } catch {
      setError("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white z-10"
          style={{ borderBottom: "1px solid #f3f4f6" }}>
          <h2 className="text-lg font-bold text-gray-900">Chỉnh sửa khách hàng</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg text-sm text-red-600" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Thông tin cơ bản</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tên khách hàng *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} required
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Công ty / Dự án</label>
                <input value={form.company} onChange={e => set("company", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="Tên công ty" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Loại khách *</label>
                <select value={form.type} onChange={e => set("type", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white">
                  <option value="architect">Kiến trúc sư</option>
                  <option value="investor">Chủ đầu tư CHDV</option>
                  <option value="dealer">Đại lý</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Số điện thoại *</label>
                <input value={form.phone} onChange={e => set("phone", e.target.value)} required
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="0901234567" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="email@example.com" />
              </div>
            </div>
          </div>

          {/* Sales Info */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Thông tin kinh doanh</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Giá trị dự kiến (VND)</label>
                <input type="number" value={form.expectedValue} onChange={e => set("expectedValue", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="500000000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Số căn / phòng</label>
                <input type="number" value={form.unitCount} onChange={e => set("unitCount", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Khu vực</label>
                <input value={form.district} onChange={e => set("district", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="Q1, TP.HCM" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nguồn</label>
                <input value={form.source} onChange={e => set("source", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="Facebook Ads" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sales phụ trách</label>
                <input value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="Tên nhân viên" />
              </div>
            </div>
          </div>

          {/* Project Info */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Thông tin dự án</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tên dự án</label>
                <input value={form.projectName} onChange={e => set("projectName", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="Vinhomes Central Park" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Địa chỉ dự án</label>
                <input value={form.projectAddress} onChange={e => set("projectAddress", e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="720A Điện Biên Phủ, Q.Bình Thạnh" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
              placeholder="Ghi chú thêm về khách hàng..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-gray-900 flex items-center justify-center gap-2"
              style={{ background: "#C9A84C" }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
