"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Building2, GitBranch, Users, Tag, Percent, Webhook,
  Bell, FileText, Mail, Save, RotateCcw, Plus, Trash2,
  GripVertical, Eye, EyeOff, ChevronRight, CheckCircle2,
  AlertCircle, Settings, Copy, RefreshCw, Palette, Sheet,
} from "lucide-react";
import type { CrmSettings, PipelineStage, LeadSource, LeadTypeConfig, DiscountTierConfig, DashboardTheme, DashboardSectionId, KpiCardId, ChartType, FunnelStyle, ChartPalette, DensityMode, FontFamily, KpiSize, KpiColumns, RefreshInterval } from "@/lib/crm-settings-store";

const GoogleSheetClient = dynamic(() => import("@/app/crm/integrations/google-sheet/GoogleSheetClient"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialSettings: CrmSettings;
}

type TabId = "company" | "pipeline" | "sources" | "leadtypes" | "discount" | "webhook" | "notifications" | "quote" | "email" | "dashboardtheme" | "googlesheet";

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
  { id: "googlesheet",   label: "Google Sheet Sync",   icon: Sheet,      desc: "Đồng bộ dữ liệu từ Google Sheet" },
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

function DiscountTierTable({ data, onChange }: { data: DiscountTierConfig[]; onChange: (d: DiscountTierConfig[]) => void }) {
  const add = () => onChange([...data, { minQty: 100, discountPct: 30, label: "Từ 100 bộ" }]);
  const update = (idx: number, field: keyof DiscountTierConfig, value: string | number) => {
    const updated = [...data];
    updated[idx] = { ...updated[idx], [field]: field === "label" ? value : Number(value) };
    onChange(updated);
  };
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
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
      {data.length > 0 && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#C9A84C" }}>Xem trước:</p>
          <div className="flex flex-wrap gap-2">
            {[...data].sort((a, b) => a.minQty - b.minQty).map((tier, idx) => (
              <div key={idx} className="px-3 py-1 rounded-full text-xs"
                style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.2)" }}>
                ≥{tier.minQty} bộ → -{tier.discountPct}%
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProductDiscountOverride {
  productId: string;
  productName: string;
  tiers: DiscountTierConfig[];
}

function DiscountTab({ data, onChange }: { data: DiscountTierConfig[]; onChange: (d: DiscountTierConfig[]) => void }) {
  const [subTab, setSubTab] = useState<"default" | "product">("default");
  const [products, setProducts] = useState<{ id: string; name: string; sku: string; discountTiers: DiscountTierConfig[] }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productOverrides, setProductOverrides] = useState<ProductDiscountOverride[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savedProduct, setSavedProduct] = useState(false);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/crm/products");
      if (res.ok) {
        const list = await res.json();
        setProducts(list);
        // Build overrides from products that have custom tiers
        const overrides: ProductDiscountOverride[] = list
          .filter((p: { id: string; name: string; sku: string; discountTiers: DiscountTierConfig[] }) => p.discountTiers && p.discountTiers.length > 0)
          .map((p: { id: string; name: string; sku: string; discountTiers: DiscountTierConfig[] }) => ({ productId: p.id, productName: p.name, tiers: p.discountTiers }));
        setProductOverrides(overrides);
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubTabChange = (tab: "default" | "product") => {
    setSubTab(tab);
    if (tab === "product" && products.length === 0) loadProducts();
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedOverride = productOverrides.find(o => o.productId === selectedProductId);
  const currentTiers: DiscountTierConfig[] = selectedOverride?.tiers ?? [];

  const updateProductTiers = (tiers: DiscountTierConfig[]) => {
    setProductOverrides(prev => {
      const exists = prev.find(o => o.productId === selectedProductId);
      if (exists) return prev.map(o => o.productId === selectedProductId ? { ...o, tiers } : o);
      return [...prev, { productId: selectedProductId!, productName: selectedProduct?.name ?? "", tiers }];
    });
  };

  const saveProductTiers = async () => {
    if (!selectedProduct) return;
    setSavingProduct(true);
    try {
      const tiers = productOverrides.find(o => o.productId === selectedProductId)?.tiers ?? [];
      await fetch("/api/crm/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selectedProduct, discountTiers: tiers }),
      });
      setSavedProduct(true);
      setTimeout(() => setSavedProduct(false), 2500);
    } finally {
      setSavingProduct(false);
    }
  };

  const removeProductOverride = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    await fetch("/api/crm/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, discountTiers: [] }),
    });
    setProductOverrides(prev => prev.filter(o => o.productId !== productId));
    if (selectedProductId === productId) setSelectedProductId(null);
    // Refresh products
    loadProducts();
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#f3f4f6", width: "fit-content" }}>
        <button onClick={() => handleSubTabChange("default")}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={subTab === "default" ? { background: "#fff", color: "#C9A84C", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "#6b7280" }}>
          Mặc định
        </button>
        <button onClick={() => handleSubTabChange("product")}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={subTab === "product" ? { background: "#fff", color: "#C9A84C", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "#6b7280" }}>
          Theo sản phẩm
        </button>
      </div>

      {subTab === "default" && (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Chiết khấu mặc định áp dụng cho tất cả sản phẩm khi tạo báo giá (trừ sản phẩm đã cài riêng).
          </p>
          <DiscountTierTable data={data} onChange={onChange} />
        </div>
      )}

      {subTab === "product" && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Cài chiết khấu riêng cho từng sản phẩm. Sản phẩm có chiết khấu riêng sẽ không áp dụng chiết khấu mặc định.
          </p>

          {loadingProducts ? (
            <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "#9ca3af" }}>
              <RefreshCw size={16} className="animate-spin" /> Đang tải sản phẩm...
            </div>
          ) : (
            <div className="flex gap-4">
              {/* Left: product list */}
              <div className="w-56 flex-shrink-0 space-y-1">
                <div className="text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>CHỌN SẢN PHẨM</div>
                {products.length === 0 ? (
                  <div className="text-sm py-4 text-center" style={{ color: "#9ca3af" }}>Chưa có sản phẩm</div>
                ) : (
                  products.map(p => {
                    const hasOverride = productOverrides.some(o => o.productId === p.id);
                    return (
                      <button key={p.id} onClick={() => setSelectedProductId(p.id)}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between gap-2"
                        style={selectedProductId === p.id
                          ? { background: "rgba(201,168,76,0.12)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }
                          : { background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb" }}>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-xs" style={{ color: "#9ca3af" }}>{p.sku}</div>
                        </div>
                        {hasOverride && (
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#C9A84C" }} />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right: tier editor */}
              <div className="flex-1 min-w-0">
                {!selectedProductId ? (
                  <div className="flex items-center justify-center h-40 rounded-xl text-sm" style={{ color: "#9ca3af", border: "2px dashed #e5e7eb" }}>
                    ← Chọn sản phẩm để cài chiết khấu riêng
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: "#111827" }}>{selectedProduct?.name}</div>
                        <div className="text-xs" style={{ color: "#9ca3af" }}>{selectedProduct?.sku}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedOverride && (
                          <button onClick={() => removeProductOverride(selectedProductId)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                            Xoá chiết khấu riêng
                          </button>
                        )}
                        <button onClick={saveProductTiers} disabled={savingProduct}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                          style={{ background: savedProduct ? "rgba(34,197,94,0.15)" : "rgba(201,168,76,0.15)", color: savedProduct ? "#16a34a" : "#C9A84C", border: `1px solid ${savedProduct ? "rgba(34,197,94,0.3)" : "rgba(201,168,76,0.3)"}` }}>
                          {savingProduct ? <RefreshCw size={12} className="animate-spin" /> : savedProduct ? <CheckCircle2 size={12} /> : <Save size={12} />}
                          {savedProduct ? "Đã lưu" : "Lưu sản phẩm này"}
                        </button>
                      </div>
                    </div>
                    {currentTiers.length === 0 && (
                      <div className="p-3 rounded-lg text-xs" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
                        Chưa có bậc chiết khấu riêng — đang dùng chiết khấu mặc định. Thêm bậc để ghi đè.
                      </div>
                    )}
                    <DiscountTierTable data={currentTiers} onChange={updateProductTiers} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary of all product overrides */}
          {productOverrides.length > 0 && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div className="text-xs font-semibold mb-3" style={{ color: "#6b7280" }}>SẢN PHẨM CÓ CHIẾT KHẤU RIÊNG ({productOverrides.length})</div>
              <div className="space-y-2">
                {productOverrides.map(o => (
                  <div key={o.productId} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
                    <div>
                      <span className="text-sm font-medium" style={{ color: "#374151" }}>{o.productName}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[...o.tiers].sort((a, b) => a.minQty - b.minQty).map((t, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs"
                            style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C" }}>
                            ≥{t.minQty} bộ → -{t.discountPct}%
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { setSelectedProductId(o.productId); }}
                      className="text-xs px-2 py-1 rounded" style={{ color: "#C9A84C" }}>Sửa</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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

      {/* Facebook Lead Ads Integration */}
      <SectionCard
        title="Facebook Lead Ads"
        icon={() => (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        )}
      >
        <div className="space-y-5">
          {/* Toggle bật/tắt */}
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: data.fbEnabled ? "rgba(24,119,242,0.06)" : "#f9fafb", border: `1px solid ${data.fbEnabled ? "rgba(24,119,242,0.2)" : "#e5e7eb"}` }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: data.fbEnabled ? "#1877F2" : "#374151" }}>
                {data.fbEnabled ? "✅ Đang hoạt động" : "⚪ Tắt"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                {data.fbEnabled
                  ? "Lead từ Facebook sẽ tự động đổ vào Data Pool"
                  : "Bật để nhận lead từ Facebook Lead Ads"}
              </p>
            </div>
            <button
              onClick={() => onChange({ ...data, fbEnabled: !data.fbEnabled })}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ background: data.fbEnabled ? "#1877F2" : "#d1d5db" }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                style={{ transform: data.fbEnabled ? "translateX(1.375rem)" : "translateX(0.25rem)" }}
              />
            </button>
          </div>

          {/* Webhook URL để điền vào Facebook */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>
              Webhook URL (dán vào Facebook App → Webhooks)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg text-xs font-mono truncate"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1877F2" }}>
                {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/facebook-lead` : "https://yourdomain.com/api/webhooks/facebook-lead"}
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/api/webhooks/facebook-lead`;
                  navigator.clipboard.writeText(url);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all flex-shrink-0"
                style={{ color: "#6b7280" }}
                title="Sao chép"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* Verify Token */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>
              Verify Token (dán vào Facebook App → Webhooks → Verify Token)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151" }}>
                {data.fbVerifyToken || "smartfurni_fb_webhook_2026"}
              </div>
              <button
                onClick={() => {
                  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
                  const token = "smartfurni_" + Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                  onChange({ ...data, fbVerifyToken: token });
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{ color: "#6b7280" }}
                title="Tạo token mới"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(data.fbVerifyToken || "smartfurni_fb_webhook_2026")}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
                style={{ color: "#6b7280" }}
                title="Sao chép"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* App ID + App Secret */}
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="App ID"
              value={data.fbAppId || ""}
              onChange={v => onChange({ ...data, fbAppId: v })}
              placeholder="123456789012345"
            />
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>App Secret</label>
              <input
                type="password"
                value={data.fbAppSecret || ""}
                onChange={e => onChange({ ...data, fbAppSecret: e.target.value })}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#ffffff", border: "1px solid #d1d5db", color: "#111827" }}
                onFocus={e => { e.currentTarget.style.borderColor = "#1877F2"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(24,119,242,0.1)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
              />
              <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>Dùng để xác thực chữ ký webhook</p>
            </div>
          </div>

          {/* Page Access Token */}
          <InputField
            label="Page Access Token (tùy chọn — dùng để lấy chi tiết lead qua API)"
            value={data.fbPageAccessToken || ""}
            onChange={v => onChange({ ...data, fbPageAccessToken: v })}
            placeholder="EAABsbCS..."
          />

          {/* Page Name */}
          <InputField
            label="Tên Facebook Page"
            value={data.fbPageName || ""}
            onChange={v => onChange({ ...data, fbPageName: v })}
            placeholder="SmartFurni Official"
          />

          {/* Hướng dẫn ngắn */}
          <div className="p-4 rounded-xl space-y-2"
            style={{ background: "rgba(24,119,242,0.04)", border: "1px solid rgba(24,119,242,0.15)" }}>
            <p className="text-xs font-semibold" style={{ color: "#1877F2" }}>Hướng dẫn kết nối nhanh</p>
            <ol className="text-xs space-y-1.5 list-decimal list-inside" style={{ color: "#6b7280" }}>
              <li>Vào <strong style={{ color: "#374151" }}>Meta for Developers</strong> → Tạo App mới (loại Business)</li>
              <li>Vào <strong style={{ color: "#374151" }}>App → Webhooks</strong> → Chọn sự kiện <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 3 }}>leadgen</code></li>
              <li>Dán <strong style={{ color: "#374151" }}>Webhook URL</strong> và <strong style={{ color: "#374151" }}>Verify Token</strong> ở trên vào Facebook</li>
              <li>Sao chép <strong style={{ color: "#374151" }}>App ID</strong> và <strong style={{ color: "#374151" }}>App Secret</strong> từ trang App Dashboard</li>
              <li>Bật toggle “Đang hoạt động” → Nhấn <strong style={{ color: "#374151" }}>Lưu cài đặt</strong></li>
              <li>Test bằng cách gửi lead thử từ Facebook Lead Ads Manager</li>
            </ol>
          </div>
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

// ─── DashboardThemeTab ────────────────────────────────────────────────────────────────────────────


const SECTION_LABELS: Record<DashboardSectionId, string> = {
  kpiCards: "4 KPI Cards",
  dataPool: "Banner Data Pool",
  monthSummary: "3 Card tháng này",
  revenueChart: "Biểu đồ doanh thu",
  pipeline: "Pipeline Funnel",
  funnel: "Conversion Funnel",
  staleDeals: "Deal sắp mất",
  heatmap: "Heatmap hoạt động",
  staffPerformance: "Hiệu suất nhân viên",
  recentActivities: "Hoạt động gần đây",
  recentQuotes: "Báo giá gần đây",
  tasks: "Nhiệm vụ hôm nay",
  quickStats: "Thống kê nhanh",
  quickLinks: "Truy cập nhanh",
  overdue: "Quá hạn liên hệ",
  leaderboard: "Xếp hạng nhân viên",
  teamOnline: "Team Online",
};

const KPI_CARD_LABELS: Record<KpiCardId, string> = {
  totalLeads: "Tổng khách hàng",
  pipelineValue: "Pipeline giá trị",
  wonRate: "Tỷ lệ chốt đơn",
  overdue: "Cần liên hệ ngay",
  revenueMonth: "Doanh thu tháng",
  newLeadsMonth: "KH mới tháng",
  wonLeadsMonth: "Đơn chốt tháng",
  totalQuotes: "Tổng báo giá",
};

const ALL_SECTIONS: DashboardSectionId[] = [
  "kpiCards", "dataPool", "monthSummary", "revenueChart",
  "pipeline", "funnel", "staleDeals", "staffPerformance",
  "recentActivities", "recentQuotes",
  "tasks", "quickStats", "quickLinks", "overdue",
  "leaderboard", "teamOnline", "heatmap",
];

const ALL_KPI_CARDS: KpiCardId[] = [
  "totalLeads", "pipelineValue", "wonRate", "overdue",
  "revenueMonth", "newLeadsMonth", "wonLeadsMonth", "totalQuotes",
];

const THEME_PRESETS: { name: string; theme: Partial<DashboardTheme> }[] = [
  {
    name: "Clean Minimal (Mặc định)",
    theme: {
      pageBg: "#F7F8FA", kpiCardBg: "#FFFFFF", kpiCardBorder: "#EAECF0",
      kpiCardTitleColor: "#101828", kpiCardValueColor: "#101828", kpiCardMutedColor: "#667085",
      kpiCustomerColor: "#4F46E5", kpiPipelineColor: "#C9A84C",
      kpiWonColor: "#059669", kpiOverdueColor: "#DC2626",
      dataPoolBannerBg: "#FFFFFF", dataPoolBannerText: "#101828", dataPoolBtnBg: "#C9A84C", dataPoolBtnText: "#FFFFFF",
      summaryCardBg: "#FFFFFF", summaryCardBorder: "#EAECF0",
      sectionCardBg: "#FFFFFF", sectionCardBorder: "#EAECF0",
      sectionHeaderColor: "#101828", sectionBodyColor: "#344054",
      quickLinkBg: "#F7F8FA", quickLinkIconColor: "#4F46E5",
      accentColor: "#4F46E5", accentTextColor: "#FFFFFF",
    },
  },
  {
    name: "Gold & Navy (Cổ điển)",
    theme: {
      pageBg: "#F0F2F5", kpiCardBg: "#FFFFFF", kpiCardBorder: "#E4E7EC",
      kpiCardTitleColor: "#101828", kpiCardValueColor: "#101828", kpiCardMutedColor: "#667085",
      kpiCustomerColor: "#4F46E5", kpiPipelineColor: "#C9A84C",
      kpiWonColor: "#059669", kpiOverdueColor: "#DC2626",
      dataPoolBannerBg: "#0F172A", dataPoolBannerText: "#F1F5F9", dataPoolBtnBg: "#C9A84C", dataPoolBtnText: "#FFFFFF",
      summaryCardBg: "#FFFFFF", summaryCardBorder: "#E4E7EC",
      sectionCardBg: "#FFFFFF", sectionCardBorder: "#E4E7EC",
      sectionHeaderColor: "#101828", sectionBodyColor: "#475467",
      quickLinkBg: "#F9FAFB", quickLinkIconColor: "#C9A84C",
      accentColor: "#C9A84C", accentTextColor: "#FFFFFF",
    },
  },
  {
    name: "Xanh dương hiện đại",
    theme: {
      pageBg: "#EFF6FF", kpiCardBg: "#FFFFFF", kpiCardBorder: "#BFDBFE",
      kpiCardTitleColor: "#1E3A5F", kpiCardValueColor: "#1E3A5F", kpiCardMutedColor: "#64748B",
      kpiCustomerColor: "#2563EB", kpiPipelineColor: "#0EA5E9",
      kpiWonColor: "#059669", kpiOverdueColor: "#DC2626",
      dataPoolBannerBg: "#FFFFFF", dataPoolBannerText: "#1E3A5F", dataPoolBtnBg: "#2563EB", dataPoolBtnText: "#FFFFFF",
      summaryCardBg: "#FFFFFF", summaryCardBorder: "#BFDBFE",
      sectionCardBg: "#FFFFFF", sectionCardBorder: "#BFDBFE",
      sectionHeaderColor: "#1E3A5F", sectionBodyColor: "#475467",
      quickLinkBg: "#EFF6FF", quickLinkIconColor: "#2563EB",
      accentColor: "#2563EB", accentTextColor: "#FFFFFF",
    },
  },
  {
    name: "Tối sang trọng",
    theme: {
      pageBg: "#0F172A", kpiCardBg: "#1E293B", kpiCardBorder: "#334155",
      kpiCardTitleColor: "#F1F5F9", kpiCardValueColor: "#F8FAFC", kpiCardMutedColor: "#94A3B8",
      kpiCustomerColor: "#818CF8", kpiPipelineColor: "#FBBF24",
      kpiWonColor: "#34D399", kpiOverdueColor: "#F87171",
      dataPoolBannerBg: "#1E293B", dataPoolBannerText: "#F1F5F9", dataPoolBtnBg: "#FBBF24", dataPoolBtnText: "#0F172A",
      sectionCardBg: "#1E293B", sectionCardBorder: "#334155",
      sectionHeaderColor: "#F1F5F9", sectionBodyColor: "#94A3B8",
      taskCardBg: "#1E293B", quickLinkBg: "#0F172A", quickLinkIconColor: "#FBBF24",
      accentColor: "#FBBF24", accentTextColor: "#0F172A",
    },
  },
  {
    name: "Xanh lá tươi mát",
    theme: {
      pageBg: "#F0FDF4", kpiCardBg: "#FFFFFF", kpiCardBorder: "#BBF7D0",
      kpiCardTitleColor: "#14532D", kpiCardValueColor: "#14532D", kpiCardMutedColor: "#64748B",
      kpiCustomerColor: "#16A34A", kpiPipelineColor: "#CA8A04",
      kpiWonColor: "#059669", kpiOverdueColor: "#DC2626",
      dataPoolBannerBg: "#FFFFFF", dataPoolBannerText: "#14532D", dataPoolBtnBg: "#16A34A", dataPoolBtnText: "#FFFFFF",
      summaryCardBg: "#FFFFFF", summaryCardBorder: "#BBF7D0",
      sectionCardBg: "#FFFFFF", sectionCardBorder: "#BBF7D0",
      sectionHeaderColor: "#14532D", sectionBodyColor: "#475467",
      quickLinkBg: "#F0FDF4", quickLinkIconColor: "#16A34A",
      accentColor: "#16A34A", accentTextColor: "#FFFFFF",
    },
  },
];

const COLOR_GROUPS: { title: string; fields: { key: keyof DashboardTheme; label: string }[] }[] = [
  {
    title: "Nền trang",
    fields: [{ key: "pageBg", label: "Màu nền trang" }],
  },
  {
    title: "KPI Cards (4 ô đầu trang)",
    fields: [
      { key: "kpiCardBg",         label: "Nền card" },
      { key: "kpiCardBorder",     label: "Viền card" },
      { key: "kpiCardTitleColor", label: "Chữ tiêu đề" },
      { key: "kpiCardValueColor", label: "Chữ số liệu" },
      { key: "kpiCardMutedColor", label: "Chữ phụ" },
      { key: "kpiCustomerColor",  label: "Icon Tổng KH" },
      { key: "kpiPipelineColor",  label: "Icon Pipeline" },
      { key: "kpiWonColor",       label: "Icon Chốt đơn" },
      { key: "kpiOverdueColor",   label: "Icon Cần liên hệ" },
    ],
  },
  {
    title: "Banner Data Pool",
    fields: [
      { key: "dataPoolBannerBg",   label: "Nền banner" },
      { key: "dataPoolBannerText", label: "Chữ banner" },
      { key: "dataPoolBtnBg",      label: "Nền nút" },
      { key: "dataPoolBtnText",    label: "Chữ nút" },
    ],
  },
  {
    title: "3 Card thống kê tháng",
    fields: [
      { key: "summaryCardBg",       label: "Nền card" },
      { key: "summaryCardBorder",   label: "Viền card" },
      { key: "summaryRevenueColor", label: "Doanh thu" },
      { key: "summaryNewLeadColor", label: "KH mới" },
      { key: "summaryWonColor",     label: "Chốt đơn" },
    ],
  },
  {
    title: "Section Cards (biểu đồ, pipeline, nguồn KH)",
    fields: [
      { key: "sectionCardBg",      label: "Nền card" },
      { key: "sectionCardBorder",  label: "Viền card" },
      { key: "sectionHeaderColor", label: "Tiêu đề" },
      { key: "sectionBodyColor",   label: "Nội dung" },
    ],
  },
  {
    title: "Cột phải (Task, Quick Links)",
    fields: [
      { key: "taskCardBg",        label: "Nền card" },
      { key: "taskUrgentColor",   label: "Task khẩn cấp" },
      { key: "quickLinkBg",       label: "Nền quick link" },
      { key: "quickLinkIconColor", label: "Icon quick link" },
    ],
  },
  {
    title: "Accent / Thương hiệu",
    fields: [
      { key: "accentColor",     label: "Màu accent chính" },
      { key: "accentTextColor", label: "Chữ trên accent" },
    ],
  },
  {
    title: "Ticker thông báo",
    fields: [
      { key: "tickerBg",        label: "Nền ticker" },
      { key: "tickerTextColor", label: "Chữ ticker" },
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
          title="Chọn màu"
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
    { id: "colors" as const,     label: "Màu sắc" },
    { id: "layout" as const,     label: "Bố cục" },
    { id: "typography" as const, label: "Chữ & Mật độ" },
    { id: "charts" as const,     label: "Biểu đồ" },
    { id: "widgets" as const,    label: "Widget" },
    { id: "behavior" as const,   label: "Hành vi" },
  ];

  return (
    <div className="space-y-5">
      {/* Live preview */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
        <div className="px-4 py-3 text-xs font-semibold" style={{ background: "#f9fafb", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
          XEM TRƯỚC — Màu hiện tại
        </div>
        <div className="p-4 flex gap-3 flex-wrap" style={{ background: data.pageBg }}>
          <div className="rounded-xl p-3 flex-1 min-w-[100px]" style={{ background: data.kpiCardBg, border: `1px solid ${data.kpiCardBorder}` }}>
            <div className="text-[10px] mb-1" style={{ color: data.kpiCardMutedColor }}>Tổng KH</div>
            <div className="text-lg font-bold" style={{ color: data.kpiCardValueColor }}>42</div>
            <div className="w-5 h-5 rounded mt-1" style={{ background: data.kpiCustomerColor + "22" }}>
              <div className="w-2.5 h-2.5 rounded m-1.5" style={{ background: data.kpiCustomerColor }} />
            </div>
          </div>
          <div className="rounded-xl p-3 flex-1 min-w-[100px]" style={{ background: data.summaryCardBg, border: `1px solid ${data.summaryCardBorder}` }}>
            <div className="text-[10px] mb-1" style={{ color: data.kpiCardMutedColor }}>Doanh thu</div>
            <div className="text-lg font-bold" style={{ color: data.summaryRevenueColor }}>850tr</div>
          </div>
          <div className="rounded-xl p-3 flex-1 min-w-[120px] flex items-center justify-between"
            style={{
              background: data.dataPoolBannerBg,
              border: `1px solid ${data.dataPoolBannerBg === "#FFFFFF" || data.dataPoolBannerBg === "#ffffff" ? data.kpiCardBorder : "transparent"}`,
              borderLeft: `3px solid ${data.dataPoolBtnBg}`,
            }}>
            <span className="text-xs font-medium" style={{ color: data.dataPoolBannerText }}>Data Pool</span>
            <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: data.dataPoolBtnBg, color: data.dataPoolBtnText }}>Nhận ngay</span>
          </div>
          <div className="rounded-xl p-3 flex-1 min-w-[100px]" style={{ background: data.sectionCardBg, border: `1px solid ${data.sectionCardBorder}` }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: data.sectionHeaderColor }}>Pipeline</div>
            <div className="h-2 rounded-full mb-1" style={{ background: data.accentColor + "33" }}>
              <div className="h-2 rounded-full w-3/4" style={{ background: data.accentColor }} />
            </div>
            <div className="text-[10px]" style={{ color: data.sectionBodyColor }}>3 khách hàng</div>
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
              color: activeGroup === tab.id ? "#4F46E5" : "#6b7280",
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
            <div className="text-xs font-semibold mb-3" style={{ color: "#6b7280" }}>BỘ MÀU CÓ SẴN</div>
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
          <SectionCard title="Số cột KPI Cards" icon={Palette}>
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
                  {n} cột
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Chọn KPI Cards hiển thị (tối đa 6)" icon={Palette}>
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

          <SectionCard title="Sắp xếp & Ẩn/hiện các Section" icon={GripVertical}>
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
                    <button onClick={() => moveSectionUp(idx)} className="p-1 rounded hover:bg-gray-200 transition-colors" title="Lên trên">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 2L9 7H1L5 2Z" fill="#6b7280" />
                      </svg>
                    </button>
                    <button onClick={() => moveSectionDown(idx)} className="p-1 rounded hover:bg-gray-200 transition-colors" title="Xuống dưới">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 8L1 3H9L5 8Z" fill="#6b7280" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleSection(id)}
                      className="p-1 rounded transition-colors"
                      title={hidden ? "Hiện section" : "Ẩn section"}
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
          <SectionCard title="Mật độ thông tin" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "compact", label: "Compact", desc: "Nhiều thông tin" },
                { value: "default", label: "Default", desc: "Cân bằng" },
                { value: "comfortable", label: "Thoáng", desc: "Dễ đọc" },
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

          <SectionCard title="Font chữ" icon={Palette}>
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

          <SectionCard title="Cỡ chữ số liệu KPI" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "small",  label: "Nhỏ",  size: "text-xl" },
                { value: "medium", label: "Vừa",  size: "text-3xl" },
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
          <SectionCard title="Loại biểu đồ doanh thu" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "bar",  label: "Cột (Bar)" },
                { value: "line", label: "Đường (Line)" },
                { value: "area", label: "Diện tích (Area)" },
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

          <SectionCard title="Số tháng hiển thị" icon={Palette}>
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
                  {n} tháng
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Kiểu Pipeline Funnel" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "bars",   label: "Thanh ngang" },
                { value: "funnel", label: "Hình phễu" },
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

          <SectionCard title="Palette màu biểu đồ" icon={Palette}>
            <div className="flex gap-2 mt-1">
              {([
                { value: "brand",        label: "Thương hiệu", colors: ["#C9A84C", "#4F46E5", "#059669", "#DC2626"] },
                { value: "categorical",  label: "Nhiều màu",     colors: ["#60a5fa", "#f97316", "#a78bfa", "#34d399"] },
                { value: "monochrome",   label: "Đơn sắc",     colors: ["#1e293b", "#475569", "#94a3b8", "#e2e8f0"] },
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
          <SectionCard title="Ticker thông báo nội bộ" icon={Palette}>
            <ToggleRow
              label="Hiển thị ticker"
              desc="Dải chạy chữ thông báo ở đầu dashboard"
              value={data.tickerEnabled ?? false}
              onChange={v => set("tickerEnabled", v)}
            />
            {data.tickerEnabled && (
              <>
                <div className="py-2.5" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <div className="text-sm mb-1.5" style={{ color: "#374151" }}>Nội dung ticker</div>
                  <input
                    type="text"
                    value={data.tickerText ?? ""}
                    onChange={e => set("tickerText", e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border"
                    style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
                    placeholder="Nhập thông báo nội bộ..."
                  />
                </div>
                <ThemeColorRow label="Nền ticker" value={data.tickerBg ?? "#1E293B"} onChange={v => set("tickerBg", v)} />
                <ThemeColorRow label="Chữ ticker" value={data.tickerTextColor ?? "#F1F5F9"} onChange={v => set("tickerTextColor", v)} />
              </>
            )}
          </SectionCard>

          <SectionCard title="Header thương hiệu" icon={Palette}>
            <div className="py-2.5" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div className="text-sm mb-1.5" style={{ color: "#374151" }}>Tên công ty trên header</div>
              <input
                type="text"
                value={data.headerCompanyName ?? ""}
                onChange={e => set("headerCompanyName", e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
                placeholder="Mặc định: SmartFurni CRM"
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
              <div className="text-sm mb-1.5" style={{ color: "#374151" }}>URL ảnh nền header</div>
              <input
                type="text"
                value={data.headerBgImageUrl ?? ""}
                onChange={e => set("headerBgImageUrl", e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: "#e5e7eb", background: "#f9fafb", color: "#111827" }}
                placeholder="https://... (tùy chọn)"
              />
            </div>
            <div className="py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm" style={{ color: "#374151" }}>Opacity ảnh nền</span>
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
          <SectionCard title="Tự động refresh" icon={RefreshCw}>
            <div className="flex flex-wrap gap-2 mt-1">
              {([
                { value: 0,   label: "Tắt" },
                { value: 30,  label: "30 giây" },
                { value: 60,  label: "1 phút" },
                { value: 300, label: "5 phút" },
                { value: 900, label: "15 phút" },
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

          <SectionCard title="Hiệu ứng & Tương tác" icon={Palette}>
            <ToggleRow
              label="Bật animation"
              desc="Số đếm, biểu đồ grow-up, transition"
              value={data.animationsEnabled ?? true}
              onChange={v => set("animationsEnabled", v)}
            />
            <ToggleRow
              label="Keyboard shortcuts"
              desc="N: Thêm KH | D: Dashboard | K: Kanban | T: Tasks"
              value={data.keyboardShortcutsEnabled ?? true}
              onChange={v => set("keyboardShortcutsEnabled", v)}
            />
          </SectionCard>

          <SectionCard title="Presentation Mode" icon={Eye}>
            <ToggleRow
              label="Bật Presentation Mode"
              desc="Ẩn sidebar, phóng to số liệu — dùng khi báo cáo trên màn hình lớn"
              value={data.presentationMode ?? false}
              onChange={v => set("presentationMode", v)}
            />
            {data.presentationMode && (
              <div className="mt-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "rgba(201,168,76,0.1)", color: "#92400e", border: "1px solid rgba(201,168,76,0.3)" }}>
                Presentation Mode đang bật. Sidebar sẽ ẩn và số liệu sẽ được phóng to khi tải lại trang.
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
              onClick={() => saveSection(
                activeTab === "leadtypes" ? "leadTypes" :
                activeTab === "dashboardtheme" ? "dashboardTheme" :
                activeTab === "discount" ? "discountTiers" :
                activeTab as keyof CrmSettings
              )}
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
          {activeTab === "googlesheet" && <GoogleSheetClient />}
        </div>
      </div>
    </div>
  );
}
