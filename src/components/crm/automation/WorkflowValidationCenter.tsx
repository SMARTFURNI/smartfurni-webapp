"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, ChevronUp,
  FlaskConical, Loader2, Mail, MessageCircle, Play, RefreshCw, Search, ShieldCheck,
  TestTube2, UserRound, XCircle, Zap,
} from "lucide-react";

type WorkflowKey = "b2b_sofa" | "b2c_ergonomic" | "b2c_sofa";
type CheckStatus = "pass" | "warn" | "fail";

interface LeadOption {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  stage: string;
  blocked: boolean;
}

interface ValidationData {
  workflow: {
    key: WorkflowKey;
    code: string;
    name: string;
    enabled: boolean;
    autoEnroll: boolean;
    canaryMode: boolean;
    canaryLeadIds: string[];
  };
  lead: LeadOption | null;
  ready: boolean;
  score: number;
  scheduler: { lastRunAt: string | null; lockedUntil: string | null; isRunning: boolean };
  providers: {
    zaloPersonal: { ready: boolean; accountId: string | null; name: string };
    zaloOa: { ready: boolean; name: string };
    email: { ready: boolean; name: string };
  };
  operations: {
    latestEnrollment: { leadId: string; leadName: string; at: string } | null;
    latestSent: { leadId: string; stepId: string; channel: string | null; at: string } | null;
    latestProblem: { leadId: string; stepId: string; status: string; error: string; at: string } | null;
  };
  checks: Array<{ id: string; label: string; status: CheckStatus; detail: string; blocking: boolean }>;
  timeline: Array<{
    id: string;
    day: number;
    title: string;
    scheduledAt: string;
    primaryChannel: "zalo_personal" | "zalo_oa" | "email";
    fallbackChannels: Array<"zalo_personal" | "zalo_oa" | "email">;
    availableChannels: Array<"zalo_personal" | "zalo_oa" | "email">;
    missingContext: string[];
    missingMedia: string[];
    status: "ready" | "waiting_content" | "no_channel";
  }>;
}

const workflowOptions: Array<{ key: WorkflowKey; label: string; description: string }> = [
  { key: "b2b_sofa", label: "B2B Sofa giường", description: "Chủ đầu tư lưu trú · 90 ngày" },
  { key: "b2c_ergonomic", label: "Khách lẻ Giường công thái học", description: "Khách mua nguyên bộ/khung nâng hạ · 90 ngày" },
  { key: "b2c_sofa", label: "Khách lẻ Sofa Giường", description: "Chỉ Zalo cá nhân · tập trung 14 ngày đầu" },
];

const channelLabel = {
  zalo_personal: "Zalo cá nhân",
  zalo_oa: "Zalo OA",
  email: "Email",
};

function formatDate(value: string | null) {
  if (!value) return "Chưa có dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function statusStyle(status: CheckStatus) {
  if (status === "pass") return { icon: CheckCircle2, bg: "bg-emerald-50", border: "border-emerald-200", color: "text-emerald-700" };
  if (status === "warn") return { icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-200", color: "text-amber-700" };
  return { icon: XCircle, bg: "bg-red-50", border: "border-red-200", color: "text-red-700" };
}

export default function WorkflowValidationCenter() {
  const [workflow, setWorkflow] = useState<WorkflowKey>("b2b_sofa");
  const [data, setData] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "run" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [simulationLeadId, setSimulationLeadId] = useState("");
  const [canaryLeadIds, setCanaryLeadIds] = useState<string[]>([]);
  const [expandedTimeline, setExpandedTimeline] = useState(false);
  const [enrolledAt, setEnrolledAt] = useState(() => new Date().toISOString().slice(0, 16));

  const loadValidation = async (key = workflow, leadId = simulationLeadId, syncCanary = false) => {
    setLoading(true);
    setError("");
    try {
      const requestedDate = new Date(enrolledAt);
      const safeDate = Number.isFinite(requestedDate.getTime()) ? requestedDate : new Date();
      const params = new URLSearchParams({ workflow: key, enrolledAt: safeDate.toISOString() });
      if (leadId) params.set("leadId", leadId);
      const response = await fetch(`/api/crm/automation/validation?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không tải được kết quả kiểm định.");
      setData(payload);
      if (syncCanary) setCanaryLeadIds(payload.workflow.canaryLeadIds || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được kết quả kiểm định.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCanaryLeadIds([]);
    loadValidation(workflow, "", true);
  }, [workflow]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/crm/automation/test-send?search=${encodeURIComponent(search)}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok) setLeadOptions(payload.leads || []);
      } catch { /* Hiển thị danh sách rỗng khi tìm kiếm tạm thời lỗi. */ }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const selectSimulationLead = (lead: LeadOption) => {
    setSimulationLeadId(lead.id);
    if (!canaryLeadIds.includes(lead.id) && canaryLeadIds.length < 3) {
      setCanaryLeadIds(current => [...current, lead.id]);
    }
    loadValidation(workflow, lead.id, false);
  };

  const toggleCanaryLead = (leadId: string) => {
    setCanaryLeadIds(current => current.includes(leadId)
      ? current.filter(id => id !== leadId)
      : current.length < 3 ? [...current, leadId] : current);
  };

  const saveCanary = async (enabled: boolean) => {
    setBusy("save"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/crm/automation/validation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_canary", workflow, enabled, leadIds: canaryLeadIds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không lưu được canary.");
      setData(payload.validation);
      setMessage(enabled
        ? `Đã khóa workflow ở chế độ canary cho ${canaryLeadIds.length} lead.`
        : "Đã tắt canary. Lead đủ điều kiện có thể được tự động thêm ở lần scheduler kế tiếp.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được canary.");
    } finally { setBusy(null); }
  };

  const runCanary = async () => {
    if (!data?.ready) { setError("Preflight còn lỗi chặn. Hãy xử lý các mục màu đỏ trước khi chạy thật."); return; }
    if (!canaryLeadIds.length) { setError("Hãy chọn ít nhất một lead kiểm thử."); return; }
    if (!window.confirm(`Chạy canary sẽ có thể gửi tin thật cho ${canaryLeadIds.length} lead đã chọn. Tiếp tục?`)) return;
    setBusy("run"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/crm/automation/validation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_canary", workflow, leadIds: canaryLeadIds, confirmed: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không chạy được canary.");
      setData(payload.validation);
      setMessage(`Canary hoàn tất: thêm ${payload.result?.autoEnrollment?.enrolled || 0} lead, gửi ${payload.result?.sent || 0}, lỗi ${payload.result?.failed || 0}, cần đối soát ${payload.result?.deliveryUnknown || 0}.`);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Không chạy được canary.");
    } finally { setBusy(null); }
  };

  const selectedLeads = useMemo(() => canaryLeadIds.map(id =>
    leadOptions.find(lead => lead.id === id) || (data?.lead?.id === id ? data.lead : null),
  ).filter(Boolean) as LeadOption[], [canaryLeadIds, leadOptions, data?.lead]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-[#0068ff] to-[#1584ff] p-5 text-white lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/15 p-2.5"><ShieldCheck size={24} /></div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">Workflow Quality Gate</div>
              <h2 className="mt-1 text-xl font-bold">Trung tâm kiểm định workflow</h2>
              <p className="mt-1 max-w-2xl text-xs text-blue-50">Mô phỏng lead và toàn bộ timeline trước khi cho phép gửi thật. Preflight không gửi tin hoặc thay đổi dữ liệu khách hàng.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-center">
              <div className="text-2xl font-black">{data?.score ?? 0}</div><div className="text-[10px] text-blue-100">điểm sẵn sàng</div>
            </div>
            <button onClick={() => loadValidation(workflow, simulationLeadId, false)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#0068ff] disabled:opacity-60">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Kiểm tra lại
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          {workflowOptions.map(option => (
            <button key={option.key} onClick={() => { setWorkflow(option.key); setSimulationLeadId(""); }}
              className={`rounded-xl border p-3 text-left transition ${workflow === option.key ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200" : "border-gray-200 hover:bg-gray-50"}`}>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900"><Zap size={15} className={workflow === option.key ? "text-blue-600" : "text-gray-400"} />{option.label}</div>
              <div className="mt-1 text-xs text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Activity, "Scheduler gần nhất", formatDate(data?.scheduler.lastRunAt || null), data?.scheduler.isRunning ? "Đang thực thi" : "Chu kỳ mặc định 30 phút"],
          [UserRound, "Lead gần nhất tham gia", data?.operations.latestEnrollment?.leadName || "Chưa có", formatDate(data?.operations.latestEnrollment?.at || null)],
          [MessageCircle, "Tin gần nhất đã gửi", data?.operations.latestSent?.stepId || "Chưa có", data?.operations.latestSent ? `${data.operations.latestSent.channel || "kênh gửi"} · ${formatDate(data.operations.latestSent.at)}` : "Chưa ghi nhận"],
          [AlertTriangle, "Sự cố gần nhất", data?.operations.latestProblem?.status || "Không có", data?.operations.latestProblem ? `${data.operations.latestProblem.error || data.operations.latestProblem.stepId} · ${formatDate(data.operations.latestProblem.at)}` : "Không có bước cần xử lý"],
        ].map(([Icon, label, value, note]) => {
          const MetricIcon = Icon as typeof Activity;
          return <div key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-4"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500"><MetricIcon size={14} className="text-blue-600" />{String(label)}</div><div className="mt-2 truncate text-sm font-bold text-gray-900">{String(value)}</div><div className="mt-1 truncate text-[10px] text-gray-500" title={String(note)}>{String(note)}</div></div>;
        })}
      </section>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><XCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      {message && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{message}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1.4fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><TestTube2 size={18} className="text-blue-600" /><div><h3 className="text-sm font-bold text-gray-900">Mô phỏng một lead CRM</h3><p className="text-xs text-gray-500">Không gửi tin, không ghi enrollment.</p></div></div>
          <label className="mb-2 block text-xs font-semibold text-gray-600">Thời điểm lead vào hệ thống
            <input type="datetime-local" value={enrolledAt} onChange={event => setEnrolledAt(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <div className="relative mt-3"><Search size={15} className="absolute left-3 top-3 text-gray-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên, công ty, số điện thoại..."
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm" />
          </div>
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-1.5">
            {leadOptions.map(lead => (
              <div key={lead.id} className={`flex items-center gap-2 rounded-lg p-2 ${simulationLeadId === lead.id ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                <button onClick={() => selectSimulationLead(lead)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs font-bold text-gray-900">{lead.name}</div>
                  <div className="truncate text-[10px] text-gray-500">{lead.company || lead.phone || lead.email || "Thiếu thông tin liên hệ"}</div>
                </button>
                <label className="flex items-center gap-1 text-[10px] text-gray-500" title="Chọn làm lead canary">
                  <input type="checkbox" checked={canaryLeadIds.includes(lead.id)} onChange={() => toggleCanaryLead(lead.id)} disabled={!canaryLeadIds.includes(lead.id) && canaryLeadIds.length >= 3} className="accent-blue-600" /> Canary
                </label>
              </div>
            ))}
            {!leadOptions.length && <div className="p-4 text-center text-xs text-gray-400">Không tìm thấy lead phù hợp.</div>}
          </div>
          {data?.lead && <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"><strong>Đang mô phỏng:</strong> {data.lead.name} · {data.lead.company || data.lead.phone || data.lead.email}</div>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Activity size={18} className="text-blue-600" /><div><h3 className="text-sm font-bold text-gray-900">Kết quả preflight</h3><p className="text-xs text-gray-500">Mục màu đỏ chặn chạy canary.</p></div></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${data?.ready ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{data?.ready ? "Sẵn sàng" : "Chưa đạt"}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {(data?.checks || []).map(item => {
              const style = statusStyle(item.status); const Icon = style.icon;
              return <div key={item.id} className={`rounded-xl border p-3 ${style.bg} ${style.border}`}><div className={`flex items-center gap-2 text-xs font-bold ${style.color}`}><Icon size={14} />{item.label}</div><p className="mt-1 text-[11px] leading-4 text-gray-600">{item.detail}</p></div>;
            })}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              [MessageCircle, "Zalo cá nhân", data?.providers.zaloPersonal.ready, data?.providers.zaloPersonal.name],
              [MessageCircle, "Zalo OA", data?.providers.zaloOa.ready, data?.providers.zaloOa.name],
              [Mail, "Email", data?.providers.email.ready, data?.providers.email.name],
            ].map(([Icon, label, ready, name]) => {
              const ProviderIcon = Icon as typeof Mail;
              return <div key={String(label)} className="rounded-xl border border-gray-200 p-3"><div className="flex items-center gap-2 text-xs font-bold text-gray-800"><ProviderIcon size={14} className={ready ? "text-emerald-600" : "text-red-500"} />{String(label)}</div><div className="mt-1 truncate text-[10px] text-gray-500">{ready ? String(name || "Đã kết nối") : "Chưa sẵn sàng"}</div></div>;
            })}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <button onClick={() => setExpandedTimeline(value => !value)} className="flex w-full items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2"><CalendarClock size={18} className="text-blue-600" /><div><h3 className="text-sm font-bold text-gray-900">Timeline dự kiến 90 ngày</h3><p className="text-xs text-gray-500">{data?.timeline.length || 0} bước · bắt đầu {formatDate(enrolledAt)}</p></div></div>
          {expandedTimeline ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {expandedTimeline && <div className="mt-4 space-y-2">
          {(data?.timeline || []).map(step => (
            <div key={step.id} className={`grid grid-cols-[58px_1fr] gap-3 rounded-xl border p-3 ${step.status === "ready" ? "border-gray-200" : "border-red-200 bg-red-50"}`}>
              <div className="rounded-lg bg-blue-50 py-2 text-center"><div className="text-[10px] text-blue-500">NGÀY</div><div className="text-lg font-black text-blue-700">{step.day}</div></div>
              <div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-bold text-gray-900">{step.title}</h4><span className="text-[10px] text-gray-500">{formatDate(step.scheduledAt)}</span></div>
                <div className="mt-1 flex flex-wrap gap-1">{[step.primaryChannel, ...step.fallbackChannels].map((channel, index) => <span key={channel} className={`rounded-full px-2 py-0.5 text-[10px] ${step.availableChannels.includes(channel) ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{index === 0 ? "Chính: " : "Dự phòng: "}{channelLabel[channel]}</span>)}</div>
                {(step.missingContext.length > 0 || step.missingMedia.length > 0) && <p className="mt-1 text-[10px] text-red-600">Thiếu: {[...step.missingContext, ...step.missingMedia.map(id => `media:${id}`)].join(", ")}</p>}
              </div>
            </div>
          ))}
        </div>}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-bold text-amber-950"><FlaskConical size={17} />Canary gửi thật có kiểm soát</div><p className="mt-1 max-w-2xl text-xs text-amber-800">Khi bật, engine chỉ tự thêm và claim lịch gửi của tối đa 3 lead đã chọn. Các enrollment khác không bị gửi trong thời gian canary.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{selectedLeads.map(lead => <span key={lead.id} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2 py-1 text-[10px] text-amber-900"><UserRound size={11} />{lead.name}<button onClick={() => toggleCanaryLead(lead.id)}><XCircle size={11} /></button></span>)}{canaryLeadIds.length > selectedLeads.length && <span className="text-[10px] text-amber-700">Đã chọn {canaryLeadIds.length} lead</span>}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data?.workflow.canaryMode && <button onClick={() => saveCanary(false)} disabled={Boolean(busy)} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-50">Tắt canary</button>}
            <button onClick={() => saveCanary(true)} disabled={Boolean(busy) || canaryLeadIds.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50">{busy === "save" ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}Lưu & khóa canary</button>
            <button onClick={runCanary} disabled={Boolean(busy) || !data?.ready || canaryLeadIds.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-[#0068ff] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{busy === "run" ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}Chạy canary thật</button>
          </div>
        </div>
      </section>
    </div>
  );
}
