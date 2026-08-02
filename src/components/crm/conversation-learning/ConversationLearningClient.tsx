"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BellRing,
  Bot,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Flame,
  GitBranch,
  Loader2,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ConversationAnalysis,
  ConversationLearningOverview,
  ConversationLearningSource,
  SalesScript,
  SalesWorkflow,
} from "@/types/conversation-learning";
import {
  CONVERSATION_LEAD_TEMPERATURE_LABELS,
  CONVERSATION_REVIEW_STATUS_LABELS,
} from "@/types/conversation-learning";
import type {
  FanpageCareCenterOverview,
  FanpageCarePlan,
  FanpageCarePlanStatus,
  FanpageCareRun,
  FanpageCareStaffOption,
} from "@/types/fanpage-care-center";
import type { FanpageCareSettings } from "@/lib/fanpage-care-settings";

type TabKey = "overview" | "care-plans" | "conversations" | "analysis" | "scripts" | "workflows" | "settings";

const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "overview", label: "Tổng quan", icon: BrainCircuit },
  { key: "care-plans", label: "Công việc hôm nay", icon: CalendarCheck2 },
  { key: "conversations", label: "Hội thoại", icon: MessageSquareText },
  { key: "analysis", label: "Phân tích AI", icon: Bot },
  { key: "scripts", label: "Kịch bản tư vấn", icon: FileText },
  { key: "workflows", label: "Quy trình", icon: GitBranch },
  { key: "settings", label: "Cài đặt AI", icon: Settings2 },
];

interface CareCenterResponse {
  overview: FanpageCareCenterOverview;
  plans: FanpageCarePlan[];
  runs: FanpageCareRun[];
  staff: FanpageCareStaffOption[];
  permissions: {
    canRun: boolean;
    canAssign: boolean;
    canReview: boolean;
    canManageSettings: boolean;
  };
}

interface SettingsResponse {
  settings: FanpageCareSettings;
  defaults: FanpageCareSettings;
  version: number;
  updatedAt?: string;
  updatedBy?: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Không tải được dữ liệu.");
  return data as T;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function maskPhone(value?: string) {
  if (!value) return "-";
  return value.replace(/(\d{3})\d+(\d{3})/, "$1***$2");
}

function shortText(value: string, max = 140) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max).trim()}...` : value;
}

function toneByTemperature(value: string) {
  if (value === "hot") return "border-red-300/30 bg-red-500/10 text-red-100";
  if (value === "warm") return "border-amber-300/30 bg-amber-500/10 text-amber-100";
  return "border-slate-300/20 bg-white/5 text-slate-200";
}

function toneByStatus(value: string) {
  if (value === "approved" || value === "analyzed") return "border-emerald-300/25 bg-emerald-500/10 text-emerald-100";
  if (value === "need_human_review" || value === "draft") return "border-amber-300/30 bg-amber-500/10 text-amber-100";
  return "border-slate-300/20 bg-white/5 text-slate-200";
}

function priceGatePresentation(plan: FanpageCarePlan) {
  const status = typeof plan.metadata.priceGateStatus === "string"
    ? plan.metadata.priceGateStatus
    : "not_presented";

  if (status === "passed") {
    return { label: "Đã vượt giá", tone: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100" };
  }
  if (status === "engaged") {
    return { label: "Đang hỏi sau giá", tone: "border-sky-300/25 bg-sky-500/10 text-sky-100" };
  }
  if (status === "awaiting_response") {
    return { label: "Chờ phản hồi sau giá", tone: "border-amber-300/25 bg-amber-500/10 text-amber-100" };
  }
  if (status === "passive_response") {
    return { label: "Không vượt giá", tone: "border-red-300/25 bg-red-500/10 text-red-100" };
  }
  return { label: "Chưa báo giá", tone: "border-slate-300/20 bg-white/5 text-slate-200" };
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[rgba(118,138,166,0.18)] bg-[linear-gradient(145deg,rgba(31,37,52,0.82),rgba(29,24,15,0.76))] shadow-[0_18px_45px_rgba(2,5,12,0.22)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", className)}>
      {children}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  loading,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-[#C9A84C] text-[#0D0B00] shadow-[0_10px_28px_rgba(201,168,76,0.18)] hover:bg-[#E2C97E]"
          : "border border-[rgba(255,200,100,0.18)] bg-[#1a1200]/70 text-[rgba(245,237,214,0.72)] hover:border-[#C9A84C]/35 hover:text-white"
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function ConversationLearningClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<ConversationLearningOverview | null>(null);
  const [sources, setSources] = useState<ConversationLearningSource[]>([]);
  const [analyses, setAnalyses] = useState<ConversationAnalysis[]>([]);
  const [scripts, setScripts] = useState<SalesScript[]>([]);
  const [workflows, setWorkflows] = useState<SalesWorkflow[]>([]);
  const [careCenter, setCareCenter] = useState<CareCenterResponse | null>(null);
  const [aiSettings, setAiSettings] = useState<FanpageCareSettings | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<string | undefined>();
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [careStatusFilter, setCareStatusFilter] = useState<FanpageCarePlanStatus | "all">("all");
  const [carePageFilter, setCarePageFilter] = useState("all");
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, sourceData, analysisData, scriptData, workflowData, careData] = await Promise.all([
        fetchJson<{ overview: ConversationLearningOverview }>("/api/crm/conversation-learning/overview"),
        fetchJson<{ sources: ConversationLearningSource[] }>("/api/crm/conversation-learning/conversations?limit=50"),
        fetchJson<{ analyses: ConversationAnalysis[] }>("/api/crm/conversation-learning/analysis?limit=100"),
        fetchJson<{ scripts: SalesScript[] }>("/api/crm/conversation-learning/scripts"),
        fetchJson<{ workflows: SalesWorkflow[] }>("/api/crm/conversation-learning/workflows"),
        fetchJson<CareCenterResponse>("/api/crm/conversation-learning/care-center?limit=200"),
      ]);
      setOverview(overviewData.overview);
      setSources(sourceData.sources);
      setAnalyses(analysisData.analyses);
      setScripts(scriptData.scripts);
      setWorkflows(workflowData.workflows);
      setCareCenter(careData);
      if (careData.permissions.canManageSettings) {
        const settingsData = await fetchJson<SettingsResponse>("/api/crm/conversation-learning/care-center/settings");
        setAiSettings(settingsData.settings);
        setSettingsVersion(settingsData.version);
        setSettingsUpdatedAt(settingsData.updatedAt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    if (requestedTab && tabs.some(tab => tab.key === requestedTab)) {
      setActiveTab(requestedTab as TabKey);
    }
    const requestedPlan = params.get("plan");
    if (requestedPlan) setExpandedPlanId(requestedPlan);
  }, []);

  const filteredCarePlans = useMemo(
    () => (careCenter?.plans || [])
      .filter(plan =>
        (careStatusFilter === "all" || plan.status === careStatusFilter) &&
        (carePageFilter === "all" || plan.pageInternalId === carePageFilter)
      )
      .sort((a, b) => b.leadScore - a.leadScore),
    [careCenter?.plans, carePageFilter, careStatusFilter]
  );

  const selectedCarePlan = useMemo(
    () => filteredCarePlans.find(plan => plan.id === expandedPlanId) || filteredCarePlans[0] || null,
    [expandedPlanId, filteredCarePlans],
  );

  const priorityCarePlans = useMemo(
    () => [...(careCenter?.plans || [])]
      .filter(plan => plan.status === "pending" || plan.status === "approved" || plan.status === "in_progress")
      .sort((a, b) => b.leadScore - a.leadScore)
      .slice(0, 6),
    [careCenter?.plans],
  );

  async function runAnalyze() {
    setActionLoading("analyze");
    setError(null);
    try {
      const result = await fetchJson<{ analyses: ConversationAnalysis[]; createdTaskIds: string[] }>(
        "/api/crm/conversation-learning/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 50 }),
        }
      );
      setAnalyses(result.analyses);
      await loadAll();
      setActiveTab("analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không phân tích được hội thoại.");
    } finally {
      setActionLoading(null);
    }
  }

  async function generateScripts() {
    setActionLoading("scripts");
    setError(null);
    try {
      const data = await fetchJson<{ scripts: SalesScript[] }>("/api/crm/conversation-learning/scripts", {
        method: "POST",
      });
      setScripts(data.scripts);
      await loadAll();
      setActiveTab("scripts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được script.");
    } finally {
      setActionLoading(null);
    }
  }

  async function generateWorkflows() {
    setActionLoading("workflows");
    setError(null);
    try {
      const data = await fetchJson<{ workflows: SalesWorkflow[] }>("/api/crm/conversation-learning/workflows", {
        method: "POST",
      });
      setWorkflows(data.workflows);
      await loadAll();
      setActiveTab("workflows");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được workflow.");
    } finally {
      setActionLoading(null);
    }
  }

  async function patchScript(id: string, action: "approve" | "publish") {
    setActionLoading(`${action}-${id}`);
    setError(null);
    try {
      await fetchJson("/api/crm/conversation-learning/scripts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được script.");
    } finally {
      setActionLoading(null);
    }
  }

  async function runDailyCareCenter() {
    setActionLoading("daily-care");
    setError(null);
    try {
      await fetchJson("/api/crm/conversation-learning/care-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      await loadAll();
      setActiveTab("care-plans");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không chạy được AI chăm sóc Fanpage.");
    } finally {
      setActionLoading(null);
    }
  }

  async function patchCarePlan(
    id: string,
    input: { status?: FanpageCarePlanStatus; assignedStaffId?: string | null },
  ) {
    setActionLoading(`care-${id}`);
    setError(null);
    try {
      await fetchJson("/api/crm/conversation-learning/care-center", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...input }),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được kế hoạch chăm sóc.");
    } finally {
      setActionLoading(null);
    }
  }

  async function saveAiSettings() {
    if (!aiSettings) return;
    setActionLoading("save-settings");
    setError(null);
    setSettingsNotice(null);
    try {
      const data = await fetchJson<SettingsResponse>("/api/crm/conversation-learning/care-center/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: aiSettings }),
      });
      setAiSettings(data.settings);
      setSettingsVersion(data.version);
      setSettingsUpdatedAt(data.updatedAt);
      setSettingsNotice("Đã lưu. Cấu hình mới sẽ áp dụng từ lần chạy AI tiếp theo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được cấu hình AI.");
    } finally {
      setActionLoading(null);
    }
  }

  async function resetAiSettings() {
    if (!window.confirm("Khôi phục toàn bộ prompt, trọng số và từ khóa về mặc định?")) return;
    setActionLoading("reset-settings");
    setError(null);
    setSettingsNotice(null);
    try {
      const data = await fetchJson<SettingsResponse>("/api/crm/conversation-learning/care-center/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      setAiSettings(data.settings);
      setSettingsVersion(data.version);
      setSettingsUpdatedAt(data.updatedAt);
      setSettingsNotice("Đã khôi phục cấu hình mặc định.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không khôi phục được cấu hình AI.");
    } finally {
      setActionLoading(null);
    }
  }

  function updateScoring(key: keyof FanpageCareSettings["scoring"], value: number) {
    setAiSettings(current => current ? { ...current, scoring: { ...current.scoring, [key]: value } } : current);
  }

  function updateTiming(key: keyof FanpageCareSettings["timing"], value: number) {
    setAiSettings(current => current ? { ...current, timing: { ...current.timing, [key]: value } } : current);
  }

  function updateKeywords(key: keyof FanpageCareSettings["keywords"], value: string) {
    const keywords = value.split(/[,\n]/).map(item => item.trim()).filter(Boolean);
    setAiSettings(current => current ? { ...current, keywords: { ...current.keywords, [key]: keywords } } : current);
  }

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center text-[#E2C97E]">
        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
        Đang tải Trung tâm AI Fanpage...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1680px] space-y-4 text-[#F5EDD6]">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/12 text-[#E2C97E]">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D9BD6A]">
                <Sparkles className="h-3.5 w-3.5" />
                AI Customer Care Center
              </p>
              <h1 className="mt-1.5 text-2xl font-bold text-[#F5EDD6] lg:text-[28px]">Trung tâm AI chăm sóc Fanpage</h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[rgba(245,237,214,0.52)]">
                Theo dõi hội thoại, ưu tiên khách tiềm năng và giao việc chăm sóc cho đúng nhân viên.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <ActionButton onClick={loadAll} loading={actionLoading === "reload"} variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </ActionButton>
            {careCenter?.permissions.canRun ? (
              <ActionButton onClick={runDailyCareCenter} loading={actionLoading === "daily-care"}>
                <Sparkles className="h-4 w-4" />
                Chạy AI hôm nay
              </ActionButton>
            ) : null}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-[rgba(255,200,100,0.10)] bg-black/10 px-3 py-2">
          {tabs.filter(tab => tab.key !== "settings" || careCenter?.permissions.canManageSettings).map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-[#C9A84C]/15 text-[#E2C97E] shadow-[inset_0_0_0_1px_rgba(201,168,76,0.20)]"
                    : "text-[rgba(245,237,214,0.48)] hover:bg-white/[0.04] hover:text-[#F5EDD6]"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.key === "care-plans" && (careCenter?.overview.pendingPlans || 0) > 0 ? (
                  <span className="rounded-full bg-[#C9A84C] px-1.5 py-0.5 text-[10px] font-bold text-black">
                    {careCenter?.overview.pendingPlans}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      {error ? (
        <Card className="border-red-300/20 bg-red-500/10 p-4 text-red-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        </Card>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Fanpage đang theo dõi" value={careCenter?.overview.totalPages ?? 0} icon={MessageSquareText} />
            <Metric label="Lead tiềm năng hôm nay" value={careCenter?.overview.qualifiedLeadsToday ?? 0} icon={Users} />
            <Metric label="Lead nóng hôm nay" value={careCenter?.overview.hotLeadsToday ?? 0} icon={Flame} />
            <Metric label="Kế hoạch chờ xử lý" value={careCenter?.overview.pendingPlans ?? 0} icon={CalendarCheck2} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <SectionTitle
                  title="Việc cần xử lý hôm nay"
                  subtitle="Ưu tiên theo điểm lead và hạn chăm sóc gần nhất."
                />
                <button
                  type="button"
                  onClick={() => setActiveTab("care-plans")}
                  className="shrink-0 text-sm font-semibold text-[#D9BD6A] transition hover:text-[#F5EDD6]"
                >
                  Mở tất cả
                </button>
              </div>
              <div className="mt-4 divide-y divide-[rgba(118,138,166,0.12)] overflow-hidden rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55">
                {priorityCarePlans.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setExpandedPlanId(plan.id);
                      setActiveTab("care-plans");
                    }}
                    className="grid w-full gap-3 p-3.5 text-left transition hover:bg-white/[0.035] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold",
                      toneByTemperature(plan.leadTemperature),
                    )}>
                      {plan.leadScore}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-[#F5EDD6]">{plan.customerName}</h3>
                        <Pill className={toneByCareStatus(plan.status)}>{careStatusLabel(plan.status)}</Pill>
                      </div>
                      <p className="mt-1 truncate text-xs text-[rgba(245,237,214,0.48)]">
                        {plan.pageName} · {shortText(plan.nextBestAction, 90)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-[rgba(245,237,214,0.40)] sm:block sm:text-right">
                      <span className="block">{plan.assignedStaffName || "Chưa phân công"}</span>
                      <span className="mt-1 block">{formatDate(plan.dueAt)}</span>
                    </div>
                  </button>
                ))}
                {!priorityCarePlans.length ? (
                  <EmptyState text="Không còn kế hoạch đang chờ xử lý." />
                ) : null}
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle title="Tình trạng hệ thống" subtitle="Lần chạy AI gần nhất và kênh thông báo." />
              {careCenter?.overview.lastRun ? (
                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[rgba(245,237,214,0.48)]">Trạng thái</span>
                    <Pill className={toneByCareRun(careCenter.overview.lastRun.status)}>
                      {careRunLabel(careCenter.overview.lastRun.status)}
                    </Pill>
                  </div>
                  <RunMetric label="Thời điểm" value={formatDate(careCenter.overview.lastRun.startedAt)} />
                  <RunMetric label="Fanpage" value={`${careCenter.overview.lastRun.pagesSynced}/${careCenter.overview.lastRun.pagesTotal}`} />
                  <RunMetric label="Hội thoại quét" value={String(careCenter.overview.lastRun.conversationsScanned)} />
                  <RunMetric label="Kế hoạch tạo" value={String(careCenter.overview.lastRun.plansGenerated)} />
                  <RunMetric label="Push thành công" value={String(careCenter.overview.lastRun.pushSent)} />
                  <RunMetric label="Engine" value={careCenter.overview.lastRun.model || "Rules an toàn"} />
                </div>
              ) : (
                <EmptyState text="Chưa có lần phân tích hằng ngày." />
              )}
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-300/15 bg-emerald-500/[0.055] p-3">
                <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-emerald-100">
                    {careCenter?.overview.pushSentToday ?? 0} thông báo PWA hôm nay
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/55">
                    Chỉ gửi tới người phụ trách; AI không tự nhắn khách hàng.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle
                title="Tình trạng từng Fanpage"
                subtitle="Chọn một Fanpage để mở các công việc chăm sóc tương ứng."
              />
              <Pill className="border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#E2C97E]">
                {careCenter?.overview.totalPages ?? 0} Fanpage đang theo dõi
              </Pill>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-[rgba(118,138,166,0.16)]">
              <div className="hidden grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(90px,0.55fr))_minmax(140px,0.7fr)] gap-3 bg-[#0d1420]/70 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(245,237,214,0.36)] md:grid">
                <span>Fanpage</span>
                <span>Hội thoại</span>
                <span>Tiềm năng</span>
                <span>Lead nóng</span>
                <span>Chờ xử lý</span>
                <span>Đồng bộ</span>
              </div>
              <div className="divide-y divide-[rgba(118,138,166,0.12)]">
                {(careCenter?.overview.pages || []).map(page => (
                  <button
                    key={page.pageInternalId}
                    type="button"
                    onClick={() => {
                      setCarePageFilter(page.pageInternalId);
                      setActiveTab("care-plans");
                    }}
                    className="grid w-full gap-2 px-4 py-3.5 text-left transition hover:bg-white/[0.035] md:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(90px,0.55fr))_minmax(140px,0.7fr)] md:items-center md:gap-3"
                  >
                    <span className="truncate text-sm font-semibold text-[#F5EDD6]">{page.pageName}</span>
                    <span className="text-xs text-[rgba(245,237,214,0.52)]">{page.conversationCount} hội thoại</span>
                    <span className="text-xs text-[rgba(245,237,214,0.52)]">{page.qualifiedLeads} tiềm năng</span>
                    <span className={cn("text-xs", page.hotLeads > 0 ? "font-semibold text-red-200" : "text-[rgba(245,237,214,0.52)]")}>
                      {page.hotLeads} lead nóng
                    </span>
                    <span className="text-xs text-[rgba(245,237,214,0.52)]">{page.pendingPlans} chờ xử lý</span>
                    <span className="text-xs text-[rgba(245,237,214,0.38)]">{formatDate(page.lastSyncedAt)}</span>
                  </button>
                ))}
                {!careCenter?.overview.pages.length ? (
                  <EmptyState text="Chưa có dữ liệu Fanpage. Quản lý có thể chạy AI để đồng bộ." />
                ) : null}
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Hội thoại đã phân tích" value={overview?.totalAnalyzed ?? 0} icon={Database} />
            <Metric label="Kết quả cần kiểm tra" value={overview?.needHumanReview ?? 0} icon={AlertTriangle} />
            <Metric label="Kịch bản đang nháp" value={overview?.draftScripts ?? 0} icon={FileText} />
            <Metric label="Quy trình đang bật" value={overview?.activeWorkflows ?? 0} icon={GitBranch} />
          </div>
        </div>
      ) : null}

      {activeTab === "care-plans" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Chờ xác nhận" value={careCenter?.overview.pendingPlans ?? 0} icon={Clock3} />
            <Metric label="Đang chăm sóc" value={careCenter?.overview.approvedPlans ?? 0} icon={UserRoundCheck} />
            <Metric label="Lead nóng hôm nay" value={careCenter?.overview.hotLeadsToday ?? 0} icon={Flame} />
            <Metric label="Đã gửi PWA hôm nay" value={careCenter?.overview.pushSentToday ?? 0} icon={BellRing} />
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-[rgba(118,138,166,0.14)] p-5 xl:flex-row xl:items-center xl:justify-between">
              <SectionTitle
                title="Công việc chăm sóc khách hàng"
                subtitle="Chọn khách ở bên trái để xem kế hoạch và cập nhật trạng thái."
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={careStatusFilter}
                  onChange={event => setCareStatusFilter(event.target.value as FanpageCarePlanStatus | "all")}
                  className="rounded-xl border border-[rgba(118,138,166,0.20)] bg-[#0d1420] px-3 py-2.5 text-sm text-[#F5EDD6] outline-none focus:border-[#C9A84C]/50"
                  aria-label="Lọc trạng thái kế hoạch"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="in_progress">Đang chăm sóc</option>
                  <option value="completed">Đã hoàn tất</option>
                  <option value="dismissed">Đã bỏ qua</option>
                </select>
                <select
                  value={carePageFilter}
                  onChange={event => setCarePageFilter(event.target.value)}
                  className="rounded-xl border border-[rgba(118,138,166,0.20)] bg-[#0d1420] px-3 py-2.5 text-sm text-[#F5EDD6] outline-none focus:border-[#C9A84C]/50"
                  aria-label="Lọc Fanpage"
                >
                  <option value="all">Tất cả Fanpage</option>
                  {(careCenter?.overview.pages || []).map(page => (
                    <option key={page.pageInternalId} value={page.pageInternalId}>{page.pageName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid min-h-[640px] xl:grid-cols-[390px_minmax(0,1fr)]">
              <div className="border-b border-[rgba(118,138,166,0.14)] bg-[#0b111b]/35 xl:border-b-0 xl:border-r">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[rgba(245,237,214,0.38)]">
                    {filteredCarePlans.length} khách hàng
                  </span>
                  <span className="text-xs text-[rgba(245,237,214,0.34)]">Theo điểm ưu tiên</span>
                </div>
                <div className="max-h-[720px] divide-y divide-[rgba(118,138,166,0.11)] overflow-y-auto border-t border-[rgba(118,138,166,0.12)]">
                  {filteredCarePlans.map(plan => (
                    <button
                      key={plan.id}
                      id={`care-plan-${plan.id}`}
                      type="button"
                      onClick={() => setExpandedPlanId(plan.id)}
                      className={cn(
                        "w-full px-4 py-4 text-left transition",
                        selectedCarePlan?.id === plan.id
                          ? "bg-[#C9A84C]/10 shadow-[inset_3px_0_0_#C9A84C]"
                          : "hover:bg-white/[0.035]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-[#F5EDD6]">{plan.customerName}</h3>
                          <p className="mt-1 truncate text-xs text-[rgba(245,237,214,0.42)]">{plan.pageName}</p>
                        </div>
                        <div className={cn(
                          "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border px-2 text-xs font-bold",
                          toneByTemperature(plan.leadTemperature),
                        )}>
                          {plan.leadScore}
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[rgba(245,237,214,0.54)]">{plan.summary}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Pill className={toneByCareStatus(plan.status)}>{careStatusLabel(plan.status)}</Pill>
                        <span className="truncate text-[11px] text-[rgba(245,237,214,0.34)]">
                          {plan.assignedStaffName || "Chưa phân công"}
                        </span>
                      </div>
                    </button>
                  ))}
                  {!filteredCarePlans.length ? (
                    <div className="p-4">
                      <EmptyState text="Không có kế hoạch phù hợp bộ lọc." />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 p-5 lg:p-6">
                {selectedCarePlan ? (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill className={toneByTemperature(selectedCarePlan.leadTemperature)}>
                            {CONVERSATION_LEAD_TEMPERATURE_LABELS[selectedCarePlan.leadTemperature]} · {selectedCarePlan.leadScore}/100
                          </Pill>
                          <Pill className={toneByCareStatus(selectedCarePlan.status)}>
                            {careStatusLabel(selectedCarePlan.status)}
                          </Pill>
                          <Pill className={priceGatePresentation(selectedCarePlan).tone}>
                            {priceGatePresentation(selectedCarePlan).label}
                          </Pill>
                          <Pill className="border-sky-300/20 bg-sky-500/10 text-sky-100">{selectedCarePlan.pageName}</Pill>
                        </div>
                        <h2 className="mt-3 text-xl font-bold text-[#F5EDD6]">{selectedCarePlan.customerName}</h2>
                        <p className="mt-2 max-w-4xl text-sm leading-6 text-[rgba(245,237,214,0.60)]">{selectedCarePlan.summary}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {selectedCarePlan.status === "pending" ? (
                          <ActionButton
                            loading={actionLoading === `care-${selectedCarePlan.id}`}
                            onClick={() => void patchCarePlan(selectedCarePlan.id, { status: "approved" })}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Duyệt kế hoạch
                          </ActionButton>
                        ) : null}
                        {selectedCarePlan.status === "approved" ? (
                          <ActionButton
                            loading={actionLoading === `care-${selectedCarePlan.id}`}
                            onClick={() => void patchCarePlan(selectedCarePlan.id, { status: "in_progress" })}
                          >
                            Bắt đầu chăm sóc
                          </ActionButton>
                        ) : null}
                        {selectedCarePlan.status === "in_progress" ? (
                          <ActionButton
                            loading={actionLoading === `care-${selectedCarePlan.id}`}
                            onClick={() => void patchCarePlan(selectedCarePlan.id, { status: "completed" })}
                          >
                            Hoàn tất
                          </ActionButton>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                      <DetailMetric label="Hạn chăm sóc" value={formatDate(selectedCarePlan.dueAt)} />
                      <DetailMetric label="Tin nhắn nguồn" value={`${selectedCarePlan.sourceMessageCount} tin nhắn`} />
                      <DetailMetric
                        label="Độ tin cậy"
                        value={`${Math.round(selectedCarePlan.confidence * 100)}% · ${selectedCarePlan.engine === "gemini" ? "Gemini" : "Rules an toàn"}`}
                      />
                      <DetailMetric
                        label="Thông báo PWA"
                        value={selectedCarePlan.notificationSentAt ? "Đã gửi" : "Chưa gửi"}
                        success={Boolean(selectedCarePlan.notificationSentAt)}
                      />
                    </div>

                    {careCenter?.permissions.canAssign ? (
                      <div className="flex flex-col gap-2 rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55 p-3 sm:flex-row sm:items-center">
                        <label className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-[rgba(245,237,214,0.38)]" htmlFor={`staff-${selectedCarePlan.id}`}>
                          Người phụ trách
                        </label>
                        <select
                          id={`staff-${selectedCarePlan.id}`}
                          value={selectedCarePlan.assignedStaffId || ""}
                          disabled={actionLoading === `care-${selectedCarePlan.id}`}
                          onChange={event => void patchCarePlan(selectedCarePlan.id, { assignedStaffId: event.target.value || null })}
                          className="min-w-0 flex-1 rounded-xl border border-[rgba(118,138,166,0.20)] bg-[#0b111b] px-3 py-2.5 text-sm text-[#F5EDD6] outline-none focus:border-[#C9A84C]/50"
                        >
                          <option value="">Chưa phân công — thông báo Admin</option>
                          {(careCenter.staff || []).map(staff => (
                            <option key={staff.id} value={staff.id}>
                              {staff.fullName} · {staff.pushSubscriptions > 0 ? `${staff.pushSubscriptions} thiết bị PWA` : "chưa bật PWA"}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="grid gap-3 lg:grid-cols-3">
                      <InfoPanel label="Nhu cầu" value={selectedCarePlan.customerNeed} />
                      <InfoPanel label="Tín hiệu mua" value={selectedCarePlan.buyingSignals.join(", ") || "Chưa rõ"} />
                      <InfoPanel label="Trở ngại" value={selectedCarePlan.objections.join(", ") || "Chưa thấy rõ"} />
                    </div>

                    <div className="rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/[0.065] p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D9BD6A]">Hành động tốt nhất tiếp theo</div>
                      <p className="mt-2 text-sm leading-6 text-[#F5EDD6]">{selectedCarePlan.nextBestAction}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-[#F5EDD6]">Các bước chăm sóc đề xuất</h3>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {selectedCarePlan.planSteps.map((step, index) => (
                          <div key={`${selectedCarePlan.id}-${index}`} className="rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D9BD6A]">
                                  Bước {index + 1} · {step.when}
                                </div>
                                <h4 className="mt-1.5 text-sm font-semibold text-[#F5EDD6]">{step.goal}</h4>
                              </div>
                              <Pill className="border-[rgba(118,138,166,0.18)] bg-white/[0.035] text-[rgba(245,237,214,0.58)]">
                                {step.channel}
                              </Pill>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-[rgba(245,237,214,0.58)]">{step.action}</p>
                            {step.draftMessage ? (
                              <div className="mt-3 rounded-xl border border-sky-300/15 bg-sky-500/[0.055] p-3 text-sm leading-6 text-sky-100/80">
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-300">Tin nhắn nháp</div>
                                {step.draftMessage}
                              </div>
                            ) : null}
                            <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300/80">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Nhân viên xác nhận trước khi liên hệ
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[520px] items-center justify-center">
                    <EmptyState text="Chọn bộ lọc khác hoặc chạy AI để tạo kế hoạch chăm sóc." />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "conversations" ? (
        <Card className="p-5">
          <SectionTitle title="Hội thoại Fanpage" subtitle="Nguồn dữ liệu CRM đã được che bớt thông tin nhạy cảm trên giao diện." />
          <div className="mt-5 space-y-3">
            {sources.map(source => {
              const latest = source.messages[source.messages.length - 1];
              return (
                <div key={source.conversationId} className="rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#F5EDD6]">{source.customerName || "Khách chưa có tên"}</h3>
                        <Pill className="border-[rgba(118,138,166,0.18)] bg-white/[0.035] text-[rgba(245,237,214,0.58)]">{maskPhone(source.facebookUserId)}</Pill>
                        {source.assignedSale ? <Pill className="border-amber-300/25 bg-amber-500/10 text-amber-100">{source.assignedSale}</Pill> : null}
                      </div>
                      <p className="mt-2 text-sm text-[rgba(245,237,214,0.52)]">{shortText(latest?.content || "Không có nội dung tin nhắn", 180)}</p>
                    </div>
                    <div className="text-sm text-[rgba(245,237,214,0.34)]">{formatDate(source.latestMessageAt)}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill className="border-sky-300/20 bg-sky-500/10 text-sky-100">{source.messages.length} tin nhắn</Pill>
                    {source.orderStatus ? <Pill className="border-emerald-300/20 bg-emerald-500/10 text-emerald-100">{source.orderStatus}</Pill> : null}
                    {source.tags.slice(0, 5).map(tag => (
                      <Pill key={tag} className="border-[rgba(118,138,166,0.18)] bg-white/[0.035] text-[rgba(245,237,214,0.58)]">{tag}</Pill>
                    ))}
                  </div>
                </div>
              );
            })}
            {!sources.length ? <EmptyState text="Chưa tìm thấy hội thoại phù hợp trong CRM." /> : null}
          </div>
        </Card>
      ) : null}

      {activeTab === "analysis" ? (
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SectionTitle title="Phân tích AI" subtitle="Chấm điểm hội thoại, nhận diện nhu cầu và đề xuất bước tiếp theo cho nhân viên." />
            <ActionButton onClick={runAnalyze} loading={actionLoading === "analyze"}>
              <Sparkles className="h-4 w-4" />
              Phân tích 50 hội thoại
            </ActionButton>
          </div>
          <div className="mt-5 space-y-3">
            {analyses.map(item => <AnalysisRow key={item.id} item={item} />)}
            {!analyses.length ? <EmptyState text="Chưa có dữ liệu phân tích." /> : null}
          </div>
        </Card>
      ) : null}

      {activeTab === "scripts" ? (
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SectionTitle title="Kịch bản tư vấn AI" subtitle="Quản lý duyệt trước khi đưa vào kho kiến thức dùng chung." />
            <ActionButton onClick={generateScripts} loading={actionLoading === "scripts"}>
              Tạo kịch bản nháp
            </ActionButton>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {scripts.map(script => (
              <div key={script.id} className="rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#F5EDD6]">{script.scriptName}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#D9BD6A]">{script.customerSituation}</p>
                  </div>
                  <Pill className={toneByStatus(script.status)}>{script.status === "approved" ? "Đã duyệt" : "Bản nháp"}</Pill>
                </div>
                <div className="mt-4 space-y-3 text-sm text-[rgba(245,237,214,0.58)]">
                  <InfoBlock label="Dấu hiệu" value={script.triggerSignals.join(", ")} />
                  <InfoBlock label="Câu hỏi nên hỏi" value={script.suggestedQuestions.join(" | ")} />
                  <InfoBlock label="Gợi ý trả lời" value={script.suggestedReply} />
                  <InfoBlock label="Xử lý từ chối" value={script.objectionHandling} />
                  <InfoBlock label="Hành động CRM" value={script.nextCrmAction} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    onClick={() => void patchScript(script.id, "approve")}
                    loading={actionLoading === `approve-${script.id}`}
                    variant="secondary"
                  >
                    Duyệt script
                  </ActionButton>
                  <ActionButton
                    onClick={() => void patchScript(script.id, "publish")}
                    loading={actionLoading === `publish-${script.id}`}
                    variant="secondary"
                  >
                    Đưa vào Knowledge Base
                  </ActionButton>
                </div>
              </div>
            ))}
            {!scripts.length ? <EmptyState text="Chưa có script. Bấm tạo script nháp để bắt đầu." /> : null}
          </div>
        </Card>
      ) : null}

      {activeTab === "workflows" ? (
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SectionTitle title="Quy trình chăm sóc" subtitle="Tạo luật gợi ý và công việc cho nhân viên; hệ thống không tự nhắn khách." />
            <ActionButton onClick={generateWorkflows} loading={actionLoading === "workflows"}>
              Tạo quy trình mẫu
            </ActionButton>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {workflows.map(workflow => (
              <div key={workflow.id} className="rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#F5EDD6]">{workflow.workflowName}</h3>
                    <p className="mt-1 text-xs text-[rgba(245,237,214,0.34)]">Ưu tiên {workflow.priority} · {workflow.delayTime}</p>
                  </div>
                  <Pill className={toneByStatus(workflow.status)}>{workflow.status === "approved" ? "Đang bật" : "Bản nháp"}</Pill>
                </div>
                <div className="mt-4 space-y-3 text-sm text-[rgba(245,237,214,0.58)]">
                  <InfoBlock label="Điều kiện" value={workflow.triggerCondition} />
                  <InfoBlock label="AI làm" value={workflow.aiAction} />
                  <InfoBlock label="Người phụ trách" value={workflow.humanAction} />
                </div>
              </div>
            ))}
            {!workflows.length ? <EmptyState text="Chưa có workflow. Bấm tạo workflow mẫu để bắt đầu." /> : null}
          </div>
        </Card>
      ) : null}

      {activeTab === "settings" && careCenter?.permissions.canManageSettings ? (
        aiSettings ? (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <SectionTitle
                  title="Cài đặt AI quét và đánh giá hội thoại"
                  subtitle="Admin kiểm soát prompt, tín hiệu nhận diện, trọng số chấm lead, thời hạn xử lý và điều kiện gửi PWA."
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className="border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#E2C97E]">
                    Phiên bản {settingsVersion}
                  </Pill>
                  <ActionButton onClick={resetAiSettings} loading={actionLoading === "reset-settings"} variant="secondary">
                    <RotateCcw className="h-4 w-4" /> Khôi phục mặc định
                  </ActionButton>
                  <ActionButton onClick={saveAiSettings} loading={actionLoading === "save-settings"}>
                    <Save className="h-4 w-4" /> Lưu cấu hình
                  </ActionButton>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-emerald-300/15 bg-emerald-500/[0.055] p-3 text-xs leading-5 text-emerald-100/70 sm:flex-row sm:items-center sm:justify-between">
                <span><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-300" />AI chỉ tạo bản phân tích và kế hoạch. Quy tắc không tự nhắn khách, không bịa dữ liệu và luôn cần người duyệt được khóa ở máy chủ.</span>
                <span className="shrink-0">Cập nhật: {formatDate(settingsUpdatedAt)}</span>
              </div>
              {settingsNotice ? <p className="mt-3 text-sm font-medium text-emerald-300">{settingsNotice}</p> : null}
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="p-5">
                <SectionTitle title="Câu lệnh phân tích" subtitle="Định hướng vai trò và cách AI lập kế hoạch cho từng hội thoại." />
                <div className="mt-4 space-y-4">
                  <SettingsTextarea
                    label="Prompt hệ thống"
                    value={aiSettings.prompts.system}
                    rows={5}
                    onChange={value => setAiSettings(current => current ? { ...current, prompts: { ...current.prompts, system: value } } : current)}
                  />
                  <SettingsTextarea
                    label="Yêu cầu lập kế hoạch chăm sóc"
                    value={aiSettings.prompts.planning}
                    rows={6}
                    onChange={value => setAiSettings(current => current ? { ...current, prompts: { ...current.prompts, planning: value } } : current)}
                  />
                </div>
              </Card>

              <Card className="p-5">
                <SectionTitle title="Ngưỡng phân loại và thời hạn" subtitle="Quyết định lead nào được tạo kế hoạch, mức nóng/ấm và hạn nhân viên cần xử lý." />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SettingsNumber label="Điểm đủ điều kiện" value={aiSettings.scoring.qualifyThreshold} onChange={value => updateScoring("qualifyThreshold", value)} />
                  <SettingsNumber label="Ngưỡng lead ấm" value={aiSettings.scoring.warmThreshold} onChange={value => updateScoring("warmThreshold", value)} />
                  <SettingsNumber label="Ngưỡng lead nóng" value={aiSettings.scoring.hotThreshold} onChange={value => updateScoring("hotThreshold", value)} />
                  <SettingsNumber label="Cửa sổ hội thoại mới (giờ)" value={aiSettings.scoring.recentWindowHours} onChange={value => updateScoring("recentWindowHours", value)} />
                  <SettingsNumber label="Hạn lead nóng (giờ)" value={aiSettings.timing.hotDueHours} step={0.25} onChange={value => updateTiming("hotDueHours", value)} />
                  <SettingsNumber label="Hạn lead ấm (giờ)" value={aiSettings.timing.warmDueHours} step={0.25} onChange={value => updateTiming("warmDueHours", value)} />
                  <SettingsNumber label="Hạn lead lạnh (giờ)" value={aiSettings.timing.coldDueHours} step={0.25} onChange={value => updateTiming("coldDueHours", value)} />
                  <SettingsNumber label="Số ngày tối đa của kế hoạch" value={aiSettings.timing.maxPlanDays} onChange={value => updateTiming("maxPlanDays", value)} />
                </div>
              </Card>
            </div>

            <Card className="p-5">
              <SectionTitle title="Các yếu tố chấm điểm lead" subtitle="Lead chỉ được lên mức nóng sau khi đã biết giá và tiếp tục hỏi sâu hoặc thể hiện ý định mua rõ ràng." />
              <div className="mt-4 rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/[0.07] p-4 text-sm leading-6 text-[#E7D8AD]">
                <p className="font-semibold text-[#F5EDD6]">Cổng vượt giá</p>
                <p className="mt-1 text-[#CFC5AE]">
                  Trước khi vượt giá, điểm bị giới hạn dưới ngưỡng lead nóng. Sau khi Fanpage báo giá,
                  khách im lặng hoặc chỉ trả lời “ok/dạ/cảm ơn” sẽ bị loại khỏi kế hoạch chăm sóc.
                  Khách được xem là vượt giá khi hỏi đủ số chủ đề bên dưới hoặc chủ động đặt mua/chốt/cọc.
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <SettingsNumber label="Có tin nhắn khách" value={aiSettings.scoring.inboundBase} onChange={value => updateScoring("inboundBase", value)} />
                <SettingsNumber label="Mỗi sản phẩm quan tâm" value={aiSettings.scoring.productWeight} onChange={value => updateScoring("productWeight", value)} />
                <SettingsNumber label="Trần điểm sản phẩm" value={aiSettings.scoring.productCap} onChange={value => updateScoring("productCap", value)} />
                <SettingsNumber label="Mỗi tín hiệu mua" value={aiSettings.scoring.buyingSignalWeight} onChange={value => updateScoring("buyingSignalWeight", value)} />
                <SettingsNumber label="Trần điểm tín hiệu mua" value={aiSettings.scoring.buyingSignalCap} onChange={value => updateScoring("buyingSignalCap", value)} />
                <SettingsNumber label="Tin khách chưa phản hồi" value={aiSettings.scoring.unansweredBonus} onChange={value => updateScoring("unansweredBonus", value)} />
                <SettingsNumber label="Hội thoại chưa đọc" value={aiSettings.scoring.unreadBonus} onChange={value => updateScoring("unreadBonus", value)} />
                <SettingsNumber label="Hội thoại còn mới" value={aiSettings.scoring.recentBonus} onChange={value => updateScoring("recentBonus", value)} />
                <SettingsNumber label="Trừ khi không thể trả lời" value={aiSettings.scoring.cannotReplyPenalty} onChange={value => updateScoring("cannotReplyPenalty", value)} />
                <SettingsNumber label="Trừ mỗi trở ngại" value={aiSettings.scoring.objectionPenalty} onChange={value => updateScoring("objectionPenalty", value)} />
                <SettingsNumber label="Trần điểm bị trừ" value={aiSettings.scoring.objectionCap} onChange={value => updateScoring("objectionCap", value)} />
                <SettingsNumber label="Điểm mỗi chủ đề hỏi sau báo giá" value={aiSettings.scoring.postPriceQuestionWeight} onChange={value => updateScoring("postPriceQuestionWeight", value)} />
                <SettingsNumber label="Trần điểm hỏi sau báo giá" value={aiSettings.scoring.postPriceQuestionCap} onChange={value => updateScoring("postPriceQuestionCap", value)} />
                <SettingsNumber label="Điểm thưởng khi vượt giá" value={aiSettings.scoring.pricePassedBonus} onChange={value => updateScoring("pricePassedBonus", value)} />
                <SettingsNumber label="Số chủ đề tối thiểu để vượt giá" value={aiSettings.scoring.minimumPostPriceQuestions} onChange={value => updateScoring("minimumPostPriceQuestions", value)} />
                <SettingsNumber label="Điểm tối đa trước khi vượt giá" value={aiSettings.scoring.prePriceScoreCap} onChange={value => updateScoring("prePriceScoreCap", value)} />
                <SettingsNumber label="Điểm khi im lặng/ok sau báo giá" value={aiSettings.scoring.disengagedAfterPriceScore} onChange={value => updateScoring("disengagedAfterPriceScore", value)} />
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle title="Từ khóa AI cần quét" subtitle="Nhập cách nhau bằng dấu phẩy hoặc xuống dòng. Hệ thống tự bỏ dấu tiếng Việt khi so khớp." />
              <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <SettingsTextarea label="Sản phẩm/nhóm sản phẩm" value={aiSettings.keywords.products.join(", ")} onChange={value => updateKeywords("products", value)} />
                <SettingsTextarea label="Hỏi giá/báo giá" value={aiSettings.keywords.pricing.join(", ")} onChange={value => updateKeywords("pricing", value)} />
                <SettingsTextarea label="Kích thước" value={aiSettings.keywords.dimensions.join(", ")} onChange={value => updateKeywords("dimensions", value)} />
                <SettingsTextarea label="Giao lắp/showroom" value={aiSettings.keywords.delivery.join(", ")} onChange={value => updateKeywords("delivery", value)} />
                <SettingsTextarea label="Ý định mua/chốt" value={aiSettings.keywords.purchaseIntent.join(", ")} onChange={value => updateKeywords("purchaseIntent", value)} />
                <SettingsTextarea label="Sẵn sàng nhận liên hệ" value={aiSettings.keywords.contact.join(", ")} onChange={value => updateKeywords("contact", value)} />
                <SettingsTextarea label="Từ khóa trở ngại/phản đối" value={aiSettings.keywords.objections.join(", ")} onChange={value => updateKeywords("objections", value)} />
                <SettingsTextarea label="Nhu cầu tối ưu không gian" value={aiSettings.keywords.smallSpaceNeeds.join(", ")} onChange={value => updateKeywords("smallSpaceNeeds", value)} />
                <SettingsTextarea label="Nhu cầu nâng đỡ/chăm sóc" value={aiSettings.keywords.homeCareNeeds.join(", ")} onChange={value => updateKeywords("homeCareNeeds", value)} />
                <SettingsTextarea label="Nhu cầu xem thực tế" value={aiSettings.keywords.visualProofNeeds.join(", ")} onChange={value => updateKeywords("visualProofNeeds", value)} />
                <SettingsTextarea label="Cụm từ xác nhận Fanpage đã báo giá" value={aiSettings.keywords.pricePresented.join(", ")} onChange={value => updateKeywords("pricePresented", value)} />
                <SettingsTextarea label="Phản hồi xã giao sau báo giá" value={aiSettings.keywords.passiveAfterPrice.join(", ")} onChange={value => updateKeywords("passiveAfterPrice", value)} />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <SectionTitle title="Thông báo PWA" subtitle="Chỉ gửi kế hoạch đạt mức điểm tối thiểu tới người phụ trách; không gửi tin cho khách." />
                <label className="inline-flex items-center gap-3 text-sm font-semibold text-[#F5EDD6]">
                  <input
                    type="checkbox"
                    checked={aiSettings.notifications.enabled}
                    onChange={event => setAiSettings(current => current ? { ...current, notifications: { ...current.notifications, enabled: event.target.checked } } : current)}
                    className="h-4 w-4 accent-[#C9A84C]"
                  />
                  Bật thông báo kế hoạch mới
                </label>
              </div>
              <div className="mt-4 max-w-sm">
                <SettingsNumber
                  label="Điểm lead tối thiểu để gửi PWA"
                  value={aiSettings.notifications.minimumScore}
                  onChange={value => setAiSettings(current => current ? { ...current, notifications: { ...current.notifications, minimumScore: value } } : current)}
                />
              </div>
            </Card>
          </div>
        ) : <EmptyState text="Đang tải cấu hình AI..." />
      ) : null}
    </div>
  );
}

function careStatusLabel(status: FanpageCarePlanStatus) {
  return {
    pending: "Chờ xác nhận",
    approved: "Đã duyệt",
    in_progress: "Đang chăm sóc",
    completed: "Đã hoàn tất",
    dismissed: "Đã bỏ qua",
  }[status];
}

function toneByCareStatus(status: FanpageCarePlanStatus) {
  if (status === "completed") return "border-emerald-300/25 bg-emerald-500/10 text-emerald-100";
  if (status === "approved" || status === "in_progress") return "border-sky-300/25 bg-sky-500/10 text-sky-100";
  if (status === "pending") return "border-amber-300/25 bg-amber-500/10 text-amber-100";
  return "border-slate-300/20 bg-white/5 text-slate-300";
}

function careRunLabel(status: FanpageCareRun["status"]) {
  return {
    running: "Đang chạy",
    success: "Thành công",
    partial: "Một phần",
    failed: "Lỗi",
    skipped: "Đã bỏ qua",
  }[status];
}

function toneByCareRun(status: FanpageCareRun["status"]) {
  if (status === "success") return "border-emerald-300/25 bg-emerald-500/10 text-emerald-100";
  if (status === "partial" || status === "running") return "border-amber-300/25 bg-amber-500/10 text-amber-100";
  if (status === "failed") return "border-red-300/25 bg-red-500/10 text-red-100";
  return "border-white/10 bg-white/5 text-stone-300";
}

function RunMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[rgba(118,138,166,0.10)] pb-2">
      <span className="text-[rgba(245,237,214,0.40)]">{label}</span>
      <span className="text-right font-medium text-[rgba(245,237,214,0.72)]">{value}</span>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <Card className="p-4 transition hover:border-[#C9A84C]/20">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#E2C97E]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-[#F5EDD6]">{value}</div>
          <div className="truncate text-xs text-[rgba(245,237,214,0.40)]">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function DetailMetric({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(245,237,214,0.34)]">{label}</div>
      <div className={cn("mt-1.5 text-sm font-semibold", success ? "text-emerald-300" : "text-[rgba(245,237,214,0.72)]")}>
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#F5EDD6]">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-[rgba(245,237,214,0.46)]">{subtitle}</p>
    </div>
  );
}

function SettingsNumber({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="block rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55 p-3">
      <span className="block text-xs font-semibold text-[rgba(245,237,214,0.58)]">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-lg border border-[rgba(118,138,166,0.18)] bg-[#080d15] px-3 py-2 text-sm font-semibold text-[#F5EDD6] outline-none transition focus:border-[#C9A84C]/55"
      />
    </label>
  );
}

function SettingsTextarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[rgba(245,237,214,0.58)]">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 w-full resize-y rounded-xl border border-[rgba(118,138,166,0.18)] bg-[#080d15] px-3 py-2.5 text-sm leading-6 text-[#F5EDD6] outline-none transition placeholder:text-white/20 focus:border-[#C9A84C]/55"
      />
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[rgba(118,138,166,0.18)] bg-[#0d1420]/45 p-7 text-center text-sm text-[rgba(245,237,214,0.44)]">
      {text}
    </div>
  );
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D9BD6A]">{label}</div>
      <p className="mt-2 text-sm leading-6 text-[rgba(245,237,214,0.60)]">{value || "-"}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D9BD6A]">{label}</div>
      <div className="mt-1.5 leading-relaxed text-[rgba(245,237,214,0.60)]">{value || "-"}</div>
    </div>
  );
}

function AnalysisRow({ item, compact = false }: { item: ConversationAnalysis; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-[rgba(118,138,166,0.16)] bg-[#0d1420]/55 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill className={toneByTemperature(item.leadTemperature)}>
              {CONVERSATION_LEAD_TEMPERATURE_LABELS[item.leadTemperature]} • {item.leadScore}/100
            </Pill>
            <Pill className={toneByStatus(item.reviewStatus)}>
              {CONVERSATION_REVIEW_STATUS_LABELS[item.reviewStatus]}
            </Pill>
            <Pill className="border-[rgba(118,138,166,0.18)] bg-white/[0.035] text-[rgba(245,237,214,0.58)]">{item.finalStatus}</Pill>
          </div>
          <h3 className="mt-3 font-semibold text-[#F5EDD6]">{item.productInterest.join(", ") || "Chưa rõ sản phẩm"}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[rgba(245,237,214,0.58)]">{compact ? shortText(item.conversationSummary, 180) : item.conversationSummary}</p>
        </div>
        <div className="text-sm text-[rgba(245,237,214,0.34)]">{formatDate(item.updatedAt)}</div>
      </div>
      {!compact ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <InfoBlock label="Nhu cầu" value={item.customerNeed} />
          <InfoBlock label="Từ chối/lo ngại" value={item.objections.join(", ") || "Chưa thấy rõ"} />
          <InfoBlock label="Bước tiếp theo" value={item.nextBestAction} />
        </div>
      ) : null}
    </div>
  );
}
