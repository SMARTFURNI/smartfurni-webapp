"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PhoneCall, Save, ShieldCheck } from "lucide-react";
import {
  DEFAULT_NEW_LEAD_CALL_POLICY,
  type NewLeadCallPolicy,
} from "@/lib/crm-new-lead-call-types";

const numberFields: Array<{ key: keyof NewLeadCallPolicy; label: string; suffix: string; min: number; max: number }> = [
  { key: "startHour", label: "Bắt đầu gọi", suffix: "giờ", min: 0, max: 23 },
  { key: "endHour", label: "Kết thúc gọi", suffix: "giờ", min: 0, max: 23 },
  { key: "callsPerDay", label: "Số lần hiển thị mỗi ngày", suffix: "lần", min: 1, max: 6 },
  { key: "intervalHours", label: "Khoảng cách giữa hai lần", suffix: "giờ", min: 1, max: 8 },
  { key: "maxDays", label: "Số ngày duy trì", suffix: "ngày", min: 1, max: 14 },
  { key: "unlockMinAttempts", label: "Tổng lần gọi để mở khóa", suffix: "lần", min: 1, max: 30 },
  { key: "unlockMinAttemptsPerDay", label: "Tối thiểu mỗi ngày", suffix: "lần", min: 1, max: 6 },
  { key: "popupIntervalMinutes", label: "Chu kỳ popup nhân viên", suffix: "phút", min: 15, max: 240 },
  { key: "minAnsweredSeconds", label: "Thời lượng kết nối tối thiểu", suffix: "giây", min: 0, max: 60 },
];

export default function NewLeadCallPolicySettings() {
  const [policy, setPolicy] = useState<NewLeadCallPolicy>(DEFAULT_NEW_LEAD_CALL_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/crm/new-lead-calls/settings", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Không tải được cấu hình");
        return response.json();
      })
      .then(setPolicy)
      .catch(error => setMessage(error instanceof Error ? error.message : "Không tải được cấu hình"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/crm/new-lead-calls/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không lưu được cấu hình");
      setPolicy(payload);
      setMessage("Đã lưu và áp dụng cấu hình chuỗi gọi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được cấu hình");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Đang tải cấu hình...</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white"><PhoneCall size={21} /></div>
            <div>
              <h2 className="font-black text-slate-900">Chuỗi gọi khách hàng mới</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">Lập phiếu gọi lại tự động, khóa đổi giai đoạn và chỉ công nhận kết quả cuộc gọi từ tổng đài ITY đã liên kết.</p>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={policy.enabled} onChange={event => setPolicy(current => ({ ...current, enabled: event.target.checked }))} className="h-5 w-5 accent-blue-600" />
            {policy.enabled ? "Đang áp dụng" : "Đang tắt"}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {numberFields.map(field => (
          <label key={field.key} className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block text-xs font-bold text-slate-600">{field.label}</span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={field.min}
                max={field.max}
                value={Number(policy[field.key])}
                onChange={event => setPolicy(current => ({ ...current, [field.key]: Number(event.target.value) }))}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-500">{field.suffix}</span>
            </div>
          </label>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <div className="flex items-center gap-2 font-black"><ShieldCheck size={18} /> Quy tắc áp dụng cho nhân viên</div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5">
          <li>Cuộc gọi ITY kết nối từ {policy.minAnsweredSeconds} giây sẽ tự chuyển khách sang “Đã báo giá”.</li>
          <li>Nếu chưa kết nối, nhân viên chỉ được đổi giai đoạn sau {policy.maxDays} ngày, đủ {policy.unlockMinAttempts} lần và tối thiểu {policy.unlockMinAttemptsPerDay} lần/ngày.</li>
          <li>Admin luôn có quyền xử lý ngoại lệ; nhân viên không nhìn thấy trang cấu hình này.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {message && <span className={`mr-auto flex items-center gap-1.5 text-sm ${message.startsWith("Đã lưu") ? "text-emerald-700" : "text-red-600"}`}><CheckCircle2 size={16} /> {message}</span>}
        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60">
          {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} Lưu cấu hình
        </button>
      </div>
    </div>
  );
}
