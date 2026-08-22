"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, PhoneCall, X } from "lucide-react";
import type { NewLeadCallDashboard, NewLeadCallReminder } from "@/lib/crm-new-lead-call-types";

function bucketKey(minutes: number) {
  return Math.floor(Date.now() / (Math.max(15, minutes) * 60_000));
}

export default function NewLeadCallReminderPopup({ enabled }: { enabled: boolean }) {
  const [data, setData] = useState<NewLeadCallDashboard | null>(null);
  const [visible, setVisible] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const response = await fetch("/api/crm/new-lead-calls/reminders", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const payload = await response.json() as NewLeadCallDashboard;
    setData(payload);
    const key = `crm-new-lead-call-popup:${bucketKey(payload.popupIntervalMinutes)}`;
    if (payload.customerCount > 0 && localStorage.getItem(key) !== "dismissed") setVisible(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  const leads = useMemo(() => {
    const unique = new Map<string, NewLeadCallReminder>();
    for (const reminder of data?.reminders ?? []) {
      if (reminder.status !== "pending") continue;
      const current = unique.get(reminder.leadId);
      if (!current || new Date(reminder.scheduledAt) < new Date(current.scheduledAt)) unique.set(reminder.leadId, reminder);
    }
    return [...unique.values()].slice(0, 8);
  }, [data]);

  if (!enabled || !visible || !data || data.customerCount === 0) return null;

  const dismiss = () => {
    localStorage.setItem(`crm-new-lead-call-popup:${bucketKey(data.popupIntervalMinutes)}`, "dismissed");
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[99970] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-label="Khách hàng cần liên hệ">
      <div className="max-h-[82vh] w-full max-w-xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><PhoneCall size={21} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Nhắc liên hệ định kỳ</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">{data.customerCount} khách hàng cần liên hệ hôm nay</h2>
            <p className="mt-1 text-xs text-slate-500">{data.dueNowCount} khách đã đến giờ · Popup sẽ nhắc lại sau {data.popupIntervalMinutes} phút.</p>
          </div>
          <button onClick={dismiss} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Đóng"><X size={18} /></button>
        </div>
        <div className="max-h-[52vh] space-y-2 overflow-y-auto p-4">
          {leads.map(reminder => {
            const time = new Date(reminder.scheduledAt);
            const due = time.getTime() <= Date.now();
            return (
              <Link key={reminder.leadId} href={`/crm/leads/${reminder.leadId}`} onClick={dismiss} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50/40">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${due ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}><Clock3 size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">{reminder.leadName}</p>
                  <p className="truncate text-xs text-slate-500">{reminder.phone} · lần {reminder.slotNumber}, ngày {reminder.dayNumber}</p>
                </div>
                <span className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${due ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>
                  {time.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button onClick={dismiss} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600">Để sau</button>
          <Link href="/crm/tasks" onClick={dismiss} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Xem tất cả phiếu gọi</Link>
        </div>
      </div>
    </div>
  );
}
