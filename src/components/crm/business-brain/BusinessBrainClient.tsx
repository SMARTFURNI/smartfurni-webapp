"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AgentActionLog,
  AiAgentDefinition,
  BusinessCustomer,
  CustomerConversation,
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeStatus,
  SalesTask,
  WorkflowRule,
  WorkflowRunResult,
} from "@/types/business-brain";
import {
  KNOWLEDGE_CATEGORY_LABELS,
  KNOWLEDGE_STATUS_LABELS,
} from "@/types/business-brain";

type TabKey = "knowledge" | "customers" | "agents" | "workflow" | "reports";

type CustomerDetail = {
  customer: BusinessCustomer;
  conversations: CustomerConversation[];
  agentActions: AgentActionLog[];
  tasks: SalesTask[];
};

type BusinessBrainReport = {
  totalLeads: number;
  temperatures: Record<string, number>;
  responseRate: number;
  closeRate: number;
  neglectedLeads: number;
  hotNotCalled: number;
  staffPerformance: Array<Record<string, unknown>>;
  topProducts: Array<{ product: string; count: number }>;
  rejectionReasons: Array<{ reason: string; count: number }>;
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
};

const emptyDocForm: DocForm = {
  title: "",
  category: "faq",
  status: "draft",
  summary: "",
  tagsText: "",
  source: "manual",
  content: "",
};

const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "knowledge", label: "Knowledge Base", icon: Database },
  { key: "customers", label: "Customer Brain", icon: Users },
  { key: "agents", label: "AI Agents", icon: Bot },
  { key: "workflow", label: "Workflow Demo", icon: Workflow },
  { key: "reports", label: "Báo cáo", icon: BarChart3 },
];

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

function temperatureLabel(value: string) {
  if (value === "hot") return "Nóng";
  if (value === "warm") return "Ấm";
  return "Lạnh";
}

function statusTone(status: string) {
  if (status === "active" || status === "answered" || status === "success") return "text-emerald-300 bg-emerald-500/10 border-emerald-400/25";
  if (status === "draft" || status === "need_human_review") return "text-amber-200 bg-amber-500/10 border-amber-300/25";
  if (status === "archived" || status === "inactive") return "text-slate-300 bg-white/5 border-white/10";
  return "text-red-200 bg-red-500/10 border-red-300/25";
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

export function BusinessBrainClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("knowledge");
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [customers, setCustomers] = useState<BusinessCustomer[]>([]);
  const [agents, setAgents] = useState<AiAgentDefinition[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [actions, setActions] = useState<AgentActionLog[]>([]);
  const [report, setReport] = useState<BusinessBrainReport | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [docForm, setDocForm] = useState<DocForm>(emptyDocForm);
  const [docSearch, setDocSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [workflowResult, setWorkflowResult] = useState<WorkflowRunResult | null>(null);
  const [workflowForm, setWorkflowForm] = useState({
    name: "Khách demo",
    phone: "0900000000",
    message: "Anh/chị muốn báo giá GSF150 size 1m8 x 2m, giao ở HCM được không?",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKnowledge = useCallback(async () => {
    const data = await fetchJson<{ documents: KnowledgeDocument[] }>("/api/crm/business-brain/knowledge");
    setDocs(data.documents);
  }, []);

  const loadCustomers = useCallback(async (search?: string) => {
    const suffix = search ? `?search=${encodeURIComponent(search)}` : "";
    const data = await fetchJson<{ customers: BusinessCustomer[] }>(`/api/crm/business-brain/customers${suffix}`);
    setCustomers(data.customers);
  }, []);

  const loadAgents = useCallback(async () => {
    const data = await fetchJson<{ agents: AiAgentDefinition[]; workflows: WorkflowRule[]; actions: AgentActionLog[] }>(
      "/api/crm/business-brain/agents"
    );
    setAgents(data.agents);
    setWorkflows(data.workflows);
    setActions(data.actions);
  }, []);

  const loadReport = useCallback(async () => {
    const data = await fetchJson<BusinessBrainReport>("/api/crm/business-brain/reports");
    setReport(data);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadKnowledge(), loadCustomers(), loadAgents(), loadReport()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [loadAgents, loadCustomers, loadKnowledge, loadReport]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredDocs = useMemo(() => {
    const keyword = docSearch.trim().toLowerCase();
    if (!keyword) return docs;
    return docs.filter(doc =>
      [doc.title, doc.summary, doc.content, doc.tags.join(" ")].some(value => (value || "").toLowerCase().includes(keyword))
    );
  }, [docSearch, docs]);

  const openDoc = (doc: KnowledgeDocument) => {
    setDocForm({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      status: doc.status,
      summary: doc.summary || "",
      tagsText: doc.tags.join(", "),
      source: doc.source || "manual",
      content: doc.content,
    });
  };

  const resetDocForm = () => {
    setDocForm(emptyDocForm);
  };

  const saveDoc = async () => {
    if (!docForm.title.trim() || !docForm.content.trim()) {
      setError("Cần nhập tiêu đề và nội dung tri thức.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: docForm.id,
        title: docForm.title.trim(),
        category: docForm.category,
        status: docForm.status,
        summary: docForm.summary.trim() || undefined,
        tags: docForm.tagsText.split(",").map(item => item.trim()).filter(Boolean),
        source: docForm.source.trim() || "manual",
        content: docForm.content.trim(),
      };
      await fetchJson("/api/crm/business-brain/knowledge", {
        method: docForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadKnowledge();
      resetDocForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được tri thức.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async () => {
    if (!docForm.id) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson(`/api/crm/business-brain/knowledge?id=${encodeURIComponent(docForm.id)}`, { method: "DELETE" });
      await loadKnowledge();
      resetDocForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được tri thức.");
    } finally {
      setSaving(false);
    }
  };

  const openCustomer = async (customerId: string) => {
    setError(null);
    try {
      const data = await fetchJson<CustomerDetail>(`/api/crm/business-brain/customers?id=${encodeURIComponent(customerId)}`);
      setSelectedCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được hồ sơ khách.");
    }
  };

  const toggleAgent = async (agent: AiAgentDefinition) => {
    setSaving(true);
    setError(null);
    try {
      await fetchJson("/api/crm/business-brain/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agent.id, status: agent.status === "active" ? "inactive" : "active" }),
      });
      await loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được agent.");
    } finally {
      setSaving(false);
    }
  };

  const runWorkflow = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await fetchJson<WorkflowRunResult>("/api/crm/business-brain/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflowForm),
      });
      setWorkflowResult(data);
      await Promise.all([loadCustomers(), loadAgents(), loadReport()]);
      setActiveTab("workflow");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow chưa chạy được.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-48px)] text-[#f5edd6]">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 text-slate-950 shadow-[0_18px_50px_rgba(245,158,11,0.35)]">
            <BrainCircuit size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <Sparkles size={16} />
              Bộ não doanh nghiệp SmartFurni
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              Kho tri thức, AI agent và workflow sale
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-[#f5edd6]/60">
              AI chỉ được trả lời dựa trên Knowledge Base. Nếu thiếu dữ liệu, hệ thống sẽ chuyển sang trạng thái cần nhân viên kiểm tra.
            </p>
          </div>
        </div>
        <button
          onClick={() => void loadAll()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-[#f5edd6] transition hover:bg-white/10"
        >
          <RefreshCw size={16} />
          Tải lại dữ liệu
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.055] p-2 backdrop-blur md:grid-cols-5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition",
                active
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_12px_35px_rgba(245,158,11,0.28)]"
                  : "text-[#f5edd6]/60 hover:bg-white/8 hover:text-[#f5edd6]"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card className="flex min-h-[360px] items-center justify-center">
          <div className="flex items-center gap-3 text-[#f5edd6]/70">
            <Loader2 className="animate-spin" size={22} />
            Đang chuẩn bị bộ não doanh nghiệp...
          </div>
        </Card>
      ) : (
        <>
          {activeTab === "knowledge" && (
            <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
                    <p className="text-sm text-[#f5edd6]/55">Sản phẩm, giá, chính sách, FAQ và kịch bản sale.</p>
                  </div>
                  <button onClick={resetDocForm} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">
                    <Plus size={15} className="mr-1 inline" />
                    Tạo mới
                  </button>
                </div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f5edd6]/35" size={17} />
                  <input
                    value={docSearch}
                    onChange={event => setDocSearch(event.target.value)}
                    placeholder="Tìm tri thức..."
                    className="w-full rounded-2xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-[#f5edd6] outline-none focus:border-amber-300/60"
                  />
                </div>
                <div className="max-h-[660px] space-y-3 overflow-y-auto pr-1">
                  {filteredDocs.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => openDoc(doc)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition hover:border-amber-300/35 hover:bg-amber-300/5",
                        docForm.id === doc.id ? "border-amber-300/45 bg-amber-300/10" : "border-white/10 bg-black/15"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">{doc.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-[#f5edd6]/55">{doc.summary || doc.content}</p>
                        </div>
                        <Pill className={statusTone(doc.status)}>{KNOWLEDGE_STATUS_LABELS[doc.status]}</Pill>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill className="border-amber-300/20 bg-amber-300/10 text-amber-200">
                          {KNOWLEDGE_CATEGORY_LABELS[doc.category]}
                        </Pill>
                        {doc.tags.slice(0, 3).map(tag => (
                          <Pill key={tag} className="border-white/10 bg-white/5 text-[#f5edd6]/55">
                            {tag}
                          </Pill>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{docForm.id ? "Chỉnh sửa tri thức" : "Thêm tri thức mới"}</h2>
                    <p className="text-sm text-[#f5edd6]/55">Dữ liệu ở trạng thái active mới được AI dùng để tư vấn.</p>
                  </div>
                  {docForm.id && (
                    <button onClick={deleteDoc} disabled={saving} className="rounded-xl border border-red-300/20 px-3 py-2 text-sm text-red-100 hover:bg-red-500/10">
                      <Trash2 size={15} className="mr-1 inline" />
                      Xóa
                    </button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Tiêu đề</span>
                    <input
                      value={docForm.title}
                      onChange={event => setDocForm(prev => ({ ...prev, title: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-amber-300/60"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Nhóm dữ liệu</span>
                    <select
                      value={docForm.category}
                      onChange={event => setDocForm(prev => ({ ...prev, category: event.target.value as KnowledgeCategory }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-amber-300/60"
                    >
                      {Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Trạng thái</span>
                    <select
                      value={docForm.status}
                      onChange={event => setDocForm(prev => ({ ...prev, status: event.target.value as KnowledgeStatus }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-amber-300/60"
                    >
                      {Object.entries(KNOWLEDGE_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Tóm tắt</span>
                    <input
                      value={docForm.summary}
                      onChange={event => setDocForm(prev => ({ ...prev, summary: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-amber-300/60"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Tag</span>
                    <input
                      value={docForm.tagsText}
                      onChange={event => setDocForm(prev => ({ ...prev, tagsText: event.target.value }))}
                      placeholder="GSF150, giá, size"
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-amber-300/60"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Nguồn</span>
                    <input
                      value={docForm.source}
                      onChange={event => setDocForm(prev => ({ ...prev, source: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-amber-300/60"
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Nội dung tri thức</span>
                    <textarea
                      value={docForm.content}
                      onChange={event => setDocForm(prev => ({ ...prev, content: event.target.value }))}
                      rows={12}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-300/60"
                    />
                  </label>
                </div>
                <button
                  onClick={saveDoc}
                  disabled={saving}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-bold text-slate-950 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                  Lưu tri thức
                </button>
              </Card>
            </div>
          )}

          {activeTab === "customers" && (
            <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">CRM Customer Brain</h2>
                    <p className="text-sm text-[#f5edd6]/55">Hồ sơ nhu cầu và lịch sử AI xử lý từng khách.</p>
                  </div>
                </div>
                <form
                  className="relative mb-4"
                  onSubmit={event => {
                    event.preventDefault();
                    void loadCustomers(customerSearch);
                  }}
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f5edd6]/35" size={17} />
                  <input
                    value={customerSearch}
                    onChange={event => setCustomerSearch(event.target.value)}
                    placeholder="Tìm tên, số điện thoại, sản phẩm..."
                    className="w-full rounded-2xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm outline-none focus:border-amber-300/60"
                  />
                </form>
                <div className="space-y-3">
                  {customers.map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => void openCustomer(customer.id)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition hover:border-amber-300/35 hover:bg-amber-300/5",
                        selectedCustomer?.customer.id === customer.id ? "border-amber-300/45 bg-amber-300/10" : "border-white/10 bg-black/15"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">{customer.name || "Khách chưa đặt tên"}</p>
                          <p className="text-sm text-[#f5edd6]/55">{customer.phone}</p>
                        </div>
                        <Pill className={customer.temperature === "hot" ? "border-red-300/25 bg-red-500/15 text-red-100" : customer.temperature === "warm" ? "border-amber-300/25 bg-amber-500/15 text-amber-100" : "border-blue-300/20 bg-blue-500/10 text-blue-100"}>
                          {temperatureLabel(customer.temperature)} • {customer.leadScore}
                        </Pill>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-[#f5edd6]/55">{customer.aiNextStep || customer.conversationSummary || "Chưa có đề xuất tiếp theo."}</p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                {selectedCustomer ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">Khách hàng</p>
                        <p className="mt-2 text-xl font-bold text-white">{selectedCustomer.customer.name || selectedCustomer.customer.phone}</p>
                        <p className="text-sm text-[#f5edd6]/55">{selectedCustomer.customer.leadSource || "Chưa rõ nguồn lead"}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">Lead score</p>
                        <p className="mt-2 text-3xl font-black text-amber-300">{selectedCustomer.customer.leadScore}/100</p>
                        <p className="text-sm text-[#f5edd6]/55">{temperatureLabel(selectedCustomer.customer.temperature)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">Bước tiếp theo</p>
                        <p className="mt-2 text-sm font-semibold text-white">{selectedCustomer.customer.aiNextStep || "Chưa có đề xuất."}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <h3 className="mb-3 font-bold text-white">Nhu cầu chính</h3>
                        <div className="space-y-2 text-sm text-[#f5edd6]/65">
                          <p>Sản phẩm: {selectedCustomer.customer.interestedProducts.join(", ") || "Chưa rõ"}</p>
                          <p>Size: {selectedCustomer.customer.preferredSize || "Chưa rõ"}</p>
                          <p>Màu: {selectedCustomer.customer.preferredColor || "Chưa rõ"}</p>
                          <p>Khu vực: {selectedCustomer.customer.location || "Chưa rõ"}</p>
                          <p>Vấn đề: {selectedCustomer.customer.mainPainPoint || "Chưa có"}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <h3 className="mb-3 font-bold text-white">Việc cần làm</h3>
                        <div className="space-y-2">
                          {selectedCustomer.tasks.length ? selectedCustomer.tasks.map(task => (
                            <div key={task.id} className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-sm">
                              <div className="flex justify-between gap-3">
                                <span className="font-semibold text-white">{task.title}</span>
                                <span className="text-amber-200">{task.dueDate}</span>
                              </div>
                              <p className="mt-1 text-[#f5edd6]/55">Ưu tiên: {task.priority} • {task.status}</p>
                            </div>
                          )) : <p className="text-sm text-[#f5edd6]/55">Chưa có task.</p>}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <h3 className="mb-3 font-bold text-white">Lịch sử hội thoại</h3>
                        <div className="max-h-72 space-y-3 overflow-y-auto">
                          {selectedCustomer.conversations.map(conversation => (
                            <div key={conversation.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                              <div className="mb-1 flex items-center justify-between text-xs text-[#f5edd6]/40">
                                <span>{conversation.authorName || conversation.authorType}</span>
                                <span>{formatDate(conversation.createdAt)}</span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm text-[#f5edd6]/75">{conversation.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <h3 className="mb-3 font-bold text-white">AI đã xử lý</h3>
                        <div className="max-h-72 space-y-3 overflow-y-auto">
                          {selectedCustomer.agentActions.map(action => (
                            <div key={action.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-white">{action.agentName || action.agentId}</p>
                                <Pill className={statusTone(action.status)}>{action.status}</Pill>
                              </div>
                              <p className="mt-1 text-sm text-[#f5edd6]/55">{action.actionType}</p>
                              <p className="mt-1 text-xs text-[#f5edd6]/35">{formatDate(action.createdAt)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[520px] items-center justify-center text-center">
                    <div>
                      <Users className="mx-auto mb-4 text-amber-300" size={44} />
                      <h3 className="text-xl font-bold text-white">Chọn một khách hàng để xem Customer Brain</h3>
                      <p className="mt-2 text-sm text-[#f5edd6]/55">Hoặc chạy workflow demo để tạo hồ sơ mẫu.</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "agents" && (
            <div className="grid gap-5 xl:grid-cols-[1fr_0.55fr]">
              <div className="grid gap-4 lg:grid-cols-2">
                {agents.map(agent => (
                  <Card key={agent.id} className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">{agent.id}</p>
                        <h3 className="mt-1 text-xl font-bold text-white">{agent.name}</h3>
                        <p className="mt-2 text-sm text-[#f5edd6]/60">{agent.role}</p>
                      </div>
                      <button
                        onClick={() => void toggleAgent(agent)}
                        className={cn("rounded-full border px-3 py-1 text-xs font-bold", statusTone(agent.status))}
                      >
                        {agent.status === "active" ? "Đang bật" : "Đang tắt"}
                      </button>
                    </div>
                    <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f5edd6]/45">Prompt hệ thống</p>
                      <p className="mt-2 text-sm leading-6 text-[#f5edd6]/70">{agent.systemPrompt}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.allowedActions.map(action => (
                        <Pill key={action} className="border-amber-300/15 bg-amber-300/8 text-amber-100">{action}</Pill>
                      ))}
                      {agent.tools.map(tool => (
                        <Pill key={tool} className="border-white/10 bg-white/5 text-[#f5edd6]/55">{tool}</Pill>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
              <Card className="p-5">
                <h2 className="text-xl font-bold text-white">Workflow đang bật</h2>
                <div className="mt-4 space-y-3">
                  {workflows.map(item => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="mt-1 text-sm text-[#f5edd6]/55">Trigger: {item.triggerType}</p>
                        </div>
                        <Pill className={statusTone(item.status)}>{item.status}</Pill>
                      </div>
                      <pre className="mt-3 overflow-x-auto rounded-xl bg-black/25 p-3 text-xs text-[#f5edd6]/55">
                        {JSON.stringify({ rule: item.rule, actions: item.actions }, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "workflow" && (
            <div className="grid gap-5 xl:grid-cols-[0.65fr_1fr]">
              <Card className="p-5">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-white">Demo workflow hỏi giá</h2>
                  <p className="text-sm text-[#f5edd6]/55">Khách hỏi giá → AI tư vấn → phân loại lead → tạo task chăm sóc.</p>
                </div>
                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Tên khách</span>
                    <input
                      value={workflowForm.name}
                      onChange={event => setWorkflowForm(prev => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-amber-300/60"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Số điện thoại</span>
                    <input
                      value={workflowForm.phone}
                      onChange={event => setWorkflowForm(prev => ({ ...prev, phone: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-amber-300/60"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[#f5edd6]/75">Nội dung khách hỏi</span>
                    <textarea
                      value={workflowForm.message}
                      onChange={event => setWorkflowForm(prev => ({ ...prev, message: event.target.value }))}
                      rows={6}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-300/60"
                    />
                  </label>
                  <button
                    onClick={runWorkflow}
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-bold text-slate-950 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
                    Chạy workflow demo
                  </button>
                </div>
              </Card>
              <Card className="p-5">
                {workflowResult ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">Trạng thái</p>
                        <Pill className={cn("mt-3", statusTone(workflowResult.status))}>{workflowResult.status}</Pill>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">Lead score</p>
                        <p className="mt-2 text-3xl font-black text-amber-300">{workflowResult.leadScore.score}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">Task</p>
                        <p className="mt-2 text-sm font-semibold text-white">{workflowResult.nextTask?.title || "Chưa tạo task"}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4">
                      <h3 className="mb-3 font-bold text-white">Câu trả lời AI gợi ý</h3>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[#f5edd6]/75">{workflowResult.suggestedReply}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <h3 className="mb-3 font-bold text-white">Tài liệu đã tham chiếu</h3>
                      <div className="space-y-2">
                        {workflowResult.referencedDocuments.map(doc => (
                          <div key={doc.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                            <p className="font-semibold text-white">{doc.title}</p>
                            <p className="text-sm text-[#f5edd6]/55">{doc.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <h3 className="mb-3 font-bold text-white">Log hành động AI</h3>
                      <div className="space-y-2">
                        {workflowResult.agentActions.map(action => (
                          <div key={action.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm">
                            <span className="font-semibold text-white">{action.agentName || action.agentId}</span>
                            <span className="text-[#f5edd6]/55">{action.actionType}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[500px] items-center justify-center text-center">
                    <div>
                      <Workflow className="mx-auto mb-4 text-amber-300" size={44} />
                      <h3 className="text-xl font-bold text-white">Chạy thử workflow để xem kết quả</h3>
                      <p className="mt-2 text-sm text-[#f5edd6]/55">Kết quả sẽ tạo hồ sơ khách, log agent và task chăm sóc.</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Tổng lead", value: report?.totalLeads ?? 0, icon: Users },
                  { label: "Lead nóng", value: report?.temperatures.hot ?? 0, icon: Activity },
                  { label: "Khách chưa chăm sóc", value: report?.neglectedLeads ?? 0, icon: FileText },
                  { label: "Lead nóng chưa gọi", value: report?.hotNotCalled ?? 0, icon: ShieldCheck },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.label} className="p-5">
                      <Icon className="mb-4 text-amber-300" size={26} />
                      <p className="text-sm text-[#f5edd6]/55">{item.label}</p>
                      <p className="mt-2 text-4xl font-black text-white">{item.value}</p>
                    </Card>
                  );
                })}
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-5">
                  <h2 className="mb-4 text-xl font-bold text-white">Sản phẩm được hỏi nhiều</h2>
                  <div className="space-y-3">
                    {(report?.topProducts || []).map(item => (
                      <div key={item.product} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                        <span className="font-semibold text-white">{item.product}</span>
                        <Pill className="border-amber-300/20 bg-amber-300/10 text-amber-200">{item.count} lead</Pill>
                      </div>
                    ))}
                    {!report?.topProducts.length && <p className="text-sm text-[#f5edd6]/55">Chưa có dữ liệu.</p>}
                  </div>
                </Card>
                <Card className="p-5">
                  <h2 className="mb-4 text-xl font-bold text-white">Lý do từ chối phổ biến</h2>
                  <div className="space-y-3">
                    {(report?.rejectionReasons || []).map(item => (
                      <div key={item.reason} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
                        <span className="font-semibold text-white">{item.reason}</span>
                        <Pill className="border-white/10 bg-white/5 text-[#f5edd6]/55">{item.count}</Pill>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
