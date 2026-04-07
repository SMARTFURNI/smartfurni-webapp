"use client";
import { useState, useEffect } from "react";
import {
  Mail, Plus, Send, Eye, Trash2, FileText, Users, BarChart3,
  ChevronRight, Clock, CheckCircle, AlertCircle, Loader2,
  Palette, Copy, Edit2, Edit3, X, Search, Bot, Play, Pause,
  Settings, Save, Download, TrendingUp, Zap,
  Target, Activity, ArrowUpRight, Tag, FlaskConical, Rocket,
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
  scheduleTimeEnd: string;
  timezone: string;
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  retryCount: number;
  emailSignature: string;
  dailyLimit: number;
  minIntervalHours: number;
  allowedDays: string[];
  stopOnWon: boolean;
  stopOnUnsubscribe: boolean;
  blacklistDomains: string;
  trackOpens: boolean;
  trackClicks: boolean;
  unsubscribeLink: boolean;
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
  const [editingWorkflow, setEditingWorkflow] = useState<EmailWorkflow | null>(null);
  const [sendTestFor, setSendTestFor] = useState<{
    sourceType: "campaign" | "template" | "builder" | "workflow";
    sourceName: string;
    subject: string;
    htmlContent: string;
  } | null>(null);
  const [launchingCampaign, setLaunchingCampaign] = useState<EmailCampaign | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

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
    <div className="flex flex-col h-full bg-transparent">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
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
                className="pl-8 pr-3 py-2 text-sm rounded-xl text-gray-900 placeholder-[rgba(245,237,214,0.35)] focus:outline-none w-44"
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}
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
            {tab === "builder" && (
              <button
                onClick={() => setSendTestFor({ sourceType: "builder", sourceName: "Email Builder", subject: "", htmlContent: "" })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(96,165,250,0.1)", color: "#3b82f6", border: "1px solid rgba(96,165,250,0.3)" }}>
                <FlaskConical size={14} /> Gửi email test
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
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
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
                    style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
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
                          {(campaign.status === "draft" || campaign.status === "scheduled") && (
                            <button
                              onClick={() => setLaunchingCampaign(campaign)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              style={{ background: "linear-gradient(135deg,#C9A84C,#E2C97E)", color: "#000", border: "none" }}
                              title="Phát động chiến dịch — gửi email hàng loạt">
                              <Rocket size={11} /> Phát động
                            </button>
                          )}
                          <button
                            onClick={() => setSendTestFor({
                              sourceType: "campaign",
                              sourceName: campaign.name,
                              subject: campaign.subject,
                              htmlContent: campaign.htmlContent || `<div style="font-family:Arial,sans-serif;padding:32px;max-width:600px"><h2>${campaign.name}</h2><p>${campaign.subject}</p></div>`,
                            })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.10)", color: "#3b82f6" }}
                            title="Gửi email test">
                            <FlaskConical size={11} /> Test
                          </button>
                          <button onClick={() => setEditingCampaign(campaign)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-transparent transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                            <Edit3 size={12} className="text-[rgba(245,237,214,0.45)]" />
                          </button>
                          <button onClick={() => deleteCampaign(campaign.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                            <Trash2 size={12} className="text-[rgba(245,237,214,0.35)]" />
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
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "transparent" }}>
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
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-transparent transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
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
                      style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
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
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium hover:bg-transparent transition-colors flex items-center justify-center gap-1"
                            style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(245,237,214,0.50)" }}>
                            <Eye size={11} /> Xem trước
                          </button>
                          <button
                            onClick={() => setSendTestFor({
                              sourceType: "template",
                              sourceName: template.name,
                              subject: template.subject,
                              htmlContent: template.htmlContent,
                            })}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                            style={{ border: "1px solid rgba(255,255,255,0.10)", color: "#3b82f6" }}>
                            <FlaskConical size={11} /> Gửi test
                          </button>
                          <button onClick={() => setEditingTemplate(template)}
                            className="w-8 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50 transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.10)" }}
                            title="Chỉnh sửa mẫu email">
                            <Edit3 size={12} className="text-blue-500" />
                          </button>
                          <button onClick={() => deleteTemplate(template.id)}
                            className="w-8 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                            <Trash2 size={12} className="text-[rgba(245,237,214,0.35)]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setShowNewTemplate(true)}
                  className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-yellow-400 hover:bg-yellow-50/30 transition-all min-h-[160px]"
                  style={{ borderColor: "#e5e7eb" }}>
                  <Plus size={20} className="text-[rgba(245,237,214,0.35)]" />
                  <span className="text-sm text-gray-400 font-medium">Tạo mẫu mới</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Email Builder ── */}
        {tab === "builder" && (
          <EmailBuilderTab
            templates={templates}
            onTemplateSaved={(t) => setTemplates(prev => [t, ...prev])}
            onSendTest={(subject, htmlContent) => setSendTestFor({ sourceType: "builder", sourceName: "Email Builder", subject, htmlContent })}
          />
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
                    style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
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
                                  style={{ background: "transparent", color: "rgba(245,237,214,0.50)" }}>
                                  {step.delayDays > 0 ? `+${step.delayDays}d` : "Ngay"}: {(step.subject || "Email").substring(0, 18)}...
                                </span>
                                {i < Math.min(wf.steps.length - 1, 3) && (
                                  <ChevronRight size={10} className="text-[rgba(245,237,214,0.35)]" />
                                )}
                              </div>
                            ))}
                            {wf.steps.length > 4 && (
                              <span className="text-[10px] text-gray-400">+{wf.steps.length - 4} nữa</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            const firstStep = wf.steps?.[0];
                            setSendTestFor({
                              sourceType: "workflow",
                              sourceName: wf.name,
                              subject: firstStep?.subject || `[Workflow] ${wf.name}`,
                              htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px">
                                <h2 style="color:#1a1a1a">${wf.name}</h2>
                                <p style="color:#555">Trigger: ${wf.description || TRIGGER_LABELS[wf.triggerType] || wf.triggerType}</p>
                                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
                                <h3 style="color:#374151;font-size:14px">Các bước trong workflow (${wf.steps?.length || 0} bước):</h3>
                                ${(wf.steps || []).map((s, i) => `<div style="margin:8px 0;padding:10px 14px;background:#f9fafb;border-radius:8px;border-left:3px solid #C9A84C"><strong style="font-size:13px">Bước ${i+1}</strong> ${s.delayDays > 0 ? `(sau ${s.delayDays} ngày)` : "(ngay lập tức)"}: <span style="color:#374151">${s.subject || s.templateName || "Email"}</span></div>`).join("")}
                              </div>`,
                            });
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: "rgba(96,165,250,0.08)", color: "#3b82f6", border: "1px solid rgba(96,165,250,0.25)" }}>
                          <FlaskConical size={11} /> Gửi test
                        </button>
                        <button onClick={() => setEditingWorkflow(wf)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: "transparent", color: "rgba(245,237,214,0.85)", border: "1px solid rgba(255,255,255,0.10)" }}>
                          <Edit2 size={11} /> Sửa
                        </button>
                        <button onClick={() => toggleWorkflow(wf.id, wf.status)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
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
      {editingWorkflow && (
        <WorkflowModal
          templates={templates}
          editing={editingWorkflow}
          onClose={() => setEditingWorkflow(null)}
          onCreated={w => {
            setWorkflows(prev => prev.map(x => x.id === w.id ? w : x));
            setEditingWorkflow(null);
          }}
        />
      )}
      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
      {sendTestFor && (
        <SendTestEmailModal
          sourceType={sendTestFor.sourceType}
          sourceName={sendTestFor.sourceName}
          defaultSubject={sendTestFor.subject}
          defaultHtmlContent={sendTestFor.htmlContent}
          onClose={() => setSendTestFor(null)}
        />
      )}
      {launchingCampaign && (
        <LaunchCampaignModal
          campaign={launchingCampaign}
          onClose={() => setLaunchingCampaign(null)}
          onLaunched={(updated) => {
            setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
            setLaunchingCampaign(null);
          }}
        />
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
      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={(updated) => {
            setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Email Builder Tab ─────────────────────────────────────────────────────────
function EmailBuilderTab({ templates, onTemplateSaved, onSendTest }: { templates: EmailTemplate[]; onTemplateSaved: (t: EmailTemplate) => void; onSendTest?: (subject: string, htmlContent: string) => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<EmailTemplateCategory>("custom");
  const [previewText, setPreviewText] = useState("");
  const [editorMode, setEditorMode] = useState<"html" | "text">("html");
  const [plainText, setPlainText] = useState("Kính gửi anh/chị {{name}},\n\nNội dung email của bạn ở đây...\n\nTrân trọng,\nPhạm Nhất Bá Tuất\nGiám đốc Kinh doanh · SmartFurni\n📞 0820 xxx xxx · 🌐 smartfurni.vn");
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
    if (editorMode === "text") {
      const ta = document.getElementById("builder-text-editor") as HTMLTextAreaElement;
      if (!ta) return;
      const s = ta.selectionStart, e = ta.selectionEnd;
      const newVal = plainText.substring(0, s) + `{{${v}}}` + plainText.substring(e);
      setPlainText(newVal);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(s + v.length + 4, s + v.length + 4); }, 0);
    } else {
      const ta = document.getElementById("html-editor") as HTMLTextAreaElement;
      if (!ta) return;
      const s = ta.selectionStart, e = ta.selectionEnd;
      const newVal = htmlContent.substring(0, s) + `{{${v}}}` + htmlContent.substring(e);
      setHtmlContent(newVal);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(s + v.length + 4, s + v.length + 4); }, 0);
    }
  }

  function plainTextToHtml(text: string): string {
    const lines = text.split("\n");
    const htmlLines = lines.map(line => {
      if (line.trim() === "") return "<br>";
      return `<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 12px">${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    });
    return `<!DOCTYPE html>\n<html><head><meta charset="UTF-8"></head>\n<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif">\n<table width="100%" cellpadding="0" cellspacing="0" border="0">\n<tr><td style="padding:32px 24px;max-width:600px">\n${htmlLines.join("\n")}\n<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px">\n<p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:0">\nSmartFurni · smartfurni.vn<br>\n<a href="{{unsubscribe_url}}" style="color:#9ca3af">Hủy nhận email</a>\n</p>\n</td></tr>\n</table>\n</body></html>`;
  }

  const finalHtml = editorMode === "text" ? plainTextToHtml(plainText) : htmlContent;

  async function handleSave() {
    if (!name || !subject) { alert("Vui lòng nhập tên và tiêu đề email"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, category, previewText, htmlContent: finalHtml }),
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
        <div className="rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Thông tin template</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên template *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="VD: Email chào mừng B2B"
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề email *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="VD: Giải pháp nội thất cho dự án của bạn"
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Danh mục</label>
                <select value={category} onChange={e => setCategory(e.target.value as EmailTemplateCategory)}
                  className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}>
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
                  style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Tag size={13} className="text-[rgba(245,237,214,0.45)]" />
            <span className="text-xs font-semibold text-gray-700">Biến động (click để chèn)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map(v => (
              <button key={v} onClick={() => insertVariable(v)}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium hover:bg-yellow-50 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.10)", color: "#C9A84C" }}>
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}>
            <span className="text-xs font-semibold text-gray-700">Nội dung email</span>
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
              <button
                onClick={() => setEditorMode("text")}
                className="px-3 py-1 text-xs font-semibold transition-colors"
                style={{
                  background: editorMode === "text" ? "#1e1e1e" : "transparent",
                  color: editorMode === "text" ? "#d4d4d4" : "#6b7280",
                  borderRight: "1px solid rgba(255,255,255,0.08)",
                }}>
                ✏️ Văn bản
              </button>
              <button
                onClick={() => setEditorMode("html")}
                className="px-3 py-1 text-xs font-semibold transition-colors"
                style={{
                  background: editorMode === "html" ? "#1e1e1e" : "transparent",
                  color: editorMode === "html" ? "#d4d4d4" : "#6b7280",
                }}>
                {"</>"}  HTML
              </button>
            </div>
          </div>
          {editorMode === "text" ? (
            <div className="p-3" style={{ background: "#fafafa" }}>
              <div className="text-xs text-gray-400 mb-2">
                Soạn thảo như viết email thông thường. Dùng **chữ đậm** để in đậm. Click biến động ở trên để chèn.
              </div>
              <textarea
                id="builder-text-editor"
                value={plainText}
                onChange={e => setPlainText(e.target.value)}
                className="w-full p-3 text-sm focus:outline-none resize-none rounded-xl"
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#1a1a1a",
                  minHeight: "220px",
                  fontFamily: "Arial, sans-serif",
                  lineHeight: "1.7",
                }}
                rows={10}
              />
            </div>
          ) : (
            <textarea
              id="html-editor"
              value={htmlContent}
              onChange={e => setHtmlContent(e.target.value)}
              className="w-full p-4 text-xs font-mono focus:outline-none resize-none"
              style={{ minHeight: "200px", background: "#1e1e1e", color: "#d4d4d4" }}
              rows={12}
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSendTest?.(subject, finalHtml)}
            disabled={!subject && !finalHtml}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: "rgba(96,165,250,0.1)", color: "#3b82f6", border: "1px solid rgba(96,165,250,0.3)" }}>
            <FlaskConical size={14} /> Gửi email test
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2"
            style={{ background: saving ? "#e5e7eb" : "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Đang lưu..." : saved ? "✓ Đã lưu!" : "Lưu template"}
          </button>
        </div>
      </div>

      {/* Right: Preview */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}>
          <Eye size={13} className="text-[rgba(245,237,214,0.45)]" />
          <span className="text-xs font-semibold text-gray-700">Preview Email</span>
        </div>
        <div className="overflow-auto" style={{ height: "calc(100% - 40px)", background: "rgba(255,255,255,0.04)" }}>
          <div className="p-4">
            {subject && <div className="text-xs font-semibold text-gray-700 mb-2 px-2">Tiêu đề: {subject}</div>}
            <iframe
              srcDoc={finalHtml}
              className="w-full rounded-xl"
              style={{ minHeight: "500px", border: "none", background: "rgba(255,255,255,0.06)" }}
              sandbox="allow-same-origin"
              key={finalHtml.substring(0, 50)}
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
          <div key={i} className="rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
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

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}>
          <h3 className="text-sm font-bold text-gray-900">Hiệu suất từng chiến dịch</h3>
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-transparent transition-colors text-gray-600"
            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
            <Download size={12} /> Xuất CSV
          </button>
        </div>
        {sentCampaigns.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">Chưa có chiến dịch nào được gửi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}>
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
                      className="hover:bg-transparent/50 transition-colors">
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

      {/* Thống kê Inbox vs Promotions */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Phân loại hộp thư (Inbox vs Quảng cáo)</h3>
          <span className="text-xs text-gray-400 bg-transparent px-2 py-1 rounded-full">Dựa trên tỷ lệ mở email</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Inbox */}
          <div className="rounded-xl p-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#22c55e20" }}>
                <CheckCircle size={16} style={{ color: "#22c55e" }} />
              </div>
              <div className="text-sm font-semibold text-gray-800">Hộp thư đến (Primary)</div>
            </div>
            <div className="text-3xl font-bold" style={{ color: "#16a34a" }}>
              {totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Ưc tính dựa trên tỷ lệ mở email ({totalOpened.toLocaleString("vi-VN")} người mở)
            </div>
            <div className="mt-3 h-2 rounded-full bg-transparent overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${totalSent > 0 ? Math.min(100, Math.round((totalOpened / totalSent) * 100)) : 0}%`,
                background: "#22c55e"
              }} />
            </div>
          </div>
          {/* Promotions */}
          <div className="rounded-xl p-4" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#f59e0b20" }}>
                <Tag size={16} style={{ color: "#f59e0b" }} />
              </div>
              <div className="text-sm font-semibold text-gray-800">Quảng cáo (Promotions)</div>
            </div>
            <div className="text-3xl font-bold" style={{ color: "#d97706" }}>
              {totalSent > 0 ? Math.max(0, 100 - Math.round((totalOpened / totalSent) * 100)) : 100}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Ưc tính email chưa được mở ({(totalSent - totalOpened).toLocaleString("vi-VN")} email)
            </div>
            <div className="mt-3 h-2 rounded-full bg-transparent overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${totalSent > 0 ? Math.max(0, 100 - Math.round((totalOpened / totalSent) * 100)) : 100}%`,
                background: "#f59e0b"
              }} />
            </div>
          </div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={14} style={{ color: "#64748b", marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong>Lưu ý:</strong> Tỷ lệ Inbox/Promotions được ước tính dựa trên tỷ lệ mở email thực tế.
              Gmail không cung cấp API để biết chính xác email vào tab nào.
              Để cải thiện: thêm SPF record, dùng mẫu email B2B plain-text, cá nhân hóa nội dung.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}>
        <h3 className="text-sm font-bold text-gray-900 mb-3">Benchmark ngành B2B</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { metric: "Tỷ lệ mở",              industry: "21.5%", yours: `${avgOpenRate}%`, good: parseFloat(avgOpenRate) >= 21.5 },
            { metric: "Tỷ lệ click",            industry: "2.3%",  yours: `${avgClickRate}%`, good: parseFloat(avgClickRate) >= 2.3 },
            { metric: "Tỷ lệ hủy đăng ký",     industry: "< 0.5%", yours: "0.1%", good: true },
          ].map((b, i) => (
            <div key={i} className="rounded-xl p-3 bg-transparent" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
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
const DAYS_OF_WEEK = [
  { key: "Mon", label: "T2" },
  { key: "Tue", label: "T3" },
  { key: "Wed", label: "T4" },
  { key: "Thu", label: "T5" },
  { key: "Fri", label: "T6" },
  { key: "Sat", label: "T7" },
  { key: "Sun", label: "CN" },
];

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? "#22c55e" : "#d1d5db" }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-transparent shadow transition-transform"
        style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }} />
    </button>
  );
}

function SettingsTab() {
  const [config, setConfig] = useState<AutomationConfig>({
    enabled: true,
    scheduleTime: "09:00",
    scheduleTimeEnd: "17:00",
    timezone: "Asia/Ho_Chi_Minh",
    senderName: "SmartFurni",
    senderEmail: "noreply@smartfurni.com",
    replyToEmail: "",
    retryCount: 3,
    emailSignature: "Trân trọng,\nĐội ngũ SmartFurni\nHotline: 1900 xxxx",
    dailyLimit: 200,
    minIntervalHours: 24,
    allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    stopOnWon: true,
    stopOnUnsubscribe: true,
    blacklistDomains: "",
    trackOpens: true,
    trackClicks: true,
    unsubscribeLink: true,
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

      {/* ── Thông tin người gửi ── */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Mail size={14} style={{ color: "#C9A84C" }} /> Thông tin người gửi
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên người gửi</label>
              <input value={config.senderName} onChange={e => setConfig(p => ({ ...p, senderName: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email người gửi</label>
              <input type="email" value={config.senderEmail} onChange={e => setConfig(p => ({ ...p, senderEmail: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reply-to Email <span className="font-normal text-gray-400">(tùy chọn)</span></label>
            <input type="email" value={config.replyToEmail} onChange={e => setConfig(p => ({ ...p, replyToEmail: e.target.value }))}
              placeholder="sales@smartfurni.com"
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Chữ ký email</label>
            <textarea value={config.emailSignature} onChange={e => setConfig(p => ({ ...p, emailSignature: e.target.value }))}
              rows={3} className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none resize-none"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
          </div>
        </div>
      </div>

      {/* ── Lịch gửi ── */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={14} style={{ color: "#60a5fa" }} /> Lịch gửi email
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giờ bắt đầu gửi</label>
              <input type="time" value={config.scheduleTime} onChange={e => setConfig(p => ({ ...p, scheduleTime: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Giờ kết thúc gửi</label>
              <input type="time" value={config.scheduleTimeEnd} onChange={e => setConfig(p => ({ ...p, scheduleTimeEnd: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Múi giờ</label>
            <select value={config.timezone} onChange={e => setConfig(p => ({ ...p, timezone: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
              <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Ngày trong tuần được gửi</label>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map(d => {
                const active = config.allowedDays.includes(d.key);
                return (
                  <button key={d.key} type="button"
                    onClick={() => setConfig(p => ({
                      ...p,
                      allowedDays: active
                        ? p.allowedDays.filter(x => x !== d.key)
                        : [...p.allowedDays, d.key],
                    }))}
                    className="w-9 h-9 rounded-xl text-xs font-bold transition-colors"
                    style={{
                      background: active ? "rgba(201,168,76,0.15)" : "transparent",
                      color: active ? "#C9A84C" : "#9ca3af",
                      border: `1px solid ${active ? "#C9A84C" : "#e5e7eb"}`,
                    }}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Giới hạn & Kiểm soát ── */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target size={14} style={{ color: "#a78bfa" }} /> Giới hạn & Kiểm soát gửi
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số email tối đa/ngày</label>
              <input type="number" min={10} max={2000} value={config.dailyLimit}
                onChange={e => setConfig(p => ({ ...p, dailyLimit: parseInt(e.target.value) || 200 }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
              <p className="text-[10px] text-gray-400 mt-1">Giới hạn tổng email gửi mỗi ngày</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Khoảng cách tối thiểu (giờ)</label>
              <input type="number" min={1} max={168} value={config.minIntervalHours}
                onChange={e => setConfig(p => ({ ...p, minIntervalHours: parseInt(e.target.value) || 24 }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
              <p className="text-[10px] text-gray-400 mt-1">Thời gian chờ giữa 2 email cho cùng 1 lead</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Số lần thử lại khi lỗi</label>
            <input type="number" min={0} max={5} value={config.retryCount}
              onChange={e => setConfig(p => ({ ...p, retryCount: parseInt(e.target.value) }))}
              className="w-32 px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Blacklist domain <span className="font-normal text-gray-400">(phân cách bởi dấu phẩy)</span></label>
            <input value={config.blacklistDomains} onChange={e => setConfig(p => ({ ...p, blacklistDomains: e.target.value }))}
              placeholder="spam.com, test.com, ..."
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
          </div>
        </div>
      </div>

      {/* ── Điều kiện dừng ── */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle size={14} style={{ color: "#f87171" }} /> Điều kiện dừng workflow
        </h3>
        <div className="space-y-3">
          {[
            { key: "stopOnWon",          label: "Dừng khi lead chốt đơn (Won)",        desc: "Không gửi thêm email sau khi lead đã ký hợp đồng" },
            { key: "stopOnUnsubscribe",  label: "Dừng khi khách hủy đăng ký",          desc: "Tự động loại khỏi mọi workflow khi nhận unsubscribe" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div>
                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
              <ToggleSwitch
                value={config[item.key as keyof AutomationConfig] as boolean}
                onChange={v => setConfig(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Tracking ── */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={14} style={{ color: "#22c55e" }} /> Tracking & Tuân thủ
        </h3>
        <div className="space-y-3">
          {[
            { key: "trackOpens",       label: "Theo dõi tỷ lệ mở email",          desc: "Chèn pixel tracking vào email" },
            { key: "trackClicks",      label: "Theo dõi tỷ lệ click link",        desc: "Wrap links để đếm số lần click" },
            { key: "unsubscribeLink",  label: "Tự động thêm link hủy đăng ký",   desc: "Bắt buộc theo quy định CAN-SPAM / GDPR" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div>
                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
              <ToggleSwitch
                value={config[item.key as keyof AutomationConfig] as boolean}
                onChange={v => setConfig(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Bật/tắt tổng thể ── */}
      <div className="rounded-2xl p-4" style={{ background: config.enabled ? "rgba(34,197,94,0.04)" : "#fafafa", border: `1px solid ${config.enabled ? "rgba(34,197,94,0.3)" : "#e5e7eb"}` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">Tự động hoá email</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {config.enabled ? `Đang chạy · Gửi ${config.scheduleTime}–${config.scheduleTimeEnd} · Tối đa ${config.dailyLimit} email/ngày` : "Đã tắt — không có email nào được gửi tự động"}
            </div>
          </div>
          <ToggleSwitch value={config.enabled} onChange={v => setConfig(p => ({ ...p, enabled: v }))} />
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
            style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
        </Field>
        <Field label="Tiêu đề email *">
          <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            placeholder="VD: Ưu đãi đặc biệt dành cho đối tác SmartFurni"
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phân khúc khách hàng">
            <select value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value as EmailSegment }))}
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}>
              {Object.entries(SEGMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Dùng template có sẵn">
            <select value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}>
              <option value="">— Không dùng template —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Lên lịch gửi (tùy chọn)">
          <input type="datetime-local" value={form.scheduledAt}
            onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
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
            style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
        </Field>
        <Field label="Tiêu đề email *">
          <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
            placeholder="VD: Giải pháp nội thất thông minh"
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
        </Field>
        <Field label="Danh mục">
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as EmailTemplateCategory }))}
            className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}>
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
const STAGE_OPTIONS = [
  { value: "", label: "Tất cả giai đoạn" },
  { value: "new", label: "Lead mới" },
  { value: "contacted", label: "Đã liên hệ" },
  { value: "surveyed", label: "Đã khảo sát" },
  { value: "quoted", label: "Đã báo giá" },
  { value: "negotiating", label: "Thương thảo" },
  { value: "won", label: "Chốt đơn" },
  { value: "lost", label: "Thất bại" },
];

const VALUE_RANGE_OPTIONS = [
  { value: "", label: "Tất cả giá trị" },
  { value: "0-100", label: "Dưới 100 triệu" },
  { value: "100-500", label: "100 – 500 triệu" },
  { value: "500-1000", label: "500 triệu – 1 tỷ" },
  { value: "1000+", label: "Trên 1 tỷ" },
];

function WorkflowModal({ templates, onClose, onCreated, editing }: {
  templates: EmailTemplate[];
  onClose: () => void;
  onCreated: (w: EmailWorkflow) => void;
  editing?: EmailWorkflow | null;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    triggerType: (editing?.triggerType ?? "new_lead") as EmailWorkflow["triggerType"],
    filterStage: "",
    filterValueRange: "",
    filterTag: "",
    noActivityDays: 5,
  });
  const [steps, setSteps] = useState<{ delayDays: number; delayHours: number; templateId: string; subject: string; action: string }[]>(
    editing?.steps?.map(s => ({ delayDays: s.delayDays, delayHours: 0, templateId: s.templateId, subject: s.subject, action: "send_email" })) ??
    [{ delayDays: 0, delayHours: 0, templateId: "", subject: "", action: "send_email" }]
  );
  const [loading, setLoading] = useState(false);

  function addStep() {
    setSteps(prev => [...prev, { delayDays: 1, delayHours: 0, templateId: "", subject: "", action: "send_email" }]);
  }
  function removeStep(i: number) {
    setSteps(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setLoading(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing
        ? { id: editing.id, ...form, steps }
        : { ...form, steps };
      const res = await fetch("/api/crm/email/workflows", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onCreated(await res.json());
    } finally { setLoading(false); }
  }

  const showNoActivityDays = form.triggerType === "no_activity";
  const showStageFilter = ["stage_changed", "new_lead"].includes(form.triggerType);

  return (
    <Modal title={editing ? "Sửa workflow email" : "Tạo workflow email"} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Thông tin cơ bản ── */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Thông tin cơ bản</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tên workflow *">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="VĐ: Chào mừng lead mới"
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }} />
            </Field>
            <Field label="Trigger kích hoạt">
              <select value={form.triggerType} onChange={e => setForm(p => ({ ...p, triggerType: e.target.value as EmailWorkflow["triggerType"] }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
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
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }} />
          </Field>
        </div>

        {/* ── Điều kiện lọc ── */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Target size={11} /> Điều kiện lọc <span className="font-normal normal-case text-gray-400">(tùy chọn)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {showStageFilter && (
              <Field label="Giai đoạn lead">
                <select value={form.filterStage} onChange={e => setForm(p => ({ ...p, filterStage: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
                  {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            )}
            <Field label="Giá trị lead">
              <select value={form.filterValueRange} onChange={e => setForm(p => ({ ...p, filterValueRange: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
                {VALUE_RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Có tag">
              <input value={form.filterTag} onChange={e => setForm(p => ({ ...p, filterTag: e.target.value }))}
                placeholder="VD: B2B, VIP, ..."
                className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }} />
            </Field>
            {showNoActivityDays && (
              <Field label="Không tương tác (ngày)">
                <input type="number" min={1} max={90} value={form.noActivityDays}
                  onChange={e => setForm(p => ({ ...p, noActivityDays: parseInt(e.target.value) || 5 }))}
                  className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }} />
              </Field>
            )}
          </div>
        </div>

        {/* ── Các bước email ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700">Các bước email ({steps.length})</label>
            <button type="button" onClick={addStep}
              className="text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-transparent transition-colors flex items-center gap-1"
              style={{ border: "1px solid rgba(255,255,255,0.10)", color: "#C9A84C" }}>
              <Plus size={11} /> Thêm bước
            </button>
          </div>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="rounded-xl p-3 space-y-2"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "#C9A84C20", color: "#C9A84C" }}>{i + 1}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-gray-500">Sau</span>
                    <input type="number" min={0} value={step.delayDays}
                      onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, delayDays: parseInt(e.target.value) || 0 } : s))}
                      className="w-10 px-1.5 py-1 text-xs rounded-lg text-center focus:outline-none"
                      style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }} />
                    <span className="text-xs text-gray-500">ngày</span>
                    <input type="number" min={0} max={23} value={step.delayHours}
                      onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, delayHours: parseInt(e.target.value) || 0 } : s))}
                      className="w-10 px-1.5 py-1 text-xs rounded-lg text-center focus:outline-none"
                      style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }} />
                    <span className="text-xs text-gray-500">giờ</span>
                  </div>
                  <select value={step.action}
                    onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, action: e.target.value } : s))}
                    className="text-xs px-2 py-1.5 rounded-lg focus:outline-none flex-shrink-0"
                    style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
                    <option value="send_email">✉️ Gửi email</option>
                    <option value="create_task">✅ Tạo task</option>
                    <option value="add_tag">🏷️ Thêm tag</option>
                    <option value="notify_manager">🔔 Thông báo QL</option>
                  </select>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors flex-shrink-0 ml-auto">
                      <X size={12} className="text-[rgba(245,237,214,0.35)]" />
                    </button>
                  )}
                </div>
                {step.action === "send_email" && (
                  <div className="grid grid-cols-2 gap-2 pl-8">
                    <input value={step.subject}
                      onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, subject: e.target.value } : s))}
                      placeholder="Tiêu đề email..."
                      className="px-2.5 py-1.5 text-xs rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }} />
                    <select value={step.templateId}
                      onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, templateId: e.target.value } : s))}
                      className="text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
                      <option value="">Không dùng template</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name.substring(0, 25)}</option>)}
                    </select>
                  </div>
                )}
                {step.action === "create_task" && (
                  <div className="pl-8">
                    <input value={step.subject}
                      onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, subject: e.target.value } : s))}
                      placeholder="Tiêu đề task... (VD: Gọi điện follow-up)"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }} />
                  </div>
                )}
                {step.action === "add_tag" && (
                  <div className="pl-8">
                    <input value={step.subject}
                      onChange={e => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, subject: e.target.value } : s))}
                      placeholder="Tên tag cần thêm... (VD: hot-lead)"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || !form.name}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2"
          style={{ background: loading ? "#e5e7eb" : "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {loading ? "Đang lưu..." : editing ? "Cập nhật workflow" : "Tạo workflow"}
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
      <div className="bg-transparent rounded-2xl overflow-hidden flex flex-col"
        style={{ width: "680px", maxHeight: "85vh", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div className="text-sm font-bold text-gray-900">{template.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tiêu đề: {template.subject}</div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-transparent transition-colors">
            <X size={16} className="text-[rgba(245,237,214,0.45)]" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4" style={{ background: "transparent" }}>
          <iframe
            srcDoc={template.htmlContent}
            className="w-full rounded-xl"
            style={{ minHeight: "500px", border: "none", background: "rgba(255,255,255,0.06)" }}
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
        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
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
      <div className="bg-transparent rounded-2xl overflow-hidden flex flex-col"
        style={{ width: wide ? "680px" : "480px", maxHeight: "85vh", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-sm font-bold text-gray-900">{title}</span>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-transparent transition-colors">
            <X size={16} className="text-[rgba(245,237,214,0.45)]" />
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

// ─── Send Test Email Modal ──────────────────────────────────────────────────────────────────────────────────────────
function SendTestEmailModal({
  sourceType,
  sourceName,
  defaultSubject,
  defaultHtmlContent,
  onClose,
}: {
  sourceType: "campaign" | "template" | "builder" | "workflow";
  sourceName: string;
  defaultSubject: string;
  defaultHtmlContent: string;
  onClose: () => void;
}) {
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [htmlContent, setHtmlContent] = useState(defaultHtmlContent);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; mock?: boolean } | null>(null);

  const SOURCE_LABELS: Record<string, string> = {
    campaign: "Chiến dịch",
    template: "Mẫu email",
    builder: "Email Builder",
    workflow: "Workflow",
  };

  const SOURCE_COLORS: Record<string, string> = {
    campaign: "#C9A84C",
    template: "#60a5fa",
    builder: "#a78bfa",
    workflow: "#22c55e",
  };

  async function handleSend() {
    if (!toEmail) { setResult({ success: false, message: "Vui lòng nhập địa chỉ email" }); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) { setResult({ success: false, message: "Email không hợp lệ" }); return; }
    if (!htmlContent) { setResult({ success: false, message: "Không có nội dung HTML để gửi" }); return; }

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/crm/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toEmail,
          subject: subject || `[TEST] Email từ SmartFurni CRM`,
          htmlContent,
          sourceType,
          sourceName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ success: true, message: data.message, mock: data.mock });
      } else {
        setResult({ success: false, message: data.error || "Gửi thất bại" });
      }
    } catch {
      setResult({ success: false, message: "Lỗi kết nối mạng" });
    } finally {
      setSending(false);
    }
  }

  const srcColor = SOURCE_COLORS[sourceType] || "#C9A84C";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-transparent rounded-2xl overflow-hidden flex flex-col"
        style={{ width: "520px", maxHeight: "85vh", border: "1px solid rgba(255,255,255,0.10)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${srcColor}15` }}>
              <FlaskConical size={15} style={{ color: srcColor }} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Gửi email test</div>
              <div className="text-xs text-gray-500">
                <span className="font-semibold" style={{ color: srcColor }}>{SOURCE_LABELS[sourceType]}</span>
                {sourceName && ` · ${sourceName}`}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-transparent transition-colors">
            <X size={16} className="text-[rgba(245,237,214,0.45)]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Info banner */}
          <div className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: `${srcColor}0d`, border: `1px solid ${srcColor}30` }}>
            <FlaskConical size={14} style={{ color: srcColor, marginTop: 2, flexShrink: 0 }} />
            <p className="text-xs text-gray-600 leading-relaxed">
              Email test sẽ được gửi ngay tới địa chỉ bạn nhập. Các biến động <code className="text-xs px-1 py-0.5 rounded" style={{ background: "transparent" }}>{'{{name}}'}</code>, <code className="text-xs px-1 py-0.5 rounded" style={{ background: "transparent" }}>{'{{company}}'}</code>... sẽ được thay thế bằng dữ liệu mẫu. Email sẽ có banner <strong>[TEST]</strong> ở đầu.
            </p>
          </div>

          {/* Email to */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Gửi tới email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={toEmail}
              onChange={e => { setToEmail(e.target.value); setResult(null); }}
              placeholder="your@email.com"
              className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}
              onKeyDown={e => e.key === "Enter" && handleSend()}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề email</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Tiêu đề email..."
              className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}
            />
            <p className="text-[10px] text-gray-400 mt-1">Email sẽ có tiêu đề <strong>[TEST]</strong> ở đầu</p>
          </div>

          {/* HTML Preview */}
          {htmlContent && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Xem trước nội dung</label>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)", maxHeight: "200px", overflow: "auto" }}>
                <iframe
                  srcDoc={htmlContent}
                  className="w-full"
                  style={{ minHeight: "180px", border: "none", background: "rgba(255,255,255,0.06)" }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-xl px-4 py-3 flex items-start gap-2.5"
              style={{
                background: result.success ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${result.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
              {result.success
                ? <CheckCircle size={14} style={{ color: "#16a34a", marginTop: 1, flexShrink: 0 }} />
                : <AlertCircle size={14} style={{ color: "#dc2626", marginTop: 1, flexShrink: 0 }} />
              }
              <div>
                <p className="text-xs font-semibold" style={{ color: result.success ? "#15803d" : "#dc2626" }}>
                  {result.success ? (result.mock ? "ℹ️ Chế độ xem trước" : "✓ Đã gửi thành công!") : "✗ Gửi thất bại"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: result.success ? "#166534" : "#f87171" }}>
                  {result.message}
                </p>
                {result.mock && (
                  <p className="text-[10px] mt-1 text-gray-500">
                    Để gửi email thật, cấu hình SMTP trong <strong>Cài đặt → Email Settings</strong>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-transparent transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
            Đóng
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !toEmail}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: sending || !toEmail ? "#e5e7eb" : `linear-gradient(135deg, ${srcColor}, ${srcColor}cc)`,
              color: sending || !toEmail ? "#9ca3af" : "#fff",
            }}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? "Đang gửi..." : "Gửi email test"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Launch Campaign Modal ──────────────────────────────────────────────────────
function LaunchCampaignModal({
  campaign,
  onClose,
  onLaunched,
}: {
  campaign: EmailCampaign;
  onClose: () => void;
  onLaunched: (updated: EmailCampaign) => void;
}) {
  const [step, setStep] = useState<"confirm" | "sending" | "done">("confirm");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    totalTargeted: number;
    errors?: string[];
  } | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  useEffect(() => {
    // Lấy số lượng người nhận theo segment
    fetch("/api/crm/email/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "count_recipients", segment: campaign.segment }),
    })
      .then(r => r.json())
      .then(d => { setRecipientCount(d.count ?? 0); setLoadingCount(false); })
      .catch(() => { setRecipientCount(0); setLoadingCount(false); });
  }, [campaign.segment]);

  async function handleLaunch() {
    setStep("sending");
    try {
      const res = await fetch(`/api/crm/email/campaigns/${campaign.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, sentCount: 0, failedCount: 0, totalTargeted: 0, errors: [data.error || "Lỗi không xác định"] });
      } else {
        setResult({
          success: data.success,
          sentCount: data.sentCount,
          failedCount: data.failedCount,
          totalTargeted: data.totalTargeted,
          errors: data.errors,
        });
        // Cập nhật campaign trong danh sách
        onLaunched({
          ...campaign,
          status: data.status,
          sentCount: data.sentCount,
          sentAt: data.sentAt,
        });
      }
    } catch (err) {
      setResult({ success: false, sentCount: 0, failedCount: 0, totalTargeted: 0, errors: [String(err)] });
    }
    setStep("done");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-transparent rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#C9A84C,#E2C97E)" }}>
              <Rocket size={16} style={{ color: "#000" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Phát động chiến dịch</h3>
              <p className="text-[10px] text-gray-500 truncate max-w-[240px]">{campaign.name}</p>
            </div>
          </div>
          {step !== "sending" && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-transparent">
              <X size={14} className="text-[rgba(245,237,214,0.45)]" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {step === "confirm" && (
            <>
              {/* Campaign info */}
              <div className="rounded-xl p-4 space-y-2" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)" }}>
                <div className="flex justify-between text-xs">
                  <span className="text-[rgba(245,237,214,0.45)]">Chiến dịch</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">{campaign.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[rgba(245,237,214,0.45)]">Tiêu đề email</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">{campaign.subject}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[rgba(245,237,214,0.45)]">Phân khúc</span>
                  <span className="font-semibold text-gray-900">{SEGMENT_LABELS[campaign.segment]}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[rgba(245,237,214,0.45)]">Số người nhận</span>
                  <span className="font-bold" style={{ color: "#C9A84C" }}>
                    {loadingCount ? <Loader2 size={12} className="animate-spin inline" /> : `${recipientCount?.toLocaleString("vi-VN") ?? 0} người`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[rgba(245,237,214,0.45)]">Gửi từ</span>
                  <span className="font-semibold text-gray-900">noreply@smartfurni.vn</span>
                </div>
              </div>

              {/* Warning */}
              <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)" }}>
                <AlertCircle size={14} style={{ color: "#C9A84C", marginTop: 1, flexShrink: 0 }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>Lưu ý trước khi phát động</p>
                  <p className="text-xs mt-0.5 text-gray-600 leading-relaxed">
                    Email sẽ được gửi <strong>ngay lập tức</strong> tới toàn bộ khách hàng trong phân khúc có địa chỉ email.
                    Hãy đảm bảo đã gửi email test và kiểm tra nội dung trước khi phát động.
                  </p>
                </div>
              </div>

              {recipientCount === 0 && !loadingCount && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <AlertCircle size={14} style={{ color: "#dc2626", marginTop: 1, flexShrink: 0 }} />
                  <p className="text-xs text-red-700">Không có khách hàng nào trong phân khúc này có địa chỉ email. Vui lòng chọn phân khúc khác hoặc thêm email cho khách hàng.</p>
                </div>
              )}
            </>
          )}

          {step === "sending" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#C9A84C22,#E2C97E22)" }}>
                <Loader2 size={32} className="animate-spin" style={{ color: "#C9A84C" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">Đang gửi email hàng loạt...</p>
                <p className="text-xs text-gray-500 mt-1">Vui lòng không đóng cửa sổ này</p>
                <p className="text-xs text-gray-400 mt-1">Thời gian gửi phụ thuộc vào số lượng người nhận</p>
              </div>
            </div>
          )}

          {step === "done" && result && (
            <div className="space-y-3">
              {/* Result summary */}
              <div className="rounded-xl p-4" style={{
                background: result.success ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                border: `1px solid ${result.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                <div className="flex items-center gap-2 mb-3">
                  {result.success
                    ? <CheckCircle size={18} style={{ color: "#16a34a" }} />
                    : <AlertCircle size={18} style={{ color: "#dc2626" }} />
                  }
                  <p className="text-sm font-bold" style={{ color: result.success ? "#15803d" : "#dc2626" }}>
                    {result.success ? "Chiến dịch đã được phát động!" : "Gửi thất bại"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center rounded-lg p-2" style={{ background: "rgba(34,197,94,0.1)" }}>
                    <div className="text-lg font-bold" style={{ color: "#16a34a" }}>{result.sentCount.toLocaleString("vi-VN")}</div>
                    <div className="text-[10px] text-gray-500">Đã gửi</div>
                  </div>
                  <div className="text-center rounded-lg p-2" style={{ background: "rgba(239,68,68,0.1)" }}>
                    <div className="text-lg font-bold" style={{ color: "#dc2626" }}>{result.failedCount.toLocaleString("vi-VN")}</div>
                    <div className="text-[10px] text-gray-500">Thất bại</div>
                  </div>
                  <div className="text-center rounded-lg p-2" style={{ background: "rgba(96,165,250,0.1)" }}>
                    <div className="text-lg font-bold" style={{ color: "#3b82f6" }}>{result.totalTargeted.toLocaleString("vi-VN")}</div>
                    <div className="text-[10px] text-gray-500">Tổng mục tiêu</div>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <p className="text-xs font-semibold text-red-700 mb-1">Lỗi gửi ({result.errors.length}):</p>
                  <div className="space-y-0.5 max-h-24 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-[10px] text-red-600 font-mono">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {step === "confirm" && (
            <>
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-transparent transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                Hủy
              </button>
              <button
                onClick={handleLaunch}
                disabled={loadingCount || recipientCount === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: (loadingCount || recipientCount === 0) ? "#e5e7eb" : "linear-gradient(135deg,#C9A84C,#E2C97E)",
                  color: (loadingCount || recipientCount === 0) ? "#9ca3af" : "#000",
                }}>
                <Rocket size={14} />
                Phát động ngay ({recipientCount ?? "..."} người)
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: "linear-gradient(135deg,#C9A84C,#E2C97E)", color: "#000" }}>
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Edit Template Modal ────────────────────────────────────────────────────────
function EditTemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: EmailTemplate;
  onClose: () => void;
  onSaved: (updated: EmailTemplate) => void;
}) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [category, setCategory] = useState<EmailTemplateCategory>(template.category as EmailTemplateCategory);
  const [previewText, setPreviewText] = useState(template.previewText || "");
  const [htmlContent, setHtmlContent] = useState(template.htmlContent);
  const [editorMode, setEditorMode] = useState<"html" | "text">("html");
  const [plainText, setPlainText] = useState(() => {
    // Chuyển HTML sang plain text khi mở lần đầu
    const div = typeof document !== "undefined" ? document.createElement("div") : null;
    if (div) { div.innerHTML = template.htmlContent; return div.innerText || div.textContent || ""; }
    return template.htmlContent.replace(/<[^>]+>/g, "");
  });
  const [saving, setSaving] = useState(false);
  const [activePreview, setActivePreview] = useState<"preview" | "html" | "text">("preview");

  const VARIABLES = ["name", "company", "phone", "email", "stage", "assignedTo"];

  function insertVariable(v: string) {
    if (editorMode === "html") {
      const ta = document.getElementById("edit-html-editor") as HTMLTextAreaElement;
      if (!ta) return;
      const s = ta.selectionStart, e = ta.selectionEnd;
      const newVal = htmlContent.substring(0, s) + `{{${v}}}` + htmlContent.substring(e);
      setHtmlContent(newVal);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(s + v.length + 4, s + v.length + 4); }, 0);
    } else {
      const ta = document.getElementById("edit-text-editor") as HTMLTextAreaElement;
      if (!ta) return;
      const s = ta.selectionStart, e = ta.selectionEnd;
      const newVal = plainText.substring(0, s) + `{{${v}}}` + plainText.substring(e);
      setPlainText(newVal);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(s + v.length + 4, s + v.length + 4); }, 0);
    }
  }

  // Chuyển plain text thành HTML đơn giản B2B style
  function plainTextToHtml(text: string): string {
    const lines = text.split("\n");
    const htmlLines = lines.map(line => {
      if (line.trim() === "") return "<br>";
      return `<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 12px">${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    });
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:32px 24px;max-width:600px">
${htmlLines.join("\n")}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px">
<p style="font-size:11px;color:#9ca3af;line-height:1.5;margin:0">
SmartFurni · smartfurni.vn<br>
<a href="{{unsubscribe_url}}" style="color:#9ca3af">Hủy nhận email</a>
</p>
</td></tr>
</table>
</body></html>`;
  }

  // Khi chuyển từ text sang html, cập nhật htmlContent
  function switchToHtml() {
    if (editorMode === "text") {
      setHtmlContent(plainTextToHtml(plainText));
    }
    setEditorMode("html");
  }

  // Khi chuyển từ html sang text, trích xuất plain text
  function switchToText() {
    if (editorMode === "html") {
      const div = typeof document !== "undefined" ? document.createElement("div") : null;
      if (div) {
        div.innerHTML = htmlContent;
        setPlainText(div.innerText || div.textContent || "");
      }
    }
    setEditorMode("text");
  }

  // Nội dung HTML cuối cùng để lưu
  const finalHtml = editorMode === "text" ? plainTextToHtml(plainText) : htmlContent;

  async function handleSave() {
    if (!name || !subject) { alert("Vui lòng nhập tên và tiêu đề email"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/email/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, category, previewText, htmlContent: finalHtml }),
      });
      if (res.ok) {
        const updated = await res.json();
        onSaved(updated);
      } else {
        alert("Lưu thất bại. Vui lòng thử lại.");
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="bg-transparent rounded-2xl flex flex-col overflow-hidden"
        style={{ width: "min(1100px, 96vw)", height: "90vh", border: "1px solid rgba(255,255,255,0.10)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#C9A84C,#E2C97E)" }}>
              <Edit3 size={14} className="text-black" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Chỉnh sửa mẫu email</div>
              <div className="text-xs text-gray-500">{template.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-black transition-all"
              style={{ background: saving ? "#e5e7eb" : "linear-gradient(135deg,#C9A84C,#E2C97E)" }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X size={16} className="text-[rgba(245,237,214,0.45)]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: Form + Editor */}
          <div className="flex flex-col overflow-y-auto" style={{ width: "420px", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.08)" }}>

            {/* Thông tin cơ bản */}
            <div className="p-4 space-y-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Thông tin template</div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên template *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề email *</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Danh mục</label>
                  <select value={category} onChange={e => setCategory(e.target.value as EmailTemplateCategory)}
                    className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                    style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }}>
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
                    style={{ border: "1px solid rgba(255,255,255,0.10)", background: "transparent" }} />
                </div>
              </div>
            </div>

            {/* Biến động */}
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Tag size={11} className="text-[rgba(245,237,214,0.35)]" />
                <span className="text-xs font-semibold text-gray-600">Biến động (click để chèn)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map(v => (
                  <button key={v} onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 rounded-lg text-xs font-mono font-medium hover:bg-yellow-50 transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.10)", color: "#C9A84C" }}>
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor mode toggle */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700">Nội dung email</span>
                <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
                  <button
                    onClick={switchToText}
                    className="px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{
                      background: editorMode === "text" ? "#1e1e1e" : "transparent",
                      color: editorMode === "text" ? "#d4d4d4" : "#6b7280",
                      borderRight: "1px solid rgba(255,255,255,0.08)",
                    }}>
                    ✏️ Văn bản
                  </button>
                  <button
                    onClick={switchToHtml}
                    className="px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{
                      background: editorMode === "html" ? "#1e1e1e" : "transparent",
                      color: editorMode === "html" ? "#d4d4d4" : "#6b7280",
                    }}>
                    {"</>"} HTML
                  </button>
                </div>
              </div>

              {/* Plain text editor */}
              {editorMode === "text" && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5">
                    Soạn thảo như viết email thông thường. Dùng **chữ đậm** để in đậm. Biến động: {"{{name}}"}, {"{{company}}"}...
                  </div>
                  <textarea
                    id="edit-text-editor"
                    value={plainText}
                    onChange={e => setPlainText(e.target.value)}
                    className="w-full p-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none rounded-xl"
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "#fafafa",
                      color: "#1a1a1a",
                      minHeight: "320px",
                      fontFamily: "Arial, sans-serif",
                      lineHeight: "1.7",
                    }}
                    placeholder={"Kính gửi anh/chị {{name}},\n\nNội dung email của bạn...\n\nTrân trọng,\nPhạm Nhất Bá Tuất\nGiám đốc Kinh doanh · SmartFurni\n📞 0820 xxx xxx"}
                  />
                </div>
              )}

              {/* HTML editor */}
              {editorMode === "html" && (
                <textarea
                  id="edit-html-editor"
                  value={htmlContent}
                  onChange={e => setHtmlContent(e.target.value)}
                  className="w-full p-3 text-xs font-mono focus:outline-none resize-none rounded-xl"
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "#1e1e1e",
                    color: "#d4d4d4",
                    minHeight: "320px",
                  }}
                  rows={16}
                />
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview tabs */}
            <div className="flex items-center gap-1 px-4 py-2.5 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "transparent" }}>
              <Eye size={13} className="text-gray-400 mr-1" />
              <span className="text-xs font-semibold text-gray-600 mr-3">Xem trước</span>
              {(["preview", "html", "text"] as const).map(mode => (
                <button key={mode} onClick={() => setActivePreview(mode)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: activePreview === mode ? "#1e1e1e" : "transparent",
                    color: activePreview === mode ? "#d4d4d4" : "#9ca3af",
                  }}>
                  {mode === "preview" ? "📧 Email" : mode === "html" ? "</> HTML" : "📝 Text"}
                </button>
              ))}
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto" style={{ background: "transparent" }}>
              {activePreview === "preview" && (
                <div className="p-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2 px-1">
                    Tiêu đề: <span className="text-[#f5edd6]">{subject}</span>
                  </div>
                  <iframe
                    srcDoc={finalHtml}
                    className="w-full rounded-xl"
                    style={{ minHeight: "500px", border: "none", background: "rgba(255,255,255,0.06)" }}
                    sandbox="allow-same-origin"
                    key={finalHtml.substring(0, 50)}
                  />
                </div>
              )}
              {activePreview === "html" && (
                <div className="p-4">
                  <pre className="text-xs font-mono p-4 rounded-xl overflow-auto"
                    style={{ background: "#1e1e1e", color: "#d4d4d4", minHeight: "500px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {finalHtml}
                  </pre>
                </div>
              )}
              {activePreview === "text" && (
                <div className="p-4">
                  <div className="bg-transparent rounded-xl p-6" style={{ minHeight: "500px", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <div className="text-xs text-gray-400 mb-3 pb-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                      Plain text version (dự phòng khi email client không hiển thị HTML)
                    </div>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap"
                      style={{ fontFamily: "Arial, sans-serif", lineHeight: "1.7" }}>
                      {editorMode === "text" ? plainText : (() => {
                        const div = typeof document !== "undefined" ? document.createElement("div") : null;
                        if (div) { div.innerHTML = htmlContent; return div.innerText || ""; }
                        return htmlContent.replace(/<[^>]+>/g, "");
                      })()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
