"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2,
  ChevronRight, Clock3, Download, Filter, Mail, MessageCircle,
  MousePointerClick, RefreshCw, Send, Target, TrendingUp, UserCheck,
  Users, Wallet, X,
} from "lucide-react";
import type {
  JourneyEnrollmentTimeline,
  JourneyReportFilters,
  JourneyReportSummary,
  JourneyWorkflowReport,
} from "@/lib/crm-journey-report-types";

const CHANNEL_LABELS: Record<string, string> = {
  zalo_personal: "Zalo cá nhân",
  zalo_oa: "Zalo OA",
  email: "Email",
  crm: "CRM",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  sent: "Đã gửi",
  pending: "Chờ gửi",
  waiting_content: "Chờ dữ liệu",
  delivery_unknown: "Cần đối soát",
  bounced: "Email bị trả lại",
  complained: "Báo spam",
  failed: "Thất bại",
  skipped: "Bỏ qua",
};

function localDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function initialFilters(): JourneyReportFilters {
  const today = new Date();
  return {
    from: localDay(addDays(today, -29)),
    to: localDay(today),
    journeyCode: "",
    channel: "",
    source: "",
    assignedTo: "",
  };
}

function buildQuery(filters: JourneyReportFilters, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function formatCurrency(value: number): string {
  if (!value) return "0 ₫";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  return `${formatNumber(value)} ₫`;
}

function formatDate(value: string | null, includeTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function toneForStatus(status: string): string {
  if (["sent", "completed", "won", "recorded"].includes(status)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["failed", "cancelled", "lost", "bounced", "complained"].includes(status)) return "bg-red-50 text-red-700 border-red-200";
  if (["waiting_content", "paused", "delivery_unknown"].includes(status)) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function KpiCard({ icon: Icon, label, value, note, tone = "blue" }: {
  icon: React.ElementType;
  label: string;
  value: string;
  note: string;
  tone?: "blue" | "green" | "violet" | "amber" | "rose" | "slate";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
  };
  const compactValue = value.length > 10;
  return (
    <div className="self-start rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase leading-4 tracking-wide text-slate-500">{label}</p>
          <p className={`mt-0.5 font-bold text-slate-900 ${compactValue ? "text-base leading-5" : "text-xl leading-6"}`}>{value}</p>
        </div>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${colors[tone]}`}><Icon size={15} /></span>
      </div>
      <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{note}</p>
    </div>
  );
}

function TrendChart({ report }: { report: JourneyWorkflowReport }) {
  const data = report.daily;
  const width = 920;
  const height = 230;
  const padX = 34;
  const padTop = 18;
  const padBottom = 38;
  const plotHeight = height - padTop - padBottom;
  const maxValue = Math.max(1, ...data.flatMap(row => [row.enrolled, row.sent, row.responses, row.won]));
  const x = (index: number) => data.length <= 1 ? width / 2 : padX + index * ((width - padX * 2) / (data.length - 1));
  const y = (value: number) => padTop + plotHeight - (value / maxValue) * plotHeight;
  const points = (key: "sent" | "responses" | "won") => data.map((row, index) => `${x(index)},${y(row[key])}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px] w-full" role="img" aria-label="Xu hướng gửi, phản hồi và chốt theo ngày">
        {[0, .25, .5, .75, 1].map(ratio => (
          <g key={ratio}>
            <line x1={padX} y1={padTop + plotHeight * ratio} x2={width - padX} y2={padTop + plotHeight * ratio} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={4} y={padTop + plotHeight * ratio + 4} fontSize="10" fill="#94a3b8">{Math.round(maxValue * (1 - ratio))}</text>
          </g>
        ))}
        {data.map((row, index) => {
          const barWidth = Math.max(3, Math.min(12, (width - padX * 2) / Math.max(data.length, 1) * .42));
          return <rect key={row.date} x={x(index) - barWidth / 2} y={y(row.enrolled)} width={barWidth} height={padTop + plotHeight - y(row.enrolled)} rx="2" fill="#bfdbfe" />;
        })}
        <polyline points={points("sent")} fill="none" stroke="#0068ff" strokeWidth="3" strokeLinejoin="round" />
        <polyline points={points("responses")} fill="none" stroke="#10b981" strokeWidth="3" strokeLinejoin="round" />
        <polyline points={points("won")} fill="none" stroke="#d97706" strokeWidth="3" strokeLinejoin="round" />
        {data.map((row, index) => index % labelEvery === 0 || index === data.length - 1 ? (
          <text key={`label-${row.date}`} x={x(index)} y={height - 13} textAnchor="middle" fontSize="10" fill="#64748b">{row.date.slice(5)}</text>
        ) : null)}
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-4 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-blue-200" /> Lead tham gia</span>
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-[#0068ff]" /> Đã gửi</span>
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-emerald-500" /> Phản hồi</span>
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-amber-600" /> Chốt</span>
      </div>
    </div>
  );
}

function Funnel({ report }: { report: JourneyWorkflowReport }) {
  const maximum = Math.max(1, report.funnel[0]?.count || 0);
  return (
    <div className="space-y-3">
      {report.funnel.map((row, index) => (
        <div key={row.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">{index + 1}. {row.label}</span>
            <span className="text-slate-500"><strong className="text-slate-900">{formatNumber(row.count)}</strong> · {row.rateFromPrevious}% từ bước trước</span>
          </div>
          <div className="h-8 overflow-hidden rounded-lg bg-slate-100">
            <div className="flex h-full min-w-[3rem] items-center justify-end rounded-lg bg-gradient-to-r from-[#77b4ff] to-[#0068ff] px-2 text-[10px] font-bold text-white transition-all"
              style={{ width: `${Math.max(4, (row.count / maximum) * 100)}%` }}>
              {row.rateFromEnrolled}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCards({ summary }: { summary: JourneyReportSummary }) {
  return (
    <div className="grid grid-cols-2 items-start gap-2.5 lg:grid-cols-5 2xl:grid-cols-10">
      <KpiCard icon={Target} label="Đủ điều kiện hiện tại" value={formatNumber(summary.eligibleNow)} note="Theo dữ liệu lead hiện có" tone="slate" />
      <KpiCard icon={Users} label="Đã tham gia" value={formatNumber(summary.enrolled)} note={`${summary.active} đang chạy · ${summary.paused} tạm dừng`} />
      <KpiCard icon={Send} label="Tỷ lệ gửi" value={`${summary.sendSuccessRate}%`} note={`${summary.sentActions}/${summary.dueActions} action đến hạn`} tone="violet" />
      <KpiCard icon={MessageCircle} label="Tỷ lệ phản hồi" value={`${summary.responseRate}%`} note={`${summary.responded}/${summary.contacted} lead đã tiếp cận`} tone="green" />
      <KpiCard icon={UserCheck} label="Tỷ lệ mở Email" value={`${summary.openRate}%`} note={`${summary.openedMessages} lượt mở ghi nhận`} tone="violet" />
      <KpiCard icon={MousePointerClick} label="Tỷ lệ click link" value={`${summary.clickRate}%`} note={`${summary.clickedMessages}/${summary.clickTrackedSentMessages} tin trong khoảng đã chọn`} tone="green" />
      <KpiCard icon={Clock3} label="Phản hồi trung bình" value={summary.averageResponseHours == null ? "—" : `${summary.averageResponseHours} giờ`} note={summary.averageResponseHours == null ? "Chưa đủ dữ liệu phản hồi" : "Từ lần gửi gần nhất"} tone="slate" />
      <KpiCard icon={TrendingUp} label="Đã báo giá" value={`${summary.quoteRate}%`} note={`${summary.quoted} lead có báo giá`} tone="amber" />
      <KpiCard icon={CheckCircle2} label="Tỷ lệ chốt" value={`${summary.winRate}%`} note={`${summary.won} thắng · ${summary.lost} thất bại`} tone="green" />
      <KpiCard icon={Wallet} label="Doanh thu hỗ trợ" value={formatCurrency(summary.assistedRevenue)} note={`Pipeline: ${formatCurrency(summary.pipelineValue)}`} tone="amber" />
    </div>
  );
}

function TimelineDrawer({ timeline, loading, onClose }: {
  timeline: JourneyEnrollmentTimeline | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/30 backdrop-blur-[1px]" onMouseDown={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 p-5 backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#0068ff]">Hành trình khách hàng</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{timeline?.leadName || "Đang tải..."}</h3>
            {timeline && <p className="text-xs text-slate-500">{timeline.company || timeline.leadId} · {STATUS_LABELS[timeline.enrollmentStatus] || timeline.enrollmentStatus}</p>}
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Đóng"><X size={17} /></button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-24 text-sm text-slate-500"><RefreshCw size={17} className="mr-2 animate-spin" />Đang tải timeline...</div>
        ) : timeline ? (
          <div className="p-5">
            <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs">
              <div><span className="text-slate-500">Workflow</span><strong className="mt-1 block text-slate-900">{timeline.journeyCode}</strong></div>
              <div><span className="text-slate-500">Giai đoạn CRM</span><strong className="mt-1 block text-slate-900">{timeline.stage || "—"}</strong></div>
            </div>
            <div className="relative ml-2 border-l border-slate-200 pl-5">
              {timeline.items.map(item => (
                <div key={item.id} className="relative mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <i className="absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 border-white bg-[#0068ff] shadow" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.title}</p>
                      {item.detail && <p className="mt-1 text-[11px] leading-4 text-slate-600">{item.detail}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${toneForStatus(item.status)}`}>{STATUS_LABELS[item.status] || item.status}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                    <span>{formatDate(item.occurredAt, true)}</span>
                    {item.channel && <span>{CHANNEL_LABELS[item.channel] || item.channel}</span>}
                    <span>{item.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="p-8 text-sm text-red-600">Không tải được timeline.</p>}
      </aside>
    </div>
  );
}

export default function WorkflowReportsDashboard() {
  const [filters, setFilters] = useState<JourneyReportFilters>(initialFilters);
  const [report, setReport] = useState<JourneyWorkflowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timeline, setTimeline] = useState<JourneyEnrollmentTimeline | null>(null);

  const load = useCallback(async (nextFilters: JourneyReportFilters) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/crm/automation/reports?${buildQuery(nextFilters)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được báo cáo");
      setReport(data);
      setFilters(data.filters);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được báo cáo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(initialFilters()); }, [load]);

  const applyPreset = (days: number) => {
    const today = new Date();
    const next = { ...filters, from: localDay(addDays(today, -(days - 1))), to: localDay(today) };
    setFilters(next);
    void load(next);
  };

  const openTimeline = async (enrollmentId: string) => {
    setTimelineOpen(true);
    setTimelineLoading(true);
    setTimeline(null);
    try {
      const response = await fetch(`/api/crm/automation/reports?enrollmentId=${encodeURIComponent(enrollmentId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được timeline");
      setTimeline(data);
    } catch {
      setTimeline(null);
    } finally {
      setTimelineLoading(false);
    }
  };

  const csvUrl = useMemo(() => `/api/crm/automation/reports?${buildQuery(filters, { format: "csv" })}`, [filters]);
  const latestOptions = report?.options;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[#0068ff]"><BarChart3 size={20} /><span className="text-[11px] font-bold uppercase tracking-[.16em]">Workflow Intelligence</span></div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Báo cáo hiệu quả chăm sóc tự động</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Theo dõi từ vận hành gửi tin đến phản hồi, báo giá, thương thảo và doanh thu được workflow hỗ trợ.</p>
          </div>
          <div className="flex gap-2">
            <a href={csvUrl} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Download size={14} />Xuất CSV</a>
            <button onClick={() => void load(filters)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-[#0068ff] px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Làm mới</button>
          </div>
        </div>
        <div className="border-t border-blue-100 bg-white/75 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Filter size={12} />Khoảng nhanh</span>
            {[7, 30, 90].map(days => <button key={days} onClick={() => applyPreset(days)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700">{days} ngày</button>)}
            <span className="ml-auto text-[10px] text-slate-400">Cohort được xác định theo ngày lead tham gia workflow</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
            <label className="text-[10px] font-semibold text-slate-500">Từ ngày<input type="date" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700" /></label>
            <label className="text-[10px] font-semibold text-slate-500">Đến ngày<input type="date" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700" /></label>
            <label className="text-[10px] font-semibold text-slate-500">Workflow<select value={filters.journeyCode} onChange={event => setFilters({ ...filters, journeyCode: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700"><option value="">Tất cả workflow</option>{latestOptions?.workflows.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-[10px] font-semibold text-slate-500">Kênh<select value={filters.channel} onChange={event => setFilters({ ...filters, channel: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700"><option value="">Tất cả kênh</option>{latestOptions?.channels.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-[10px] font-semibold text-slate-500">Nguồn lead<select value={filters.source} onChange={event => setFilters({ ...filters, source: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700"><option value="">Tất cả nguồn</option>{latestOptions?.sources.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-[10px] font-semibold text-slate-500">Nhân viên<select value={filters.assignedTo} onChange={event => setFilters({ ...filters, assignedTo: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700"><option value="">Tất cả nhân viên</option>{latestOptions?.assignees.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <button onClick={() => void load(filters)} disabled={loading} className="mt-4 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Áp dụng bộ lọc</button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={16} className="mr-2 inline" />{error}</div>}
      {loading && !report && <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 text-sm text-slate-500"><RefreshCw size={18} className="mr-2 animate-spin" />Đang tổng hợp báo cáo...</div>}

      {report && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] text-slate-500">
            <span>Dữ liệu tạo lúc {formatDate(report.generatedAt, true)} · Action mới nhất {formatDate(report.dataFreshness.lastActionAt, true)}</span>
            <span className="max-w-3xl text-right">{report.dataFreshness.note}</span>
          </div>
          <SummaryCards summary={report.summary} />

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3"><h3 className="text-sm font-bold text-slate-900">Vận hành hợp nhất ngoài Journey</h3><p className="mt-1 text-xs text-slate-500">Gộp quy tắc CRM, SLA, hàng đợi Zalo/Email, nhật ký gửi và click link trong cùng khoảng báo cáo.</p></div><div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">{[["Rule đã chạy",report.operations.genericExecutions],["Rule lỗi",report.operations.genericFailed],["Cảnh báo SLA",report.operations.slaAlerts],["Đang chờ queue",report.operations.queuedPending],["Thông báo gửi",report.operations.notificationSent],["Thông báo lỗi",report.operations.notificationFailed],["Tin có click",report.operations.genericClickedMessages],["Tổng lượt click",report.operations.genericLinkClicks]].map(([label,value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><strong className="block text-lg text-slate-900">{String(value)}</strong>{String(label)}</div>)}</div></section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
              <div className="mb-4"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Activity size={16} className="text-[#0068ff]" />Xu hướng theo ngày</h3><p className="mt-1 text-xs text-slate-500">Lead tham gia, action gửi thành công, phản hồi và chốt trong cohort đã chọn.</p></div>
              <TrendChart report={report} />
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Target size={16} className="text-emerald-600" />Phễu chuyển đổi</h3><p className="mt-1 text-xs text-slate-500">Báo giá gồm lead có quote hoặc đã chuyển sang giai đoạn tương ứng.</p></div>
              <Funnel report={report} />
            </section>
          </div>

          {report.links.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MousePointerClick size={16} className="text-emerald-600" />Link được khách hàng quan tâm</h3><p className="mt-1 text-xs text-slate-500">Theo dõi click từ cả Email và Zalo; link Zalo được rút gọn qua bộ chuyển hướng của CRM.</p></div><div className="max-h-72 overflow-auto divide-y divide-slate-100">{report.links.map((row,index) => <div key={`${row.channel}:${row.url}:${index}`} className="grid gap-2 p-4 text-xs md:grid-cols-[110px_1fr_100px_120px_160px]"><span className="font-semibold text-blue-700">{CHANNEL_LABELS[row.channel] || row.channel}</span><a href={row.url} target="_blank" rel="noreferrer" className="truncate text-slate-700 hover:text-blue-700 hover:underline">{row.url}</a><span><strong>{row.clicks}</strong> click</span><span>{row.uniqueActions} tin</span><span className="text-slate-400">{formatDate(row.lastClickedAt, true)}</span></div>)}</div></section>}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5"><h3 className="text-sm font-bold text-slate-900">So sánh workflow</h3><p className="mt-1 text-xs text-slate-500">Hiệu quả tổng hợp theo từng hành trình và phiên bản đang có dữ liệu.</p></div>
            <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{["Workflow", "Tham gia", "Tiếp cận", "Đã gửi", "Gửi thành công", "Phản hồi", "Tỷ lệ phản hồi", "Chốt", "Doanh thu hỗ trợ"].map(label => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.workflows.map(row => <tr key={row.journeyCode} className="hover:bg-blue-50/30"><td className="px-4 py-3"><strong className="block text-slate-900">{row.journeyName}</strong><span className="text-[9px] text-slate-400">{row.journeyCode}</span></td><td className="px-4 py-3">{row.enrolled}</td><td className="px-4 py-3">{row.contacted}</td><td className="px-4 py-3">{row.sent}</td><td className="px-4 py-3 font-semibold text-blue-700">{row.sendSuccessRate}%</td><td className="px-4 py-3">{row.responded}</td><td className="px-4 py-3 font-semibold text-emerald-700">{row.responseRate}%</td><td className="px-4 py-3">{row.won} <span className="text-slate-400">({row.winRate}%)</span></td><td className="px-4 py-3 font-semibold text-amber-700">{formatCurrency(row.assistedRevenue)}</td></tr>)}</tbody></table></div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4"><h3 className="text-sm font-bold text-slate-900">Hiệu quả theo kênh</h3><p className="mt-1 text-xs text-slate-500">Một action fallback vẫn chỉ tính một nội dung; bảng lần thử phản ánh từng kênh thực tế.</p></div>
              <div className="grid gap-3 md:grid-cols-3">{report.channels.map(row => <div key={row.channel} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><strong className="text-sm text-slate-900">{CHANNEL_LABELS[row.channel] || row.channel}</strong>{row.channel === "email" ? <Mail size={16} className="text-violet-600" /> : <MessageCircle size={16} className="text-blue-600" />}</div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px]"><span className="text-slate-500">Đã thử<strong className="block text-base text-slate-900">{row.attempted}</strong></span><span className="text-slate-500">Thành công<strong className="block text-base text-emerald-700">{row.successRate}%</strong></span><span className="text-slate-500">Phản hồi<strong className="block text-base text-blue-700">{row.responses}</strong></span><span className="text-slate-500">Fallback<strong className="block text-base text-amber-700">{row.fallbackSent}</strong></span></div>{row.channel === "email" && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-200 pt-2 text-[10px] text-slate-500"><span>Đã giao {row.delivered}</span><span className="text-red-600">Bounce {row.bounced}</span><span className="text-rose-600">Spam {row.complained}</span><span className="flex items-center gap-1"><UserCheck size={11} />Mở (ước tính) {row.opened}</span><span className="flex items-center gap-1"><MousePointerClick size={11} />Click {row.clicked}</span></div>}</div>)}</div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><AlertTriangle size={16} className="text-amber-600" />Sức khỏe vận hành</h3>
              <div className="mt-4 space-y-3">{[
                ["Đang chờ dữ liệu", report.summary.waitingContent, "text-amber-700 bg-amber-50"],
                ["Cần đối soát", report.summary.deliveryUnknown, "text-rose-700 bg-rose-50"],
                ["Gửi thất bại", report.summary.failedActions, "text-red-700 bg-red-50"],
                ["Email bị trả lại", report.summary.bouncedEmails, "text-red-700 bg-red-50"],
                ["Email bị báo spam", report.summary.complainedEmails, "text-rose-700 bg-rose-50"],
                ["Đã dùng fallback", report.summary.fallbackActions, "text-blue-700 bg-blue-50"],
                ["Dừng liên hệ", report.summary.unsubscribed, "text-slate-700 bg-slate-100"],
              ].map(([label, value, tone]) => <div key={String(label)} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs ${tone}`}><span>{String(label)}</span><strong>{String(value)}</strong></div>)}</div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5"><h3 className="text-sm font-bold text-slate-900">Hiệu quả từng bước nội dung</h3><p className="mt-1 text-xs text-slate-500">Dùng bảng này để xác định bước cần giữ, sửa nội dung/media hoặc bổ sung dữ liệu CRM.</p></div>
            <div className="max-h-[620px] overflow-auto"><table className="min-w-[1180px] w-full text-left text-xs"><thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{["Ngày / bước", "Mục tiêu", "Đến hạn", "Đã gửi", "Thành công", "Fallback", "Phản hồi", "Mở", "Click", "Tiến giai đoạn", "Chờ dữ liệu", "Lỗi"].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.steps.map(row => <tr key={`${row.journeyCode}:${row.stepId}`} className="hover:bg-blue-50/30"><td className="px-3 py-3"><strong className="block text-slate-900">Ngày {row.dayOffset} · {row.title}</strong><span className="text-[9px] text-slate-400">{row.stepId}</span></td><td className="max-w-[260px] px-3 py-3 text-[11px] leading-4 text-slate-500">{row.objective}</td><td className="px-3 py-3">{row.due}</td><td className="px-3 py-3">{row.sent}</td><td className="px-3 py-3 font-semibold text-blue-700">{row.successRate}%</td><td className="px-3 py-3">{row.fallbackSent}</td><td className="px-3 py-3 font-semibold text-emerald-700">{row.responses} <span className="font-normal text-slate-400">({row.responseRate}%)</span></td><td className="px-3 py-3">{row.opened}</td><td className="px-3 py-3">{row.clicked}</td><td className="px-3 py-3">{row.stageAdvanced}</td><td className="px-3 py-3 text-amber-700">{row.waitingContent}</td><td className="px-3 py-3 text-red-700">{row.failed + row.deliveryUnknown}</td></tr>)}</tbody></table></div>
          </section>

          {report.failures.length > 0 && <section className="rounded-2xl border border-red-200 bg-white shadow-sm"><div className="border-b border-red-100 bg-red-50/60 p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-red-900"><AlertTriangle size={16} />Lỗi cần xử lý</h3><p className="mt-1 text-xs text-red-700/70">Đã nhóm theo trạng thái, kênh và thông báo lỗi.</p></div><div className="divide-y divide-slate-100">{report.failures.map((row, index) => <div key={`${row.status}:${row.channel}:${index}`} className="grid gap-2 p-4 text-xs md:grid-cols-[130px_130px_1fr_80px_150px]"><span className={`w-fit rounded-full border px-2 py-1 text-[10px] ${toneForStatus(row.status)}`}>{STATUS_LABELS[row.status] || row.status}</span><span className="font-medium text-slate-700">{CHANNEL_LABELS[row.channel] || row.channel}</span><span className="break-words text-slate-600">{row.error}</span><strong className="text-red-700">{row.count} lần</strong><span className="text-slate-400">{formatDate(row.lastOccurredAt, true)}</span></div>)}</div></section>}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5"><div><h3 className="text-sm font-bold text-slate-900">Lead trong báo cáo</h3><p className="mt-1 text-xs text-slate-500">Bấm một khách hàng để xem toàn bộ timeline gửi, phản hồi và thay đổi CRM.</p></div><span className="text-xs text-slate-500">{report.leads.length} lead hiển thị</span></div>
            <div className="max-h-[620px] overflow-auto"><table className="min-w-[1080px] w-full text-left text-xs"><thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>{["Khách hàng", "Workflow", "Nguồn / nhân viên", "Giai đoạn", "Trạng thái", "Tiến độ gửi", "Phản hồi", "Giá trị", "Cập nhật"].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.leads.map(row => <tr key={row.enrollmentId} onClick={() => void openTimeline(row.enrollmentId)} className="cursor-pointer hover:bg-blue-50/40"><td className="px-4 py-3"><strong className="block text-slate-900">{row.leadName}</strong><span className="text-[10px] text-slate-400">{row.company || row.leadId}</span></td><td className="px-4 py-3 text-[10px] text-slate-500">{row.journeyCode.includes("B2C_SOFA") ? "Khách lẻ · Sofa" : row.journeyCode.includes("B2C") ? "Khách lẻ · Giường" : "B2B Sofa"}</td><td className="px-4 py-3"><span className="block text-slate-700">{row.source || "—"}</span><span className="text-[10px] text-slate-400">{row.assignedTo || "Chưa phân công"}</span></td><td className="px-4 py-3 font-medium text-slate-700">{row.stage || "—"}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] ${toneForStatus(row.enrollmentStatus)}`}>{STATUS_LABELS[row.enrollmentStatus] || row.enrollmentStatus}</span></td><td className="px-4 py-3"><strong>{row.sentSteps}/{row.dueSteps}</strong><span className="ml-1 text-slate-400">bước</span></td><td className="px-4 py-3">{row.responded ? <span className="font-semibold text-emerald-700">Có</span> : <span className="text-slate-400">Chưa</span>}</td><td className="px-4 py-3 font-medium text-amber-700">{formatCurrency(row.expectedValue)}</td><td className="px-4 py-3"><span className="text-slate-500">{formatDate(row.lastOutboundAt, true)}</span><ChevronRight size={14} className="ml-2 inline text-slate-300" /></td></tr>)}</tbody></table></div>
          </section>
        </>
      )}

      {timelineOpen && <TimelineDrawer timeline={timeline} loading={timelineLoading} onClose={() => setTimelineOpen(false)} />}
    </div>
  );
}
