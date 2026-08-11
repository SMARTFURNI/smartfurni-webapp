"use client";

import Script from "next/script";
import {
  ArrowRight, BadgeCheck, Check, CheckCircle2, ChevronLeft, ChevronRight,
  ExternalLink, Images, Loader2, MessageCircle, RefreshCw, ShieldCheck,
  Sparkles, Star, Tag,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicZaloFollowCampaign } from "@/lib/zalo-follow-campaign-store";

type WidgetState = "preparing" | "ready" | "success" | "error";

declare global {
  interface Window {
    ZaloSocialSDK?: { reload?: () => void };
    smartFurniZaloFollowCallback?: (data?: Record<string, unknown>) => void;
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

function trackClientEvent(name: string, campaign: PublicZaloFollowCampaign) {
  const payload = { event: name, campaign_id: campaign.id, campaign_name: campaign.name, product_key: campaign.productKey };
  window.dataLayer?.push(payload);
  window.gtag?.("event", name, { campaign_id: campaign.id, campaign_name: campaign.name, product_key: campaign.productKey });
}

function callbackAction(data?: Record<string, unknown>): string {
  return String(data?.action || data?.event || data?.status || "").toLowerCase();
}

export default function ZaloFollowLandingClient({ campaign, appId }: { campaign: PublicZaloFollowCampaign; appId: string }) {
  const [visitId, setVisitId] = useState("");
  const [widgetState, setWidgetState] = useState<WidgetState>("preparing");
  const [sdkKey, setSdkKey] = useState(0);
  const [identified, setIdentified] = useState(false);
  const [returnedFromZalo, setReturnedFromZalo] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const started = useRef(false);
  const hiddenAt = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const interactive = campaign.widgetMode === "interactive" && Boolean(appId);
  const images = useMemo(() => {
    const values = campaign.galleryImages?.length ? campaign.galleryImages : campaign.heroImage ? [campaign.heroImage] : [];
    return Array.from(new Set(values.map(item => item.trim()).filter(Boolean)));
  }, [campaign.galleryImages, campaign.heroImage]);

  const patchVisit = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    if (!visitId) return;
    await fetch(`/api/zalo-follow/${encodeURIComponent(campaign.slug)}/visit`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, visitId, ...extra }), keepalive: true,
    }).catch(() => undefined);
  }, [campaign.slug, visitId]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const sessionKey = "sf_zalo_follow_session";
    const sessionId = window.sessionStorage.getItem(sessionKey) || crypto.randomUUID();
    window.sessionStorage.setItem(sessionKey, sessionId);
    const queryParams = Object.fromEntries(new URLSearchParams(window.location.search));
    trackClientEvent("zalo_follow_landing_view", campaign);
    void fetch(`/api/zalo-follow/${encodeURIComponent(campaign.slug)}/visit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, referrer: document.referrer, queryParams }),
    }).then(async response => {
      const result = await response.json() as { visitId?: string; error?: string };
      if (!response.ok || !result.visitId) throw new Error(result.error || "Không khởi tạo được nút Quan tâm.");
      setVisitId(result.visitId);
    }).catch(() => setWidgetState("error"));
  }, [campaign]);

  useEffect(() => {
    window.smartFurniZaloFollowCallback = data => {
      const action = callbackAction(data);
      const userId = String(data?.user_id || data?.userId || "").trim();
      if (action === "loaded_successfully") {
        setWidgetState("ready");
        void patchVisit("sdk_loaded");
        return;
      }
      if (action.includes("dismiss")) {
        void patchVisit("dismiss");
        return;
      }
      if (userId) {
        setIdentified(true);
        void patchVisit("identify", { userId });
      }
      const followed = interactive
        ? ["click_followed", "followed", "follow_success", "click_interaction_accepted"].includes(action)
        : true;
      if (!followed) return;
      setWidgetState("success");
      trackClientEvent("zalo_follow_success", campaign);
      void patchVisit("follow_success");
    };
    if (visitId) window.setTimeout(() => window.ZaloSocialSDK?.reload?.(), 50);
    return () => { delete window.smartFurniZaloFollowCallback; };
  }, [campaign, interactive, patchVisit, sdkKey, visitId]);

  useEffect(() => {
    const detectReturnFromZalo = () => {
      if (document.hidden) {
        if (widgetState === "ready") hiddenAt.current = Date.now();
        return;
      }
      if (hiddenAt.current && Date.now() - hiddenAt.current > 600 && widgetState === "ready") {
        setReturnedFromZalo(true);
        hiddenAt.current = 0;
      }
    };
    document.addEventListener("visibilitychange", detectReturnFromZalo);
    window.addEventListener("pageshow", detectReturnFromZalo);
    return () => {
      document.removeEventListener("visibilitychange", detectReturnFromZalo);
      window.removeEventListener("pageshow", detectReturnFromZalo);
    };
  }, [widgetState]);

  useEffect(() => {
    if (widgetState !== "preparing") return;
    const timeout = window.setTimeout(() => setWidgetState("error"), 9000);
    return () => window.clearTimeout(timeout);
  }, [sdkKey, widgetState]);

  useEffect(() => {
    if (images.length < 2) return;
    const interval = window.setInterval(() => setActiveImage(value => (value + 1) % images.length), 4800);
    return () => window.clearInterval(interval);
  }, [images.length]);

  const benefits = useMemo(() => campaign.benefits.length ? campaign.benefits : [
    "Catalogue sản phẩm mới", "Báo giá theo nhu cầu", "Tư vấn trực tiếp trên Zalo",
  ], [campaign.benefits]);

  const showChat = widgetState === "success" || returnedFromZalo;
  const moveImage = (direction: number) => {
    if (!images.length) return;
    setActiveImage(value => (value + direction + images.length) % images.length);
  };
  const finishSwipe = (clientX: number) => {
    if (touchStartX.current === null) return;
    const distance = clientX - touchStartX.current;
    if (Math.abs(distance) > 42) moveImage(distance < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const openChat = () => {
    trackClientEvent("zalo_follow_chat_open", campaign);
    void patchVisit("chat_open");
    if (!campaign.chatUrl) {
      setWidgetState("error");
      return;
    }
    window.location.href = campaign.chatUrl;
  };

  const retry = () => {
    setWidgetState("preparing");
    setSdkKey(value => value + 1);
    window.setTimeout(() => window.ZaloSocialSDK?.reload?.(), 50);
  };

  return <main className="relative min-h-[100svh] overflow-hidden bg-[#edf5ff] px-3 py-4 text-[#10213a] sm:px-6 sm:py-9">
    <Script key={sdkKey} src="https://sp.zalo.me/plugins/sdk.js" strategy="afterInteractive" onLoad={() => {
      setWidgetState("ready"); void patchVisit("sdk_loaded"); window.ZaloSocialSDK?.reload?.();
    }} onError={() => { setWidgetState("error"); void patchVisit("error", { error: "zalo_sdk_load_failed" }); }} />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_4%,rgba(0,104,255,0.18),transparent_30rem),radial-gradient(circle_at_92%_94%,rgba(227,182,64,0.18),transparent_29rem)]" />
    <div className="pointer-events-none absolute left-[-7rem] top-[18%] h-72 w-72 rounded-full border-[60px] border-white/40" />
    <div className="pointer-events-none absolute right-[-5rem] top-[-5rem] h-64 w-64 rounded-full border-[52px] border-[#0068ff]/5" />

    <section className="relative mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-[26px] border border-white/90 bg-white shadow-[0_30px_90px_rgba(20,55,95,0.18)] lg:grid-cols-[1.06fr_0.94fr]">
      <div className="border-b border-[#e5edf6] bg-[#f8fbff] lg:border-b-0 lg:border-r">
        <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(145deg,#0755ba,#1e8cff)] sm:aspect-[16/11] lg:aspect-auto lg:h-[500px]"
          onTouchStart={event => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={event => finishSwipe(event.changedTouches[0]?.clientX ?? 0)}>
          {images.length ? images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${campaign.headline} - ảnh ${index + 1}`} className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${index === activeImage ? "scale-100 opacity-100" : "scale-[1.03] opacity-0"}`} />) : null}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#062a62]/55 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#073b86]/65 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md sm:text-[11px]"><MessageCircle size={15} /> SmartFurni · Zalo OA</div>
            <div className="rounded-full border border-white/30 bg-white/20 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur-md">Official Account</div>
          </div>
          {images.length > 1 && <>
            <button type="button" aria-label="Ảnh trước" onClick={() => moveImage(-1)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-[#092a54]/45 text-white backdrop-blur transition hover:bg-[#092a54]/70"><ChevronLeft size={22} /></button>
            <button type="button" aria-label="Ảnh tiếp theo" onClick={() => moveImage(1)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-[#092a54]/45 text-white backdrop-blur transition hover:bg-[#092a54]/70"><ChevronRight size={22} /></button>
            <div className="absolute bottom-3 right-3 rounded-full bg-[#092a54]/65 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">{activeImage + 1}/{images.length}</div>
          </>}
        </div>

        {images.length > 1 && <div className="flex snap-x gap-2 overflow-x-auto border-b border-[#e3ebf4] bg-white p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((image, index) => <button key={`${image}-thumb-${index}`} type="button" onClick={() => setActiveImage(index)} className={`relative h-16 w-[88px] shrink-0 snap-start overflow-hidden rounded-xl border-2 transition ${index === activeImage ? "border-[#0877ff] shadow-[0_5px_14px_rgba(0,104,255,0.22)]" : "border-transparent opacity-70 hover:opacity-100"}`}><img src={image} alt={`Chọn ảnh ${index + 1}`} className="h-full w-full object-cover" /></button>)}
        </div>}

        <div className="p-5 sm:p-7 lg:p-9">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff2bb] px-3 py-1.5 text-xs font-bold text-[#7a5700]"><Star size={14} fill="currentColor" /> Tư vấn chính hãng</div>
          <h1 className="mt-4 text-[30px] font-black leading-[1.12] tracking-[-0.035em] text-[#10213a] sm:text-[39px] lg:text-[43px]">{campaign.headline}</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#5f728a] sm:text-base">{campaign.description}</p>
        </div>
      </div>

      <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(145deg,#1684ff,#0059dc)] p-3 text-white shadow-[0_10px_24px_rgba(0,104,255,0.28)]"><MessageCircle size={27} /></div>
          <div><div className="text-xl font-black tracking-[-0.02em]">SmartFurni</div><div className="flex items-center gap-1 text-xs font-medium text-[#63758c]"><BadgeCheck size={14} className="text-[#087cff]" /> Zalo Official Account</div></div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#dfe8f4] bg-[#f8fbff] p-4">
          <div className="text-sm font-bold text-[#21344f]">Anh/Chị sẽ nhận được</div>
          <ul className="mt-3 space-y-2.5">{benefits.map(item => <li key={item} className="flex items-start gap-2.5 text-sm leading-5 text-[#52667e]"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#dcf8ea] text-[#078455]"><Check size={13} strokeWidth={3} /></span>{item}</li>)}</ul>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-[#7bb8ff] bg-[linear-gradient(145deg,#e9f4ff,#ffffff_58%,#fff8db)] shadow-[0_18px_42px_rgba(0,104,255,0.15)]">
          {showChat ? <div className="p-5 text-center">
            <CheckCircle2 size={46} className="mx-auto text-[#08a36c]" />
            <h2 className="mt-3 text-lg font-black">{widgetState === "success" ? "Đã ghi nhận Quan tâm" : "Tiếp tục trên Zalo"}</h2>
            <p className="mt-1 text-sm leading-6 text-[#66798f]">{widgetState === "success" ? "SmartFurni đã sẵn sàng tư vấn và gửi báo giá qua Zalo OA." : "Nếu Anh/Chị vừa Quan tâm trong ứng dụng Zalo, hãy bấm nút dưới đây để mở hội thoại."}</p>
            <button type="button" onClick={openChat} className="group mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1181ff,#005ae0)] px-5 text-base font-black text-white shadow-[0_12px_28px_rgba(0,104,255,0.30)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(0,104,255,0.36)]"><MessageCircle size={20} /> Nhắn tin cho SmartFurni <ArrowRight size={18} className="transition group-hover:translate-x-1" /></button>
          </div> : <div className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0068ff] text-white shadow-[0_8px_18px_rgba(0,104,255,0.28)]"><span className="absolute inset-0 animate-ping rounded-2xl bg-[#1684ff]/20" /><Sparkles size={20} className="relative" /></div>
              <div><div className="font-black text-[#102c55]">Bấm Quan tâm để nhận báo giá</div><p className="mt-0.5 text-xs leading-5 text-[#617894]">Nút xanh chính thức của Zalo · Chỉ mất vài giây</p></div>
            </div>
            <div className="relative mt-4 flex min-h-[70px] items-center justify-center rounded-2xl border border-[#80baff] bg-[linear-gradient(135deg,#0878ff,#0058d5)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_24px_rgba(0,104,255,0.22)]">
              <div className="pointer-events-none absolute left-4 hidden items-center gap-1.5 text-xs font-bold text-white/90 sm:flex"><ArrowRight size={17} /> NHẤN NÚT</div>
              {widgetState === "preparing" && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#0873ed] text-sm font-bold text-white"><Loader2 size={19} className="mr-2 animate-spin" /> Đang tải nút Quan tâm...</div>}
              <div className="relative z-20 origin-center scale-[1.28] rounded-lg bg-white/10 p-1">
                {interactive ? <div ref={node => { if (node) { node.setAttribute("user_external_id", visitId); node.setAttribute("status", "show"); } }} className="zalo-interaction-widget" data-oaid={campaign.oaId} data-appid={appId} data-callback="smartFurniZaloFollowCallback" data-reason-msg="SmartFurni xin phép kết nối để gửi tư vấn và báo giá theo yêu cầu của Anh/Chị." /> : <div className="zalo-follow-only-button" data-oaid={campaign.oaId} data-callback="smartFurniZaloFollowCallback" />}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#3b668f]"><ShieldCheck size={14} className="text-[#12936a]" /> Không cần điền biểu mẫu, không mất phí</div>
            {widgetState === "error" && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs leading-5 text-amber-800"><div className="font-bold">Nút Zalo chưa tải được</div><div>Hãy thử tải lại hoặc mở trực tiếp Zalo OA SmartFurni.</div><div className="mt-2 flex gap-2"><button type="button" onClick={retry} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 font-bold"><RefreshCw size={14} /> Thử lại</button><button type="button" onClick={() => { void patchVisit("fallback_open"); openChat(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0068ff] px-3 py-2 font-bold text-white"><ExternalLink size={14} /> Mở Zalo</button></div></div>}
          </div>}
        </div>

        <div className="mt-5 flex items-start gap-2.5 text-xs leading-5 text-[#77899e]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#15976c]" /><span>Nút Quan tâm được tải từ SDK chính thức của Zalo. SmartFurni chỉ dùng dữ liệu để tư vấn, đo hiệu quả chiến dịch và chăm sóc khách hàng.</span></div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-[#edf1f5] pt-4 text-[11px] font-medium text-[#91a0b2]"><span className="inline-flex items-center gap-1"><Tag size={13} /> {campaign.name}</span><span className="inline-flex items-center gap-1"><Images size={13} /> {images.length || 0} ảnh</span>{identified && <span className="inline-flex items-center gap-1 text-[#08865e]"><CheckCircle2 size={13} /> Đã xác minh nguồn</span>}</div>
      </div>
    </section>
  </main>;
}
