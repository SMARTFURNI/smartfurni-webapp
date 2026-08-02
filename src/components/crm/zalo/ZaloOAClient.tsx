"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Bot, Check, CheckCircle2, Clock3, FileText,
  History, Inbox, Loader2, MessageCircle, Pencil, Plus, RefreshCw, Save,
  Send, Settings, ShieldCheck, Sparkles, Trash2, Users, X, Zap,
} from "lucide-react";

type Category = "consultation" | "zbs_transaction" | "zbs_after_sale";
type Tab = "overview" | "inbox" | "ai" | "templates" | "history" | "automation" | "settings";

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
  accessTokenConfigured: boolean;
  refreshTokenConfigured: boolean;
  webhookUrl: string;
}

interface Template {
  id: string;
  name: string;
  category: Category;
  content: string;
  zbsTemplateId: string;
  variables: string[];
  isActive: boolean;
  requiresApproval: boolean;
  updatedAt: string;
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
  source: "manual" | "ai" | "webhook";
  templateId: string;
  zaloMessageId: string;
  aiConfidence: number | null;
  error: string;
  createdAt: string;
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
}

const EMPTY_CONFIG: PublicConfig = {
  oaId: "", appId: "", isActive: false, aiEnabled: true, aiAutoSend: false,
  requireApproval: true, aiModel: "gpt-5.6-terra", aiConfidenceThreshold: 0.9,
  maxAutoMessagesPerDay: 30, businessHoursStart: "08:00", businessHoursEnd: "20:00",
  zbsEnabled: false, appSecretConfigured: false, accessTokenConfigured: false,
  refreshTokenConfigured: false, webhookUrl: "",
};

const CATEGORY_LABELS: Record<Category, string> = {
  consultation: "Tin tư vấn",
  zbs_transaction: "ZBS giao dịch",
  zbs_after_sale: "ZBS hậu mãi",
};

const TABS: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Tổng quan", icon: Activity },
  { id: "inbox", label: "Hội thoại OA", icon: Inbox },
  { id: "ai", label: "Chờ duyệt AI", icon: Bot },
  { id: "templates", label: "Mẫu tin & ZBS", icon: FileText },
  { id: "history", label: "Lịch sử gửi", icon: History },
  { id: "automation", label: "Tự động hóa", icon: Zap },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

const panel = "rounded-2xl border border-[rgba(118,138,166,0.18)] bg-[linear-gradient(145deg,rgba(31,37,52,0.82),rgba(29,24,15,0.76))] shadow-[0_18px_50px_rgba(0,0,0,0.18)]";
const field = "w-full rounded-xl border border-[rgba(118,138,166,0.2)] bg-[#0c1320] px-3.5 py-2.5 text-sm text-[#eee7d8] outline-none transition focus:border-[#c9a84c]/60";
const goldButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9a84c] px-4 py-2.5 text-sm font-semibold text-[#17130a] transition hover:bg-[#dfbf62] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(201,168,76,0.28)] bg-[rgba(15,19,27,0.7)] px-4 py-2.5 text-sm font-medium text-[#d8d0c1] transition hover:border-[#c9a84c]/60 hover:text-white disabled:opacity-50";

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
  const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; name?: string };
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
  const [secrets, setSecrets] = useState({ appSecret: "", accessToken: "", refreshToken: "" });
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const visibleTabs = useMemo(() => isAdmin ? TABS : TABS.filter(item => !["templates", "automation", "settings"].includes(item.id)), [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/zalo", { cache: "no-store" });
      const next = await res.json() as Dashboard & { error?: string };
      if (!res.ok) throw new Error(next.error || "Không tải được Zalo OA.");
      setData(next); setConfig(next.config);
      setSelectedUser(current => current || next.conversations[0]?.userId || "");
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không tải được dữ liệu." });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = useCallback(async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key); setNotice(null);
    try { await fn(); setNotice({ type: "ok", text: success }); await load(); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Có lỗi xảy ra." }); }
    finally { setBusy(""); }
  }, [load]);

  const selectedConversation = data?.conversations.find(item => item.userId === selectedUser) || null;
  const selectedMessages = useMemo(() => (data?.messages || []).filter(item => item.userId === selectedUser).reverse(), [data?.messages, selectedUser]);
  const drafts = (data?.aiQueue || []).filter(item => item.status === "draft");

  async function saveConfig() {
    await run("save-config", () => postAction({ action: "save_config", config: { ...config, ...secrets } }), "Đã lưu cấu hình Zalo OA và AI Agent.");
    setSecrets({ appSecret: "", accessToken: "", refreshToken: "" });
  }

  if (loading && !data) return <div className="flex min-h-[70vh] items-center justify-center text-[#b8b0a2]"><Loader2 className="mr-2 animate-spin" /> Đang tải trung tâm Zalo OA...</div>;

  return <div className="min-h-full space-y-5 p-4 text-[#eee7d8] md:p-7">
    <section className={`${panel} overflow-hidden`}>
      <div className="flex flex-col gap-5 border-b border-[rgba(118,138,166,0.14)] p-5 lg:flex-row lg:items-center lg:justify-between lg:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#c9a84c]/30 bg-[#c9a84c]/10"><MessageCircle className="text-[#d6b75b]" /></div>
          <div><div className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#c9a84c]">Zalo Official Account</div><h1 className="text-2xl font-semibold md:text-3xl">Trung tâm chăm sóc khách hàng Zalo OA</h1><p className="mt-1 max-w-3xl text-sm text-[#9ca6b7]">Quản lý hội thoại, mẫu ZBS, hàng chờ AI và lịch sử gửi trên cùng dữ liệu CRM. AI không tự gửi nếu chưa vượt các cổng an toàn.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge active={Boolean(config.isActive && config.accessTokenConfigured)} /><button className={secondaryButton} onClick={() => void load()}><RefreshCw size={15} /> Làm mới</button><button className={goldButton} onClick={() => setSendOpen(true)}><Send size={15} /> Soạn tin</button></div>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-2.5">
        {visibleTabs.map(item => { const Icon = item.icon; const count = item.id === "ai" ? drafts.length : item.id === "inbox" ? data?.stats.unread : 0; return <button key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition ${tab === item.id ? "border border-[#c9a84c]/35 bg-[#c9a84c]/12 text-[#f0d77e]" : "border border-transparent text-[#9ca6b7] hover:bg-white/5 hover:text-white"}`}><Icon size={15} />{item.label}{Boolean(count) && <span className="rounded-full bg-[#c9a84c] px-1.5 py-0.5 text-[10px] font-bold text-black">{count}</span>}</button>; })}
      </nav>
    </section>

    {notice && <div className={`flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${notice.type === "ok" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-red-400/25 bg-red-400/10 text-red-200"}`}><span className="flex gap-2">{notice.type === "ok" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}{notice.text}</span><button onClick={() => setNotice(null)}><X size={16} /></button></div>}

    {tab === "overview" && <Overview data={data!} config={config} go={setTab} isAdmin={isAdmin} />}
    {tab === "inbox" && <InboxTab conversations={data?.conversations || []} selectedUser={selectedUser} setSelectedUser={setSelectedUser} selected={selectedConversation} messages={selectedMessages} busy={busy} generate={() => selectedUser && void run(`ai-${selectedUser}`, () => postAction({ action: "generate_ai", userId: selectedUser }), "AI đã tạo bản nháp và đưa vào hàng chờ duyệt.")} />}
    {tab === "ai" && <AiQueue items={data?.aiQueue || []} busy={busy} review={(id, decision) => void run(`${decision}-${id}`, () => postAction({ action: "review_ai", id, decision }), decision === "approve" ? "Đã duyệt và gửi tin tư vấn qua OA." : "Đã từ chối bản nháp AI.")} />}
    {tab === "templates" && <TemplatesTab templates={data?.templates || []} open={(item) => { setEditingTemplate(item || { category: "consultation", isActive: true, requiresApproval: true, variables: [] }); setTemplateOpen(true); }} />}
    {tab === "history" && <HistoryTab messages={data?.messages || []} />}
    {tab === "automation" && <AutomationTab config={config} setConfig={setConfig} save={() => void saveConfig()} busy={busy === "save-config"} />}
    {tab === "settings" && <div className="space-y-4">
      <SettingsTab config={config} setConfig={setConfig} secrets={secrets} setSecrets={setSecrets} save={() => void saveConfig()} test={() => void run("test", () => postAction({ action: "test_connection" }), "Kết nối Zalo OA hợp lệ.")} busy={busy} />
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
    [MessageCircle, "Hội thoại OA", data.stats.conversations, `${data.stats.unread} chưa đọc`],
    [Bot, "Bản nháp AI", data.stats.aiDrafts, "Chờ admin duyệt"],
    [Send, "Đã gửi hôm nay", data.stats.sentToday, `${data.stats.sent} gửi thành công`],
    [AlertTriangle, "Gửi thất bại", data.stats.failed, `${data.stats.pending} đang chờ`],
  ] as const;
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([Icon, label, value, hint]) => <div key={label} className={`${panel} p-5`}><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/10"><Icon size={18} className="text-[#d6b75b]" /></div><strong className="text-3xl">{value}</strong></div><div className="mt-4 text-sm font-medium">{label}</div><div className="mt-1 text-xs text-[#8f99aa]">{hint}</div></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className={`${panel} p-5 md:p-6`}><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Luồng vận hành an toàn</h2><p className="text-sm text-[#8f99aa]">Tách đúng mục đích tin theo chính sách OA 2026.</p></div><ShieldCheck className="text-emerald-300" /></div><div className="grid gap-3 md:grid-cols-3">{[
        ["01", "Khách nhắn OA", "Webhook lưu hội thoại thật và thời điểm tương tác."],
        ["02", "AI soạn bản nháp", "Đọc ngữ cảnh, giữ xưng hô, không bịa chính sách."],
        ["03", "Duyệt hoặc tự gửi", "Chỉ gửi khi đúng loại tin, UID, thời gian và ngưỡng tin cậy."],
      ].map(([no, title, desc]) => <div key={no} className="rounded-xl border border-white/8 bg-black/15 p-4"><div className="text-xs font-bold tracking-[0.2em] text-[#c9a84c]">{no}</div><div className="mt-2 font-medium">{title}</div><p className="mt-1 text-xs leading-5 text-[#8f99aa]">{desc}</p></div>)}</div></section>
      <section className={`${panel} p-5 md:p-6`}><h2 className="text-lg font-semibold">Sẵn sàng hệ thống</h2><div className="mt-4 space-y-3">{[
        [config.accessTokenConfigured, "Access Token OA"], [Boolean(config.appId && config.appSecretConfigured), "Webhook có chữ ký"], [config.zbsEnabled, "Quyền gửi ZBS"], [config.aiEnabled, `AI Agent · ${config.aiModel}`],
      ].map(([ok, label]) => <div key={String(label)} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-3 py-2.5 text-sm"><span>{label}</span>{ok ? <Check size={16} className="text-emerald-300" /> : <AlertTriangle size={16} className="text-amber-300" />}</div>)}</div>{isAdmin ? <button onClick={() => go("settings")} className={`${secondaryButton} mt-4 w-full`}><Settings size={15} /> Mở cài đặt</button> : <p className="mt-4 text-xs text-[#8f99aa]">Cấu hình kết nối và tự động hóa do admin quản lý.</p>}</section>
    </div>
    <section className="rounded-2xl border border-emerald-400/18 bg-emerald-400/[0.06] p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" /><div><h3 className="font-semibold text-emerald-100">Mặc định không tự nhắn khách</h3><p className="mt-1 text-sm leading-6 text-emerald-100/65">Tin tư vấn chỉ dùng Zalo UID và tương tác gần nhất trong 7 ngày. Tin giao dịch/hậu mãi dùng ZBS Template đã duyệt. Có thể bật tự gửi AI trong tab Tự động hóa sau khi kiểm tra quyền API.</p></div></div></section>
  </div>;
}

function InboxTab({ conversations, selectedUser, setSelectedUser, selected, messages, busy, generate }: { conversations: Conversation[]; selectedUser: string; setSelectedUser: (v: string) => void; selected: Conversation | null; messages: MessageRecord[]; busy: string; generate: () => void }) {
  return <section className={`${panel} min-h-[620px] overflow-hidden`}><div className="grid min-h-[620px] lg:grid-cols-[360px_1fr]">
    <aside className="border-b border-white/8 lg:border-b-0 lg:border-r"><div className="border-b border-white/8 p-4"><div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8f99aa]">{conversations.length} hội thoại OA</div></div><div className="max-h-[560px] overflow-y-auto">{conversations.length ? conversations.map(item => <button key={item.userId} onClick={() => setSelectedUser(item.userId)} className={`w-full border-b border-white/6 p-4 text-left transition ${selectedUser === item.userId ? "bg-[#c9a84c]/10" : "hover:bg-white/[0.03]"}`}><div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{item.displayName}</strong>{item.unreadCount > 0 && <span className="rounded-full bg-[#c9a84c] px-2 py-0.5 text-[10px] font-bold text-black">{item.unreadCount}</span>}</div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8f99aa]">{item.lastMessagePreview}</p><div className="mt-2 flex items-center justify-between text-[11px] text-[#687487]"><span>{formatDate(item.lastMessageAt)}</span><span className={withinSevenDays(item.lastUserInteraction) ? "text-emerald-300" : "text-amber-300"}>{withinSevenDays(item.lastUserInteraction) ? "Trong 7 ngày" : "Ngoài 7 ngày"}</span></div></button>) : <Empty text="Webhook chưa nhận hội thoại nào." />}</div></aside>
    <main className="flex min-w-0 flex-col">{selected ? <><div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">{selected.displayName}</h2><p className="mt-0.5 text-xs text-[#8f99aa]">UID: {selected.userId} · Tương tác cuối: {formatDate(selected.lastUserInteraction)}</p></div><button disabled={busy === `ai-${selected.userId}`} onClick={generate} className={goldButton}>{busy === `ai-${selected.userId}` ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} AI soạn trả lời</button></div><div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.length ? messages.map(item => <div key={item.id} className={`max-w-[82%] rounded-2xl border px-4 py-3 ${item.direction === "outbound" ? "ml-auto border-[#c9a84c]/20 bg-[#c9a84c]/10" : "border-white/10 bg-[#0c1320]"}`}><p className="whitespace-pre-wrap text-sm leading-6">{item.content}</p><div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-[#7f899a]"><span>{item.direction === "outbound" ? `OA · ${item.source}` : "Khách hàng"}</span><span>{formatDate(item.createdAt)}</span></div>{item.error && <p className="mt-2 text-xs text-red-300">{item.error}</p>}</div>) : <Empty text="Chưa có nội dung trong hội thoại." />}</div></> : <Empty text="Chọn một hội thoại Zalo OA để xem chi tiết." />}</main>
  </div></section>;
}

function AiQueue({ items, busy, review }: { items: QueueItem[]; busy: string; review: (id: string, decision: "approve" | "reject") => void }) {
  const drafts = items.filter(item => item.status === "draft");
  return <div className="space-y-4"><div className={`${panel} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}><div><h2 className="text-lg font-semibold">Hàng chờ duyệt AI</h2><p className="text-sm text-[#8f99aa]">Admin đọc ngữ cảnh và nội dung trước khi cho phép gửi.</p></div><StatusBadge active={drafts.length === 0} on="Không còn bản nháp" off={`${drafts.length} bản nháp cần duyệt`} /></div>{drafts.length ? drafts.map(item => <article key={item.id} className={`${panel} p-5 md:p-6`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.customerName}</h3><span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-200">Tin cậy {Math.round(item.confidence * 100)}%</span><span className="text-xs text-[#778396]">{formatDate(item.createdAt)}</span></div><div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="rounded-xl border border-white/8 bg-black/10 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f99aa]">Tin khách vừa gửi</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#b6bfcc]">{item.incomingMessage}</p></div><div className="rounded-xl border border-[#c9a84c]/18 bg-[#c9a84c]/[0.06] p-4"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c9a84c]">AI đề xuất</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.suggestedReply}</p></div></div>{item.reasoning && <p className="mt-3 text-xs leading-5 text-[#7f899a]">Lý do: {item.reasoning}</p>}</div><div className="flex shrink-0 gap-2"><button disabled={Boolean(busy)} onClick={() => review(item.id, "reject")} className={secondaryButton}><X size={15} /> Từ chối</button><button disabled={Boolean(busy)} onClick={() => review(item.id, "approve")} className={goldButton}>{busy === `approve-${item.id}` ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Duyệt & gửi</button></div></div></article>) : <div className={`${panel} p-12`}><Empty text="Không có bản nháp AI nào đang chờ duyệt." /></div>}</div>;
}

function TemplatesTab({ templates, open }: { templates: Template[]; open: (item?: Template) => void }) {
  return <div className="space-y-4"><div className={`${panel} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}><div><h2 className="text-lg font-semibold">Mẫu tin tư vấn & ZBS</h2><p className="text-sm text-[#8f99aa]">ID ZBS phải là mẫu đã đăng ký và được duyệt trên Zalo.</p></div><button className={goldButton} onClick={() => open()}><Plus size={15} /> Thêm mẫu</button></div><div className="grid gap-4 xl:grid-cols-2">{templates.map(item => <article key={item.id} className={`${panel} p-5`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.name}</h3><span className="rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/10 px-2.5 py-1 text-[11px] text-[#e3c86f]">{CATEGORY_LABELS[item.category]}</span></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#9ca6b7]">{item.content}</p><div className="mt-3 text-xs text-[#738095]">{item.zbsTemplateId ? `ZBS ID: ${item.zbsTemplateId}` : "Không cần ZBS ID"} · {item.requiresApproval ? "Cần duyệt" : "Theo tự động hóa"}</div></div><button className={secondaryButton} onClick={() => open(item)}><Pencil size={14} /></button></div></article>)}</div></div>;
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

function SettingsTab({ config, setConfig, secrets, setSecrets, save, test, busy }: { config: PublicConfig; setConfig: (v: PublicConfig) => void; secrets: { appSecret: string; accessToken: string; refreshToken: string }; setSecrets: (v: { appSecret: string; accessToken: string; refreshToken: string }) => void; save: () => void; test: () => void; busy: string }) {
  return <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><section className={`${panel} p-5 md:p-6`}><h2 className="text-lg font-semibold">Kết nối Zalo OA OpenAPI</h2><p className="mt-1 text-sm text-[#8f99aa]">Giá trị bí mật để trống sẽ giữ nguyên, hệ thống không hiển thị token đã lưu.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Label text="OA ID"><input className={field} value={config.oaId} onChange={e => setConfig({ ...config, oaId: e.target.value })} /></Label><Label text="App ID"><input className={field} value={config.appId} onChange={e => setConfig({ ...config, appId: e.target.value })} /></Label><Label text={`App Secret ${config.appSecretConfigured ? "· đã cấu hình" : ""}`}><input type="password" className={field} value={secrets.appSecret} onChange={e => setSecrets({ ...secrets, appSecret: e.target.value })} placeholder={config.appSecretConfigured ? "•••••••• (để trống để giữ nguyên)" : "OA Secret Key"} /></Label><Label text={`Access Token ${config.accessTokenConfigured ? "· đã cấu hình" : ""}`}><input type="password" className={field} value={secrets.accessToken} onChange={e => setSecrets({ ...secrets, accessToken: e.target.value })} placeholder={config.accessTokenConfigured ? "•••••••• (để trống để giữ nguyên)" : "Access Token"} /></Label><Label text={`Refresh Token ${config.refreshTokenConfigured ? "· đã cấu hình" : ""}`}><input type="password" className={field} value={secrets.refreshToken} onChange={e => setSecrets({ ...secrets, refreshToken: e.target.value })} placeholder={config.refreshTokenConfigured ? "•••••••• (để trống để giữ nguyên)" : "Refresh Token"} /></Label><Label text="Mô hình AI mặc định"><input className={field} value={config.aiModel} onChange={e => setConfig({ ...config, aiModel: e.target.value })} /></Label></div><div className="mt-5 space-y-4"><SettingToggle label="Kích hoạt kết nối OA" hint="Cho phép CRM gọi Zalo OA OpenAPI." value={config.isActive} set={value => setConfig({ ...config, isActive: value })} /><SettingToggle label="Đã được cấp quyền ZBS" hint="Chỉ bật sau khi ứng dụng và mẫu đã được Zalo phê duyệt." value={config.zbsEnabled} set={value => setConfig({ ...config, zbsEnabled: value })} /></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={save} disabled={Boolean(busy)} className={goldButton}>{busy === "save-config" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu cấu hình</button><button onClick={test} disabled={Boolean(busy)} className={secondaryButton}>{busy === "test" ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />} Kiểm tra kết nối</button></div></section><section className={`${panel} p-5 md:p-6`}><h2 className="text-lg font-semibold">Webhook nhận tin khách</h2><p className="mt-1 text-sm text-[#8f99aa]">Dùng URL này trong ứng dụng Zalo Developer và đăng ký sự kiện tin nhắn.</p><div className="mt-4 rounded-xl border border-white/8 bg-[#0c1320] p-3 text-xs break-all text-[#d8d0c1]">{config.webhookUrl || "/api/crm/zalo/webhook"}</div><ol className="mt-5 space-y-3 text-sm text-[#a5aebc]">{["Tạo/liên kết ứng dụng với Official Account.", "Cấp quyền OA OpenAPI và lưu Access/Refresh Token.", "Đăng ký webhook; chữ ký được kiểm bằng App ID + data + timestamp + OA Secret Key.", "Đăng ký và duyệt ZBS Template cho tin giao dịch/hậu mãi.", "Gửi thử bằng tài khoản thật trước khi bật AI tự gửi."].map((text, index) => <li key={text} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c9a84c]/12 text-xs font-bold text-[#d6b75b]">{index + 1}</span><span className="pt-0.5 leading-5">{text}</span></li>)}</ol><a href="https://developers.zalo.me/docs" target="_blank" rel="noreferrer" className={`${secondaryButton} mt-5 w-full`}>Mở tài liệu Zalo Platform</a></section></div>;
}

function SendModal({ config, templates, conversations, initialUserId, busy, close, submit }: { config: PublicConfig; templates: Template[]; conversations: Conversation[]; initialUserId: string; busy: boolean; close: () => void; submit: (body: Record<string, unknown>) => void }) {
  const [category, setCategory] = useState<Category>("consultation");
  const [userId, setUserId] = useState(initialUserId);
  const [phone, setPhone] = useState("");
  const [content, setContent] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateData, setTemplateData] = useState("{}");
  const filtered = templates.filter(item => item.category === category && item.isActive);
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

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div className={`${panel} max-h-[92vh] w-full max-w-2xl overflow-y-auto`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#171b24]/95 px-5 py-4 backdrop-blur"><h2 className="text-lg font-semibold">{title}</h2><button onClick={close} className="rounded-lg p-2 text-[#8f99aa] hover:bg-white/5 hover:text-white"><X size={18} /></button></div><div className="p-5">{children}</div></div></div>; }
function Label({ text, children }: { text: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium text-[#aab3c0]">{text}</span>{children}</label>; }
function SettingToggle({ label, hint, value, set }: { label: string; hint: string; value: boolean; set: (value: boolean) => void }) { return <div className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-black/10 p-3.5"><div><div className="text-sm font-medium">{label}</div><div className="mt-0.5 text-xs leading-5 text-[#7f899a]">{hint}</div></div><Toggle checked={value} onChange={set} /></div>; }
function Empty({ text }: { text: string }) { return <div className="flex min-h-44 flex-col items-center justify-center p-8 text-center text-sm text-[#778396]"><MessageCircle className="mb-3 opacity-40" size={30} /><p>{text}</p></div>; }
