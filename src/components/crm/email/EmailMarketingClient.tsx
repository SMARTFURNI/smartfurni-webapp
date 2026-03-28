"use client";

import { useState } from "react";
import {
  Mail, Plus, Send, Eye, Trash2, FileText, Users, BarChart3,
  ChevronRight, Clock, CheckCircle, AlertCircle, Loader2,
  Palette, Copy, Edit3, X, Search, Bot,
} from "lucide-react";
import type { EmailCampaign, EmailTemplate, EmailSegment, EmailTemplateCategory } from "@/lib/crm-email-store";
import { SEGMENT_LABELS, TEMPLATE_CATEGORY_LABELS } from "@/lib/crm-email-store";

interface Props {
  initialCampaigns: EmailCampaign[];
  initialTemplates: EmailTemplate[];
}

type Tab = "campaigns" | "templates" | "builder" | "workflows" | "automation" | "scenarios" | "settings";

const STATUS_CONFIG = {
  draft:     { label: "Bản nháp",    color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  scheduled: { label: "Đã lên lịch", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  sending:   { label: "Đang gửi",    color: "#C9A84C", bg: "rgba(201,168,76,0.12)" },
  sent:      { label: "Đã gửi",      color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  failed:    { label: "Thất bại",    color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const CATEGORY_COLORS: Record<EmailTemplateCategory, string> = {
  intro:    "#60a5fa",
  quote:    "#C9A84C",
  followup: "#a78bfa",
  promo:    "#f87171",
  event:    "#22c55e",
  custom:   "#94a3b8",
};

export default function EmailMarketingClient({ initialCampaigns, initialTemplates }: Props) {
  const [tab, setTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [templates, setTemplates] = useState(initialTemplates);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Stats
  const totalSent = campaigns.filter(c => c.status === "sent").reduce((s, c) => s + c.sentCount, 0);
  const totalOpens = campaigns.filter(c => c.status === "sent").reduce((s, c) => s + c.openCount, 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;

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

  const filteredCampaigns = campaigns.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTemplates = templates.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full" style={{ background: "#ffffff" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Mail size={20} style={{ color: "#C9A84C" }} />
              Email Marketing
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
              Gửi email hàng loạt theo phân khúc khách hàng B2B
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{  }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-8 pr-3 py-2 text-sm rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none w-40"
                style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }}
              />
            </div>
            {tab === "campaigns" ? (
              <button
                onClick={() => setShowNewCampaign(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}
              >
                <Plus size={14} /> Tạo chiến dịch
              </button>
            ) : (
              <button
                onClick={() => setShowNewTemplate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}
              >
                <Plus size={14} /> Tạo template
              </button>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "Chiến dịch", value: campaigns.length, icon: Send, color: "#60a5fa" },
            { label: "Đã gửi", value: campaigns.filter(c => c.status === "sent").length, icon: CheckCircle, color: "#22c55e" },
            { label: "Tổng email gửi", value: totalSent.toLocaleString(), icon: Mail, color: "#C9A84C" },
            { label: "Tỷ lệ mở", value: `${avgOpenRate}%`, icon: BarChart3, color: "#a78bfa" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${kpi.color}15` }}>
                <kpi.icon size={16} style={{ color: kpi.color }} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 leading-tight">{kpi.value}</div>
                <div className="text-[10px]" style={{  }}>{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4 overflow-x-auto" style={{ borderBottom: "1px solid #e5e7eb"          {([\n            ["campaigns", "Chiến dịch"],\n            ["templates", "Mẫu Email"],\n            ["builder", "Email Builder"],\n            ["workflows", "Workflow"],\n            ["automation", "Automation"],\n            ["scenarios", "Scenarios"],\n            ["settings", "Cài Đặt"],\n          ] as const).map(([id, label]) => (\n            <button key={id} onClick={() => setTab(id as Tab)}           className="px-5 py-2 text-sm font-semibold relative transition-colors whitespace-nowrap"
              style={{ color: tab === id ? "#C9A84C" : "#6b7280" }}>
              {label}
              {tab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#C9A84C" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "campaigns" && (
          <div className="space-y-3">
            {filteredCampaigns.length === 0 ? (
              <EmptyState
                icon={<Send size={32} style={{  }} />}
                title="Chưa có chiến dịch nào"
                description="Tạo chiến dịch email đầu tiên để bắt đầu tiếp cận khách hàng B2B"
                action={<button onClick={() => setShowNewCampaign(true)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-black mt-3"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
                  + Tạo chiến dịch đầu tiên
                </button>}
              />
            ) : (
              filteredCampaigns.map(campaign => {
                const sc = STATUS_CONFIG[campaign.status];
                const openRate = campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0;
                return (
                  <div key={campaign.id} className="rounded-2xl p-4 transition-all hover:border-white/10"
                    style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900 truncate">{campaign.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                        </div>
                        <div className="text-xs mb-2 truncate" style={{ color: "#6b7280" }}>
                          {campaign.subject}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-xs" style={{  }}>
                            <Users size={11} />
                            <span>{SEGMENT_LABELS[campaign.segment]}</span>
                          </div>
                          {campaign.status === "sent" && (
                            <>
                              <div className="text-xs" style={{  }}>
                                {campaign.sentCount} đã gửi
                              </div>
                              <div className="text-xs" style={{ color: "#22c55e" }}>
                                {openRate}% mở
                              </div>
                            </>
                          )}
                          {campaign.scheduledAt && campaign.status === "scheduled" && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: "#60a5fa" }}>
                              <Clock size={11} />
                              {new Date(campaign.scheduledAt).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                          style={{ color: "#9ca3af" }}
                          title="Xem trước">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => deleteCampaign(campaign.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10"
                          style={{ color: "#9ca3af" }}
                          title="Xóa">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {/* Progress bar for sent campaigns */}
                    {campaign.status === "sent" && campaign.sentCount > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: "1px solid #e5e7eb" }}>
                        <div className="flex justify-between text-[10px] mb-1" style={{ color: "#9ca3af" }}>
                          <span>Tỷ lệ mở</span>
                          <span>{openRate}%</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${openRate}%`, background: "#22c55e" }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "templates" && (
          <div>
            {templates.length === 0 && (
              <div className="text-center py-8">
                <EmptyState
                  icon={<FileText size={32} style={{  }} />}
                  title="Chưa có template nào"
                  description="Tạo template email hoặc tải template mẫu có sẵn"
                  action={
                    <div className="flex gap-2 justify-center mt-3">
                      <button onClick={seedTemplates} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                        style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }}>
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                        Tải template mẫu
                      </button>
                      <button onClick={() => setShowNewTemplate(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
                        style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
                        <Plus size={14} /> Tạo mới
                      </button>
                    </div>
                  }
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(template => {
                const catColor = CATEGORY_COLORS[template.category];
                return (
                  <div key={template.id} className="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 group"
                    style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    {/* Preview */}
                    <div className="h-32 overflow-hidden relative cursor-pointer" onClick={() => setPreviewTemplate(template)}
                      style={{ background: "#050505" }}>
                      <div className="absolute inset-0 p-3 overflow-hidden" style={{ transform: "scale(0.45)", transformOrigin: "top left", width: "222%", height: "222%" }}>
                        <div dangerouslySetInnerHTML={{ __html: template.htmlContent }} />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.6)" }}>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-900"
                          style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}>
                          <Eye size={12} /> Xem trước
                        </div>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900 truncate">{template.name}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{ background: `${catColor}15`, color: catColor }}>
                          {TEMPLATE_CATEGORY_LABELS[template.category]}
                        </span>
                      </div>
                      <div className="text-xs truncate mb-3" style={{  }}>
                        {template.subject}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setPreviewTemplate(template)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-100"
                          style={{ border: "1px solid #e5e7eb", color: "#6b7280" }}>
                          Xem trước
                        </button>
                        <button onClick={() => deleteTemplate(template.id)}
                          className="w-8 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10"
                          style={{ border: "1px solid #e5e7eb", color: "#9ca3af" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "builder" && (
          <EmptyState
            icon={<Palette size={32} style={{ color: "#C9A84C" }} />}
            title="Email Builder"
            description="Công cụ thiết kế email kéo thả với preview thời gian thực"
            action={<button className="px-4 py-2 rounded-xl text-sm font-bold text-black mt-3" style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>Mở Email Builder</button>}
          />
        )}

        {tab === "workflows" && (
          <EmptyState
            icon={<Send size={32} style={{ color: "#60a5fa" }} />}
            title="Workflow Builder"
            description="Tạo quy trình tự động gửi email theo hành động khách hàng"
            action={<button className="px-4 py-2 rounded-xl text-sm font-bold text-black mt-3" style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>+ Tạo Workflow</button>}
          />
        )}

        {tab === "automation" && (
          <EmptyState
            icon={<Bot size={32} style={{ color: "#a78bfa" }} />}
            title="Email Automation"
            description="Tự động hoá các quy trình gửi email dựa trên điều kiện"
            action={<button className="px-4 py-2 rounded-xl text-sm font-bold text-black mt-3" style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>+ Tạo Automation</button>}
          />
        )}

        {tab === "scenarios" && (
          <EmptyState
            icon={<BarChart3 size={32} style={{ color: "#f87171" }} />}
            title="Email Scenarios"
            description="Quản lý các kịch bản gửi email cho các tình huống khác nhau"
            action={<button className="px-4 py-2 rounded-xl text-sm font-bold text-black mt-3" style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>+ Tạo Scenario</button>}
          />
        )}

        {tab === "settings" && (
          <div className="max-w-2xl">
            <div className="rounded-2xl p-6" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <h2 className="text-lg font-bold text-gray-900 mb-6">Cài Đặt Email Marketing</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Tên người gửi</label>
                  <input type="text" placeholder="SmartFurni" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Email người gửi</label>
                  <input type="email" placeholder="noreply@smartfurni.com" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Chữ ký email</label>
                  <textarea placeholder="Nhập chữ ký email..." className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none" rows={4} />
                </div>
                <button className="px-6 py-2 rounded-xl text-sm font-bold text-black" style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>Lưu Cài Đặt</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewCampaign && (
        <NewCampaignModal
          templates={templates}
          onClose={() => setShowNewCampaign(false)}
          onCreated={c => { setCampaigns(prev => [c, ...prev]); setShowNewCampaign(false); }}
        />
      )}
      {showNewTemplate && (
        <NewTemplateModal
          onClose={() => setShowNewTemplate(false)}
          onCreated={t => { setTemplates(prev => [t, ...prev]); setShowNewTemplate(false); }}
        />
      )}
      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}

// ── New Campaign Modal ─────────────────────────────────────────────────────────
function NewCampaignModal({ templates, onClose, onCreated }: {
  templates: EmailTemplate[];
  onClose: () => void;
  onCreated: (c: EmailCampaign) => void;
}) {
  const [form, setForm] = useState({
    name: "", subject: "", templateId: "", segment: "all" as EmailSegment,
    scheduledAt: "", htmlContent: "",
  });
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function countRecipients(segment: EmailSegment) {
    const res = await fetch("/api/crm/email/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "count_recipients", segment }),
    });
    const data = await res.json();
    setRecipientCount(data.count);
  }

  function handleSegmentChange(segment: EmailSegment) {
    setForm(prev => ({ ...prev, segment }));
    countRecipients(segment);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.subject) return;
    setLoading(true);
    const selectedTemplate = templates.find(t => t.id === form.templateId);
    const res = await fetch("/api/crm/email/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        htmlContent: selectedTemplate?.htmlContent || form.htmlContent,
      }),
    });
    if (res.ok) onCreated(await res.json());
    setLoading(false);
  }

  return (
    <DarkModal title="Tạo chiến dịch mới" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DarkField label="Tên chiến dịch *">
          <DarkInput value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="VD: Giới thiệu sản phẩm Q4/2025" />
        </DarkField>
        <DarkField label="Tiêu đề email *">
          <DarkInput value={form.subject} onChange={v => setForm(p => ({ ...p, subject: v }))} placeholder="VD: SmartFurni — Ưu đãi B2B đặc biệt" />
        </DarkField>
        <DarkField label="Phân khúc nhận email">
          <select value={form.segment} onChange={e => handleSegmentChange(e.target.value as EmailSegment)}
            className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 focus:outline-none"
            style={{ background: "#f3f4f6", border: "1px solid #d1d5db" }}>
            {(Object.entries(SEGMENT_LABELS) as [EmailSegment, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {recipientCount !== null && (
            <div className="mt-1 text-xs" style={{ color: "#22c55e" }}>
              ✓ {recipientCount} khách hàng có email sẽ nhận được
            </div>
          )}
        </DarkField>
        {templates.length > 0 && (
          <DarkField label="Template email">
            <select value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 focus:outline-none"
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db" }}>
              <option value="">Chọn template (tùy chọn)</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </DarkField>
        )}
        <DarkField label="Lên lịch gửi (tùy chọn)">
          <input type="datetime-local" value={form.scheduledAt}
            onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 focus:outline-none"
            style={{ background: "#f3f4f6", border: "1px solid #d1d5db" }} />
        </DarkField>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-white/5"
            style={{ border: "1px solid #d1d5db", color: "#6b7280" }}>Hủy</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-black flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            Tạo chiến dịch
          </button>
        </div>
      </form>
    </DarkModal>
  );
}

// ── New Template Modal ─────────────────────────────────────────────────────────
function NewTemplateModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (t: EmailTemplate) => void;
}) {
  const [form, setForm] = useState({ name: "", subject: "", category: "custom" as EmailTemplateCategory, previewText: "", htmlContent: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.subject) return;
    setLoading(true);
    const res = await fetch("/api/crm/email/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) onCreated(await res.json());
    setLoading(false);
  }

  return (
    <DarkModal title="Tạo template mới" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DarkField label="Tên template *">
          <DarkInput value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="VD: Giới thiệu sản phẩm" />
        </DarkField>
        <DarkField label="Tiêu đề email *">
          <DarkInput value={form.subject} onChange={v => setForm(p => ({ ...p, subject: v }))} placeholder="VD: SmartFurni — Giải pháp nội thất thông minh" />
        </DarkField>
        <DarkField label="Danh mục">
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as EmailTemplateCategory }))}
            className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 focus:outline-none"
            style={{ background: "#f3f4f6", border: "1px solid #d1d5db" }}>
            {(Object.entries(TEMPLATE_CATEGORY_LABELS) as [EmailTemplateCategory, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </DarkField>
        <DarkField label="Nội dung HTML">
          <textarea value={form.htmlContent} onChange={e => setForm(p => ({ ...p, htmlContent: e.target.value }))}
            rows={6} placeholder="<div>Nội dung email HTML...</div>"
            className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none resize-none font-mono"
            style={{ background: "#f3f4f6", border: "1px solid #d1d5db" }} />
        </DarkField>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl hover:bg-white/5"
            style={{ border: "1px solid #d1d5db", color: "#6b7280" }}>Hủy</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-black flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            Tạo template
          </button>
        </div>
      </form>
    </DarkModal>
  );
}

// ── Template Preview Modal ─────────────────────────────────────────────────────
function TemplatePreviewModal({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: "#ffffff", border: "1px solid #d1d5db", maxHeight: "90vh" }}>
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <div className="text-sm font-bold text-gray-900">{template.name}</div>
            <div className="text-xs" style={{  }}>{template.subject}</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100"
            style={{ color: "#6b7280" }}><X size={14} /></button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 60px)" }}>
          <div dangerouslySetInnerHTML={{ __html: template.htmlContent }} />
        </div>
      </div>
    </div>
  );
}

// ── Shared Components ──────────────────────────────────────────────────────────
function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon}</div>
      <div className="text-base font-semibold text-gray-900 mb-1">{title}</div>
      <div className="text-sm max-w-xs" style={{  }}>{description}</div>
      {action}
    </div>
  );
}

function DarkModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#ffffff", border: "1px solid #d1d5db", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #e5e7eb" }}>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100"
            style={{ color: "#6b7280" }}><X size={14} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function DarkField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "#6b7280" }}>{label}</label>
      {children}
    </div>
  );
}

function DarkInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none"
      style={{ background: "#f3f4f6", border: "1px solid #d1d5db" }} />
  );
}
