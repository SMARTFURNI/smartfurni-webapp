"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, User, Store,
  Calendar, Edit3, Trash2, Plus, CheckSquare, FileText,
  Clock, MessageSquare, Users, Send, FileCheck, Loader2,
  ChevronDown, AlertCircle, Tag, DollarSign, Home, X,
  ShoppingCart, ExternalLink, Star, TrendingUp, Hash, Copy,
  PhoneCall, PhoneMissed, PhoneIncoming, Mic, Play, Pause, Volume2, Save,
  MessageCircle,
} from "lucide-react";
import type { Lead, Activity, Quote, CrmTask, LeadStage, ActivityType, CallLog } from "@/lib/crm-types";
import type { FacebookGroupLeadSource } from "@/lib/facebook-group-marketing-types";
import CustomerContactActions from "@/components/crm/high-performance-features/CustomerContactActions";
import { ItyCallButton } from "@/components/crm/ItySoftphone";
import { formatDuration } from "@/lib/crm-types";
import {
  STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS,
  ACTIVITY_LABELS, DISTRICTS, SOURCES, formatVND, isOverdue,
} from "@/lib/crm-types";
import customerStyles from "./CustomerWorkspace.module.css";
import { CRM_LEAD_TYPE_OPTIONS } from "@/lib/crm-taxonomy";

// ─── Light Zalo OA Theme Tokens ───────────────────────────────────────────────
const DL = {
  bg: "radial-gradient(circle at 92% 2%, rgba(212,175,69,0.12), transparent 25rem), linear-gradient(160deg, #f8fbff 0%, #f4f7fb 52%, #fffdf7 100%)",
  surface: "#ffffff",
  surfaceHover: "#eef3f8",
  surfaceActive: "#fff8e6",
  border: "#dbe3ee",
  borderGold: "rgba(212,175,69,0.44)",
  text: "#172033",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  gold: "#d4af45",
  goldDark: "#b98720",
  goldGlow: "rgba(185,135,32,0.22)",
  header: "linear-gradient(135deg, #ffffff 0%, #fffdf7 100%)",
  card: "#ffffff",
  cardBorder: "#dbe3ee",
  inputBg: "#f8fafc",
  inputBorder: "#cbd5e1",
  modalBg: "#ffffff",
};

interface Props {
  lead: Lead;
  initialActivities: Activity[];
  initialQuotes: Quote[];
  initialTasks: CrmTask[];
  facebookGroupSources?: FacebookGroupLeadSource[];
  isAdmin?: boolean;
  currentUserName?: string;
  staffList?: { id: string; fullName: string }[];
}

const TABS = ["timeline", "calls", "quotes", "tasks", "facebook_group", "info"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  timeline: "Lịch sử",
  calls: "Cuộc gọi",
  quotes: "Báo giá",
  tasks: "Việc cần làm",
  facebook_group: "Nguồn Facebook Group",
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

export default function LeadDetailClient({
  lead: initialLead,
  initialActivities,
  initialQuotes,
  initialTasks,
  facebookGroupSources = [],
  isAdmin = false,
  currentUserName = "",
  staffList = [],
}: Props) {
  const [lead, setLead] = useState(initialLead);
  const [activities, setActivities] = useState(initialActivities);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState<Tab>("timeline");
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [callLogsLoaded, setCallLogsLoaded] = useState(false);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [zaloCallResult, setZaloCallResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contactModal, setContactModal] = useState<'call' | 'zalo' | 'email' | null>(null);
  const [contactCopied, setContactCopied] = useState(false);

  const handleContactCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setContactCopied(true);
    setTimeout(() => setContactCopied(false), 2000);
  };

  const loadCallLogs = async () => {
    setCallLogsLoading(true);
    try {
      const res = await fetch(`/api/crm/call-logs?leadId=${initialLead.id}&limit=50`);
      if (res.ok) { const data = await res.json(); setCallLogs(data); setCallLogsLoaded(true); }
    } finally { setCallLogsLoading(false); }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "calls") loadCallLogs();
  };

  // Fetch call logs count khi component mount để hiển thị badge ngay lập tức
  useEffect(() => {
    const fetchCallLogsCount = async () => {
      try {
        const res = await fetch(`/api/crm/call-logs?leadId=${initialLead.id}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setCallLogs(data);
        }
      } catch {
        // Bỏ qua lỗi, badge sẽ hiện sau khi user click vào tab
      }
    };
    fetchCallLogsCount();
  }, [initialLead.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lắng nghe event ity:call-saved để reload call logs và activities sau khi gọi xong
  useEffect(() => {
    const handleCallSaved = () => {
      // Tự động chuyển sang tab calls và load data ngay lập tức
      setActiveTab("calls");
      setTimeout(() => loadCallLogs(), 800);
      // Reload activities để hiển thị activity "Gọi điện" mới trong Lịch sử tương tác
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/crm/activities?leadId=${initialLead.id}`);
          if (res.ok) {
            const data = await res.json();
            setActivities(data);
          }
        } catch { /* bỏ qua lỗi */ }
      }, 1200);
    };
    window.addEventListener("ity:call-saved", handleCallSaved);
    return () => window.removeEventListener("ity:call-saved", handleCallSaved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const overdue = isOverdue(lead);

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
    <div className={`${customerStyles.workspace} flex flex-col h-full`} style={{ background: DL.bg, minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div className={`${customerStyles.headerSurface} flex-shrink-0 mx-3 sm:mx-5 mt-2 rounded-2xl px-3 sm:px-4 py-2.5 backdrop-blur-sm`}
        style={{ background: DL.header, borderBottom: `1px solid ${DL.border}`, overflow: "visible", position: "relative", zIndex: 100 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/crm/leads"
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: DL.textMuted }}
            onMouseEnter={e => (e.currentTarget.style.color = DL.gold)}
            onMouseLeave={e => (e.currentTarget.style.color = DL.textMuted)}>
            <ArrowLeft size={15} />
            <span>Danh sách KH</span>
          </Link>

          <div className="w-px h-4" style={{ background: DL.border }} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-base font-bold" style={{ color: DL.text }}>{lead.name}</h1>
              {lead.company && <span className="text-xs" style={{ color: DL.textMuted }}>{lead.company}</span>}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${TYPE_COLORS[lead.type]}18`, color: TYPE_COLORS[lead.type], border: `1px solid ${TYPE_COLORS[lead.type]}30` }}>
                {TYPE_LABELS[lead.type]}
              </span>
              {overdue && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#fff1f2", color: "#dc2626", border: "1px solid #fecdd3" }}>
                  <AlertCircle size={10} /> Quá hạn
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Stage selector */}
            <div className="relative">
              <button
                onClick={() => setShowStageMenu(v => !v)}
                className={`${customerStyles.primaryButton} flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all`}
                style={{
                  background: `${STAGE_COLORS[lead.stage]}15`,
                  color: STAGE_COLORS[lead.stage],
                  border: `1px solid ${STAGE_COLORS[lead.stage]}35`,
                }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: STAGE_COLORS[lead.stage] }} />
                {STAGE_LABELS[lead.stage]}
                <ChevronDown size={13} />
              </button>
              {showStageMenu && (
                <div className="absolute right-0 top-full mt-1.5 rounded-xl shadow-2xl py-1.5 min-w-[190px] backdrop-blur-xl"
                  style={{ zIndex: 9999, background: DL.modalBg, border: `1px solid ${DL.border}` }}>
                  {(Object.keys(STAGE_LABELS) as LeadStage[]).map(s => (
                    <button key={s} onClick={() => changeStage(s)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors"
                      style={{ color: lead.stage === s ? DL.gold : DL.text }}
                      onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STAGE_COLORS[s] }} />
                      {STAGE_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href={`/admin/orders/new?customerId=${lead.id}&customerName=${encodeURIComponent(lead.name)}&customerPhone=${encodeURIComponent(lead.phone)}&customerEmail=${encodeURIComponent(lead.email || "")}`}
              className={`${customerStyles.blueButton} flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all`}>
              <ShoppingCart size={13} /> Tạo đơn hàng
            </Link>
            <Link href={`/crm/quotes/new?leadId=${lead.id}&leadName=${encodeURIComponent(lead.name)}`}
              className={`${customerStyles.primaryButton} flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all`}>
              <FileText size={13} /> Tạo báo giá
            </Link>
            <button onClick={() => setShowEditLead(true)}
              className={`${customerStyles.secondaryButton} flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all`}
              style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}
              onMouseEnter={e => { e.currentTarget.style.color = DL.text; e.currentTarget.style.background = DL.surfaceHover; }}
              onMouseLeave={e => { e.currentTarget.style.color = DL.textMuted; e.currentTarget.style.background = DL.surface; }}>
              <Edit3 size={13} /> Sửa
            </button>
            {isAdmin && (
              <button onClick={() => setShowDeleteConfirm(true)}
                className={`${customerStyles.dangerButton} flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all`}
                style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#dc2626" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#ffe4e6")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff1f2")}>
                <Trash2 size={13} /> Xóa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto xl:overflow-hidden flex flex-col xl:flex-row gap-0">
        {/* Left: Main content */}
        <div className="flex-1 xl:overflow-y-auto p-3 sm:p-4 min-w-0">
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
            <DLInfoCard icon={DollarSign} label="Giá trị dự kiến" value={formatVND(lead.expectedValue)} color={DL.gold} />
            <DLInfoCard icon={Home} label="Số căn" value={lead.unitCount > 0 ? `${lead.unitCount} căn` : "—"} color="#60a5fa" />
            <DLInfoCard icon={MapPin} label="Khu vực" value={lead.district || "—"} color="#a78bfa" />
            <DLInfoCard icon={Tag} label="Nguồn" value={lead.source} color="#34d399" />
          </div>

          {/* Tabs container */}
          <div className={`${customerStyles.tableShell} rounded-2xl overflow-hidden`}
            style={{ background: DL.card, border: `1px solid ${DL.cardBorder}`, backdropFilter: "blur(12px)" }}>
            {/* Tab bar */}
            <div className="flex overflow-x-auto" style={{ borderBottom: `1px solid ${DL.border}` }}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => handleTabChange(tab)}
                  className="min-w-28 flex-1 py-2.5 px-2 text-sm font-semibold transition-all relative whitespace-nowrap"
                  style={{
                    color: activeTab === tab ? DL.gold : DL.textMuted,
                    background: activeTab === tab ? "linear-gradient(135deg, #fff9e8, #fff1bd)" : "transparent",
                  }}>
                  {TAB_LABELS[tab]}
                  {tab === "calls" && callLogs.length > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                      {callLogs.length}
                    </span>
                  )}
                  {tab === "timeline" && activities.length > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: DL.surface, color: DL.textMuted }}>
                      {activities.length}
                    </span>
                  )}
                  {tab === "tasks" && tasks.filter(t => !t.done).length > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(245,158,11,0.15)", color: DL.gold }}>
                      {tasks.filter(t => !t.done).length}
                    </span>
                  )}
                  {tab === "facebook_group" && facebookGroupSources.length > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(24,119,242,0.15)", color: "#60a5fa" }}>
                      {facebookGroupSources.length}
                    </span>
                  )}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: `linear-gradient(90deg, transparent, ${DL.gold}, transparent)` }} />
                  )}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* ── Timeline ── */}
              {activeTab === "timeline" && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-sm" style={{ color: DL.text }}>Lịch sử tương tác</h3>
                    <button onClick={() => setShowAddActivity(true)}
                      className={`${customerStyles.primaryButton} flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all`}>
                      <Plus size={13} /> Thêm hoạt động
                    </button>
                  </div>
                  {activities.length === 0 ? (
                    <div className="text-center py-14">
                      <Clock size={30} className="mx-auto mb-3 opacity-20" style={{ color: DL.textMuted }} />
                      <p className="text-sm" style={{ color: DL.textMuted }}>Chưa có hoạt động nào</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((act, idx) => {
                        const Icon = ACTIVITY_TYPE_ICONS[act.type];
                        // Phân biệt màu cho activity "Gọi điện" dựa vào nội dung
                        let color = ACTIVITY_COLORS[act.type];
                        if (act.type === "call" && act.content) {
                          if (act.content.startsWith("Thành công")) color = "#22c55e";      // xanh lá
                          else if (act.content.startsWith("Không nghe") || act.content.startsWith("Không ngập")) color = "#f97316"; // cam
                          else if (act.content.startsWith("Bận")) color = "#f59e0b";        // vàng
                          else if (act.content.startsWith("Thất bại")) color = "#dc2626";  // đỏ
                        }
                        return (
                          <div key={act.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: `${color}15`, border: `1.5px solid ${color}35` }}>
                                <Icon size={13} style={{ color }} />
                              </div>
                              {idx < activities.length - 1 && (
                                <div className="w-px flex-1 mt-1" style={{ background: DL.border, minHeight: "16px" }} />
                              )}
                            </div>
                            <div className="flex-1 pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                    style={{ background: `${color}15`, color }}>
                                    {ACTIVITY_LABELS[act.type]}
                                  </span>
                                  <span className="text-xs ml-2" style={{ color: DL.textMuted }}>
                                    {new Date(act.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {act.createdBy && <span className="text-xs ml-1" style={{ color: DL.textMuted }}>· {act.createdBy}</span>}
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!confirm("Xóa hoạt động này?")) return;
                                    await fetch(`/api/crm/activities/${act.id}`, { method: "DELETE" });
                                    setActivities(prev => prev.filter(a => a.id !== act.id));
                                  }}
                                  className="transition-colors flex-shrink-0"
                                  style={{ color: DL.textDim }}
                                  onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
                                  onMouseLeave={e => (e.currentTarget.style.color = DL.textDim)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              {act.title && <p className="text-sm font-medium mt-1" style={{ color: DL.text }}>{act.title}</p>}
                              {act.content && <p className="text-sm mt-0.5 leading-relaxed" style={{ color: DL.textMuted }}>{act.content}</p>}
                              {act.attachments?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {act.attachments.map((att, i) => (
                                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                                      style={{ background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa" }}>
                                      <FileText size={10} /> {att.name}
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

              {/* ── Call Logs ── */}
              {activeTab === "calls" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm" style={{ color: DL.text }}>Lịch sử cuộc gọi</h3>
                    <span className="text-xs" style={{ color: DL.textMuted }}>{callLogs.length} cuộc gọi</span>
                  </div>
                  {callLogsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={22} className="animate-spin" style={{ color: DL.gold }} />
                    </div>
                  ) : callLogs.length === 0 ? (
                    <div className="text-center py-14">
                      <PhoneCall size={30} className="mx-auto mb-3 opacity-20" style={{ color: DL.textMuted }} />
                      <p className="text-sm" style={{ color: DL.textMuted }}>Chưa có cuộc gọi nào được ghi nhận</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {callLogs.map(call => {
                        const isSuccess = call.status === "answered";
                        const isMissed = call.status === "missed";
                        const StatusIcon = isMissed ? PhoneMissed : isSuccess ? PhoneCall : PhoneIncoming;
                        const statusColor = isMissed ? "#dc2626" : isSuccess ? "#059669" : DL.gold;
                        const statusLabel = isMissed ? "Nhỡ" : isSuccess ? "Thành công" : "Không trả lời";
                        const noteKey = call.id;
                        const currentNote = callNotes[noteKey] !== undefined ? callNotes[noteKey] : (call.note ?? "");
                        return (
                          <div key={call.id} className="rounded-xl p-4 transition-all"
                            style={{ background: DL.surface, border: `1px solid ${DL.border}` }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = DL.borderGold)}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = DL.border)}>
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: `${statusColor}15`, border: `1.5px solid ${statusColor}30` }}>
                                <StatusIcon size={14} style={{ color: statusColor }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: `${statusColor}15`, color: statusColor }}>
                                    {statusLabel}
                                  </span>
                                  <span className="text-xs" style={{ color: DL.textMuted }}>
                                    {new Date(call.startedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {call.duration > 0 && (
                                    <span className="text-xs" style={{ color: DL.textMuted }}>· {formatDuration(call.duration)}</span>
                                  )}
                                  {call.staffName && (
                                    <span className="text-xs" style={{ color: DL.textMuted }}>· {call.staffName}</span>
                                  )}
                                </div>
                                {call.recordingUrl && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <audio id={`audio-${call.id}`} src={call.recordingUrl} className="hidden"
                                      onEnded={() => setPlayingCallId(null)} />
                                    <button
                                      onClick={() => {
                                        const audio = document.getElementById(`audio-${call.id}`) as HTMLAudioElement;
                                        if (playingCallId === call.id) {
                                          audio?.pause(); setPlayingCallId(null);
                                        } else {
                                          if (playingCallId) {
                                            const prev = document.getElementById(`audio-${playingCallId}`) as HTMLAudioElement;
                                            prev?.pause();
                                          }
                                          audio?.play(); setPlayingCallId(call.id);
                                        }
                                      }}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                                      style={{ background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa" }}>
                                      {playingCallId === call.id ? <Pause size={11} /> : <Play size={11} />}
                                      {playingCallId === call.id ? "Dừng" : "Nghe lại"}
                                    </button>
                                  </div>
                                )}
                                <div className="mt-2">
                                  <textarea
                                    value={currentNote}
                                    onChange={e => setCallNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
                                    rows={2}
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg resize-none focus:outline-none"
                                    style={{ background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text }}
                                    placeholder="Ghi chú cuộc gọi..."
                                  />
                                  {callNotes[noteKey] !== undefined && callNotes[noteKey] !== (call.note ?? "") && (
                                    <button onClick={() => saveCallNote(call.id)}
                                      className="mt-1 flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                                      style={{ background: `${DL.gold}15`, color: DL.gold, border: `1px solid ${DL.borderGold}` }}>
                                      {savingNote === call.id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                                      Lưu ghi chú
                                    </button>
                                  )}
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

              {/* ── Quotes ── */}
              {activeTab === "quotes" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm" style={{ color: DL.text }}>Báo giá</h3>
                    <Link href={`/crm/quotes/new?leadId=${lead.id}&leadName=${encodeURIComponent(lead.name)}`}
                      className={`${customerStyles.primaryButton} flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all`}>
                      <Plus size={13} /> Tạo báo giá
                    </Link>
                  </div>
                  {quotes.length === 0 ? (
                    <div className="text-center py-14">
                      <FileText size={30} className="mx-auto mb-3 opacity-20" style={{ color: DL.textMuted }} />
                      <p className="text-sm" style={{ color: DL.textMuted }}>Chưa có báo giá nào</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quotes.map(q => (
                        <Link key={q.id} href={`/crm/quotes/${q.id}`}
                          className="flex items-center justify-between p-4 rounded-xl transition-all group"
                          style={{ background: DL.surface, border: `1px solid ${DL.border}` }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = DL.borderGold)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = DL.border)}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: DL.text }}>{q.quoteNumber}</span>
                              <QuoteStatusBadge status={q.status} />
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: DL.textMuted }}>
                              {new Date(q.createdAt).toLocaleDateString("vi-VN")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold" style={{ color: DL.gold }}>{formatVND(q.total)}</div>
                            <ExternalLink size={12} className="ml-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: DL.textMuted }} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tasks ── */}
              {activeTab === "tasks" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm" style={{ color: DL.text }}>Việc cần làm</h3>
                    <button onClick={() => setShowAddTask(true)}
                      className={`${customerStyles.primaryButton} flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all`}>
                      <Plus size={13} /> Thêm việc
                    </button>
                  </div>
                  {tasks.length === 0 ? (
                    <div className="text-center py-14">
                      <CheckSquare size={30} className="mx-auto mb-3 opacity-20" style={{ color: DL.textMuted }} />
                      <p className="text-sm" style={{ color: DL.textMuted }}>Chưa có việc cần làm</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map(task => (
                        <DLTaskItem key={task.id} task={task}
                          onToggle={async () => {
                            const newDone = !task.done;
                            if (newDone) {
                              setTasks(prev => prev.filter(t => t.id !== task.id));
                              await fetch(`/api/crm/tasks/${task.id}`, { method: "DELETE" });
                              const actRes = await fetch("/api/crm/activities", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  leadId: lead.id, type: "note",
                                  title: `✅ Hoàn thành: ${task.title}`,
                                  content: `Đã hoàn thành việc cần làm: ${task.title}`,
                                  createdBy: task.assignedTo || "Hệ thống", attachments: [],
                                }),
                              });
                              if (actRes.ok) { const newAct = await actRes.json(); setActivities(prev => [newAct, ...prev]); }
                              setActiveTab("timeline");
                            } else {
                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: false } : t));
                              await fetch(`/api/crm/tasks/${task.id}`, {
                                method: "PATCH", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ done: false }),
                              });
                            }
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

              {/* ── Facebook Group source ── */}
              {activeTab === "facebook_group" && (
                <div>
                  <h3 className="font-semibold text-sm mb-4" style={{ color: DL.text }}>
                    Nguồn Facebook Group đã xác thực từ Messenger
                  </h3>
                  {facebookGroupSources.length === 0 ? (
                    <div className="text-center py-14">
                      <MessageCircle size={30} className="mx-auto mb-3 opacity-20" style={{ color: DL.textMuted }} />
                      <p className="text-sm" style={{ color: DL.textMuted }}>
                        Khách hàng này chưa được gắn mã nguồn từ Facebook Group.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {facebookGroupSources.map(source => (
                        <div key={source.attributionId} className="rounded-xl p-4"
                          style={{ background: DL.surface, border: `1px solid ${DL.border}` }}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold px-2 py-1 rounded-lg"
                                  style={{ background: "rgba(24,119,242,.14)", color: "#60a5fa" }}>
                                  {source.sourceCode}
                                </span>
                                <span className="text-sm font-semibold" style={{ color: DL.text }}>
                                  {source.groupName}
                                </span>
                              </div>
                              {source.campaignName && (
                                <p className="mt-2 text-xs" style={{ color: DL.textMuted }}>
                                  Chiến dịch: {source.campaignName}
                                </p>
                              )}
                            </div>
                            <a href={source.postUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs font-semibold"
                              style={{ color: "#60a5fa" }}>
                              Bài gốc <ExternalLink size={11} />
                            </a>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-2 mt-4 text-xs">
                            <DLInfoRow label="Messenger đầu tiên" value={source.firstMessengerAt
                              ? new Date(source.firstMessengerAt).toLocaleString("vi-VN") : "—"} />
                            <DLInfoRow label="Nhân viên đăng" value={source.postingEmployeeName || "—"} />
                            <DLInfoRow label="Báo giá" value={source.quoteId || "Chưa có"} />
                            <DLInfoRow label="Đơn hàng / doanh thu"
                              value={source.orderId ? `${source.orderId} • ${formatVND(source.revenue)}` : "Chưa có"} />
                          </div>
                          {source.contentOpening && (
                            <p className="mt-3 text-xs p-3 rounded-lg"
                              style={{ background: "#f8fafc", color: DL.textMuted }}>
                              {source.contentOpening}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Info ── */}
              {activeTab === "info" && (
                <div className="space-y-3">
                  <DLInfoRow label="Số điện thoại" value={lead.phone} />
                  <DLInfoRow label="Email" value={lead.email || "—"} />
                  <DLInfoRow label="Tên dự án" value={lead.projectName || "—"} />
                  <DLInfoRow label="Địa chỉ dự án" value={lead.projectAddress || "—"} />
                  <DLInfoRow label="Sales phụ trách" value={lead.assignedTo || "—"} highlight />
                  <DLInfoRow label="Ngày tạo" value={new Date(lead.createdAt).toLocaleDateString("vi-VN")} />
                  {lead.notes && (
                    <div className="pt-1">
                      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: DL.textMuted }}>Ghi chú</div>
                      <p className="text-sm leading-relaxed p-3 rounded-xl" style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}>{lead.notes}</p>
                    </div>
                  )}
                  {lead.lostReason && (
                    <div className="pt-1">
                      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#dc2626" }}>Lý do thất bại</div>
                      <p className="text-sm p-3 rounded-xl" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}>{lead.lostReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="w-full xl:w-72 flex-shrink-0 p-3 xl:overflow-y-auto space-y-2.5 border-t xl:border-t-0 xl:border-l" style={{ borderColor: DL.border }}>

          {/* Customer Profile Card */}
          <div className={`${customerStyles.featureCard} rounded-2xl`} style={{ background: DL.card, border: `1px solid ${DL.cardBorder}`, backdropFilter: "blur(12px)", overflow: "visible" }}>
            <div className="p-4" style={{ background: "linear-gradient(135deg, rgba(212,175,69,0.12), #ffffff)", overflow: "visible", position: "relative" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${TYPE_COLORS[lead.type]}, ${TYPE_COLORS[lead.type]}99)`, color: "#fff" }}>
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate" style={{ color: DL.text }}>{lead.name}</div>
                  {lead.company && <div className="text-xs truncate" style={{ color: DL.textMuted }}>{lead.company}</div>}
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                    style={{ background: `${TYPE_COLORS[lead.type]}18`, color: TYPE_COLORS[lead.type] }}>
                    {TYPE_LABELS[lead.type]}
                  </span>
                </div>
              </div>

              {/* Zalo call result */}
              {zaloCallResult && (
                <div className={`mb-3 p-2.5 rounded-xl text-xs font-medium flex items-start gap-2`}
                  style={{
                    background: zaloCallResult.ok ? "#ecfdf5" : "#fff1f2",
                    border: zaloCallResult.ok ? "1px solid #a7f3d0" : "1px solid #fecdd3",
                    color: zaloCallResult.ok ? "#047857" : "#be123c",
                  }}>
                  <span className="flex-shrink-0 mt-0.5">{zaloCallResult.ok ? "✅" : "❌"}</span>
                  <span>{zaloCallResult.message}</span>
                </div>
              )}

              {/* Quick action buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setContactModal('call')}
                  className={`${customerStyles.iconAction} flex flex-col items-center gap-1 p-2 rounded-xl transition-all`}
                  style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(52,211,153,0.15)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(52,211,153,0.08)")}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(52,211,153,0.15)" }}>
                    <Phone size={13} style={{ color: "#34d399" }} />
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: "#34d399" }}>Gọi</span>
                </button>
                <button onClick={() => setContactModal('zalo')}
                  className={`${customerStyles.iconAction} flex flex-col items-center gap-1 p-2 rounded-xl transition-all`}
                  style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.20)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(96,165,250,0.15)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(96,165,250,0.08)")}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(96,165,250,0.15)" }}>
                    <MessageCircle size={13} style={{ color: "#60a5fa" }} />
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: "#60a5fa" }}>Zalo</span>
                </button>
                {lead.email ? (
                  <button onClick={() => setContactModal('email')}
                    className={`${customerStyles.iconAction} flex flex-col items-center gap-1 p-2 rounded-xl transition-all`}
                    style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.20)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(167,139,250,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(167,139,250,0.08)")}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(167,139,250,0.15)" }}>
                      <Mail size={13} style={{ color: "#a78bfa" }} />
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: "#a78bfa" }}>Email</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl opacity-25" style={{ background: DL.surface, border: `1px solid ${DL.border}` }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: DL.surface }}>
                      <Mail size={13} style={{ color: DL.textMuted }} />
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: DL.textMuted }}>Email</span>
                  </div>
                )}
                <Link href={`/crm/quotes/new?leadId=${lead.id}`}
                  className={`${customerStyles.iconAction} flex flex-col items-center gap-1 p-2 rounded-xl transition-all`}
                  style={{ background: `${DL.gold}0d`, border: `1px solid ${DL.gold}30` }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${DL.gold}18`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${DL.gold}0d`)}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${DL.gold}15` }}>
                    <FileText size={13} style={{ color: DL.gold }} />
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: DL.gold }}>Báo giá</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Key Info Card */}
          <div className={`${customerStyles.featureCard} rounded-2xl p-4`}
            style={{ background: DL.card, border: `1px solid ${DL.cardBorder}`, backdropFilter: "blur(12px)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DL.textMuted }}>Thông tin chính</h3>
            <div className="space-y-3">
              <SidebarInfoRow icon={Phone} label="Điện thoại" value={lead.phone} iconColor="#34d399" />
              {lead.email && <SidebarInfoRow icon={Mail} label="Email" value={lead.email} iconColor="#a78bfa" />}
              {lead.district && <SidebarInfoRow icon={MapPin} label="Khu vực" value={lead.district} iconColor="#a78bfa" />}
              {lead.assignedTo && <SidebarInfoRow icon={User} label="Sales phụ trách" value={lead.assignedTo} iconColor={DL.gold} highlight />}
              {lead.source && <SidebarInfoRow icon={Tag} label="Nguồn" value={lead.source} iconColor="#34d399" />}
              <SidebarInfoRow icon={Calendar} label="Ngày tạo" value={new Date(lead.createdAt).toLocaleDateString("vi-VN")} iconColor={DL.textMuted} />
            </div>
          </div>

          {/* Value Card */}
          <div className={`${customerStyles.featureCard} rounded-2xl p-4`}
            style={{ background: DL.card, border: `1px solid ${DL.cardBorder}`, backdropFilter: "blur(12px)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DL.textMuted }}>Giá trị</h3>
            <div className="p-3 rounded-xl" style={{ background: `${DL.gold}0d`, border: `1px solid ${DL.gold}25` }}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={13} style={{ color: DL.gold }} />
                <span className="text-xs" style={{ color: DL.textMuted }}>Giá trị dự kiến</span>
              </div>
              <div className="text-lg font-black" style={{ color: lead.expectedValue > 0 ? DL.gold : DL.textDim }}>
                {lead.expectedValue > 0 ? formatVND(lead.expectedValue) : "—"}
              </div>
            </div>
          </div>

          {/* CTA: Tạo đơn hàng */}
          <Link href={`/admin/orders/new?customerId=${lead.id}&customerName=${encodeURIComponent(lead.name)}&customerPhone=${encodeURIComponent(lead.phone)}&customerEmail=${encodeURIComponent(lead.email || "")}`}
            className={`${customerStyles.blueButton} block w-full py-3 rounded-2xl text-center font-bold text-sm transition-all`}>
            <div className="flex items-center justify-center gap-2">
              <ShoppingCart size={15} />
              <span>Tạo đơn hàng</span>
            </div>
            <div className="text-xs font-normal mt-0.5 opacity-70">Chuyển khách hàng thành đơn hàng</div>
          </Link>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAddActivity && (
        <DLAddActivityModal
          leadId={lead.id}
          onClose={() => setShowAddActivity(false)}
          onCreated={act => { setActivities(prev => [act, ...prev]); setShowAddActivity(false); }}
        />
      )}
      {showAddTask && (
        <DLAddTaskModal
          leadId={lead.id} leadName={lead.name}
          isAdmin={isAdmin} currentUserName={currentUserName} staffList={staffList}
          onClose={() => setShowAddTask(false)}
          onCreated={task => { setTasks(prev => [task, ...prev]); setShowAddTask(false); }}
        />
      )}
      {showEditLead && (
        <EditLeadModal
          lead={lead}
          onClose={() => setShowEditLead(false)}
          onUpdated={updated => { setLead(updated); setShowEditLead(false); }}
        />
      )}
      {/* Contact Action Modal */}
      {contactModal && (
        <div className={`${customerStyles.modalBackdrop} fixed inset-0 z-50 flex items-center justify-center p-4`}
          onClick={() => setContactModal(null)}>
          <div className={`${customerStyles.modalPanel} rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden`}
            style={{ background: DL.modalBg, border: `1px solid ${DL.border}` }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 flex items-start justify-between"
              style={{
                background: contactModal === 'call' ? "rgba(74,222,128,0.12)" : contactModal === 'zalo' ? "rgba(96,165,250,0.12)" : "rgba(192,132,252,0.12)",
                borderBottom: `1px solid ${DL.border}`
              }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: contactModal === 'call' ? "#4ade80" : contactModal === 'zalo' ? "#60a5fa" : "#c084fc" }}>
                  {contactModal === 'call' ? "☎️ Gọi Điện" : contactModal === 'zalo' ? "💬 Kết Bạn Zalo" : "✉️ Gửi Email"}
                </p>
                <p className="text-sm font-bold" style={{ color: DL.text }}>{lead.name}</p>
                <p className="text-xs font-mono mt-0.5"
                  style={{ color: contactModal === 'call' ? "#4ade80" : contactModal === 'zalo' ? "#60a5fa" : "#c084fc" }}>
                  {contactModal === 'email' ? lead.email : lead.phone}
                </p>
              </div>
              <button onClick={() => setContactModal(null)}
                style={{ background: DL.surfaceHover, border: `1px solid ${DL.border}`, borderRadius: 8, padding: 6, cursor: "pointer", color: DL.textMuted, lineHeight: 0 }}>
                <X size={14} />
              </button>
            </div>
            {/* Actions */}
            <div className="p-2">
              {contactModal === 'call' && (
                <>
                  {/* ITY Webphone Call */}
                  <button
                    onClick={() => {
                      // Dispatch event để ItySoftphone widget nhận và gọi qua Webphone
                      window.dispatchEvent(new CustomEvent("ity:call", {
                        detail: { phone: lead.phone, leadId: lead.id, leadName: lead.name }
                      }));
                      setContactModal(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,168,76,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.15)" }}>
                      <Phone size={15} style={{ color: "#C9A84C" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: DL.text }}>Gọi qua ITY Tổng đài</p>
                      <p className="text-xs" style={{ color: DL.textMuted }}>Webphone — gọi trực tiếp trên trình duyệt</p>
                    </div>
                    <span className="ml-auto" style={{ color: DL.textDim }}>→</span>
                  </button>
                  <button onClick={() => { window.location.href = `tel:${lead.phone}`; setContactModal(null); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(74,222,128,0.15)" }}>
                      <Phone size={15} style={{ color: "#4ade80" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: DL.text }}>Gọi ngay</p>
                      <p className="text-xs" style={{ color: DL.textMuted }}>Khởi động ứng dụng gọi</p>
                    </div>
                    <span className="ml-auto" style={{ color: DL.textDim }}>→</span>
                  </button>
                  <button onClick={() => handleContactCopy(lead.phone)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: contactCopied ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)" }}>
                      <Copy size={15} style={{ color: contactCopied ? "#4ade80" : "#f59e0b" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: DL.text }}>{contactCopied ? "✓ Đã sao chép" : "Sao chép số"}</p>
                      <p className="text-xs" style={{ color: DL.textMuted }}>Dán vào điện thoại</p>
                    </div>
                  </button>
                </>
              )}
              {contactModal === 'zalo' && (
                <>
                  <button onClick={() => { window.open(`https://zalo.me/${lead.phone?.replace(/^0/, '84').replace(/^\+/, '')}`, '_blank'); setContactModal(null); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(96,165,250,0.15)" }}>
                      <ExternalLink size={15} style={{ color: "#60a5fa" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: DL.text }}>Mở Zalo</p>
                      <p className="text-xs" style={{ color: DL.textMuted }}>Kết bạn trực tiếp</p>
                    </div>
                    <span className="ml-auto" style={{ color: DL.textDim }}>→</span>
                  </button>
                  <button onClick={() => handleContactCopy(lead.phone?.replace(/^0/, '84').replace(/^\+/, '') || lead.phone)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: contactCopied ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)" }}>
                      <Copy size={15} style={{ color: contactCopied ? "#4ade80" : "#f59e0b" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: DL.text }}>{contactCopied ? "✓ Đã sao chép" : "Sao chép số"}</p>
                      <p className="text-xs" style={{ color: DL.textMuted }}>Dán vào Zalo</p>
                    </div>
                  </button>
                </>
              )}
              {contactModal === 'email' && lead.email && (
                <>
                  <button onClick={() => { window.location.href = `mailto:${lead.email}`; setContactModal(null); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(192,132,252,0.15)" }}>
                      <Mail size={15} style={{ color: "#c084fc" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: DL.text }}>Soạn email</p>
                      <p className="text-xs" style={{ color: DL.textMuted }}>Mở ứng dụng email</p>
                    </div>
                    <span className="ml-auto" style={{ color: DL.textDim }}>→</span>
                  </button>
                  <button onClick={() => handleContactCopy(lead.email || '')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: contactCopied ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)" }}>
                      <Copy size={15} style={{ color: contactCopied ? "#4ade80" : "#f59e0b" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: DL.text }}>{contactCopied ? "✓ Đã sao chép" : "Sao chép email"}</p>
                      <p className="text-xs" style={{ color: DL.textMuted }}>Dán vào email</p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className={`${customerStyles.modalBackdrop} fixed inset-0 z-50 flex items-center justify-center p-4`}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
          <div className={`${customerStyles.modalPanel} rounded-2xl shadow-2xl w-full max-w-sm p-6`}
            style={{ background: DL.modalBg, border: `1px solid ${DL.border}` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <Trash2 size={17} style={{ color: "#dc2626" }} />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: DL.text }}>Xóa khách hàng?</h2>
                <p className="text-sm mt-0.5" style={{ color: DL.textMuted }}>Thao tác này không thể hoàn tác</p>
              </div>
            </div>
            <p className="text-sm mb-5 p-3 rounded-xl" style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}>
              Bạn có chắc muốn xóa <strong style={{ color: DL.text }}>{lead.name}</strong>? Tất cả hoạt động, báo giá và công việc liên quan cũng sẽ bị xóa.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-sm rounded-xl transition-all"
                style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}>
                Hủy
              </button>
              <button onClick={deleteLead} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff" }}>
                {deleting && <Loader2 size={13} className="animate-spin" />}
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

function DLInfoCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className={`${customerStyles.statCard} rounded-xl px-3 py-2`} style={{ background: `linear-gradient(135deg, #ffffff, ${color}0b)`, border: `1px solid ${color}30`, backdropFilter: "blur(8px)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} style={{ color }} />
        <span className="text-[11px]" style={{ color: DL.textMuted }}>{label}</span>
      </div>
      <div className="text-sm font-extrabold truncate" style={{ color: value === "—" ? DL.textDim : DL.text }}>{value}</div>
    </div>
  );
}

function DLInfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: `1px solid ${DL.border}` }}>
      <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: DL.textMuted }}>{label}</span>
      <span className="text-sm text-right" style={{ color: highlight ? DL.gold : DL.text }}>{value}</span>
    </div>
  );
}

function SidebarInfoRow({ icon: Icon, label, value, iconColor, highlight }: { icon: React.ElementType; label: string; value: string; iconColor: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}15` }}>
        <Icon size={11} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px]" style={{ color: DL.textMuted }}>{label}</div>
        <div className="text-xs font-semibold truncate" style={{ color: highlight ? DL.gold : DL.text }}>{value}</div>
      </div>
    </div>
  );
}

function QuoteStatusBadge({ status }: { status: Quote["status"] }) {
  const map = {
    draft: { label: "Nháp", color: DL.textMuted },
    sent: { label: "Đã gửi", color: "#60a5fa" },
    accepted: { label: "Chấp nhận", color: "#34d399" },
    rejected: { label: "Từ chối", color: "#dc2626" },
  };
  const s = map[status];
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block"
      style={{ background: `${s.color}15`, color: s.color }}>
      {s.label}
    </span>
  );
}

function DLTaskItem({ task, onToggle, onDelete }: { task: CrmTask; onToggle: () => void; onDelete: () => void }) {
  const isOverdueTask = !task.done && new Date(task.dueDate) < new Date();
  const priorityColor = { high: "#dc2626", medium: DL.gold, low: "#16a34a" }[task.priority];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: task.done ? "#f8fafc" : DL.surface,
        border: `1px solid ${isOverdueTask ? "#fecdd3" : DL.border}`,
      }}>
      <button onClick={onToggle}
        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          borderColor: task.done ? "#34d399" : DL.border,
          background: task.done ? "#34d399" : "transparent",
        }}>
        {task.done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: task.done ? DL.textMuted : DL.text, textDecoration: task.done ? "line-through" : "none" }}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: isOverdueTask ? "#dc2626" : DL.textMuted }}>
            {new Date(task.dueDate).toLocaleDateString("vi-VN")}
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: priorityColor }} />
          {task.assignedTo && <span className="text-[10px]" style={{ color: DL.textMuted }}>· {task.assignedTo}</span>}
        </div>
      </div>
      <button onClick={onDelete} className="transition-colors flex-shrink-0"
        style={{ color: DL.textDim }}
        onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
        onMouseLeave={e => (e.currentTarget.style.color = DL.textDim)}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function DLAddActivityModal({ leadId, onClose, onCreated }: { leadId: string; onClose: () => void; onCreated: (a: Activity) => void }) {
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, type, title, content, createdBy, attachments: [] }),
      });
      if (!res.ok) throw new Error();
      onCreated(await res.json());
    } finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    background: DL.inputBg,
    border: `1px solid ${DL.inputBorder}`,
    color: DL.text,
    colorScheme: "light",
  };
  const inputFocusStyle: React.CSSProperties = {
    border: `1px solid ${DL.borderGold}`,
    outline: "none",
    boxShadow: `0 0 0 3px rgba(212,175,69,0.16)`,
  };

  return (
    <div className={`${customerStyles.modalBackdrop} fixed inset-0 z-50 flex items-center justify-center p-4`}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${customerStyles.modalPanel} rounded-2xl shadow-2xl w-full max-w-md`}
        style={{
          background: DL.modalBg,
          border: `1px solid ${DL.border}`,
        }}>
        {/* Header */}
        <div className={`${customerStyles.modalHeader} flex items-center justify-between px-6 py-4`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${ACTIVITY_COLORS[type]}18`, border: `1px solid ${ACTIVITY_COLORS[type]}40` }}>
              <span style={{ fontSize: 14 }}>
                {type === "call" ? "📞" : type === "meeting" ? "🤝" : type === "email" ? "✉️" : type === "note" ? "📝" : type === "quote_sent" ? "💰" : "📄"}
              </span>
            </div>
            <h2 className="text-base font-bold" style={{ color: DL.text }}>Thêm hoạt động</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: DL.surfaceHover, color: DL.textMuted, border: `1px solid ${DL.border}` }}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {/* Loại hoạt động */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2.5"
              style={{ color: DL.textMuted }}>Loại hoạt động</label>
            <div className="grid grid-cols-3 gap-2">
              {(["call", "meeting", "email", "note", "quote_sent", "contract"] as ActivityType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className="py-2.5 text-xs font-semibold rounded-xl transition-all"
                  style={{
                    background: type === t ? `${ACTIVITY_COLORS[t]}18` : DL.inputBg,
                    border: `1px solid ${type === t ? ACTIVITY_COLORS[t] + "80" : DL.border}`,
                    color: type === t ? ACTIVITY_COLORS[t] : DL.textMuted,
                    boxShadow: type === t ? `0 0 12px ${ACTIVITY_COLORS[t]}20` : "none",
                  }}>
                  {ACTIVITY_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Tiêu đề */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: DL.textMuted }}>Tiêu đề</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl transition-all"
              style={{ ...inputStyle }}
              onFocus={e => Object.assign(e.currentTarget.style, inputFocusStyle)}
              onBlur={e => { e.currentTarget.style.border = inputStyle.border as string; e.currentTarget.style.boxShadow = "none"; }}
              placeholder="VD: Gọi tư vấn lần 1" />
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: DL.textMuted }}>
              Nội dung <span style={{ color: DL.gold }}>*</span>
            </label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl resize-none transition-all"
              style={{ ...inputStyle }}
              onFocus={e => Object.assign(e.currentTarget.style, inputFocusStyle)}
              onBlur={e => { e.currentTarget.style.border = inputStyle.border as string; e.currentTarget.style.boxShadow = "none"; }}
              placeholder="Mô tả chi tiết kết quả cuộc gọi, nội dung gặp mặt..." />
          </div>

          {/* Người thực hiện */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: DL.textMuted }}>Người thực hiện</label>
            <input value={createdBy} onChange={e => setCreatedBy(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl transition-all"
              style={{ ...inputStyle }}
              onFocus={e => Object.assign(e.currentTarget.style, inputFocusStyle)}
              onBlur={e => { e.currentTarget.style.border = inputStyle.border as string; e.currentTarget.style.boxShadow = "none"; }}
              placeholder="Tên nhân viên thực hiện" />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className={`${customerStyles.secondaryButton} flex-1 py-2.5 text-sm font-medium rounded-xl transition-all`}>
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className={`${customerStyles.primaryButton} flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2`}
              style={{
                opacity: loading ? 0.65 : 1,
              }}
              >
              {loading && <Loader2 size={13} className="animate-spin" />}
              {loading ? "Đang lưu..." : "Lưu hoạt động"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DLAddTaskModal({ leadId, leadName, isAdmin = false, currentUserName = "", staffList = [], onClose, onCreated }: { leadId: string; leadName: string; isAdmin?: boolean; currentUserName?: string; staffList?: { id: string; fullName: string }[]; onClose: () => void; onCreated: (t: CrmTask) => void }) {
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, leadName, title, dueDate, priority, assignedTo, done: false }),
      });
      if (!res.ok) throw new Error();
      onCreated(await res.json());
    } finally { setLoading(false); }
  }

  const inputStyle = { background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text };

  return (
    <div className={`${customerStyles.modalBackdrop} fixed inset-0 z-50 flex items-center justify-center p-4`}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${customerStyles.modalPanel} rounded-2xl shadow-2xl w-full max-w-md`}
        style={{ background: DL.modalBg, border: `1px solid ${DL.border}` }}>
        <div className={`${customerStyles.modalHeader} flex items-center justify-between px-6 py-4`}>
          <h2 className="text-base font-bold" style={{ color: DL.text }}>Thêm việc cần làm</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: DL.surface, color: DL.textMuted }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: DL.textMuted }}>Nội dung *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
              style={{ ...inputStyle }}
              placeholder="VD: Gọi lại cho khách sau 2 ngày" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: DL.textMuted }}>Hạn chót</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ ...inputStyle }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: DL.textMuted }}>Ưu tiên</label>
              <select value={priority} onChange={e => setPriority(e.target.value as CrmTask["priority"])}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ ...inputStyle }}>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>
          {isAdmin && staffList.length > 0 ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: DL.textMuted }}>Giao cho nhân viên</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ ...inputStyle }}>
                <option value="">— Chưa phân công —</option>
                {staffList.map(s => <option key={s.id} value={s.fullName}>{s.fullName}</option>)}
              </select>
            </div>
          ) : !isAdmin && currentUserName ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: DL.textMuted }}>Giao cho</label>
              <div className="w-full px-3 py-2 text-sm rounded-lg flex items-center gap-2"
                style={{ background: `${DL.gold}0d`, border: `1px solid ${DL.gold}25`, color: DL.text }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: `${DL.gold}20`, color: DL.gold }}>{currentUserName[0]}</span>
                {currentUserName}
                <span className="ml-auto text-xs" style={{ color: DL.textMuted }}>(bạn)</span>
              </div>
            </div>
          ) : null}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className={`${customerStyles.secondaryButton} flex-1 py-2.5 text-sm rounded-xl transition-all`}
              style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}>
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className={`${customerStyles.primaryButton} flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all`}>
              {loading && <Loader2 size={13} className="animate-spin" />}
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
  const [leadTypes, setLeadTypes] = useState<{ id: string; label: string; color: string }[]>([]);
  useEffect(() => {
    fetch("/api/crm/settings/lead-types")
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; label: string; color: string }[]) => {
        if (Array.isArray(data) && data.length > 0) setLeadTypes(data);
      })
      .catch(() => {});
  }, []);
  const [form, setForm] = useState({
    name: lead.name, company: lead.company || "", phone: lead.phone, email: lead.email || "",
    type: lead.type, district: lead.district || "",
    expectedValue: lead.expectedValue > 0 ? String(lead.expectedValue) : "",
    source: lead.source || "", assignedTo: lead.assignedTo || "",
    projectName: lead.projectName || "", projectAddress: lead.projectAddress || "",
    unitCount: lead.unitCount > 0 ? String(lead.unitCount) : "", notes: lead.notes || "",
  });

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập tên khách hàng"); return; }
    if (!form.phone.trim()) { setError("Vui lòng nhập số điện thoại"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expectedValue: parseFloat(form.expectedValue) || 0, unitCount: parseInt(form.unitCount) || 0 }),
      });
      if (!res.ok) throw new Error(await res.text());
      onUpdated(await res.json());
    } catch { setError("Có lỗi xảy ra, vui lòng thử lại"); }
    finally { setLoading(false); }
  }

  const inputStyle = { background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text };
  const labelStyle = { color: DL.textMuted };

  return (
    <div className={`${customerStyles.modalBackdrop} fixed inset-0 z-50 flex items-center justify-center p-4`}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${customerStyles.modalPanel} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
        style={{ background: DL.modalBg, border: `1px solid ${DL.border}` }}>
        <div className={`${customerStyles.modalHeader} flex items-center justify-between px-6 py-4 sticky top-0 z-10`}
          style={{ background: DL.modalBg, borderBottom: `1px solid ${DL.border}` }}>
          <h2 className="text-base font-bold" style={{ color: DL.text }}>Chỉnh sửa khách hàng</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: DL.surface, color: DL.textMuted }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#dc2626" }}>
              {error}
            </div>
          )}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DL.textMuted }}>Thông tin cơ bản</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Tên khách hàng *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} required
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Công ty / Dự án</label>
                <input value={form.company} onChange={e => set("company", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="Tên công ty" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Loại khách *</label>
                <select value={form.type} onChange={e => set("type", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }}>
                  {leadTypes.length > 0
                    ? leadTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.label}</option>)
                    : CRM_LEAD_TYPE_OPTIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)
                  }
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Số điện thoại *</label>
                <input value={form.phone} onChange={e => set("phone", e.target.value)} required
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="0901234567" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Email</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="email@example.com" />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DL.textMuted }}>Thông tin kinh doanh</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Giá trị dự kiến (VND)</label>
                <input type="number" value={form.expectedValue} onChange={e => set("expectedValue", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="500000000" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Số căn / phòng</label>
                <input type="number" value={form.unitCount} onChange={e => set("unitCount", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="10" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Khu vực</label>
                <input value={form.district} onChange={e => set("district", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="Q1, TP.HCM" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Nguồn</label>
                <input value={form.source} onChange={e => set("source", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="Facebook Ads" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Sales phụ trách</label>
                <input value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="Tên nhân viên" />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DL.textMuted }}>Thông tin dự án</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Tên dự án</label>
                <input value={form.projectName} onChange={e => set("projectName", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="Vinhomes Central Park" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Địa chỉ dự án</label>
                <input value={form.projectAddress} onChange={e => set("projectAddress", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="720A Điện Biên Phủ, Q.Bình Thạnh" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Ghi chú</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
              style={{ ...inputStyle }} placeholder="Ghi chú thêm về khách hàng..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className={`${customerStyles.secondaryButton} flex-1 py-2.5 text-sm rounded-xl transition-all`}
              style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}>
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className={`${customerStyles.primaryButton} flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all`}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
