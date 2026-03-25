"use client";

import { useState } from "react";
import { X, Loader2, User, Building2, Phone, Mail, MapPin, DollarSign, Tag, FileText, Users } from "lucide-react";
import type { Lead, LeadType, LeadStage } from "@/lib/crm-store";
import { SOURCES, TYPE_LABELS, STAGE_LABELS } from "@/lib/crm-store";
import { VIETNAM_PROVINCES, getDistricts } from "@/lib/crm-locations";

interface Props {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
  defaultStage?: LeadStage;
}

const TYPE_CONFIG: Record<LeadType, { label: string; color: string; bg: string }> = {
  architect:  { label: "Kiến trúc sư",    color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  investor:   { label: "Chủ đầu tư CHDV", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  dealer:     { label: "Đại lý",           color: "#C9A84C", bg: "rgba(201,168,76,0.12)" },
};

export default function AddLeadModal({ onClose, onCreated, defaultStage = "new" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"basic" | "project" | "notes">("basic");
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
    assignedTo: "",
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: "#161820",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.15)" }}
            >
              <Users size={18} style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Thêm khách hàng mới</h2>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Điền thông tin khách hàng B2B</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Lead Type Selector */}
        <div className="px-6 pt-4 flex gap-2">
          {(Object.keys(TYPE_CONFIG) as LeadType[]).map(type => {
            const cfg = TYPE_CONFIG[type];
            const active = form.type === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => set("type", type)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: active ? cfg.bg : "rgba(255,255,255,0.04)",
                  color: active ? cfg.color : "rgba(255,255,255,0.35)",
                  border: `1px solid ${active ? cfg.color + "40" : "rgba(255,255,255,0.07)"}`,
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 text-xs font-semibold transition-all relative"
              style={{ color: activeTab === tab.id ? "#C9A84C" : "rgba(255,255,255,0.35)" }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#C9A84C" }} />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl text-sm text-red-400 bg-red-500/10 border border-red-500/20">{error}</div>
            )}

            {/* Tab: Basic */}
            {activeTab === "basic" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <DarkField label="Tên khách hàng *" icon={<User size={13} />}>
                    <DarkInput value={form.name} onChange={v => set("name", v)} placeholder="Nguyễn Văn A" />
                  </DarkField>
                  <DarkField label="Công ty / Tổ chức" icon={<Building2 size={13} />}>
                    <DarkInput value={form.company} onChange={v => set("company", v)} placeholder="Công ty ABC" />
                  </DarkField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DarkField label="Số điện thoại *" icon={<Phone size={13} />}>
                    <DarkInput value={form.phone} onChange={v => set("phone", v)} placeholder="0901234567" />
                  </DarkField>
                  <DarkField label="Email" icon={<Mail size={13} />}>
                    <DarkInput value={form.email} onChange={v => set("email", v)} placeholder="email@example.com" type="email" />
                  </DarkField>
                </div>

                {/* Province + District */}
                <DarkField label="Tỉnh / Thành phố *" icon={<MapPin size={13} />}>
                  <DarkSelect value={form.province} onChange={v => set("province", v)}>
                    {VIETNAM_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </DarkSelect>
                </DarkField>

                {districts.length > 0 && (
                  <DarkField label="Quận / Huyện" icon={<MapPin size={13} />}>
                    <DarkSelect value={form.district} onChange={v => set("district", v)}>
                      <option value="">Chọn quận/huyện</option>
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </DarkSelect>
                  </DarkField>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <DarkField label="Giai đoạn" icon={<Tag size={13} />}>
                    <DarkSelect value={form.stage} onChange={v => set("stage", v)}>
                      {(["new","profile_sent","surveyed","quoted","negotiating","won","lost"] as LeadStage[]).map(s => (
                        <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                      ))}
                    </DarkSelect>
                  </DarkField>
                  <DarkField label="Nguồn khách" icon={<Tag size={13} />}>
                    <DarkSelect value={form.source} onChange={v => set("source", v)}>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </DarkSelect>
                  </DarkField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DarkField label="Giá trị dự kiến (VND)" icon={<DollarSign size={13} />}>
                    <DarkInput value={form.expectedValue} onChange={v => set("expectedValue", v)} placeholder="50,000,000" type="number" />
                  </DarkField>
                  <DarkField label="Sales phụ trách" icon={<User size={13} />}>
                    <DarkInput value={form.assignedTo} onChange={v => set("assignedTo", v)} placeholder="Tên sales" />
                  </DarkField>
                </div>
              </>
            )}

            {/* Tab: Project */}
            {activeTab === "project" && (
              <>
                <DarkField label="Tên dự án" icon={<Building2 size={13} />}>
                  <DarkInput value={form.projectName} onChange={v => set("projectName", v)} placeholder="Dự án Vinhomes Central Park" />
                </DarkField>
                <DarkField label="Địa chỉ dự án" icon={<MapPin size={13} />}>
                  <DarkInput value={form.projectAddress} onChange={v => set("projectAddress", v)} placeholder="208 Nguyễn Hữu Cảnh, Bình Thạnh" />
                </DarkField>
                <DarkField label="Số căn / phòng dự kiến" icon={<Building2 size={13} />}>
                  <DarkInput value={form.unitCount} onChange={v => set("unitCount", v)} placeholder="50" type="number" />
                </DarkField>
              </>
            )}

            {/* Tab: Notes */}
            {activeTab === "notes" && (
              <DarkField label="Ghi chú" icon={<FileText size={13} />}>
                <textarea
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  rows={6}
                  placeholder="Ghi chú về khách hàng, yêu cầu đặc biệt, lịch hẹn..."
                  className="w-full px-3 py-2.5 text-sm rounded-xl text-white placeholder-white/20 focus:outline-none resize-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </DarkField>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 flex gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-bold rounded-xl text-black transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)" }}
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
function DarkField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
        {icon && <span style={{ color: "rgba(255,255,255,0.25)" }}>{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

function DarkInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-xl text-white placeholder-white/20 focus:outline-none transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
    />
  );
}

function DarkSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-xl text-white focus:outline-none transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {children}
    </select>
  );
}
