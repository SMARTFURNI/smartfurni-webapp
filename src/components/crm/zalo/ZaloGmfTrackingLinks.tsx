"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3, Check, Copy, ExternalLink, Eye, Link2, Loader2, MousePointerClick,
  Pause, Play, Plus, QrCode, ShieldCheck, UserCheck, UserPlus, Users,
} from "lucide-react";

interface Group { groupId: string; name: string; groupLink: string; status: string }
interface SourceLink {
  id: string; groupId: string; groupName: string; slug: string; sourceName: string; channel: string; campaign: string;
  targetUrl: string; trackingUrl: string; status: "active" | "paused"; expiresAt: string | null; createdAt: string;
  visits: number; uniqueVisitors: number; opens: number; identified: number; requests: number; approved: number; joined: number; left: number; conversionRate: number;
}
interface TrackingReport {
  range: { from: string; to: string };
  summary: { visits: number; uniqueVisitors: number; opens: number; identified: number; requests: number; approved: number; joined: number; left: number; verifiedJoined: number; unattributedJoined: number; conversionRate: number };
  links: SourceLink[];
}
interface ResponseData { groups: Group[]; trackingReport: TrackingReport }
type ReportPreset = "today" | "yesterday" | "7d" | "30d" | "60d" | "custom";

const REPORT_PRESETS: Array<{ id: ReportPreset; label: string; days?: number; offset?: number }> = [
  { id: "today", label: "Hôm nay", days: 1 },
  { id: "yesterday", label: "Hôm qua", days: 1, offset: -1 },
  { id: "7d", label: "7 ngày", days: 7 },
  { id: "30d", label: "30 ngày", days: 30 },
  { id: "60d", label: "60 ngày", days: 60 },
  { id: "custom", label: "Tùy chọn" },
];

const card = "rounded-2xl border border-[#dbe3ee] bg-white shadow-[0_12px_32px_rgba(30,48,72,0.08)]";
const field = "w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#d4af45] focus:ring-4 focus:ring-[#d4af45]/10";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#c99e32] bg-[linear-gradient(135deg,#f1d778_0%,#d4af45_48%,#b98720_100%)] px-4 py-2.5 text-sm font-semibold text-[#241a05] shadow-[0_10px_24px_rgba(166,119,20,0.20)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-[linear-gradient(135deg,#fff,#edf2f7)] px-3 py-2 text-xs font-semibold text-[#334155] transition hover:-translate-y-0.5 disabled:opacity-45";

function vietnamDate(daysFromToday = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + daysFromToday * 86_400_000));
}

function Metric({ icon: Icon, label, value, hint, tone }: { icon: typeof Users; label: string; value: number | string; hint: string; tone: string }) {
  return <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-[0_10px_26px_rgba(30,48,72,0.06)] ${tone}`}><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</div><strong className="mt-2 block text-2xl text-[#172033]">{value}</strong></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 shadow-sm"><Icon size={17} /></div></div><p className="mt-2 text-xs opacity-75">{hint}</p></div>;
}

export default function ZaloGmfTrackingLinks({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [from, setFrom] = useState(vietnamDate(-29));
  const [to, setTo] = useState(vietnamDate());
  const [reportPreset, setReportPreset] = useState<ReportPreset>("30d");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [form, setForm] = useState({ groupId: "", sourceName: "", channel: "", campaign: "", expiresAt: "" });

  const load = useCallback(async (nextFrom: string, nextTo: string, spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const params = new URLSearchParams({ from: nextFrom, to: nextTo });
      const response = await fetch(`/api/crm/zalo/gmf?${params}`, { cache: "no-store" });
      const result = await response.json() as ResponseData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Không tải được báo cáo nguồn.");
      setData(result);
      setFrom(result.trackingReport.range.from);
      setTo(result.trackingReport.range.to);
      setForm(value => ({ ...value, groupId: value.groupId || result.groups.find(group => group.status === "enabled")?.groupId || "" }));
      setNotice("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không tải được báo cáo nguồn."); }
    finally { if (spinner) setLoading(false); }
  }, []);
  useEffect(() => { void load(vietnamDate(-29), vietnamDate()); }, [load]);

  async function action(key: string, payload: Record<string, unknown>, success: string) {
    setBusy(key); setNotice("");
    try {
      const response = await fetch("/api/crm/zalo/gmf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Không xử lý được link nguồn.");
      setNotice(success); await load(from, to, false);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không xử lý được link nguồn."); }
    finally { setBusy(""); }
  }

  async function createLink() {
    await action("create", { action: "save_source_link", ...form }, "Đã tạo link và mã QR theo nguồn.");
    setForm(value => ({ ...value, sourceName: "", channel: "", campaign: "", expiresAt: "" }));
  }

  async function copyLink(link: SourceLink) {
    await navigator.clipboard.writeText(link.trackingUrl);
    setCopied(link.id); setTimeout(() => setCopied(""), 1600);
  }

  function usePreset(nextPreset: ReportPreset, days?: number, offset = 0) {
    setReportPreset(nextPreset);
    if (!days) return;
    const nextTo = vietnamDate(offset);
    const nextFrom = vietnamDate(offset - (days - 1));
    setFrom(nextFrom); setTo(nextTo); void load(nextFrom, nextTo);
  }

  if (loading && !data) return <div className="flex min-h-80 items-center justify-center text-sm text-[#738196]"><Loader2 className="mr-2 animate-spin text-[#9a7418]" /> Đang tải Link & QR...</div>;
  if (!data) return <div className={`${card} p-8 text-center text-sm text-red-600`}>{notice || "Không tải được dữ liệu."}</div>;
  const report = data.trackingReport;
  return <div className="space-y-4">
    {notice && <div className={`rounded-xl border px-4 py-3 text-sm ${/không|lỗi|hợp lệ/i.test(notice) ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice}</div>}
    <section className={`${card} overflow-hidden`}>
      <div className="flex flex-col gap-4 border-b border-[#e7edf4] bg-[radial-gradient(circle_at_90%_0%,rgba(59,130,246,0.12),transparent_20rem),linear-gradient(135deg,#fff,#f7fbff)] p-5 xl:flex-row xl:items-center xl:justify-between">
        <div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Source Attribution</div><h2 className="mt-1 text-lg font-semibold text-[#172033]">Link & QR theo nguồn</h2><p className="mt-1 text-sm text-[#738196]">Mỗi điểm đặt QR hoặc link có tên nguồn riêng; thành viên chỉ được gắn nguồn khi UID Zalo và webhook GMF khớp nhau.</p></div>
        <div className="flex max-w-[760px] flex-col items-stretch gap-2 xl:items-end">
          <div className="flex flex-wrap gap-1 rounded-xl border border-[#dbe3ee] bg-white p-1">
            {REPORT_PRESETS.map(item => <button key={item.id} type="button" disabled={loading} onClick={() => usePreset(item.id, item.days, item.offset)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${reportPreset === item.id ? "bg-[linear-gradient(135deg,#dbeafe,#bfdbfe)] text-blue-800 shadow-sm" : "text-[#526173] hover:bg-blue-50 hover:text-blue-800"}`}>{item.label}</button>)}
          </div>
          {reportPreset === "custom" && <div className="flex flex-wrap items-end justify-end gap-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3">
            <label className="text-[11px] font-semibold text-[#526173]">Từ ngày<input type="date" className={`${field} mt-1 min-w-40`} value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
            <label className="text-[11px] font-semibold text-[#526173]">Đến ngày<input type="date" className={`${field} mt-1 min-w-40`} value={to} min={from} max={vietnamDate()} onChange={event => setTo(event.target.value)} /></label>
            <button className={secondary} disabled={loading || !from || !to} onClick={() => void load(from, to)}>{loading ? <Loader2 size={15} className="animate-spin" /> : <BarChart3 size={15} />} Xem khoảng ngày</button>
          </div>}
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric icon={MousePointerClick} label="Lượt truy cập" value={report.summary.visits} hint={`${report.summary.uniqueVisitors} thiết bị`} tone="from-blue-50 to-white border-blue-200 text-blue-700" />
        <Metric icon={ExternalLink} label="Mở Zalo" value={report.summary.opens} hint="Bấm mở nhóm" tone="from-cyan-50 to-white border-cyan-200 text-cyan-700" />
        <Metric icon={ShieldCheck} label="Xác nhận UID" value={report.summary.identified} hint="Đủ điều kiện đối soát" tone="from-violet-50 to-white border-violet-200 text-violet-700" />
        <Metric icon={UserCheck} label="Đã xác minh" value={report.summary.verifiedJoined} hint="Webhook khớp nguồn" tone="from-emerald-50 to-white border-emerald-200 text-emerald-700" />
        <Metric icon={Users} label="Chưa rõ nguồn" value={report.summary.unattributedJoined} hint="Không tự suy đoán" tone="from-amber-50 to-white border-amber-200 text-amber-700" />
        <Metric icon={BarChart3} label="Chuyển đổi" value={`${report.summary.conversionRate}%`} hint="Đã xác minh / truy cập" tone="from-rose-50 to-white border-rose-200 text-rose-700" />
      </div>
    </section>

    {isAdmin && <section className={`${card} p-5`}><div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Plus size={18} /></div><div><h3 className="font-semibold text-[#172033]">Tạo nguồn mới</h3><p className="text-xs text-[#738196]">Ví dụ: QR showroom Quận 7, Facebook Ads tháng 8, KOL Nguyễn Văn A.</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><label className="text-xs font-semibold text-[#526173]">Nhóm Zalo<select className={`${field} mt-1.5`} value={form.groupId} onChange={event => setForm(value => ({ ...value, groupId: event.target.value }))}><option value="">Chọn nhóm</option>{data.groups.map(group => <option key={group.groupId} value={group.groupId}>{group.name}</option>)}</select></label><label className="text-xs font-semibold text-[#526173]">Tên nguồn *<input className={`${field} mt-1.5`} placeholder="QR showroom Quận 7" value={form.sourceName} onChange={event => setForm(value => ({ ...value, sourceName: event.target.value }))} /></label><label className="text-xs font-semibold text-[#526173]">Kênh<input className={`${field} mt-1.5`} placeholder="Showroom / Facebook" value={form.channel} onChange={event => setForm(value => ({ ...value, channel: event.target.value }))} /></label><label className="text-xs font-semibold text-[#526173]">Chiến dịch<input className={`${field} mt-1.5`} placeholder="Ra mắt GMF100" value={form.campaign} onChange={event => setForm(value => ({ ...value, campaign: event.target.value }))} /></label><label className="text-xs font-semibold text-[#526173]">Hết hạn (tùy chọn)<input type="date" className={`${field} mt-1.5`} min={vietnamDate()} value={form.expiresAt} onChange={event => setForm(value => ({ ...value, expiresAt: event.target.value }))} /></label></div><button className={`${primary} mt-4`} disabled={Boolean(busy) || !form.groupId || form.sourceName.trim().length < 2} onClick={() => void createLink()}>{busy === "create" ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />} Tạo link & QR</button></section>}

    {!report.links.length ? <section className={`${card} flex min-h-56 flex-col items-center justify-center p-8 text-center`}><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><QrCode size={22} /></div><h3 className="mt-4 font-semibold text-[#172033]">Chưa có link nguồn</h3><p className="mt-1 text-sm text-[#738196]">Tạo link đầu tiên để đặt tại quảng cáo, showroom hoặc tài liệu in.</p></section> : <div className="grid gap-4 xl:grid-cols-2">{report.links.map(link => <section key={link.id} className={`${card} overflow-hidden`}><div className="flex gap-4 bg-[linear-gradient(135deg,#fff,#f8fbff)] p-5"><img src={`/api/zalo-group/${encodeURIComponent(link.slug)}/qr`} alt={`QR ${link.sourceName}`} className="h-28 w-28 rounded-2xl border border-[#dbe3ee] bg-white p-2 shadow-sm" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-semibold text-[#172033]">{link.sourceName}</h3><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${link.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{link.status === "active" ? "Hoạt động" : "Tạm dừng"}</span></div><p className="mt-1 text-sm text-[#738196]">{link.groupName}</p><div className="mt-2 flex flex-wrap gap-2">{link.channel && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{link.channel}</span>}{link.campaign && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">{link.campaign}</span>}</div><p className="mt-3 truncate rounded-lg bg-slate-100 px-2.5 py-2 font-mono text-[11px] text-[#526173]">{link.trackingUrl}</p></div></div><div className="grid grid-cols-4 border-y border-[#edf1f5] bg-slate-50/70"><div className="p-3 text-center"><strong className="block text-lg text-blue-700">{link.visits}</strong><span className="text-[10px] text-[#738196]">Truy cập</span></div><div className="p-3 text-center"><strong className="block text-lg text-violet-700">{link.identified}</strong><span className="text-[10px] text-[#738196]">Có UID</span></div><div className="p-3 text-center"><strong className="block text-lg text-emerald-700">{link.joined}</strong><span className="text-[10px] text-[#738196]">Tham gia</span></div><div className="p-3 text-center"><strong className="block text-lg text-amber-700">{link.conversionRate}%</strong><span className="text-[10px] text-[#738196]">Chuyển đổi</span></div></div><div className="flex flex-wrap gap-2 p-4"><button className={secondary} onClick={() => void copyLink(link)}>{copied === link.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} {copied === link.id ? "Đã sao chép" : "Sao chép link"}</button><a className={secondary} href={`/api/zalo-group/${encodeURIComponent(link.slug)}/qr`} download={`QR-${link.slug}.svg`}><QrCode size={14} /> Tải QR</a><a className={secondary} href={link.trackingUrl} target="_blank" rel="noreferrer"><Eye size={14} /> Xem trang</a>{isAdmin && <button className={secondary} disabled={Boolean(busy)} onClick={() => void action(`status-${link.id}`, { action: "set_source_link_status", id: link.id, status: link.status === "active" ? "paused" : "active" }, link.status === "active" ? "Đã tạm dừng link nguồn." : "Đã bật lại link nguồn.")}>{link.status === "active" ? <Pause size={14} /> : <Play size={14} />}{link.status === "active" ? "Tạm dừng" : "Bật lại"}</button>}</div></section>)}</div>}
    <section className={`${card} p-5`}><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Link2 size={18} /></div><div><h3 className="font-semibold text-[#172033]">Nguyên tắc ghi nhận</h3><div className="mt-2 grid gap-2 text-sm leading-6 text-[#64748b] md:grid-cols-3"><p><strong className="text-blue-700">Truy cập:</strong> ghi ngay khi khách mở link hoặc quét QR.</p><p><strong className="text-violet-700">Có UID:</strong> khách đồng ý widget tương tác Zalo trên trang trung gian.</p><p><strong className="text-emerald-700">Đã xác minh:</strong> UID đó xuất hiện trong webhook yêu cầu/duyệt/tham gia đúng nhóm trong 7 ngày.</p></div></div></div></section>
  </div>;
}
