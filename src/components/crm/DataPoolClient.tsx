"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Database, RefreshCw, Search, Filter, CheckCircle2, Clock,
  ArrowRight, Users, AlertCircle, ChevronLeft, ChevronRight,
  Facebook, Smartphone, Plus, X, UserCheck, Trash2, Eye, Copy, Check
} from "lucide-react";
import type { RawLead, RawLeadSource, RawLeadStatus } from "@/lib/crm-raw-lead-store";
import { SOURCE_LABELS, SOURCE_COLORS } from "@/lib/crm-raw-lead-store";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StaffMember {
  id: string;
  fullName: string;
  role: string;
}

interface Stats {
  pending: number;
  claimed: number;
  converted: number;
  total: number;
  bySource: { source: string; count: number }[];
}

interface Props {
  isAdmin: boolean;
  currentStaffId?: string;
  currentStaffName?: string;
  staffList?: StaffMember[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<RawLeadStatus, string> = {
  pending: "Chờ nhận",
  claimed: "Đã nhận",
  converted: "Đã chuyển",
};

const STATUS_COLORS: Record<RawLeadStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  claimed: { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  converted: { bg: "#EDE9FE", text: "#4C1D95", border: "#A78BFA" },
};

function SourceBadge({ source }: { source: RawLeadSource }) {
  const label = SOURCE_LABELS[source] || source;
  const color = SOURCE_COLORS[source] || "#6b7280";
  const isFb = source === "facebook_lead";
  const isTk = source === "tiktok_lead";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {isFb && <Facebook size={10} />}
      {isTk && <Smartphone size={10} />}
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: RawLeadStatus }) {
  const s = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {status === "pending" && <Clock size={10} />}
      {status === "claimed" && <CheckCircle2 size={10} />}
      {status === "converted" && <ArrowRight size={10} />}
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Source Option Card ───────────────────────────────────────────────────────
const SOURCE_OPTIONS: { value: RawLeadSource; label: string; desc: string; color: string; bg: string; border: string }[] = [
  {
    value: "facebook_lead",
    label: "Facebook Lead",
    desc: "Từ Facebook Lead Ads",
    color: "#1877F2",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    value: "tiktok_lead",
    label: "TikTok Lead",
    desc: "Từ TikTok Lead Gen",
    color: "#111827",
    bg: "#F9FAFB",
    border: "#E5E7EB",
  },
  {
    value: "manual",
    label: "Nhập tay",
    desc: "Data nhập trực tiếp",
    color: "#C9A84C",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    value: "other",
    label: "Khác",
    desc: "Nguồn khác",
    color: "#6B7280",
    bg: "#F9FAFB",
    border: "#E5E7EB",
  },
];

// ─── Add Raw Lead Modal (admin only) ─────────────────────────────────────────
function AddRawLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    source: "manual" as RawLeadSource,
    fullName: "", phone: "", email: "",
    adName: "", campaignName: "", message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Bắt buộc nhập tên";
    if (form.phone && !/^[0-9+\s()-]{8,15}$/.test(form.phone.trim())) e.phone = "Số điện thoại không hợp lệ";
    if (form.email && !/^[^@]+@[^@]+\.[^@]+$/.test(form.email.trim())) e.email = "Email không hợp lệ";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true); setSubmitError("");
    try {
      const res = await fetch("/api/crm/raw-leads", { credentials: 'include',
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: form.source,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          adName: form.adName.trim() || undefined,
          campaignName: form.campaignName.trim() || undefined,
          message: form.message.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setTimeout(() => { onAdded(); onClose(); }, 1200);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const selectedSource = SOURCE_OPTIONS.find(s => s.value === form.source)!;

  const Field = ({
    label, name, type = "text", placeholder, required, hint
  }: {
    label: string; name: keyof typeof form; type?: string;
    placeholder?: string; required?: boolean; hint?: string;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      <input
        type={type}
        value={form[name] as string}
        onChange={e => {
          setForm(f => ({ ...f, [name]: e.target.value }));
          if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
        }}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm text-gray-900 rounded-xl transition-all"
        style={{
          border: errors[name] ? "1.5px solid #EF4444" : "1.5px solid #E5E7EB",
          outline: "none",
          background: errors[name] ? "#FFF5F5" : "#FAFAFA",
          boxShadow: errors[name] ? "0 0 0 3px rgba(239,68,68,0.08)" : undefined,
        }}
        onFocus={e => { if (!errors[name]) e.target.style.border = "1.5px solid #C9A84C"; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)"; }}
        onBlur={e => { e.target.style.border = errors[name] ? "1.5px solid #EF4444" : "1.5px solid #E5E7EB"; e.target.style.boxShadow = ""; }}
      />
      {errors[name] && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={10} /> {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-xl flex flex-col"
        style={{
          borderRadius: "20px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            borderRadius: "20px 20px 0 0",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.3)" }}
            >
              <Database size={18} style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Thêm data thủ công</h3>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Nhập data khách hàng vào Data Pool</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1.5">
              {[1, 2].map(s => (
                <div key={s}
                  className="flex items-center justify-center text-[10px] font-bold transition-all"
                  style={{
                    width: step === s ? 24 : 20,
                    height: step === s ? 24 : 20,
                    borderRadius: "50%",
                    background: step >= s ? "#C9A84C" : "rgba(255,255,255,0.15)",
                    color: step >= s ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                >{s}</div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {success ? (
            // ── Success State ──
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "#D1FAE5" }}
              >
                <CheckCircle2 size={32} style={{ color: "#059669" }} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">Đã thêm thành công!</h4>
              <p className="text-sm text-gray-500">Data đã được thêm vào Data Pool và sẵn sàng để nhân viên nhận.</p>
            </div>
          ) : step === 1 ? (
            // ── Step 1: Chọn nguồn ──
            <div className="p-6">
              <div className="mb-5">
                <h4 className="text-sm font-bold text-gray-900 mb-1">Bước 1 — Chọn nguồn data</h4>
                <p className="text-xs text-gray-500">Data đến từ kênh nào? Thông tin này giúp phân tích hiệu quả từng kênh.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SOURCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, source: opt.value }))}
                    className="relative p-4 rounded-2xl text-left transition-all"
                    style={{
                      background: form.source === opt.value ? opt.bg : "#FAFAFA",
                      border: form.source === opt.value ? `2px solid ${opt.color}` : "2px solid #F3F4F6",
                      boxShadow: form.source === opt.value ? `0 4px 16px ${opt.color}20` : "none",
                    }}
                  >
                    {/* Source icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${opt.color}15`, border: `1px solid ${opt.color}25` }}
                    >
                      {opt.value === "facebook_lead" && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={opt.color}>
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )}
                      {opt.value === "tiktok_lead" && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={opt.color}>
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
                        </svg>
                      )}
                      {opt.value === "manual" && <Database size={20} style={{ color: opt.color }} />}
                      {opt.value === "other" && <Plus size={20} style={{ color: opt.color }} />}
                    </div>
                    <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    {/* Check */}
                    {form.source === opt.value && (
                      <div
                        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: opt.color }}
                      >
                        <Check size={11} color="#fff" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // ── Step 2: Nhập thông tin ──
            <div className="p-6 space-y-4">
              {/* Source recap */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: `${selectedSource.color}0D`, border: `1px solid ${selectedSource.color}25` }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${selectedSource.color}20` }}
                >
                  {selectedSource.value === "facebook_lead" && <Facebook size={14} style={{ color: selectedSource.color }} />}
                  {selectedSource.value === "tiktok_lead" && <Smartphone size={14} style={{ color: selectedSource.color }} />}
                  {selectedSource.value === "manual" && <Database size={14} style={{ color: selectedSource.color }} />}
                  {selectedSource.value === "other" && <Plus size={14} style={{ color: selectedSource.color }} />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: selectedSource.color }}>{selectedSource.label}</p>
                  <p className="text-[10px] text-gray-400">{selectedSource.desc}</p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-medium px-2 py-1 rounded-lg transition-colors"
                  style={{ color: selectedSource.color, background: `${selectedSource.color}15` }}
                >
                  Đổi
                </button>
              </div>

              <div className="mb-1">
                <h4 className="text-sm font-bold text-gray-900 mb-0.5">Bước 2 — Thông tin khách hàng</h4>
                <p className="text-xs text-gray-500">Điền thông tin liên hệ của khách hàng.</p>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                  <AlertCircle size={14} className="flex-shrink-0" /> {submitError}
                </div>
              )}

              {/* Thông tin cơ bản */}
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}
              >
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thông tin liên hệ</p>
                <Field label="Họ và tên" name="fullName" placeholder="VD: Nguyễn Văn A" required />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Số điện thoại" name="phone" placeholder="0912 345 678" hint="Không bắt buộc" />
                  <Field label="Email" name="email" type="email" placeholder="email@example.com" hint="Không bắt buộc" />
                </div>
              </div>

              {/* Thông tin quảng cáo */}
              <div
                className="p-4 rounded-2xl space-y-3"
                style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}
              >
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thông tin quảng cáo <span className="normal-case font-normal">(tuỳ chọn)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tên quảng cáo" name="adName" placeholder="VD: Ad_Gường_CT_HCM" />
                  <Field label="Chiến dịch" name="campaignName" placeholder="VD: Campaign_Q1_2026" />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Ghi chú</label>
                  <span className="text-[10px] text-gray-400">{form.message.length}/300</span>
                </div>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value.slice(0, 300) }))}
                  placeholder="Ghi chú thêm về khách hàng này..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm text-gray-900 rounded-xl resize-none transition-all"
                  style={{ border: "1.5px solid #E5E7EB", outline: "none", background: "#FAFAFA" }}
                  onFocus={e => { e.target.style.border = "1.5px solid #C9A84C"; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)"; }}
                  onBlur={e => { e.target.style.border = "1.5px solid #E5E7EB"; e.target.style.boxShadow = ""; }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!success && (
          <div
            className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid #F3F4F6", background: "#FAFAFA", borderRadius: "0 0 20px 20px" }}
          >
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
                >
                  Tiếp theo
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2.5 px-5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft size={14} /> Quay lại
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-all flex items-center justify-center gap-2"
                  style={{
                    background: loading ? "#9ca3af" : "linear-gradient(135deg, #C9A84C, #9A7A2E)",
                    boxShadow: loading ? "none" : "0 4px 14px rgba(201,168,76,0.35)",
                  }}
                >
                  {loading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Đang lưu...</>
                  ) : (
                    <><Database size={14} /> Thêm vào Data Pool</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Assign Modal (admin only) ────────────────────────────────────────────────
function AssignModal({
  lead, staffList, onClose, onAssigned
}: {
  lead: RawLead;
  staffList: StaffMember[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!selectedStaffId) { setError("Vui lòng chọn nhân viên"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/crm/raw-leads/assign", { credentials: 'include',
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, staffId: selectedStaffId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Có lỗi xảy ra");
      }
      onAssigned();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" style={{ border: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <h3 className="text-base font-bold text-gray-900">Phân data cho nhân viên</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Lead info */}
          <div className="p-3 rounded-xl" style={{ background: "#f8f9fb", border: "1px solid #e5e7eb" }}>
            <p className="font-semibold text-gray-900 text-sm">{lead.fullName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{lead.phone} {lead.email && `· ${lead.email}`}</p>
            <div className="mt-1.5"><SourceBadge source={lead.source} /></div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Chọn nhân viên *</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {staffList.map(s => (
                <label key={s.id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    border: selectedStaffId === s.id ? "2px solid #C9A84C" : "1px solid #e5e7eb",
                    background: selectedStaffId === s.id ? "rgba(201,168,76,0.06)" : "#fff",
                  }}>
                  <input type="radio" name="staff" value={s.id}
                    checked={selectedStaffId === s.id}
                    onChange={() => setSelectedStaffId(s.id)}
                    className="hidden" />
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}>
                    {s.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.fullName}</p>
                    <p className="text-xs text-gray-500">{s.role}</p>
                  </div>
                  {selectedStaffId === s.id && <Check size={16} className="ml-auto" style={{ color: "#C9A84C" }} />}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button onClick={submit} disabled={loading || !selectedStaffId}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-all"
              style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)", opacity: (loading || !selectedStaffId) ? 0.6 : 1 }}>
              {loading ? "Đang phân..." : "Phân data"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ lead, onClose }: { lead: RawLead; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" style={{ border: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <h3 className="text-base font-bold text-gray-900">Chi tiết data</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}>
              {lead.fullName.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">{lead.fullName}</h4>
              <div className="flex items-center gap-2 mt-1">
                <SourceBadge source={lead.source} />
                <StatusBadge status={lead.status} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {lead.phone && (
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fb", border: "1px solid #e5e7eb" }}>
                <p className="text-xs text-gray-500 mb-1">Số điện thoại</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{lead.phone}</p>
                  <button onClick={() => copy(lead.phone, "phone")} className="text-gray-400 hover:text-amber-600">
                    {copied === "phone" ? <Check size={12} style={{ color: "#22c55e" }} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            )}
            {lead.email && (
              <div className="p-3 rounded-xl" style={{ background: "#f8f9fb", border: "1px solid #e5e7eb" }}>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{lead.email}</p>
                  <button onClick={() => copy(lead.email, "email")} className="text-gray-400 hover:text-amber-600 flex-shrink-0">
                    {copied === "email" ? <Check size={12} style={{ color: "#22c55e" }} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {(lead.adName || lead.campaignName || lead.formName) && (
            <div className="p-3 rounded-xl space-y-2" style={{ background: "#f8f9fb", border: "1px solid #e5e7eb" }}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Thông tin quảng cáo</p>
              {lead.adName && <div className="flex justify-between text-sm"><span className="text-gray-500">Tên quảng cáo</span><span className="font-medium text-gray-900">{lead.adName}</span></div>}
              {lead.campaignName && <div className="flex justify-between text-sm"><span className="text-gray-500">Chiến dịch</span><span className="font-medium text-gray-900">{lead.campaignName}</span></div>}
              {lead.formName && <div className="flex justify-between text-sm"><span className="text-gray-500">Form</span><span className="font-medium text-gray-900">{lead.formName}</span></div>}
            </div>
          )}

          {lead.customerRole && (
            <div className="p-3 rounded-xl" style={{ background: "#f8f9fb", border: "1px solid #e5e7eb" }}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Vai trò / Nhu cầu chính</p>
              <p className="text-sm text-gray-700">{lead.customerRole}</p>
            </div>
          )}

          {lead.message && (
            <div className="p-3 rounded-xl" style={{ background: "#f8f9fb", border: "1px solid #e5e7eb" }}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ghi chú từ form</p>
              <p className="text-sm text-gray-700">{lead.message}</p>
            </div>
          )}

          {lead.status !== "pending" && (
            <div className="p-3 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Đã nhận bởi</p>
              <p className="text-sm font-semibold text-gray-900">{lead.claimedByName}</p>
              {lead.claimedAt && <p className="text-xs text-gray-500 mt-0.5">{formatDate(lead.claimedAt)}</p>}
            </div>
          )}

          <div className="flex justify-between text-xs text-gray-400 pt-2" style={{ borderTop: "1px solid #f3f4f6" }}>
            <span>Vào hệ thống: {formatDate(lead.createdAt)}</span>
            <span>ID: {lead.id.slice(0, 8)}...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DataPoolClient({ isAdmin, currentStaffId, currentStaffName, staffList = [] }: Props) {
  const [leads, setLeads] = useState<RawLead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<RawLeadStatus | "">("pending");
  const [sourceFilter, setSourceFilter] = useState<RawLeadSource | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [assignLead, setAssignLead] = useState<RawLead | null>(null);
  const [detailLead, setDetailLead] = useState<RawLead | null>(null);

  // Claim state
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      if (search) params.set("search", search);

      const [leadsRes, statsRes] = await Promise.all([
        fetch(`/api/crm/raw-leads?${params}`, { credentials: 'include' }),
        fetch("/api/crm/raw-leads/stats", { credentials: 'include' }),
      ]);

      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.items || []);
        setTotal(data.total || 0);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, sourceFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto refresh mỗi 30 giây
  useEffect(() => {
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleClaim = async (lead: RawLead) => {
    setClaimingId(lead.id);
    setClaimError(null);
    try {
      const res = await fetch("/api/crm/raw-leads/claim", { credentials: 'include',
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.error || "Có lỗi xảy ra");
        setTimeout(() => setClaimError(null), 5000);
      } else {
        // Hiển thị thông báo nếu tự động tạo lead thành công
        if (data.autoConverted && data.crmLead) {
          setClaimError(null);
          // Dùng claimError tạm để hiển thị success (màu xanh)
          setClaimingId("success:" + data.crmLead.id);
          setTimeout(() => setClaimingId(null), 3000);
        }
        fetchData(false);
        if (data.warning) {
          setClaimError(data.warning);
          setTimeout(() => setClaimError(null), 6000);
        }
      }
    } finally {
      // Chỉ reset nếu không phải success state
      setClaimingId(prev => prev?.startsWith("success:") ? prev : null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Tìm lead pending đầu tiên (FIFO - cái này mới được nhận tiếp theo)
  const nextFifoId = leads.find(l => l.status === "pending")?.id;

  return (
    <div className="h-full flex flex-col" style={{ background: "#f8f9fb", color: "#111827" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #C9A84C20, #C9A84C10)", border: "1px solid #C9A84C30" }}>
            <Database size={18} style={{ color: "#C9A84C" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Data Pool</h1>
            <p className="text-xs text-gray-500">Kho data tổng hợp từ các kênh quảng cáo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all"
              style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}
            >
              <Plus size={14} />
              Thêm data
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Chờ nhận", value: stats.pending, color: "#F59E0B", bg: "#FFFBEB", icon: Clock, filter: "pending" as RawLeadStatus },
              { label: "Đã nhận", value: stats.claimed, color: "#22C55E", bg: "#F0FDF4", icon: CheckCircle2, filter: "claimed" as RawLeadStatus },
              { label: "Đã chuyển KH", value: stats.converted, color: "#8B5CF6", bg: "#F5F3FF", icon: ArrowRight, filter: "converted" as RawLeadStatus },
              { label: "Tổng cộng", value: stats.total, color: "#3B82F6", bg: "#EFF6FF", icon: Database, filter: "" as "" },
            ].map(card => (
              <button
                key={card.label}
                onClick={() => { setStatusFilter(card.filter); setPage(1); }}
                className="p-4 rounded-2xl text-left transition-all hover:shadow-md"
                style={{
                  background: statusFilter === card.filter && card.filter !== "" ? card.bg : "#fff",
                  border: statusFilter === card.filter && card.filter !== "" ? `2px solid ${card.color}` : "1px solid #e5e7eb",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">{card.label}</span>
                  <card.icon size={16} style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
              </button>
            ))}
          </div>
        )}

        {/* Source breakdown */}
        {stats && stats.bySource.length > 0 && (
          <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid #e5e7eb" }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Data đang chờ theo kênh</p>
            <div className="flex flex-wrap gap-2">
              {stats.bySource.map(s => (
                <button
                  key={s.source}
                  onClick={() => { setSourceFilter(s.source as RawLeadSource); setPage(1); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: sourceFilter === s.source ? `${SOURCE_COLORS[s.source as RawLeadSource] || "#6b7280"}20` : "#f3f4f6",
                    color: SOURCE_COLORS[s.source as RawLeadSource] || "#6b7280",
                    border: `1px solid ${sourceFilter === s.source ? SOURCE_COLORS[s.source as RawLeadSource] || "#6b7280" : "#e5e7eb"}`,
                  }}
                >
                  {s.source === "facebook_lead" && <Facebook size={10} />}
                  {s.source === "tiktok_lead" && <Smartphone size={10} />}
                  {SOURCE_LABELS[s.source as RawLeadSource] || s.source}: {s.count}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FIFO Notice for staff */}
        {!isAdmin && (
          <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "#FFFBEB", border: "1px solid #FCD34D" }}>
            <AlertCircle size={16} style={{ color: "#D97706", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400E" }}>Quy tắc nhận data (FIFO)</p>
              <p className="text-xs mt-0.5" style={{ color: "#B45309" }}>
                Data vào trước sẽ được nhận trước. Bạn chỉ có thể nhận data theo thứ tự — không được bỏ qua data cũ hơn.
                Data được đánh dấu <strong>"Nhận tiếp theo"</strong> là data bạn có thể nhận ngay.
              </p>
            </div>
          </div>
        )}

        {/* Claim Error */}
        {claimError && (
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <AlertCircle size={16} style={{ color: "#DC2626", flexShrink: 0 }} />
            <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>{claimError}</p>
          </div>
        )}

        {/* Claim Success Toast */}
        {claimingId?.startsWith("success:") && (
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "#D1FAE5", border: "1px solid #6EE7B7" }}>
            <CheckCircle2 size={16} style={{ color: "#059669", flexShrink: 0 }} />
            <p className="text-sm font-semibold" style={{ color: "#065F46" }}>
              Đã nhận data thành công! Khách hàng đã được tạo tự động trong danh sách của bạn.
            </p>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid #e5e7eb" }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm theo tên, SĐT, email..."
                className="w-full pl-9 pr-4 py-2 text-sm text-gray-900 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as RawLeadStatus | ""); setPage(1); }}
                className="px-3 py-2 text-sm text-gray-900 rounded-xl border border-gray-200 focus:outline-none bg-white"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="pending">Chờ nhận</option>
                <option value="claimed">Đã nhận</option>
                <option value="converted">Đã chuyển KH</option>
              </select>
              <select
                value={sourceFilter}
                onChange={e => { setSourceFilter(e.target.value as RawLeadSource | ""); setPage(1); }}
                className="px-3 py-2 text-sm text-gray-900 rounded-xl border border-gray-200 focus:outline-none bg-white"
              >
                <option value="">Tất cả kênh</option>
                <option value="facebook_lead">Facebook Lead</option>
                <option value="tiktok_lead">TikTok Lead</option>
                <option value="manual">Nhập tay</option>
              </select>
              {(statusFilter || sourceFilter || search) && (
                <button
                  onClick={() => { setStatusFilter(""); setSourceFilter(""); setSearch(""); setPage(1); }}
                  className="px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data List */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          {/* Table header */}
          <div className="hidden sm:grid gap-4 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6", gridTemplateColumns: "0.8fr 1.8fr 1.2fr 1.5fr 1.2fr 1.2fr 1.5fr 0.8fr" }}>
            <div>#</div>
            <div>Khách hàng</div>
            <div>Liên hệ</div>
            <div>Kênh / Chiến dịch</div>
            <div>Vai trò / Nhu cầu</div>
            <div>Trạng thái</div>
            <div>Nhân viên / Thời gian</div>
            <div className="text-right">Thao tác</div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500">Đang tải data...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center">
              <Database size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">Chưa có data nào</p>
              <p className="text-xs text-gray-400 mt-1">Data sẽ tự động đổ về khi có lead từ Facebook / TikTok</p>
            </div>
          ) : (
            <div>
              {leads.map((lead, idx) => {
                const isNextFifo = lead.id === nextFifoId && lead.status === "pending";
                const rowNum = (page - 1) * PAGE_SIZE + idx + 1;

                return (
                  <div
                    key={lead.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center transition-colors hover:bg-gray-50"
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: isNextFifo ? "rgba(201,168,76,0.04)" : undefined,
                    }}
                  >
                    {/* # */}
                    <div>
                      <span className="text-xs text-gray-400 font-mono">{rowNum}</span>
                      {isNextFifo && !isAdmin && (
                        <div className="mt-1">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: "#C9A84C", color: "#fff", fontSize: 9 }}>
                            TIẾP THEO
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Khách hàng */}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{lead.fullName}</p>
                      <div className="mt-0.5"><SourceBadge source={lead.source} /></div>
                    </div>

                    {/* Liên hệ */}
                    <div>
                      {lead.phone && <p className="text-sm text-gray-700 font-medium">{lead.phone}</p>}
                      {lead.email && <p className="text-xs text-gray-400 truncate">{lead.email}</p>}
                    </div>

                    {/* Kênh / Chiến dịch */}
                    <div>
                      {lead.campaignName && <p className="text-xs text-gray-600 truncate font-medium">{lead.campaignName}</p>}
                      {lead.adName && <p className="text-xs text-gray-400 truncate">{lead.adName}</p>}
                      {!lead.campaignName && !lead.adName && <p className="text-xs text-gray-300">—</p>}
                    </div>

                    {/* Vai trò / Nhu cầu */}
                    <div>
                      {lead.customerRole ? (
                        <p className="text-xs text-gray-700 truncate font-medium">{lead.customerRole}</p>
                      ) : (
                        <p className="text-xs text-gray-300">—</p>
                      )}
                    </div>

                    {/* Trạng thái */}
                    <div>
                      <StatusBadge status={lead.status} />
                    </div>

                    {/* Nhân viên / Thời gian */}
                    <div>
                      {lead.claimedByName ? (
                        <p className="text-xs font-semibold text-gray-700">{lead.claimedByName}</p>
                      ) : (
                        <p className="text-xs text-gray-300">Chưa nhận</p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(lead.createdAt)}</p>
                    </div>

                    {/* Thao tác */}
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDetailLead(lead)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={13} />
                      </button>

                      {/* Nhân viên: nút nhận data (chỉ pending, và phải là FIFO tiếp theo) */}
                      {!isAdmin && lead.status === "pending" && (
                        <button
                          onClick={() => handleClaim(lead)}
                          disabled={claimingId === lead.id || !isNextFifo}
                          title={!isNextFifo ? "Phải nhận data theo thứ tự" : "Nhận data này"}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: isNextFifo ? "linear-gradient(135deg, #C9A84C, #9A7A2E)" : "#f3f4f6",
                            color: isNextFifo ? "#fff" : "#9ca3af",
                            cursor: isNextFifo ? "pointer" : "not-allowed",
                            opacity: claimingId === lead.id ? 0.7 : 1,
                          }}
                        >
                          {claimingId === lead.id ? (
                            <RefreshCw size={10} className="animate-spin" />
                          ) : (
                            <UserCheck size={10} />
                          )}
                          {isNextFifo ? "Nhận" : "Chờ"}
                        </button>
                      )}

                      {/* Admin: nút phân data */}
                      {isAdmin && lead.status === "pending" && (
                        <button
                          onClick={() => setAssignLead(lead)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)", color: "#fff" }}
                          title="Phân data cho nhân viên"
                        >
                          <Users size={10} />
                          Phân
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid #f3f4f6" }}>
              <p className="text-xs text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} data
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-600 px-2">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <AddRawLeadModal onClose={() => setShowAdd(false)} onAdded={() => fetchData(false)} />
      )}
      {assignLead && (
        <AssignModal
          lead={assignLead}
          staffList={staffList}
          onClose={() => setAssignLead(null)}
          onAssigned={() => { fetchData(false); setAssignLead(null); }}
        />
      )}
      {detailLead && (
        <DetailModal lead={detailLead} onClose={() => setDetailLead(null)} />
      )}
    </div>
  );
}
