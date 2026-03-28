"use client";
import { useState, useEffect } from "react";
import {
  Mail, Plus, Send, Eye, Trash2, FileText, Users, BarChart3,
  ChevronRight, Clock, CheckCircle, AlertCircle, Loader2,
  Palette, Copy, Edit3, X, Search, Bot, Play, Pause,
  Settings, Save, Download, TrendingUp, Zap,
  Target, Activity, ArrowUpRight, Tag,
} from "lucide-react";
import type {
  EmailCampaign, EmailTemplate, EmailSegment, EmailTemplateCategory,
} from "@/lib/crm-email-store";
import { SEGMENT_LABELS, TEMPLATE_CATEGORY_LABELS } from "@/lib/crm-email-store";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Tab = "campaigns" | "templates" | "builder" | "workflows" | "performance" | "settings";

interface EmailWorkflow {
  id: string;
  name: string;
  description: string;
  triggerType: "new_lead" | "tag_added" | "stage_changed" | "manual" | "no_activity";
  status: "active" | "inactive" | "draft";
  steps: WorkflowStep[];
  createdAt: string;
  runCount: number;
}
interface WorkflowStep {
  id: string;
  stepOrder: number;
  delayDays: number;
  templateId: string;
  templateName: string;
  subject: string;
}
interface AutomationConfig {
  enabled: boolean;
  scheduleTime: string;
  timezone: string;
  senderName: string;
  senderEmail: string;
  retryCount: number;
  emailSignature: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:     { label: "Bản nháp",    color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  scheduled: { label: "Đã lên lịch", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  sending:   { label: "Đang gửi",    color: "#C9A84C", bg: "rgba(201,168,76,0.12)" },
  sent:      { label: "Đã gửi",      color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  failed:    { label: "Thất bại",    color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};
const WORKFLOW_STATUS_CONFIG = {
  active:   { label: "Đang chạy", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  inactive: { label: "Tạm dừng",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  draft:    { label: "Bản nháp",  color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
};
const TRIGGER_LABELS: Record<string, string> = {
  new_lead:      "Lead mới được tạo",
  tag_added:     "Thêm tag",
  stage_changed: "Chuyển giai đoạn",
  manual:        "Kích hoạt thủ công",
  no_activity:   "Không tương tác",
};
const CATEGORY_COLORS: Record<EmailTemplateCategory, string> = {
  intro:    "#60a5fa",
  quote:    "#C9A84C",
  followup: "#a78bfa",
  promo:    "#f87171",
  event:    "#22c55e",
  custom:   "#94a3b8",
};
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "campaigns",   label: "Chiến dịch",   icon: Send },
  { id: "templates",   label: "Mẫu Email",    icon: FileText },
  { id: "builder",     label: "Email Builder", icon: Palette },
  { id: "workflows",   label: "Workflow",      icon: Zap },
  { id: "performance", label: "Hiệu suất",     icon: BarChart3 },
  { id: "settings",    label: "Cài đặt",       icon: Settings },
];

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  initialCampaigns: EmailCampaign[];
  initialTemplates: EmailTemplate[];
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function EmailMarketingClient({ initialCampaigns, initialTemplates }: Props) {
  const [tab, setTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [templates, setTemplates] = useState(initialTemplates);
  const [workflows, setWorkflows] = useState<EmailWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);

  const totalSent = campaigns.filter(c => c.status === "sent").reduce((s, c) => s + c.sentCount, 0);
  const totalOpens = campaigns.filter(c => c.status === "sent").reduce((s, c) => s + c.openCount, 0);
  const totalClicks = campaigns.filter(c => c.status === "sent").reduce((s, c) => s + c.clickCount, 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
  const avgClickRate = totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0;

  useEffect(() => {
    if (tab === "workflows") loadWorkflows();
  }, [tab]);

  async function loadWorkflows() {
    try {
      const res = await fetch("/api/crm/email/workflows");
      if (res.ok) setWorkflows(await res.json());
    } catch {}
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Xóa chiến dịch này?")) return;
    await fetch("/api/crm/email/campaigns", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCampaigns(prev => prev.filter(c => c.id !== id));
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Xóa template này?")) return;
    await fetch("/api/crm/email/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  async function toggleWorkflow(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await fetch("/api/crm/email/workflows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: newStatus as EmailWorkflow["status"] } : w));
  }

  async function seedTemplates() {
    setLoading(true);
    await fetch("/api/crm/email/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_templates" }),
    });
    const res = await fetch("/api/crm/email/templates");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }

  const filteredCampaigns = campaigns.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTemplates = templates.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Mail size={20} style={{ color: "#C9A84C" }} />
              Email Marketing
            </h1>
            <p className="text-xs mt-0.5 text-gray-500">
              Quản lý chiến dịch, mẫu email, workflow tự động và theo dõi hiệu suất
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-8 pr-3 py-2 text-sm rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none w-44"
                style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }}
              />
            </div>
            {tab === "campaigns" && (
              <button onClick={() => setShowNewCampaign(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
                <Plus size={14} /> Tạo chiến dịch
              </button>
            )}
            {tab === "templates" && (
              <button onClick={() => setShowNewTemplate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
                <Plus size={14} /> Tạo template
              </button>
            )}
            {tab === "workflows" && (
              <button onClick={() => setShowNewWorkflow(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
                <Plus size={14} /> Tạo workflow
              </button>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            { label: "Chiến dịch",   value: campaigns.length,                                  icon: Send,       color: "#60a5fa" },
            { label: "Đã gửi",       value: campaigns.filter(c => c.status === "sent").length, icon: CheckCircle,color: "#22c55e" },
            { label: "Tổng email",   value: totalSent.toLocaleString("vi-VN"),                 icon: Mail,       color: "#C9A84C" },
            { label: "Tỷ lệ mở",    value: `${avgOpenRate}%`,                                 icon: Eye,        color: "#a78bfa" },
            { label: "Tỷ lệ click", value: `${avgClickRate}%`,                                icon: Target,     color: "#f87171" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
              style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${kpi.color}18` }}>
                <kpi.icon size={14} style={{ color: kpi.color }} />
              </div>
              <div>
                <div className="text-base font-bold text-gray-900 leading-tight">{kpi.value}</div>
                <div className="text-[10px] text-gray-500">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold relative transition-colors whitespace-nowrap"
              style={{ color: tab === id ? "#C9A84C" : "#6b7280" }}>
              <Icon size={13} />
              {label}
              {tab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "#C9A84C" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── TAB: Chiến dịch ── */}
        {tab === "campaigns" && (
          <div className="space-y-3">
            {filteredCampaigns.length === 0 ? (
              <EmptyState
                icon={<Send size={32} style={{ color: "#C9A84C" }} />}
                title="Chưa có chiến dịch nào"
                description="Tạo chiến dịch email đầu tiên để bắt đầu tiếp cận khách hàng B2B"
                action={
                  <button onClick={() => setShowNewCampaign(true)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-black mt-3"
                    style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
                    + Tạo chiến dịch đầu tiên
                  </button>
                }
              />
            ) : (
              filteredCampaigns.map(campaign => {
                const sc = STATUS_CONFIG[campaign.status];
                const openRate = campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0;
                const clickRate = campaign.sentCount > 0 ? Math.round((campaign.clickCount / campaign.sentCount) * 100) : 0;
                return (
                  <div key={campaign.id} className="rounded-2xl p-4 transition-all hover:shadow-sm"
                    style={{ border: "1px solid #e5e7eb", background: "#fff" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900 truncate">{campaign.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate mb-2">{campaign.subject}</div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {SEGMENT_LABELS[campaign.segment]}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(campaign.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {campaign.status === "sent" && (
                          <>
                            <div className="text-center">
                              <div className="text-sm font-bold text-gray-900">{campaign.sentCount.toLocaleString()}</div>
                              <div className="text-[10px] text-gray-500">Đã gửi</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-bold" style={{ color: "#a78bfa" }}>{openRate}%</div>
                              <div className="text-[10px] text-gray-500">Mở</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-bold" style={{ color: "#22c55e" }}>{clickRate}%</div>
                              <div className="text-[10px] text-gray-500">Click</div>
                            </div>
                          </>
                        )}
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingCampaign(campaign)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                            style={{ border: "1px solid #e5e7eb" }}>
                            <Edit3 size={12} className="text-gray-500" />
                          </button>
                          <button onClick={() => deleteCampaign(campaign.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                            style={{ border: "1px solid #e5e7eb" }}>
                            <Trash2 size={12} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {campaign.status === "sent" && campaign.sentCount > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f3f4f6" }}>
                        <div className="flex justify-between text-[10px] mb-1 text-gray-400">
                          <span>Tỷ lệ mở</span>
                          <span>{openRate}%</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                          <div className="h-full rounded-full" style={{ width: `${openRate}%`, background: "#22c55e" }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB: Mẫu Email ── */}
        {tab === "templates" && (
          <div>
            {filteredTemplates.length === 0 ? (
              <EmptyState
                icon={<FileText size={32} style={{ color: "#60a5fa" }} />}
                title="Chưa có mẫu email nào"
                description="Tạo mẫu email để tái sử dụng trong các chiến dịch"
                action={
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setShowNewTemplate(true)}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-black"
                      style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
                      + Tạo mẫu mới
                    </button>
                    <button onClick={seedTemplates} disabled={loading}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                      style={{ border: "1px solid #e5e7eb" }}>
                      {loading ? <Loader2 size={14} className="animate-spin inline" /> : "Tải mẫu mặc định"}
                    </button>
                  </div>
                }
              />
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {filteredTemplates.map(template => {
                  const catColor = CATEGORY_COLORS[template.category];
                  return (
                    <div key={template.id} className="rounded-2xl overflow-hidden hover:shadow-sm transition-all group"
                      style={{ border: "1px solid #e5e7eb", background: "#fff" }}>
                      <div className="h-28 overflow-hidden relative cursor-pointer" onClick={() => setPreviewTemplate(template)}
                        style={{ background: "#050505" }}>
                        <div className="absolute inset-0 p-2 overflow-hidden"
                          style={{ transform: "scale(0.4)", transformOrigin: "top left", width: "250%", height: "250%" }}>
                          <div dangerouslySetInnerHTML={{ __html: template.htmlContent }} />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(0,0,0,0.55)" }}>
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-900"
                            style={{ background: "rgba(255,255,255,0.92)" }}>
                            <Eye size={11} /> Xem trước
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 truncate flex-1">{template.name}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                            style={{ background: `${catColor}15`, color: catColor }}>
                            {TEMPLATE_CATEGORY_LABELS[template.category]}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate mb-2">{template.subject}</div>
                        <div className="flex gap-1">
                          <button onClick={() => setPreviewTemplate(template)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                            style={{ border: "1px solid #e5e7eb", color: "#6b7280" }}>
                            <Eye size={11} /> Xem trước
                          </button>
                          <button onClick={() => deleteTemplate(template.id)}
                            className="w-8 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                            style={{ border: "1px solid #e5e7eb" }}>
                            <Trash2 size={12} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setShowNewTemplate(true)}
                  className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-yellow-400 hover:bg-yellow-50/30 transition-all min-h-[160px]"
                  style={{ borderColor: "#e5e7eb" }}>
                  <Plus size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-400 font-medium">Tạo mẫu mới</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Email Builder ── */}
        {tab === "builder" && (
          <EmailBuilderTab templates={templates} onTemplateSaved={(t) => setTemplates(prev => [t, ...prev])} />
        )}

        {/* ── TAB: Workflow ── */}
        {tab === "workflows" && (
          <div className="space-y-3">
            <div className="rounded-xl px-4 py-3 flex items-center gap-3 mb-2"
              style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
              <Zap size={16} style={{ color: "#60a5fa" }} />
              <p className="text-xs text-gray-600">
                Workflow tự động gửi chuỗi email theo hành động khách hàng. Mỗi bước có thể đặt thời gian trễ riêng.
              </p>
            </div>
            {workflows.length === 0 ? (
              <EmptyState
                icon={<Zap size={32} style={{ color: "#60a5fa" }} />}
                title="Chưa có workflow nào"
                description="Tạo workflow để tự động hóa chuỗi email chăm sóc khách hàng"
                action={
                  <button onClick={() => setShowNewWorkflow(true)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-black mt-3"
                    style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
                    + Tạo workflow đầu tiên
                  </button>
                }
              />
            ) : (
              workflows.map(wf => {
                const wsc = WORKFLOW_STATUS_CONFIG[wf.status];
                return (
                  <div key={wf.id} className="rounded-2xl p-4 transition-all hover:shadow-sm"
                    style={{ border: "1px solid #e5e7eb", background: "#fff" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900">{wf.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: wsc.bg, color: wsc.color }}>
                            {wsc.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{wf.description}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Activity size={11} />
                            {TRIGGER_LABELS[wf.triggerType] || wf.triggerType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail size={11} />
                            {wf.steps?.length || 0} bước
                          </span>
                          <span className="flex items-center gap-1">
                            <Send size={11} />
                            {wf.runCount || 0} lần chạy
                          </span>
                        </div>
                        {wf.steps && wf.steps.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {wf.steps.slice(0, 4).map((step, i) => (
                              <div key={step.id} className="flex items-center gap-1">
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                                  style={{ background: "#f3f4f6", color: "#6b7280" }}>
                                  {step.delayDays > 0 ? `+${step.delayDays}d` : "Ngay"}: {(step.subject || "Email").substring(0, 18)}...
                                </span>
                                {i < Math.min(wf.steps.length - 1, 3) && (
                                  <ChevronRight size={10} className="text-gray-400" />
                                )}
                              </div>
                            ))}
                            {wf.steps.length > 4 && (
                              <span className="text-[10px] text-gray-400">+{wf.steps.length - 4} nữa</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button onClick={() => toggleWorkflow(wf.id, wf.status)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
                        style={{
                          background: wf.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.1)",
                          color: wf.status === "active" ? "#16a34a" : "#64748b",
                          border: `1px solid ${wf.status === "active" ? "rgba(34,197,94,0.3)" : "#e5e7eb"}`,
                        }}>
                        {wf.status === "active" ? <Pause size={11} /> : <Play size={11} />}
                        {wf.status === "active" ? "Tạm dừng" : "Kích hoạt"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB: Hiệu suất ── */}
        {tab === "performance" && (
          <PerformanceTab campaigns={campaigns} />
        )}

        {/* ── TAB: Cài đặt ── */}
        {tab === "settings" && (
          <SettingsTab />
        )}
      </div>

      {/* ── Modals ── */}
      {showNewCampaign && (
        <CampaignModal
          templates={templates}
          onClose={() => setShowNewCampaign(false)}
          onCreated={c => { setCampaigns(prev => [c, ...prev]); setShowNewCampaign(false); }}
        />
      )}
      {showNewTemplate && (
        <TemplateModal
          onClose={() => setShowNewTemplate(false)}
          onCreated={t => { setTemplates(prev => [t, ...prev]); setShowNewTemplate(false); }}
        />
      )}
      {showNewWorkflow && (
        <WorkflowModal
          templates={templates}
          onClose={() => setShowNewWorkflow(false)}
          onCreated={w => { setWorkflows(prev => [w, ...prev]); setShowNewWorkflow(false); }}
        />
      )}
      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
      {editingCampaign && (
        <CampaignModal
          templates={templates}
          editing={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onCreated={c => {
            setCampaigns(prev => prev.map(x => x.id === c.id ? c : x));
            setEditingCampaign(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Email Builder Tab ─────────────────────────────────────────────────────────
function EmailBuilderTab({ templates, onTemplateSaved }: { templates: EmailTemplate[]; onTemplateSaved: (t: EmailTemplate) => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<EmailTemplateCategory>("custom");
  const [previewText, setPreviewText] = useState("");
  const [htmlContent, setHtmlContent] = useState(`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1a1a1a,#0d0d0d);padding:40px;text-align:center;border-bottom:1px solid #222">
    <div style="font-size:28px;font-weight:900;color:#C9A84C;letter-spacing:2px">SMARTFURNI</div>
    <div style="font-size:12px;color:#888;margin-top:4px;letter-spacing:4px">NỘI THẤT THÔNG MINH</div>
  </div>
  <div style="padding:40px">
    <p style="font-size:16px;line-height:1.6;color:#e0e0e0">Xin chào <strong style="color:#C9A84C">{{name}}</strong>,</p>
    <p style="font-size:15px;line-height:1.7;color:#b0b0b0">Nội dung email của bạn ở đây...</p>
    <div style="text-align:center;margin:32px 0">
      <a href="#" style="background:linear-gradient(135deg,#C9A84C,#E2C97E);color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Xem chi tiết</a>
    </div>
  </div>
  <div style="padding:24px;text-align:center;border-top:1px solid #222">
    <p style="font-size:11px;color:#555;margin:0">SmartFurni — Nội thất thông minh cao cấp</p>
  </div>
</div>`);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const VARIABLES = ["name", "company", "phone", "email", "stage", "assignedTo"];

  function insertVariable(v: string) {
    const ta = document.getElementById("html-editor") as HTMLTextAreaElement;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const newVal = htmlContent.substring(0, s) + `{{${v}}}` + htmlContent.substring(e);
    setHtmlContent(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + v.length + 4, s + v.length + 4); }, 0);
  }

  async function handleSave() {
    if (!name || !subject) { alert("Vui lòng nhập tên và tiêu đề email"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, category, previewText, htmlContent }),
      });
      if (res.ok) {
        const t = await res.json();
        onTemplateSaved(t);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="grid grid-cols-2 gap-6" style={{ minHeight: "600px" }}>
      {/* Left: Editor */}
      <div className="space-y-4">
        <div className="rounded-2xl p-5" style={{ border: "1px solid #e5e7eb" }}>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Thông tin template</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên template *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="VD: Email chào mừng B2B"
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề email *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="VD: Giải pháp nội thất cho dự án của bạn"
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Danh mục</label>
                <select value={category} onChange={e => setCategory(e.target.value as EmailTemplateCategory)}
                  className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                  {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Preview text</label>
                <input value={previewText} onChange={e => setPreviewText(e.target.value)}
                  placeholder="Mô tả ngắn..."
                  className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ border: "1px solid #e5e7eb" }}>
          <div className="flex items-center gap-2 mb-3">
            <Tag size={13} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-700">Biến động (click để chèn)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map(v => (
              <button key={v} onClick={() => insertVariable(v)}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium hover:bg-yellow-50 transition-colors"
                style={{ border: "1px solid #e5e7eb", color: "#C9A84C" }}>
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <span className="text-xs font-semibold text-gray-700">HTML Content</span>
          </div>
          <textarea
            id="html-editor"
            value={htmlContent}
            onChange={e => setHtmlContent(e.target.value)}
            className="w-full p-4 text-xs font-mono focus:outline-none resize-none"
            style={{ minHeight: "200px", background: "#1e1e1e", color: "#d4d4d4" }}
            rows={12}
          />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2"
          style={{ background: saving ? "#e5e7eb" : "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Đang lưu..." : saved ? "✓ Đã lưu!" : "Lưu template"}
        </button>
      </div>

      {/* Right: Preview */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <Eye size={13} className="text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Preview Email</span>
        </div>
        <div className="overflow-auto" style={{ height: "calc(100% - 40px)", background: "#f3f4f6" }}>
          <div className="p-4">
            {subject && <div className="text-xs font-semibold text-gray-700 mb-2 px-2">Tiêu đề: {subject}</div>}
            <iframe
              srcDoc={htmlContent}
              className="w-full rounded-xl"
              style={{ minHeight: "500px", border: "none", background: "#fff" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Performance Tab ───────────────────────────────────────────────────────────
function PerformanceTab({ campaigns }: { campaigns: EmailCampaign[] }) {
  const sentCampaigns = campaigns.filter(c => c.status === "sent");
  const totalSent = sentCampaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalOpened = sentCampaigns.reduce((s, c) => s + c.openCount, 0);
  const totalClicked = sentCampaigns.reduce((s, c) => s + c.clickCount, 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tổng email đã gửi",   value: totalSent.toLocaleString("vi-VN"),  icon: Send,       color: "#60a5fa" },
          { label: "Tổng email được mở",  value: totalOpened.toLocaleString("vi-VN"), icon: Eye,        color: "#a78bfa" },
          { label: "Tỷ lệ mở trung bình", value: `${avgOpenRate}%`,                  icon: TrendingUp, color: "#22c55e" },
          { label: "Tỷ lệ click",         value: `${avgClickRate}%`,                 icon: Target,     color: "#C9A84C" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ border: "1px solid #e5e7eb", background: "#fff" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${kpi.color}15` }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
              <ArrowUpRight size={14} style={{ color: "#22c55e" }} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <h3 className="text-sm font-bold text-gray-900">Hiệu suất từng chiến dịch</h3>
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            style={{ border: "1px solid #e5e7eb" }}>
            <Download size={12} /> Xuất CSV
          </button>
        </div>
        {sentCampaigns.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">Chưa có chiến dịch nào được gửi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
                  {["Chiến dịch", "Phân khúc", "Đã gửi", "Đã mở", "Tỷ lệ mở", "Click", "Tỷ lệ click", "Ngày gửi"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sentCampaigns.map((c, i) => {
                  const openRate = c.sentCount > 0 ? ((c.openCount / c.sentCount) * 100).toFixed(1) : "0";
                  const clickRate = c.sentCount > 0 ? ((c.clickCount / c.sentCount) * 100).toFixed(1) : "0";
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: i < sentCampaigns.length - 1 ? "1px solid #f3f4f6" : "none" }}
                      className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{SEGMENT_LABELS[c.segment]}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{c.sentCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-900">{c.openCount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold" style={{ color: parseFloat(openRate) >= 20 ? "#22c55e" : "#C9A84C" }}>
                          {openRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{c.clickCount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold" style={{ color: parseFloat(clickRate) >= 5 ? "#22c55e" : "#94a3b8" }}>
                          {clickRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {c.sentAt ? new Date(c.sentAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl p-5" style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}>
        <h3 className="text-sm font-bold text-gray-900 mb-3">Benchmark ngành B2B</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { metric: "Tỷ lệ mở",              industry: "21.5%", yours: `${avgOpenRate}%`, good: parseFloat(avgOpenRate) >= 21.5 },
            { metric: "Tỷ lệ click",            industry: "2.3%",  yours: `${avgClickRate}%`, good: parseFloat(avgClickRate) >= 2.3 },
            { metric: "Tỷ lệ hủy đăng ký",     industry: "< 0.5%", yours: "0.1%", good: true },
          ].map((b, i) => (
            <div key={i} className="rounded-xl p-3 bg-white" style={{ border: "1px solid #e5e7eb" }}>
              <div className="text-xs text-gray-500 mb-1">{b.metric}</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400">Ngành: {b.industry}</div>
                  <div className="text-base font-bold" style={{ color: b.good ? "#22c55e" : "#f59e0b" }}>{b.yours}</div>
                </div>
                {b.good
                  ? <CheckCircle size={18} style={{ color: "#22c55e" }} />
                  : <AlertCircle size={18} style={{ color: "#f59e0b" }} />
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const [config, setConfig] = useState<AutomationConfig>({
    enabled: true,
    scheduleTime: "09:00",
    timezone: "Asia/Ho_Chi_Minh",
    senderName: "SmartFurni",
    senderEmail: "noreply@smartfurni.com",
    retryCount: 3,
    emailSignature: "Trân trọng,\nĐội ngũ SmartFurni\nHotline: 1900 xxxx",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/crm/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailConfig: config }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-2xl p-5" style={{ border: "1px solid #e5e7eb" }}>
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Mail size={14} style={{ color: "#C9A84C" }} /> Thông tin người gửi
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên người gửi</label>
              <input value={config.senderName} onChange={e => setConfig(p => ({ ...p, senderName: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email người gửi</label>
              <input type="email" value={config.senderEmail} onChange={e => setConfig(p => ({ ...p, senderEmail: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Chữ ký email</label>
            <textarea value={config.emailSignature} onChange={e => setConfig(p => ({ ...p, emailSignature: e.target.value }))}
              rows={3} className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none resize-none"
              style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ border: "1px solid #e5e7eb" }}>
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap size={14} style={{ color: "#60a5fa" }} /> Cài đặt tự động hoá
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 rounded-xl px-3"
            style={{ background: config.enabled ? "rgba(34,197,94,0.06)" : "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div>
              <div className="text-sm font-semibold text-gray-900">Bật tự động hoá email hàng ngày</div>
              <div className="text-xs text-gray-500">Tự động gửi email theo lịch đã cài đặt</div>
            </div>
            <button onClick={() => setConfig(p => ({ ...p, enabled: !p.enabled }))}
              className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
              style={{ background: config.enabled ? "#22c55e" : "#d1d5db" }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: config.enabled ? "translateX(22px)" : "translateX(2px)" }} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giờ gửi hàng ngày</label>
              <input type="time" value={config.scheduleTime} onChange={e => setConfig(p => ({ ...p, scheduleTime: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Múi giờ</label>
              <select value={config.timezone} onChange={e => setConfig(p => ({ ...p, timezone: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Số lần thử lại khi lỗi</label>
            <input type="number" min={0} max={5} value={config.retryCount}
              onChange={e => setConfig(p => ({ ...p, retryCount: parseInt(e.target.value) }))}
              className="w-32 px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-black"
        style={{ background: saving ? "#e5e7eb" : "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? "Đang lưu..." : saved ? "✓ Đã lưu thành công!" : "Lưu cài đặt"}
      </button>
    </div>
  );
}

// ─── Campaign Modal ────────────────────────────────────────────────────────────
function CampaignModal({
  templates, onClose, onCreated, editing,
}: {
  templates: EmailTemplate[];
  onClose: () => void;
  onCreated: (c: EmailCampaign) => void;
  editing?: EmailCampaign | null;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    subject: editing?.subject ?? "",
    segment: (editing?.segment ?? "all") as EmailSegment,
    templateId: editing?.templateId ?? "",
    htmlContent: editing?.htmlContent ?? "",
    scheduledAt: editing?.scheduledAt ?? "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.subject) return;
    setLoading(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch("/api/crm/email/campaigns", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onCreated(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <Modal title={editing ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch mới"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tên chiến dịch *">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="VD: Email B2B tháng 4/2026"
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
        </Field>
        <Field label="Tiêu đề email *">
          <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            placeholder="VD: Ưu đãi đặc biệt dành cho đối tác SmartFurni"
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phân khúc khách hàng">
            <select value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value as EmailSegment }))}
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}>
              {Object.entries(SEGMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Dùng template có sẵn">
            <select value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <option value="">— Không dùng template —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Lên lịch gửi (tùy chọn)">
          <input type="datetime-local" value={form.scheduledAt}
            onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
        </Field>
        <button type="submit" disabled={loading || !form.name || !form.subject}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2"
          style={{ background: loading ? "#e5e7eb" : "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {loading ? "Đang lưu..." : editing ? "Cập nhật chiến dịch" : "Tạo chiến dịch"}
        </button>
      </form>
    </Modal>
  );
}

// ─── Template Modal ────────────────────────────────────────────────────────────
function TemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: EmailTemplate) => void }) {
  const [form, setForm] = useState({ name: "", subject: "", category: "custom" as EmailTemplateCategory, previewText: "", htmlContent: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.subject) return;
    setLoading(true);
    try {
      const res = await fetch("/api/crm/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) onCreated(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <Modal title="Tạo mẫu email mới" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tên template *">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="VD: Email chào mừng B2B"
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
        </Field>
        <Field label="Tiêu đề email *">
          <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            placeholder="VD: Giải pháp nội thất thông minh"
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
        </Field>
        <Field label="Danh mục">
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as EmailTemplateCategory }))}
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}>
            {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <button type="submit" disabled={loading || !form.name || !form.subject}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2"
          style={{ background: loading ? "#e5e7eb" : "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {loading ? "Đang lưu..." : "Tạo template"}
        </button>
      </form>
    </Modal>
  );
}

// ─── Workflow Modal ────────────────────────────────────────────────────────────
function WorkflowModal({ templates, onClose, onCreated }: {
  templates: EmailTemplate[];
  onClose: () => void;
  onCreated: (w: EmailWorkflow) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    triggerType: "new_lead" as EmailWorkflow["triggerType"],
  });
  const [steps, setSteps] = useState<{ delayDays: number; templateId: string; subject: string }[]>([
    { delayDays: 0, templateId: "", subject: "" },
  ]);
  const [loading, setLoading] = useState(false);

  function addStep() {
    setSteps(prev => [...prev, { delayDays: 1, templateId: "", subject: "" }]);
  }
  function removeStep(i: number) {
    setSteps(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/crm/email/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, steps }),
      });
      if (res.ok) onCreated(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <Modal title="Tạo workflow email" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tên workflow *">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="VD: Chào mừng lead mới"
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
          </Field>
          <Field label="Trigger kích hoạt">
            <select value={form.triggerType} onChange={e => setForm(p => ({ ...p, triggerType: e.target.value as EmailWorkflow["triggerType"] }))}
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}>
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Mô tả">
          <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Mô tả ngắn về workflow..."
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }} />
        </Field>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700">Các bước email ({steps.length})</label>
            <button type="button" onClick={addStep}
              className="text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
              style={{ border: "1px solid #e5e7eb", color: "#C9A84C" }}>
              <Plus size={11} /> Thêm bước
            </button>
          </div>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="rounded-xl p-3 flex items-center gap-3"
                style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "#C9A84C20", color: "#C9A84C" }}>{i + 1}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-500">Trễ</span>
                  <input type="number" min={0} value={step.delayDays}
                    onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, delayDays: parseInt(e.target.value) || 0 } : s))}
                    className="w-12 px-2 py-1 text-xs rounded-lg text-center focus:outline-none"
                    style={{ border: "1px solid #e5e7eb", background: "#fff" }} />
                  <span className="text-xs text-gray-500">ngày</span>
                </div>
                <input value={step.subject}
                  onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, subject: e.target.value } : s))}
                  placeholder="Tiêu đề email bước này..."
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg focus:outline-none"
                  style={{ border: "1px solid #e5e7eb", background: "#fff" }} />
                <select value={step.templateId}
                  onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, templateId: e.target.value } : s))}
                  className="text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                  style={{ border: "1px solid #e5e7eb", background: "#fff", maxWidth: "120px" }}>
                  <option value="">Không dùng template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name.substring(0, 20)}</option>)}
                </select>
                {steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(i)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors flex-shrink-0">
                    <X size={12} className="text-gray-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading || !form.name}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2"
          style={{ background: loading ? "#e5e7eb" : "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {loading ? "Đang lưu..." : "Tạo workflow"}
        </button>
      </form>
    </Modal>
  );
}

// ─── Template Preview Modal ────────────────────────────────────────────────────
function TemplatePreviewModal({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl overflow-hidden flex flex-col"
        style={{ width: "680px", maxHeight: "85vh", border: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <div className="text-sm font-bold text-gray-900">{template.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tiêu đề: {template.subject}</div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4" style={{ background: "#f3f4f6" }}>
          <iframe
            srcDoc={template.htmlContent}
            className="w-full rounded-xl"
            style={{ minHeight: "500px", border: "none", background: "#fff" }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────
function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
        {icon}
      </div>
      <div className="text-base font-bold text-gray-900 mb-1">{title}</div>
      <div className="text-sm text-gray-500 max-w-xs">{description}</div>
      {action}
    </div>
  );
}

function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl overflow-hidden flex flex-col"
        style={{ width: wide ? "680px" : "480px", maxHeight: "85vh", border: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid #e5e7eb" }}>
          <span className="text-sm font-bold text-gray-900">{title}</span>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
