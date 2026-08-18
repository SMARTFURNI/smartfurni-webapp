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
  disconnected: { background: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  rejected: { background: "#fff1f2", color: "#be123c", border: "#fecdd3" },
  stopped: { background: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  failed: { background: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

function StatusIcon({ status, loading = false }: { status: ZaloFriendshipStatus; loading?: boolean }) {
  if (loading || status === "processing") return <Loader2 size={13} className="animate-spin" />;
  if (status === "accepted") return <CheckCircle2 size={13} />;
  if (status === "rejected" || status === "failed" || status === "not_found" || status === "disconnected") return <XCircle size={13} />;
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
      <div className="h-[46px] min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm" title={error || "Kết bạn Zalo cá nhân"}>
        <div className="flex h-full items-center justify-between gap-3">
          <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Kết bạn Zalo</p><ZaloFriendshipBadge /></div>
          <button onClick={() => run("resume")} disabled={loading} className="flex-shrink-0 text-[11px] font-semibold text-[#0068ff]">Kích hoạt</button>
        </div>
        {error && <p className="sr-only">{error}</p>}
      </div>
    );
  }

  const terminal = ["accepted", "rejected"].includes(summary.status);
  return (
    <div className="h-[46px] min-w-[360px] max-w-[480px] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm" title={error || "Vuốt ngang để xem toàn bộ thông tin kết bạn Zalo"}>
      <div className="flex h-full items-center gap-2">
        {summary.zaloAvatar ? <img src={summary.zaloAvatar} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" /> : <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0068ff]"><MessageCircle size={15} /></div>}
        <div className="flex-shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Kết bạn Zalo</p>
          <ZaloFriendshipBadge summary={summary} />
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="touch-pan-x overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" title="Vuốt ngang để xem toàn bộ thông tin">
            <div className="flex w-max items-center gap-3 whitespace-nowrap pr-5 text-[10px] text-slate-500">
              {summary.zaloDisplayName && <span><b className="text-slate-700">Khách:</b> {summary.zaloDisplayName}</span>}
              {summary.accountLabel && <span><b className="text-slate-700">Gửi từ:</b> {summary.accountLabel}</span>}
              <span><b className="text-slate-700">Đã gửi:</b> {summary.attemptCount}/3</span>
              {summary.requestMessage && <span><b className="text-slate-700">Lời nhắn:</b> {summary.requestMessage}</span>}
              {summary.lastError && <span className="text-red-600">{summary.lastError}</span>}
              {error && <span className="text-red-600">{error}</span>}
              {!terminal && summary.status !== "stopped" && <button onClick={() => run("check")} disabled={loading} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-1 font-semibold text-[#0068ff]"><RefreshCw size={10} className={loading ? "animate-spin" : ""} /> Kiểm tra</button>}
              {["failed", "not_found", "waiting_account", "rejected"].includes(summary.status) && <button onClick={() => run("retry")} disabled={loading} className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-1 font-semibold text-orange-700"><RotateCcw size={10} /> Thử lại</button>}
              {summary.status === "stopped" ? <button onClick={() => run("resume")} disabled={loading} className="rounded-md bg-emerald-50 px-1.5 py-1 font-semibold text-emerald-700">Tiếp tục</button> : !terminal && <button onClick={() => run("stop")} disabled={loading} className="rounded-md bg-slate-100 px-1.5 py-1 font-semibold text-slate-600">Dừng</button>}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>
      {error && <p className="sr-only">{error}</p>}
    </div>
  );
}
