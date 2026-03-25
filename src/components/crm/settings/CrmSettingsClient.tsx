"use client";

import { useState, useCallback } from "react";
import {
  Building2, GitBranch, Users, Tag, Percent, Webhook,
  Bell, FileText, Mail, Save, RotateCcw, Plus, Trash2,
  GripVertical, Eye, EyeOff, ChevronRight, CheckCircle2,
  AlertCircle, Settings, Copy, RefreshCw,
} from "lucide-react";
import type { CrmSettings, PipelineStage, LeadSource, LeadTypeConfig, DiscountTierConfig } from "@/lib/crm-settings-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialSettings: CrmSettings;
}

type TabId = "company" | "pipeline" | "sources" | "leadtypes" | "discount" | "webhook" | "notifications" | "quote" | "email";

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
          background: "#f3f4f6",
          border: "1px solid #d1d5db",
          color: "#fff",
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
          background: "#f3f4f6",
          border: "1px solid #d1d5db",
          color: "#fff",
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
                  style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}
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
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}
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
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}
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
                    style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }} />
                </td>
                <td className="px-4 py-3">
                  <input type="number" value={tier.minQty} onChange={e => update(idx, "minQty", e.target.value)}
                    className="w-24 px-2 py-1 rounded text-sm outline-none"
                    style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }} />
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
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}
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
                style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}
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
    <div className="flex h-full" style={{ background: "#ffffff", color: "#fff" }}>
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
              onClick={() => saveSection(activeTab === "leadtypes" ? "leadTypes" : activeTab as keyof CrmSettings)}
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
        </div>
      </div>
    </div>
  );
}
