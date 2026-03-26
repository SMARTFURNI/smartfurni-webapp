"use client";

import { useState, useCallback } from "react";
import {
  Building2, GitBranch, Users, Tag, Percent, Webhook,
  Bell, FileText, Mail, Save, RotateCcw, Plus, Trash2,
  GripVertical, Eye, EyeOff, ChevronRight, CheckCircle2,
  AlertCircle, Settings, Copy, RefreshCw, Palette,
} from "lucide-react";
import type { CrmSettings, PipelineStage, LeadSource, LeadTypeConfig, DiscountTierConfig, DashboardTheme, DashboardSectionId, KpiCardId, ChartType, FunnelStyle, ChartPalette, DensityMode, FontFamily, KpiSize, KpiColumns, RefreshInterval } from "@/lib/crm-settings-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialSettings: CrmSettings;
}

type TabId = "company" | "pipeline" | "sources" | "leadtypes" | "discount" | "webhook" | "notifications" | "quote" | "email" | "dashboardtheme";

const TABS: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "company",       label: "Thông tin công ty",   icon: Building2,  desc: "Tên, địa chỉ, liên hệ, ngân hàng" },
  { id: "pipeline",      label: "Giai đoạn Pipeline",  icon: GitBranch,  desc: "Tùy chỉnh các cột Kanban" },
  { id: "sources",       label: "Nguồn khách hàng",    icon: Tag,        desc: "Kênh tiếp thị và màu sắc" },
  { id: "leadtypes",     label: "Phân loại KH",        icon: Users,      desc: "Kiến trúc sư, Chủ đầu tư, Đại lý" },
  { id: "discount",      label: "Bậc chiết khấu",      icon: Percent,    desc: "Chiết khấu theo số lượng" },
  { id: "webhook",       label: "Webhook & API",       icon: Webhook,    desc: "Make.com, n8n, tích hợp tự động" },
  { id: "notifications", label: "Thông báo",           icon: Bell,       desc: "Nhắc nhở quá hạn, lịch hẹn" },
  { id: "quote",         label: "Cấu hình Báo giá",   icon: FileText,   desc: "Hiệu lực, điều khoản, ghi chú" },
  { id: "email",         label: "Email & SMTP",        icon: Mail,       desc: "Cấu hình gửi email marketing" },
  { id: "dashboardtheme", label: "Giao diện Dashboard",  icon: Palette,    desc: "Màu sắc các khối trên dashboard" },
];

const PRESET_COLORS = [
  "#60a5fa","#a78bfa","#f97316","#22c55e","#f87171","#C9A84C",
  "#06b6d4","#ec4899","#84cc16","#94a3b8","#e2e8f0","#1e293b",
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            background: c,
            borderColor: value === c ? "#fff" : "transparent",
            boxShadow: value === c ? `0 0 0 2px ${c}` : "none",
          }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
        title="Chọn màu tùy chỉnh"
      />
    </div>
  );
}

function InputField({
  label, value, onChange, type = "text", placeholder, hint,
}: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          color: "#111827",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "#C9A84C"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(201,168,76,0.15)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
      />
      {hint && <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>{hint}</p>}
    </div>
  );
}

function TextareaField({
  label, value, onChange, rows = 3, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>
        {label}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all resize-none"
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          color: "#111827",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "#C9A84C"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#d1d5db"; }}
      />
    </div>
  );
}

function ToggleField({
  label, value, onChange, hint,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium" style={{ color: "#1f2937" }}>{label}</div>
        {hint && <div className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
        style={{ background: value ? "#C9A84C" : "#e5e7eb" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
          style={{ left: value ? "calc(100% - 22px)" : "2px" }}
        />
      </button>
    </div>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function CompanyTab({ data, onChange }: { data: CrmSettings["company"]; onChange: (d: CrmSettings["company"]) => void }) {
  const set = (k: keyof CrmSettings["company"]) => (v: string) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-6">
      <SectionCard title="Thông tin doanh nghiệp" icon={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Tên công ty *" value={data.name} onChange={set("name")} placeholder="SmartFurni" />
          <InputField label="Mã số thuế" value={data.taxCode} onChange={set("taxCode")} placeholder="0123456789" />
          <InputField label="Số điện thoại" value={data.phone} onChange={set("phone")} placeholder="0901 234 567" />
          <InputField label="Email công ty" value={data.email} onChange={set("email")} type="email" placeholder="b2b@smartfurni.vn" />
          <InputField label="Website" value={data.website} onChange={set("website")} placeholder="https://smartfurni.vn" />
          <InputField label="Logo URL" value={data.logoUrl} onChange={set("logoUrl")} placeholder="https://..." />
        </div>
        <InputField label="Địa chỉ" value={data.address} onChange={set("address")} placeholder="123 Nguyễn Văn Linh, Q7, TP.HCM" />
      </SectionCard>

      <SectionCard title="Người đại diện" icon={Users}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Họ tên đại diện" value={data.representativeName} onChange={set("representativeName")} placeholder="Nguyễn Văn A" />
          <InputField label="Chức danh" value={data.representativeTitle} onChange={set("representativeTitle")} placeholder="Giám đốc Kinh doanh" />
        </div>
      </SectionCard>

      <SectionCard title="Thông tin ngân hàng" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Tên ngân hàng" value={data.bankName} onChange={set("bankName")} placeholder="Vietcombank" />
          <InputField label="Số tài khoản" value={data.bankAccount} onChange={set("bankAccount")} placeholder="1234567890" />
          <InputField label="Chi nhánh" value={data.bankBranch} onChange={set("bankBranch")} placeholder="Chi nhánh TP.HCM" />
        </div>
      </SectionCard>
    </div>
  );
}

function PipelineTab({ data, onChange }: { data: PipelineStage[]; onChange: (d: PipelineStage[]) => void }) {
  const addStage = () => {
    const newStage: PipelineStage = {
      id: `stage_${Date.now()}`,
      label: "Giai đoạn mới",
      color: "#60a5fa",
      order: data.length,
      isWon: false,
      isLost: false,
    };
    onChange([...data, newStage]);
  };
  const update = (idx: number, field: keyof PipelineStage, value: string | number | boolean) => {
    const updated = [...data];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Các giai đoạn hiển thị trên Kanban Board. Thứ tự từ trái sang phải.
        </p>
        <button
          onClick={addStage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}
        >
          <Plus size={14} /> Thêm giai đoạn
        </button>
      </div>

      <div className="space-y-2">
        {data.map((stage, idx) => (
          <div
            key={stage.id}
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}
          >
            <div className="flex items-center gap-2 mt-1">
              <GripVertical size={16} style={{ color: "#9ca3af" }} />
              <span className="text-xs font-bold w-5 text-center" style={{ color: "#9ca3af" }}>{idx + 1}</span>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "#6b7280" }}>Tên giai đoạn</label>
                <input
                  value={stage.label}
                  onChange={e => update(idx, "label", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "#6b7280" }}>Màu sắc</label>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: stage.color }} />
                  <ColorPicker value={stage.color} onChange={v => update(idx, "color", v)} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="block text-xs" style={{ color: "#6b7280" }}>Trạng thái đặc biệt</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={stage.isWon} onChange={e => update(idx, "isWon", e.target.checked)}
                      className="w-3.5 h-3.5 accent-green-500" />
                    <span className="text-xs" style={{ color: "#22c55e" }}>Won</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={stage.isLost} onChange={e => update(idx, "isLost", e.target.checked)}
                      className="w-3.5 h-3.5 accent-red-400" />
                    <span className="text-xs" style={{ color: "#f87171" }}>Lost</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={() => remove(idx)}
              className="mt-1 p-1.5 rounded-lg transition-all hover:bg-red-500/20"
              style={{ color: "#9ca3af" }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourcesTab({ data, onChange }: { data: LeadSource[]; onChange: (d: LeadSource[]) => void }) {
  const add = () => onChange([...data, { id: `src_${Date.now()}`, label: "Nguồn mới", color: "#94a3b8", order: data.length }]);
  const update = (idx: number, field: keyof LeadSource, value: string | number) => {
    const updated = [...data];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Kênh tiếp thị để phân loại nguồn khách hàng trong CRM và báo cáo.
        </p>
        <button onClick={add} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
          <Plus size={14} /> Thêm nguồn
        </button>
      </div>
      <div className="space-y-2">
        {data.map((src, idx) => (
          <div key={src.id} className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: src.color }} />
            <input
              value={src.label}
              onChange={e => update(idx, "label", e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }}
            />
            <ColorPicker value={src.color} onChange={v => update(idx, "color", v)} />
            <button onClick={() => remove(idx)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
              style={{ color: "#9ca3af" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadTypesTab({ data, onChange }: { data: LeadTypeConfig[]; onChange: (d: LeadTypeConfig[]) => void }) {
  const add = () => onChange([...data, { id: `type_${Date.now()}`, label: "Loại mới", color: "#94a3b8", order: data.length }]);
  const update = (idx: number, field: keyof LeadTypeConfig, value: string | number) => {
    const updated = [...data];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Phân loại khách hàng B2B để lọc và báo cáo theo nhóm.
        </p>
        <button onClick={add} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
          <Plus size={14} /> Thêm loại
        </button>
      </div>
      <div className="space-y-2">
        {data.map((type, idx) => (
          <div key={type.id} className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
              style={{ background: `${type.color}20`, color: type.color, border: `1px solid ${type.color}40` }}>
              {type.label}
            </div>
            <input
              value={type.label}
              onChange={e => update(idx, "label", e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }}
            />
            <ColorPicker value={type.color} onChange={v => update(idx, "color", v)} />
            <button onClick={() => remove(idx)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
              style={{ color: "#9ca3af" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscountTab({ data, onChange }: { data: DiscountTierConfig[]; onChange: (d: DiscountTierConfig[]) => void }) {
  const add = () => onChange([...data, { minQty: 100, discountPct: 30, label: "Từ 100 bộ" }]);
  const update = (idx: number, field: keyof DiscountTierConfig, value: string | number) => {
    const updated = [...data];
    updated[idx] = { ...updated[idx], [field]: field === "label" ? value : Number(value) };
    onChange(updated);
  };
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Chiết khấu tự động áp dụng khi tạo báo giá dựa trên số lượng sản phẩm.
        </p>
        <button onClick={add} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
          <Plus size={14} /> Thêm bậc
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>Nhãn</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>Số lượng tối thiểu</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>Chiết khấu (%)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((tier, idx) => (
              <tr key={idx} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td className="px-4 py-3">
                  <input value={tier.label} onChange={e => update(idx, "label", e.target.value)}
                    className="w-full px-2 py-1 rounded text-sm outline-none"
                    style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }} />
                </td>
                <td className="px-4 py-3">
                  <input type="number" value={tier.minQty} onChange={e => update(idx, "minQty", e.target.value)}
                    className="w-24 px-2 py-1 rounded text-sm outline-none"
                    style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input type="number" value={tier.discountPct} onChange={e => update(idx, "discountPct", e.target.value)}
                      className="w-20 px-2 py-1 rounded text-sm outline-none"
                      style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#C9A84C" }} />
                    <span className="text-xs font-bold" style={{ color: "#C9A84C" }}>%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(idx)} className="p-1.5 rounded hover:bg-red-500/20 transition-all"
                    style={{ color: "#9ca3af" }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
        <p className="text-xs font-semibold mb-2" style={{ color: "#C9A84C" }}>Xem trước áp dụng:</p>
        <div className="flex flex-wrap gap-2">
          {data.sort((a, b) => a.minQty - b.minQty).map((tier, idx) => (
            <div key={idx} className="px-3 py-1 rounded-full text-xs"
              style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.2)" }}>
              ≥{tier.minQty} bộ → -{tier.discountPct}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WebhookTab({ data, onChange }: { data: CrmSettings["webhook"]; onChange: (d: CrmSettings["webhook"]) => void }) {
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/crm/webhook`
    : "https://yourdomain.com/api/crm/webhook";

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const regenerateSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const secret = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    onChange({ ...data, secret });
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Endpoint & Xác thực" icon={Webhook}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>
              Webhook URL (chỉ nhận POST)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#C9A84C" }}>
                {webhookUrl}
              </div>
              <button onClick={copyUrl} className="px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-all hover:opacity-80"
                style={{ background: copied ? "rgba(34,197,94,0.15)" : "#f3f4f6", color: copied ? "#22c55e" : "#6b7280", border: "1px solid #e5e7eb" }}>
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? "Đã sao chép" : "Sao chép"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>
              Webhook Secret (Header: x-webhook-secret)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151" }}>
                {showSecret ? data.secret : "•".repeat(Math.min(data.secret.length, 32))}
              </div>
              <button onClick={() => setShowSecret(v => !v)} className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{ color: "#6b7280" }}>
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button onClick={regenerateSecret} className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{ color: "#6b7280" }} title="Tạo secret mới">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Cấu hình tự động" icon={Settings}>
        <div className="space-y-4">
          <InputField
            label="Giao cho nhân viên mặc định"
            value={data.defaultAssignedTo}
            onChange={v => onChange({ ...data, defaultAssignedTo: v })}
            placeholder="Để trống = chưa phân công"
          />
          <ToggleField
            label="Thông báo khi có lead mới"
            value={data.notifyOnNewLead}
            onChange={v => onChange({ ...data, notifyOnNewLead: v })}
            hint="Gửi email thông báo khi webhook tạo lead mới"
          />
          {data.notifyOnNewLead && (
            <InputField
              label="Email nhận thông báo"
              value={data.notifyEmail}
              onChange={v => onChange({ ...data, notifyEmail: v })}
              type="email"
              placeholder="manager@smartfurni.vn"
            />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Hướng dẫn tích hợp Make.com / n8n" icon={FileText}>
        <div className="space-y-3 text-sm" style={{ color: "#6b7280" }}>
          <p>Gửi <strong className="text-gray-900">POST</strong> request đến webhook URL với header:</p>
          <pre className="p-3 rounded-lg text-xs overflow-x-auto"
            style={{ background: "rgba(0,0,0,0.3)", color: "#C9A84C", border: "1px solid #e5e7eb" }}>
{`x-webhook-secret: ${data.secret}
Content-Type: application/json

{
  "name": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "a@example.com",
  "source": "Facebook Ads",
  "type": "investor",
  "district": "Q7",
  "notes": "Quan tâm 20 căn",
  "unitCount": 20
}`}
          </pre>
        </div>
      </SectionCard>
    </div>
  );
}

function NotificationsTab({ data, onChange }: { data: CrmSettings["notifications"]; onChange: (d: CrmSettings["notifications"]) => void }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Cảnh báo quá hạn" icon={AlertCircle}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>
              Ngưỡng quá hạn (ngày không tương tác)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={14} value={data.overdueThresholdDays}
                onChange={e => onChange({ ...data, overdueThresholdDays: Number(e.target.value) })}
                className="flex-1 accent-yellow-500"
              />
              <div className="w-16 text-center px-3 py-1.5 rounded-lg font-bold"
                style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
                {data.overdueThresholdDays} ngày
              </div>
            </div>
            <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
              Thẻ KH sẽ hiện viền đỏ nếu không tương tác quá {data.overdueThresholdDays} ngày
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Nhắc nhở lịch hẹn" icon={Bell}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>
              Nhắc trước lịch hẹn (phút)
            </label>
            <div className="flex gap-2">
              {[15, 30, 60, 120].map(min => (
                <button
                  key={min}
                  onClick={() => onChange({ ...data, reminderBeforeMeetingMinutes: min })}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: data.reminderBeforeMeetingMinutes === min ? "rgba(201,168,76,0.2)" : "#f3f4f6",
                    color: data.reminderBeforeMeetingMinutes === min ? "#C9A84C" : "#6b7280",
                    border: `1px solid ${data.reminderBeforeMeetingMinutes === min ? "rgba(201,168,76,0.4)" : "#e5e7eb"}`,
                  }}
                >
                  {min < 60 ? `${min} phút` : `${min / 60} giờ`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Báo cáo hàng ngày" icon={FileText}>
        <div className="space-y-3">
          <ToggleField
            label="Bật báo cáo tóm tắt hàng ngày"
            value={data.dailyDigestEnabled}
            onChange={v => onChange({ ...data, dailyDigestEnabled: v })}
            hint="Gửi email tóm tắt hoạt động CRM mỗi ngày"
          />
          {data.dailyDigestEnabled && (
            <InputField
              label="Giờ gửi báo cáo"
              value={data.dailyDigestTime}
              onChange={v => onChange({ ...data, dailyDigestTime: v })}
              type="time"
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function QuoteTab({ data, onChange }: { data: CrmSettings["quote"]; onChange: (d: CrmSettings["quote"]) => void }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Cài đặt mặc định" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField
            label="Hiệu lực báo giá (ngày)"
            value={data.validityDays}
            onChange={v => onChange({ ...data, validityDays: Number(v) })}
            type="number"
            hint="Số ngày báo giá còn hiệu lực"
          />
          <InputField
            label="Thời gian giao hàng (ngày)"
            value={data.defaultDeliveryDays}
            onChange={v => onChange({ ...data, defaultDeliveryDays: Number(v) })}
            type="number"
          />
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>Đơn vị tiền tệ</label>
            <select
              value={data.currency}
              onChange={e => onChange({ ...data, currency: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }}
            >
              <option value="VND">VND — Việt Nam Đồng</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
        </div>
        <TextareaField
          label="Điều khoản thanh toán mặc định"
          value={data.defaultPaymentTerms}
          onChange={v => onChange({ ...data, defaultPaymentTerms: v })}
          placeholder="Thanh toán 50% khi đặt hàng..."
        />
        <TextareaField
          label="Ghi chú cuối báo giá"
          value={data.footerNote}
          onChange={v => onChange({ ...data, footerNote: v })}
          placeholder="Báo giá có hiệu lực trong 30 ngày..."
        />
        <ToggleField
          label="Hiển thị ảnh sản phẩm trong báo giá"
          value={data.showProductImages}
          onChange={v => onChange({ ...data, showProductImages: v })}
        />
      </SectionCard>
    </div>
  );
}

function EmailTab({ data, onChange }: { data: CrmSettings["email"]; onChange: (d: CrmSettings["email"]) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="space-y-6">
      <SectionCard title="Thông tin người gửi" icon={Mail}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Tên người gửi" value={data.senderName} onChange={v => onChange({ ...data, senderName: v })} placeholder="SmartFurni B2B" />
          <InputField label="Email gửi" value={data.senderEmail} onChange={v => onChange({ ...data, senderEmail: v })} type="email" placeholder="b2b@smartfurni.vn" />
          <InputField label="Email trả lời (Reply-To)" value={data.replyToEmail} onChange={v => onChange({ ...data, replyToEmail: v })} type="email" />
        </div>
        <TextareaField
          label="Chữ ký email"
          value={data.emailSignature}
          onChange={v => onChange({ ...data, emailSignature: v })}
          rows={4}
          placeholder="Trân trọng,&#10;Đội ngũ SmartFurni B2B"
        />
      </SectionCard>

      <SectionCard title="Cấu hình SMTP" icon={Settings}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="SMTP Host" value={data.smtpHost} onChange={v => onChange({ ...data, smtpHost: v })} placeholder="smtp.gmail.com" />
          <InputField label="SMTP Port" value={data.smtpPort} onChange={v => onChange({ ...data, smtpPort: Number(v) })} type="number" placeholder="587" />
          <InputField label="SMTP Username" value={data.smtpUser} onChange={v => onChange({ ...data, smtpUser: v })} placeholder="user@gmail.com" />
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>SMTP Password</label>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={data.smtpPassword}
                onChange={e => onChange({ ...data, smtpPassword: e.target.value })}
                placeholder="••••••••"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }}
              />
              <button onClick={() => setShowPassword(v => !v)} className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{ color: "#6b7280" }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <ToggleField
          label="Sử dụng SSL/TLS"
          value={data.useSsl}
          onChange={v => onChange({ ...data, useSsl: v })}
          hint="Bật SSL/TLS cho kết nối SMTP bảo mật"
        />
      </SectionCard>
    </div>
  );
}

// \u2500\u2500\u2500 DashboardThemeTab \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500


const SECTION_LABELS: Record<DashboardSectionId, string> = {
  kpiCards: "4 KPI Cards",
  dataPool: "Banner Data Pool",
  monthSummary: "3 Card th\u00e1ng n\u00e0y",
  revenueChart: "Bi\u1ec3u \u0111\u1ed3 doanh thu",
  pipeline: "Pipeline Funnel",
  funnel: "Conversion Funnel",
  staleDeals: "Deal s\u1eafp m\u1ea5t",
  heatmap: "Heatmap ho\u1ea1t \u0111\u1ed9ng",
  staffPerformance: "Hi\u1ec7u su\u1ea5t nh\u00e2n vi\u00ean",
  tasks: "Nhi\u1ec7m v\u1ee5 h\u00f4m nay",
  quickStats: "Th\u1ed1ng k\u00ea nhanh",
  quickLinks: "Truy c\u1eadp nhanh",
  overdue: "Qu\u00e1 h\u1ea1n li\u00ean h\u1ec7",
  leaderboard: "X\u1ebfp h\u1ea1ng nh\u00e2n vi\u00ean",
  teamOnline: "Team Online",
};

const KPI_CARD_LABELS: Record<KpiCardId, string> = {
  totalLeads: "T\u1ed5ng kh\u00e1ch h\u00e0ng",
  pipelineValue: "Pipeline gi\u00e1 tr\u1ecb",
  wonRate: "T\u1ef7 l\u1ec7 ch\u1ed1t \u0111\u01a1n",
  overdue: "C\u1ea7n li\u00ean h\u1ec7 ngay",
  revenueMonth: "Doanh thu th\u00e1ng",
  newLeadsMonth: "KH m\u1edbi th\u00e1ng",
  wonLeadsMonth: "\u0110\u01a1n ch\u1ed1t th\u00e1ng",
  totalQuotes: "T\u1ed5ng b\u00e1o gi\u00e1",
};

const ALL_SECTIONS: DashboardSectionId[] = [
  "kpiCards", "dataPool", "monthSummary", "revenueChart",
  "pipeline", "funnel", "staleDeals", "staffPerformance",
  "tasks", "quickStats", "quickLinks", "overdue",
  "leaderboard", "teamOnline", "heatmap",
];

const ALL_KPI_CARDS: KpiCardId[] = [
  "totalLeads", "pipelineValue", "wonRate", "overdue",
  "revenueMonth", "newLeadsMonth", "wonLeadsMonth", "totalQuotes",
];

const THEME_PRESETS: { name: string; theme: Partial<DashboardTheme> }[] = [
  {
    name: "M\u1eb7c \u0111\u1ecbnh (Gold & Navy)",
    theme: {
      pageBg: "#F0F2F5", kpiCardBg: "#FFFFFF", kpiCardBorder: "#E4E7EC",
      kpiCustomerColor: "#4F46E5", kpiPipelineColor: "#C9A84C",
      kpiWonColor: "#059669", kpiOverdueColor: "#DC2626",
      dataPoolBannerBg: "#0F172A", dataPoolBtnBg: "#C9A84C",
      accentColor: "#C9A84C", accentTextColor: "#FFFFFF",
    },
  },
  {
    name: "Xanh d\u01b0\u01a1ng hi\u1ec7n \u0111\u1ea1i",
    theme: {
      pageBg: "#EFF6FF", kpiCardBg: "#FFFFFF", kpiCardBorder: "#BFDBFE",
      kpiCustomerColor: "#2563EB", kpiPipelineColor: "#0EA5E9",
      kpiWonColor: "#059669", kpiOverdueColor: "#DC2626",
      dataPoolBannerBg: "#1E3A5F", dataPoolBtnBg: "#2563EB",
      accentColor: "#2563EB", accentTextColor: "#FFFFFF",
    },
  },
  {
    name: "T\u1ed1i sang tr\u1ecdng",
    theme: {
      pageBg: "#0F172A", kpiCardBg: "#1E293B", kpiCardBorder: "#334155",
      kpiCardTitleColor: "#F1F5F9", kpiCardValueColor: "#F8FAFC", kpiCardMutedColor: "#94A3B8",
      kpiCustomerColor: "#818CF8", kpiPipelineColor: "#FBBF24",
      kpiWonColor: "#34D399", kpiOverdueColor: "#F87171",
      dataPoolBannerBg: "#1E293B", dataPoolBannerText: "#F1F5F9", dataPoolBtnBg: "#FBBF24",
      sectionCardBg: "#1E293B", sectionCardBorder: "#334155",
      sectionHeaderColor: "#F1F5F9", sectionBodyColor: "#94A3B8",
      taskCardBg: "#1E293B", quickLinkBg: "#0F172A",
      accentColor: "#FBBF24", accentTextColor: "#0F172A",
    },
  },
  {
    name: "Xanh l\u00e1 t\u01b0\u01a1i m\u00e1t",
    theme: {
      pageBg: "#F0FDF4", kpiCardBg: "#FFFFFF", kpiCardBorder: "#BBF7D0",
      kpiCustomerColor: "#16A34A", kpiPipelineColor: "#CA8A04",
      kpiWonColor: "#059669", kpiOverdueColor: "#DC2626",
      dataPoolBannerBg: "#14532D", dataPoolBtnBg: "#16A34A",
      accentColor: "#16A34A", accentTextColor: "#FFFFFF",
    },
  },
];

const COLOR_GROUPS: { title: string; fields: { key: keyof DashboardTheme; label: string }[] }[] = [
  {
    title: "N\u1ec1n trang",
    fields: [{ key: "pageBg", label: "M\u00e0u n\u1ec1n trang" }],
  },
  {
    title: "KPI Cards (4 \u00f4 \u0111\u1ea7u trang)",
    fields: [
      { key: "kpiCardBg",         label: "N\u1ec1n card" },
      { key: "kpiCardBorder",     label: "Vi\u1ec1n card" },
      { key: "kpiCardTitleColor", label: "Ch\u1eef ti\u00eau \u0111\u1ec1" },
      { key: "kpiCardValueColor", label: "Ch\u1eef s\u1ed1 li\u1ec7u" },
      { key: "kpiCardMutedColor", label: "Ch\u1eef ph\u1ee5" },
      { key: "kpiCustomerColor",  label: "Icon T\u1ed5ng KH" },
      { key: "kpiPipelineColor",  label: "Icon Pipeline" },
      { key: "kpiWonColor",       label: "Icon Ch\u1ed1t \u0111\u01a1n" },
      { key: "kpiOverdueColor",   label: "Icon C\u1ea7n li\u00ean h\u1ec7" },
    ],
  },
  {
    title: "Banner Data Pool",
    fields: [
      { key: "dataPoolBannerBg",   label: "N\u1ec1n banner" },
      { key: "dataPoolBannerText", label: "Ch\u1eef banner" },
      { key: "dataPoolBtnBg",      label: "N\u1ec1n n\u00fat" },
      { key: "dataPoolBtnText",    label: "Ch\u1eef n\u00fat" },
    ],
  },
  {
    title: "3 Card th\u1ed1ng k\u00ea th\u00e1ng",
    fields: [
      { key: "summaryCardBg",       label: "N\u1ec1n card" },
      { key: "summaryCardBorder",   label: "Vi\u1ec1n card" },
      { key: "summaryRevenueColor", label: "Doanh thu" },
      { key: "summaryNewLeadColor", label: "KH m\u1edbi" },
      { key: "summaryWonColor",     label: "Ch\u1ed1t \u0111\u01a1n" },
    ],
  },
  {
    title: "Section Cards (bi\u1ec3u \u0111\u1ed3, pipeline, ngu\u1ed3n KH)",
    fields: [
      { key: "sectionCardBg",      label: "N\u1ec1n card" },
      { key: "sectionCardBorder",  label: "Vi\u1ec1n card" },
      { key: "sectionHeaderColor", label: "Ti\u00eau \u0111\u1ec1" },
      { key: "sectionBodyColor",   label: "N\u1ed9i dung" },
    ],
  },
  {
    title: "C\u1ed9t ph\u1ea3i (Task, Quick Links)",
    fields: [
      { key: "taskCardBg",        label: "N\u1ec1n card" },
      { key: "taskUrgentColor",   label: "Task kh\u1ea9n c\u1ea5p" },
      { key: "quickLinkBg",       label: "N\u1ec1n quick link" },
      { key: "quickLinkIconColor", label: "Icon quick link" },
    ],
  },
  {
    title: "Accent / Th\u01b0\u01a1ng hi\u1ec7u",
    fields: [
      { key: "accentColor",     label: "M\u00e0u accent ch\u00ednh" },
      { key: "accentTextColor", label: "Ch\u1eef tr\u00ean accent" },
    ],
  },
  {
    title: "Ticker th\u00f4ng b\u00e1o",
    fields: [
      { key: "tickerBg",        label: "N\u1ec1n ticker" },
      { key: "tickerTextColor", label: "Ch\u1eef ticker" },
    ],
  },
];

function ThemeColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: "1px solid #f3f4f6" }}>
      <span className="text-sm" style={{ color: "#374151" }}>{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg border flex-shrink-0 shadow-sm" style={{ background: value, borderColor: "#d1d5db" }} />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-24 text-xs px-2 py-1.5 rounded-lg border font-mono"
          style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
          placeholder="#RRGGBB"
        />
        <input
          type="color"
          value={value.startsWith("#") && value.length === 7 ? value : "#000000"}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0.5"
          style={{ background: "transparent" }}
          title="Ch\u1ecdn m\u00e0u"
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: "1px solid #f3f4f6" }}>
      <div>
        <div className="text-sm font-medium" style={{ color: "#374151" }}>{label}</div>
        {desc && <div className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
        style={{ background: value ? "#C9A84C" : "#d1d5db" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: "1px solid #f3f4f6" }}>
      <span className="text-sm" style={{ color: "#374151" }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border"
        style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function DashboardThemeTab({ data, onChange }: { data: DashboardTheme; onChange: (d: DashboardTheme) => void }) {
  const [activeGroup, setActiveGroup] = useState<"colors" | "layout" | "typography" | "charts" | "widgets" | "behavior">("colors");

  const set = <K extends keyof DashboardTheme>(key: K, value: DashboardTheme[K]) => {
    onChange({ ...data, [key]: value });
  };

  const applyPreset = (preset: Partial<DashboardTheme>) => {
    onChange({ ...data, ...preset });
  };

  const toggleSection = (id: DashboardSectionId) => {
    const hidden = data.hiddenSections ?? [];
    if (hidden.includes(id)) {
      set("hiddenSections", hidden.filter(s => s !== id));
    } else {
      set("hiddenSections", [...hidden, id]);
    }
  };

  const toggleKpiCard = (id: KpiCardId) => {
    const visible = data.visibleKpiCards ?? ALL_KPI_CARDS.slice(0, 4);
    if (visible.includes(id)) {
      if (visible.length <= 1) return;
      set("visibleKpiCards", visible.filter(k => k !== id));
    } else {
      if (visible.length >= 6) return;
      set("visibleKpiCards", [...visible, id]);
    }
  };

  const moveSectionUp = (idx: number) => {
    if (idx === 0) return;
    const order = [...(data.sectionOrder ?? ALL_SECTIONS)];
    [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
    set("sectionOrder", order);
  };

  const moveSectionDown = (idx: number) => {
    const order = [...(data.sectionOrder ?? ALL_SECTIONS)];
    if (idx >= order.length - 1) return;
    [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
    set("sectionOrder", order);
  };

  const GROUP_TABS = [
    { id: "colors" as const,     label: "M\u00e0u s\u1eafc" },
    { id: "layout" as const,     label: "B\u1ed1 c\u1ee5c" },
    { id: "typography" as const, label: "Ch\u1eef & M\u1eadt \u0111\u1ed9" },
    { id: "charts" as const,     label: "Bi\u1ec3u \u0111\u1ed3" },
    { id: "widgets" as const,    label: "Widget" },
    { id: "behavior" as const,   label: "H\u00e0nh vi" },
  ];

  return (
    <div className="space-y-5">
      {/* Live preview */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
        <div className="px-4 py-3 text-xs font-semibold" style={{ background: "#f9fafb", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
          XEM TR\u01af\u1edaC \u2014 M\u00e0u hi\u1ec7n t\u1ea1i
        </div>
        <div className="p-4 flex gap-3 flex-wrap" style={{ background: data.pageBg }}>
          <div className="rounded-xl p-3 flex-1 min-w-[100px]" style={{ background: data.kpiCardBg, border: `1px solid ${data.kpiCardBorder}` }}>
            <div className="text-[10px] mb-1" style={{ color: data.kpiCardMutedColor }}>T\u1ed5ng KH</div>
            <div className="text-lg font-bold" style={{ color: data.kpiCardValueColor }}>42</div>
            <div className="w-5 h-5 rounded mt-1" style={{ background: data.kpiCustomerColor + "22" }}>
              <div className="w-2.5 h-2.5 rounded m-1.5" style={{ background: data.kpiCustomerColor }} />
            </div>
          </div>
          <div className="rounded-xl p-3 flex-1 min-w-[100px]" style={{ background: data.summaryCardBg, border: `1px solid ${data.summaryCardBorder}` }}>
            <div className="text-[10px] mb-1" style={{ color: data.kpiCardMutedColor }}>Doanh thu</div>
            <div className="text-lg font-bold" style={{ color: data.summaryRevenueColor }}>850tr</div>
          </div>
          <div className="rounded-xl p-3 flex-1 min-w-[120px] flex items-center justify-between" style={{ background: data.dataPoolBannerBg }}>
            <span className="text-xs font-medium" style={{ color: data.dataPoolBannerText }}>Data Pool</span>
            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: data.dataPoolBtnBg, color: data.dataPoolBtnText }}>Nh\u1eadn ngay</span>
          </div>
          <div className="rounded-xl p-3 flex-1 min-w-[100px]" style={{ background: data.sectionCardBg, border: `1px solid ${data.sectionCardBorder}` }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: data.sectionHeaderColor }}>Pipeline</div>
            <div className="h-2 rounded-full mb-1" style={{ background: data.accentColor + "33" }}>
              <div className="h-2 rounded-full w-3/4" style={{ background: data.accentColor }} />
            </div>
            <div className="text-[10px]" style={{ color: data.sectionBodyColor }}>3 kh\u00e1ch h\u00e0ng</div>
          </div>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#f3f4f6" }}>
        {GROUP_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveGroup(tab.id)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: activeGroup === tab.id ? "#ffffff" : "transparent",
              color: activeGroup === tab.id ? "#C9A84C" : "#6b7280",
              boxShadow: activeGroup === tab.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Colors tab */}
      {activeGroup === "colors" && (
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold mb-3" style={{ color: "#6b7280" }}>B\u1ed8 M\u00c0U C\u00d3 S\u1eb4N</div>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.theme)}
                  className="text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: preset.theme.kpiCardBg ?? "#fff", border: `2px solid ${preset.theme.accentColor ?? "#e5e7eb"}`, color: "#111827" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: preset.theme.accentColor ?? "#C9A84C" }} />
                    <span>{preset.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {COLOR_GROUPS.map(group => (
            <SectionCard key={group.title} title={group.title} icon={Palette}>
              <div className="divide-y divide-gray-50">
                {group.fields.map(field => (
                  <ThemeColorRow
                    key={field.key}
                    label={field.label}
                    value={data[field.key] as string}
                    onChange={v => set(field.key, v as DashboardTheme[typeof field.key])}
                  />
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* Layout tab */}
      {activeGroup === "layout" && (
        <div className="space-y-4">
          <SectionCard title="S\u1ed1 c\u1ed9t KPI Cards" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([2, 3, 4] as KpiColumns[]).map(n => (
                <button
                  key={n}
                  onClick={() => set("kpiColumns", n)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all"
                  style={{
                    background: data.kpiColumns === n ? "#C9A84C" : "#f9fafb",
                    color: data.kpiColumns === n ? "#fff" : "#374151",
                    borderColor: data.kpiColumns === n ? "#C9A84C" : "#e5e7eb",
                  }}
                >
                  {n} c\u1ed9t
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Ch\u1ecdn KPI Cards hi\u1ec3n th\u1ecb (t\u1ed1i \u0111a 6)" icon={Palette}>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {ALL_KPI_CARDS.map(id => {
                const visible = data.visibleKpiCards ?? ALL_KPI_CARDS.slice(0, 4);
                const isOn = visible.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleKpiCard(id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all"
                    style={{
                      background: isOn ? "rgba(201,168,76,0.1)" : "#f9fafb",
                      borderColor: isOn ? "#C9A84C" : "#e5e7eb",
                      color: isOn ? "#C9A84C" : "#6b7280",
                    }}
                  >
                    <div className="w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: isOn ? "#C9A84C" : "#d1d5db", background: isOn ? "#C9A84C" : "transparent" }}>
                      {isOn && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {KPI_CARD_LABELS[id]}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="S\u1eafp x\u1ebfp & \u1ea8n/hi\u1ec7n c\u00e1c Section" icon={GripVertical}>
            <div className="space-y-1 mt-1">
              {(data.sectionOrder ?? ALL_SECTIONS).map((id, idx) => {
                const hidden = (data.hiddenSections ?? []).includes(id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: hidden ? "#fef2f2" : "#f9fafb", border: `1px solid ${hidden ? "#fecaca" : "#e5e7eb"}` }}
                  >
                    <GripVertical size={14} style={{ color: "#9ca3af" }} />
                    <span className="flex-1 text-xs font-medium" style={{ color: hidden ? "#ef4444" : "#374151" }}>
                      {SECTION_LABELS[id]}
                    </span>
                    <button onClick={() => moveSectionUp(idx)} className="p-1 rounded hover:bg-gray-200 transition-colors" title="L\u00ean tr\u00ean">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 2L9 7H1L5 2Z" fill="#6b7280" />
                      </svg>
                    </button>
                    <button onClick={() => moveSectionDown(idx)} className="p-1 rounded hover:bg-gray-200 transition-colors" title="Xu\u1ed1ng d\u01b0\u1edbi">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 8L1 3H9L5 8Z" fill="#6b7280" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleSection(id)}
                      className="p-1 rounded transition-colors"
                      title={hidden ? "Hi\u1ec7n section" : "\u1ea8n section"}
                    >
                      {hidden
                        ? <EyeOff size={14} style={{ color: "#ef4444" }} />
                        : <Eye size={14} style={{ color: "#22c55e" }} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Typography tab */}
      {activeGroup === "typography" && (
        <div className="space-y-4">
          <SectionCard title="M\u1eadt \u0111\u1ed9 th\u00f4ng tin" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "compact", label: "Compact", desc: "Nhi\u1ec1u th\u00f4ng tin" },
                { value: "default", label: "Default", desc: "C\u00e2n b\u1eb1ng" },
                { value: "comfortable", label: "Tho\u00e1ng", desc: "D\u1ec5 \u0111\u1ecdc" },
              ] as { value: DensityMode; label: string; desc: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("density", opt.value)}
                  className="flex-1 py-2 px-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background: data.density === opt.value ? "#C9A84C" : "#f9fafb",
                    color: data.density === opt.value ? "#fff" : "#374151",
                    borderColor: data.density === opt.value ? "#C9A84C" : "#e5e7eb",
                  }}
                >
                  <div>{opt.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Font ch\u1eef" icon={Palette}>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {([
                { value: "inter",           label: "Inter",            sample: "Aa Bb Cc" },
                { value: "roboto",          label: "Roboto",           sample: "Aa Bb Cc" },
                { value: "be-vietnam-pro",  label: "Be Vietnam Pro",   sample: "Aa Bb Cc" },
                { value: "playfair",        label: "Playfair Display", sample: "Aa Bb Cc" },
              ] as { value: FontFamily; label: string; sample: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("fontFamily", opt.value)}
                  className="px-3 py-2.5 rounded-xl text-sm border transition-all text-left"
                  style={{
                    background: data.fontFamily === opt.value ? "rgba(201,168,76,0.1)" : "#f9fafb",
                    borderColor: data.fontFamily === opt.value ? "#C9A84C" : "#e5e7eb",
                    color: "#374151",
                  }}
                >
                  <div className="font-semibold text-xs" style={{ color: data.fontFamily === opt.value ? "#C9A84C" : "#374151" }}>{opt.label}</div>
                  <div className="text-[11px] mt-0.5 opacity-60">{opt.sample}</div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="C\u1ee1 ch\u1eef s\u1ed1 li\u1ec7u KPI" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "small",  label: "Nh\u1ecf",  size: "text-xl" },
                { value: "medium", label: "V\u1eeba",  size: "text-3xl" },
                { value: "large",  label: "To",    size: "text-5xl" },
              ] as { value: KpiSize; label: string; size: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("kpiValueSize", opt.value)}
                  className="flex-1 py-3 rounded-xl border transition-all"
                  style={{
                    background: data.kpiValueSize === opt.value ? "rgba(201,168,76,0.1)" : "#f9fafb",
                    borderColor: data.kpiValueSize === opt.value ? "#C9A84C" : "#e5e7eb",
                  }}
                >
                  <div className={`${opt.size} font-bold`} style={{ color: data.kpiValueSize === opt.value ? "#C9A84C" : "#374151" }}>42</div>
                  <div className="text-xs mt-1" style={{ color: "#9ca3af" }}>{opt.label}</div>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Charts tab */}
      {activeGroup === "charts" && (
        <div className="space-y-4">
          <SectionCard title="Lo\u1ea1i bi\u1ec3u \u0111\u1ed3 doanh thu" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "bar",  label: "C\u1ed9t (Bar)" },
                { value: "line", label: "\u0110\u01b0\u1eddng (Line)" },
                { value: "area", label: "Di\u1ec7n t\u00edch (Area)" },
              ] as { value: ChartType; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("chartType", opt.value)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background: data.chartType === opt.value ? "#C9A84C" : "#f9fafb",
                    color: data.chartType === opt.value ? "#fff" : "#374151",
                    borderColor: data.chartType === opt.value ? "#C9A84C" : "#e5e7eb",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="S\u1ed1 th\u00e1ng hi\u1ec3n th\u1ecb" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([3, 6, 12, 24] as (3|6|12|24)[]).map(n => (
                <button
                  key={n}
                  onClick={() => set("chartMonths", n)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background: data.chartMonths === n ? "#C9A84C" : "#f9fafb",
                    color: data.chartMonths === n ? "#fff" : "#374151",
                    borderColor: data.chartMonths === n ? "#C9A84C" : "#e5e7eb",
                  }}
                >
                  {n} th\u00e1ng
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Ki\u1ec3u Pipeline Funnel" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "bars",   label: "Thanh ngang" },
                { value: "funnel", label: "H\u00ecnh ph\u1ec5u" },
                { value: "donut",  label: "Donut chart" },
              ] as { value: FunnelStyle; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("funnelStyle", opt.value)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background: data.funnelStyle === opt.value ? "#C9A84C" : "#f9fafb",
                    color: data.funnelStyle === opt.value ? "#fff" : "#374151",
                    borderColor: data.funnelStyle === opt.value ? "#C9A84C" : "#e5e7eb",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Palette m\u00e0u bi\u1ec3u \u0111\u1ed3" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "brand",        label: "Th\u01b0\u01a1ng hi\u1ec7u", colors: ["#C9A84C", "#4F46E5", "#059669", "#DC2626"] },
                { value: "categorical",  label: "Nhi\u1ec1u m\u00e0u",     colors: ["#60a5fa", "#f97316", "#a78bfa", "#34d399"] },
                { value: "monochrome",   label: "\u0110\u01a1n s\u1eafc",     colors: ["#1e293b", "#475569", "#94a3b8", "#e2e8f0"] },
              ] as { value: ChartPalette; label: string; colors: string[] }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("chartPalette", opt.value)}
                  className="flex-1 py-2.5 px-2 rounded-xl border transition-all"
                  style={{
                    background: data.chartPalette === opt.value ? "rgba(201,168,76,0.1)" : "#f9fafb",
                    borderColor: data.chartPalette === opt.value ? "#C9A84C" : "#e5e7eb",
                  }}
                >
                  <div className="flex gap-0.5 justify-center mb-1">
                    {opt.colors.map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                  </div>
                  <div className="text-xs font-medium" style={{ color: data.chartPalette === opt.value ? "#C9A84C" : "#374151" }}>{opt.label}</div>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Widgets tab */}
      {activeGroup === "widgets" && (
        <div className="space-y-4">
          <SectionCard title="Ticker th\u00f4ng b\u00e1o n\u1ed9i b\u1ed9" icon={Palette}>
            <ToggleRow
              label="Hi\u1ec3n th\u1ecb ticker"
              desc="D\u1ea3i ch\u1ea1y ch\u1eef th\u00f4ng b\u00e1o \u1edf \u0111\u1ea7u dashboard"
              value={data.tickerEnabled ?? false}
              onChange={v => set("tickerEnabled", v)}
            />
            {data.tickerEnabled && (
              <>
                <div className="py-2.5" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <div className="text-sm mb-1.5" style={{ color: "#374151" }}>N\u1ed9i dung ticker</div>
                  <input
                    type="text"
                    value={data.tickerText ?? ""}
                    onChange={e => set("tickerText", e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border"
                    style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
                    placeholder="Nh\u1eadp th\u00f4ng b\u00e1o n\u1ed9i b\u1ed9..."
                  />
                </div>
                <ThemeColorRow label="N\u1ec1n ticker" value={data.tickerBg ?? "#1E293B"} onChange={v => set("tickerBg", v)} />
                <ThemeColorRow label="Ch\u1eef ticker" value={data.tickerTextColor ?? "#F1F5F9"} onChange={v => set("tickerTextColor", v)} />
              </>
            )}
          </SectionCard>

          <SectionCard title="Header th\u01b0\u01a1ng hi\u1ec7u" icon={Palette}>
            <div className="py-2.5" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div className="text-sm mb-1.5" style={{ color: "#374151" }}>T\u00ean c\u00f4ng ty tr\u00ean header</div>
              <input
                type="text"
                value={data.headerCompanyName ?? ""}
                onChange={e => set("headerCompanyName", e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
                placeholder="M\u1eb7c \u0111\u1ecbnh: SmartFurni CRM"
              />
            </div>
            <div className="py-2.5" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div className="text-sm mb-1.5" style={{ color: "#374151" }}>URL logo (header)</div>
              <input
                type="text"
                value={data.headerLogoUrl ?? ""}
                onChange={e => set("headerLogoUrl", e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
                placeholder="https://..."
              />
            </div>
            <div className="py-2.5" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div className="text-sm mb-1.5" style={{ color: "#374151" }}>URL \u1ea3nh n\u1ec1n header</div>
              <input
                type="text"
                value={data.headerBgImageUrl ?? ""}
                onChange={e => set("headerBgImageUrl", e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
                placeholder="https://... (t\u00f9y ch\u1ecdn)"
              />
            </div>
            <div className="py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm" style={{ color: "#374151" }}>Opacity \u1ea3nh n\u1ec1n</span>
                <span className="text-xs font-mono" style={{ color: "#9ca3af" }}>{Math.round((data.headerBgOpacity ?? 0.08) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0} max={0.4} step={0.01}
                value={data.headerBgOpacity ?? 0.08}
                onChange={e => set("headerBgOpacity", parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: "#C9A84C" }}
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Behavior tab */}
      {activeGroup === "behavior" && (
        <div className="space-y-4">
          <SectionCard title="T\u1ef1 \u0111\u1ed9ng refresh" icon={RefreshCw}>
            <div className="flex flex-wrap gap-2 mt-1">
              {([
                { value: 0,   label: "T\u1eaft" },
                { value: 30,  label: "30 gi\u00e2y" },
                { value: 60,  label: "1 ph\u00fat" },
                { value: 300, label: "5 ph\u00fat" },
                { value: 900, label: "15 ph\u00fat" },
              ] as { value: RefreshInterval; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("refreshInterval", opt.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background: data.refreshInterval === opt.value ? "#C9A84C" : "#f9fafb",
                    color: data.refreshInterval === opt.value ? "#fff" : "#374151",
                    borderColor: data.refreshInterval === opt.value ? "#C9A84C" : "#e5e7eb",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Hi\u1ec7u \u1ee9ng & T\u01b0\u01a1ng t\u00e1c" icon={Palette}>
            <ToggleRow
              label="B\u1eadt animation"
              desc="S\u1ed1 \u0111\u1ebfm, bi\u1ec3u \u0111\u1ed3 grow-up, transition"
              value={data.animationsEnabled ?? true}
              onChange={v => set("animationsEnabled", v)}
            />
            <ToggleRow
              label="Keyboard shortcuts"
              desc="N: Th\u00eam KH | D: Dashboard | K: Kanban | T: Tasks"
              value={data.keyboardShortcutsEnabled ?? true}
              onChange={v => set("keyboardShortcutsEnabled", v)}
            />
          </SectionCard>

          <SectionCard title="Presentation Mode" icon={Eye}>
            <ToggleRow
              label="B\u1eadt Presentation Mode"
              desc="\u1ea8n sidebar, ph\u00f3ng to s\u1ed1 li\u1ec7u \u2014 d\u00f9ng khi b\u00e1o c\u00e1o tr\u00ean m\u00e0n h\u00ecnh l\u1edbn"
              value={data.presentationMode ?? false}
              onChange={v => set("presentationMode", v)}
            />
            {data.presentationMode && (
              <div className="mt-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(201,168,76,0.1)", color: "#92400e", border: "1px solid rgba(201,168,76,0.3)" }}>
                Presentation Mode \u0111ang b\u1eadt. Sidebar s\u1ebd \u1ea9n v\u00e0 s\u1ed1 li\u1ec7u s\u1ebd \u0111\u01b0\u1ee3c ph\u00f3ng to khi t\u1ea3i l\u1ea1i trang.
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <Icon size={14} style={{ color: "#C9A84C" }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: "#1f2937" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CrmSettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState<CrmSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<TabId>("company");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const updateSection = useCallback(<K extends keyof CrmSettings>(key: K, value: CrmSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveSection = async (key: keyof CrmSettings) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/crm/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key] }),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setError("");
    try {
      for (const key of Object.keys(settings) as (keyof CrmSettings)[]) {
        await fetch("/api/crm/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: settings[key] }),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const activeTabData = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="flex h-full" style={{ background: "#ffffff", color: "#111827" }}>
      {/* Left sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: "#f8f9fb", borderRight: "1px solid #e5e7eb" }}>
        {/* Header */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid #e5e7eb" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}>
              <Settings size={16} className="text-black" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Cài đặt CRM</div>
              <div className="text-[10px]" style={{ color: "#9ca3af" }}>Cấu hình hệ thống</div>
            </div>
          </div>
        </div>

        {/* Tab list */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-start gap-3 px-4 py-3 transition-all text-left"
                style={{
                  background: active ? "rgba(201,168,76,0.08)" : "transparent",
                  borderLeft: `2px solid ${active ? "#C9A84C" : "transparent"}`,
                }}
              >
                <tab.icon size={16} className="mt-0.5 flex-shrink-0"
                  style={{ color: active ? "#C9A84C" : "#9ca3af" }} />
                <div>
                  <div className="text-xs font-semibold"
                    style={{ color: active ? "#E2C97E" : "#374151" }}>
                    {tab.label}
                  </div>
                  <div className="text-[10px] mt-0.5"
                    style={{ color: "#9ca3af" }}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Save all */}
        <div className="p-4" style={{ borderTop: "1px solid #e5e7eb" }}>
          <button
            onClick={saveAll}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)", color: "#000" }}
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Đang lưu..." : "Lưu tất cả"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{activeTabData.label}</h1>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{activeTabData.desc}</p>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                <AlertCircle size={12} /> {error}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle2 size={12} /> Đã lưu thành công
              </div>
            )}
            <button
              onClick={() => saveSection(activeTab === "leadtypes" ? "leadTypes" : activeTab === "dashboardtheme" ? "dashboardTheme" : activeTab as keyof CrmSettings)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Lưu mục này
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "company"       && <CompanyTab       data={settings.company}       onChange={v => updateSection("company", v)} />}
          {activeTab === "pipeline"      && <PipelineTab      data={settings.pipeline}      onChange={v => updateSection("pipeline", v)} />}
          {activeTab === "sources"       && <SourcesTab       data={settings.sources}       onChange={v => updateSection("sources", v)} />}
          {activeTab === "leadtypes"     && <LeadTypesTab     data={settings.leadTypes}     onChange={v => updateSection("leadTypes", v)} />}
          {activeTab === "discount"      && <DiscountTab      data={settings.discountTiers} onChange={v => updateSection("discountTiers", v)} />}
          {activeTab === "webhook"       && <WebhookTab       data={settings.webhook}       onChange={v => updateSection("webhook", v)} />}
          {activeTab === "notifications" && <NotificationsTab data={settings.notifications} onChange={v => updateSection("notifications", v)} />}
          {activeTab === "quote"         && <QuoteTab         data={settings.quote}         onChange={v => updateSection("quote", v)} />}
          {activeTab === "email"         && <EmailTab         data={settings.email}         onChange={v => updateSection("email", v)} />}
          {activeTab === "dashboardtheme" && <DashboardThemeTab data={settings.dashboardTheme} onChange={v => updateSection("dashboardTheme", v)} />}
        </div>
      </div>
    </div>
  );
}
