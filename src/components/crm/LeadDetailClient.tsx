"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MapPin, User,
  Calendar, Edit3, Trash2, Plus, CheckSquare, FileText,
  Clock, MessageSquare, Users, Send, FileCheck, Loader2,
  ChevronDown, AlertCircle, Tag, DollarSign, Home, X,
  ShoppingCart, ExternalLink, Star, Copy,
  PhoneCall, PhoneMissed, PhoneIncoming, Play, Pause, Save,
  MessageCircle, MoreHorizontal, ListChecks, Workflow, CirclePause, BriefcaseBusiness,
  Sparkles, ChevronUp, CheckCircle2, RefreshCw, Upload,
} from "lucide-react";
import type {
  Lead, Activity, Quote, CrmTask, LeadStage, ActivityType, CallLog, InterestedProduct,
  B2BCustomerGroup, B2BCustomerSubtype, CustomerContactRole, CustomerMarketScope,
} from "@/lib/crm-types";
import type { FacebookGroupLeadSource } from "@/lib/facebook-group-marketing-types";
import { formatDuration } from "@/lib/crm-types";
import {
  STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS,
  ACTIVITY_LABELS, DISTRICTS, SOURCES, formatVND, isOverdue,
} from "@/lib/crm-types";
import customerStyles from "./CustomerWorkspace.module.css";
import {
  B2B_GROUP_LABELS,
  B2B_SUBTYPE_LABELS,
  CONTACT_ROLE_LABELS,
  CRM_B2B_GROUP_OPTIONS,
  CRM_B2B_SUBTYPE_OPTIONS,
  CRM_CONTACT_ROLE_OPTIONS,
  CRM_MARKET_SCOPE_OPTIONS,
  CRM_PRODUCT_OPTIONS,
  PRODUCT_LABELS,
  legacyLeadTypeForCustomerClassification,
} from "@/lib/crm-taxonomy";
import ZaloFriendshipStatus from "./ZaloFriendshipStatus";

// ─── Light Zalo OA Theme Tokens ───────────────────────────────────────────────
const DL = {
  bg: "linear-gradient(180deg, #f7faff 0%, #eef4fb 100%)",
  surface: "#ffffff",
  surfaceHover: "#eef3f8",
  surfaceActive: "#eaf3ff",
  border: "#dbe3ee",
  borderGold: "rgba(0,104,255,0.36)",
  text: "#172033",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  gold: "#0068ff",
  goldDark: "#0056d6",
  goldGlow: "rgba(0,104,255,0.18)",
  header: "linear-gradient(135deg, #ffffff 0%, #f7fbff 100%)",
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

const TABS = ["timeline", "calls", "tasks", "quotes", "info"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  timeline: "Tổng quan",
  calls: "Tương tác",
  tasks: "Công việc",
  quotes: "Kinh doanh",
  info: "Thông tin",
};

type InteractionFilter = "all" | "call" | "zalo" | "email" | "note";

function interactionKind(activity: Activity): InteractionFilter {
  const text = `${activity.title || ""} ${activity.content || ""}`.toLowerCase();
  if (activity.type === "call") return "call";
  if (activity.type === "email") return "email";
  if (text.includes("zalo")) return "zalo";
  return "note";
}

function activityGroupLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((today - target) / 86400000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

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
  const [, setCallLogsLoaded] = useState(false);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null);
  const [approvingCallId, setApprovingCallId] = useState<string | null>(null);
  const [expandedCallAi, setExpandedCallAi] = useState<Set<string>>(new Set());
  const [callAiError, setCallAiError] = useState<Record<string, string>>({});
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contactModal, setContactModal] = useState<'call' | 'zalo' | 'email' | null>(null);
  const [contactCopied, setContactCopied] = useState(false);
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>("all");
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [visibleActivityCount, setVisibleActivityCount] = useState(10);

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

  const analyzeCall = async (callId: string, force = false, recordingFile?: File) => {
    setAnalyzingCallId(callId);
    setCallAiError(prev => ({ ...prev, [callId]: "" }));
    try {
      const form = recordingFile ? new FormData() : null;
      if (form && recordingFile) {
        form.append("recording", recordingFile);
        form.append("force", String(force));
      }
      const res = await fetch(`/api/crm/call-logs/${callId}/ai-analysis`, form ? {
        method: "POST",
        body: form,
      } : {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.call?.aiError || "Không thể phân tích cuộc gọi");
      if (data.call) setCallLogs(prev => prev.map(item => item.id === callId ? data.call : item));
      setExpandedCallAi(prev => new Set(prev).add(callId));
    } catch (error) {
      setCallAiError(prev => ({ ...prev, [callId]: error instanceof Error ? error.message : "Không thể phân tích cuộc gọi" }));
      await loadCallLogs();
    } finally {
      setAnalyzingCallId(null);
    }
  };

  const approveCallNextAction = async (callId: string) => {
    setApprovingCallId(callId);
    setCallAiError(prev => ({ ...prev, [callId]: "" }));
    try {
      const res = await fetch(`/api/crm/call-logs/${callId}/ai-analysis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_next_action" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo việc chăm sóc");
      if (data.call) setCallLogs(prev => prev.map(item => item.id === callId ? data.call : item));
      if (data.task) setTasks(prev => [data.task, ...prev]);
    } catch (error) {
      setCallAiError(prev => ({ ...prev, [callId]: error instanceof Error ? error.message : "Không thể tạo việc chăm sóc" }));
    } finally {
      setApprovingCallId(null);
    }
  };

  const overdue = isOverdue(lead);
  const openTasks = tasks
    .filter(task => !task.done)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextTask = openTasks[0];
  const lastInteractionAt = activities[0]?.createdAt || lead.lastContactAt;
  const filteredActivities = activities.filter(activity => interactionFilter === "all" || interactionKind(activity) === interactionFilter);
  const visibleActivities = filteredActivities.slice(0, visibleActivityCount);

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

  const customerClassificationLabel = lead.marketScope === "b2c"
    ? "Khách mua lẻ"
    : lead.b2bCustomerSubtype
      ? B2B_SUBTYPE_LABELS[lead.b2bCustomerSubtype]
      : lead.b2bCustomerGroup
        ? B2B_GROUP_LABELS[lead.b2bCustomerGroup]
        : TYPE_LABELS[lead.type];
  const customerContactRoleLabel = lead.contactRole && lead.contactRole !== "unknown"
    ? CONTACT_ROLE_LABELS[lead.contactRole]
    : undefined;

  return (
    <div className={`${customerStyles.workspace} flex flex-col h-full`} style={{ background: DL.bg, minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div className={`${customerStyles.headerSurface} flex-shrink-0 mx-3 sm:mx-5 mt-2 rounded-2xl px-3 sm:px-4 py-2.5 backdrop-blur-sm sticky top-2`}
        style={{ background: DL.header, border: `1px solid ${DL.border}`, boxShadow: "0 12px 30px rgba(31,62,104,.08)", overflow: "visible", position: "sticky", zIndex: 100 }}>
        <div className="flex items-center gap-2.5">
          <Link href="/crm/leads"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            style={{ color: DL.textMuted }}
            title="Quay lại danh sách khách hàng">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${TYPE_COLORS[lead.type]}, #0068ff)` }}>
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base font-bold truncate" style={{ color: DL.text }}>{lead.name}</h1>
              <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${TYPE_COLORS[lead.type]}18`, color: TYPE_COLORS[lead.type], border: `1px solid ${TYPE_COLORS[lead.type]}30` }}>
                {customerClassificationLabel}
              </span>
              {customerContactRoleLabel && (
                <span className="hidden lg:inline text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: "#f8fafc", color: DL.textMuted, border: `1px solid ${DL.border}` }}>
                  {customerContactRoleLabel}
                </span>
              )}
              {overdue && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#fff1f2", color: "#dc2626", border: "1px solid #fecdd3" }}>
                  <AlertCircle size={10} /> Quá hạn
                </span>
              )}
            </div>
            <div className="text-xs truncate mt-0.5" style={{ color: DL.textMuted }}>{lead.company || lead.phone}</div>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <button onClick={() => setContactModal("call")} className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
              style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}><Phone size={14} /> Gọi</button>
            <button onClick={() => setContactModal("zalo")} className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
              style={{ background: "#eaf3ff", color: DL.gold, border: "1px solid #bfdbfe" }}><MessageCircle size={14} /> Zalo</button>
            {lead.email && <button onClick={() => setContactModal("email")} className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
              style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe" }}><Mail size={14} /> Email</button>}
          </div>

          <div className="flex items-center gap-2">
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

            <div className="relative">
              <button onClick={() => setShowActionMenu(value => !value)} className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }} aria-label="Mở menu thao tác">
                <MoreHorizontal size={18} />
              </button>
              {showActionMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl p-1.5" style={{ background: DL.modalBg, border: `1px solid ${DL.border}`, zIndex: 9999 }}>
                  <button onClick={() => { setShowEditLead(true); setShowActionMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-slate-50" style={{ color: DL.text }}><Edit3 size={15} /> Chỉnh sửa hồ sơ</button>
                  <Link href={`/crm/quotes/new?leadId=${lead.id}&leadName=${encodeURIComponent(lead.name)}`} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50" style={{ color: DL.text }}><FileText size={15} /> Tạo báo giá</Link>
                  <Link href={`/admin/orders/new?customerId=${lead.id}&customerName=${encodeURIComponent(lead.name)}&customerPhone=${encodeURIComponent(lead.phone)}&customerEmail=${encodeURIComponent(lead.email || "")}`} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-50" style={{ color: DL.text }}><ShoppingCart size={15} /> Tạo đơn hàng</Link>
                  {isAdmin && <button onClick={() => { setShowDeleteConfirm(true); setShowActionMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-red-50" style={{ color: "#dc2626" }}><Trash2 size={15} /> Xóa khách hàng</button>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto xl:overflow-hidden flex flex-col xl:flex-row gap-0 pb-20 md:pb-0">
        {/* Left: Main content */}
        <div className="flex-1 xl:overflow-y-auto p-3 sm:p-4 min-w-0">
          {/* Quick stats */}
          <div className="flex gap-2 overflow-x-auto mb-3 pb-0.5">
            <DLInfoCard icon={Star} label="Sản phẩm" value={lead.interestedProducts?.length ? lead.interestedProducts.map(product => PRODUCT_LABELS[product]).join(", ") : "Chưa xác định"} color="#6366f1" />
            {lead.district && <DLInfoCard icon={MapPin} label="Khu vực" value={lead.district} color="#8b5cf6" />}
            {lead.assignedTo && <DLInfoCard icon={User} label="Phụ trách" value={lead.assignedTo} color="#0068ff" />}
            {lastInteractionAt && <DLInfoCard icon={Clock} label="Tương tác cuối" value={new Date(lastInteractionAt).toLocaleDateString("vi-VN")} color="#0ea5e9" />}
            {lead.expectedValue > 0 && <DLInfoCard icon={DollarSign} label="Giá trị" value={formatVND(lead.expectedValue)} color="#f59e0b" />}
            <DLInfoCard icon={Workflow} label="Workflow" value={lead.stage === "won" || lead.stage === "lost" ? "Đã dừng" : "Đang tiếp tục"} color={lead.stage === "won" || lead.stage === "lost" ? "#64748b" : "#10b981"} />
            <ZaloFriendshipStatus leadId={lead.id} initialSummary={lead.zaloFriendship} />
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
                    background: activeTab === tab ? "linear-gradient(135deg, #f2f7ff, #eaf3ff)" : "transparent",
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
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: DL.text }}>Tổng quan tương tác</h3>
                      <p className="text-xs mt-0.5" style={{ color: DL.textMuted }}>Hoạt động mới nhất của khách hàng và đội ngũ</p>
                    </div>
                    <button onClick={() => setShowAddActivity(true)}
                      className={`${customerStyles.primaryButton} flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all`}>
                      <Plus size={13} /> Thêm hoạt động
                    </button>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto mb-4">
                    {([['all', 'Tất cả'], ['call', 'Cuộc gọi'], ['zalo', 'Zalo'], ['email', 'Email'], ['note', 'Ghi chú']] as const).map(([value, label]) => (
                      <button key={value} onClick={() => { setInteractionFilter(value); setVisibleActivityCount(10); }}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{ background: interactionFilter === value ? DL.gold : DL.surface, color: interactionFilter === value ? '#fff' : DL.textMuted, border: `1px solid ${interactionFilter === value ? DL.gold : DL.border}` }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {activities.length === 0 ? (
                    <div className="text-center py-14">
                      <Clock size={30} className="mx-auto mb-3 opacity-20" style={{ color: DL.textMuted }} />
                      <p className="text-sm" style={{ color: DL.textMuted }}>Chưa có hoạt động nào</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {visibleActivities.map((act, idx) => {
                        const Icon = ACTIVITY_TYPE_ICONS[act.type];
                        // Phân biệt màu cho activity "Gọi điện" dựa vào nội dung
                        let color = ACTIVITY_COLORS[act.type];
                        if (act.type === "call" && act.content) {
                          if (act.content.startsWith("Thành công")) color = "#22c55e";      // xanh lá
                          else if (act.content.startsWith("Không nghe") || act.content.startsWith("Không ngập")) color = "#f97316"; // cam
                          else if (act.content.startsWith("Bận")) color = "#f59e0b";        // vàng
                          else if (act.content.startsWith("Thất bại")) color = "#dc2626";  // đỏ
                        }
                        const expanded = expandedActivities.has(act.id);
                        const showGroup = idx === 0 || activityGroupLabel(visibleActivities[idx - 1].createdAt) !== activityGroupLabel(act.createdAt);
                        const isAutomation = (act.createdBy || '').toLowerCase().includes('automation') || `${act.title} ${act.content}`.toLowerCase().includes('workflow');
                        return (
                          <div key={act.id}>
                            {showGroup && <div className="text-[11px] font-bold uppercase tracking-wider pt-3 pb-2" style={{ color: DL.textDim }}>{activityGroupLabel(act.createdAt)}</div>}
                            <div className="flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: `${color}15`, border: `1.5px solid ${color}35` }}>
                                <Icon size={13} style={{ color }} />
                              </div>
                              {idx < visibleActivities.length - 1 && (
                                <div className="w-px flex-1 mt-1" style={{ background: DL.border, minHeight: "16px" }} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
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
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: isAutomation ? '#eaf3ff' : '#f1f5f9', color: isAutomation ? DL.gold : DL.textMuted }}>{isAutomation ? 'Workflow' : 'Nhân viên'}</span>
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
                              {act.title && <p className="text-sm font-medium mt-1 truncate" style={{ color: DL.text }}>{act.title}</p>}
                              {act.content && <p className="text-sm mt-0.5 leading-relaxed" style={{ color: DL.textMuted, display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{act.content}</p>}
                              {act.content && act.content.length > 150 && <button onClick={() => setExpandedActivities(prev => { const next = new Set(prev); if (next.has(act.id)) next.delete(act.id); else next.add(act.id); return next; })} className="text-xs font-semibold mt-1" style={{ color: DL.gold }}>{expanded ? 'Thu gọn' : 'Xem thêm'}</button>}
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
                          </div>
                        );
                      })}
                      {filteredActivities.length > visibleActivityCount && <button onClick={() => setVisibleActivityCount(count => count + 10)} className="w-full py-2.5 mt-3 rounded-xl text-sm font-semibold" style={{ border: `1px solid ${DL.border}`, color: DL.gold, background: DL.surface }}>Xem thêm {Math.min(10, filteredActivities.length - visibleActivityCount)} hoạt động</button>}
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
                        const analysis = call.aiAnalysis;
                        const aiExpanded = expandedCallAi.has(call.id);
                        const aiBusy = analyzingCallId === call.id;
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
                                  <div className="mt-2 flex items-center gap-2 flex-wrap">
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
                                    <button
                                      onClick={() => analysis
                                        ? setExpandedCallAi(prev => { const next = new Set(prev); if (next.has(call.id)) next.delete(call.id); else next.add(call.id); return next; })
                                        : analyzeCall(call.id)}
                                      disabled={aiBusy}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                                      style={{ background: "rgba(0,104,255,0.10)", border: "1px solid rgba(0,104,255,0.25)", color: DL.gold }}>
                                      {aiBusy ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                      {aiBusy ? "AI đang phân tích" : analysis ? (aiExpanded ? "Thu gọn AI" : "Xem tóm tắt AI") : "Tóm tắt bằng AI"}
                                      {analysis && (aiExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                                    </button>
                                    {analysis && (
                                      <button onClick={() => analyzeCall(call.id, true)} disabled={aiBusy}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                                        style={{ color: DL.textMuted, border: `1px solid ${DL.border}` }} title="Phân tích lại">
                                        <RefreshCw size={10} /> Phân tích lại
                                      </button>
                                    )}
                                  </div>
                                )}
                                {callAiError[call.id] && (
                                  <div className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}>
                                    <div>{callAiError[call.id]}</div>
                                    {call.recordingUrl && !analysis && (
                                      <label className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold text-red-700">
                                        <Upload size={13} /> Chọn file ghi âm để AI phân tích
                                        <input
                                          type="file"
                                          accept="audio/*,.mp3,.mp4,.m4a,.wav,.ogg,.webm"
                                          className="hidden"
                                          disabled={aiBusy}
                                          onChange={event => {
                                            const file = event.currentTarget.files?.[0];
                                            if (file) void analyzeCall(call.id, true, file);
                                            event.currentTarget.value = "";
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                )}
                                {analysis && aiExpanded && (
                                  <div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${DL.borderGold}`, background: "#f8fbff" }}>
                                    <div className="p-4" style={{ background: "linear-gradient(135deg, rgba(0,104,255,.10), rgba(16,185,129,.06))" }}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: DL.text }}><Sparkles size={15} style={{ color: DL.gold }} /> Hồ sơ AI sau cuộc gọi</div>
                                          <p className="mt-2 text-sm leading-relaxed" style={{ color: DL.text }}>{analysis.executiveSummary}</p>
                                        </div>
                                        <span className="text-[11px] whitespace-nowrap px-2 py-1 rounded-full" style={{ color: "#047857", background: "#d1fae5" }}>Tin cậy {analysis.confidence}%</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 mt-3">
                                        {[
                                          ["Phù hợp", analysis.qualification.fitScore],
                                          ["Khẩn cấp", analysis.qualification.urgencyScore],
                                          ["Khả năng mua", analysis.qualification.purchaseProbability],
                                        ].map(([label, score]) => (
                                          <div key={String(label)} className="rounded-lg p-2.5 bg-white" style={{ border: `1px solid ${DL.border}` }}>
                                            <div className="text-[11px]" style={{ color: DL.textMuted }}>{label}</div>
                                            <div className="text-lg font-bold" style={{ color: DL.gold }}>{score}%</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-3 p-4">
                                      <div className="rounded-lg bg-white p-3" style={{ border: `1px solid ${DL.border}` }}>
                                        <h5 className="text-xs font-bold uppercase tracking-wide" style={{ color: DL.gold }}>Nhu cầu đã nhận diện</h5>
                                        <div className="mt-2 space-y-1.5 text-xs" style={{ color: DL.text }}>
                                          <p><b>Nhu cầu chính:</b> {analysis.needs.primaryNeed}</p>
                                          <p><b>Sản phẩm:</b> {analysis.needs.products.join(", ") || "Chưa xác định"}</p>
                                          <p><b>Mục đích:</b> {analysis.needs.useCases.join(", ") || "Chưa xác định"}</p>
                                          <p><b>Số lượng:</b> {analysis.needs.quantity}</p>
                                          <p><b>Kích thước:</b> {analysis.needs.dimensions}</p>
                                          <p><b>Ngân sách:</b> {analysis.needs.budget}</p>
                                          <p><b>Thời điểm:</b> {analysis.needs.timeline}</p>
                                          <p><b>Ưu tiên:</b> {analysis.needs.priorities.join(" · ") || "Chưa xác định"}</p>
                                          <p><b>Vấn đề cần giải quyết:</b> {analysis.needs.painPoints.join(" · ") || "Chưa xác định"}</p>
                                        </div>
                                      </div>
                                      <div className="rounded-lg bg-white p-3" style={{ border: `1px solid ${DL.border}` }}>
                                        <h5 className="text-xs font-bold uppercase tracking-wide" style={{ color: "#059669" }}>Tín hiệu hội thoại</h5>
                                        <div className="mt-2 space-y-1.5 text-xs" style={{ color: DL.text }}>
                                          <p><b>Ý định:</b> {analysis.conversation.intent}</p>
                                          <p><b>Cảm xúc:</b> {analysis.conversation.sentiment} · <b>Quan tâm:</b> {analysis.conversation.interestLevel}</p>
                                          <p><b>Tín hiệu mua:</b> {analysis.conversation.buyingSignals.join(" · ") || "Chưa có"}</p>
                                          <p><b>Câu hỏi:</b> {analysis.conversation.questions.join(" · ") || "Chưa có"}</p>
                                          <p><b>Phản đối:</b> {analysis.conversation.objections.join(" · ") || "Chưa có"}</p>
                                          <p><b>Cam kết:</b> {analysis.conversation.commitments.join(" · ") || "Chưa có"}</p>
                                          <p><b>Rủi ro:</b> {analysis.conversation.risks.join(" · ") || "Chưa có"}</p>
                                          <p><b>Đối thủ:</b> {analysis.conversation.competitors.join(" · ") || "Chưa đề cập"}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mx-4 mb-4 rounded-lg p-3" style={{ background: "#fff", border: "1px solid #bfdbfe" }}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <h5 className="text-sm font-bold" style={{ color: DL.text }}>Bước chăm sóc tiếp theo: {analysis.nextBestAction.title}</h5>
                                          <p className="text-xs mt-1" style={{ color: DL.textMuted }}>{analysis.nextBestAction.objective}</p>
                                          <p className="text-xs mt-1" style={{ color: DL.text }}><b>Lý do:</b> {analysis.nextBestAction.rationale}</p>
                                          <p className="text-xs mt-1" style={{ color: DL.text }}><b>Kênh:</b> {analysis.nextBestAction.channel} · <b>Trong:</b> {analysis.nextBestAction.dueInHours} giờ · <b>Ưu tiên:</b> {analysis.nextBestAction.priority}</p>
                                        </div>
                                        <span className="text-[11px] px-2 py-1 rounded-full whitespace-nowrap" style={{ color: analysis.nextBestAction.workflowRecommendation === "continue" ? "#047857" : "#b45309", background: analysis.nextBestAction.workflowRecommendation === "continue" ? "#d1fae5" : "#fef3c7" }}>
                                          Workflow: {analysis.nextBestAction.workflowRecommendation === "continue" ? "Tiếp tục" : "Cần xem xét"}
                                        </span>
                                      </div>
                                      <p className="text-xs mt-2" style={{ color: DL.textMuted }}>{analysis.nextBestAction.workflowReason}</p>
                                      {analysis.nextBestAction.checklist.length > 0 && (
                                        <ul className="mt-2 space-y-1 text-xs" style={{ color: DL.text }}>{analysis.nextBestAction.checklist.map((item, index) => <li key={index}>□ {item}</li>)}</ul>
                                      )}
                                      <div className="grid lg:grid-cols-2 gap-2 mt-3">
                                        <div className="rounded-lg p-2.5" style={{ background: DL.inputBg }}><b className="text-xs">Tin nhắn gợi ý</b><p className="text-xs mt-1 whitespace-pre-wrap" style={{ color: DL.textMuted }}>{analysis.nextBestAction.draftMessage || "Chưa có"}</p></div>
                                        <div className="rounded-lg p-2.5" style={{ background: DL.inputBg }}><b className="text-xs">Kịch bản gọi lại</b><ol className="text-xs mt-1 space-y-1" style={{ color: DL.textMuted }}>{analysis.nextBestAction.callScript.map((item, index) => <li key={index}>{index + 1}. {item}</li>)}</ol></div>
                                      </div>
                                      <button onClick={() => approveCallNextAction(call.id)} disabled={approvingCallId === call.id || analysis.reviewStatus === "approved"}
                                        className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-70" style={{ background: analysis.reviewStatus === "approved" ? "#059669" : DL.gold }}>
                                        {approvingCallId === call.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                        {analysis.reviewStatus === "approved" ? "Đã tạo việc chăm sóc" : "Duyệt & tạo việc chăm sóc"}
                                      </button>
                                    </div>

                                    <details className="mx-4 mb-4 rounded-lg bg-white" style={{ border: `1px solid ${DL.border}` }}>
                                      <summary className="cursor-pointer p-3 text-xs font-semibold" style={{ color: DL.text }}>Xem bản chép lời, bằng chứng và dữ liệu còn thiếu</summary>
                                      <div className="px-3 pb-3 space-y-3">
                                        {analysis.qualification.dataGaps.length > 0 && <div><b className="text-xs text-amber-700">Cần hỏi thêm</b><p className="text-xs mt-1" style={{ color: DL.textMuted }}>{analysis.qualification.dataGaps.join(" · ")}</p></div>}
                                        {analysis.evidence.length > 0 && <div><b className="text-xs">Bằng chứng từ hội thoại</b>{analysis.evidence.map((item, index) => <blockquote key={index} className="text-xs mt-1 pl-2" style={{ borderLeft: `2px solid ${DL.gold}`, color: DL.textMuted }}>“{item.quote}” — {item.reason}</blockquote>)}</div>}
                                        <div><b className="text-xs">Bản chép lời đầy đủ</b><p className="text-xs mt-1 whitespace-pre-wrap leading-relaxed" style={{ color: DL.textMuted }}>{analysis.transcript}</p></div>
                                      </div>
                                    </details>
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
              {activeTab === "info" && facebookGroupSources.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-4 mt-6" style={{ color: DL.text }}>
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

        {/* ── Action Center ── */}
        <aside className="w-full xl:w-80 flex-shrink-0 p-3 xl:overflow-y-auto border-t xl:border-t-0 xl:border-l" style={{ borderColor: DL.border }}>
          <div className="xl:sticky xl:top-3 space-y-3">
            <div className="rounded-2xl p-4" style={{ background: DL.card, border: `1px solid ${DL.cardBorder}`, boxShadow: "0 8px 24px rgba(31,62,104,.06)" }}>
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm" style={{ color: DL.text }}>Việc tiếp theo</h3><ListChecks size={17} style={{ color: DL.gold }} /></div>
              {nextTask ? <>
                <p className="text-sm font-semibold" style={{ color: DL.text }}>{nextTask.title}</p>
                <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: new Date(nextTask.dueDate) < new Date() ? '#dc2626' : DL.textMuted }}><Calendar size={13} /> {new Date(nextTask.dueDate).toLocaleDateString('vi-VN')} {nextTask.assignedTo && `· ${nextTask.assignedTo}`}</div>
                <button onClick={() => handleTabChange('tasks')} className="w-full mt-3 py-2 rounded-xl text-xs font-bold" style={{ background: '#eaf3ff', color: DL.gold }}>Mở công việc</button>
              </> : <div className="text-center py-3"><CheckSquare size={24} className="mx-auto mb-2" style={{ color: '#10b981' }} /><p className="text-xs" style={{ color: DL.textMuted }}>Không có việc đang mở</p><button onClick={() => setShowAddTask(true)} className="mt-2 text-xs font-bold" style={{ color: DL.gold }}>+ Thêm việc</button></div>}
            </div>

            <div className="rounded-2xl p-4" style={{ background: DL.card, border: `1px solid ${DL.cardBorder}` }}>
              <div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider" style={{ color: DL.textMuted }}>Workflow chăm sóc</div><div className="font-semibold text-sm mt-1" style={{ color: DL.text }}>{lead.stage === 'won' || lead.stage === 'lost' ? 'Đã dừng theo giai đoạn' : 'Đang tiếp tục chạy'}</div></div>{lead.stage === 'won' || lead.stage === 'lost' ? <CirclePause size={20} style={{ color: DL.textMuted }} /> : <Workflow size={20} style={{ color: '#10b981' }} />}</div>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: DL.textMuted }}>{lead.stage === 'won' || lead.stage === 'lost' ? 'Workflow dừng khi khách đã chốt hoặc thất bại.' : 'Các thay đổi giai đoạn khác không làm gián đoạn lịch chăm sóc.'}</p>
              <Link href="/crm/automation" className="inline-flex items-center gap-1 mt-3 text-xs font-bold" style={{ color: DL.gold }}>Xem tại Automation <ExternalLink size={11} /></Link>
            </div>

            <div className="rounded-2xl p-4" style={{ background: DL.card, border: `1px solid ${DL.cardBorder}` }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DL.textMuted }}>Thông tin nhanh</h3>
              <div className="space-y-3">
                <SidebarInfoRow icon={Phone} label="Điện thoại" value={lead.phone} iconColor="#10b981" />
                {lead.email && <SidebarInfoRow icon={Mail} label="Email" value={lead.email} iconColor="#7c3aed" />}
                {lead.district && <SidebarInfoRow icon={MapPin} label="Khu vực" value={lead.district} iconColor="#8b5cf6" />}
                {lead.source && <SidebarInfoRow icon={Tag} label="Nguồn" value={lead.source} iconColor="#0ea5e9" />}
                <SidebarInfoRow icon={BriefcaseBusiness} label="Sản phẩm" value={lead.interestedProducts?.length ? lead.interestedProducts.map(product => PRODUCT_LABELS[product]).join(", ") : "Chưa xác định"} iconColor="#6366f1" />
                <SidebarInfoRow icon={DollarSign} label="Giá trị dự kiến" value={lead.expectedValue > 0 ? formatVND(lead.expectedValue) : "—"} iconColor="#f59e0b" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 grid grid-cols-4 gap-1 rounded-2xl p-2 shadow-2xl" style={{ background: '#fff', border: `1px solid ${DL.border}` }}>
        <button onClick={() => setContactModal('call')} className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold" style={{ color: '#059669' }}><Phone size={18} />Gọi</button>
        <button onClick={() => setContactModal('zalo')} className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold" style={{ color: DL.gold }}><MessageCircle size={18} />Zalo</button>
        <button disabled={!lead.email} onClick={() => lead.email && setContactModal('email')} className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold disabled:opacity-30" style={{ color: '#7c3aed' }}><Mail size={18} />Email</button>
        <button onClick={() => setShowAddActivity(true)} className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold" style={{ color: DL.text }}><Plus size={18} />Hoạt động</button>
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
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,104,255,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,104,255,0.12)" }}>
                      <Phone size={15} style={{ color: DL.gold }} />
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
    <div className={`${customerStyles.statCard} rounded-xl px-3 py-2 flex-shrink-0 min-w-[150px] max-w-[240px]`} style={{ background: `linear-gradient(135deg, #ffffff, ${color}0b)`, border: `1px solid ${color}30`, backdropFilter: "blur(8px)" }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}14` }}><Icon size={13} style={{ color }} /></div>
        <div className="min-w-0"><span className="text-[10px] block" style={{ color: DL.textMuted }}>{label}</span>
        <div className="text-xs font-extrabold truncate" style={{ color: value === "—" ? DL.textDim : DL.text }}>{value}</div></div>
      </div>
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
  const [form, setForm] = useState({
    name: lead.name, company: lead.company || "", phone: lead.phone, email: lead.email || "",
    type: lead.type, district: lead.district || "",
    expectedValue: lead.expectedValue > 0 ? String(lead.expectedValue) : "",
    source: lead.source || "", assignedTo: lead.assignedTo || "",
    projectName: lead.projectName || "", projectAddress: lead.projectAddress || "",
    unitCount: lead.unitCount > 0 ? String(lead.unitCount) : "", notes: lead.notes || "",
    interestedProducts: (lead.interestedProducts ?? []) as InterestedProduct[],
    marketScope: (lead.marketScope ?? (lead.type === "retail" ? "b2c" : "b2b")) as CustomerMarketScope,
    b2bCustomerGroup: (lead.b2bCustomerGroup ?? "") as B2BCustomerGroup | "",
    b2bCustomerSubtype: (lead.b2bCustomerSubtype ?? "") as B2BCustomerSubtype | "",
    contactRole: (lead.contactRole ?? "unknown") as CustomerContactRole,
    classificationSource: "manual" as const,
  });

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })); }
  function toggleProduct(product: InterestedProduct) {
    setForm(prev => ({
      ...prev,
      interestedProducts: prev.interestedProducts.includes(product)
        ? prev.interestedProducts.filter(item => item !== product)
        : [...prev.interestedProducts, product],
    }));
  }

  function setMarketScope(scope: CustomerMarketScope) {
    setForm(prev => {
      const b2bCustomerGroup = scope === "b2c" ? "" : prev.b2bCustomerGroup;
      const b2bCustomerSubtype = scope === "b2c" ? "" : prev.b2bCustomerSubtype;
      return {
        ...prev,
        marketScope: scope,
        b2bCustomerGroup,
        b2bCustomerSubtype,
        type: legacyLeadTypeForCustomerClassification({
          marketScope: scope,
          b2bCustomerGroup: b2bCustomerGroup || undefined,
          b2bCustomerSubtype: b2bCustomerSubtype || undefined,
          currentType: prev.type,
        }),
      };
    });
  }

  function setB2BGroup(group: B2BCustomerGroup | "") {
    setForm(prev => ({
      ...prev,
      marketScope: "b2b",
      b2bCustomerGroup: group,
      b2bCustomerSubtype: "",
      type: legacyLeadTypeForCustomerClassification({
        marketScope: "b2b",
        b2bCustomerGroup: group || undefined,
        currentType: prev.type,
      }),
    }));
  }

  function setB2BSubtype(subtype: B2BCustomerSubtype | "") {
    const meta = CRM_B2B_SUBTYPE_OPTIONS.find(item => item.id === subtype);
    setForm(prev => {
      const b2bCustomerGroup = meta?.groupId ?? prev.b2bCustomerGroup;
      return {
        ...prev,
        marketScope: "b2b",
        b2bCustomerGroup,
        b2bCustomerSubtype: subtype,
        type: legacyLeadTypeForCustomerClassification({
          marketScope: "b2b",
          b2bCustomerGroup: b2bCustomerGroup || undefined,
          b2bCustomerSubtype: subtype || undefined,
          currentType: prev.type,
        }),
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập tên khách hàng"); return; }
    if (!form.phone.trim()) { setError("Vui lòng nhập số điện thoại"); return; }
    if (form.interestedProducts.length === 0) { setError("Vui lòng chọn ít nhất một sản phẩm quan tâm"); return; }
    if (form.marketScope === "b2b" && !form.b2bCustomerSubtype) { setError("Vui lòng chọn loại hình chi tiết cho khách B2B"); return; }
    const parsedUnitCount = Number(form.unitCount);
    if (form.marketScope === "b2b" && (!Number.isInteger(parsedUnitCount) || parsedUnitCount <= 0)) {
      setError("Vui lòng nhập số căn/phòng lớn hơn 0 cho khách B2B");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expectedValue: parseFloat(form.expectedValue) || 0, unitCount: parsedUnitCount || 0 }),
      });
      const response = await res.json().catch(() => null) as (Lead & { error?: string }) | null;
      if (!res.ok) throw new Error(response?.error || "Có lỗi xảy ra, vui lòng thử lại");
      if (!response) throw new Error("Máy chủ không trả về dữ liệu khách hàng");
      onUpdated(response);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Có lỗi xảy ra, vui lòng thử lại");
    }
    finally { setLoading(false); }
  }

  const inputStyle = { background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text };
  const labelStyle = { color: DL.textMuted };
  const parsedUnitCount = Number(form.unitCount);
  const missingProduct = form.interestedProducts.length === 0;
  const missingB2BSubtype = form.marketScope === "b2b" && !form.b2bCustomerSubtype;
  const missingB2BUnitCount = form.marketScope === "b2b" && (!Number.isInteger(parsedUnitCount) || parsedUnitCount <= 0);
  const canSubmit = Boolean(
    form.name.trim()
    && form.phone.trim()
    && !missingProduct
    && !missingB2BSubtype
    && !missingB2BUnitCount
  );
  const missingRequirements = [
    missingProduct ? "sản phẩm" : "",
    missingB2BSubtype ? "loại hình chi tiết" : "",
    missingB2BUnitCount ? "số căn/phòng" : "",
  ].filter(Boolean);

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
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DL.textMuted }}>Phân loại khách hàng</h3>
            <div className="grid grid-cols-2 gap-2">
              {CRM_MARKET_SCOPE_OPTIONS.map(option => {
                const active = form.marketScope === option.id;
                return (
                  <button key={option.id} type="button" onClick={() => setMarketScope(option.id)}
                    className="rounded-xl px-3 py-2.5 text-left transition-all"
                    style={{ background: active ? `${option.color}12` : DL.surface, border: `1px solid ${active ? option.color : DL.border}` }}>
                    <span className="block text-xs font-bold" style={{ color: active ? option.color : DL.text }}>{option.label}</span>
                    <span className="mt-0.5 block text-[10px]" style={{ color: DL.textMuted }}>{option.description}</span>
                  </button>
                );
              })}
            </div>
            {form.marketScope === "b2b" && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Nhóm B2B</label>
                  <select value={form.b2bCustomerGroup} onChange={e => setB2BGroup(e.target.value as B2BCustomerGroup | "")}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }}>
                    <option value="">Chọn nhóm</option>
                    {CRM_B2B_GROUP_OPTIONS.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Loại hình chi tiết *</label>
                  <select value={form.b2bCustomerSubtype} onChange={e => setB2BSubtype(e.target.value as B2BCustomerSubtype | "")}
                    required aria-invalid={missingB2BSubtype}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ ...inputStyle, borderColor: missingB2BSubtype ? "#ef4444" : DL.inputBorder }}>
                    <option value="">Chọn loại hình</option>
                    {CRM_B2B_SUBTYPE_OPTIONS.filter(item => !form.b2bCustomerGroup || item.groupId === form.b2bCustomerGroup).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                  {missingB2BSubtype && <p className="mt-1.5 text-[11px] text-red-600">Bắt buộc chọn loại hình chi tiết.</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Vai trò liên hệ</label>
                  <select value={form.contactRole} onChange={e => set("contactRole", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }}>
                    {CRM_CONTACT_ROLE_OPTIONS.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
                  </select>
                </div>
              </div>
            )}
            <p className="mt-2 text-[11px]" style={{ color: DL.textDim }}>
              Mã workflow tương thích được hệ thống tự duy trì: {form.type}.
            </p>
          </div>
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
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-2" style={labelStyle}>Sản phẩm quan tâm *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CRM_PRODUCT_OPTIONS.map(product => {
                    const active = form.interestedProducts.includes(product.id);
                    return (
                      <button key={product.id} type="button" onClick={() => toggleProduct(product.id)}
                        className="rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all"
                        style={{ background: active ? `${product.color}16` : DL.surface, border: `1px solid ${active ? product.color : DL.border}`, color: active ? product.color : DL.textMuted }}>
                        {active ? "✓ " : ""}{product.label}
                      </button>
                    );
                  })}
                </div>
                {missingProduct && <p className="mt-1.5 text-[11px] text-red-600">Bắt buộc chọn ít nhất một sản phẩm.</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Giá trị dự kiến (VND)</label>
                <input type="number" value={form.expectedValue} onChange={e => set("expectedValue", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="500000000" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Số căn / phòng{form.marketScope === "b2b" ? " *" : ""}</label>
                <input type="number" min={form.marketScope === "b2b" ? 1 : undefined} step="1" required={form.marketScope === "b2b"}
                  value={form.unitCount} onChange={e => set("unitCount", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none" style={{ ...inputStyle }} placeholder="10" />
                {missingB2BUnitCount && <p className="mt-1.5 text-[11px] text-red-600">Khách B2B phải có số căn/phòng lớn hơn 0.</p>}
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
          {missingRequirements.length > 0 && (
            <p className="text-xs text-red-600">Cần bổ sung trước khi lưu: {missingRequirements.join(", ")}.</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className={`${customerStyles.secondaryButton} flex-1 py-2.5 text-sm rounded-xl transition-all`}
              style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}>
              Hủy
            </button>
            <button type="submit" disabled={loading || !canSubmit}
              className={`${customerStyles.primaryButton} flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-50`}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
