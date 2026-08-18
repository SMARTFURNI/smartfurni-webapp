"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, CalendarClock, CheckCircle2, Download, Eye,
  Filter, Mail, MessageCircle, RefreshCw, Search, X,
} from "lucide-react";
import type {
  UpcomingAutomationFilters,
  UpcomingAutomationItem,
  UpcomingAutomationReadiness,
  UpcomingAutomationReport,
} from "@/lib/crm-upcoming-automation-types";

const CHANNEL_LABELS: Record<string, string> = {
  zalo_personal: "Zalo cá nhân",
  zalo_oa: "Zalo OA",
  email: "Email",
};

const READINESS_LABELS: Record<UpcomingAutomationReadiness, string> = {
  ready: "Sẵn sàng",
  deferred: "Đã dời lịch",
  retrying: "Đang thử lại",
  processing: "Đang xử lý",
  waiting_content: "Thiếu nội dung",
  paused: "Workflow tạm dừng",
  missing_recipient: "Thiếu người nhận",
};

const READINESS_TONES: Record<UpcomingAutomationReadiness, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  deferred: "border-blue-200 bg-blue-50 text-blue-700",
  retrying: "border-amber-200 bg-amber-50 text-amber-700",
  processing: "border-violet-200 bg-violet-50 text-violet-700",
  waiting_content: "border-orange-200 bg-orange-50 text-orange-700",
  paused: "border-slate-200 bg-slate-100 text-slate-700",
  missing_recipient: "border-red-200 bg-red-50 text-red-700",
};

function localDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function datePlus(days: number): string {
  const date = new Date(`${localDay(new Date())}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return localDay(date);
}

function initialFilters(): UpcomingAutomationFilters {
  const today = localDay(new Date());
  return { from: today, to: today, journeyCode: "", channel: "", readiness: "", source: "", assignedTo: "", search: "" };
}

function queryString(filters: UpcomingAutomationFilters, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) if (value) params.set(key, value);
  return params.toString();
}

function formatDateTime(value: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", weekday: "short", day: "2-digit", month: "2-digit",
  }).format(new Date(`${value}T12:00:00+07:00`));
}

function channelTone(channel: string): string {
  if (channel === "email") return "border-violet-200 bg-violet-50 text-violet-700";
  if (channel === "zalo_oa") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function Kpi({ label, value, note, tone = "blue" }: { label: string; value: number; note: string; tone?: "blue" | "green" | "amber" | "violet" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value.toLocaleString("vi-VN")}</p></div>
        <span className={`grid h-8 w-8 place-items-center rounded-lg border text-xs font-bold ${colors[tone]}`}>{value > 99 ? "99+" : value}</span>
      </div>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{note}</p>
    </div>
  );
}

function ReadinessBadge({ status }: { status: UpcomingAutomationReadiness }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold ${READINESS_TONES[status]}`}>{READINESS_LABELS[status]}</span>;
}

function PreviewDrawer({ item, onClose }: { item: UpcomingAutomationItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/45" role="dialog" aria-modal="true" aria-label="Xem trước tin sắp gửi">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Đóng" />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-blue-600">Xem trước lịch gửi</p><h3 className="mt-1 text-lg font-bold text-slate-900">{item.leadName}</h3><p className="text-xs text-slate-500">{formatDateTime(item.effectiveSendAt)} · {CHANNEL_LABELS[item.channel]}</p></div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={17} /></button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-wrap gap-2"><ReadinessBadge status={item.readiness} /><span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${channelTone(item.channel)}`}>{CHANNEL_LABELS[item.channel]}</span></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2">
              <dt className="text-slate-500">Workflow</dt><dd className="font-semibold text-slate-800">{item.journeyName}</dd>
              <dt className="text-slate-500">Bước</dt><dd className="text-slate-800">{item.stepTitle}{item.dayOffset == null ? "" : ` · Ngày ${item.dayOffset}`}</dd>
              <dt className="text-slate-500">Người nhận</dt><dd className="break-all text-slate-800">{item.recipient || "Chưa có"}</dd>
              <dt className="text-slate-500">Nhân viên</dt><dd className="text-slate-800">{item.assignedTo || "Chưa phân công"}</dd>
              <dt className="text-slate-500">Trạng thái</dt><dd className="text-slate-800">{item.readinessReason}</dd>
              {item.nextAttemptAt && <><dt className="text-slate-500">Lịch ban đầu</dt><dd className="text-slate-800">{formatDateTime(item.scheduledAt)}</dd></>}
            </dl>
          </div>
          {item.subject && <section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tiêu đề</h4><div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900">{item.subject}</div></section>}
          <section><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung sẽ gửi</h4><div className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{item.message || "Chưa có nội dung xem trước."}</div></section>
          {item.fallbackChannels.length > 0 && <p className="text-xs text-slate-500">Kênh dự phòng: {item.fallbackChannels.map(value => CHANNEL_LABELS[value]).join(" → ")}</p>}
        </div>
        <footer className="border-t border-slate-200 p-4 sm:px-6"><Link href={`/crm/leads/${item.leadId}`} className="inline-flex w-full items-center justify-center rounded-xl bg-[#0068ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Mở hồ sơ khách hàng</Link></footer>
      </aside>
    </div>
  );
}

export default function UpcomingAutomationDashboard() {
  const [filters, setFilters] = useState<UpcomingAutomationFilters>(() => initialFilters());
  const [report, setReport] = useState<UpcomingAutomationReport | null>(null);
  const [selected, setSelected] = useState<UpcomingAutomationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (next: UpcomingAutomationFilters) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/crm/automation/upcoming?${queryString(next)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được lịch sắp gửi");
      setReport(payload);
      setFilters(payload.filters);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được lịch sắp gửi");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(initialFilters()); }, []);

  const quickRange = (fromOffset: number, toOffset: number) => {
    const next = { ...filters, from: datePlus(fromOffset), to: datePlus(toOffset) };
    setFilters(next); void load(next);
  };

  const maxDaily = useMemo(() => Math.max(1, ...(report?.daily.map(item => item.total) || [1])), [report]);
  const exportUrl = `/api/crm/automation/upcoming?${queryString(filters, { format: "csv" })}`;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0068ff] text-white"><CalendarClock size={20} /></span><div><h2 className="text-lg font-bold text-slate-900">Lịch sắp gửi</h2><p className="mt-0.5 text-xs leading-5 text-slate-600">Tất cả tin Zalo và Email chuẩn bị gửi, tính theo thời điểm gửi thực tế tại Việt Nam.</p></div></div>
          <div className="flex gap-2"><a href={exportUrl} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700"><Download size={14} /> Xuất CSV</a><button onClick={() => void load(filters)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#0068ff] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới</button></div>
        </div>

        <div className="border-t border-blue-100 p-4 sm:p-5">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => quickRange(0, 0)} className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Hôm nay</button>
            <button onClick={() => quickRange(1, 1)} className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Ngày mai</button>
            {[7, 14, 30].map(days => <button key={days} onClick={() => quickRange(0, days - 1)} className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">{days} ngày tới</button>)}
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            <label className="text-[11px] font-semibold text-slate-600">Từ ngày<input type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-400" /></label>
            <label className="text-[11px] font-semibold text-slate-600">Đến ngày<input type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-400" /></label>
            <label className="text-[11px] font-semibold text-slate-600">Workflow<select value={filters.journeyCode} onChange={event => setFilters({ ...filters, journeyCode: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"><option value="">Tất cả workflow</option>{report?.options.workflows.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-slate-600">Kênh<select value={filters.channel} onChange={event => setFilters({ ...filters, channel: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"><option value="">Tất cả kênh</option>{report?.options.channels.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-slate-600">Sẵn sàng<select value={filters.readiness} onChange={event => setFilters({ ...filters, readiness: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"><option value="">Tất cả trạng thái</option>{report?.options.readiness.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-slate-600">Nhân viên<select value={filters.assignedTo} onChange={event => setFilters({ ...filters, assignedTo: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"><option value="">Tất cả nhân viên</option>{report?.options.assignees.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-[11px] font-semibold text-slate-600">Nguồn lead<select value={filters.source} onChange={event => setFilters({ ...filters, source: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"><option value="">Tất cả nguồn</option>{report?.options.sources.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-600">Tìm kiếm<span className="relative mt-1 block"><Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" /><input value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} onKeyDown={event => { if (event.key === "Enter") void load(filters); }} placeholder="Tên, SĐT, nội dung..." className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-xs text-slate-800" /></span></label><button onClick={() => void load(filters)} className="grid h-[34px] w-10 place-items-center rounded-lg bg-slate-900 text-white" title="Áp dụng bộ lọc"><Filter size={14} /></button></div>
          </div>
        </div>
      </section>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}

      {report && <>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 2xl:grid-cols-7">
          <Kpi label="Tin sắp gửi" value={report.summary.total} note="Trong khoảng ngày đã chọn" />
          <Kpi label="Khách hàng" value={report.summary.uniqueLeads} note="Không tính trùng khách" tone="violet" />
          <Kpi label="Sẵn sàng" value={report.summary.ready} note="Đủ nội dung và người nhận" tone="green" />
          <Kpi label="Cần chú ý" value={report.summary.attention} note="Dời lịch, thiếu dữ liệu hoặc đang xử lý" tone="amber" />
          <Kpi label="Zalo cá nhân" value={report.summary.channels.zalo_personal} note="Kênh chính dự kiến" />
          <Kpi label="Zalo OA" value={report.summary.channels.zalo_oa} note="Kênh OA dự kiến" tone="green" />
          <Kpi label="Email" value={report.summary.channels.email} note="Email đang chờ gửi" tone="violet" />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Tải gửi theo ngày</h3><p className="mt-0.5 text-[11px] text-slate-500">Mỗi cột gồm Zalo cá nhân, Zalo OA và Email.</p></div><CalendarClock size={18} className="text-blue-600" /></div>
          <div className="overflow-x-auto pb-2"><div className="flex min-w-max items-end gap-2" style={{ height: 190 }}>
            {report.daily.map(row => <div key={row.date} className="flex h-full w-14 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-bold text-slate-700">{row.total}</span>
              <div className="flex w-8 flex-col-reverse overflow-hidden rounded-t bg-slate-100" style={{ height: `${Math.max(row.total ? 12 : 2, (row.total / maxDaily) * 135)}px` }} title={`${row.total} tin`}>
                {row.total > 0 && <><i className="block bg-blue-500" style={{ height: `${(row.channels.zalo_personal / row.total) * 100}%` }} /><i className="block bg-cyan-400" style={{ height: `${(row.channels.zalo_oa / row.total) * 100}%` }} /><i className="block bg-violet-500" style={{ height: `${(row.channels.email / row.total) * 100}%` }} /></>}
              </div>
              <span className="whitespace-nowrap text-[9px] text-slate-500">{formatDay(row.date).replace("Th ", "T")}</span>
            </div>)}
          </div></div>
          <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-slate-600"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-blue-500" />Zalo cá nhân</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-cyan-400" />Zalo OA</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-violet-500" />Email</span></div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5"><div><h3 className="text-sm font-bold text-slate-900">Chi tiết từng lượt gửi</h3><p className="mt-1 text-[11px] text-slate-500">Bấm vào một dòng để xem đầy đủ nội dung và lý do trạng thái.</p></div><p className="text-[10px] text-slate-400">Cập nhật: {report.dataFreshness.lastUpdatedAt ? formatDateTime(report.dataFreshness.lastUpdatedAt) : "Chưa có dữ liệu"}</p></div>
          {report.items.length === 0 ? <div className="grid min-h-52 place-items-center p-6 text-center"><div><CheckCircle2 size={30} className="mx-auto text-emerald-500" /><h4 className="mt-3 text-sm font-bold text-slate-800">Không có tin sắp gửi</h4><p className="mt-1 text-xs text-slate-500">Thử chọn khoảng ngày dài hơn hoặc bỏ bớt bộ lọc.</p></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1040px] border-collapse text-left">
            <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Workflow / Bước</th><th className="px-4 py-3">Kênh</th><th className="px-4 py-3">Nội dung xem trước</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Phụ trách</th><th className="px-4 py-3" /></tr></thead>
            <tbody>{report.items.map(item => <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer border-t border-slate-100 text-xs hover:bg-blue-50/40"><td className="whitespace-nowrap px-4 py-3"><p className="font-bold text-slate-800">{formatTime(item.effectiveSendAt)}</p><p className="mt-0.5 text-[10px] text-slate-500">{formatDateTime(item.effectiveSendAt).split(" ").slice(0, 1)}</p></td><td className="px-4 py-3"><p className="max-w-44 truncate font-semibold text-slate-900">{item.leadName}</p><p className="mt-0.5 max-w-44 truncate text-[10px] text-slate-500">{item.company || item.recipient || "Chưa có liên hệ"}</p></td><td className="px-4 py-3"><p className="max-w-56 truncate font-semibold text-slate-800">{item.journeyName}</p><p className="mt-0.5 max-w-56 truncate text-[10px] text-slate-500">{item.stepTitle}{item.dayOffset == null ? "" : ` · Ngày ${item.dayOffset}`}</p></td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${channelTone(item.channel)}`}>{item.channel === "email" ? <Mail size={11} /> : <MessageCircle size={11} />}{CHANNEL_LABELS[item.channel]}</span></td><td className="px-4 py-3"><p className="max-w-72 truncate text-slate-600">{item.subject || item.message || "Chưa có nội dung"}</p></td><td className="px-4 py-3"><ReadinessBadge status={item.readiness} /></td><td className="px-4 py-3"><p className="max-w-36 truncate text-slate-700">{item.assignedTo || "Chưa phân công"}</p></td><td className="px-4 py-3"><Eye size={15} className="text-blue-600" /></td></tr>)}</tbody>
          </table></div>}
          <div className="border-t border-slate-100 px-4 py-3 text-[10px] leading-4 text-slate-500">{report.dataFreshness.note}</div>
        </section>
      </>}

      {loading && !report && <div className="grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white"><div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><RefreshCw size={17} className="animate-spin text-blue-600" /> Đang tổng hợp lịch gửi...</div></div>}
      {selected && <PreviewDrawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
