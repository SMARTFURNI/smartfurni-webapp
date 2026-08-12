"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
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
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
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
  KnowledgeDocument,
  KnowledgeDocumentVersion,
  KnowledgeStatus,
} from "@/types/business-brain";
import { KNOWLEDGE_CATEGORY_LABELS, KNOWLEDGE_STATUS_LABELS } from "@/types/business-brain";

type TabKey = "overview" | "library" | "editor" | "diagram" | "history";
type Tone = BusinessBrainFlowStep["tone"];

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
      { key: "library", label: "Thư viện", icon: Library },
    ],
  },
  {
    label: "Xây dựng",
    tabs: [
      { key: "editor", label: "Biên soạn", icon: FilePenLine },
      { key: "diagram", label: "Quy trình", icon: Network },
    ],
  },
  {
    label: "Kiểm soát",
    tabs: [{ key: "history", label: "Phiên bản", icon: History }],
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
      nodeType: (["start", "action", "decision", "end"] as const).includes(nodeType as "start" | "action" | "decision" | "end")
        ? nodeType as "start" | "action" | "decision" | "end"
        : "action",
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

export function BusinessBrainClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [versions, setVersions] = useState<KnowledgeDocumentVersion[]>([]);
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

  useEffect(() => {
    setLoading(true);
    loadDocs().catch(err => setError(err instanceof Error ? err.message : "Không tải được tài liệu."))
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
    });
  }, [category, docs, search, status]);

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
    setSelectedId("");
    setForm({ ...EMPTY_FORM, flowSteps: [], flowEdges: [] });
    setActiveTab("editor");
    setError("");
  };

  const saveDoc = async () => {
    if (!form.title.trim() || !form.content.trim()) return setError("Cần nhập tiêu đề và nội dung tài liệu.");
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        id: form.id,
        title: form.title.trim(),
        category: form.category,
        status: form.status,
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
          flowSteps: form.flowSteps,
          flowEdges: form.flowEdges,
        },
      };
      const data = await fetchJson<{ document: KnowledgeDocument }>("/api/crm/business-brain/knowledge", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadDocs(data.document.id);
      setSuccess("Đã lưu tài liệu và tạo phiên bản mới.");
      setForm(prev => ({ ...prev, id: data.document.id, changeNote: "" }));
      if (activeTab === "history") await loadVersions(data.document.id);
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
    if (!form.id || !window.confirm("Xóa tài liệu này khỏi thư viện?")) return;
    setSaving(true);
    try {
      await fetchJson(`/api/crm/business-brain/knowledge?id=${encodeURIComponent(form.id)}`, { method: "DELETE" });
      setSelectedId("");
      setForm({ ...EMPTY_FORM, flowSteps: [], flowEdges: [] });
      await loadDocs(null);
      setActiveTab("library");
      setSuccess("Đã xóa tài liệu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được tài liệu.");
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = async (version: KnowledgeDocumentVersion) => {
    if (!form.id || !window.confirm(`Khôi phục phiên bản ${version.version}? Nội dung hiện tại vẫn được lưu trong lịch sử.`)) return;
    setSaving(true);
    try {
      const data = await fetchJson<{ document: KnowledgeDocument }>("/api/crm/business-brain/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id, versionId: version.id }),
      });
      await loadDocs(data.document.id);
      await loadVersions(data.document.id);
      setSuccess(`Đã khôi phục phiên bản ${version.version}.`);
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
              <button className={BUTTON_PRIMARY} onClick={newDoc}><FilePlus2 size={16} /> Tạo tài liệu</button>
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
                    <div className="mb-4 flex items-center justify-between"><div><h2 className={SECTION_TITLE}>Tài liệu vận hành cốt lõi</h2><p className={SECTION_DESCRIPTION}>Bộ hướng dẫn nền tảng đã được chuẩn hóa.</p></div><button onClick={() => setActiveTab("library")} className="text-sm font-semibold text-[#9b7317]">Xem tất cả →</button></div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {docs.filter(doc => doc.source === "business-playbook-v1").slice(0, 6).map(doc => {
                        const Icon = CATEGORY_ICONS[doc.category] || FileText;
                        return <button key={doc.id} onClick={() => openDoc(doc)} className="group rounded-2xl border border-[#e0e6ef] bg-[#fbfcfe] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#dfbd58] hover:bg-white hover:shadow-md"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#fff4cc] p-2.5 text-[#9a7215]"><Icon size={19} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-[15px] font-semibold leading-6 text-[#1b2b44]">{doc.title}</h3><ChevronRight className="shrink-0 text-[#a4b0c1] group-hover:text-[#b1841a]" size={17} /></div><p className="mt-1 line-clamp-2 text-sm leading-6 text-[#718096]">{doc.summary}</p></div></div></button>;
                      })}
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
                  <div className="flex flex-col gap-3 border-b border-[#e5eaf1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className={SECTION_TITLE}>Thư viện hướng dẫn</h2><p className={SECTION_DESCRIPTION}>Tài liệu nghiệp vụ có thể tìm kiếm, chỉnh sửa và tái sử dụng.</p></div><button className={BUTTON_PRIMARY} onClick={newDoc}><Plus size={16} /> Thêm tài liệu</button></div>
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
                  <div className="flex flex-col gap-3 border-b border-[#e4eaf1] bg-[#fbfcfe] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className={cn(EYEBROW, "text-[#ad821b]")}>{form.id ? "Chỉnh sửa tài liệu" : "Tài liệu mới"}</p><h2 className={cn(SECTION_TITLE, "mt-1")}>Nội dung hướng dẫn doanh nghiệp</h2></div><div className="flex flex-wrap gap-2">{form.id && <button className={BUTTON_SECONDARY} onClick={duplicateDoc}><Copy size={14} /> Nhân bản</button>}<button className={BUTTON_PRIMARY} disabled={saving} onClick={saveDoc}>{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Lưu tài liệu</button></div></div>
                  <div className="space-y-5 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className={cn(FORM_LABEL, "md:col-span-2")}>Tiêu đề tài liệu *<input className={cn(FIELD, "mt-1.5 text-base font-semibold")} value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} placeholder="Ví dụ: Quy trình chăm sóc khách mua lẻ" /></label>
                      <label className={FORM_LABEL}>Danh mục<select className={cn(FIELD, "mt-1.5")} value={form.category} onChange={event => setForm(prev => ({ ...prev, category: event.target.value as KnowledgeCategory }))}>{Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label className={FORM_LABEL}>Trạng thái<select className={cn(FIELD, "mt-1.5")} value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value as KnowledgeStatus }))}>{Object.entries(KNOWLEDGE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label className={cn(FORM_LABEL, "md:col-span-2")}>Tóm tắt<input className={cn(FIELD, "mt-1.5")} value={form.summary} onChange={event => setForm(prev => ({ ...prev, summary: event.target.value }))} placeholder="Một câu giúp nhân viên hiểu tài liệu dùng để làm gì" /></label>
                      <label className={FORM_LABEL}>Người chịu trách nhiệm<input className={cn(FIELD, "mt-1.5")} value={form.owner} onChange={event => setForm(prev => ({ ...prev, owner: event.target.value }))} placeholder="Ví dụ: Trưởng phòng Kinh doanh" /></label>
                      <label className={FORM_LABEL}>Đối tượng áp dụng<input className={cn(FIELD, "mt-1.5")} value={form.audience} onChange={event => setForm(prev => ({ ...prev, audience: event.target.value }))} placeholder="Sale, CSKH, Marketing" /></label>
                      <label className={FORM_LABEL}>Chu kỳ rà soát<input className={cn(FIELD, "mt-1.5")} value={form.reviewCycle} onChange={event => setForm(prev => ({ ...prev, reviewCycle: event.target.value }))} /></label>
                      <label className={FORM_LABEL}>Tag tìm kiếm<input className={cn(FIELD, "mt-1.5")} value={form.tagsText} onChange={event => setForm(prev => ({ ...prev, tagsText: event.target.value }))} placeholder="bán lẻ, Zalo OA, báo giá" /></label>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between"><label className={FORM_LABEL}>Nội dung tài liệu *</label><div className="flex rounded-lg bg-[#f1f4f8] p-1 text-sm font-semibold"><button className={cn("rounded-md px-3 py-1.5", !preview && "bg-white text-[#9a7214] shadow-sm")} onClick={() => setPreview(false)}>Soạn thảo</button><button className={cn("rounded-md px-3 py-1.5", preview && "bg-white text-[#9a7214] shadow-sm")} onClick={() => setPreview(true)}>Xem trước</button></div></div>
                      {preview ? <div className="min-h-[460px] rounded-2xl border border-[#dce4ee] bg-[#fbfcfe] p-5"><DocumentPreview content={form.content} /></div> : <textarea className={cn(FIELD, "min-h-[460px] resize-y font-mono leading-6")} value={form.content} onChange={event => setForm(prev => ({ ...prev, content: event.target.value }))} />}
                    </div>
                    <label className={cn(FORM_LABEL, "block")}>Ghi chú thay đổi<input className={cn(FIELD, "mt-1.5")} value={form.changeNote} onChange={event => setForm(prev => ({ ...prev, changeNote: event.target.value }))} placeholder="Ví dụ: Bổ sung quy tắc follow-up ngày 7" /></label>
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
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800"><b>Chú ý:</b> Chuyển sang “Đang dùng” chỉ khi nội dung đã được người chịu trách nhiệm xác nhận.</div>
                    <div className="mt-4 grid grid-cols-2 gap-2"><button className={BUTTON_SECONDARY} onClick={() => exportDocument("markdown")}><Download size={14} /> Markdown</button><button className={BUTTON_SECONDARY} onClick={() => exportDocument("json")}><Download size={14} /> JSON</button></div>
                    {form.id && <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100" onClick={deleteDoc}><Trash2 size={15} /> Xóa tài liệu</button>}
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
                  <button className={BUTTON_PRIMARY} disabled={saving} onClick={saveDoc}>{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Lưu quy trình</button>
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
