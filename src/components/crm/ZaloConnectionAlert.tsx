"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RotateCw, WifiOff, X } from "lucide-react";

interface ConnectionAlert {
  accountId: string;
  accountName: string;
  reason: string;
  disconnectedAt: string;
  notifiedAt?: string;
}

function normalizeAlert(value: unknown): ConnectionAlert | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const accountId = typeof item.accountId === "string" ? item.accountId : "";
  if (!accountId) return null;
  return {
    accountId,
    accountName: typeof item.accountName === "string" && item.accountName.trim()
      ? item.accountName.trim()
      : accountId,
    reason: typeof item.reason === "string" ? item.reason : "Phiên Zalo không còn phản hồi",
    disconnectedAt: typeof item.disconnectedAt === "string" ? item.disconnectedAt : new Date().toISOString(),
    notifiedAt: typeof item.notifiedAt === "string" ? item.notifiedAt : undefined,
  };
}

export default function ZaloConnectionAlert({ isAdmin }: { isAdmin: boolean }) {
  const [alerts, setAlerts] = useState<Record<string, ConnectionAlert>>({});
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const loadAlerts = () => {
      void fetch("/api/crm/zalo-inbox/alerts", { cache: "no-store" })
        .then(async response => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
        .then(payload => {
          if (cancelled) return;
          const next: Record<string, ConnectionAlert> = {};
          for (const raw of Array.isArray(payload?.alerts) ? payload.alerts : []) {
            const alert = normalizeAlert(raw);
            if (alert) next[alert.accountId] = alert;
          }
          setAlerts(next);
        })
        .catch(error => console.error("[ZaloConnectionAlert] Không tải được cảnh báo:", error));
    };
    loadAlerts();

    const source = new EventSource("/api/crm/zalo-inbox/sse");
    // Khi Railway deploy/restart, SSE tự nối lại. Đồng bộ lại cảnh báo đang mở
    // để admin không bỏ lỡ một lần mất kết nối xảy ra trong lúc trình duyệt rớt mạng.
    source.addEventListener("open", loadAlerts);
    source.addEventListener("zalo_connection_alert", event => {
      try {
        const alert = normalizeAlert(JSON.parse((event as MessageEvent).data));
        if (!alert) return;
        setAlerts(current => ({ ...current, [alert.accountId]: alert }));
        setDismissed(current => ({ ...current, [alert.accountId]: false }));
      } catch (error) {
        console.error("[ZaloConnectionAlert] Event không hợp lệ:", error);
      }
    });
    const clearAlert = (event: Event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as { accountId?: string };
        if (!data.accountId) return;
        setAlerts(current => {
          const next = { ...current };
          delete next[data.accountId!];
          return next;
        });
      } catch { /* heartbeat/legacy event */ }
    };
    source.addEventListener("zalo_connection_restored", clearAlert);
    source.addEventListener("zalo_connection_alert_cleared", clearAlert);
    source.addEventListener("connected", clearAlert);
    return () => {
      cancelled = true;
      source.close();
    };
  }, [isAdmin]);

  const visibleAlerts = useMemo(
    () => Object.values(alerts).filter(alert => !dismissed[alert.accountId]),
    [alerts, dismissed],
  );
  if (!isAdmin || visibleAlerts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[220] flex w-[min(430px,calc(100vw-32px))] flex-col gap-3 sm:top-6" role="region" aria-label="Cảnh báo mất kết nối Zalo">
      {visibleAlerts.map(alert => {
        const time = new Date(alert.disconnectedAt).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        });
        const href = `/crm/zalo-inbox?account=${encodeURIComponent(alert.accountId)}&reconnect=1`;
        return (
          <div key={alert.accountId} className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl shadow-red-950/20">
            <div className="flex items-start gap-3 bg-gradient-to-r from-red-50 via-orange-50 to-white p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-100 text-red-600">
                <WifiOff size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle size={17} />
                  <p className="font-bold">Zalo Inbox mất kết nối</p>
                </div>
                <p className="mt-1 truncate font-semibold text-slate-900">{alert.accountName}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">Không thể nhận/gửi tin ổn định từ {time}. Vui lòng kết nối lại tài khoản.</p>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
                onClick={() => setDismissed(current => ({ ...current, [alert.accountId]: true }))}
                aria-label="Ẩn cảnh báo"
              >
                <X size={19} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-red-100 px-4 py-3">
              <p className="min-w-0 truncate text-xs text-slate-500" title={alert.reason}>{alert.reason}</p>
              <a href={href} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700">
                <RotateCw size={16} />
                Kết nối lại
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
