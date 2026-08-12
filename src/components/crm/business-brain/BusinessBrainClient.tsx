"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Copy,
  Download,
  FileCheck2,
  FileClock,
  FilePenLine,
  FilePlus2,
  FileText,
  Filter,
  GitBranch,
  History,
  LayoutDashboard,
  Library,
  Loader2,
  Network,
  PlayCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessFlowBuilder } from "@/components/crm/business-brain/BusinessFlowBuilder";
import type {
  BusinessBrainFlowEdge,
  BusinessBrainFlowStep,
  KnowledgeCategory,
  KnowledgeDocumentChangeRequest,
  KnowledgeDocument,
  KnowledgeDocumentVersion,
  KnowledgeStatus,
} from "@/types/business-brain";
import { KNOWLEDGE_CATEGORY_LABELS, KNOWLEDGE_STATUS_LABELS } from "@/types/business-brain";

type TabKey = "overview" | "library" | "editor" | "diagram" | "automation" | "agents" | "review" | "testing" | "analytics" | "history";
type Tone = BusinessBrainFlowStep["tone"];

type Capabilities = {
  canEdit: boolean;
  canReview: boolean;
  canPublish: boolean;
  canDelete: boolean;
  canManageAgents: boolean;
};

type GovernanceReport = {
  total: number;
  statuses: Record<string, number>;
  averageHealth: number;
  healthy: number;
  needsAttention: number;
  awaitingReview: number;
  documents: Array<{ document: KnowledgeDocument; health?: { score: number; missing: string[] } }>;
  recentReviews: Array<{ id: string; documentId: string; action: string; actorName?: string; note?: string; createdAt: string }>;
};

type AgentsPayload = {
  agents: Array<{ id: string; name: string; role: string; status: "active" | "inactive"; tools: string[]; allowedActions: string[] }>;
  workflows: Array<{ id: string; name: string; triggerType: string; status: "active" | "inactive"; actions: Record<string, unknown>[] }>;
  actions: Array<{ id: string; agentId: string; agentName?: string; actionType: string; status: string; referencedDocumentIds: string[]; durationMs: number; createdAt: string }>;
};

type DocForm = {
  id?: string;
  title: string;
  category: KnowledgeCategory;
  status: KnowledgeStatus;
  summary: string;
  tagsText: string;
  source: string;
  content: string;
  owner: string;
  audience: string;
  reviewCycle: string;
  documentType: string;
  linkedCrmModulesText: string;
  developmentRequirementsText: string;
  acceptanceCriteriaText: string;
  aiProgrammingPrompt: string;
  codeVersion: string;
  implementationStatus: string;
  changeNote: string;
  flowSteps: BusinessBrainFlowStep[];
  flowEdges: BusinessBrainFlowEdge[];
};

const EMPTY_FORM: DocForm = {
  title: "",
  category: "customer_care",
  status: "draft",
  summary: "",
  tagsText: "",
  source: "manual",
  content: "# Mục tiêu\n\nMô tả mục tiêu của tài liệu.\n\n## Phạm vi áp dụng\n\n- Đối tượng áp dụng\n- Trường hợp áp dụng\n\n## Quy trình thực hiện\n\n1. Bước đầu tiên\n2. Bước tiếp theo\n\n## Tiêu chí hoàn thành\n\nMô tả kết quả cần đạt.",
  owner: "",
  audience: "",
  reviewCycle: "Hàng quý",
  documentType: "process",
  linkedCrmModulesText: "",
  developmentRequirementsText: "",
  acceptanceCriteriaText: "",
  aiProgrammingPrompt: "",
  codeVersion: "Chưa liên kết commit",
  implementationStatus: "specified",
  changeNote: "",
  flowSteps: [],
  flowEdges: [],
};

const TAB_GROUPS: Array<{
  label: string;
  tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }>;
}> = [
  {
    label: "Tra cứu",
    tabs: [
      { key: "overview", label: "Tổng quan", icon: LayoutDashboard },
      { key: "library", label: "Kho tri thức", icon: Library },
    ],
  },
  {
    label: "Xây dựng",
    tabs: [
      { key: "diagram", label: "Quy trình", icon: Network },
      { key: "automation", label: "Tự động hóa", icon: SlidersHorizontal },
      { key: "agents", label: "AI Agents", icon: Bot },
    ],
  },
  {
    label: "Kiểm soát",
    tabs: [
      { key: "review", label: "Kiểm duyệt", icon: FileCheck2 },
      { key: "testing", label: "Kiểm thử", icon: PlayCircle },
      { key: "analytics", label: "Phân tích", icon: Activity },
    ],
  },
];

const CATEGORY_ICONS: Partial<Record<KnowledgeCategory, LucideIcon>> = {
  customer_care: Users,
  sales_process: GitBranch,
  automation: Sparkles,
  governance: ShieldCheck,
  products: BookOpen,
  pricing: FileText,
  policies: FileCheck2,
  marketing: Activity,
};

const TONE_STYLES: Record<Tone, { card: string; icon: string; line: string }> = {
  blue: { card: "border-blue-200 bg-gradient-to-br from-blue-50 to-white", icon: "bg-blue-600 text-white", line: "bg-blue-300" },
  violet: { card: "border-violet-200 bg-gradient-to-br from-violet-50 to-white", icon: "bg-violet-600 text-white", line: "bg-violet-300" },
  emerald: { card: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white", icon: "bg-emerald-600 text-white", line: "bg-emerald-300" },
  amber: { card: "border-amber-200 bg-gradient-to-br from-amber-50 to-white", icon: "bg-amber-500 text-white", line: "bg-amber-300" },
  rose: { card: "border-rose-200 bg-gradient-to-br from-rose-50 to-white", icon: "bg-rose-500 text-white", line: "bg-rose-300" },
};

const FIELD = "w-full rounded-xl border border-[#d9e2ef] bg-white px-3.5 py-2.5 text-[15px] leading-6 text-[#16233b] outline-none transition placeholder:text-[#9aa8bc] focus:border-[#d6aa35] focus:ring-4 focus:ring-[#d6aa35]/10";
const BUTTON_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f3cf68] to-[#d7a51e] px-4 py-2.5 text-sm font-semibold text-[#2e250c] shadow-[0_8px_24px_rgba(203,154,21,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_SECONDARY = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8e1ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#4b5c75] transition hover:border-[#b8c6da] hover:bg-[#f7f9fc] disabled:opacity-50";
const EYEBROW = "text-[11px] font-bold uppercase tracking-[0.22em]";
const SECTION_TITLE = "text-lg font-semibold tracking-[-0.01em] text-[#17243a] md:text-xl";
const SECTION_DESCRIPTION = "mt-1 text-sm leading-6 text-[#718097]";
const FORM_LABEL = "text-[13px] font-semibold leading-5 text-[#5c6d84]";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Không tải được dữ liệu.");
  return data as T;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function flowValue(value: unknown): BusinessBrainFlowStep[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record = objectValue(item);
    const tone = String(record.tone || "blue") as Tone;
    const nodeType = String(record.nodeType || (index === 0 ? "start" : index === value.length - 1 ? "end" : "action"));
    return {
      id: String(record.id || `step-${index + 1}`),
      title: String(record.title || `Bước ${index + 1}`),
      description: String(record.description || ""),
      owner: String(record.owner || ""),
      channel: String(record.channel || ""),
      tone: Object.hasOwn(TONE_STYLES, tone) ? tone : "blue",
      nodeType: (["start", "trigger", "data", "human", "ai", "action", "decision", "delay", "approval", "channel", "crm", "webhook", "end"] as const).includes(nodeType as NonNullable<BusinessBrainFlowStep["nodeType"]>)
        ? nodeType as NonNullable<BusinessBrainFlowStep["nodeType"]>
        : "action",
      config: objectValue(record.config) as BusinessBrainFlowStep["config"],
      x: Number.isFinite(Number(record.x)) ? Number(record.x) : 505,
      y: Number.isFinite(Number(record.y)) ? Number(record.y) : 35 + index * 160,
    };
  });
}

function flowEdgeValue(value: unknown, steps: BusinessBrainFlowStep[]): BusinessBrainFlowEdge[] {
  if (Array.isArray(value)) {
    const ids = new Set(steps.map(step => step.id));
    const parsed = value.map((item, index) => {
      const record = objectValue(item);
      return {
        id: String(record.id || `edge-${index + 1}`),
        source: String(record.source || ""),
        target: String(record.target || ""),
        label: String(record.label || ""),
      };
    }).filter(edge => edge.source !== edge.target && ids.has(edge.source) && ids.has(edge.target));
    return parsed;
  }
  return steps.slice(0, -1).map((step, index) => ({
    id: `legacy-edge-${step.id}-${steps[index + 1].id}`,
    source: step.id,
    target: steps[index + 1].id,
    label: "",
  }));
}

function docToForm(doc: KnowledgeDocument): DocForm {
  const metadata = objectValue(doc.metadata);
  const steps = flowValue(metadata.flowSteps);
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    status: doc.status,
    summary: doc.summary || "",
    tagsText: doc.tags.join(", "),
    source: doc.source || "manual",
    content: doc.content,
    owner: String(metadata.owner || ""),
    audience: String(metadata.audience || ""),
    reviewCycle: String(metadata.reviewCycle || "Hàng quý"),
    documentType: String(metadata.documentType || "guide"),
    linkedCrmModulesText: Array.isArray(metadata.linkedCrmModules) ? metadata.linkedCrmModules.map(String).join(", ") : "",
    developmentRequirementsText: Array.isArray(metadata.developmentRequirements) ? metadata.developmentRequirements.map(String).join("\n") : "",
    acceptanceCriteriaText: Array.isArray(metadata.acceptanceCriteria) ? metadata.acceptanceCriteria.map(String).join("\n") : "",
    aiProgrammingPrompt: String(metadata.aiProgrammingPrompt || ""),
    codeVersion: String(metadata.codeVersion || "Chưa liên kết commit"),
    implementationStatus: String(metadata.implementationStatus || "specified"),
    changeNote: "",
    flowSteps: steps,
    flowEdges: flowEdgeValue(metadata.flowEdges, steps),
  };
}

function formatDate(value?: string, withTime = true) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", withTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "long" });
}

function statusClass(status: KnowledgeStatus) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "approved" || status === "scheduled") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "in_review") return "border-violet-200 bg-violet-50 text-violet-700";
  if (status === "expired") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "archived") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function StatusBadge({ status }: { status: KnowledgeStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", statusClass(status))}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {KNOWLEDGE_STATUS_LABELS[status]}
    </span>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-[#dfe6f0] bg-white shadow-[0_12px_38px_rgba(32,56,92,0.07)]", className)}>{children}</section>;
}

function DocumentPreview({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-2 text-[15px] leading-7 text-[#52627a]">
      {lines.map((raw, index) => {
        const line = raw.trim();
        if (!line) return <div key={index} className="h-1" />;
        if (line.startsWith("# ")) return <h2 key={index} className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#152238]">{line.slice(2)}</h2>;
        if (line.startsWith("## ")) return <h3 key={index} className="mt-5 text-lg font-bold text-[#1d2d47]">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={index} className="mt-4 font-bold text-[#243650]">{line.slice(4)}</h4>;
        if (/^[-*] /.test(line)) return <div key={index} className="flex gap-2.5"><CheckCircle2 className="mt-1.5 shrink-0 text-emerald-500" size={15} /><span>{line.slice(2)}</span></div>;
        if (/^\d+\. /.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          return <div key={index} className="flex gap-2.5"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff4cd] text-[10px] font-bold text-[#977018]">{match?.[1]}</span><span>{match?.[2]}</span></div>;
        }
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

function FlowDiagram({ steps, compact = false }: { steps: BusinessBrainFlowStep[]; compact?: boolean }) {
  if (!steps.length) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd9e7] bg-[#f8fafd] px-6 text-center">
        <Network className="text-[#a9b6c9]" size={34} />
        <p className="mt-3 font-bold text-[#34455f]">Tài liệu chưa có sơ đồ</p>
        <p className="mt-1 text-sm text-[#7b8aa1]">Thêm các bước trong tab Sơ đồ quy trình.</p>
      </div>
    );
  }
  return (
    <div className={cn("mx-auto", compact ? "max-w-5xl" : "max-w-6xl")}>
      <div className="mb-2 hidden grid-cols-[56px_minmax(0,1fr)_180px_160px] gap-3 px-1 md:grid">
        <span />
        <span className={cn(EYEBROW, "text-[#8794a7]")}>Nội dung & kết quả</span>
        <span className={cn(EYEBROW, "text-[#8794a7]")}>Phụ trách</span>
        <span className={cn(EYEBROW, "text-[#8794a7]")}>Kênh thực hiện</span>
      </div>
      <div className="relative">
        {steps.map((step, index) => {
          const tone = TONE_STYLES[step.tone];
          const isLast = index === steps.length - 1;
          return (
            <div key={step.id} className={cn("relative grid gap-3", !isLast && (compact ? "pb-3" : "pb-4"), "md:grid-cols-[56px_minmax(0,1fr)_180px_160px] md:items-stretch")}>
              <div className="relative flex justify-center md:block">
                {!isLast && <span className={cn("absolute left-1/2 top-10 h-[calc(100%+4px)] w-0.5 -translate-x-1/2 rounded-full", tone.line)} />}
                <div className={cn("relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-xs font-bold shadow-md", tone.icon)}>
                  {String(index + 1).padStart(2, "0")}
                </div>
              </div>

              <article className={cn("rounded-2xl border p-4 shadow-sm", tone.card)}>
                <h4 className="text-base font-semibold leading-6 text-[#17253d]">{step.title}</h4>
                <p className="mt-1.5 text-sm leading-6 text-[#64758c]">{step.description || "Chưa có mô tả cho bước này."}</p>
              </article>

              <div className="rounded-2xl border border-[#dfe6ef] bg-[#f8fafd] p-4">
                <p className={cn(EYEBROW, "md:hidden text-[#8b98aa]")}>Phụ trách</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#40516a] md:mt-0">{step.owner || "Chưa phân công"}</p>
              </div>

              <div className="rounded-2xl border border-[#dfe6ef] bg-white p-4">
                <p className={cn(EYEBROW, "md:hidden text-[#8b98aa]")}>Kênh thực hiện</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#40516a] md:mt-0">{step.channel || "Chưa xác định"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BusinessBrainClient({ capabilities }: { capabilities: Capabilities }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [versions, setVersions] = useState<KnowledgeDocumentVersion[]>([]);
  const [changeRequests, setChangeRequests] = useState<KnowledgeDocumentChangeRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<DocForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory | "all">("all");
  const [status, setStatus] = useState<KnowledgeStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(true);
  const [governance, setGovernance] = useState<GovernanceReport | null>(null);
  const [agentData, setAgentData] = useState<AgentsPayload | null>(null);
  const [testQuestion, setTestQuestion] = useState("Khách hỏi giá sofa giường 1m6 và giao tại TP.HCM");
  const [testResult, setTestResult] = useState<{ matches: KnowledgeDocument[]; answer: string } | null>(null);

  const selected = useMemo(() => docs.find(doc => doc.id === selectedId) || null, [docs, selectedId]);

  const loadDocs = useCallback(async (preferId?: string | null) => {
    const data = await fetchJson<{ documents: KnowledgeDocument[] }>("/api/crm/business-brain/knowledge?limit=200");
    setDocs(data.documents);
    const nextId = preferId === null
      ? data.documents[0]?.id || ""
      : preferId || selectedId || data.documents[0]?.id || "";
    setSelectedId(nextId);
    const found = data.documents.find(item => item.id === nextId);
    if (found) setForm(docToForm(found));
  }, [selectedId]);

  const loadVersions = useCallback(async (documentId: string) => {
    if (!documentId) return setVersions([]);
    const data = await fetchJson<{ versions: KnowledgeDocumentVersion[] }>(`/api/crm/business-brain/knowledge?documentId=${encodeURIComponent(documentId)}`);
    setVersions(data.versions);
  }, []);

  const loadOperationalData = useCallback(async () => {
    const [governanceData, agentsData, requestData] = await Promise.all([
      fetchJson<{ governance: GovernanceReport }>("/api/crm/business-brain/governance"),
      fetchJson<AgentsPayload>("/api/crm/business-brain/agents"),
      fetchJson<{ requests: KnowledgeDocumentChangeRequest[] }>("/api/crm/business-brain/change-requests?limit=200"),
    ]);
    setGovernance(governanceData.governance);
    setAgentData(agentsData);
    setChangeRequests(requestData.requests);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDocs(), loadOperationalData()]).catch(err => setError(err instanceof Error ? err.message : "Không tải được dữ liệu."))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "history" && selectedId) void loadVersions(selectedId);
  }, [activeTab, loadVersions, selectedId]);

  const filteredDocs = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return docs.filter(doc => {
      if (category !== "all" && doc.category !== category) return false;
      if (status !== "all" && doc.status !== status) return false;
      if (!keyword) return true;
      return `${doc.title} ${doc.summary || ""} ${doc.tags.join(" ")} ${doc.content}`.toLocaleLowerCase("vi").includes(keyword);
    }).sort((left, right) => {
      const leftSequence = Number(objectValue(left.metadata).sequence || Number.MAX_SAFE_INTEGER);
      const rightSequence = Number(objectValue(right.metadata).sequence || Number.MAX_SAFE_INTEGER);
      const leftIsSpecification = left.source === "crm-automation-spec-v1.0";
      const rightIsSpecification = right.source === "crm-automation-spec-v1.0";
      if (leftIsSpecification !== rightIsSpecification) return leftIsSpecification ? -1 : 1;
      if (leftIsSpecification && rightIsSpecification) return leftSequence - rightSequence;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [category, docs, search, status]);

  const specificationDocs = useMemo(() => docs
    .filter(doc => doc.source === "crm-automation-spec-v1.0")
    .sort((left, right) => Number(objectValue(left.metadata).sequence || 99) - Number(objectValue(right.metadata).sequence || 99)), [docs]);

  const stats = useMemo(() => ({
    all: docs.length,
    active: docs.filter(doc => doc.status === "active").length,
    draft: docs.filter(doc => doc.status === "draft").length,
    diagrams: docs.filter(doc => flowValue(objectValue(doc.metadata).flowSteps).length > 0).length,
  }), [docs]);

  const openDoc = (doc: KnowledgeDocument, tab: TabKey = "editor") => {
    setSelectedId(doc.id);
    setForm(docToForm(doc));
    setActiveTab(tab);
    setError("");
    setSuccess("");
  };

  const newDoc = () => {
    if (!capabilities.canEdit) return setError("Bạn không có quyền biên soạn tài liệu.");
    setSelectedId("");
    setForm({ ...EMPTY_FORM, flowSteps: [], flowEdges: [] });
    setActiveTab("editor");
    setError("");
  };

  const saveDoc = async () => {
    if (!capabilities.canEdit) return setError("Bạn không có quyền biên soạn tài liệu.");
    if (!form.title.trim() || !form.content.trim()) return setError("Cần nhập tiêu đề và nội dung tài liệu.");
    if (form.id && !form.changeNote.trim()) return setError("Cần mô tả lý do và phạm vi cập nhật để gửi người có quyền xác nhận.");
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        id: form.id,
        title: form.title.trim(),
        category: form.category,
        status: form.id ? form.status : "draft",
        summary: form.summary.trim(),
        tags: form.tagsText.split(",").map(item => item.trim()).filter(Boolean),
        source: form.source || "manual",
        content: form.content,
        changeNote: form.changeNote.trim() || undefined,
        metadata: {
          ...(selected ? objectValue(selected.metadata) : {}),
          owner: form.owner.trim(),
          audience: form.audience.trim(),
          reviewCycle: form.reviewCycle.trim(),
          documentType: form.documentType,
          linkedCrmModules: form.linkedCrmModulesText.split(",").map(item => item.trim()).filter(Boolean),
          developmentRequirements: form.developmentRequirementsText.split("\n").map(item => item.trim()).filter(Boolean),
          acceptanceCriteria: form.acceptanceCriteriaText.split("\n").map(item => item.trim()).filter(Boolean),
          aiProgrammingPrompt: form.aiProgrammingPrompt.trim(),
          codeVersion: form.codeVersion.trim(),
          implementationStatus: form.implementationStatus,
          flowSteps: form.flowSteps,
          flowEdges: form.flowEdges,
        },
      };
      const data = await fetchJson<{ document?: KnowledgeDocument; changeRequest?: KnowledgeDocumentChangeRequest; requiresApproval?: boolean }>("/api/crm/business-brain/knowledge", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (data.requiresApproval && data.changeRequest) {
        await loadOperationalData();
        setSuccess("Đã tạo yêu cầu thay đổi. Tài liệu hiện tại chưa bị sửa và đang chờ quản trị viên xác nhận.");
        setForm(prev => ({ ...prev, changeNote: "" }));
      } else if (data.document) {
        await loadDocs(data.document.id);
        setSuccess("Đã tạo tài liệu nháp và phiên bản đầu tiên.");
        setForm(prev => ({ ...prev, id: data.document?.id, changeNote: "" }));
        if (activeTab === "history") await loadVersions(data.document.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được tài liệu.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateDoc = () => {
    setSelectedId("");
    setForm(prev => ({ ...prev, id: undefined, title: `${prev.title} — Bản sao`, status: "draft", changeNote: "Nhân bản tài liệu", source: "manual" }));
    setActiveTab("editor");
  };

  const deleteDoc = async () => {
    if (!capabilities.canDelete) return setError("Bạn không có quyền lưu trữ tài liệu.");
    if (!form.id || !window.confirm("Chuyển tài liệu này vào lưu trữ? Có thể phục hồi từ lịch sử quản trị.")) return;
    setSaving(true);
    try {
      await fetchJson(`/api/crm/business-brain/knowledge?id=${encodeURIComponent(form.id)}`, { method: "DELETE" });
      setSelectedId("");
      setForm({ ...EMPTY_FORM, flowSteps: [], flowEdges: [] });
      await loadDocs(null);
      setActiveTab("library");
      setSuccess("Đã chuyển tài liệu vào lưu trữ.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được tài liệu.");
    } finally {
      setSaving(false);
    }
  };

  const reviewDocument = async (document: KnowledgeDocument, toStatus: KnowledgeStatus, reviewAction: string) => {
    if (toStatus === "in_review" ? !capabilities.canEdit : !capabilities.canReview) {
      return setError(toStatus === "in_review" ? "Bạn không có quyền gửi kiểm duyệt." : "Bạn không có quyền kiểm duyệt.");
    }
    setSaving(true);
    try {
      const data = await fetchJson<{ document: KnowledgeDocument }>("/api/crm/business-brain/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", id: document.id, toStatus, reviewAction }),
      });
      await Promise.all([loadDocs(data.document.id), loadOperationalData()]);
      setSuccess(`${reviewAction}: ${document.title}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được kiểm duyệt.");
    } finally {
      setSaving(false);
    }
  };

  const decideChangeRequest = async (request: KnowledgeDocumentChangeRequest, decision: "approved" | "rejected") => {
    if (!capabilities.canReview) return setError("Bạn không có quyền xác nhận cập nhật tài liệu.");
    const note = window.prompt(decision === "approved" ? "Ghi chú xác nhận (không bắt buộc)" : "Lý do từ chối yêu cầu", "") || "";
    if (decision === "rejected" && !note.trim()) return setError("Cần nhập lý do từ chối để người đề xuất biết cần sửa gì.");
    setSaving(true);
    setError("");
    try {
      const data = await fetchJson<{ document?: KnowledgeDocument }>("/api/crm/business-brain/change-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, decision, note }),
      });
      await Promise.all([loadDocs(data.document?.id || selectedId), loadOperationalData()]);
      setSuccess(decision === "approved" ? "Đã xác nhận và áp dụng thay đổi vào tài liệu chính thức." : "Đã từ chối yêu cầu; tài liệu chính thức không thay đổi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xử lý được yêu cầu thay đổi.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAgentStatus = async (agent: NonNullable<AgentsPayload>["agents"][number]) => {
    if (!capabilities.canManageAgents) return setError("Bạn không có quyền quản lý AI Agent.");
    setSaving(true);
    try {
      await fetchJson("/api/crm/business-brain/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agent.id, status: agent.status === "active" ? "inactive" : "active" }),
      });
      await loadOperationalData();
      setSuccess(`${agent.name} đã được ${agent.status === "active" ? "tạm dừng" : "kích hoạt"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được Agent.");
    } finally {
      setSaving(false);
    }
  };

  const runKnowledgeTest = () => {
    const tokens = testQuestion.toLocaleLowerCase("vi").split(/\s+/).filter(token => token.length > 2);
    const matches = docs.filter(doc => doc.status === "active").map(doc => ({
      doc,
      score: tokens.filter(token => `${doc.title} ${doc.summary || ""} ${doc.tags.join(" ")} ${doc.content}`.toLocaleLowerCase("vi").includes(token)).length,
    })).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(item => item.doc);
    setTestResult({
      matches,
      answer: matches.length ? `Đã tìm thấy ${matches.length} nguồn đang áp dụng. AI chỉ nên trả lời bằng nội dung trong các tài liệu bên dưới và chuyển người kiểm tra nếu thiếu giá/khu vực.` : "Không tìm thấy tài liệu đang áp dụng phù hợp. Cần tạo yêu cầu bổ sung tri thức.",
    });
  };

  const restoreVersion = async (version: KnowledgeDocumentVersion) => {
    if (!form.id || !window.confirm(`Khôi phục phiên bản ${version.version}? Nội dung hiện tại vẫn được lưu trong lịch sử.`)) return;
    setSaving(true);
    try {
      const data = await fetchJson<{ changeRequest: KnowledgeDocumentChangeRequest }>("/api/crm/business-brain/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id, versionId: version.id, changeNote: `Đề xuất khôi phục phiên bản ${version.version}` }),
      });
      await loadOperationalData();
      setSuccess(`Đã tạo yêu cầu khôi phục phiên bản ${version.version}; nội dung chỉ đổi sau khi được xác nhận.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không khôi phục được phiên bản.");
    } finally {
      setSaving(false);
    }
  };

  const exportDocument = (kind: "markdown" | "json") => {
    const slug = (form.title || "tai-lieu-smartfurni").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (kind === "markdown") return downloadFile(`${slug}.md`, form.content, "text/markdown;charset=utf-8");
    downloadFile(`${slug}.json`, JSON.stringify({ ...form, tags: form.tagsText.split(",").map(item => item.trim()).filter(Boolean) }, null, 2), "application/json;charset=utf-8");
  };

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#f3f6fb] font-sans text-[15px] leading-6 text-[#17243a]">
      <div className="mx-auto max-w-[1680px] p-4 md:p-6">
        <header className="overflow-hidden rounded-3xl border border-[#ead9a8] bg-white shadow-[0_16px_50px_rgba(40,57,88,0.08)]">
          <div className="relative flex flex-col gap-5 overflow-hidden bg-[radial-gradient(circle_at_92%_10%,rgba(230,189,70,0.18),transparent_26%),linear-gradient(120deg,#ffffff_0%,#fffdf7_58%,#faf4df_100%)] px-5 py-6 md:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="absolute -right-10 -top-24 h-56 w-56 rounded-full border-[28px] border-[#e9c454]/10" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#e7c967] bg-gradient-to-br from-[#fff8d8] to-[#f4cd55] text-[#7a5c08] shadow-lg shadow-[#d2a92e]/15">
                <BrainCircuit size={28} />
              </div>
              <div>
                <div className={cn(EYEBROW, "flex items-center gap-2 text-[#aa7c13]")}><Sparkles size={13} /> SmartFurni Business Brain</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#142036] md:text-3xl">Bộ não doanh nghiệp</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#718097]">Nơi lưu trữ hướng dẫn, chính sách và sơ đồ vận hành chính thức trước khi chuyển thành chức năng trong CRM.</p>
              </div>
            </div>
            <div className="relative flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><ShieldCheck size={15} /> {stats.active} tài liệu đang dùng</span>
              <button className={BUTTON_SECONDARY} onClick={() => void loadDocs()}><RefreshCw size={15} /> Làm mới</button>
              {capabilities.canEdit && <button className={BUTTON_PRIMARY} onClick={newDoc}><FilePlus2 size={16} /> Tạo tài liệu</button>}
            </div>
          </div>
          <nav className="flex gap-3 overflow-x-auto border-t border-[#edf0f5] bg-[#fbfcfe] px-3 py-2.5 md:px-5" aria-label="Điều hướng Bộ não doanh nghiệp">
            {TAB_GROUPS.map((group, groupIndex) => (
              <div key={group.label} className={cn("flex shrink-0 items-center gap-1 rounded-2xl border border-[#e3e8f0] bg-white p-1", groupIndex > 0 && "ml-0 md:ml-1")}>
                <span className={cn(EYEBROW, "hidden px-2 text-[#9aa6b6] xl:inline")}>{group.label}</span>
                {group.tabs.map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition", active ? "border-[#e7c65f] bg-gradient-to-r from-[#fff8df] to-[#ffefb8] text-[#805e0e] shadow-sm" : "border-transparent text-[#687990] hover:bg-[#f5f7fa] hover:text-[#32445e]")}>
                      <Icon size={16} /> {tab.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </header>

        {(error || success) && (
          <div className={cn("mt-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold", error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
            <span>{error || success}</span><button onClick={() => { setError(""); setSuccess(""); }}><X size={16} /></button>
          </div>
        )}

        {loading ? (
          <Panel className="mt-5 flex min-h-[520px] items-center justify-center"><div className="flex items-center gap-3 text-[#73839a]"><Loader2 className="animate-spin text-[#c99920]" /> Đang chuẩn bị thư viện hướng dẫn...</div></Panel>
        ) : (
          <main className="mt-5">
            {selected && (["editor", "diagram", "history"] as TabKey[]).includes(activeTab) && (
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#dfe6ef] bg-white p-3 shadow-[0_8px_24px_rgba(38,55,86,0.05)] lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 px-2"><p className={cn(EYEBROW, "text-[#a87c15]")}>Đang làm việc</p><p className="truncate text-sm font-semibold text-[#273851]">{selected.title}</p></div>
                <div className="flex gap-1 overflow-x-auto rounded-xl bg-[#f4f7fb] p-1">
                  {[
                    { key: "editor" as const, label: "Nội dung", icon: FilePenLine },
                    { key: "diagram" as const, label: "Sơ đồ", icon: Network },
                    { key: "history" as const, label: "Phiên bản", icon: History },
                  ].map(item => { const Icon = item.icon; return <button key={item.key} onClick={() => setActiveTab(item.key)} className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold", activeTab === item.key ? "bg-white text-[#946b0c] shadow-sm" : "text-[#687990]")}><Icon size={15} />{item.label}</button>; })}
                </div>
              </div>
            )}
            {activeTab === "overview" && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Tổng tài liệu", value: stats.all, hint: "Toàn bộ thư viện", icon: BookOpen, tone: "border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-600" },
                    { label: "Đang áp dụng", value: stats.active, hint: "AI và nhân viên được dùng", icon: FileCheck2, tone: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-600" },
                    { label: "Đang soạn", value: stats.draft, hint: "Chưa dùng để vận hành", icon: FileClock, tone: "border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-600" },
                    { label: "Có sơ đồ", value: stats.diagrams, hint: "Quy trình nhìn trực quan", icon: Network, tone: "border-violet-200 bg-gradient-to-br from-violet-50 to-white text-violet-600" },
                  ].map(item => {
                    const Icon = item.icon;
                    return <Panel key={item.label} className={cn("border p-5", item.tone)}><div className="flex items-start justify-between"><div><p className={cn(EYEBROW, "opacity-70")}>{item.label}</p><p className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#17243a]">{item.value}</p><p className="mt-1 text-sm leading-6 text-[#738198]">{item.hint}</p></div><div className="rounded-xl bg-white p-2.5 shadow-sm"><Icon size={21} /></div></div></Panel>;
                  })}
                </div>

                <Panel className="overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-[#e6ebf2] bg-gradient-to-r from-[#fffdf7] to-[#f4f8ff] px-5 py-5 md:flex-row md:items-center md:justify-between">
                    <div><p className={cn(EYEBROW, "text-[#b18216]")}>Bản đồ vận hành</p><h2 className={cn(SECTION_TITLE, "mt-1")}>Từ tài liệu đến chức năng CRM</h2><p className={SECTION_DESCRIPTION}>Chỉ triển khai chức năng sau khi hướng dẫn đã rõ chủ sở hữu, quy trình và cổng kiểm soát.</p></div>
                    <button onClick={() => setActiveTab("diagram")} className={BUTTON_SECONDARY}>Xem sơ đồ <ArrowRight size={15} /></button>
                  </div>
                  <div className="p-5">
                    <FlowDiagram compact steps={[
                      { id: "overview-write", title: "Viết hướng dẫn", description: "Xác định mục tiêu, quy tắc và biểu mẫu đầu ra.", owner: "Chủ quy trình", channel: "Tài liệu", tone: "amber" },
                      { id: "overview-approve", title: "Phê duyệt áp dụng", description: "Người có thẩm quyền xác nhận nội dung được dùng.", owner: "Quản lý", channel: "Phê duyệt", tone: "emerald" },
                      { id: "overview-build", title: "Chuyển thành chức năng", description: "Chuẩn hóa trigger, dữ liệu và hành động trong CRM.", owner: "Sản phẩm & IT", channel: "CRM", tone: "blue" },
                      { id: "overview-measure", title: "Đo lường & cập nhật", description: "Kết quả vận hành quay lại tài liệu cho lần cải tiến tiếp theo.", owner: "Chủ quy trình", channel: "Báo cáo", tone: "violet" },
                    ]} />
                  </div>
                </Panel>

                <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                  <Panel className="p-5">
                    <div className="mb-4 flex items-center justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className={SECTION_TITLE}>Bộ đặc tả tự động hóa CRM</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{specificationDocs.length}/10 tài liệu</span></div><p className={SECTION_DESCRIPTION}>Phiên bản 1.0 · Bao phủ 19 chương nghiệp vụ và kỹ thuật.</p></div><button onClick={() => { setSearch("SF-AUTO-"); setActiveTab("library"); }} className="shrink-0 text-sm font-semibold text-[#9b7317]">Xem bộ tài liệu →</button></div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {specificationDocs.map(doc => {
                        const Icon = CATEGORY_ICONS[doc.category] || FileText;
                        const meta = objectValue(doc.metadata);
                        return <button key={doc.id} onClick={() => openDoc(doc)} className="group rounded-2xl border border-[#e0e6ef] bg-[#fbfcfe] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#dfbd58] hover:bg-white hover:shadow-md"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#fff4cc] p-2.5 text-[#9a7215]"><Icon size={19} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b0841e]">{String(meta.documentCode || "SF-AUTO")}</p><h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-6 text-[#1b2b44]">{doc.title.replace(/^SF-AUTO-\d+\s*·\s*/, "")}</h3></div><ChevronRight className="shrink-0 text-[#a4b0c1] group-hover:text-[#b1841a]" size={17} /></div><p className="mt-1 line-clamp-2 text-sm leading-6 text-[#718096]">{doc.summary}</p></div></div></button>;
                      })}
                      {!specificationDocs.length && <div className="col-span-full rounded-2xl border border-dashed border-[#dce4ee] bg-[#fbfcfe] p-8 text-center text-sm text-[#7b899c]">Bộ đặc tả sẽ được nạp tự động khi kết nối cơ sở dữ liệu.</div>}
                    </div>
                  </Panel>
                  <Panel className="p-5">
                    <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><ShieldCheck size={21} /></div><div><h2 className="text-[15px] font-semibold">Quy tắc sử dụng</h2><p className="text-sm text-[#77869a]">Nguồn chuẩn duy nhất</p></div></div>
                    <div className="mt-5 space-y-4">
                      {["Tài liệu Đang dùng mới được AI tham chiếu", "Mọi cập nhật đều có lịch sử phiên bản", "Quy trình phải có người chịu trách nhiệm", "Chức năng CRM phải dẫn chiếu hướng dẫn"].map((item, index) => <div key={item} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-600">{index + 1}</span><p className="text-sm leading-6 text-[#607087]">{item}</p></div>)}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {activeTab === "library" && (
              <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                <Panel className="h-fit p-4 xl:sticky xl:top-4">
                  <div className="flex items-center gap-2 text-[15px] font-semibold"><Filter size={17} className="text-[#b1851c]" /> Bộ lọc tài liệu</div>
                  <div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ba8ba]" size={16} /><input className={cn(FIELD, "pl-9")} value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm nội dung..." /></div>
                  <label className={cn(FORM_LABEL, "mt-4 block")}>Danh mục<select className={cn(FIELD, "mt-1.5")} value={category} onChange={event => setCategory(event.target.value as KnowledgeCategory | "all")}><option value="all">Tất cả danh mục</option>{Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className={cn(FORM_LABEL, "mt-4 block")}>Trạng thái<select className={cn(FIELD, "mt-1.5")} value={status} onChange={event => setStatus(event.target.value as KnowledgeStatus | "all")}><option value="all">Tất cả trạng thái</option>{Object.entries(KNOWLEDGE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <div className="mt-5 rounded-xl bg-[#f5f8fc] p-3 text-sm leading-6 text-[#718097]"><b>{filteredDocs.length}</b> tài liệu phù hợp. Dùng tag và danh mục để AI tìm đúng hướng dẫn.</div>
                </Panel>
                <Panel className="overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-[#e5eaf1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className={SECTION_TITLE}>Kho tri thức doanh nghiệp</h2><p className={SECTION_DESCRIPTION}>Tài liệu nghiệp vụ có thể tìm kiếm, kiểm duyệt và tái sử dụng.</p></div>{capabilities.canEdit && <button className={BUTTON_PRIMARY} onClick={newDoc}><Plus size={16} /> Thêm tài liệu</button>}</div>
                  <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredDocs.map(doc => {
                      const Icon = CATEGORY_ICONS[doc.category] || FileText;
                      const meta = objectValue(doc.metadata);
                      return <article key={doc.id} className="flex min-h-60 flex-col rounded-2xl border border-[#dde5ef] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#dfbf62] hover:shadow-[0_12px_30px_rgba(45,64,94,0.1)]"><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-gradient-to-br from-[#fff7d9] to-[#f5df91] p-2.5 text-[#8c6710]"><Icon size={20} /></div><StatusBadge status={doc.status} /></div><div className="mt-4 flex-1"><p className={cn(EYEBROW, "text-[#aa7f1b]")}>{KNOWLEDGE_CATEGORY_LABELS[doc.category]}</p><h3 className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-[#192943]">{doc.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-[#718096]">{doc.summary || doc.content}</p></div><div className="mt-4 flex flex-wrap gap-1.5">{doc.tags.slice(0, 3).map(tag => <span key={tag} className="rounded-full bg-[#f1f5fa] px-2.5 py-1 text-xs font-semibold text-[#65758b]">#{tag}</span>)}</div><div className="mt-4 flex items-center justify-between border-t border-[#edf0f4] pt-3"><div className="text-xs leading-5 text-[#8b98aa]"><span className="font-semibold text-[#607087]">{String(meta.owner || "Chưa giao")}</span><br />{formatDate(doc.updatedAt, false)}</div><button className={BUTTON_SECONDARY} onClick={() => openDoc(doc)}>Mở <ArrowRight size={14} /></button></div></article>;
                    })}
                    {!filteredDocs.length && <div className="col-span-full py-20 text-center text-[#8290a4]"><Search className="mx-auto mb-3" size={32} /><p className="font-bold">Không tìm thấy tài liệu phù hợp</p></div>}
                  </div>
                </Panel>
              </div>
            )}

            {activeTab === "editor" && (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
                <Panel className="overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-[#e4eaf1] bg-[#fbfcfe] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className={cn(EYEBROW, "text-[#ad821b]")}>{form.id ? "Đề xuất chỉnh sửa" : "Tài liệu mới"}</p><h2 className={cn(SECTION_TITLE, "mt-1")}>Nội dung hướng dẫn doanh nghiệp</h2><p className={SECTION_DESCRIPTION}>{form.id ? "Mọi thay đổi chỉ được áp dụng sau khi người có quyền xác nhận." : "Tài liệu mới được tạo ở trạng thái nháp."}</p></div>{capabilities.canEdit && <div className="flex flex-wrap gap-2">{form.id && <button className={BUTTON_SECONDARY} onClick={duplicateDoc}><Copy size={14} /> Nhân bản</button>}<button className={BUTTON_PRIMARY} disabled={saving} onClick={saveDoc}>{saving ? <Loader2 className="animate-spin" size={15} /> : form.id ? <FileCheck2 size={15} /> : <Save size={15} />} {form.id ? "Gửi yêu cầu duyệt" : "Tạo tài liệu nháp"}</button></div>}</div>
                  <div className="space-y-5 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className={cn(FORM_LABEL, "md:col-span-2")}>Tiêu đề tài liệu *<input className={cn(FIELD, "mt-1.5 text-base font-semibold")} value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} placeholder="Ví dụ: Quy trình chăm sóc khách mua lẻ" /></label>
                      <label className={FORM_LABEL}>Danh mục<select className={cn(FIELD, "mt-1.5")} value={form.category} onChange={event => setForm(prev => ({ ...prev, category: event.target.value as KnowledgeCategory }))}>{Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label className={FORM_LABEL}>Trạng thái<input readOnly className={cn(FIELD, "mt-1.5 bg-[#f6f8fb]")} value={KNOWLEDGE_STATUS_LABELS[form.status]} /></label>
                      <label className={cn(FORM_LABEL, "md:col-span-2")}>Tóm tắt<input className={cn(FIELD, "mt-1.5")} value={form.summary} onChange={event => setForm(prev => ({ ...prev, summary: event.target.value }))} placeholder="Một câu giúp nhân viên hiểu tài liệu dùng để làm gì" /></label>
                      <label className={FORM_LABEL}>Người chịu trách nhiệm<input className={cn(FIELD, "mt-1.5")} value={form.owner} onChange={event => setForm(prev => ({ ...prev, owner: event.target.value }))} placeholder="Ví dụ: Trưởng phòng Kinh doanh" /></label>
                      <label className={FORM_LABEL}>Đối tượng áp dụng<input className={cn(FIELD, "mt-1.5")} value={form.audience} onChange={event => setForm(prev => ({ ...prev, audience: event.target.value }))} placeholder="Sale, CSKH, Marketing" /></label>
                      <label className={FORM_LABEL}>Chu kỳ rà soát<input className={cn(FIELD, "mt-1.5")} value={form.reviewCycle} onChange={event => setForm(prev => ({ ...prev, reviewCycle: event.target.value }))} /></label>
                      <label className={FORM_LABEL}>Tag tìm kiếm<input className={cn(FIELD, "mt-1.5")} value={form.tagsText} onChange={event => setForm(prev => ({ ...prev, tagsText: event.target.value }))} placeholder="bán lẻ, Zalo OA, báo giá" /></label>
                    </div>
                    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
                      <div className="flex items-center gap-2"><GitBranch size={18} className="text-blue-600" /><h3 className="font-semibold text-[#1b2b44]">Liên kết tài liệu với chức năng CRM và AI lập trình</h3></div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className={cn(FORM_LABEL, "md:col-span-2")}>Phân hệ CRM liên quan<input className={cn(FIELD, "mt-1.5")} value={form.linkedCrmModulesText} onChange={event => setForm(prev => ({ ...prev, linkedCrmModulesText: event.target.value }))} placeholder="Data Pool, Zalo OA, Email Marketing, Báo giá" /></label>
                        <label className={FORM_LABEL}>Trạng thái triển khai<select className={cn(FIELD, "mt-1.5")} value={form.implementationStatus} onChange={event => setForm(prev => ({ ...prev, implementationStatus: event.target.value }))}><option value="specified">Đã đặc tả</option><option value="planned">Đã lên kế hoạch</option><option value="in_development">Đang lập trình</option><option value="testing">Đang kiểm thử</option><option value="deployed">Đã triển khai</option></select></label>
                        <label className={FORM_LABEL}>Phiên bản code / commit<input className={cn(FIELD, "mt-1.5 font-mono")} value={form.codeVersion} onChange={event => setForm(prev => ({ ...prev, codeVersion: event.target.value }))} placeholder="Ví dụ: c20db45 hoặc release 1.2.0" /></label>
                        <label className={FORM_LABEL}>Yêu cầu phát triển — mỗi dòng một yêu cầu<textarea className={cn(FIELD, "mt-1.5 min-h-36")} value={form.developmentRequirementsText} onChange={event => setForm(prev => ({ ...prev, developmentRequirementsText: event.target.value }))} /></label>
                        <label className={FORM_LABEL}>Tiêu chí nghiệm thu — mỗi dòng một tiêu chí<textarea className={cn(FIELD, "mt-1.5 min-h-36")} value={form.acceptanceCriteriaText} onChange={event => setForm(prev => ({ ...prev, acceptanceCriteriaText: event.target.value }))} /></label>
                        <label className={cn(FORM_LABEL, "md:col-span-2")}>Chỉ dẫn cho AI lập trình<textarea className={cn(FIELD, "mt-1.5 min-h-32")} value={form.aiProgrammingPrompt} onChange={event => setForm(prev => ({ ...prev, aiProgrammingPrompt: event.target.value }))} placeholder="AI phải đọc tài liệu nào, được phép làm gì, cần test và rollback ra sao..." /></label>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between"><label className={FORM_LABEL}>Nội dung tài liệu *</label><div className="flex rounded-lg bg-[#f1f4f8] p-1 text-sm font-semibold"><button className={cn("rounded-md px-3 py-1.5", !preview && "bg-white text-[#9a7214] shadow-sm")} onClick={() => setPreview(false)}>Soạn thảo</button><button className={cn("rounded-md px-3 py-1.5", preview && "bg-white text-[#9a7214] shadow-sm")} onClick={() => setPreview(true)}>Xem trước</button></div></div>
                      {preview ? <div className="min-h-[460px] rounded-2xl border border-[#dce4ee] bg-[#fbfcfe] p-5"><DocumentPreview content={form.content} /></div> : <textarea className={cn(FIELD, "min-h-[460px] resize-y font-mono leading-6")} value={form.content} onChange={event => setForm(prev => ({ ...prev, content: event.target.value }))} />}
                    </div>
                    <label className={cn(FORM_LABEL, "block")}>Lý do và phạm vi thay đổi {form.id ? "*" : ""}<input className={cn(FIELD, "mt-1.5")} value={form.changeNote} onChange={event => setForm(prev => ({ ...prev, changeNote: event.target.value }))} placeholder="Ví dụ: Bổ sung quy tắc follow-up ngày 7 và tiêu chí nghiệm thu" /></label>
                  </div>
                </Panel>

                <div className="space-y-5">
                  <Panel className="p-5 xl:sticky xl:top-4">
                    <div className="flex items-center gap-3"><div className="rounded-xl bg-[#fff3c6] p-2.5 text-[#987013]"><FileText size={20} /></div><div><h3 className="text-[15px] font-semibold">Thông tin quản trị</h3><p className="text-sm text-[#7b899c]">Dùng để kiểm soát và tìm kiếm</p></div></div>
                    <dl className="mt-5 space-y-3 text-sm">{[
                      ["Mã tài liệu", form.id || "Tạo sau khi lưu"],
                      ["Nguồn", form.source],
                      ["Số bước sơ đồ", `${form.flowSteps.length} bước`],
                      ["Cập nhật gần nhất", selected ? formatDate(selected.updatedAt) : "Chưa lưu"],
                    ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b border-[#edf0f4] pb-3"><dt className="text-[#8491a3]">{label}</dt><dd className="max-w-[60%] break-all text-right font-bold text-[#33455e]">{value}</dd></div>)}</dl>
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800"><b>Cổng xác nhận bắt buộc:</b> cập nhật nội dung, metadata, sơ đồ, liên kết chức năng và prompt AI đều chỉ được áp dụng sau khi người có quyền duyệt.</div>
                    <div className="mt-4 grid grid-cols-2 gap-2"><button className={BUTTON_SECONDARY} onClick={() => exportDocument("markdown")}><Download size={14} /> Markdown</button><button className={BUTTON_SECONDARY} onClick={() => exportDocument("json")}><Download size={14} /> JSON</button></div>
                    {form.id && capabilities.canDelete && <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100" onClick={deleteDoc}><Trash2 size={15} /> Chuyển vào lưu trữ</button>}
                  </Panel>
                </div>
              </div>
            )}

            {activeTab === "diagram" && (
              <Panel className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-[#e4eaf1] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={cn(EYEBROW, "text-[#ab7f17]")}>Trình dựng quy trình</p>
                    <h2 className={cn(SECTION_TITLE, "mt-1")}>{form.title || "Chọn hoặc tạo tài liệu"}</h2>
                    <p className={SECTION_DESCRIPTION}>Kéo thả khối, nối nhiều nhánh và đặt nhãn điều kiện trực tiếp trên sơ đồ.</p>
                  </div>
                  {capabilities.canEdit && <button className={BUTTON_PRIMARY} disabled={saving} onClick={saveDoc}>{saving ? <Loader2 className="animate-spin" size={15} /> : <FileCheck2 size={15} />} {form.id ? "Gửi quy trình để duyệt" : "Tạo tài liệu nháp"}</button>}
                </div>
                <div className="p-4">
                  <BusinessFlowBuilder
                    nodes={form.flowSteps}
                    edges={form.flowEdges}
                    onNodesChange={flowSteps => setForm(prev => ({ ...prev, flowSteps }))}
                    onEdgesChange={flowEdges => setForm(prev => ({ ...prev, flowEdges }))}
                  />
                </div>
              </Panel>
            )}

            {activeTab === "automation" && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">{[
                  { label: "Quy trình đã cấu hình", value: agentData?.workflows.length || 0, icon: Network, tone: "border-blue-200 bg-blue-50" },
                  { label: "Đang hoạt động", value: agentData?.workflows.filter(item => item.status === "active").length || 0, icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50" },
                  { label: "Lượt chạy gần đây", value: agentData?.actions.length || 0, icon: Activity, tone: "border-violet-200 bg-violet-50" },
                ].map(item => { const Icon = item.icon; return <Panel key={item.label} className={cn("border p-5", item.tone)}><div className="flex items-center justify-between"><div><p className={EYEBROW}>{item.label}</p><p className="mt-2 text-3xl font-semibold">{item.value}</p></div><Icon size={22} /></div></Panel>; })}</div>
                <Panel className="overflow-hidden"><div className="border-b border-[#e4eaf1] px-5 py-4"><h2 className={SECTION_TITLE}>Trung tâm tự động hóa</h2><p className={SECTION_DESCRIPTION}>Quản lý trigger, các bước Agent và cổng an toàn trước khi thực thi.</p></div><div className="grid gap-4 p-5 lg:grid-cols-2">{agentData?.workflows.map(workflow => <article key={workflow.id} className="rounded-2xl border border-[#dfe6ef] bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className={cn(EYEBROW, "text-blue-600")}>{workflow.triggerType}</p><h3 className="mt-1 text-base font-semibold">{workflow.name}</h3></div><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", workflow.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{workflow.status === "active" ? "Đang chạy" : "Tạm dừng"}</span></div><div className="mt-4 flex flex-wrap gap-2">{workflow.actions.map((action, index) => <span key={index} className="rounded-xl bg-[#f4f7fb] px-3 py-2 text-xs font-semibold text-[#52637a]">{index + 1}. {String(action.action || action.agentId || "Hành động")}</span>)}</div><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><b>Chế độ an toàn:</b> kiểm thử và phê duyệt trước khi cho phép gửi tin hoặc thay đổi CRM.</div></article>)}</div></Panel>
              </div>
            )}

            {activeTab === "agents" && (
              <Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-[#e4eaf1] px-5 py-4"><div><h2 className={SECTION_TITLE}>AI Agent Registry</h2><p className={SECTION_DESCRIPTION}>Vai trò, công cụ và quyền hành động của các Agent chuyên trách.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{agentData?.agents.filter(item => item.status === "active").length || 0} hoạt động</span></div><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{agentData?.agents.map(agent => <article key={agent.id} className="rounded-2xl border border-[#dfe6ef] bg-gradient-to-br from-white to-[#f8faff] p-5"><div className="flex items-start justify-between"><div className="rounded-xl bg-[#fff2c4] p-2.5 text-[#947013]"><Bot size={20} /></div><span className={cn("h-2.5 w-2.5 rounded-full", agent.status === "active" ? "bg-emerald-500" : "bg-slate-300")} /></div><h3 className="mt-4 text-base font-semibold">{agent.name}</h3><p className="mt-1 min-h-12 text-sm leading-6 text-[#718097]">{agent.role}</p><div className="mt-3 flex flex-wrap gap-1.5">{agent.tools.slice(0, 3).map(tool => <span key={tool} className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{tool}</span>)}</div><div className="mt-4 flex items-center justify-between border-t border-[#e9edf3] pt-3"><p className="text-xs text-[#8491a3]">{agent.allowedActions.length} hành động được phép</p>{capabilities.canManageAgents && <button disabled={saving} onClick={() => void toggleAgentStatus(agent)} className="text-xs font-bold text-[#946b0c]">{agent.status === "active" ? "Tạm dừng" : "Kích hoạt"}</button>}</div></article>)}</div></Panel>
            )}

            {activeTab === "review" && (
              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <Panel className="overflow-hidden"><div className="border-b border-[#e4eaf1] px-5 py-4"><h2 className={SECTION_TITLE}>Hàng kiểm duyệt</h2><p className={SECTION_DESCRIPTION}>Tài liệu và mọi nội dung cập nhật chỉ có hiệu lực sau khi người có quyền xác nhận.</p></div><div className="border-b border-[#e4eaf1] bg-[#fffaf0] p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className={cn(EYEBROW, "text-[#ad821b]")}>Yêu cầu cập nhật</p><h3 className="mt-1 font-semibold text-[#17243a]">Chờ xác nhận trước khi sửa tài liệu</h3></div><span className="rounded-full border border-[#e8c75d] bg-white px-3 py-1 text-xs font-bold text-[#8b6711]">{changeRequests.filter(request => request.status === "pending").length} đang chờ</span></div><div className="space-y-3">{changeRequests.filter(request => request.status === "pending").map(request => <article key={request.id} className="rounded-2xl border border-[#ead9a8] bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Chờ xác nhận</span><span className="text-xs text-[#7b899c]">{new Date(request.createdAt).toLocaleString("vi-VN")}</span></div><h4 className="mt-2 font-semibold text-[#17243a]">{request.documentTitle}</h4><p className="mt-1 text-sm text-[#53627a]">{request.changeNote}</p><p className="mt-2 text-xs text-[#7b899c]">Người đề xuất: {request.requestedByName || "Không rõ"} · Phạm vi: {Object.keys(request.proposedDocument).join(", ")}</p><details className="mt-3 rounded-xl border border-[#e4e9f0] bg-[#f8fafc] p-3"><summary className="cursor-pointer text-xs font-bold text-[#8b6711]">Xem chính xác dữ liệu được đề xuất</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#42536b]">{JSON.stringify(request.proposedDocument, null, 2)}</pre></details></div>{capabilities.canReview && <div className="flex shrink-0 flex-wrap gap-2"><button className={BUTTON_SECONDARY} disabled={saving} onClick={() => void decideChangeRequest(request, "rejected")}>Từ chối</button><button className={BUTTON_PRIMARY} disabled={saving} onClick={() => void decideChangeRequest(request, "approved")}><CheckCircle2 size={15} /> Xác nhận & áp dụng</button></div>}</div></article>)}{!changeRequests.some(request => request.status === "pending") && <div className="rounded-2xl border border-dashed border-[#dfd4b5] bg-white/70 px-4 py-8 text-center text-sm text-[#8290a4]"><CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={28} />Không có yêu cầu cập nhật đang chờ xác nhận.</div>}</div></div><div className="space-y-3 p-5">{docs.filter(doc => ["draft", "in_review", "approved", "scheduled"].includes(doc.status)).map(doc => { const health = governance?.documents.find(item => item.document.id === doc.id)?.health; return <article key={doc.id} className="rounded-2xl border border-[#dfe6ef] bg-white p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={doc.status} /><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", (health?.score || 0) >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>Sức khỏe {health?.score || 0}%</span></div><h3 className="mt-2 font-semibold">{doc.title}</h3><p className="mt-1 text-xs text-[#7b899c]">{health?.missing.length ? `Còn thiếu: ${health.missing.join(", ")}` : "Đủ điều kiện quản trị cơ bản"}</p></div><div className="flex flex-wrap gap-2">{doc.status === "draft" && capabilities.canEdit && <button onClick={() => void reviewDocument(doc, "in_review", "Gửi kiểm duyệt")} className={BUTTON_SECONDARY}>Gửi duyệt</button>}{doc.status === "in_review" && capabilities.canReview && <><button onClick={() => void reviewDocument(doc, "draft", "Yêu cầu chỉnh sửa")} className={BUTTON_SECONDARY}>Yêu cầu sửa</button><button onClick={() => void reviewDocument(doc, "approved", "Phê duyệt nội dung")} className={BUTTON_PRIMARY}>Phê duyệt</button></>}{doc.status === "approved" && capabilities.canPublish && <button onClick={() => void reviewDocument(doc, "active", "Xuất bản áp dụng")} className={BUTTON_PRIMARY}>Đưa vào sử dụng</button>}<button onClick={() => openDoc(doc)} className={BUTTON_SECONDARY}>Mở</button></div></div></article>})}{!docs.some(doc => ["draft", "in_review", "approved", "scheduled"].includes(doc.status)) && <div className="py-20 text-center text-[#8290a4]"><CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={36} /><p className="font-semibold">Không có tài liệu đang chờ xuất bản</p></div>}</div></Panel>
                <Panel className="h-fit p-5"><h3 className="font-semibold">Nhật ký phê duyệt</h3><div className="mt-4 space-y-4">{governance?.recentReviews.slice(0, 8).map(review => <div key={review.id} className="border-l-2 border-[#dfbd58] pl-3"><p className="text-sm font-semibold">{review.action}</p><p className="text-xs text-[#7e8b9e]">{review.actorName || "Hệ thống"} · {formatDate(review.createdAt)}</p>{review.note && <p className="mt-1 text-xs text-[#607087]">{review.note}</p>}</div>)}{!governance?.recentReviews.length && <p className="text-sm text-[#8491a3]">Chưa có hoạt động kiểm duyệt.</p>}</div></Panel>
              </div>
            )}

            {activeTab === "testing" && (
              <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]"><Panel className="p-5"><p className={cn(EYEBROW, "text-[#aa7e16]")}>Knowledge Lab</p><h2 className={cn(SECTION_TITLE, "mt-1")}>Kiểm thử câu hỏi nghiệp vụ</h2><p className={SECTION_DESCRIPTION}>Mô phỏng cách AI tìm nguồn trước khi đưa tài liệu hoặc workflow vào sử dụng.</p><textarea value={testQuestion} onChange={event => setTestQuestion(event.target.value)} className={cn(FIELD, "mt-5 min-h-36")} /><button onClick={runKnowledgeTest} className={cn(BUTTON_PRIMARY, "mt-3 w-full")}><PlayCircle size={16} /> Chạy kiểm thử</button></Panel><Panel className="p-5"><h2 className={SECTION_TITLE}>Kết quả và nguồn tham chiếu</h2>{testResult ? <div className="mt-4"><div className={cn("rounded-xl border p-4 text-sm leading-6", testResult.matches.length ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>{testResult.answer}</div><div className="mt-4 space-y-3">{testResult.matches.map(doc => <button key={doc.id} onClick={() => openDoc(doc)} className="flex w-full items-center justify-between rounded-xl border border-[#e0e6ef] p-4 text-left"><div><p className="font-semibold">{doc.title}</p><p className="text-xs text-[#7c8a9e]">{KNOWLEDGE_CATEGORY_LABELS[doc.category]} · {formatDate(doc.updatedAt)}</p></div><ChevronRight size={17} /></button>)}</div></div> : <div className="flex min-h-64 flex-col items-center justify-center text-center text-[#8491a3]"><PlayCircle size={36} /><p className="mt-3 font-semibold">Nhập tình huống và chạy kiểm thử</p><p className="mt-1 text-sm">Hệ thống sẽ chỉ sử dụng tài liệu đang áp dụng.</p></div>}</Panel></div>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
                { label: "Điểm sức khỏe", value: `${governance?.averageHealth || 0}%`, hint: "Trung bình kho tri thức", icon: ShieldCheck, tone: "border-emerald-200 bg-emerald-50" },
                { label: "Tài liệu tốt", value: governance?.healthy || 0, hint: "Từ 80 điểm", icon: CheckCircle2, tone: "border-blue-200 bg-blue-50" },
                { label: "Cần cải thiện", value: governance?.needsAttention || 0, hint: "Dưới 60 điểm", icon: FileClock, tone: "border-amber-200 bg-amber-50" },
                { label: "Agent actions", value: agentData?.actions.length || 0, hint: "Nhật ký gần nhất", icon: Activity, tone: "border-violet-200 bg-violet-50" },
              ].map(item => { const Icon = item.icon; return <Panel key={item.label} className={cn("border p-5", item.tone)}><div className="flex justify-between"><div><p className={EYEBROW}>{item.label}</p><p className="mt-2 text-3xl font-semibold">{item.value}</p><p className="mt-1 text-sm text-[#738198]">{item.hint}</p></div><Icon size={22} /></div></Panel>; })}</div><Panel className="overflow-hidden"><div className="border-b border-[#e4eaf1] px-5 py-4"><h2 className={SECTION_TITLE}>Chất lượng từng tài liệu</h2><p className={SECTION_DESCRIPTION}>Ưu tiên bổ sung tài liệu có điểm thấp trước khi giao cho AI.</p></div><div className="divide-y divide-[#edf0f4]">{governance?.documents.sort((a, b) => (a.health?.score || 0) - (b.health?.score || 0)).map(item => <button key={item.document.id} onClick={() => openDoc(item.document)} className="grid w-full gap-3 px-5 py-4 text-left md:grid-cols-[1fr_220px_100px] md:items-center"><div><p className="font-semibold">{item.document.title}</p><p className="text-xs text-[#7e8b9e]">{item.health?.missing.join(" · ") || "Đã đủ tiêu chí cơ bản"}</p></div><div className="h-2 overflow-hidden rounded-full bg-[#e7edf4]"><div className={cn("h-full rounded-full", (item.health?.score || 0) >= 80 ? "bg-emerald-500" : (item.health?.score || 0) >= 60 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${item.health?.score || 0}%` }} /></div><span className="text-right text-lg font-semibold">{item.health?.score || 0}%</span></button>)}</div></Panel></div>
            )}

            {activeTab === "history" && (
              <div className="grid gap-5 xl:grid-cols-[330px_1fr]">
                <Panel className="h-fit p-4"><div className="flex items-center gap-2 text-[15px] font-semibold"><BookOpen size={18} className="text-[#a87b16]" /> Chọn tài liệu</div><div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto">{docs.map(doc => <button key={doc.id} onClick={() => { openDoc(doc, "history"); void loadVersions(doc.id); }} className={cn("w-full rounded-xl border p-3 text-left", doc.id === selectedId ? "border-[#dfbc55] bg-[#fff8df]" : "border-[#e2e7ef] hover:bg-[#f7f9fc]")}><p className="line-clamp-2 text-sm font-semibold leading-6">{doc.title}</p><p className="mt-1 text-xs text-[#8794a6]">{formatDate(doc.updatedAt)}</p></button>)}</div></Panel>
                <Panel className="overflow-hidden"><div className="border-b border-[#e4e9f0] bg-[#fbfcfe] px-5 py-4"><p className={cn(EYEBROW, "text-[#aa7e16]")}>Lịch sử cập nhật</p><h2 className={cn(SECTION_TITLE, "mt-1")}>{selected?.title || "Chưa chọn tài liệu"}</h2><p className={SECTION_DESCRIPTION}>Khôi phục an toàn; phiên bản hiện tại vẫn được lưu lại.</p></div><div className="p-5"><div className="relative space-y-4 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-[#dfe5ed]">{versions.map((version, index) => <div key={version.id} className="relative flex gap-4"><div className={cn("relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white text-xs font-bold", index === 0 ? "bg-emerald-500 text-white" : "bg-[#eaf0f7] text-[#65758a]")}>{version.version}</div><div className="min-w-0 flex-1 rounded-2xl border border-[#dee5ee] bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-semibold">Phiên bản {version.version}</h3>{index === 0 && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">MỚI NHẤT</span>}<StatusBadge status={version.status} /></div><p className="mt-1 text-xs text-[#8491a3]">{formatDate(version.createdAt)} · {version.changedBy || "Hệ thống"}</p><p className="mt-2 text-sm font-semibold text-[#52637a]">{version.changeNote || "Cập nhật nội dung tài liệu"}</p></div><button disabled={saving || index === 0} onClick={() => void restoreVersion(version)} className={BUTTON_SECONDARY}><RotateCcw size={14} /> Khôi phục</button></div><details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-[#997116]">Xem nội dung phiên bản</summary><div className="mt-3 max-h-72 overflow-y-auto rounded-xl bg-[#f7f9fc] p-4"><DocumentPreview content={version.content} /></div></details></div></div>)}{!versions.length && <div className="py-24 text-center text-[#8491a3]"><History className="mx-auto mb-3" size={36} /><p className="font-semibold">Chưa có lịch sử phiên bản</p><p className="mt-1 text-sm">Lưu tài liệu để bắt đầu ghi nhận thay đổi.</p></div>}</div></div></Panel>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
