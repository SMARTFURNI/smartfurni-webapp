"use client";

/**
 * DataPoolNotification — Thông báo real-time khi có lead mới vào Data Pool
 *
 * Dùng client-side polling (mỗi 5 giây) thay vì SSE vì Railway serverless
 * không hỗ trợ long-running streaming connections (setInterval bị kill).
 *
 * Cơ chế:
 *   - Mount: lưu sinceTs = now làm mốc thời gian
 *   - Mỗi 5 giây: gọi /api/crm/raw-leads/latest?since=<sinceTs>
 *   - Nếu có lead mới → hiển thị toast notification + âm thanh
 *   - Cập nhật sinceTs = createdAt của lead mới nhất
 */

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";

interface LeadNotification {
  id: string;
  notifId: string;
  fullName: string;
  phone: string;
  source: string;
  createdAt: string;
  campaignName?: string | null;
  adName?: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  facebook_lead: "Facebook Lead",
  tiktok_lead: "TikTok Lead",
  manual: "Thủ công",
  website: "Website",
  other: "Khác",
};

const SOURCE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  facebook_lead: { bg: "#1877F2", border: "#1877F2", icon: "f" },
  tiktok_lead:   { bg: "#010101", border: "#69C9D0", icon: "t" },
  manual:        { bg: "#6366f1", border: "#6366f1", icon: "m" },
  website:       { bg: "#059669", border: "#059669", icon: "w" },
  other:         { bg: "#64748b", border: "#64748b", icon: "?" },
};

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 8000;
const POLL_INTERVAL_MS = 5000;

export default function DataPoolNotification() {
  const [toasts, setToasts] = useState<LeadNotification[]>([]);
  const sinceRef = useRef<string>(new Date().toISOString());
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((notifId: string) => {
    setToasts(prev => prev.filter(t => t.notifId !== notifId));
    const t = dismissTimers.current.get(notifId);
    if (t) {
      clearTimeout(t);
      dismissTimers.current.delete(notifId);
    }
  }, []);

  const addToast = useCallback((lead: Omit<LeadNotification, "notifId">) => {
    const notifId = `${lead.id}_${Date.now()}`;
    setToasts(prev => [{ ...lead, notifId }, ...prev].slice(0, MAX_TOASTS));

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(notifId), AUTO_DISMISS_MS);
    dismissTimers.current.set(notifId, timer);

    // Âm thanh thông báo nhẹ
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch { /* ignore */ }
  }, [dismiss]);

  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      try {
        const res = await fetch(
          `/api/crm/raw-leads/latest?since=${encodeURIComponent(sinceRef.current)}`,
          { cache: "no-store" }
        );
        if (!res.ok || !isMounted) return;

        const data = await res.json();
        const leads: Array<{
          id: string; fullName: string; phone: string; source: string;
          createdAt: string; campaignName: string | null; adName: string | null;
        }> = data.leads || [];

        if (leads.length > 0 && isMounted) {
          // Cập nhật sinceTs để không nhận lại lead cũ
          sinceRef.current = leads[leads.length - 1].createdAt;
          // Hiển thị toast (tối đa 3 cùng lúc từ 1 lần poll)
          leads.slice(0, 3).forEach(lead => addToast(lead));
        }
      } catch { /* bỏ qua lỗi mạng */ }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      dismissTimers.current.forEach(t => clearTimeout(t));
      dismissTimers.current.clear();
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 380,
        width: "calc(100vw - 40px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const srcConfig = SOURCE_COLORS[toast.source] ?? SOURCE_COLORS.other;
        const srcLabel = SOURCE_LABELS[toast.source] ?? toast.source;
        const timeAgo = (() => {
          const diff = Date.now() - new Date(toast.createdAt).getTime();
          if (diff < 60000) return "Vừa xong";
          return `${Math.floor(diff / 60000)} phút trước`;
        })();

        return (
          <div
            key={toast.notifId}
            style={{
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
              border: `1.5px solid ${srcConfig.border}22`,
              overflow: "hidden",
              pointerEvents: "all",
              animation: "slideInRight 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* Header bar màu theo nguồn */}
            <div
              style={{
                background: srcConfig.bg,
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase",
                  }}
                >
                  {srcConfig.icon}
                </div>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>
                  🔔 Lead mới từ {srcLabel}
                </span>
              </div>
              <button
                onClick={() => dismiss(toast.notifId)}
                style={{
                  background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                  width: 20, height: 20, cursor: "pointer", color: "#fff", fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1, padding: 0,
                }}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: `${srcConfig.bg}18`,
                    border: `2px solid ${srcConfig.bg}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 700, color: srcConfig.bg, flexShrink: 0,
                  }}
                >
                  {toast.fullName.charAt(0).toUpperCase() || "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {toast.fullName || "Không có tên"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    📞 {toast.phone || "—"}
                  </div>
                  {(toast.campaignName || toast.adName) && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      📢 {toast.campaignName || toast.adName}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    🕐 {timeAgo}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Link
                  href="/crm/data-pool"
                  style={{
                    flex: 1, background: srcConfig.bg, color: "#fff", border: "none",
                    borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", textDecoration: "none", textAlign: "center", display: "block",
                  }}
                  onClick={() => dismiss(toast.notifId)}
                >
                  Xem Data Pool →
                </Link>
                <button
                  onClick={() => dismiss(toast.notifId)}
                  style={{
                    background: "#f1f5f9", color: "#64748b", border: "none",
                    borderRadius: 8, padding: "7px 12px", fontSize: 12,
                    fontWeight: 500, cursor: "pointer",
                  }}
                >
                  Bỏ qua
                </button>
              </div>
            </div>

            {/* Progress bar auto-dismiss */}
            <div style={{ height: 3, background: `${srcConfig.bg}22`, position: "relative", overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute", left: 0, top: 0, height: "100%",
                  background: srcConfig.bg,
                  animation: `shrinkWidth ${AUTO_DISMISS_MS}ms linear forwards`,
                }}
              />
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
