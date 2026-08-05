"use client";

import Script from "next/script";
import { CheckCircle2, ChevronDown, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicZaloGmfSourceLink } from "@/lib/zalo-gmf-attribution-store";

declare global {
  interface Window {
    ZaloSocialSDK?: { reload?: () => void };
    smartFurniZaloGroupCallback?: (data: { user_id?: string; action?: string }) => void;
  }
}

export default function ZaloGroupJoinClient({ link, appId }: { link: PublicZaloGmfSourceLink; appId: string }) {
  const [visitId, setVisitId] = useState("");
  const [loading, setLoading] = useState(true);
  const [identified, setIdentified] = useState(false);
  const started = useRef(false);

  const patchVisit = useCallback(async (payload: Record<string, unknown>) => {
    await fetch(`/api/zalo-group/${encodeURIComponent(link.slug)}/visit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  }, [link.slug]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const queryParams = Object.fromEntries(new URLSearchParams(window.location.search));
    void fetch(`/api/zalo-group/${encodeURIComponent(link.slug)}/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer: document.referrer, queryParams }),
    }).then(response => response.json()).then(result => {
      if (result.visitId) setVisitId(String(result.visitId));
    }).finally(() => setLoading(false));
  }, [link.slug]);

  useEffect(() => {
    window.smartFurniZaloGroupCallback = data => {
      if (data?.user_id && visitId) {
        setIdentified(true);
        void patchVisit({ action: "identify", visitId, userId: data.user_id });
      }
    };
    window.ZaloSocialSDK?.reload?.();
    return () => { delete window.smartFurniZaloGroupCallback; };
  }, [patchVisit, visitId]);

  const openGroup = () => {
    if (visitId) void patchVisit({ action: "open", visitId });
    window.location.assign(link.targetUrl);
  };

  const description = link.groupDescription?.trim() || "Nhóm chưa có thông tin mô tả.";

  return <main className="flex min-h-[100svh] flex-col bg-[#e9eef3] text-[#001a33]">
    <Script src="https://sp.zalo.me/plugins/sdk.js" strategy="afterInteractive" onLoad={() => window.ZaloSocialSDK?.reload?.()} />

    <header className="h-[72px] shrink-0 border-b border-[#dce3ea] bg-white shadow-[0_2px_8px_rgba(18,46,77,0.06)] sm:h-[84px]">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <div className="select-none text-[34px] font-black leading-none tracking-[-0.06em] text-[#0068ff] sm:text-[38px]" aria-label="Zalo">Zalo</div>
        <div className="flex items-center gap-2 text-sm text-[#526579]">
          <span className="hidden sm:inline">Ngôn ngữ:</span>
          <span className="font-semibold text-[#0068ff]">Tiếng Việt</span>
          <ChevronDown size={15} className="text-[#0068ff]" />
        </div>
      </div>
    </header>

    <section className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
      <div className="overflow-hidden rounded-xl bg-white shadow-[0_3px_16px_rgba(29,55,82,0.09)]">
        <div className="grid md:grid-cols-[1fr_270px]">
          <div className="p-6 sm:p-9 lg:p-11">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
              <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef3f7] text-3xl font-bold text-[#0068ff] shadow-[0_0_0_1px_rgba(0,26,51,0.06)]">
                {link.groupAvatar
                  ? <img src={link.groupAvatar} alt={`Ảnh nhóm ${link.groupName}`} className="h-full w-full object-cover" />
                  : link.groupName.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-[24px] font-bold leading-[1.28] tracking-[-0.02em] text-[#001a33] sm:text-[28px]">{link.groupName}</h1>
                <p className="mt-2 text-base font-medium text-[#526579]">Nhóm</p>
                <button
                  type="button"
                  onClick={openGroup}
                  disabled={loading}
                  className="mt-5 flex h-14 w-full max-w-[300px] items-center justify-center gap-3 rounded-lg bg-[#0068ff] px-6 text-base font-bold text-white shadow-[0_7px_18px_rgba(0,104,255,0.22)] transition hover:bg-[#0058dc] hover:shadow-[0_9px_22px_rgba(0,104,255,0.3)] active:translate-y-px disabled:cursor-wait disabled:opacity-70 sm:h-[58px] sm:text-lg"
                >
                  {loading ? <Loader2 size={21} className="animate-spin" /> : <LogIn size={21} />}
                  {loading ? "Đang chuẩn bị..." : "Tham gia nhóm"}
                </button>
              </div>
            </div>

            <div className="mt-9 border-t border-[#edf1f5] pt-7 sm:mt-10 sm:pt-8">
              <h2 className="text-xl font-bold text-[#001a33]">Mô tả nhóm</h2>
              <p className="mt-4 max-w-[620px] whitespace-pre-line text-[15px] leading-7 text-[#61758a]">{description}</p>
            </div>
          </div>

          <aside className="hidden items-center justify-center border-l border-[#edf1f5] bg-[#fbfcfd] p-7 md:flex">
            <div className="text-center">
              <div className="relative mx-auto h-[218px] w-[218px] rounded-lg bg-white p-3 shadow-[0_2px_12px_rgba(15,35,60,0.09)]">
                <img src={`/api/zalo-group/${encodeURIComponent(link.slug)}/target-qr`} alt="Mã QR tham gia nhóm Zalo" className="h-full w-full" />
                <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[5px] border-white bg-[#0068ff] text-[11px] font-black text-white shadow-sm">Zalo</span>
              </div>
              <p className="mx-auto mt-4 max-w-[220px] text-xs leading-5 text-[#61758a]">Mở Zalo, quét mã QR để tham gia và xem trên điện thoại</p>
            </div>
          </aside>
        </div>
      </div>

      {appId && link.oaId && <details className="group mx-auto mt-4 max-w-xl rounded-lg border border-[#dce4ec] bg-white/80 text-sm text-[#61758a] shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-center gap-2 px-4 py-3 font-medium hover:text-[#0068ff]">
          {identified ? <CheckCircle2 size={16} className="text-[#12a36d]" /> : <ShieldCheck size={16} />}
          {identified ? "Đã xác nhận nguồn tham gia" : "Xác nhận nguồn tham gia (không bắt buộc)"}
          <ChevronDown size={15} className="transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#e8edf2] px-5 py-4 text-center">
          <div ref={node => { if (node) { node.setAttribute("user_external_id", visitId); node.setAttribute("status", "show"); } }} className="zalo-interaction-widget" data-oaid={link.oaId} data-appid={appId} data-callback="smartFurniZaloGroupCallback" data-reason-msg="SmartFurni xin xác nhận để ghi nhận nguồn tham gia nhóm và hỗ trợ thành viên." />
          <p className="mt-2 text-xs leading-5">Thông tin chỉ dùng để đối soát nguồn tham gia và không hiển thị UID Zalo trong báo cáo.</p>
        </div>
      </details>}
    </section>

    <footer className="px-4 pb-6 text-center text-xs text-[#7a8da0] sm:pb-8">SmartFurni · Liên kết tham gia Zalo Group</footer>
  </main>;
}
