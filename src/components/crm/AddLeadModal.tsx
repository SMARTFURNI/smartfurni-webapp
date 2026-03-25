"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { Lead, LeadType, LeadStage } from "@/lib/crm-store";
import { DISTRICTS, SOURCES, TYPE_LABELS, STAGE_LABELS } from "@/lib/crm-store";

interface Props {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
  defaultStage?: LeadStage;
}

export default function AddLeadModal({ onClose, onCreated, defaultStage = "new" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    type: "architect" as LeadType,
    stage: defaultStage,
    district: "",
    expectedValue: "",
    source: "Facebook Ads",
    assignedTo: "",
    projectName: "",
    projectAddress: "",
    unitCount: "",
    notes: "",
  });

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập tên khách hàng"); return; }
    if (!form.phone.trim()) { setError("Vui lòng nhập số điện thoại"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expectedValue: parseFloat(form.expectedValue) || 0,
          unitCount: parseInt(form.unitCount) || 0,
          tags: [],
          lastContactAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const lead = await res.json();
      onCreated(lead);
    } catch (err) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white rounded-t-2xl z-10"
          style={{ borderBottom: "1px solid #f3f4f6" }}>
          <h2 className="text-lg font-bold text-gray-900">Thêm khách hàng mới</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">{error}</div>
          )}

          {/* Name + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tên khách hàng *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Công ty / Dự án</label>
              <input value={form.company} onChange={e => set("company", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                placeholder="Công ty ABC" />
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Số điện thoại *</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                placeholder="0901234567" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                placeholder="email@example.com" />
            </div>
          </div>

          {/* Type + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phân loại</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white">
                <option value="architect">Kiến trúc sư</option>
                <option value="investor">Chủ đầu tư CHDV</option>
                <option value="dealer">Đại lý</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Giai đoạn</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white">
                {(["new","profile_sent","surveyed","quoted","negotiating","won","lost"] as LeadStage[]).map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* District + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Quận / Khu vực</label>
              <select value={form.district} onChange={e => set("district", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white">
                <option value="">Chọn quận</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nguồn khách</label>
              <select value={form.source} onChange={e => set("source", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Expected value + Unit count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Giá trị dự kiến (VND)</label>
              <input type="number" value={form.expectedValue} onChange={e => set("expectedValue", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                placeholder="50000000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Số căn / phòng</label>
              <input type="number" value={form.unitCount} onChange={e => set("unitCount", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                placeholder="10" />
            </div>
          </div>

          {/* Project + Assigned */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tên dự án</label>
              <input value={form.projectName} onChange={e => set("projectName", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                placeholder="Dự án ABC" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sales phụ trách</label>
              <input value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                placeholder="Tên sales" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none"
              placeholder="Ghi chú thêm..." />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors flex items-center justify-center gap-2"
              style={{ background: "#C9A84C" }}>
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Đang lưu..." : "Thêm khách hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
