"use client";

import { useState, useEffect } from "react";
import { X, Loader2, User, Building2, Phone, Mail, MapPin, DollarSign, Tag, FileText, Users } from "lucide-react";
import type { Lead, LeadType, LeadStage } from "@/lib/crm-types";
import { SOURCES, STAGE_LABELS } from "@/lib/crm-types";
import { VIETNAM_PROVINCES, getDistricts } from "@/lib/crm-locations";

interface Props {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
  defaultStage?: LeadStage;
  currentUserName?: string;
  isAdmin?: boolean;
}

// Dark luxury palette (same as LeadDetailClient)
const DL = {
  modalBg: "rgba(20,16,0,0.97)",
  surface: "rgba(255,255,255,0.05)",
  surfaceHover: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.10)",
  borderGold: "rgba(245,158,11,0.35)",
  text: "#f5edd6",
  textMuted: "#9ca3af",
  textDim: "rgba(245,237,214,0.5)",
  gold: "#C9A84C",
  goldDark: "#a8893d",
  inputBg: "rgba(255,255,255,0.07)",
  inputBorder: "rgba(255,255,255,0.15)",
  tabBorder: "rgba(255,255,255,0.08)",
};

const DEFAULT_TYPE_CONFIG: { id: string; label: string; color: string; bg: string }[] = [
  { id: "architect", label: "KTS/Thiết kế nội thất", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { id: "investor",  label: "Chủ đầu tư Homestay/CHDV/Studio", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  { id: "dealer",    label: "Đại lý/nhà phân phối", color: "#C9A84C", bg: "rgba(201,168,76,0.12)" },
  { id: "retail",    label: "Khách Lẻ", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  { id: "investor2", label: "Chủ đầu tư Nhà Trọ", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
];

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
    type: "architect" as LeadType,
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
  });

  const districts = getDistricts(form.province);

  function set(key: string, value: string) {
    if (key === "province") {
      setForm(prev => ({ ...prev, province: value, district: "" }));
    } else {
      setForm(prev => ({ ...prev, [key]: value }));
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: DL.modalBg,
          border: `1px solid ${DL.border}`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{
            borderBottom: `1px solid ${DL.border}`,
            background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(255,255,255,0.02))",
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
              <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>{error}</div>
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
            className="px-6 py-4 flex gap-3"
            style={{ borderTop: `1px solid ${DL.border}`, background: "rgba(0,0,0,0.2)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all"
              style={{ border: `1px solid ${DL.border}`, color: DL.textMuted, background: DL.surface }}
              onMouseEnter={e => (e.currentTarget.style.background = DL.surfaceHover)}
              onMouseLeave={e => (e.currentTarget.style.background = DL.surface)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${DL.gold}, ${DL.goldDark})`, color: "#1a1200" }}
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
