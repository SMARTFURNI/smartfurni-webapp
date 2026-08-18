"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, Loader2, MessageCircle, RefreshCw, RotateCcw, StopCircle, UserPlus, XCircle } from "lucide-react";
import type { ZaloFriendshipSummary, ZaloFriendshipStatus } from "@/lib/crm-zalo-friendship-types";
import { ZALO_FRIENDSHIP_STATUS_LABELS } from "@/lib/crm-zalo-friendship-types";

const THEMES: Record<ZaloFriendshipStatus, { background: string; color: string; border: string }> = {
  accepted: { background: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  pending: { background: "#eff6ff", color: "#0068ff", border: "#bfdbfe" },
  queued: { background: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  processing: { background: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  retry_scheduled: { background: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  waiting_data: { background: "#f8fafc", color: "#64748b", border: "#cbd5e1" },
  waiting_account: { background: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  not_found: { background: "#fff1f2", color: "#e11d48", border: "#fecdd3" },
  rejected: { background: "#fff1f2", color: "#be123c", border: "#fecdd3" },
  stopped: { background: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  failed: { background: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

function StatusIcon({ status, loading = false }: { status: ZaloFriendshipStatus; loading?: boolean }) {
  if (loading || status === "processing") return <Loader2 size={13} className="animate-spin" />;
  if (status === "accepted") return <CheckCircle2 size={13} />;
  if (status === "rejected" || status === "failed" || status === "not_found") return <XCircle size={13} />;
  if (status === "stopped") return <StopCircle size={13} />;
  if (status === "pending" || status === "retry_scheduled") return <Clock3 size={13} />;
  return <UserPlus size={13} />;
}

export function ZaloFriendshipBadge({ summary }: { summary?: ZaloFriendshipSummary }) {
  if (!summary) {
    return <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500"><MessageCircle size={11} /> Chưa kích hoạt</span>;
  }
  const theme = THEMES[summary.status];
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold whitespace-nowrap" style={theme} title={summary.lastError || ZALO_FRIENDSHIP_STATUS_LABELS[summary.status]}>
      <StatusIcon status={summary.status} />
      {ZALO_FRIENDSHIP_STATUS_LABELS[summary.status]}
    </span>
  );
}

export default function ZaloFriendshipStatus({ leadId, initialSummary }: { leadId: string; initialSummary?: ZaloFriendshipSummary }) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(action: "retry" | "stop" | "resume" | "check") {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/crm/zalo-friendships", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không cập nhật được trạng thái");
      setSummary(data.friendship || undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không cập nhật được trạng thái");
    } finally {
      setLoading(false);
    }
  }

  if (!summary) {
    return (
      <div className="min-w-[240px] rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3"><ZaloFriendshipBadge /><button onClick={() => run("resume")} disabled={loading} className="text-xs font-semibold text-[#0068ff]">Kích hoạt</button></div>
        {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
      </div>
    );
  }

  const terminal = ["accepted", "rejected"].includes(summary.status);
  return (
    <div className="min-w-[270px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Kết bạn Zalo cá nhân</p>
          <ZaloFriendshipBadge summary={summary} />
        </div>
        {summary.zaloAvatar ? <img src={summary.zaloAvatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#0068ff]"><MessageCircle size={17} /></div>}
      </div>
      <div className="mt-2 space-y-1 text-[11px] text-slate-500">
        {summary.zaloDisplayName && <p><b className="text-slate-700">Tài khoản khách:</b> {summary.zaloDisplayName}</p>}
        {summary.accountLabel && <p><b className="text-slate-700">Gửi từ:</b> {summary.accountLabel}</p>}
        <p><b className="text-slate-700">Số lần gửi:</b> {summary.attemptCount}/3</p>
        {summary.requestMessage && <p className="line-clamp-2" title={summary.requestMessage}><b className="text-slate-700">Lời nhắn:</b> {summary.requestMessage}</p>}
        {summary.lastError && <p className="text-red-600">{summary.lastError}</p>}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
        {!terminal && summary.status !== "stopped" && <button onClick={() => run("check")} disabled={loading} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-[11px] font-semibold text-[#0068ff]"><RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Kiểm tra</button>}
        {["failed", "not_found", "waiting_account", "rejected"].includes(summary.status) && <button onClick={() => run("retry")} disabled={loading} className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1.5 text-[11px] font-semibold text-orange-700"><RotateCcw size={11} /> Thử lại</button>}
        {summary.status === "stopped" ? <button onClick={() => run("resume")} disabled={loading} className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-700">Tiếp tục tự động</button> : !terminal && <button onClick={() => run("stop")} disabled={loading} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-600">Dừng</button>}
      </div>
      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
