"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Loader2, X } from "lucide-react";
import {
  getPushPermissionState,
  subscribeToPush,
  syncPushSubscription,
  type PushPermissionState,
} from "@/lib/pwa-notifications";

async function requestTaskDigest() {
  await Promise.allSettled([
    fetch("/api/crm/facebook-group-marketing/notifications/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}",
    }),
    fetch("/api/crm/conversation-learning/notifications/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}",
    }),
  ]);
}

export default function CrmPushNotifications({ staffName }: { staffName: string }) {
  const [state, setState] = useState<PushPermissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    void getPushPermissionState()
      .then(async current => {
        setState(current);
        if (current === "subscribed") {
          await syncPushSubscription();
          await requestTaskDigest();
        }
      })
      .catch(() => setState(current => current || "unsupported"));
  }, []);

  const enable = async () => {
    setBusy(true);
    setError("");
    try {
      await subscribeToPush();
      await requestTaskDigest().catch(() => undefined);
      setState("subscribed");
      setJustEnabled(true);
      window.setTimeout(() => setJustEnabled(false), 4500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể bật thông báo.");
      setState(await getPushPermissionState().catch(() => "unsupported"));
    } finally {
      setBusy(false);
    }
  };

  if (state === null || (state === "subscribed" && !justEnabled) || dismissed) return null;

  const blocked = state === "denied";
  const unsupported = state === "unsupported";
  return (
    <aside className="fixed bottom-24 left-3 right-3 z-[115] mx-auto max-w-md rounded-2xl border border-amber-300/20 bg-[#111827]/95 p-4 text-slate-100 shadow-2xl backdrop-blur-xl md:bottom-5 md:left-[270px] md:right-auto">
      <button type="button" onClick={() => setDismissed(true)} aria-label="Đóng thông báo"
        className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-200">
        <X size={15} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          justEnabled ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-300/10 text-amber-200"
        }`}>
          {justEnabled ? <CheckCircle2 size={20} /> : <BellRing size={20} />}
        </span>
        <div className="min-w-0">
          <b className="block text-sm">
            {justEnabled ? "Đã bật thông báo CRM" : "Bật thông báo PWA"}
          </b>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {justEnabled
              ? `${staffName || "Tài khoản này"} sẽ nhận tin nhắn Zalo mới, nhiệm vụ, lead và kế hoạch chăm sóc Fanpage.`
              : blocked
                ? "Trình duyệt đang chặn thông báo. Hãy cho phép thông báo cho smartfurni.com.vn trong cài đặt trình duyệt."
                : unsupported
                  ? "Trình duyệt hiện tại chưa hỗ trợ Web Push. Trên iPhone, hãy cài CRM vào Màn hình chính trước."
                  : `${staffName || "Nhân viên"} cần bật một lần trên thiết bị này để nhận tin nhắn Zalo mới, nhiệm vụ và kế hoạch chăm sóc khách hàng.`}
          </p>
          {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
          {!justEnabled && !blocked && !unsupported && (
            <button type="button" disabled={busy} onClick={() => void enable()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-3.5 py-2 text-xs font-black text-[#1b1404] disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
              {busy ? "Đang bật…" : "Bật thông báo"}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
