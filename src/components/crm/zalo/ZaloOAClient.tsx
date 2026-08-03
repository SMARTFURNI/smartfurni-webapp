"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, Bot, Check, CheckCircle2, FileText, FileUp,
  History, ImageIcon, Inbox, Loader2, MessageCircle, Paperclip,
  RefreshCw, Save, Search, Send, Settings, ShieldCheck, Sparkles,
  Trash2, Users, X, Zap,
} from "lucide-react";
import ZaloCustomersTab, {
  type ZaloCampaignView,
  type ZaloCustomerSegmentView,
  type ZaloCustomerTagView,
} from "./ZaloCustomersTab";
import ZaloTemplatesTab, {
  type ZaloTemplateSyncView,
  type ZaloTemplateView as Template,
} from "./ZaloTemplatesTab";
import styles from "./ZaloOAClient.module.css";

type Category = "consultation" | "zbs_transaction" | "zbs_after_sale";
type Tab = "overview" | "inbox" | "customers" | "ai" | "templates" | "history" | "automation" | "settings";
type HistorySyncStatus = "never" | "running" | "completed" | "partial" | "failed";

interface HistorySyncSummary {
  status: HistorySyncStatus;
  startedAt: string | null;
  finishedAt: string | null;
  customersSeen: number;
  customersUpserted: number;
  conversationsSeen: number;
  messagesSeen: number;
  messagesInserted: number;
  messagesSkipped: number;
  profilesUpdated: number;
  tagsSynced: number;
  warnings: string[];
  error: string;
}

interface PublicConfig {
  oaId: string;
  appId: string;
  isActive: boolean;
  aiEnabled: boolean;
  aiAutoSend: boolean;
  requireApproval: boolean;
  aiModel: string;
  aiConfidenceThreshold: number;
  maxAutoMessagesPerDay: number;
  businessHoursStart: string;
  businessHoursEnd: string;
  zbsEnabled: boolean;
  appSecretConfigured: boolean;
  oaSecretKeyConfigured: boolean;
  accessTokenConfigured: boolean;
  refreshTokenConfigured: boolean;
  webhookUrl: string;
  webhookLastReceivedAt: string | null;
  webhookLastEvent: string;
  webhookLastStatus: string;
  webhookLastError: string;
  historySync: HistorySyncSummary;
  templateSync: ZaloTemplateSyncView;
}

interface Conversation {
  userId: string;
  displayName: string;
  phone: string;
  avatar: string;
  lastUserInteraction: string | null;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
  tags: string[];
  tagIds: string[];
  aiStatus: string;
}

interface MessageRecord {
  id: string;
  userId: string;
  displayName: string;
  direction: "inbound" | "outbound";
  category: Category;
  content: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  source: "manual" | "ai" | "webhook" | "sync";
  templateId: string;
  zaloMessageId: string;
  aiConfidence: number | null;
  error: string;
  attachment: { items?: MessageAttachment[] };
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
}

interface MessageAttachment {
  type?: string;
  url?: string;
  thumbnail?: string;
  name?: string;
  size?: number;
}

interface QueueItem {
  id: string;
  userId: string;
  customerName: string;
  incomingMessage: string;
  suggestedReply: string;
  confidence: number;
  reasoning: string;
  status: "draft" | "approved" | "sent" | "rejected" | "failed";
  scheduledAt: string | null;
  createdAt: string;
}

interface Dashboard {
  config: PublicConfig;
  stats: { total: number; sent: number; failed: number; pending: number; conversations: number; unread: number; aiDrafts: number; sentToday: number };
  templates: Template[];
  conversations: Conversation[];
  messages: MessageRecord[];
  aiQueue: QueueItem[];
  customerTags: ZaloCustomerTagView[];
  segments: ZaloCustomerSegmentView[];
  campaigns: ZaloCampaignView[];
}

const EMPTY_CONFIG: PublicConfig = {
  oaId: "", appId: "", isActive: false, aiEnabled: true, aiAutoSend: false,
  requireApproval: true, aiModel: "gpt-5.6-terra", aiConfidenceThreshold: 0.9,
  maxAutoMessagesPerDay: 30, businessHoursStart: "08:00", businessHoursEnd: "20:00",
  zbsEnabled: false, appSecretConfigured: false, accessTokenConfigured: false,
  oaSecretKeyConfigured: false, refreshTokenConfigured: false, webhookUrl: "",
  webhookLastReceivedAt: null, webhookLastEvent: "", webhookLastStatus: "", webhookLastError: "",
  historySync: {
    status: "never", startedAt: null, finishedAt: null, customersSeen: 0,
    customersUpserted: 0, conversationsSeen: 0, messagesSeen: 0,
    messagesInserted: 0, messagesSkipped: 0, profilesUpdated: 0, tagsSynced: 0, warnings: [], error: "",
  },
  templateSync: {
    status: "never", startedAt: null, finishedAt: null, total: 0,
    approved: 0, pending: 0, rejected: 0, disabled: 0, warnings: [], error: "",
  },
};

const CATEGORY_LABELS: Record<Category, string> = {
  consultation: "Tin tư vấn",
  zbs_transaction: "ZBS giao dịch",
  zbs_after_sale: "ZBS hậu mãi",
};

const TABS: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Tổng quan", icon: Activity },
  { id: "inbox", label: "Hội thoại OA", icon: Inbox },
  { id: "customers", label: "Khách hàng", icon: Users },
  { id: "ai", label: "Chờ duyệt AI", icon: Bot },
  { id: "templates", label: "Mẫu tin & ZBS", icon: FileText },
  { id: "history", label: "Lịch sử gửi", icon: History },
  { id: "automation", label: "Tự động hóa", icon: Zap },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

const panel = "rounded-2xl border border-[rgba(255,200,100,0.14)] bg-[#1a1200] shadow-[0_18px_55px_rgba(0,0,0,0.22)]";
const field = "w-full rounded-xl border border-[rgba(255,200,100,0.16)] bg-[#0d0b06] px-3.5 py-2.5 text-sm text-[#f5edd6] outline-none transition placeholder:text-[rgba(245,237,214,0.28)] focus:border-[rgba(255,200,100,0.42)] focus:ring-2 focus:ring-[#c9a84c]/10";
const goldButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9a84c] px-4 py-2.5 text-sm font-semibold text-[#171007] shadow-[0_8px_24px_rgba(201,168,76,0.14)] transition hover:bg-[#dfbf62] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,200,100,0.14)] bg-[#110d05] px-4 py-2.5 text-sm font-medium text-[rgba(245,237,214,0.72)] transition hover:border-[rgba(255,200,100,0.28)] hover:bg-[#201707] hover:text-[#f5edd6] disabled:opacity-50";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function withinSevenDays(value: string | null) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() <= 7 * 24 * 60 * 60 * 1000;
}

async function postAction(payload: Record<string, unknown>) {
  const res = await fetch("/api/crm/zalo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; name?: string; summary?: HistorySyncSummary; templateSync?: ZaloTemplateSyncView };
  if (!res.ok || data.ok === false) throw new Error(data.error || "Không thể xử lý yêu cầu.");
  return data;
}

function StatusBadge({ active, on = "Hoạt động", off = "Chưa kết nối" }: { active: boolean; on?: string; off?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-200"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-300" : "bg-amber-300"}`} />{active ? on : off}
  </span>;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#c9a84c]" : "bg-slate-700"} disabled:opacity-40`}>
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-[22px]" : "left-0.5"}`} />
  </button>;
}

export default function ZaloOAClient({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [config, setConfig] = useState<PublicConfig>(EMPTY_CONFIG);
  const [secrets, setSecrets] = useState({ appSecret: "", oaSecretKey: "", accessToken: "", refreshToken: "" });
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [threadMessages, setThreadMessages] = useState<MessageRecord[]>([]);
  const [threadConversation, setThreadConversation] = useState<Conversation | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [campaignRequest, setCampaignRequest] = useState(0);
  const visibleTabs = useMemo(() => isAdmin ? TABS : TABS.filter(item => !["templates", "automation", "settings"].includes(item.id)), [isAdmin]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch("/api/crm/zalo", { cache: "no-store" });
      const next = await res.json() as Dashboard & { error?: string };
      if (!res.ok) throw new Error(next.error || "Không tải được Zalo OA.");
      setData(next); setConfig(next.config);
      setSelectedUser(current => current || next.conversations[0]?.userId || "");
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không tải được dữ liệu." });
    } finally { if (showSpinner) setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const loadThread = useCallback(async (userId: string, markRead = true) => {
    if (!userId) { setThreadMessages([]); setThreadConversation(null); return; }
    const res = await fetch(`/api/crm/zalo?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
    const next = await res.json() as { messages?: MessageRecord[]; conversation?: Conversation | null; error?: string };
    if (!res.ok) throw new Error(next.error || "Không tải được hội thoại Zalo OA.");
    setThreadMessages(next.messages || []);
    setThreadConversation(next.conversation || null);
    if (next.conversation) {
      setData(current => current ? {
        ...current,
        conversations: current.conversations.map(item => item.userId === userId ? next.conversation! : item),
      } : current);
    }
    if (markRead) await postAction({ action: "mark_conversation_read", userId });
  }, []);

  useEffect(() => {
    if (tab !== "inbox" || !selectedUser) return;
    void loadThread(selectedUser).catch(error => setNotice({ type: "error", text: error instanceof Error ? error.message : "Không tải được hội thoại." }));
  }, [loadThread, selectedUser, tab]);

  useEffect(() => {
    if (tab !== "inbox") return;
    const timer = window.setInterval(() => {
      void load(false);
      if (selectedUser) void loadThread(selectedUser, false);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [load, loadThread, selectedUser, tab]);

  const run = useCallback(async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key); setNotice(null);
    try { await fn(); setNotice({ type: "ok", text: success }); await load(false); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Có lỗi xảy ra." }); }
    finally { setBusy(""); }
  }, [load]);

  const selectedConversation = threadConversation?.userId === selectedUser
    ? threadConversation
    : data?.conversations.find(item => item.userId === selectedUser) || null;
  const selectedMessages = threadMessages;
  const drafts = (data?.aiQueue || []).filter(item => item.status === "draft");

  async function saveConfig() {
    await run("save-config", () => postAction({ action: "save_config", config: { ...config, ...secrets } }), "Đã lưu cấu hình Zalo OA và AI Agent.");
    setSecrets({ appSecret: "", oaSecretKey: "", accessToken: "", refreshToken: "" });
  }

  async function syncHistory() {
    setBusy("sync-history");
    setNotice(null);
    try {
      const result = await postAction({ action: "sync_history" });
      const summary = result.summary;
      if (!summary) throw new Error("CRM không trả về báo cáo đồng bộ.");
      await load(false);
      const label = summary.status === "completed"
        ? "Đồng bộ hoàn tất"
        : summary.status === "partial"
          ? "Đồng bộ một phần"
          : "Đồng bộ thất bại";
      setNotice({
        type: summary.status === "failed" ? "error" : "ok",
        text: `${label}: ${summary.customersUpserted} khách, ${summary.tagsSynced} lượt tag OA, ${summary.messagesInserted} tin mới.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không đồng bộ được lịch sử Zalo OA." });
    } finally {
      setBusy("");
    }
  }

  async function syncTemplates() {
    setBusy("sync-templates");
    setNotice(null);
    try {
      const result = await postAction({ action: "sync_templates" });
      const summary = result.templateSync;
      if (!summary) throw new Error("CRM không trả về báo cáo đồng bộ Template.");
      await load(false);
      setNotice({
        type: summary.status === "failed" ? "error" : "ok",
        text: `Đã đồng bộ ${summary.total} template: ${summary.approved} đã duyệt, ${summary.pending} đang duyệt, ${summary.rejected} bị từ chối.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không đồng bộ được Template Zalo OA." });
    } finally {
      setBusy("");
    }
  }

  async function sendReply(content: string) {
    if (!selectedUser) return;
    setBusy(`reply-${selectedUser}`); setNotice(null);
    try {
      await postAction({ action: "send_consultation", userId: selectedUser, content });
      await Promise.all([load(false), loadThread(selectedUser, false)]);
      setNotice({ type: "ok", text: "Zalo OA đã tiếp nhận tin trả lời." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không gửi được tin trả lời." });
      await loadThread(selectedUser, false).catch(() => undefined);
      throw error;
    } finally { setBusy(""); }
  }

  async function sendAttachment(file: File, kind: "image" | "file") {
    if (!selectedUser) return;
    setBusy(`attachment-${selectedUser}`); setNotice(null);
    try {
      const form = new FormData();
      form.append("userId", selectedUser);
      form.append("kind", kind);
      form.append("file", file);
      const res = await fetch("/api/crm/zalo/attachment", { method: "POST", body: form });
      const next = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!res.ok || next.ok === false) throw new Error(next.error || "Không gửi được tệp đính kèm.");
      await Promise.all([load(false), loadThread(selectedUser, false)]);
      setNotice({ type: "ok", text: kind === "image" ? "Đã gửi ảnh qua Zalo OA." : "Đã gửi tệp qua Zalo OA." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không gửi được tệp đính kèm." });
      await loadThread(selectedUser, false).catch(() => undefined);
      throw error;
    } finally { setBusy(""); }
  }

  if (loading && !data) return <div className={`${styles.lightTheme} flex min-h-[70vh] items-center justify-center bg-[#f4f7fb] text-[#526173]`}><Loader2 className="mr-2 animate-spin text-[#9a7418]" /> Đang tải trung tâm Zalo OA...</div>;

  return <div className={`${styles.lightTheme} min-h-full space-y-4 bg-[#f4f7fb] p-4 text-[#172033] md:p-7`}>
    <section className={`${panel} overflow-hidden`}>
      <div className="flex flex-col gap-5 border-b border-[rgba(255,200,100,0.10)] bg-[radial-gradient(circle_at_88%_0%,rgba(201,168,76,0.10),transparent_34%)] p-5 lg:flex-row lg:items-center lg:justify-between lg:px-7 lg:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,200,100,0.22)] bg-[#c9a84c]/10 shadow-[inset_0_0_24px_rgba(201,168,76,0.05)]"><MessageCircle className="text-[#d6b75b]" /></div>
          <div><div className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#c9a84c]">Zalo Official Account</div><h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-3xl">{tab === "customers" ? "Khách hàng Zalo OA" : tab === "templates" ? "Mẫu tin Zalo OA" : "Trung tâm chăm sóc khách hàng Zalo OA"}</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-[rgba(245,237,214,0.50)]">{tab === "customers" ? "Đồng bộ, phân nhóm và chăm sóc khách hàng theo tag từ Zalo OA." : tab === "templates" ? "Theo dõi vòng đời kiểm duyệt, nội dung xem trước và chi phí gửi của từng ZBS Template." : "Hội thoại, mẫu ZBS và bản nháp AI được quản lý trên cùng dữ liệu CRM, có kiểm soát trước khi gửi."}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge active={Boolean(config.isActive && config.accessTokenConfigured)} /><button className={secondaryButton} disabled={Boolean(busy)} onClick={() => tab === "customers" ? void syncHistory() : void load()}>{busy === "sync-history" ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {tab === "customers" ? "Đồng bộ ngay" : "Làm mới"}</button><button className={goldButton} onClick={() => { if (tab === "customers") setCampaignRequest(value => value + 1); else setSendOpen(true); }}><Send size={15} /> {tab === "customers" ? "Tạo chiến dịch" : "Soạn tin"}</button></div>
      </div>
      <nav className="flex gap-1 overflow-x-auto bg-[#110d05]/65 p-2.5">
        {visibleTabs.map(item => { const Icon = item.icon; const count = item.id === "ai" ? drafts.length : item.id === "inbox" ? data?.stats.unread : 0; return <button key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition ${tab === item.id ? "border-[rgba(255,200,100,0.22)] bg-[#c9a84c]/12 text-[#f0d77e] shadow-[inset_0_0_16px_rgba(201,168,76,0.04)]" : "border-transparent text-[rgba(245,237,214,0.46)] hover:border-[rgba(255,200,100,0.08)] hover:bg-white/[0.025] hover:text-[rgba(245,237,214,0.78)]"}`}><Icon size={15} />{item.label}{Boolean(count) && <span className="rounded-full bg-[#c9a84c] px-1.5 py-0.5 text-[10px] font-bold text-black">{count}</span>}</button>; })}
      </nav>
    </section>

    {notice && <div className={`flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${notice.type === "ok" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-red-400/25 bg-red-400/10 text-red-200"}`}><span className="flex gap-2">{notice.type === "ok" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}{notice.text}</span><button onClick={() => setNotice(null)}><X size={16} /></button></div>}

    {tab === "overview" && <Overview data={data!} config={config} go={setTab} isAdmin={isAdmin} />}
    {tab === "inbox" && <InboxTab conversations={data?.conversations || []} selectedUser={selectedUser} setSelectedUser={setSelectedUser} selected={selectedConversation} messages={selectedMessages} busy={busy} sendReply={sendReply} sendAttachment={sendAttachment} generate={() => selectedUser && void run(`ai-${selectedUser}`, () => postAction({ action: "generate_ai", userId: selectedUser }), "AI đã tạo bản nháp và đưa vào hàng chờ duyệt.")} />}
    {tab === "customers" && <ZaloCustomersTab customers={data?.conversations || []} tags={data?.customerTags || []} segments={data?.segments || []} campaigns={data?.campaigns || []} busy={busy} isAdmin={isAdmin} campaignRequest={campaignRequest} sync={() => void syncHistory()} runAction={(key, payload, success) => run(key, () => postAction(payload), success)} />}
    {tab === "ai" && <AiQueue items={data?.aiQueue || []} busy={busy} review={(id, decision) => void run(`${decision}-${id}`, () => postAction({ action: "review_ai", id, decision }), decision === "approve" ? "Đã duyệt và gửi tin tư vấn qua OA." : "Đã từ chối bản nháp AI.")} />}
    {tab === "templates" && <ZaloTemplatesTab templates={data?.templates || []} syncSummary={config.templateSync} configured={Boolean(config.isActive && config.accessTokenConfigured)} busy={busy === "sync-templates"} sync={() => void syncTemplates()} open={(item) => { setEditingTemplate(item || { category: "consultation", isActive: true, requiresApproval: true, variables: [], approvalStatus: "LOCAL", quality: "UNDEFINED", templateTag: "", reason: "", previewUrl: "", priceSdt: "", priceUid: "", buttons: [], source: "crm", zaloCreatedAt: null, syncedAt: null }); setTemplateOpen(true); }} />}
    {tab === "history" && <HistoryTab messages={data?.messages || []} />}
    {tab === "automation" && <AutomationTab config={config} setConfig={setConfig} save={() => void saveConfig()} busy={busy === "save-config"} />}
    {tab === "settings" && <div className="space-y-4">
      <SettingsTab config={config} setConfig={setConfig} secrets={secrets} setSecrets={setSecrets} save={() => void saveConfig()} test={() => void run("test", () => postAction({ action: "test_connection" }), "Kết nối Zalo OA hợp lệ.")} busy={busy} />
      <HistorySyncCard summary={config.historySync} configured={Boolean(config.isActive && config.accessTokenConfigured)} busy={busy === "sync-history"} sync={() => void syncHistory()} />
      <div className={`${panel} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div><div className="text-sm font-medium">Vòng đời Access Token</div><p className="mt-1 text-xs text-[#8f99aa]">Làm mới token bằng Refresh Token đã mã hóa trong cấu hình máy chủ; token mới không được trả về trình duyệt.</p></div>
        <button className={secondaryButton} disabled={Boolean(busy)} onClick={() => void run("refresh-token", () => postAction({ action: "refresh_token" }), "Đã làm mới Access Token Zalo OA.")}><RefreshCw size={15} /> Làm mới token</button>
      </div>
    </div>}

    {sendOpen && <SendModal config={config} templates={data?.templates || []} conversations={data?.conversations || []} initialUserId={selectedUser} busy={busy === "send"} close={() => setSendOpen(false)} submit={(payload) => void run("send", () => postAction(payload), "Tin nhắn đã được Zalo OA tiếp nhận.").then(() => setSendOpen(false))} />}
    {templateOpen && editingTemplate && <TemplateModal value={editingTemplate} setValue={setEditingTemplate} busy={busy} close={() => setTemplateOpen(false)} save={() => void run("template", () => postAction({ action: "save_template", template: editingTemplate }), "Đã lưu mẫu tin.").then(() => setTemplateOpen(false))} remove={editingTemplate.id ? () => void run("delete-template", () => postAction({ action: "delete_template", id: editingTemplate.id }), "Đã xóa mẫu tin.").then(() => setTemplateOpen(false)) : undefined} />}
  </div>;
}

function Overview({ data, config, go, isAdmin }: { data: Dashboard; config: PublicConfig; go: (tab: Tab) => void; isAdmin: boolean }) {
  const stats = [
    [MessageCircle, "Hội thoại OA", data.stats.conversations, `${data.stats.unread} chưa đọc`, "#2878c8", "blue"],
    [Bot, "Bản nháp AI", data.stats.aiDrafts, "Chờ admin duyệt", "#7c3fd1", "violet"],
    [Send, "Đã gửi hôm nay", data.stats.sentToday, `${data.stats.sent} gửi thành công`, "#0f9f70", "emerald"],
    [AlertTriangle, "Gửi thất bại", data.stats.failed, `${data.stats.pending} đang chờ`, "#d97706", "amber"],
  ] as const;
  const readiness = [
    [config.accessTokenConfigured, "Kết nối OA", "Access Token"],
    [Boolean(config.appId && config.oaSecretKeyConfigured && config.webhookLastStatus === "processed"), "Webhook", config.webhookLastStatus === "processed" ? "Đã nhận sự kiện hợp lệ" : "Chưa xác nhận sự kiện thật"],
    [config.zbsEnabled, "ZBS", "Quyền gửi mẫu tin"],
    [config.aiEnabled, "AI Agent", config.aiModel],
  ] as const;
  const readyCount = readiness.filter(([ok]) => ok).length;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([Icon, label, value, hint, color, tone]) => <div key={label} data-zalo-tone={tone} className={`${panel} group p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(30,48,72,0.13)]`}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(245,237,214,0.42)]">{label}</div><strong className="mt-2 block text-2xl font-bold" style={{ color }}>{value}</strong></div><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(255,200,100,0.12)] bg-black/20" style={{ color }}><Icon size={17} /></div></div><div className="mt-3 border-t border-[rgba(255,200,100,0.08)] pt-2 text-[11px] text-[rgba(245,237,214,0.38)]">{hint}</div></div>)}</div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
      <section className={`${panel} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[rgba(255,200,100,0.10)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9a84c]">Quy trình vận hành</div><h2 className="mt-1 text-lg font-semibold">Từ hội thoại đến chăm sóc</h2><p className="mt-0.5 text-xs text-[rgba(245,237,214,0.42)]">Mỗi bước đều có dữ liệu kiểm tra và dấu vết trong CRM.</p></div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-200"><ShieldCheck size={14} /> Có kiểm soát</div>
        </div>
        <div className="grid md:grid-cols-3">{([
          [Inbox, "01", "Nhận hội thoại", "Webhook ghi nhận đúng khách, nội dung và thời điểm tương tác."],
          [Sparkles, "02", "AI tạo bản nháp", "Phân tích ngữ cảnh, giữ cách xưng hô và không tự thay chính sách."],
          [CheckCircle2, "03", "Kiểm tra & gửi", "Admin duyệt hoặc hệ thống chỉ gửi khi vượt đủ cổng an toàn."],
        ] as const).map(([Icon, no, title, desc], index) => { const StepIcon = Icon; return <div key={no} className={`relative p-5 ${index < 2 ? "border-b border-[rgba(255,200,100,0.08)] md:border-b-0 md:border-r" : ""}`}><div className="flex items-center justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c9a84c]/10 text-[#d6b75b]"><StepIcon size={17} /></div><span className="text-[10px] font-bold tracking-[0.2em] text-[rgba(245,237,214,0.26)]">{no}</span></div><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-1.5 text-xs leading-5 text-[rgba(245,237,214,0.42)]">{desc}</p></div>; })}</div>
        <div className="flex flex-col gap-3 border-t border-[rgba(255,200,100,0.10)] bg-black/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[rgba(245,237,214,0.42)]">Tin tư vấn dùng UID trong cửa sổ 7 ngày; tin giao dịch và hậu mãi dùng mẫu ZBS đã duyệt.</p><button onClick={() => go("automation")} className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-[#d6b75b] hover:text-[#f0d77e]"><Zap size={14} /> Xem cổng an toàn</button></div>
      </section>

      <section className={`${panel} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[rgba(255,200,100,0.10)] px-5 py-4"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9a84c]">Tích hợp hệ thống</div><h2 className="mt-1 text-lg font-semibold">Sẵn sàng {readyCount}/{readiness.length}</h2></div><div className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold ${readyCount === readiness.length ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-200"}`}>{Math.round(readyCount / readiness.length * 100)}%</div></div>
        <div className="divide-y divide-[rgba(255,200,100,0.08)]">{readiness.map(([ok, label, detail]) => <div key={label} className="flex items-center gap-3 px-5 py-3"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ok ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{ok ? <Check size={14} /> : <AlertTriangle size={14} />}</span><div className="min-w-0 flex-1"><div className="text-xs font-medium">{label}</div><div className="mt-0.5 truncate text-[10px] text-[rgba(245,237,214,0.36)]">{detail}</div></div><span className={`text-[10px] font-medium ${ok ? "text-emerald-300" : "text-amber-200"}`}>{ok ? "Sẵn sàng" : "Cần kiểm tra"}</span></div>)}</div>
        {isAdmin ? <div className="border-t border-[rgba(255,200,100,0.10)] p-3"><button onClick={() => go("settings")} className={`${secondaryButton} w-full`}><Settings size={15} /> Quản lý kết nối</button></div> : <p className="border-t border-[rgba(255,200,100,0.10)] p-4 text-xs text-[rgba(245,237,214,0.42)]">Cấu hình kết nối do admin quản lý.</p>}
      </section>
    </div>

    <section className="rounded-2xl border border-[rgba(255,200,100,0.14)] bg-[linear-gradient(90deg,rgba(16,60,43,0.34),rgba(26,18,0,0.96))] px-5 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck size={18} /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-emerald-100">Chế độ an toàn đang bật</h3><p className="mt-1 text-xs leading-5 text-emerald-100/55">AI mặc định chỉ tạo bản nháp. Hệ thống không tự nhắn khách nếu chưa đủ quyền, thời gian tương tác, loại tin và ngưỡng tin cậy.</p></div><StatusBadge active={!config.aiAutoSend} on="Đang chờ duyệt" off="Tự gửi có điều kiện" /></div></section>
  </div>;
}

function messageStatusLabel(item: MessageRecord) {
  if (item.status === "read") return "Đã xem";
  if (item.status === "delivered") return "Đã nhận";
  if (item.status === "sent") return "Đã gửi";
  if (item.status === "pending") return "Đang gửi";
  return "Gửi lỗi";
}

function ConversationAvatar({ conversation, className = "h-10 w-10" }: { conversation: Conversation; className?: string }) {
  const initial = (conversation.displayName || "K").trim().charAt(0).toUpperCase();
  return conversation.avatar ? <span className={`${className} shrink-0 overflow-hidden rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/10`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={conversation.avatar} alt={conversation.displayName || "Khách Zalo"} className="h-full w-full object-cover" loading="lazy" />
  </span> : <span className={`${className} flex shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/10 text-sm font-bold text-[#e3c86f]`}>{initial}</span>;
}

function shouldRenderMessageContent(item: MessageRecord) {
  const content = item.content.trim();
  if (!content) return false;
  const hasAttachment = Array.isArray(item.attachment?.items) && item.attachment.items.length > 0;
  if (!hasAttachment) return true;
  return !["[hình ảnh]", "[ảnh]", "[tệp đính kèm]", "[file]", "[video]", "[âm thanh]"].includes(content.toLowerCase());
}

function MessageAttachments({ attachment, hasBody = false }: { attachment: MessageRecord["attachment"]; hasBody?: boolean }) {
  const items = Array.isArray(attachment?.items) ? attachment.items : [];
  if (!items.length) return null;

  return <div className={`${hasBody ? "mb-2" : ""} flex w-fit max-w-full flex-wrap gap-2`}>
    {items.map((item, index) => {
      const type = String(item.type || "file").toLowerCase();
      const url = item.url || item.thumbnail || "";
      const label = item.name || (type === "image" ? "Ảnh khách gửi" : type === "audio" ? "Tin nhắn thoại" : type === "video" ? "Video" : "Tệp đính kèm");
      if ((type === "image" || type === "gif" || type === "sticker") && url) {
        const compact = items.length > 1;
        return <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className={`${compact ? "h-28 w-28 sm:h-32 sm:w-32" : "max-w-[280px] sm:max-w-[300px]"} inline-flex w-fit overflow-hidden rounded-xl border border-white/10 bg-black/20 transition hover:border-[#c9a84c]/35`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.thumbnail || url} alt={label} className={compact ? "h-full w-full object-cover" : "h-auto max-h-60 w-auto max-w-full object-contain"} loading="lazy" />
        </a>;
      }
      if (type === "audio" && url) return <audio key={`${url}-${index}`} className="w-full max-w-[300px]" controls preload="none" src={url} />;
      if (type === "video" && url) return <video key={`${url}-${index}`} className="max-h-60 w-full max-w-[320px] rounded-xl border border-white/10 bg-black/20" controls preload="metadata" src={url} />;
      return <a key={`${url}-${index}`} href={url || undefined} target={url ? "_blank" : undefined} rel={url ? "noreferrer" : undefined} className="flex w-full max-w-[320px] items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-[#d8d0c1] hover:border-[#c9a84c]/30">
        <Paperclip size={14} className="shrink-0 text-[#d6b75b]" /><span className="min-w-0 flex-1 truncate">{label}</span>{item.size ? <span className="text-[10px] text-[#7f899a]">{Math.max(1, Math.round(item.size / 1024))} KB</span> : null}
      </a>;
    })}
  </div>;
}

function InboxTab({ conversations, selectedUser, setSelectedUser, selected, messages, busy, generate, sendReply, sendAttachment }: {
  conversations: Conversation[];
  selectedUser: string;
  setSelectedUser: (v: string) => void;
  selected: Conversation | null;
  messages: MessageRecord[];
  busy: string;
  generate: () => void;
  sendReply: (content: string) => Promise<void>;
  sendAttachment: (file: File, kind: "image" | "file") => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filtered = conversations.filter(item => `${item.displayName} ${item.userId} ${item.lastMessagePreview}`.toLowerCase().includes(search.trim().toLowerCase()));
  const canReply = Boolean(selected && withinSevenDays(selected.lastUserInteraction));
  const sending = Boolean(selected && busy === `reply-${selected.userId}`);
  const attaching = Boolean(selected && busy === `attachment-${selected.userId}`);

  async function submitReply() {
    const content = draft.trim();
    if (!content || !canReply || sending) return;
    try {
      await sendReply(content);
      setDraft("");
    } catch {
      // Giữ nguyên nội dung để nhân viên có thể thử lại sau khi xử lý lỗi API.
    }
  }

  async function uploadAttachment(event: ChangeEvent<HTMLInputElement>, kind: "image" | "file") {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !canReply || sending || attaching) return;
    try {
      await sendAttachment(file, kind);
    } catch {
      // Thông báo lỗi được xử lý ở component cha; giữ nguyên hội thoại để nhân viên kiểm tra.
    } finally {
      input.value = "";
    }
  }

  return <section className={`${panel} min-h-[640px] overflow-hidden`}>
    <div className="grid min-h-[640px] lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-[rgba(255,200,100,0.10)] bg-black/10 lg:border-b-0 lg:border-r">
        <div className="border-b border-[rgba(255,200,100,0.10)] p-4">
          <div className="flex items-center justify-between gap-3"><div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8f99aa]">{conversations.length} hội thoại OA</div>{conversations.some(item => item.unreadCount > 0) && <span className="text-[10px] font-semibold text-[#d6b75b]">{conversations.reduce((sum, item) => sum + item.unreadCount, 0)} chưa đọc</span>}</div>
          <label className="mt-3 flex items-center gap-2 rounded-xl border border-[rgba(255,200,100,0.12)] bg-[#0c1320] px-3 text-[#7f899a] focus-within:border-[#c9a84c]/40"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#f5edd6] outline-none placeholder:text-[#687487]" placeholder="Tìm tên hoặc Zalo UID" /></label>
        </div>
        <div className="max-h-[280px] overflow-y-auto lg:max-h-[560px]">{filtered.length ? filtered.map(item => <button key={item.userId} onClick={() => setSelectedUser(item.userId)} className={`w-full border-b border-[rgba(255,200,100,0.07)] p-4 text-left transition ${selectedUser === item.userId ? "bg-[#c9a84c]/10 shadow-[inset_3px_0_0_#c9a84c]" : "hover:bg-white/[0.03]"}`}>
          <div className="flex items-start gap-3"><ConversationAvatar conversation={item} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{item.displayName || "Khách Zalo"}</strong>{item.unreadCount > 0 && <span className="rounded-full bg-[#c9a84c] px-2 py-0.5 text-[10px] font-bold text-black">{item.unreadCount}</span>}</div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8f99aa]">{item.lastMessagePreview || "Hội thoại mới"}</p><div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-[#687487]"><span>{formatDate(item.lastMessageAt)}</span><span className={withinSevenDays(item.lastUserInteraction) ? "text-emerald-300" : "text-amber-300"}>{withinSevenDays(item.lastUserInteraction) ? "Có thể trả lời" : "Hết 7 ngày"}</span></div></div></div>
        </button>) : <Empty text={search ? "Không tìm thấy hội thoại phù hợp." : "Webhook chưa nhận hội thoại nào."} />}</div>
      </aside>

      <main className="flex min-h-[640px] min-w-0 flex-col bg-[radial-gradient(circle_at_top_right,rgba(104,70,0,0.10),transparent_34%)]">{selected ? <>
        <div className="flex flex-col gap-3 border-b border-[rgba(255,200,100,0.10)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><ConversationAvatar conversation={selected} /><div className="min-w-0"><h2 className="truncate text-base font-semibold">{selected.displayName || "Khách Zalo"}</h2><p className="mt-0.5 truncate text-[11px] text-[#8f99aa]">UID {selected.userId} · tương tác {formatDate(selected.lastUserInteraction)}</p></div></div><button disabled={busy === `ai-${selected.userId}`} onClick={generate} className={goldButton}>{busy === `ai-${selected.userId}` ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} AI gợi ý</button></div>

        <div className="flex max-h-[520px] min-h-[360px] flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">{messages.length ? messages.map(item => {
          const hasAttachment = Array.isArray(item.attachment?.items) && item.attachment.items.length > 0;
          const renderContent = shouldRenderMessageContent(item);
          const attachmentOnly = hasAttachment && !renderContent;
          return <div key={item.id} className={`w-fit max-w-[88%] self-start rounded-2xl border sm:max-w-[70%] ${attachmentOnly ? "p-2" : "px-3.5 py-2.5"} ${item.direction === "outbound" ? "ml-auto self-end rounded-br-md border-[#c9a84c]/22 bg-[#c9a84c]/12" : "mr-auto rounded-bl-md border-white/10 bg-[#0c1320]"}`}>
            <MessageAttachments attachment={item.attachment} hasBody={renderContent} />
            {renderContent && <p className="max-w-full whitespace-pre-wrap break-words text-sm leading-6">{item.content}</p>}
            <div className="mt-1.5 flex items-center justify-end gap-2 whitespace-nowrap text-[10px] text-[#7f899a]"><span>{formatDate(item.createdAt)}</span>{item.direction === "outbound" && <span className={item.status === "failed" ? "text-red-300" : item.status === "read" ? "text-emerald-300" : "text-[#a99a72]"}>{messageStatusLabel(item)}</span>}</div>
            {item.error && <p className="mt-2 max-w-[320px] text-xs text-red-300">{item.error}</p>}
          </div>;
        }) : <Empty text="Chưa có nội dung trong hội thoại." />}</div>

        <div className="mt-auto border-t border-[rgba(255,200,100,0.10)] bg-black/15 p-3.5 sm:p-4">
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={event => void uploadAttachment(event, "image")} />
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" className="hidden" onChange={event => void uploadAttachment(event, "file")} />
          <div className={`rounded-2xl border bg-[#0c1320] p-2 transition ${canReply ? "border-[rgba(255,200,100,0.18)] focus-within:border-[#c9a84c]/50" : "border-amber-400/16 opacity-75"}`}><textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitReply(); } }} disabled={!canReply || sending || attaching} rows={2} className="block w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-[#f5edd6] outline-none placeholder:text-[#687487]" placeholder={canReply ? "Nhập tin nhắn… Enter để gửi, Shift + Enter để xuống dòng" : "Cửa sổ tư vấn 7 ngày đã hết"} /><div className="flex flex-col gap-2 px-1 pb-0.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-1.5"><button type="button" onClick={() => imageInputRef.current?.click()} disabled={!canReply || sending || attaching} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs text-[#b8c1cf] transition hover:border-[#c9a84c]/30 hover:text-[#f0d77e] disabled:opacity-40"><ImageIcon size={14} /> Ảnh</button><button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canReply || sending || attaching} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs text-[#b8c1cf] transition hover:border-[#c9a84c]/30 hover:text-[#f0d77e] disabled:opacity-40"><FileUp size={14} /> Tệp</button>{attaching && <span className="inline-flex items-center gap-1.5 text-[11px] text-[#d6b75b]"><Loader2 size={13} className="animate-spin" /> Đang tải lên và gửi…</span>}</div><button onClick={() => void submitReply()} disabled={!draft.trim() || !canReply || sending || attaching} className={`${goldButton} h-9 shrink-0 px-3`}>{sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Gửi</button></div></div>
          <p className="mt-2 text-[10px] leading-4 text-[#687487]">Gửi trực tiếp từ CRM: ảnh tối đa 1 MB; PDF, Word, Excel, ZIP hoặc TXT tối đa 10 MB. Mọi tin gửi từ OA Manager vẫn được đồng bộ qua webhook.</p>
        </div>
      </> : <Empty text="Chọn một hội thoại Zalo OA để xem và trả lời." />}</main>
    </div>
  </section>;
}

function AiQueue({ items, busy, review }: { items: QueueItem[]; busy: string; review: (id: string, decision: "approve" | "reject") => void }) {
  const drafts = items.filter(item => item.status === "draft");
  return <div className="space-y-4"><div className={`${panel} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}><div><h2 className="text-lg font-semibold">Hàng chờ duyệt AI</h2><p className="text-sm text-[#8f99aa]">Admin đọc ngữ cảnh và nội dung trước khi cho phép gửi.</p></div><StatusBadge active={drafts.length === 0} on="Không còn bản nháp" off={`${drafts.length} bản nháp cần duyệt`} /></div>{drafts.length ? drafts.map(item => <article key={item.id} className={`${panel} p-5 md:p-6`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.customerName}</h3><span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-200">Tin cậy {Math.round(item.confidence * 100)}%</span><span className="text-xs text-[#778396]">{formatDate(item.createdAt)}</span></div><div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-white/8 bg-black/10 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f99aa]">Tin khách vừa gửi</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#b6bfcc]">{item.incomingMessage}</p></div><div className="rounded-xl border border-[#c9a84c]/18 bg-[#c9a84c]/[0.06] p-4"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c9a84c]">AI đề xuất</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.suggestedReply}</p></div></div>{item.reasoning && <p className="mt-3 text-xs leading-5 text-[#7f899a]">Lý do: {item.reasoning}</p>}</div><div className="flex shrink-0 gap-2"><button disabled={Boolean(busy)} onClick={() => review(item.id, "reject")} className={secondaryButton}><X size={15} /> Từ chối</button><button disabled={Boolean(busy)} onClick={() => review(item.id, "approve")} className={goldButton}>{busy === `approve-${item.id}` ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Duyệt & gửi</button></div></div></article>) : <div className={`${panel} p-12`}><Empty text="Không có bản nháp AI nào đang chờ duyệt." /></div>}</div>;
}

function HistoryTab({ messages }: { messages: MessageRecord[] }) {
  return <section className={`${panel} overflow-hidden`}><div className="border-b border-white/8 p-5"><h2 className="text-lg font-semibold">Lịch sử Zalo OA</h2><p className="text-sm text-[#8f99aa]">Bao gồm tin khách gửi, tin nhân viên gửi và tin do AI gửi.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-black/15 text-[10px] uppercase tracking-[0.16em] text-[#7e899b]"><tr><th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Khách hàng</th><th className="px-5 py-3">Loại</th><th className="px-5 py-3">Nội dung</th><th className="px-5 py-3">Nguồn</th><th className="px-5 py-3">Trạng thái</th></tr></thead><tbody>{messages.map(item => <tr key={item.id} className="border-t border-white/6"><td className="whitespace-nowrap px-5 py-4 text-xs text-[#8f99aa]">{formatDate(item.createdAt)}</td><td className="px-5 py-4 font-medium">{item.displayName}</td><td className="whitespace-nowrap px-5 py-4 text-xs">{CATEGORY_LABELS[item.category]}</td><td className="max-w-lg px-5 py-4"><p className="line-clamp-2 text-[#b5bdca]">{item.content}</p>{item.error && <p className="mt-1 text-xs text-red-300">{item.error}</p>}</td><td className="px-5 py-4 text-xs uppercase text-[#8f99aa]">{item.source}</td><td className={`px-5 py-4 text-xs font-medium ${item.status === "failed" ? "text-red-300" : item.status === "pending" ? "text-amber-200" : "text-emerald-300"}`}>{item.status}</td></tr>)}{!messages.length && <tr><td colSpan={6}><Empty text="Chưa có lịch sử tin nhắn." /></td></tr>}</tbody></table></div></section>;
}

function AutomationTab({ config, setConfig, save, busy }: { config: PublicConfig; setConfig: (v: PublicConfig) => void; save: () => void; busy: boolean }) {
  const gates = [
    ["Đúng đối tượng", "Chỉ trả lời hội thoại có Zalo UID thật."], ["Trong 7 ngày", "Tin tư vấn bị chặn khi quá cửa sổ tương tác."], ["Đúng giờ", `${config.businessHoursStart}–${config.businessHoursEnd} · Asia/Ho_Chi_Minh`], ["Đủ tin cậy", `Tối thiểu ${Math.round(config.aiConfidenceThreshold * 100)}%`], ["Giới hạn ngày", `Tối đa ${config.maxAutoMessagesPerDay} tin AI/ngày`], ["Đúng loại tin", "Giao dịch/hậu mãi bắt buộc dùng ZBS."],
  ];
  return <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]"><section className={`${panel} p-5 md:p-6`}><h2 className="text-lg font-semibold">Chế độ AI Agent</h2><p className="mt-1 text-sm text-[#8f99aa]">Mặc định an toàn là tạo nháp và chờ duyệt.</p><div className="mt-5 space-y-4"><SettingToggle label="AI phân tích tin nhắn mới" hint="Tạo câu trả lời dựa trên lịch sử hội thoại." value={config.aiEnabled} set={value => setConfig({ ...config, aiEnabled: value })} /><SettingToggle label="Yêu cầu admin duyệt" hint="Khuyến nghị bật khi mới vận hành." value={config.requireApproval} set={value => setConfig({ ...config, requireApproval: value })} /><SettingToggle label="Cho phép AI tự gửi" hint="Chỉ có hiệu lực khi tắt yêu cầu duyệt và vượt toàn bộ cổng an toàn." value={config.aiAutoSend} set={value => setConfig({ ...config, aiAutoSend: value })} /></div><div className="mt-5 grid grid-cols-2 gap-3"><Label text="Giờ bắt đầu"><input type="time" className={field} value={config.businessHoursStart} onChange={e => setConfig({ ...config, businessHoursStart: e.target.value })} /></Label><Label text="Giờ kết thúc"><input type="time" className={field} value={config.businessHoursEnd} onChange={e => setConfig({ ...config, businessHoursEnd: e.target.value })} /></Label><Label text="Ngưỡng tin cậy (%)"><input type="number" min={50} max={100} className={field} value={Math.round(config.aiConfidenceThreshold * 100)} onChange={e => setConfig({ ...config, aiConfidenceThreshold: Number(e.target.value) / 100 })} /></Label><Label text="Giới hạn AI/ngày"><input type="number" min={1} max={500} className={field} value={config.maxAutoMessagesPerDay} onChange={e => setConfig({ ...config, maxAutoMessagesPerDay: Number(e.target.value) })} /></Label></div><button onClick={save} disabled={busy} className={`${goldButton} mt-5 w-full`}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu tự động hóa</button></section><section className={`${panel} p-5 md:p-6`}><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10"><ShieldCheck className="text-emerald-300" /></div><div><h2 className="text-lg font-semibold">6 cổng trước khi tự gửi</h2><p className="text-sm text-[#8f99aa]">Sai một điều kiện là chuyển về hàng chờ admin.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{gates.map(([title, hint]) => <div key={title} className="rounded-xl border border-white/8 bg-black/10 p-4"><div className="flex items-center gap-2 font-medium"><CheckCircle2 size={15} className="text-emerald-300" />{title}</div><p className="mt-1.5 text-xs leading-5 text-[#8f99aa]">{hint}</p></div>)}</div><div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs leading-5 text-amber-100/75">Bật tự gửi không mở rộng quyền API của OA. Zalo vẫn có thể từ chối nếu ứng dụng chưa được cấp quyền, mẫu ZBS chưa duyệt hoặc người dùng chưa đồng ý nhận tin.</div></section></div>;
}

type ZaloSecrets = { appSecret: string; oaSecretKey: string; accessToken: string; refreshToken: string };

function SettingsTab({ config, setConfig, secrets, setSecrets, save, test, busy }: {
  config: PublicConfig;
  setConfig: (v: PublicConfig) => void;
  secrets: ZaloSecrets;
  setSecrets: (v: ZaloSecrets) => void;
  save: () => void;
  test: () => void;
  busy: string;
}) {
  const webhookOk = config.webhookLastStatus === "processed";
  const webhookFailed = Boolean(config.webhookLastReceivedAt) && !webhookOk;

  return <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
    <section className={`${panel} p-5 md:p-6`}>
      <h2 className="text-lg font-semibold">Kết nối Zalo OA OpenAPI</h2>
      <p className="mt-1 text-sm text-[#8f99aa]">App Secret và OA Secret Key là hai khóa khác nhau. Giá trị để trống sẽ giữ nguyên khóa đã lưu.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Label text="OA ID"><input className={field} value={config.oaId} onChange={e => setConfig({ ...config, oaId: e.target.value })} /></Label>
        <Label text="App ID"><input className={field} value={config.appId} onChange={e => setConfig({ ...config, appId: e.target.value })} /></Label>
        <Label text={`App Secret (OAuth) ${config.appSecretConfigured ? "· đã cấu hình" : ""}`}>
          <input type="password" className={field} value={secrets.appSecret} onChange={e => setSecrets({ ...secrets, appSecret: e.target.value })} placeholder={config.appSecretConfigured ? "•••••••• (để trống để giữ nguyên)" : "App Secret của ứng dụng"} />
        </Label>
        <Label text={`OA Secret Key (Webhook) ${config.oaSecretKeyConfigured ? "· đã cấu hình" : "· chưa cấu hình"}`}>
          <input type="password" className={field} value={secrets.oaSecretKey} onChange={e => setSecrets({ ...secrets, oaSecretKey: e.target.value })} placeholder={config.oaSecretKeyConfigured ? "•••••••• (để trống để giữ nguyên)" : "OA Secret Key trong OA Manager"} />
        </Label>
        <Label text={`Access Token ${config.accessTokenConfigured ? "· đã cấu hình" : ""}`}>
          <input type="password" className={field} value={secrets.accessToken} onChange={e => setSecrets({ ...secrets, accessToken: e.target.value })} placeholder={config.accessTokenConfigured ? "•••••••• (để trống để giữ nguyên)" : "Access Token"} />
        </Label>
        <Label text={`Refresh Token ${config.refreshTokenConfigured ? "· đã cấu hình" : ""}`}>
          <input type="password" className={field} value={secrets.refreshToken} onChange={e => setSecrets({ ...secrets, refreshToken: e.target.value })} placeholder={config.refreshTokenConfigured ? "•••••••• (để trống để giữ nguyên)" : "Refresh Token"} />
        </Label>
        <Label text="Mô hình AI mặc định"><input className={field} value={config.aiModel} onChange={e => setConfig({ ...config, aiModel: e.target.value })} /></Label>
      </div>
      <div className="mt-5 space-y-4">
        <SettingToggle label="Kích hoạt kết nối OA" hint="Cho phép CRM gọi Zalo OA OpenAPI." value={config.isActive} set={value => setConfig({ ...config, isActive: value })} />
        <SettingToggle label="Đã được cấp quyền ZBS" hint="Chỉ bật sau khi ứng dụng và mẫu đã được Zalo phê duyệt." value={config.zbsEnabled} set={value => setConfig({ ...config, zbsEnabled: value })} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={save} disabled={Boolean(busy)} className={goldButton}>{busy === "save-config" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu cấu hình</button>
        <button onClick={test} disabled={Boolean(busy)} className={secondaryButton}>{busy === "test" ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />} Kiểm tra kết nối</button>
      </div>
    </section>

    <section className={`${panel} p-5 md:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Webhook nhận tin khách</h2><p className="mt-1 text-sm text-[#8f99aa]">Kết nối URL chỉ xác nhận HTTP 200; trạng thái dưới đây mới xác nhận CRM đã kiểm chữ ký và lưu sự kiện.</p></div>
        <StatusBadge active={webhookOk} on="Đã lưu sự kiện" off={webhookFailed ? "Sự kiện bị từ chối" : "Chưa nhận sự kiện"} />
      </div>
      <div className="mt-4 rounded-xl border border-white/8 bg-[#0c1320] p-3 text-xs break-all text-[#d8d0c1]">{config.webhookUrl || "/api/crm/zalo/webhook"}</div>

      <div className={`mt-4 rounded-xl border p-4 ${webhookOk ? "border-emerald-400/20 bg-emerald-400/[0.06]" : webhookFailed ? "border-red-400/20 bg-red-400/[0.06]" : "border-amber-400/20 bg-amber-400/[0.06]"}`}>
        <div className="flex items-start gap-3">
          {webhookOk ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" /> : <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${webhookFailed ? "text-red-300" : "text-amber-200"}`} />}
          <div className="min-w-0 text-xs leading-5">
            <div className="font-semibold">{config.webhookLastReceivedAt ? `Lần nhận gần nhất: ${formatDate(config.webhookLastReceivedAt)}` : "Chưa ghi nhận webhook thật từ Zalo OA."}</div>
            {config.webhookLastEvent && <div className="mt-1 text-[#9ca6b7]">Sự kiện: <span className="font-mono text-[#d8d0c1]">{config.webhookLastEvent}</span></div>}
            {config.webhookLastError && <div className="mt-1 text-red-200">{config.webhookLastError}</div>}
            {!config.oaSecretKeyConfigured && <div className="mt-1 text-amber-100">Nhập OA Secret Key riêng rồi bấm Lưu cấu hình trước khi gửi tin thử.</div>}
          </div>
        </div>
      </div>

      <ol className="mt-5 space-y-3 text-sm text-[#a5aebc]">{[
        "Liên kết ứng dụng với đúng Official Account.",
        "Lưu App Secret cho OAuth và OA Secret Key riêng cho chữ ký webhook.",
        "Đăng ký các sự kiện user_send_text, user_send_image và user_send_file.",
        "Dùng một tài khoản Zalo khác gửi tin mới trực tiếp vào OA.",
        "Làm mới CRM và kiểm tra trạng thái sự kiện gần nhất tại đây.",
      ].map((text, index) => <li key={text} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c9a84c]/12 text-xs font-bold text-[#d6b75b]">{index + 1}</span><span className="pt-0.5 leading-5">{text}</span></li>)}</ol>
      <a href="https://developers.zalo.me/docs" target="_blank" rel="noreferrer" className={`${secondaryButton} mt-5 w-full`}>Mở tài liệu Zalo Platform</a>
    </section>
  </div>;
}

function HistorySyncCard({ summary, configured, busy, sync }: {
  summary: HistorySyncSummary;
  configured: boolean;
  busy: boolean;
  sync: () => void;
}) {
  const status = {
    never: { label: "Chưa chạy", classes: "border-white/10 bg-white/[0.03] text-[rgba(245,237,214,0.55)]" },
    running: { label: "Đang đồng bộ", classes: "border-sky-400/25 bg-sky-400/10 text-sky-200" },
    completed: { label: "Hoàn tất", classes: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" },
    partial: { label: "Một phần", classes: "border-amber-400/25 bg-amber-400/10 text-amber-200" },
    failed: { label: "Thất bại", classes: "border-red-400/25 bg-red-400/10 text-red-200" },
  }[summary.status];
  const metrics = [
    ["Khách đã xử lý", summary.customersUpserted],
    ["Lượt tag OA", summary.tagsSynced],
    ["Tin mới", summary.messagesInserted],
    ["Tin trùng", summary.messagesSkipped],
  ] as const;

  return <section className={`${panel} p-5 md:p-6`}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Nhập khách hàng & lịch sử Zalo OA</h2>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.classes}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-[#8f99aa]">Nhập khách và tin nhắn cũ mà OA OpenAPI cho phép truy cập. Có thể chạy lại an toàn: CRM đối chiếu mã tin nhắn và bỏ qua dữ liệu đã tồn tại.</p>
      </div>
      <button className={goldButton} disabled={busy || !configured} onClick={sync}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        {busy ? "Đang đồng bộ..." : "Đồng bộ khách hàng & lịch sử"}
      </button>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-[rgba(255,200,100,0.10)] bg-black/10 p-4"><strong className="text-xl text-[#e0c66f]">{value}</strong><div className="mt-1 text-xs text-[rgba(245,237,214,0.42)]">{label}</div></div>)}
    </div>

    {(summary.startedAt || summary.finishedAt) && <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[rgba(245,237,214,0.45)]">
      {summary.startedAt && <span>Bắt đầu: {formatDate(summary.startedAt)}</span>}
      {summary.finishedAt && <span>Hoàn thành: {formatDate(summary.finishedAt)}</span>}
    </div>}
    {summary.error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-xs leading-5 text-red-200">{summary.error}</div>}
    {summary.warnings.length > 0 && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
      <div className="text-xs font-semibold text-amber-100">Lưu ý từ lần đồng bộ gần nhất</div>
      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-100/70">{summary.warnings.slice(0, 5).map(item => <li key={item} className="flex gap-2"><span>•</span><span>{item}</span></li>)}</ul>
    </div>}
    {!configured && <div className="mt-4 text-xs text-amber-200">Hãy kích hoạt kết nối OA và lưu Access Token trước khi đồng bộ.</div>}
    <p className="mt-4 text-xs leading-5 text-[rgba(245,237,214,0.34)]">Phạm vi dữ liệu cũ phụ thuộc quyền ứng dụng, phiên bản OpenAPI và thời hạn Zalo còn cung cấp. Báo cáo “Một phần” nghĩa là CRM đã giữ dữ liệu lấy được và ghi rõ phần bị Zalo giới hạn.</p>
  </section>;
}

function SendModal({ config, templates, conversations, initialUserId, busy, close, submit }: { config: PublicConfig; templates: Template[]; conversations: Conversation[]; initialUserId: string; busy: boolean; close: () => void; submit: (body: Record<string, unknown>) => void }) {
  const [category, setCategory] = useState<Category>("consultation");
  const [userId, setUserId] = useState(initialUserId);
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateData, setTemplateData] = useState("{}");
  const filtered = templates.filter(item => item.category === category && item.isActive && (category === "consultation" || item.approvalStatus === "ENABLE"));
  useEffect(() => { setTemplateId(filtered[0]?.zbsTemplateId || ""); if (category === "consultation") setContent(filtered[0]?.content || ""); }, [category]); // eslint-disable-line react-hooks/exhaustive-deps
  function send() {
    if (category === "consultation") return submit({ action: "send_consultation", userId, content });
    let parsed: Record<string, string>; try { parsed = JSON.parse(templateData) as Record<string, string>; } catch { return; }
    submit({ action: "send_zbs", category, userId: userId || undefined, phone: phone || undefined, templateId, templateData: parsed });
  }
  return <Modal title="Soạn tin Zalo OA" close={close}><div className="space-y-4"><Label text="Loại tin"><select className={field} value={category} onChange={e => setCategory(e.target.value as Category)}><option value="consultation">Tin tư vấn theo UID</option><option value="zbs_transaction">ZBS giao dịch</option><option value="zbs_after_sale">ZBS hậu mãi</option></select></Label><Label text="Hội thoại/Zalo UID"><select className={field} value={userId} onChange={e => setUserId(e.target.value)}><option value="">Chọn hội thoại hoặc nhập UID dưới đây</option>{conversations.map(item => <option key={item.userId} value={item.userId}>{item.displayName} · {item.userId}</option>)}</select><input className={`${field} mt-2`} value={userId} onChange={e => setUserId(e.target.value)} placeholder="Zalo UID" /></Label>{category === "consultation" ? <><div className={`rounded-xl border p-3 text-xs ${withinSevenDays(conversations.find(item => item.userId === userId)?.lastUserInteraction || null) ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200" : "border-amber-400/20 bg-amber-400/[0.06] text-amber-100"}`}>{withinSevenDays(conversations.find(item => item.userId === userId)?.lastUserInteraction || null) ? "Đủ điều kiện cửa sổ tương tác 7 ngày." : "Chưa có tương tác hợp lệ trong 7 ngày; hệ thống sẽ chặn gửi."}</div><Label text="Nội dung tư vấn"><textarea rows={6} className={field} value={content} onChange={e => setContent(e.target.value)} /></Label></> : <><Label text="Số điện thoại (tùy chọn nếu không có UID)"><input className={field} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0918326552" /></Label><Label text="ZBS Template ID"><input className={field} value={templateId} onChange={e => setTemplateId(e.target.value)} placeholder="Template đã được Zalo duyệt" /></Label><Label text="Template data (JSON)"><textarea rows={5} className={`${field} font-mono text-xs`} value={templateData} onChange={e => setTemplateData(e.target.value)} /></Label></>}<div className="flex justify-end gap-2 pt-2"><button className={secondaryButton} onClick={close}>Hủy</button><button className={goldButton} disabled={busy || !config.isActive || !userId && !phone} onClick={send}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Gửi qua OA</button></div></div></Modal>;
}

function TemplateModal({ value, setValue, busy, close, save, remove }: { value: Partial<Template>; setValue: (v: Partial<Template>) => void; busy: string; close: () => void; save: () => void; remove?: () => void }) {
  return <Modal title={value.id ? "Chỉnh sửa mẫu tin" : "Thêm mẫu tin"} close={close}><div className="space-y-4"><Label text="Tên mẫu"><input className={field} value={value.name || ""} onChange={e => setValue({ ...value, name: e.target.value })} /></Label><Label text="Loại tin"><select className={field} value={value.category || "consultation"} onChange={e => setValue({ ...value, category: e.target.value as Category })}>{Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Label>{value.category !== "consultation" && <Label text="ZBS Template ID đã duyệt"><input className={field} value={value.zbsTemplateId || ""} onChange={e => setValue({ ...value, zbsTemplateId: e.target.value })} /></Label>}<Label text="Nội dung tham chiếu"><textarea rows={6} className={field} value={value.content || ""} onChange={e => setValue({ ...value, content: e.target.value })} /></Label><Label text="Biến, cách nhau bằng dấu phẩy"><input className={field} value={(value.variables || []).join(", ")} onChange={e => setValue({ ...value, variables: e.target.value.split(",").map(item => item.trim()).filter(Boolean) })} /></Label><SettingToggle label="Mẫu đang hoạt động" hint="Mẫu tắt sẽ không xuất hiện khi soạn tin." value={value.isActive !== false} set={isActive => setValue({ ...value, isActive })} /><SettingToggle label="Cần admin duyệt" hint="Áp dụng trước khi tự động hóa sử dụng mẫu." value={value.requiresApproval !== false} set={requiresApproval => setValue({ ...value, requiresApproval })} /><div className="flex items-center justify-between gap-2 pt-2"><div>{remove && <button className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 px-4 py-2.5 text-sm text-red-300 hover:bg-red-400/10" disabled={Boolean(busy)} onClick={remove}><Trash2 size={14} /> Xóa mẫu</button>}</div><div className="flex gap-2"><button className={secondaryButton} onClick={close}>Hủy</button><button className={goldButton} disabled={Boolean(busy) || !value.name?.trim()} onClick={save}>{busy === "template" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu</button></div></div></div></Modal>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className={`${panel} max-h-[92vh] w-full max-w-2xl overflow-y-auto`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[rgba(255,200,100,0.12)] bg-[#1a1200]/95 px-5 py-4 backdrop-blur"><h2 className="text-lg font-semibold">{title}</h2><button onClick={close} className="rounded-lg p-2 text-[rgba(245,237,214,0.44)] hover:bg-[#c9a84c]/10 hover:text-[#f5edd6]"><X size={18} /></button></div><div className="p-5">{children}</div></div></div>; }
function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium text-[rgba(245,237,214,0.58)]">{text}</span>{children}</label>; }
function SettingToggle({ label, hint, value, set }: { label: string; hint: string; value: boolean; set: (value: boolean) => void }) { return <div className="flex items-center justify-between gap-4 rounded-xl border border-[rgba(255,200,100,0.10)] bg-black/10 p-3.5"><div><div className="text-sm font-medium">{label}</div><div className="mt-0.5 text-xs leading-5 text-[rgba(245,237,214,0.38)]">{hint}</div></div><Toggle checked={value} onChange={set} /></div>; }
function Empty({ text }: { text: string }) { return <div className="flex min-h-44 flex-col items-center justify-center p-8 text-center text-sm text-[rgba(245,237,214,0.36)]"><MessageCircle className="mb-3 text-[#c9a84c] opacity-35" size={30} /><p>{text}</p></div>; }
