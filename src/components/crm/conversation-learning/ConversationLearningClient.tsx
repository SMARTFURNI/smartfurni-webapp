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

type TabKey = "overview" | "care-plans" | "conversations" | "analysis" | "scripts" | "workflows";

const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "overview", label: "Tổng quan", icon: BrainCircuit },
  { key: "care-plans", label: "Kế hoạch hằng ngày", icon: CalendarCheck2 },
  { key: "conversations", label: "Hội thoại nguồn", icon: MessageSquareText },
  { key: "analysis", label: "Phân tích lead", icon: Bot },
  { key: "scripts", label: "Script sale", icon: FileText },
  { key: "workflows", label: "Workflow", icon: GitBranch },
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
  };
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

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-amber-200/10 bg-white/[0.055] shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", className)}>
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
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-amber-500 text-black shadow-[0_12px_35px_rgba(245,158,11,0.28)] hover:bg-amber-400"
          : "border border-white/10 bg-white/5 text-amber-100 hover:bg-white/10"
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

  const topHotAnalyses = useMemo(
    () => analyses.filter(item => item.leadTemperature === "hot").slice(0, 5),
    [analyses]
  );

  const filteredCarePlans = useMemo(
    () => (careCenter?.plans || []).filter(plan =>
      (careStatusFilter === "all" || plan.status === careStatusFilter) &&
      (carePageFilter === "all" || plan.pageInternalId === carePageFilter)
    ),
    [careCenter?.plans, carePageFilter, careStatusFilter]
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

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center text-amber-100">
        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
        Đang mở bộ học hội thoại...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-stone-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500 text-black shadow-[0_14px_40px_rgba(245,158,11,0.32)]">
            <BrainCircuit className="h-8 w-8" />
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-amber-300">
              <Sparkles className="h-4 w-4" />
              AI Customer Care Center
            </p>
            <h1 className="mt-2 text-3xl font-black text-white">Trung tâm AI chăm sóc khách hàng Fanpage</h1>
            <p className="mt-2 max-w-3xl text-sm text-stone-400">
              Đồng bộ từng Fanpage mỗi ngày, phân tích hội thoại, lập kế hoạch riêng cho từng khách tiềm năng và gửi
              thông báo PWA đến đúng người phụ trách. AI không tự nhắn khách.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={loadAll} loading={actionLoading === "reload"} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Tải lại dữ liệu
          </ActionButton>
          <ActionButton onClick={runAnalyze} loading={actionLoading === "analyze"}>
            Phân tích 50 hội thoại
          </ActionButton>
          {careCenter?.permissions.canRun ? (
            <ActionButton onClick={runDailyCareCenter} loading={actionLoading === "daily-care"}>
              <Sparkles className="h-4 w-4" />
              Chạy AI Fanpage ngay
            </ActionButton>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card className="border-red-300/20 bg-red-500/10 p-4 text-red-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.055] p-2 md:grid-cols-2 xl:grid-cols-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition",
                active ? "bg-amber-500 text-black shadow-[0_12px_32px_rgba(245,158,11,0.25)]" : "text-stone-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Fanpage đang theo dõi" value={careCenter?.overview.totalPages ?? 0} icon={MessageSquareText} />
            <Metric label="Lead tiềm năng hôm nay" value={careCenter?.overview.qualifiedLeadsToday ?? 0} icon={Users} />
            <Metric label="Lead nóng hôm nay" value={careCenter?.overview.hotLeadsToday ?? 0} icon={Flame} />
            <Metric label="Kế hoạch chờ xử lý" value={careCenter?.overview.pendingPlans ?? 0} icon={CalendarCheck2} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <Card className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <SectionTitle
                  title="Tình trạng từng Fanpage"
                  subtitle="Mỗi Fanpage được đồng bộ riêng; số liệu không trộn giữa các trang."
                />
                <Pill className="border-emerald-300/25 bg-emerald-500/10 text-emerald-100">
                  <BellRing className="mr-1.5 h-3.5 w-3.5" />
                  {careCenter?.overview.pushSentToday ?? 0} kế hoạch đã thông báo PWA
                </Pill>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {(careCenter?.overview.pages || []).map(page => (
                  <button
                    key={page.pageInternalId}
                    type="button"
                    onClick={() => {
                      setCarePageFilter(page.pageInternalId);
                      setActiveTab("care-plans");
                    }}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-amber-300/25 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-black text-white">{page.pageName}</h3>
                      {page.hotLeads > 0 ? (
                        <Pill className="border-red-300/30 bg-red-500/10 text-red-100">{page.hotLeads} nóng</Pill>
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-stone-400">
                      <span>{page.conversationCount} hội thoại</span>
                      <span>{page.qualifiedLeads} tiềm năng</span>
                      <span>{page.pendingPlans} chờ xử lý</span>
                    </div>
                    <p className="mt-3 text-xs text-stone-500">Đồng bộ: {formatDate(page.lastSyncedAt)}</p>
                  </button>
                ))}
                {!careCenter?.overview.pages.length ? (
                  <EmptyState text="Chưa có dữ liệu đồng bộ Fanpage. Quản lý có thể bấm “Chạy AI Fanpage ngay”." />
                ) : null}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-xl font-black text-white">Lần chạy gần nhất</h2>
              {careCenter?.overview.lastRun ? (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Trạng thái</span>
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
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Metric label="Đã phân tích" value={overview?.totalAnalyzed ?? 0} icon={Database} />
            <Metric label="Cần kiểm tra" value={overview?.needHumanReview ?? 0} icon={AlertTriangle} />
            <Metric label="Lead nóng" value={overview?.hotLeads ?? 0} icon={Users} />
            <Metric label="Script nháp" value={overview?.draftScripts ?? 0} icon={FileText} />
            <Metric label="Script duyệt" value={overview?.approvedScripts ?? 0} icon={CheckCircle2} />
            <Metric label="Workflow bật" value={overview?.activeWorkflows ?? 0} icon={GitBranch} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Lead cần ưu tiên</h2>
                <Pill className="border-amber-300/25 bg-amber-500/10 text-amber-100">Từ hội thoại mới nhất</Pill>
              </div>
              <div className="space-y-3">
                {(topHotAnalyses.length ? topHotAnalyses : analyses.slice(0, 5)).map(item => (
                  <AnalysisRow key={item.id} item={item} compact />
                ))}
                {!analyses.length ? <EmptyState text="Chưa có phân tích. Bấm “Phân tích 50 hội thoại” để bắt đầu." /> : null}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-xl font-black text-white">Quy trình an toàn</h2>
              <div className="mt-4 space-y-3 text-sm text-stone-300">
                <SafetyLine text="AI chỉ phân tích và tạo bản nháp, không tự gửi tin nhắn cho khách." />
                <SafetyLine text="Nếu thiếu dữ liệu sản phẩm/giá/size, kết quả chuyển sang cần người kiểm tra." />
                <SafetyLine text="Script phải được duyệt trước khi đưa vào Knowledge Base." />
                <SafetyLine text="Mọi lần phân tích được ghi log trong agent_actions." />
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <ActionButton onClick={generateScripts} loading={actionLoading === "scripts"} variant="secondary">
                  Tạo script nháp
                </ActionButton>
                <ActionButton onClick={generateWorkflows} loading={actionLoading === "workflows"} variant="secondary">
                  Tạo workflow mẫu
                </ActionButton>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "care-plans" ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Metric label="Chờ xác nhận" value={careCenter?.overview.pendingPlans ?? 0} icon={Clock3} />
            <Metric label="Đang chăm sóc" value={careCenter?.overview.approvedPlans ?? 0} icon={UserRoundCheck} />
            <Metric label="Đã hoàn tất" value={careCenter?.overview.completedPlans ?? 0} icon={CheckCircle2} />
            <Metric label="Lead nóng hôm nay" value={careCenter?.overview.hotLeadsToday ?? 0} icon={Flame} />
            <Metric label="Đã gửi PWA hôm nay" value={careCenter?.overview.pushSentToday ?? 0} icon={BellRing} />
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <SectionTitle
                title="Kế hoạch chăm sóc theo từng khách tiềm năng"
                subtitle="AI tạo nháp theo dữ liệu hội thoại thật. Nhân viên xác nhận trước khi gọi hoặc gửi Messenger/Zalo."
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={careStatusFilter}
                  onChange={event => setCareStatusFilter(event.target.value as FanpageCarePlanStatus | "all")}
                  className="rounded-xl border border-white/10 bg-[#111018] px-3 py-2.5 text-sm text-stone-200 outline-none"
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
                  className="rounded-xl border border-white/10 bg-[#111018] px-3 py-2.5 text-sm text-stone-200 outline-none"
                  aria-label="Lọc Fanpage"
                >
                  <option value="all">Tất cả Fanpage</option>
                  {(careCenter?.overview.pages || []).map(page => (
                    <option key={page.pageInternalId} value={page.pageInternalId}>{page.pageName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {filteredCarePlans.map(plan => {
                const expanded = expandedPlanId === plan.id;
                return (
                  <article
                    key={plan.id}
                    id={`care-plan-${plan.id}`}
                    className={cn(
                      "rounded-2xl border bg-black/20 p-4 transition",
                      plan.leadTemperature === "hot" ? "border-red-300/25" : "border-white/10",
                    )}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill className={toneByTemperature(plan.leadTemperature)}>
                            {CONVERSATION_LEAD_TEMPERATURE_LABELS[plan.leadTemperature]} • {plan.leadScore}/100
                          </Pill>
                          <Pill className={toneByCareStatus(plan.status)}>{careStatusLabel(plan.status)}</Pill>
                          <Pill className="border-sky-300/20 bg-sky-500/10 text-sky-100">{plan.pageName}</Pill>
                          <Pill className="border-white/10 bg-white/5 text-stone-300">
                            {plan.engine === "gemini" ? "Gemini" : "Rules an toàn"} • {Math.round(plan.confidence * 100)}%
                          </Pill>
                        </div>
                        <h3 className="mt-3 text-lg font-black text-white">{plan.customerName}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-stone-300">{plan.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-400">
                          <span>Hạn: {formatDate(plan.dueAt)}</span>
                          <span>•</span>
                          <span>{plan.sourceMessageCount} tin nhắn nguồn</span>
                          <span>•</span>
                          <span>{plan.assignedStaffName || "Chưa phân công"}</span>
                          {plan.notificationSentAt ? (
                            <>
                              <span>•</span>
                              <span className="text-emerald-300">Đã push PWA</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedPlanId(expanded ? null : plan.id)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-stone-200 hover:bg-white/10"
                        >
                          {expanded ? "Thu gọn" : "Xem kế hoạch"}
                        </button>
                        {plan.status === "pending" ? (
                          <button
                            type="button"
                            disabled={actionLoading === `care-${plan.id}`}
                            onClick={() => void patchCarePlan(plan.id, { status: "approved" })}
                            className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black disabled:opacity-50"
                          >
                            Duyệt kế hoạch
                          </button>
                        ) : null}
                        {plan.status === "approved" ? (
                          <button
                            type="button"
                            disabled={actionLoading === `care-${plan.id}`}
                            onClick={() => void patchCarePlan(plan.id, { status: "in_progress" })}
                            className="rounded-xl bg-sky-400 px-3 py-2 text-xs font-black text-[#07111f] disabled:opacity-50"
                          >
                            Bắt đầu chăm sóc
                          </button>
                        ) : null}
                        {plan.status === "in_progress" ? (
                          <button
                            type="button"
                            disabled={actionLoading === `care-${plan.id}`}
                            onClick={() => void patchCarePlan(plan.id, { status: "completed" })}
                            className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-[#06170d] disabled:opacity-50"
                          >
                            Hoàn tất
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {careCenter?.permissions.canAssign ? (
                      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:flex-row sm:items-center">
                        <label className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500" htmlFor={`staff-${plan.id}`}>
                          Người phụ trách
                        </label>
                        <select
                          id={`staff-${plan.id}`}
                          value={plan.assignedStaffId || ""}
                          disabled={actionLoading === `care-${plan.id}`}
                          onChange={event => void patchCarePlan(plan.id, { assignedStaffId: event.target.value || null })}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#111018] px-3 py-2 text-sm text-stone-200 outline-none"
                        >
                          <option value="">Chưa phân công — thông báo Admin</option>
                          {(careCenter.staff || []).map(staff => (
                            <option key={staff.id} value={staff.id}>
                              {staff.fullName} • {staff.pushSubscriptions > 0 ? `${staff.pushSubscriptions} thiết bị PWA` : "chưa bật PWA"}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {expanded ? (
                      <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                        <div className="grid gap-3 lg:grid-cols-3">
                          <InfoBlock label="Nhu cầu" value={plan.customerNeed} />
                          <InfoBlock label="Tín hiệu mua" value={plan.buyingSignals.join(", ") || "Chưa rõ"} />
                          <InfoBlock label="Trở ngại" value={plan.objections.join(", ") || "Chưa thấy rõ"} />
                        </div>
                        <div className="rounded-2xl border border-amber-300/15 bg-amber-500/[0.06] p-4">
                          <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Hành động tốt nhất tiếp theo</div>
                          <p className="mt-2 text-sm leading-relaxed text-amber-50">{plan.nextBestAction}</p>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          {plan.planSteps.map((step, index) => (
                            <div key={`${plan.id}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
                                    Bước {index + 1} • {step.when}
                                  </div>
                                  <h4 className="mt-2 font-black text-white">{step.goal}</h4>
                                </div>
                                <Pill className="border-white/10 bg-black/20 text-stone-300">{step.channel}</Pill>
                              </div>
                              <p className="mt-3 text-sm leading-relaxed text-stone-300">{step.action}</p>
                              {step.draftMessage ? (
                                <div className="mt-3 rounded-xl border border-sky-300/15 bg-sky-500/[0.06] p-3 text-sm leading-relaxed text-sky-100">
                                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-sky-300">Tin nhắn nháp</div>
                                  {step.draftMessage}
                                </div>
                              ) : null}
                              <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Nhân viên phải xác nhận trước khi liên hệ
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {!filteredCarePlans.length ? (
                <EmptyState text="Chưa có kế hoạch phù hợp bộ lọc. AI sẽ tự chạy hằng ngày hoặc quản lý có thể chạy ngay." />
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "conversations" ? (
        <Card className="p-5">
          <SectionTitle title="Hội thoại nguồn" subtitle="Dữ liệu đọc từ bảng conversations, đã che bớt thông tin nhạy cảm trên giao diện." />
          <div className="mt-5 space-y-3">
            {sources.map(source => {
              const latest = source.messages[source.messages.length - 1];
              return (
                <div key={source.conversationId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-white">{source.customerName || "Khách chưa có tên"}</h3>
                        <Pill className="border-white/10 bg-white/5 text-stone-300">{maskPhone(source.facebookUserId)}</Pill>
                        {source.assignedSale ? <Pill className="border-amber-300/25 bg-amber-500/10 text-amber-100">{source.assignedSale}</Pill> : null}
                      </div>
                      <p className="mt-2 text-sm text-stone-400">{shortText(latest?.content || "Không có nội dung tin nhắn", 180)}</p>
                    </div>
                    <div className="text-sm text-stone-500">{formatDate(source.latestMessageAt)}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill className="border-sky-300/20 bg-sky-500/10 text-sky-100">{source.messages.length} tin nhắn</Pill>
                    {source.orderStatus ? <Pill className="border-emerald-300/20 bg-emerald-500/10 text-emerald-100">{source.orderStatus}</Pill> : null}
                    {source.tags.slice(0, 5).map(tag => (
                      <Pill key={tag} className="border-white/10 bg-white/5 text-stone-300">{tag}</Pill>
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
          <SectionTitle title="Phân tích lead" subtitle="Mỗi hội thoại được chấm điểm, phát hiện nhu cầu, từ chối và bước tiếp theo cho sale." />
          <div className="mt-5 space-y-3">
            {analyses.map(item => <AnalysisRow key={item.id} item={item} />)}
            {!analyses.length ? <EmptyState text="Chưa có dữ liệu phân tích." /> : null}
          </div>
        </Card>
      ) : null}

      {activeTab === "scripts" ? (
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SectionTitle title="Script sale AI tạo nháp" subtitle="Quản lý duyệt rồi mới đưa vào Knowledge Base cho các AI agent dùng." />
            <ActionButton onClick={generateScripts} loading={actionLoading === "scripts"}>
              Tạo/cập nhật script nháp
            </ActionButton>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {scripts.map(script => (
              <div key={script.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-white">{script.scriptName}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-amber-300">{script.customerSituation}</p>
                  </div>
                  <Pill className={toneByStatus(script.status)}>{script.status === "approved" ? "Đã duyệt" : "Bản nháp"}</Pill>
                </div>
                <div className="mt-4 space-y-3 text-sm text-stone-300">
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
            <SectionTitle title="Workflow chăm sóc tự động dạng rule" subtitle="MVP tạo luật gợi ý và task cho sale, chưa tự nhắn khách." />
            <ActionButton onClick={generateWorkflows} loading={actionLoading === "workflows"}>
              Tạo workflow mẫu
            </ActionButton>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {workflows.map(workflow => (
              <div key={workflow.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-white">{workflow.workflowName}</h3>
                    <p className="mt-1 text-xs text-stone-500">Ưu tiên {workflow.priority} • {workflow.delayTime}</p>
                  </div>
                  <Pill className={toneByStatus(workflow.status)}>{workflow.status === "approved" ? "Đang bật" : "Bản nháp"}</Pill>
                </div>
                <div className="mt-4 space-y-3 text-sm text-stone-300">
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
    <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
      <span className="text-stone-500">{label}</span>
      <span className="text-right font-semibold text-stone-200">{value}</span>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-500/10 text-amber-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-black text-white">{value}</div>
          <div className="text-xs text-stone-500">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-1 text-sm text-stone-400">{subtitle}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-stone-400">
      {text}
    </div>
  );
}

function SafetyLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <span>{text}</span>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/80">{label}</div>
      <div className="mt-1 leading-relaxed text-stone-300">{value || "-"}</div>
    </div>
  );
}

function AnalysisRow({ item, compact = false }: { item: ConversationAnalysis; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill className={toneByTemperature(item.leadTemperature)}>
              {CONVERSATION_LEAD_TEMPERATURE_LABELS[item.leadTemperature]} • {item.leadScore}/100
            </Pill>
            <Pill className={toneByStatus(item.reviewStatus)}>
              {CONVERSATION_REVIEW_STATUS_LABELS[item.reviewStatus]}
            </Pill>
            <Pill className="border-white/10 bg-white/5 text-stone-300">{item.finalStatus}</Pill>
          </div>
          <h3 className="mt-3 font-black text-white">{item.productInterest.join(", ") || "Chưa rõ sản phẩm"}</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">{compact ? shortText(item.conversationSummary, 180) : item.conversationSummary}</p>
        </div>
        <div className="text-sm text-stone-500">{formatDate(item.updatedAt)}</div>
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
