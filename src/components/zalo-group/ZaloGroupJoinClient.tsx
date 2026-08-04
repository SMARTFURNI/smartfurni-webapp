"use client";

import Script from "next/script";
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, MessageCircle, ShieldCheck, Users } from "lucide-react";
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
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true,
    }).catch(() => undefined);
  }, [link.slug]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const queryParams = Object.fromEntries(new URLSearchParams(window.location.search));
    void fetch(`/api/zalo-group/${encodeURIComponent(link.slug)}/visit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
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
    window.open(link.targetUrl, "_blank", "noopener,noreferrer");
  };

  return <main className="min-h-screen bg-[radial-gradient(circle_at_12%_10%,rgba(55,125,255,0.16),transparent_28rem),radial-gradient(circle_at_90%_8%,rgba(224,177,51,0.18),transparent_26rem),linear-gradient(180deg,#f8fbff,#eef4fb)] px-4 py-8 text-[#172033] sm:py-14">
    <Script src="https://sp.zalo.me/plugins/sdk.js" strategy="afterInteractive" onLoad={() => window.ZaloSocialSDK?.reload?.()} />
    <div className="mx-auto max-w-xl overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(30,64,118,0.16)]">
      <div className="bg-[linear-gradient(135deg,#0f5bd7,#2488f4_60%,#5ba8ff)] p-7 text-white sm:p-9">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-100"><MessageCircle size={18} /> SmartFurni · Zalo Group</div>
        <div className="mt-7 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/35 bg-white/15 text-2xl font-bold shadow-xl">{link.groupAvatar ? <img src={link.groupAvatar} alt="" className="h-full w-full object-cover" /> : link.groupName.slice(0, 1)}</div>
          <div className="min-w-0"><p className="text-sm text-blue-100">Bạn được mời tham gia</p><h1 className="mt-1 text-2xl font-bold leading-tight">{link.groupName}</h1></div>
        </div>
      </div>
      <div className="space-y-6 p-7 sm:p-9">
        <p className="text-sm leading-6 text-[#64748b]">{link.groupDescription || "Cộng đồng Zalo do SmartFurni vận hành để chia sẻ thông tin, ưu đãi và hỗ trợ thành viên."}</p>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-blue-700"><Users size={15} /> Nhóm chính thức</div><p className="mt-2 text-sm font-medium text-[#334155]">Quản lý bởi Zalo OA</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><ShieldCheck size={15} /> Link an toàn</div><p className="mt-2 text-sm font-medium text-[#334155]">Nguồn: {link.sourceName}</p></div></div>
        {appId && link.oaId && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">{identified ? <CheckCircle2 size={17} className="text-emerald-600" /> : <ShieldCheck size={17} />} Xác nhận Zalo để ghi nhận đúng nguồn</div>
          <div ref={node => { if (node) { node.setAttribute("user_external_id", visitId); node.setAttribute("status", "show"); } }} className="zalo-interaction-widget" data-oaid={link.oaId} data-appid={appId} data-callback="smartFurniZaloGroupCallback" data-reason-msg="SmartFurni xin xác nhận để ghi nhận nguồn tham gia nhóm và hỗ trợ thành viên." />
          <p className="mt-2 text-xs leading-5 text-amber-800">Bước xác nhận chỉ dùng để đối soát nguồn tham gia; SmartFurni không công khai UID Zalo trong báo cáo.</p>
        </div>}
        <button onClick={openGroup} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f5d66f,#d5a92c)] px-5 py-4 text-base font-bold text-[#251a02] shadow-[0_14px_30px_rgba(190,139,22,0.25)] transition hover:-translate-y-0.5 disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={19} /> : <ExternalLink size={19} />} Mở nhóm trên Zalo <ArrowRight size={18} /></button>
        <p className="text-center text-xs leading-5 text-[#94a3b8]">Mỗi link và mã QR được gắn với một nguồn riêng. Dữ liệu dùng cho báo cáo nội bộ SmartFurni.</p>
      </div>
    </div>
  </main>;
}
