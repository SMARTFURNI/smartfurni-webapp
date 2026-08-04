"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, CalendarClock, Check, CheckCircle2, Clock3,
  ExternalLink, ImageIcon, Loader2, MessageSquareText, Pause, Play, RefreshCw,
  RotateCcw, Save, Send, Settings2, Sparkles, UserMinus, UserPlus, Users, XCircle,
} from "lucide-react";
import ZaloGmfTrackingLinks from "./ZaloGmfTrackingLinks";

export type ZaloGmfView = "groups" | "content" | "members" | "links" | "reports";

interface Settings {
  autoPublish: boolean; requireApproval: boolean; businessHoursStart: string; businessHoursEnd: string;
  maxPostsPerGroupDay: number; minPostIntervalMinutes: number; memberSyncIntervalMinutes: number; paused: boolean;
}

interface Group {
  groupId: string; name: string; description: string; avatar: string; groupLink: string; status: string;
  assetType: string; totalMember: number; maxMember: number; validThrough: string; autoRenew: boolean;
  autoDeleteDate: string; tag: string; automationEnabled: boolean; lastSyncedAt: string | null;
  lastMemberSyncAt: string | null; lastPostAt: string | null; syncError: string;
  joined7d: number; left7d: number; pendingPosts: number;
}

interface Member {
  groupId: string; userId: string; memberType: string; name: string; avatar: string; status: string;
  joinedAt: string | null; leftAt: string | null; firstSeenAt: string; lastSeenAt: string;
}

interface MemberEvent {
  eventKey: string; groupId: string; groupName: string; userId: string; memberName: string;
  eventType: string; source: string; occurredAt: string;
}

interface Content {
  id: string; title: string; body: string; imageUrl: string; imagePrompt: string; linkUrl: string;
  objective: string; status: "draft" | "pending" | "approved" | "rejected"; version: number;
  targetGroupIds: string[]; scheduledAt: string | null; aiModel: string; approvedBy: string;
  approvedAt: string | null; rejectedReason: string; createdBy: string; createdAt: string; updatedAt: string;
}

interface Schedule {
  id: string; contentId: string; contentTitle: string; groupId: string; groupName: string;
  scheduledAt: string; status: "pending" | "sending" | "sent" | "failed" | "cancelled";
  attempts: number; nextAttemptAt: string | null; messageId: string; error: string; sentAt: string | null; createdAt: string;
}

interface MemberReport {
  range: { from: string; to: string };
  todayJoined: number; yesterdayJoined: number; last7DaysJoined: number;
  selectedJoined: number; selectedLeft: number; selectedNet: number;
  daily: Array<{ date: string; joined: number; left: number; net: number }>;
  groups: Array<{ groupId: string; groupName: string; totalMember: number; joined: number; left: number; net: number }>;
}

interface Dashboard {
  configured: boolean;
  settings: Settings;
  stats: { groups: number; activeGroups: number; members: number; joined30d: number; left30d: number; pendingApproval: number; scheduled: number; sent30d: number; failed30d: number };
  groups: Group[]; members: Member[]; memberEvents: MemberEvent[]; memberReport: MemberReport; contents: Content[]; schedules: Schedule[];
}

const card = "rounded-2xl border border-[#dbe3ee] bg-white shadow-[0_12px_32px_rgba(30,48,72,0.08)]";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#c99e32] bg-[linear-gradient(135deg,#f1d778_0%,#d4af45_48%,#b98720_100%)] px-4 py-2.5 text-sm font-semibold text-[#241a05] shadow-[0_10px_24px_rgba(166,119,20,0.20)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-[linear-gradient(135deg,#fff,#edf2f7)] px-3.5 py-2.5 text-sm font-semibold text-[#334155] shadow-[0_7px_18px_rgba(51,65,85,0.08)] transition hover:-translate-y-0.5 hover:border-[#94a3b8] disabled:cursor-not-allowed disabled:opacity-45";
const field = "w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#d4af45] focus:ring-4 focus:ring-[#d4af45]/10";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function localDateTime(hours = 1) {
  const date = new Date(Date.now() + hours * 60 * 60_000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isoFromLocal(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function vietnamDateInput(daysFromToday = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + daysFromToday * 86_400_000));
}

function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(`${value}T00:00:00+07:00`));
}

async function gmfAction(payload: Record<string, unknown>) {
  const response = await fetch("/api/crm/zalo/gmf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string };
  if (!response.ok || result.ok === false) throw new Error(result.error || "Không thể xử lý yêu cầu GMF.");
  return result;
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    enabled: "border-emerald-200 bg-emerald-50 text-emerald-700", approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sent: "border-emerald-200 bg-emerald-50 text-emerald-700", active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700", draft: "border-blue-200 bg-blue-50 text-blue-700",
    sending: "border-blue-200 bg-blue-50 text-blue-700", failed: "border-red-200 bg-red-50 text-red-700",
    rejected: "border-red-200 bg-red-50 text-red-700", left: "border-slate-200 bg-slate-100 text-slate-600",
    cancelled: "border-slate-200 bg-slate-100 text-slate-600", disabled: "border-slate-200 bg-slate-100 text-slate-600",
  };
  const labels: Record<string, string> = { enabled: "Hoạt động", approved: "Đã duyệt", sent: "Đã gửi", active: "Trong nhóm", pending: "Đã xếp lịch", draft: "Bản nháp", sending: "Đang gửi", failed: "Gửi lỗi", rejected: "Từ chối", left: "Đã rời", cancelled: "Đã hủy", disabled: "Tạm dừng" };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status] || styles.pending}`}>{labels[status] || status}</span>;
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return <div className={`${card} flex min-h-52 flex-col items-center justify-center p-8 text-center`}>
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7dd] text-[#9a7418]"><Icon size={22} /></div>
    <h3 className="mt-4 font-semibold text-[#172033]">{title}</h3><p className="mt-1 max-w-lg text-sm leading-6 text-[#738196]">{text}</p>
  </div>;
}

export default function ZaloGmfWorkspace({ view, isAdmin }: { view: ZaloGmfView; isAdmin: boolean }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const load = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const response = await fetch("/api/crm/zalo/gmf", { cache: "no-store" });
      const result = await response.json() as Dashboard & { error?: string };
      if (!response.ok) throw new Error(result.error || "Không tải được dữ liệu GMF.");
      setData(result);
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Không tải được dữ liệu GMF." }); }
    finally { if (spinner) setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = useCallback(async (key: string, payload: Record<string, unknown>, success: string) => {
    setBusy(key); setNotice(null);
    try { await gmfAction(payload); setNotice({ type: "ok", text: success }); await load(false); }
    catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Có lỗi xảy ra." }); }
    finally { setBusy(""); }
  }, [load]);

  if (loading && !data) return <div className="flex min-h-80 items-center justify-center text-sm text-[#738196]"><Loader2 className="mr-2 animate-spin text-[#9a7418]" /> Đang tải không gian GMF...</div>;
  if (!data) return <EmptyState icon={AlertTriangle} title="Không tải được GMF" text="Kiểm tra kết nối cơ sở dữ liệu và thử làm mới trang." />;

  return <div className="space-y-4">
    {notice && <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${notice.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.type === "ok" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{notice.text}</div>}
    {!data.configured && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,#fffdf3,#fff4cc)] p-4 text-sm text-amber-800"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><div><strong>Chưa sẵn sàng gọi GMF OpenAPI.</strong><p className="mt-1 text-amber-700">Hãy kiểm tra OA đang hoạt động, Access Token và quyền “Quản lý thông tin nhóm” trong Cài đặt.</p></div></div>}
    {view === "groups" && <GroupsView data={data} busy={busy} isAdmin={isAdmin} run={run} />}
    {view === "content" && <ContentView data={data} busy={busy} isAdmin={isAdmin} run={run} />}
    {view === "members" && <MembersView data={data} busy={busy} isAdmin={isAdmin} run={run} />}
    {view === "links" && <ZaloGmfTrackingLinks isAdmin={isAdmin} />}
    {view === "reports" && <ReportsView data={data} busy={busy} isAdmin={isAdmin} run={run} />}
  </div>;
}

function Metric({ icon: Icon, label, value, hint, tone }: { icon: typeof Users; label: string; value: number | string; hint: string; tone: "blue" | "green" | "amber" | "violet" | "rose" }) {
  const toneStyle = { blue: "from-blue-50 to-white border-blue-200 text-blue-700", green: "from-emerald-50 to-white border-emerald-200 text-emerald-700", amber: "from-amber-50 to-white border-amber-200 text-amber-700", violet: "from-violet-50 to-white border-violet-200 text-violet-700", rose: "from-rose-50 to-white border-rose-200 text-rose-700" }[tone];
  return <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-[0_10px_26px_rgba(30,48,72,0.06)] ${toneStyle}`}><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</div><strong className="mt-2 block text-2xl text-[#172033]">{value}</strong></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 shadow-sm"><Icon size={17} /></div></div><p className="mt-2 text-xs opacity-75">{hint}</p></div>;
}

function GroupsView({ data, busy, isAdmin, run }: { data: Dashboard; busy: string; isAdmin: boolean; run: (key: string, payload: Record<string, unknown>, success: string) => Promise<void> }) {
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={MessageSquareText} label="Nhóm GMF" value={data.stats.groups} hint={`${data.stats.activeGroups} nhóm đang hoạt động`} tone="blue" />
      <Metric icon={Users} label="Thành viên" value={data.stats.members} hint="Tổng số Zalo báo cáo" tone="violet" />
      <Metric icon={UserPlus} label="Tham gia 30 ngày" value={data.stats.joined30d} hint={`Tăng ròng ${data.stats.joined30d - data.stats.left30d}`} tone="green" />
      <Metric icon={CalendarClock} label="Đang chờ đăng" value={data.stats.scheduled} hint="Đã duyệt và xếp lịch" tone="amber" />
    </div>
    <div className={`${card} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
      <div><h2 className="font-semibold text-[#172033]">Danh sách nhóm OA đang quản lý</h2><p className="mt-1 text-sm text-[#738196]">Đồng bộ trực tiếp từ GMF OpenAPI; nhóm GMF100 hiện có sẽ tự xuất hiện khi quyền ứng dụng hợp lệ.</p></div>
      {isAdmin && <button className={primary} disabled={Boolean(busy) || !data.configured} onClick={() => void run("sync-groups", { action: "sync_groups", syncMembers: true }, "Đã đồng bộ nhóm và thành viên GMF từ Zalo.")}>{busy === "sync-groups" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Đồng bộ GMF100</button>}
    </div>
    {!data.groups.length ? <EmptyState icon={MessageSquareText} title="Chưa đồng bộ nhóm GMF" text="Bấm “Đồng bộ GMF100”. Nếu Zalo trả lỗi quyền, hãy cấp nhóm quyền quản lý thông tin nhóm cho ứng dụng đang kết nối OA." /> : <div className="grid gap-4 xl:grid-cols-2">{data.groups.map(group => <GroupCard key={group.groupId} group={group} busy={busy} isAdmin={isAdmin} run={run} />)}</div>}
  </div>;
}

function GroupCard({ group, busy, isAdmin, run }: { group: Group; busy: string; isAdmin: boolean; run: (key: string, payload: Record<string, unknown>, success: string) => Promise<void> }) {
  const fill = group.maxMember ? Math.min(100, Math.round(group.totalMember / group.maxMember * 100)) : 0;
  return <section className={`${card} overflow-hidden`}>
    <div className="flex gap-4 bg-[radial-gradient(circle_at_92%_0%,rgba(59,130,246,0.12),transparent_11rem),linear-gradient(135deg,#fff,#f8fbff)] p-5">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-lg">{group.avatar ? <img src={group.avatar} alt="" className="h-full w-full object-cover" /> : group.name.slice(0, 1).toUpperCase()}</div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-semibold text-[#172033]">{group.name}</h3><StatusPill status={group.status} /><span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold uppercase text-violet-700">{group.assetType || "GMF"}</span></div><p className="mt-1 line-clamp-2 text-sm leading-5 text-[#738196]">{group.description || "Nhóm cộng đồng do Zalo OA quản lý."}</p><div className="mt-2 text-[11px] text-[#94a3b8]">ID: {group.groupId}</div></div>
    </div>
    <div className="space-y-4 p-5">
      <div><div className="flex items-center justify-between text-sm"><span className="font-medium text-[#526173]">Sức chứa nhóm</span><strong className="text-[#172033]">{group.totalMember}/{group.maxMember || "—"} thành viên</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#8b5cf6)]" style={{ width: `${fill}%` }} /></div></div>
      <div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-emerald-50 p-3 text-center"><strong className="block text-lg text-emerald-700">+{group.joined7d}</strong><span className="text-[11px] text-emerald-600">Tham gia 7 ngày</span></div><div className="rounded-xl bg-rose-50 p-3 text-center"><strong className="block text-lg text-rose-700">-{group.left7d}</strong><span className="text-[11px] text-rose-600">Rời 7 ngày</span></div><div className="rounded-xl bg-amber-50 p-3 text-center"><strong className="block text-lg text-amber-700">{group.pendingPosts}</strong><span className="text-[11px] text-amber-600">Bài chờ đăng</span></div></div>
      <div className="grid gap-3 text-xs text-[#738196] sm:grid-cols-2"><div><span className="font-semibold text-[#526173]">Hết hạn gói:</span> {group.validThrough || group.autoDeleteDate || "—"}</div><div><span className="font-semibold text-[#526173]">Đối soát:</span> {formatDate(group.lastMemberSyncAt)}</div><div><span className="font-semibold text-[#526173]">Bài gần nhất:</span> {formatDate(group.lastPostAt)}</div><div><span className="font-semibold text-[#526173]">Gia hạn:</span> {group.autoRenew ? "Tự động" : "Theo gói OA"}</div></div>
      {group.syncError && <div className={`rounded-xl border px-3 py-2 text-xs ${group.syncError.startsWith("Nhóm đã đồng bộ") ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>{group.syncError}</div>}
      <div className="flex flex-wrap items-center gap-2 border-t border-[#e7edf4] pt-4">
        {isAdmin && <button className={secondary} disabled={Boolean(busy)} onClick={() => void run(`sync-${group.groupId}`, { action: "sync_members", groupId: group.groupId }, `Đã đối soát thành viên nhóm ${group.name}.`)}>{busy === `sync-${group.groupId}` ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Thành viên</button>}
        {isAdmin && <button className={secondary} disabled={Boolean(busy)} onClick={() => void run(`auto-${group.groupId}`, { action: "save_group_preferences", groupId: group.groupId, automationEnabled: !group.automationEnabled }, group.automationEnabled ? "Đã tạm dừng tự động hóa nhóm." : "Đã bật tự động hóa nhóm.")}>{group.automationEnabled ? <Pause size={15} /> : <Play size={15} />}{group.automationEnabled ? "Tạm dừng" : "Bật tự động"}</button>}
        {group.groupLink && <a className={secondary} href={group.groupLink} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Mở nhóm Zalo</a>}
      </div>
    </div>
  </section>;
}

function ContentView({ data, busy, isAdmin, run }: { data: Dashboard; busy: string; isAdmin: boolean; run: (key: string, payload: Record<string, unknown>, success: string) => Promise<void> }) {
  const [objective, setObjective] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [scheduleContent, setScheduleContent] = useState<Content | null>(null);
  const [editing, setEditing] = useState<Content | null>(null);
  const [scheduleAt, setScheduleAt] = useState(localDateTime(1));
  useEffect(() => { if (!selectedGroups.length && data.groups.length) setSelectedGroups(data.groups.filter(group => group.status === "enabled").map(group => group.groupId)); }, [data.groups, selectedGroups.length]);
  const toggleGroup = (id: string) => setSelectedGroups(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
  return <div className="space-y-4">
    <section className={`${card} overflow-hidden`}>
      <div className="border-b border-[#e7edf4] bg-[radial-gradient(circle_at_92%_0%,rgba(139,92,246,0.13),transparent_16rem),linear-gradient(135deg,#fff,#faf7ff)] p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Sparkles size={21} /></div><div><h2 className="text-lg font-semibold text-[#172033]">AI Content Factory cho GMF</h2><p className="text-sm text-[#738196]">Tạo nội dung theo mục tiêu, sinh ảnh 16:9, duyệt và đóng gói lịch đăng cho từng nhóm.</p></div></div></div>
      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="space-y-3"><label className="block text-xs font-semibold text-[#526173]">Yêu cầu nội dung</label><textarea className={`${field} min-h-28 resize-y`} value={objective} onChange={event => setObjective(event.target.value)} placeholder="Ví dụ: chia sẻ 5 mẹo tối ưu phòng ngủ nhỏ với giọng tư vấn tự nhiên, giới thiệu mềm sofa giường SmartFurni..." /><input className={field} value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="Link CTA hoặc trang sản phẩm (không bắt buộc)" /></div>
        <div><div className="mb-2 text-xs font-semibold text-[#526173]">Nhóm nhận nội dung ({selectedGroups.length})</div><div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-[#dbe3ee] bg-[#f8fafc] p-3">{data.groups.map(group => <label key={group.groupId} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm"><input type="checkbox" checked={selectedGroups.includes(group.groupId)} onChange={() => toggleGroup(group.groupId)} className="h-4 w-4 accent-[#b98720]" /><span className="min-w-0 flex-1 truncate font-medium text-[#334155]">{group.name}</span><span className="text-[10px] uppercase text-violet-600">{group.assetType}</span></label>)}</div><button className={`${primary} mt-3 w-full`} disabled={Boolean(busy) || !objective.trim() || !selectedGroups.length} onClick={() => void run("generate-content", { action: "generate_content", objective, linkUrl, groupIds: selectedGroups }, "AI đã tạo bản nháp GMF để kiểm duyệt.")}>{busy === "generate-content" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Tạo nội dung bằng AI</button></div>
      </div>
    </section>
    <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#172033]">Hàng kiểm duyệt nội dung</h2><p className="text-sm text-[#738196]">Ảnh được lưu công khai dạng JPG dưới 1 MB để Zalo GMF có thể tải.</p></div><div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">{data.stats.pendingApproval} chờ duyệt</div></div>
    {!data.contents.length ? <EmptyState icon={Sparkles} title="Chưa có nội dung GMF" text="Nhập mục tiêu phía trên để AI tạo bài đầu tiên cho nhóm GMF100." /> : <div className="grid gap-4 xl:grid-cols-2">{data.contents.map(content => <article key={content.id} className={`${card} overflow-hidden`}>
      {content.imageUrl ? <img src={content.imageUrl} alt="" className="h-52 w-full object-cover" /> : <div className="flex h-36 items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#eef2ff)] text-[#94a3b8]"><ImageIcon size={30} /></div>}
      <div className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold leading-6 text-[#172033]">{content.title}</h3><div className="mt-1 text-[11px] text-[#94a3b8]">Phiên bản {content.version} · {formatDate(content.createdAt)}</div></div><StatusPill status={content.status} /></div><p className="line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-[#526173]">{content.body}</p>{content.linkUrl && <a href={content.linkUrl} target="_blank" rel="noreferrer" className="block truncate text-xs font-medium text-blue-600">{content.linkUrl}</a>}<div className="flex flex-wrap gap-2 border-t border-[#e7edf4] pt-3">
        <button className={secondary} disabled={Boolean(busy)} onClick={() => setEditing(content)}><Save size={15} /> Chỉnh sửa</button>
        <button className={secondary} disabled={Boolean(busy)} onClick={() => void run(`image-${content.id}`, { action: "generate_image", contentId: content.id }, "Đã tạo và tối ưu ảnh GMF.")}>{busy === `image-${content.id}` ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}{content.imageUrl ? "Tạo lại ảnh" : "Tạo ảnh"}</button>
        {isAdmin && content.status !== "approved" && <button className={primary} disabled={Boolean(busy)} onClick={() => void run(`approve-${content.id}`, { action: "review_content", contentId: content.id, decision: "approve" }, "Đã duyệt nội dung GMF.")}><Check size={15} /> Duyệt</button>}
        {isAdmin && content.status !== "approved" && <button className={secondary} disabled={Boolean(busy)} onClick={() => void run(`reject-${content.id}`, { action: "review_content", contentId: content.id, decision: "reject", reason: "Cần chỉnh sửa nội dung" }, "Đã chuyển nội dung về trạng thái từ chối.")}><XCircle size={15} /> Từ chối</button>}
        {isAdmin && content.status === "approved" && <button className={primary} onClick={() => { setScheduleContent(content); setSelectedGroups(content.targetGroupIds.length ? content.targetGroupIds : data.groups.map(group => group.groupId)); }}><CalendarClock size={15} /> Lên lịch</button>}
      </div></div>
    </article>)}</div>}
    {scheduleContent && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"><div className={`${card} w-full max-w-xl p-5`}><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold text-[#172033]">Lên lịch đăng GMF</h3><p className="mt-1 text-sm text-[#738196]">{scheduleContent.title}</p></div><button onClick={() => setScheduleContent(null)} className="rounded-lg p-2 text-[#738196] hover:bg-slate-100"><XCircle size={20} /></button></div><div className="mt-5 space-y-4"><label className="block text-xs font-semibold text-[#526173]">Thời gian đăng<input type="datetime-local" className={`${field} mt-1.5`} value={scheduleAt} onChange={event => setScheduleAt(event.target.value)} /></label><div><div className="mb-2 text-xs font-semibold text-[#526173]">Nhóm nhận bài</div><div className="space-y-2 rounded-xl border border-[#dbe3ee] bg-[#f8fafc] p-3">{data.groups.map(group => <label key={group.groupId} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={selectedGroups.includes(group.groupId)} onChange={() => toggleGroup(group.groupId)} className="h-4 w-4 accent-[#b98720]" /><span>{group.name}</span></label>)}</div></div><button className={`${primary} w-full`} disabled={Boolean(busy) || !selectedGroups.length || !isoFromLocal(scheduleAt)} onClick={() => void run(`schedule-${scheduleContent.id}`, { action: "schedule_content", contentId: scheduleContent.id, groupIds: selectedGroups, scheduledAt: isoFromLocal(scheduleAt) }, "Đã đóng gói và lên lịch bài GMF.").then(() => setScheduleContent(null))}>{busy === `schedule-${scheduleContent.id}` ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Xác nhận lịch đăng</button></div></div></div>}
    {editing && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"><div className={`${card} max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5`}><div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold text-[#172033]">Chỉnh sửa bản nháp GMF</h3><p className="mt-1 text-sm text-[#738196]">Lưu thay đổi sẽ tạo phiên bản mới và yêu cầu duyệt lại.</p></div><button onClick={() => setEditing(null)} className="rounded-lg p-2 text-[#738196] hover:bg-slate-100"><XCircle size={20} /></button></div><div className="mt-5 space-y-4"><label className="block text-xs font-semibold text-[#526173]">Tiêu đề<input className={`${field} mt-1.5`} value={editing.title} onChange={event => setEditing(value => value ? { ...value, title: event.target.value } : value)} /></label><label className="block text-xs font-semibold text-[#526173]">Nội dung<textarea className={`${field} mt-1.5 min-h-56 resize-y`} value={editing.body} onChange={event => setEditing(value => value ? { ...value, body: event.target.value } : value)} /></label><label className="block text-xs font-semibold text-[#526173]">Mô tả ảnh cho AI<textarea className={`${field} mt-1.5 min-h-20 resize-y`} value={editing.imagePrompt} onChange={event => setEditing(value => value ? { ...value, imagePrompt: event.target.value } : value)} /></label><label className="block text-xs font-semibold text-[#526173]">Liên kết CTA<input className={`${field} mt-1.5`} value={editing.linkUrl} onChange={event => setEditing(value => value ? { ...value, linkUrl: event.target.value } : value)} /></label><button className={`${primary} w-full`} disabled={Boolean(busy) || !editing.title.trim() || !editing.body.trim()} onClick={() => void run(`save-${editing.id}`, { action: "save_content", content: editing }, "Đã lưu phiên bản nội dung mới.").then(() => setEditing(null))}>{busy === `save-${editing.id}` ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu và đưa về chờ duyệt</button></div></div></div>}
  </div>;
}

function MembersView({ data, busy, isAdmin, run }: { data: Dashboard; busy: string; isAdmin: boolean; run: (key: string, payload: Record<string, unknown>, success: string) => Promise<void> }) {
  const [groupId, setGroupId] = useState("");
  const [search, setSearch] = useState("");
  const members = useMemo(() => data.members.filter(member => (!groupId || member.groupId === groupId) && (!search || `${member.name} ${member.userId}`.toLowerCase().includes(search.toLowerCase()))), [data.members, groupId, search]);
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Users} label="Đang trong nhóm" value={data.stats.members} hint="Tổng số Zalo báo cáo" tone="blue" /><Metric icon={UserPlus} label="Tham gia 30 ngày" value={data.stats.joined30d} hint="Từ webhook và đối soát" tone="green" /><Metric icon={UserMinus} label="Rời 30 ngày" value={data.stats.left30d} hint={`Tăng ròng ${data.stats.joined30d - data.stats.left30d}`} tone="rose" /></div>
    <section className={`${card} overflow-hidden`}><div className="flex flex-col gap-3 border-b border-[#e7edf4] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-[#172033]">Danh sách thành viên GMF</h2><p className="text-sm text-[#738196]">Snapshot gần nhất từ API thành viên chính thức.</p></div><div className="flex flex-wrap gap-2"><select className={field} value={groupId} onChange={event => setGroupId(event.target.value)}><option value="">Tất cả nhóm</option>{data.groups.map(group => <option key={group.groupId} value={group.groupId}>{group.name}</option>)}</select><input className={field} value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên hoặc UID" />{isAdmin && groupId && <button className={secondary} disabled={Boolean(busy)} onClick={() => void run(`sync-${groupId}`, { action: "sync_members", groupId }, "Đã đối soát thành viên nhóm.")}><RefreshCw size={15} /> Đối soát</button>}</div></div>
      <div className="max-h-[520px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-[#738196]"><tr><th className="px-4 py-3">Thành viên</th><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Tham gia</th><th className="px-4 py-3">Đối soát</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{members.map(member => { const group = data.groups.find(item => item.groupId === member.groupId); return <tr key={`${member.groupId}-${member.userId}`} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-semibold text-blue-700">{member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : member.name.slice(0, 1)}</div><div><div className="font-medium text-[#172033]">{member.name}</div><div className="text-[11px] text-[#94a3b8]">{member.memberType === "oa" ? "Official Account" : member.userId}</div></div></div></td><td className="max-w-56 truncate px-4 py-3 text-[#526173]">{group?.name || member.groupId}</td><td className="px-4 py-3"><StatusPill status={member.status} /></td><td className="px-4 py-3 text-[#738196]">{formatDate(member.joinedAt || member.firstSeenAt)}</td><td className="px-4 py-3 text-[#738196]">{formatDate(member.lastSeenAt)}</td></tr>; })}</tbody></table>{!members.length && <div className="p-10 text-center text-sm text-[#94a3b8]">Không có thành viên phù hợp bộ lọc.</div>}</div>
    </section>
    <section className={`${card} overflow-hidden`}><div className="border-b border-[#e7edf4] p-4"><h2 className="font-semibold text-[#172033]">Biến động thành viên</h2><p className="text-sm text-[#738196]">Webhook Zalo được ưu tiên; đối soát sẽ bổ sung sự kiện bị thiếu.</p></div><div className="divide-y divide-[#edf1f5]">{data.memberEvents.slice(0, 80).map(event => <div key={event.eventKey} className="flex items-center gap-3 px-4 py-3"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${event.eventType === "joined" ? "bg-emerald-50 text-emerald-700" : event.eventType === "left" ? "bg-rose-50 text-rose-700" : event.eventType === "requested" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{event.eventType === "joined" ? <UserPlus size={16} /> : event.eventType === "left" ? <UserMinus size={16} /> : <Check size={16} />}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-[#334155]">{event.memberName} · {event.eventType === "joined" ? "tham gia nhóm" : event.eventType === "left" ? "rời nhóm" : event.eventType === "requested" ? "yêu cầu tham gia" : event.eventType === "approved" ? "được duyệt" : "bị từ chối"}</div><div className="truncate text-xs text-[#94a3b8]">{event.groupName} · nguồn {event.source === "webhook" ? "Webhook" : "Đối soát"}</div></div><time className="text-xs text-[#94a3b8]">{formatDate(event.occurredAt)}</time></div>)}{!data.memberEvents.length && <div className="p-8 text-center text-sm text-[#94a3b8]">Chưa có biến động sau thời điểm bắt đầu đồng bộ.</div>}</div></section>
  </div>;
}

function MemberGrowthReport({ initial }: { initial: MemberReport }) {
  const [report, setReport] = useState(initial);
  const [from, setFrom] = useState(initial.range.from);
  const [to, setTo] = useState(initial.range.to);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const maxDaily = Math.max(1, ...report.daily.flatMap(item => [item.joined, item.left]));

  async function loadRange(nextFrom = from, nextTo = to) {
    if (!nextFrom || !nextTo) return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ from: nextFrom, to: nextTo });
      const response = await fetch(`/api/crm/zalo/gmf?${params}`, { cache: "no-store" });
      const result = await response.json() as Dashboard & { error?: string };
      if (!response.ok) throw new Error(result.error || "Không tải được báo cáo thành viên.");
      setReport(result.memberReport); setFrom(result.memberReport.range.from); setTo(result.memberReport.range.to);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được báo cáo thành viên.");
    } finally { setLoading(false); }
  }

  function usePreset(days: number) {
    const nextFrom = vietnamDateInput(-(days - 1)); const nextTo = vietnamDateInput();
    setFrom(nextFrom); setTo(nextTo); void loadRange(nextFrom, nextTo);
  }

  return <section className={`${card} overflow-hidden`}>
    <div className="flex flex-col gap-4 border-b border-[#e7edf4] bg-[radial-gradient(circle_at_90%_0%,rgba(16,185,129,0.10),transparent_18rem),linear-gradient(135deg,#fff,#f8fffc)] p-5 xl:flex-row xl:items-end xl:justify-between">
      <div><div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Member Growth</div><h2 className="text-lg font-semibold text-[#172033]">Báo cáo thành viên tham gia nhóm</h2><p className="mt-1 text-sm text-[#738196]">Tính theo múi giờ Việt Nam, từ webhook và các lần đối soát GMF.</p></div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex gap-1 rounded-xl border border-[#dbe3ee] bg-white p-1">{[7, 30, 90].map(days => <button key={days} onClick={() => usePreset(days)} disabled={loading} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#526173] hover:bg-amber-50 hover:text-amber-800">{days} ngày</button>)}</div>
        <label className="text-[11px] font-semibold text-[#526173]">Từ ngày<input type="date" className={`${field} mt-1 min-w-40`} value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
        <label className="text-[11px] font-semibold text-[#526173]">Đến ngày<input type="date" className={`${field} mt-1 min-w-40`} value={to} min={from} max={vietnamDateInput()} onChange={event => setTo(event.target.value)} /></label>
        <button className={primary} disabled={loading || !from || !to} onClick={() => void loadRange()}>{loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />} Xem báo cáo</button>
      </div>
    </div>
    {error && <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-6">
      <Metric icon={UserPlus} label="Hôm nay" value={report.todayJoined} hint="Thành viên tham gia" tone="green" />
      <Metric icon={UserPlus} label="Hôm qua" value={report.yesterdayJoined} hint="Thành viên tham gia" tone="blue" />
      <Metric icon={Users} label="7 ngày" value={report.last7DaysJoined} hint="Gồm hôm nay" tone="violet" />
      <Metric icon={UserPlus} label="Tham gia" value={report.selectedJoined} hint={`${formatReportDate(report.range.from)} – ${formatReportDate(report.range.to)}`} tone="green" />
      <Metric icon={UserMinus} label="Rời nhóm" value={report.selectedLeft} hint="Trong khoảng đã chọn" tone="rose" />
      <Metric icon={Activity} label="Tăng ròng" value={report.selectedNet >= 0 ? `+${report.selectedNet}` : report.selectedNet} hint="Tham gia trừ rời" tone="amber" />
    </div>
    <div className="grid border-t border-[#e7edf4] xl:grid-cols-[1.35fr_1fr]">
      <div className="border-b border-[#e7edf4] p-5 xl:border-b-0 xl:border-r">
        <div className="mb-4"><h3 className="font-semibold text-[#172033]">Biến động theo ngày</h3><p className="text-xs text-[#94a3b8]">Thanh xanh là tham gia, thanh đỏ là rời nhóm.</p></div>
        <div className="max-h-[430px] space-y-2 overflow-auto pr-1">{report.daily.map(item => <div key={item.date} className="grid grid-cols-[86px_1fr_42px_42px_50px] items-center gap-2 rounded-xl border border-[#edf1f5] bg-slate-50/60 px-3 py-2 text-xs"><span className="font-medium text-[#526173]">{formatReportDate(item.date).slice(0, 5)}</span><div className="space-y-1"><div className="h-1.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.joined / maxDaily * 100}%` }} /></div><div className="h-1.5 overflow-hidden rounded-full bg-rose-100"><div className="h-full rounded-full bg-rose-400" style={{ width: `${item.left / maxDaily * 100}%` }} /></div></div><strong className="text-right text-emerald-700">+{item.joined}</strong><strong className="text-right text-rose-700">-{item.left}</strong><strong className={`text-right ${item.net >= 0 ? "text-blue-700" : "text-red-700"}`}>{item.net >= 0 ? `+${item.net}` : item.net}</strong></div>)}</div>
      </div>
      <div className="p-5"><div className="mb-4"><h3 className="font-semibold text-[#172033]">Theo từng nhóm</h3><p className="text-xs text-[#94a3b8]">So sánh tăng trưởng trong khoảng đã chọn.</p></div><div className="overflow-auto"><table className="w-full text-left text-sm"><thead className="text-[10px] uppercase tracking-wide text-[#94a3b8]"><tr><th className="pb-3">Nhóm</th><th className="pb-3 text-right">+ Vào</th><th className="pb-3 text-right">- Rời</th><th className="pb-3 text-right">Ròng</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{report.groups.map(group => <tr key={group.groupId}><td className="max-w-52 py-3"><div className="truncate font-medium text-[#334155]">{group.groupName}</div><div className="text-[11px] text-[#94a3b8]">Hiện có {group.totalMember}</div></td><td className="py-3 text-right font-semibold text-emerald-700">+{group.joined}</td><td className="py-3 text-right font-semibold text-rose-700">-{group.left}</td><td className={`py-3 text-right font-bold ${group.net >= 0 ? "text-blue-700" : "text-red-700"}`}>{group.net >= 0 ? `+${group.net}` : group.net}</td></tr>)}</tbody></table>{!report.groups.length && <div className="py-8 text-center text-sm text-[#94a3b8]">Chưa có nhóm GMF.</div>}</div></div>
    </div>
    <div className="border-t border-amber-100 bg-amber-50/70 px-5 py-3 text-xs text-amber-800">Dữ liệu lịch sử chỉ được ghi nhận từ thời điểm SmartFurni bật webhook hoặc bắt đầu đối soát GMF; thành viên có trước thời điểm đó không được tính là lượt tham gia mới.</div>
  </section>;
}

function ReportsView({ data, busy, isAdmin, run }: { data: Dashboard; busy: string; isAdmin: boolean; run: (key: string, payload: Record<string, unknown>, success: string) => Promise<void> }) {
  const [settings, setSettings] = useState(data.settings);
  useEffect(() => setSettings(data.settings), [data.settings]);
  return <div className="space-y-4">
    <MemberGrowthReport initial={data.memberReport} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric icon={Send} label="Đã gửi 30 ngày" value={data.stats.sent30d} hint="OpenAPI xác nhận" tone="green" /><Metric icon={AlertTriangle} label="Gửi lỗi 30 ngày" value={data.stats.failed30d} hint="Có thể thử lại" tone="rose" /><Metric icon={CalendarClock} label="Đã xếp lịch" value={data.stats.scheduled} hint="Đang chờ worker" tone="amber" /><Metric icon={UserPlus} label="Tăng ròng" value={data.stats.joined30d - data.stats.left30d} hint="30 ngày gần nhất" tone="violet" /><Metric icon={Activity} label="Nhóm hoạt động" value={`${data.stats.activeGroups}/${data.stats.groups}`} hint="Theo trạng thái Zalo" tone="blue" /></div>
    <section className={`${card} overflow-hidden`}><div className="border-b border-[#e7edf4] p-4"><h2 className="font-semibold text-[#172033]">Hiệu quả theo nhóm</h2></div><div className="overflow-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#738196]"><tr><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">Loại</th><th className="px-4 py-3">Thành viên</th><th className="px-4 py-3">+ 7 ngày</th><th className="px-4 py-3">- 7 ngày</th><th className="px-4 py-3">Bài chờ</th><th className="px-4 py-3">Bài gần nhất</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{data.groups.map(group => <tr key={group.groupId}><td className="px-4 py-3 font-medium text-[#172033]">{group.name}</td><td className="px-4 py-3 uppercase text-violet-700">{group.assetType}</td><td className="px-4 py-3">{group.totalMember}/{group.maxMember || "—"}</td><td className="px-4 py-3 text-emerald-700">+{group.joined7d}</td><td className="px-4 py-3 text-rose-700">-{group.left7d}</td><td className="px-4 py-3">{group.pendingPosts}</td><td className="px-4 py-3 text-[#738196]">{formatDate(group.lastPostAt)}</td></tr>)}</tbody></table></div></section>
    <section className={`${card} overflow-hidden`}><div className="border-b border-[#e7edf4] p-4"><h2 className="font-semibold text-[#172033]">Lịch đăng và kết quả gửi</h2></div><div className="max-h-[460px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-[#738196]"><tr><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{data.schedules.map(item => <tr key={item.id}><td className="max-w-72 px-4 py-3"><div className="truncate font-medium text-[#172033]">{item.contentTitle}</div>{item.error && <div className="mt-1 line-clamp-2 text-xs text-red-600">{item.error}</div>}{item.messageId && <div className="mt-1 text-[11px] text-[#94a3b8]">Message ID: {item.messageId}</div>}</td><td className="px-4 py-3 text-[#526173]">{item.groupName}</td><td className="px-4 py-3 text-[#738196]">{formatDate(item.nextAttemptAt || item.scheduledAt)}</td><td className="px-4 py-3"><StatusPill status={item.status} /></td><td className="px-4 py-3">{isAdmin && item.status === "failed" && <button className={secondary} disabled={Boolean(busy)} onClick={() => void run(`retry-${item.id}`, { action: "retry_schedule", id: item.id }, "Đã đưa bài lỗi trở lại hàng đợi.")}><RotateCcw size={14} /> Thử lại</button>}{isAdmin && item.status === "pending" && <button className={secondary} disabled={Boolean(busy)} onClick={() => void run(`cancel-${item.id}`, { action: "cancel_schedule", id: item.id }, "Đã hủy lịch đăng.")}><XCircle size={14} /> Hủy</button>}</td></tr>)}</tbody></table>{!data.schedules.length && <div className="p-8 text-center text-sm text-[#94a3b8]">Chưa có lịch đăng GMF.</div>}</div></section>
    {isAdmin && <section className={`${card} overflow-hidden`}><div className="flex items-center gap-3 border-b border-[#e7edf4] bg-[linear-gradient(135deg,#fff,#fffaf0)] p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Settings2 size={19} /></div><div><h2 className="font-semibold text-[#172033]">Cổng an toàn GMF</h2><p className="text-sm text-[#738196]">Giới hạn này được kiểm tra lại tại worker, kể cả khi Railway khởi động lại.</p></div></div><div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-semibold text-[#526173]">Giờ bắt đầu<input type="time" className={`${field} mt-1.5`} value={settings.businessHoursStart} onChange={event => setSettings(value => ({ ...value, businessHoursStart: event.target.value }))} /></label><label className="text-xs font-semibold text-[#526173]">Giờ kết thúc<input type="time" className={`${field} mt-1.5`} value={settings.businessHoursEnd} onChange={event => setSettings(value => ({ ...value, businessHoursEnd: event.target.value }))} /></label><label className="text-xs font-semibold text-[#526173]">Tối đa bài/nhóm/ngày<input type="number" min={1} max={20} className={`${field} mt-1.5`} value={settings.maxPostsPerGroupDay} onChange={event => setSettings(value => ({ ...value, maxPostsPerGroupDay: Number(event.target.value) }))} /></label><label className="text-xs font-semibold text-[#526173]">Khoảng cách tối thiểu (phút)<input type="number" min={5} className={`${field} mt-1.5`} value={settings.minPostIntervalMinutes} onChange={event => setSettings(value => ({ ...value, minPostIntervalMinutes: Number(event.target.value) }))} /></label><label className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><input type="checkbox" checked disabled className="h-4 w-4 accent-emerald-600" /> Bắt buộc duyệt trước khi đăng</label><label className="flex items-center gap-3 rounded-xl border border-[#dbe3ee] bg-slate-50 p-3 text-sm font-medium text-[#334155]"><input type="checkbox" checked={settings.paused} onChange={event => setSettings(value => ({ ...value, paused: event.target.checked }))} className="h-4 w-4 accent-[#b98720]" /> Dừng toàn bộ lịch GMF</label><button className={`${primary} sm:col-span-2 xl:col-span-2`} disabled={Boolean(busy)} onClick={() => void run("save-settings", { action: "save_settings", settings: { ...settings, requireApproval: true } }, "Đã lưu cổng an toàn GMF.")}>{busy === "save-settings" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu cấu hình vận hành</button></div></section>}
  </div>;
}
