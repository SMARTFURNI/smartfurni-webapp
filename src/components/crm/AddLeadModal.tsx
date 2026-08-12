"use client";

import { useState, useEffect } from "react";
import { X, Loader2, User, Building2, Phone, Mail, MapPin, DollarSign, Tag, FileText, Users } from "lucide-react";
import type { Lead, LeadType, LeadStage, InterestedProduct } from "@/lib/crm-types";
import { SOURCES, STAGE_LABELS } from "@/lib/crm-types";
import { VIETNAM_PROVINCES, getDistricts } from "@/lib/crm-locations";
import customerStyles from "./CustomerWorkspace.module.css";
import { CRM_LEAD_TYPE_OPTIONS, CRM_PRODUCT_OPTIONS } from "@/lib/crm-taxonomy";

interface Props {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
  defaultStage?: LeadStage;
  currentUserName?: string;
  isAdmin?: boolean;
}

// Light Zalo OA palette (same as customer workspace)
const DL = {
  modalBg: "#ffffff",
  surface: "#f8fafc",
  surfaceHover: "#eef3f8",
  border: "#dbe3ee",
  borderGold: "rgba(212,175,69,0.42)",
  text: "#172033",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  gold: "#d4af45",
  goldDark: "#b98720",
  inputBg: "#f8fafc",
  inputBorder: "#cbd5e1",
  tabBorder: "#dbe3ee",
};

const DEFAULT_TYPE_CONFIG = CRM_LEAD_TYPE_OPTIONS.map(item => ({
  ...item,
  bg: `${item.color}20`,
}));

export default function AddLeadModal({ onClose, onCreated, defaultStage = "new", currentUserName = "", isAdmin = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"basic" | "project" | "notes">("basic");
  const [typeConfig, setTypeConfig] = useState<{ id: string; label: string; color: string; bg: string }[]>(DEFAULT_TYPE_CONFIG);
  useEffect(() => {
    fetch("/api/crm/settings/lead-types")
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; label: string; color: string }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setTypeConfig(data.map(lt => ({
            id: lt.id,
            label: lt.label,
            color: lt.color || "#6b7280",
            bg: lt.color ? lt.color + "20" : "rgba(107,114,128,0.12)",
          })));
        }
      })
      .catch(() => {});
  }, []);
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    type: "retail" as LeadType,
    stage: defaultStage,
    province: "TP. Hồ Chí Minh",
    district: "",
    expectedValue: "",
    source: "Facebook Ads",
    assignedTo: currentUserName,
    projectName: "",
    projectAddress: "",
    unitCount: "",
    notes: "",
    interestedProducts: [] as InterestedProduct[],
  });

  const districts = getDistricts(form.province);

  function set(key: string, value: string) {
    if (key === "province") {
      setForm(prev => ({ ...prev, province: value, district: "" }));
    } else {
      setForm(prev => ({ ...prev, [key]: value }));
    }
  }

  function toggleProduct(product: InterestedProduct) {
    setForm(prev => ({
      ...prev,
      interestedProducts: prev.interestedProducts.includes(product)
        ? prev.interestedProducts.filter(item => item !== product)
        : [...prev.interestedProducts, product],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập tên khách hàng"); return; }
    if (!form.phone.trim()) { setError("Vui lòng nhập số điện thoại"); return; }

    setLoading(true);
    setError("");
    try {
      const locationLabel = form.district
        ? `${form.district}, ${form.province}`
        : form.province;

      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          district: locationLabel,
          expectedValue: parseFloat(form.expectedValue) || 0,
          unitCount: parseInt(form.unitCount) || 0,
          tags: [],
          lastContactAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const lead = await res.json();
      onCreated(lead);
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: "basic" as const, label: "Thông tin cơ bản" },
    { id: "project" as const, label: "Thông tin dự án" },
    { id: "notes" as const, label: "Ghi chú" },
  ];

  const inputStyle: React.CSSProperties = {
    background: DL.inputBg,
    border: `1px solid ${DL.inputBorder}`,
    color: DL.text,
  };

  return (
    <div
      className={`${customerStyles.modalBackdrop} fixed inset-0 z-50 flex items-center justify-center p-4`}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`${customerStyles.modalPanel} ${customerStyles.workspace} w-full max-w-xl rounded-2xl overflow-hidden`}
        style={{
          background: DL.modalBg,
          border: `1px solid ${DL.border}`,
          boxShadow: "0 30px 80px rgba(15,23,42,0.24)",
        }}
      >
        {/* Header */}
        <div
          className={`${customerStyles.modalHeader} flex items-center justify-between px-6 py-4 sticky top-0 z-10`}
          style={{
            borderBottom: `1px solid ${DL.border}`,
            background: "linear-gradient(135deg, #ffffff, #fffdf7)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.15)", border: `1px solid rgba(201,168,76,0.25)` }}
            >
              <Users size={18} style={{ color: DL.gold }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: DL.text }}>Thêm khách hàng mới</h2>
              <p className="text-[11px]" style={{ color: DL.textMuted }}>Điền thông tin khách hàng B2B</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: DL.surface, color: DL.textMuted }}
            onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
            onMouseLeave={e => (e.currentTarget.style.background = DL.surface)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Lead Type Selector */}
        <div className="px-6 pt-4 flex flex-wrap gap-2">
          {typeConfig.map(cfg => {
            const active = form.type === cfg.id;
            return (
              <button
                key={cfg.id}
                type="button"
                onClick={() => set("type", cfg.id)}
                className="flex-1 min-w-[80px] py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: active ? cfg.bg : DL.surface,
                  color: active ? cfg.color : DL.textMuted,
                  border: `1px solid ${active ? cfg.color + "40" : DL.border}`,
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-0" style={{ borderBottom: `1px solid ${DL.tabBorder}` }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 text-xs font-semibold transition-all relative"
              style={{ color: activeTab === tab.id ? DL.gold : DL.textMuted }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: DL.gold }} />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl text-sm" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#dc2626" }}>{error}</div>
            )}

            {/* Tab: Basic */}
            {activeTab === "basic" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <DLField label="Tên khách hàng *" icon={<User size={13} />}>
                    <DLInput value={form.name} onChange={v => set("name", v)} placeholder="Nguyễn Văn A" inputStyle={inputStyle} />
                  </DLField>
                  <DLField label="Công ty / Tổ chức" icon={<Building2 size={13} />}>
                    <DLInput value={form.company} onChange={v => set("company", v)} placeholder="Công ty ABC" inputStyle={inputStyle} />
                  </DLField>
                </div>

                <DLField label="Sản phẩm quan tâm" icon={<Tag size={13} />}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {CRM_PRODUCT_OPTIONS.map(product => {
                      const active = form.interestedProducts.includes(product.id);
                      return (
                        <button key={product.id} type="button" onClick={() => toggleProduct(product.id)}
                          className="rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all"
                          style={{ background: active ? `${product.color}16` : DL.surface, border: `1px solid ${active ? product.color : DL.border}`, color: active ? product.color : DL.textMuted }}>
                          {active ? "✓ " : ""}{product.label}
                        </button>
                      );
                    })}
                  </div>
                </DLField>

                <div className="grid grid-cols-2 gap-3">
                  <DLField label="Số điện thoại *" icon={<Phone size={13} />}>
                    <DLInput value={form.phone} onChange={v => set("phone", v)} placeholder="0901234567" inputStyle={inputStyle} />
                  </DLField>
                  <DLField label="Email" icon={<Mail size={13} />}>
                    <DLInput value={form.email} onChange={v => set("email", v)} placeholder="email@example.com" type="email" inputStyle={inputStyle} />
                  </DLField>
                </div>

                <DLField label="Tỉnh / Thành phố *" icon={<MapPin size={13} />}>
                  <DLSelect value={form.province} onChange={v => set("province", v)} inputStyle={inputStyle}>
                    {VIETNAM_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </DLSelect>
                </DLField>

                {districts.length > 0 && (
                  <DLField label="Quận / Huyện" icon={<MapPin size={13} />}>
                    <DLSelect value={form.district} onChange={v => set("district", v)} inputStyle={inputStyle}>
                      <option value="">Chọn quận/huyện</option>
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </DLSelect>
                  </DLField>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <DLField label="Giai đoạn" icon={<Tag size={13} />}>
                    <DLSelect value={form.stage} onChange={v => set("stage", v)} inputStyle={inputStyle}>
                      {(["new","profile_sent","surveyed","quoted","negotiating","won","lost"] as LeadStage[]).map(s => (
                        <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                      ))}
                    </DLSelect>
                  </DLField>
                  <DLField label="Nguồn khách" icon={<Tag size={13} />}>
                    <DLSelect value={form.source} onChange={v => set("source", v)} inputStyle={inputStyle}>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </DLSelect>
                  </DLField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DLField label="Giá trị dự kiến (VND)" icon={<DollarSign size={13} />}>
                    <DLInput value={form.expectedValue} onChange={v => set("expectedValue", v)} placeholder="50,000,000" type="number" inputStyle={inputStyle} />
                  </DLField>
                  <DLField label="Sales phụ trách" icon={<User size={13} />}>
                    <DLInput
                      value={form.assignedTo}
                      onChange={v => isAdmin ? set("assignedTo", v) : undefined}
                      placeholder="Tên sales"
                      inputStyle={!isAdmin
                        ? { ...inputStyle, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", fontWeight: 600 }
                        : inputStyle}
                    />
                  </DLField>
                </div>
              </>
            )}

            {/* Tab: Project */}
            {activeTab === "project" && (
              <>
                <DLField label="Tên dự án" icon={<Building2 size={13} />}>
                  <DLInput value={form.projectName} onChange={v => set("projectName", v)} placeholder="Dự án Vinhomes Central Park" inputStyle={inputStyle} />
                </DLField>
                <DLField label="Địa chỉ dự án" icon={<MapPin size={13} />}>
                  <DLInput value={form.projectAddress} onChange={v => set("projectAddress", v)} placeholder="208 Nguyễn Hữu Cảnh, Bình Thạnh" inputStyle={inputStyle} />
                </DLField>
                <DLField label="Số căn / phòng dự kiến" icon={<Building2 size={13} />}>
                  <DLInput value={form.unitCount} onChange={v => set("unitCount", v)} placeholder="10" type="number" inputStyle={inputStyle} />
                </DLField>
              </>
            )}

            {/* Tab: Notes */}
            {activeTab === "notes" && (
              <DLField label="Ghi chú" icon={<FileText size={13} />}>
                <textarea
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  rows={6}
                  placeholder="Ghi chú về khách hàng, yêu cầu đặc biệt, lịch hẹn..."
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none resize-none transition-all"
                  style={{ ...inputStyle }}
                />
              </DLField>
            )}
          </div>

          {/* Footer */}
          <div
            className={`${customerStyles.modalFooter} px-6 py-4 flex gap-3`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`${customerStyles.secondaryButton} flex-1 py-2.5 text-sm font-medium rounded-xl transition-all`}
              style={{ border: `1px solid ${DL.border}`, color: DL.textMuted, background: DL.surface }}
              onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
              onMouseLeave={e => (e.currentTarget.style.background = DL.surface)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`${customerStyles.primaryButton} flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2`}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Đang lưu..." : "Thêm khách hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────────────
function DLField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold mb-1.5" style={{ color: DL.textMuted }}>
        {icon && <span style={{ color: DL.textMuted }}>{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function DLInput({ value, onChange, placeholder, type = "text", inputStyle }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputStyle?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none transition-all"
      style={inputStyle}
    />
  );
}

function DLSelect({ value, onChange, children, inputStyle }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; inputStyle?: React.CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none transition-all"
      style={inputStyle}
    >
      {children}
    </select>
  );
}
