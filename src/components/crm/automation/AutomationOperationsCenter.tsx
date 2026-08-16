"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, History, Loader2, Mail, MessageCircle, RefreshCw, RotateCcw, Save, Send, ShieldCheck } from "lucide-react";
import type { AutomationContactPolicy } from "@/lib/crm-automation-store";
import type { AutomationConfigVersion } from "@/lib/crm-automation-governance";

interface OperationsData {
  ready: boolean;
  scheduler: { lastRunAt: string | null; lastRunAgeMinutes: number | null; isRunning: boolean; configured: boolean; stale: boolean };
  queues: Array<{ channel: "email" | "zalo_personal"; pending: number; processing: number; failed: number; sent24h: number; oldestPendingAt: string | null }>;
  recent: Array<{ id: string; ruleName: string; channel: string; leadName?: string; message: string; status: string; error?: string; sentAt: string }>;
  policy: AutomationContactPolicy;
  zaloAccounts: Array<{ id: string; displayName: string; label: string; isActive: boolean; lastConnected: string | null }>;
  alerts: Array<{ severity: string; code: string; message: string }>;
}

const scopeLabels: Record<string, string> = {
  rules: "Quy tắc tự động", sla: "SLA", auto_assign: "Phân công", contact_policy: "Chính sách liên hệ",
  b2b_sofa: "B2B Sofa 90 ngày", b2c_ergonomic: "Khách lẻ Giường 90 ngày",
};

function dateLabel(value: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function AutomationOperationsCenter() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [policy, setPolicy] = useState<AutomationContactPolicy | null>(null);
  const [versions, setVersions] = useState<AutomationConfigVersion[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy("load"); setError("");
    try {
      const [operationsResponse, versionsResponse] = await Promise.all([
        fetch("/api/crm/automation/operations", { cache: "no-store" }),
        fetch("/api/crm/automation/versions", { cache: "no-store" }),
      ]);
      const operations = await operationsResponse.json();
      const history = await versionsResponse.json();
      if (!operationsResponse.ok) throw new Error(operations.error || "Không tải được vận hành automation.");
      setData(operations); setPolicy(operations.policy); setVersions(history.versions || []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Không tải được dữ liệu."); }
    finally { setBusy(""); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const savePolicy = async () => {
    if (!policy) return;
    setBusy("policy"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/crm/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "contact_policy", data: policy, note: "Cập nhật chính sách liên hệ toàn hệ thống" }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không lưu được chính sách.");
      setMessage(`Đã lưu chính sách liên hệ · phiên bản ${payload.version?.version || "mới"}.`); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không lưu được chính sách."); }
    finally { setBusy(""); }
  };

  const retry = async (channel: "email" | "zalo_personal") => {
    if (!window.confirm(`Đưa toàn bộ công việc ${channel === "email" ? "Email" : "Zalo"} đang lỗi trở lại hàng đợi?`)) return;
    setBusy(channel); setError("");
    try {
      const response = await fetch("/api/crm/automation/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retry_failed", channel }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể thử lại.");
      setMessage(`Đã đưa ${payload.retried} công việc trở lại hàng đợi.`); await load();
    } catch (retryError) { setError(retryError instanceof Error ? retryError.message : "Không thể thử lại."); }
    finally { setBusy(""); }
  };

  const restore = async (version: AutomationConfigVersion) => {
    if (!window.confirm(`Khôi phục ${scopeLabels[version.scope] || version.scope} về phiên bản ${version.version}? Hệ thống sẽ tự tạo thêm một phiên bản mới để có thể hoàn tác.`)) return;
    setBusy(version.id); setError("");
    try {
      const response = await fetch("/api/crm/automation/versions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", versionId: version.id, confirmed: true }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không khôi phục được phiên bản.");
      setMessage(`Đã khôi phục và tạo phiên bản ${payload.restored.version}.`); await load();
    } catch (restoreError) { setError(restoreError instanceof Error ? restoreError.message : "Không khôi phục được phiên bản."); }
    finally { setBusy(""); }
  };

  const publish = async (version: AutomationConfigVersion) => {
    if (!window.confirm(`Xuất bản ${scopeLabels[version.scope] || version.scope} từ bản nháp v${version.version}? Cấu hình đang chạy sẽ được thay thế.`)) return;
    setBusy(version.id); setError("");
    try {
      const response = await fetch("/api/crm/automation/versions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", versionId: version.id, confirmed: true }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không xuất bản được phiên bản.");
      setMessage(`Đã xuất bản thành phiên bản ${payload.restored.version}.`); await load();
    } catch (publishError) { setError(publishError instanceof Error ? publishError.message : "Không xuất bản được phiên bản."); }
    finally { setBusy(""); }
  };

  if (!data || !policy) return <div className="flex min-h-[280px] items-center justify-center text-sm text-gray-500"><Loader2 size={18} className="mr-2 animate-spin text-blue-600" />Đang kiểm tra vận hành...</div>;

  return <div className="space-y-5">
    <section className={`rounded-2xl border p-5 ${data.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><div className={`rounded-xl p-2 ${data.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{data.ready ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}</div><div><h2 className="text-base font-bold text-gray-900">{data.ready ? "Hệ thống vận hành ổn định" : "Hệ thống cần xử lý trước khi mở rộng gửi"}</h2><p className="mt-1 text-xs text-gray-600">Cron: {data.scheduler.configured ? "đã khóa bảo mật" : "thiếu CRON_SECRET"} · lần chạy gần nhất {dateLabel(data.scheduler.lastRunAt)}{data.scheduler.isRunning ? " · đang chạy" : ""}</p></div></div><button onClick={load} disabled={busy === "load"} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-blue-700"><RefreshCw size={14} className={busy === "load" ? "animate-spin" : ""} />Làm mới</button></div>
      {data.alerts.length > 0 && <div className="mt-4 grid gap-2 md:grid-cols-2">{data.alerts.map(alert => <div key={alert.code} className="rounded-xl border border-amber-200 bg-white/70 p-3 text-xs text-amber-800"><strong className="mr-1">Cảnh báo:</strong>{alert.message}</div>)}</div>}
    </section>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

    <section className="rounded-2xl border border-gray-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-blue-600" /><div><h3 className="text-sm font-bold text-gray-900">Hàng đợi gửi & sự cố</h3><p className="text-xs text-gray-500">Zalo gửi trễ và Email được xử lý không chặn worker; công việc lỗi có thể phát lại có kiểm soát.</p></div></div><div className="grid gap-3 md:grid-cols-2">{data.queues.map(queue => { const Icon = queue.channel === "email" ? Mail : MessageCircle; return <div key={queue.channel} className="rounded-xl border border-gray-200 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold text-gray-900"><Icon size={16} className="text-blue-600" />{queue.channel === "email" ? "Email" : "Zalo cá nhân"}</div><button onClick={() => retry(queue.channel)} disabled={!queue.failed || Boolean(busy)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-[10px] font-semibold text-blue-700 disabled:opacity-40"><RotateCcw size={11} />Thử lại lỗi</button></div><div className="mt-3 grid grid-cols-4 gap-2 text-center">{[["Chờ",queue.pending],["Đang gửi",queue.processing],["Lỗi",queue.failed],["Gửi 24h",queue.sent24h]].map(([label,value]) => <div key={String(label)} className="rounded-lg bg-gray-50 p-2"><strong className={label === "Lỗi" && Number(value) ? "text-red-600" : "text-gray-900"}>{value}</strong><span className="block text-[9px] text-gray-500">{label}</span></div>)}</div>{queue.oldestPendingAt && <p className="mt-2 text-[10px] text-gray-500">Cũ nhất: {dateLabel(queue.oldestPendingAt)}</p>}</div>})}</div></section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><MessageCircle size={18} className="text-blue-600" /><div><h3 className="text-sm font-bold text-gray-900">Nhóm tài khoản Zalo cá nhân</h3><p className="text-xs text-gray-500">Mỗi enrollment giữ cố định tài khoản đã chọn; tài khoản tắt sẽ được chuyển về SmartFurni mặc định cho lần xử lý kế tiếp.</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.zaloAccounts.map(account => <div key={account.id} className="rounded-xl border border-gray-200 p-3"><div className="flex items-center justify-between"><strong className="text-xs text-gray-900">{account.label || account.displayName}</strong><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${account.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{account.isActive ? "Hoạt động" : "Đã tắt"}</span></div><p className="mt-2 truncate text-[10px] text-gray-500">{account.displayName} · kết nối {dateLabel(account.lastConnected)}</p></div>)}{!data.zaloAccounts.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Chưa có tài khoản Zalo cá nhân hoạt động.</div>}</div></section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-blue-600" /><div><h3 className="text-sm font-bold text-gray-900">Chính sách liên hệ toàn hệ thống</h3><p className="text-xs text-gray-500">Áp dụng trước khi gửi để chống làm phiền, gửi trùng và email đã bounce/complaint.</p></div></div><button onClick={savePolicy} disabled={busy === "policy"} className="inline-flex items-center gap-2 rounded-xl bg-[#0068ff] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === "policy" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}Lưu chính sách</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs text-gray-600">Bắt đầu giờ yên lặng<input type="time" value={policy.quietHoursStart} onChange={event => setPolicy({ ...policy, quietHoursStart: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <label className="text-xs text-gray-600">Kết thúc giờ yên lặng<input type="time" value={policy.quietHoursEnd} onChange={event => setPolicy({ ...policy, quietHoursEnd: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <label className="text-xs text-gray-600">Tối đa tin/7 ngày<input type="number" min={1} max={20} value={policy.maxMessagesPerSevenDays} onChange={event => setPolicy({ ...policy, maxMessagesPerSevenDays: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <label className="text-xs text-gray-600">Chống trùng trong (phút)<input type="number" min={5} max={1440} value={policy.dedupeWindowMinutes} onChange={event => setPolicy({ ...policy, dedupeWindowMinutes: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <label className="text-xs text-gray-600">Tỷ lệ lỗi tự cảnh báo (%)<input type="number" min={1} max={100} value={policy.autoPauseFailureRate} onChange={event => setPolicy({ ...policy, autoPauseFailureRate: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <label className="text-xs text-gray-600">Mẫu tối thiểu để cảnh báo<input type="number" min={3} value={policy.autoPauseMinimumAttempts} onChange={event => setPolicy({ ...policy, autoPauseMinimumAttempts: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
      <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={policy.suppressBouncedEmails} onChange={event => setPolicy({ ...policy, suppressBouncedEmails: event.target.checked })} className="accent-[#0068ff]" />Chặn email đã bounce</label>
      <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={policy.suppressComplainedEmails} onChange={event => setPolicy({ ...policy, suppressComplainedEmails: event.target.checked })} className="accent-[#0068ff]" />Chặn email complaint</label>
      <label className="md:col-span-2 xl:col-span-4 text-xs text-gray-600">Nhãn không liên hệ<input value={policy.doNotContactTags.join(", ")} onChange={event => setPolicy({ ...policy, doNotContactTags: event.target.value.split(",").map(value => value.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
    </div></section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><History size={18} className="text-blue-600" /><div><h3 className="text-sm font-bold text-gray-900">Phiên bản, phê duyệt & khôi phục</h3><p className="text-xs text-gray-500">Bản nháp không tác động hệ thống cho tới khi xuất bản; mọi thao tác đều tạo snapshot mới để hoàn tác.</p></div></div><div className="max-h-80 overflow-auto rounded-xl border border-gray-200"><table className="w-full min-w-[780px] text-left text-xs"><thead className="sticky top-0 bg-gray-50 text-gray-500"><tr><th className="px-3 py-2">Khu vực</th><th className="px-3 py-2">Phiên bản</th><th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2">Người lưu</th><th className="px-3 py-2">Thời gian</th><th className="px-3 py-2">Ghi chú</th><th className="px-3 py-2"></th></tr></thead><tbody className="divide-y divide-gray-100">{versions.map(version => <tr key={version.id}><td className="px-3 py-2 font-semibold text-gray-800">{scopeLabels[version.scope] || version.scope}</td><td className="px-3 py-2">v{version.version}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${version.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{version.status === "draft" ? "Bản nháp" : "Đã xuất bản"}</span></td><td className="px-3 py-2">{version.actorName}</td><td className="px-3 py-2">{dateLabel(version.createdAt)}</td><td className="max-w-[240px] truncate px-3 py-2 text-gray-500">{version.note || "—"}</td><td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">{version.status === "draft" && <button onClick={() => publish(version)} disabled={busy === version.id} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 font-semibold text-white"><Send size={11} />Xuất bản</button>}<button onClick={() => restore(version)} disabled={busy === version.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 font-semibold text-blue-700"><RotateCcw size={11} />Khôi phục</button></div></td></tr>)}</tbody></table>{!versions.length && <div className="p-6 text-center text-xs text-gray-400">Phiên bản đầu tiên sẽ được tạo khi lưu cấu hình.</div>}</div></section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="text-sm font-bold text-gray-900">Hoạt động gửi gần nhất</h3><div className="mt-3 max-h-72 space-y-2 overflow-auto">{data.recent.map(item => <div key={item.id} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"><div className={`mt-0.5 ${item.status === "sent" ? "text-emerald-600" : item.status === "failed" ? "text-red-600" : "text-amber-600"}`}>{item.status === "sent" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><strong className="truncate text-xs text-gray-900">{item.leadName || item.ruleName}</strong><span className="shrink-0 text-[10px] text-gray-400">{dateLabel(item.sentAt)}</span></div><p className="mt-1 truncate text-[10px] text-gray-500">{item.channel} · {item.message}</p>{item.error && <p className="mt-1 text-[10px] text-red-600">{item.error}</p>}</div></div>)}</div></section>
  </div>;
}
