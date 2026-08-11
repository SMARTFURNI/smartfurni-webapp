"use client";

import Script from "next/script";
import {
  ArrowRight, BadgeCheck, Check, CheckCircle2, ChevronLeft, ChevronRight,
  ExternalLink, Images, Loader2, MessageCircle, RefreshCw, ShieldCheck,
  Sparkles, Star, Tag, Phone, X, Quote, Ruler, PackageCheck, ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicZaloFollowCampaign } from "@/lib/zalo-follow-campaign-store";
import { isLikelyMobileZaloVisitor, isZaloFollowSuccessAction } from "@/lib/zalo-follow-links";
import { normalizeZaloLeadPhone } from "@/lib/zalo-follow-lead";

type WidgetState = "preparing" | "ready" | "success" | "error";
const REASON_ICONS = [BadgeCheck, Ruler, PackageCheck, ThumbsUp];

declare global {
  interface Window {
    ZaloSocialSDK?: { reload?: () => void };
    smartFurniZaloFollowCallback?: (data?: Record<string, unknown>) => void;
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function trackClientEvent(name: string, campaign: PublicZaloFollowCampaign) {
  const params = new URLSearchParams(window.location.search);
  const payload = {
    event: name,
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    product_key: campaign.productKey,
    traffic_source: params.get("utm_source") || "direct",
    traffic_campaign: params.get("utm_campaign") || campaign.slug,
  };
  window.dataLayer?.push(payload);
  window.gtag?.("event", name, { campaign_id: campaign.id, campaign_name: campaign.name, product_key: campaign.productKey });
  window.fbq?.("trackCustom", name, payload);
  if (name === "zalo_oa_open" || name === "zalo_follow_chat_open") window.fbq?.("track", "Contact", payload);
  if (name === "zalo_follow_success") window.fbq?.("track", "Lead", payload);
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
  const [mobileMode, setMobileMode] = useState<boolean | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadChoice, setLeadChoice] = useState("");
  const [leadQualifier, setLeadQualifier] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadSuccess, setLeadSuccess] = useState(false);
  const started = useRef(false);
  const hiddenAt = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const widgetHostRef = useRef<HTMLDivElement | null>(null);
  const followSectionRef = useRef<HTMLDivElement | null>(null);
  const leadDialogRef = useRef<HTMLDivElement | null>(null);
  const interactive = Boolean(appId) && campaign.widgetMode === "interactive";
  const widgetCanRender = mobileMode === false;
  const images = useMemo(() => {
    const values = campaign.galleryImages?.length ? campaign.galleryImages : campaign.heroImage ? [campaign.heroImage] : [];
    return Array.from(new Set(values.map(item => item.trim()).filter(Boolean)));
  }, [campaign.galleryImages, campaign.heroImage]);
  const landingConfig = campaign.landingConfig;
  const leadOptions = landingConfig.leadOptions;
  const leadQualifierConfig = useMemo(() => ({
    label: landingConfig.qualifierLabel,
    values: landingConfig.qualifierValues,
  }), [landingConfig.qualifierLabel, landingConfig.qualifierValues]);

  const patchVisit = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    if (!visitId) return;
    await fetch(`/api/zalo-follow/${encodeURIComponent(campaign.slug)}/visit`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, visitId, ...extra }), keepalive: true,
    }).catch(() => undefined);
  }, [campaign.slug, visitId]);

  useEffect(() => {
    const updateMobileMode = () => setMobileMode(isLikelyMobileZaloVisitor(navigator.userAgent, window.innerWidth));
    updateMobileMode();
    window.addEventListener("resize", updateMobileMode);
    return () => window.removeEventListener("resize", updateMobileMode);
  }, []);

  useEffect(() => {
    document.body.classList.add("zalo-follow-landing-active");
    return () => document.body.classList.remove("zalo-follow-landing-active");
  }, []);

  useEffect(() => {
    setLeadChoice(leadOptions[0]?.id || "");
    setLeadQualifier("");
    setLeadError("");
    setLeadSuccess(false);
  }, [campaign.id, leadOptions]);

  useEffect(() => {
    if (window.sessionStorage.getItem(`sf_zalo_lead_complete:${campaign.id}`) === "1") return;
    const timer = window.setTimeout(() => setLeadOpen(true), 850);
    return () => window.clearTimeout(timer);
  }, [campaign.id]);

  useEffect(() => {
    if (!leadOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    trackClientEvent("zalo_lead_popup_open", campaign);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLeadOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => leadDialogRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [campaign, leadOpen]);

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
      if (action === "updated_follow_widget" || action === "click_interaction_accepted") {
        setWidgetState("ready");
      }
      const followed = isZaloFollowSuccessAction(action, interactive);
      if (!followed) return;
      setWidgetState("success");
      setReturnedFromZalo(false);
      window.sessionStorage.removeItem(`sf_zalo_follow_pending:${campaign.id}`);
      trackClientEvent("zalo_follow_success", campaign);
      void patchVisit("follow_success");
    };
    if (visitId && widgetCanRender) window.setTimeout(() => window.ZaloSocialSDK?.reload?.(), 50);
    return () => { delete window.smartFurniZaloFollowCallback; };
  }, [campaign, interactive, patchVisit, sdkKey, visitId, widgetCanRender]);

  useEffect(() => {
    if (!visitId || !widgetCanRender || widgetState === "success" || widgetState === "error") return;
    const host = widgetHostRef.current;
    if (!host) return;
    const detectRenderedWidget = () => {
      const rendered = Boolean(host.querySelector(".zalo-follow-only-button iframe, .zalo-consent-widget iframe"));
      if (!rendered) return false;
      setWidgetState(current => current === "success" ? current : "ready");
      return true;
    };
    if (detectRenderedWidget()) return;
    const observer = new MutationObserver(detectRenderedWidget);
    observer.observe(host, { childList: true, subtree: true, attributes: true });
    const timeout = window.setTimeout(() => {
      if (!detectRenderedWidget()) {
        setWidgetState(current => current === "success" ? current : "error");
        void patchVisit("error", { error: "zalo_widget_not_rendered" });
      }
    }, 7000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [patchVisit, sdkKey, visitId, widgetCanRender, widgetState]);

  useEffect(() => {
    const pendingKey = `sf_zalo_follow_pending:${campaign.id}`;
    const markLeavingForZalo = () => {
      if (widgetState !== "ready" && !window.sessionStorage.getItem(pendingKey)) return;
      const now = Date.now();
      hiddenAt.current = now;
      window.sessionStorage.setItem(pendingKey, String(now));
    };
    const detectReturnFromZalo = () => {
      if (document.hidden) {
        markLeavingForZalo();
        return;
      }
      const pendingAt = hiddenAt.current || Number(window.sessionStorage.getItem(pendingKey) || 0);
      if (pendingAt && Date.now() - pendingAt > 500 && widgetState !== "success") {
        setReturnedFromZalo(true);
        hiddenAt.current = 0;
        window.sessionStorage.removeItem(pendingKey);
      }
    };
    document.addEventListener("visibilitychange", detectReturnFromZalo);
    window.addEventListener("pagehide", markLeavingForZalo);
    window.addEventListener("pageshow", detectReturnFromZalo);
    window.addEventListener("focus", detectReturnFromZalo);
    detectReturnFromZalo();
    return () => {
      document.removeEventListener("visibilitychange", detectReturnFromZalo);
      window.removeEventListener("pagehide", markLeavingForZalo);
      window.removeEventListener("pageshow", detectReturnFromZalo);
      window.removeEventListener("focus", detectReturnFromZalo);
    };
  }, [campaign.id, widgetState]);

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

  const openOaForFollow = () => {
    if (!campaign.chatUrl) {
      setWidgetState("error");
      return;
    }
    const pendingKey = `sf_zalo_follow_pending:${campaign.id}`;
    const now = Date.now();
    hiddenAt.current = now;
    window.sessionStorage.setItem(pendingKey, String(now));
    trackClientEvent("zalo_oa_open", campaign);
    void patchVisit("fallback_open");
    window.location.href = campaign.chatUrl;
  };

  const retry = () => {
    window.sessionStorage.removeItem(`sf_zalo_follow_pending:${campaign.id}`);
    setReturnedFromZalo(false);
    setWidgetState("preparing");
    setSdkKey(value => value + 1);
    window.setTimeout(() => window.ZaloSocialSDK?.reload?.(), 50);
  };

  const continueToFollow = () => {
    setLeadOpen(false);
    if (mobileMode) {
      openOaForFollow();
      return;
    }
    window.setTimeout(() => followSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setLeadError("");
    const normalizedPhone = normalizeZaloLeadPhone(leadPhone);
    if (leadName.trim().length < 2) {
      setLeadError("Vui lòng nhập tên để SmartFurni tiện xưng hô.");
      return;
    }
    if (!normalizedPhone) {
      setLeadError("Số điện thoại chưa đúng. Vui lòng nhập 10 số, bắt đầu bằng 0.");
      return;
    }
    if (!leadChoice || !leadQualifier) {
      setLeadError("Vui lòng chọn nhu cầu và thông tin kích thước phù hợp.");
      return;
    }

    const selectedChoice = leadOptions.find(option => option.id === leadChoice);
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source") || params.get("source") || "";
    const utmMedium = params.get("utm_medium") || params.get("placement") || "";
    const utmCampaign = params.get("utm_campaign") || params.get("campaign") || campaign.slug;
    const utmContent = params.get("utm_content") || params.get("ad") || "";
    const attributionNote = [
      params.get("adgroup") ? `Nhóm quảng cáo: ${params.get("adgroup")}` : "",
      params.get("placement") ? `Vị trí: ${params.get("placement")}` : "",
    ].filter(Boolean).join(" | ");

    setLeadLoading(true);
    trackClientEvent("zalo_lead_form_submit", campaign);
    try {
      const response = await fetch("/api/lp/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landingPageSlug: campaign.slug,
          name: leadName.trim(),
          phone: normalizedPhone,
          email: "",
          note: [
            `Landing Quan tâm Zalo OA: ${campaign.name}`,
            `Nhu cầu: ${selectedChoice?.label || leadChoice}`,
            `${leadQualifierConfig.label}: ${leadQualifier}`,
            attributionNote,
          ].filter(Boolean).join(" | "),
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Chưa thể gửi yêu cầu. Vui lòng thử lại.");
      window.sessionStorage.setItem(`sf_zalo_lead_complete:${campaign.id}`, "1");
      setLeadSuccess(true);
      trackClientEvent("zalo_lead_form_success", campaign);
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : "Chưa thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setLeadLoading(false);
    }
  };

  return <main className="relative min-h-[100svh] overflow-hidden bg-[#edf5ff] px-2 pb-28 pt-2 text-[#10213a] sm:px-6 sm:pb-32 sm:pt-9">
    <style jsx global>{`
      body.zalo-follow-landing-active > .no-print.fixed {
        display: none !important;
      }
    `}</style>
    <Script key={sdkKey} src="https://sp.zalo.me/plugins/sdk.js" strategy="afterInteractive" onLoad={() => {
      void patchVisit("sdk_loaded"); window.ZaloSocialSDK?.reload?.();
    }} onError={() => { setWidgetState("error"); void patchVisit("error", { error: "zalo_sdk_load_failed" }); }} />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_4%,rgba(0,104,255,0.18),transparent_30rem),radial-gradient(circle_at_92%_94%,rgba(227,182,64,0.18),transparent_29rem)]" />
    <div className="pointer-events-none absolute left-[-7rem] top-[18%] h-72 w-72 rounded-full border-[60px] border-white/40" />
    <div className="pointer-events-none absolute right-[-5rem] top-[-5rem] h-64 w-64 rounded-full border-[52px] border-[#0068ff]/5" />

    <section className="relative mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-[0_24px_70px_rgba(20,55,95,0.16)] lg:grid-cols-[1.06fr_0.94fr] lg:rounded-[26px] lg:shadow-[0_30px_90px_rgba(20,55,95,0.18)]">
      <div className="contents lg:block lg:min-w-0 lg:border-r lg:border-[#e5edf6] lg:bg-[#f8fbff]">
        <div className="relative order-1 aspect-square w-full min-w-0 overflow-hidden bg-[linear-gradient(145deg,#0755ba,#1e8cff)] lg:order-none"
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

        {images.length > 1 && <div className="order-2 flex min-w-0 snap-x gap-2 overflow-x-auto border-b border-[#e3ebf4] bg-white p-3 [scrollbar-width:none] lg:order-none [&::-webkit-scrollbar]:hidden">
          {images.map((image, index) => <button key={`${image}-thumb-${index}`} type="button" onClick={() => setActiveImage(index)} className={`relative h-16 w-[88px] shrink-0 snap-start overflow-hidden rounded-xl border-2 transition ${index === activeImage ? "border-[#0877ff] shadow-[0_5px_14px_rgba(0,104,255,0.22)]" : "border-transparent opacity-70 hover:opacity-100"}`}><img src={image} alt={`Chọn ảnh ${index + 1}`} className="h-full w-full object-cover" /></button>)}
        </div>}

        <div className="order-3 min-w-0 border-b border-[#e6edf5] bg-white p-5 sm:p-7 lg:order-none lg:bg-[#f8fbff] lg:p-9">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff2bb] px-3 py-1.5 text-xs font-bold text-[#7a5700]"><Star size={14} fill="currentColor" /> {landingConfig.authorityLabel}</div>
          <h1 className="mt-4 break-words text-[30px] font-black leading-[1.12] tracking-[-0.035em] text-[#10213a] sm:text-[39px] lg:text-[43px]">{campaign.headline}</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#5f728a] sm:text-base">{campaign.description}</p>
          <div className="mt-5 rounded-2xl border border-[#edd47c] bg-[linear-gradient(135deg,#fffdf5,#fff4ca)] p-4 shadow-[0_10px_26px_rgba(169,119,18,0.09)]">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,#f5d66f,#d4a52b)] text-[#4d3700]"><Sparkles size={19} /></span>
              <div className="min-w-0"><div className="text-sm font-black text-[#5b4100]">{campaign.offerTitle}</div><p className="mt-1 text-xs leading-5 text-[#806728]">{campaign.offerDescription}</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-[#72550d]"><span className="rounded-full border border-[#ead486] bg-white/70 px-2.5 py-1">1 nội dung hữu ích / tuần</span><span className="rounded-full border border-[#ead486] bg-white/70 px-2.5 py-1">Tối đa 4 tin / tháng</span><span className="rounded-full border border-[#ead486] bg-white/70 px-2.5 py-1">Có thể bỏ Quan tâm bất kỳ lúc nào</span></div>
          </div>
        </div>
      </div>

      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:justify-center lg:p-10">
        <div className="hidden min-w-0 items-center gap-3 lg:order-none lg:mx-0 lg:mt-0 lg:flex">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(145deg,#1684ff,#0059dc)] p-3 text-white shadow-[0_10px_24px_rgba(0,104,255,0.28)]"><MessageCircle size={27} /></div>
          <div><div className="text-xl font-black tracking-[-0.02em]">SmartFurni</div><div className="flex items-center gap-1 text-xs font-medium text-[#63758c]"><BadgeCheck size={14} className="text-[#087cff]" /> Zalo Official Account</div></div>
        </div>

        <div className="order-4 mx-4 mt-4 rounded-2xl border border-[#d9e7f7] bg-[#f6faff] p-4 sm:mx-8 lg:order-none lg:mx-0 lg:mt-6">
          <div className="text-sm font-bold text-[#21344f]">Anh/Chị sẽ nhận được</div>
          <ul className="mt-3 space-y-2.5">{benefits.map(item => <li key={item} className="flex items-start gap-2.5 text-sm leading-5 text-[#52667e]"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#dcf8ea] text-[#078455]"><Check size={13} strokeWidth={3} /></span>{item}</li>)}</ul>
        </div>

        <div ref={followSectionRef} className="order-5 mx-3 mt-4 min-w-0 overflow-hidden rounded-[22px] border-2 border-[#cfe4ff] bg-white shadow-[0_16px_38px_rgba(0,104,255,0.14)] sm:mx-8 lg:order-none lg:mx-0 lg:mt-6 lg:rounded-[26px] lg:shadow-[0_20px_48px_rgba(0,104,255,0.16)]">
          {showChat ? <div className="p-5 text-center">
            <CheckCircle2 size={46} className="mx-auto text-[#08a36c]" />
            <h2 className="mt-3 text-lg font-black">{widgetState === "success" ? "Đã ghi nhận Quan tâm" : "Tiếp tục trên Zalo"}</h2>
            <p className="mt-1 text-sm leading-6 text-[#66798f]">{widgetState === "success" ? "SmartFurni đã sẵn sàng tư vấn và gửi báo giá qua Zalo OA." : "Nếu Anh/Chị vừa Quan tâm trong ứng dụng Zalo, hãy bấm nút dưới đây để mở hội thoại."}</p>
            <button type="button" onClick={openChat} className="group mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1181ff,#005ae0)] px-5 text-base font-black text-white shadow-[0_12px_28px_rgba(0,104,255,0.30)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(0,104,255,0.36)]"><MessageCircle size={20} /> Nhắn tin cho SmartFurni <ArrowRight size={18} className="transition group-hover:translate-x-1" /></button>
          </div> : <div className="bg-[linear-gradient(145deg,#087cff,#0055d4)] p-4 sm:p-5">
            <div className="flex items-start gap-3 text-white">
              <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#0874ed] shadow-[0_10px_24px_rgba(0,31,84,0.22)]"><span className="absolute inset-0 animate-ping rounded-2xl bg-white/20" /><Sparkles size={22} className="relative" /></div>
              <div className="min-w-0"><div className="text-[17px] font-black leading-6 sm:text-lg">{campaign.offerTitle}</div><p className="mt-1 text-xs leading-5 text-white/80 sm:text-sm">{mobileMode ? "Mở trang OA chính thức và bấm Quan tâm · Chỉ mất vài giây" : "Chạm nút chính thức của Zalo bên dưới · Chỉ mất vài giây"}</p></div>
            </div>
            {mobileMode ? <div className="mt-4 rounded-[18px] border border-white/90 bg-white p-3 shadow-[0_14px_32px_rgba(0,35,95,0.28)]">
              <button type="button" onClick={openOaForFollow} className="group inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1687ff,#005bdc)] px-5 py-4 text-center text-[16px] font-black leading-5 text-white shadow-[0_12px_26px_rgba(0,104,255,0.28)] active:scale-[0.99]"><MessageCircle size={21} className="shrink-0" /> {campaign.ctaLabel}<ArrowRight size={18} className="shrink-0 transition group-hover:translate-x-1" /></button>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-[#536a84]"><span className="rounded-xl bg-[#f1f7ff] px-2 py-2">1. Mở Zalo</span><span className="rounded-xl bg-[#f1f7ff] px-2 py-2">2. Bấm Quan tâm</span><span className="rounded-xl bg-[#f1f7ff] px-2 py-2">3. Nhận tư vấn</span></div>
            </div> : <div ref={widgetHostRef} className="relative mt-4 flex min-h-[76px] w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-[18px] border border-white/90 bg-white px-3 py-3 shadow-[0_14px_32px_rgba(0,35,95,0.28)] sm:min-h-[88px] sm:rounded-[20px]">
              {widgetState === "error" ? <div className="flex w-full flex-col items-center px-1 py-1 text-center">
                <div className="text-sm font-black text-[#17385f]">Zalo chưa tải được nút Quan tâm</div>
                <p className="mt-1 text-xs leading-5 text-[#6a7e95]">Mở Zalo OA SmartFurni để Quan tâm và nhận tư vấn.</p>
                <button type="button" onClick={() => { void patchVisit("fallback_open"); openChat(); }} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1181ff,#005ae0)] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(0,104,255,0.25)]"><ExternalLink size={17} /> Mở Zalo để Quan tâm</button>
                <button type="button" onClick={retry} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-[#1766bd]"><RefreshCw size={13} /> Tải lại nút</button>
              </div> : <>
                {widgetState === "preparing" && <div className="absolute inset-0 z-30 flex items-center justify-center bg-white text-sm font-bold text-[#1766bd]"><Loader2 size={19} className="mr-2 animate-spin" /> Đang tải nút Quan tâm...</div>}
                <div className={`relative z-20 flex w-full min-w-0 origin-center justify-center [&_iframe]:max-w-full ${interactive ? "scale-100 lg:scale-[1.12]" : "scale-100 sm:scale-[1.18] lg:scale-[1.42]"}`}>
                  {widgetCanRender ? interactive ? <div ref={node => { if (node) { node.setAttribute("user_external_id", visitId); node.setAttribute("status", "show"); } }} className="zalo-consent-widget zalo-interaction-widget" data-oaid={campaign.oaId} data-appid={appId} data-callback="smartFurniZaloFollowCallback" data-reason-msg="SmartFurni xin phép kết nối để gửi tư vấn và báo giá theo yêu cầu của Anh/Chị." /> : <div className="zalo-follow-only-button" data-oaid={campaign.oaId} data-callback="smartFurniZaloFollowCallback" /> : null}
                </div>
              </>}
            </div>}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-white/90"><ShieldCheck size={14} className="shrink-0 text-[#a9ffd9]" /> Không cần điền biểu mẫu · Không mất phí · Tư vấn trên Zalo</div>
          </div>}
        </div>

        <div className="order-6 mx-5 mt-5 flex min-w-0 items-start gap-2.5 text-xs leading-5 text-[#77899e] sm:mx-8 lg:order-none lg:mx-0"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#15976c]" /><span>Nút Quan tâm được tải từ SDK chính thức của Zalo. SmartFurni chỉ dùng dữ liệu để tư vấn, đo hiệu quả chiến dịch và chăm sóc khách hàng.</span></div>
        <div className="order-7 mx-5 mb-5 mt-4 flex min-w-0 flex-wrap items-center justify-center gap-4 border-t border-[#edf1f5] pt-4 text-[11px] font-medium text-[#91a0b2] sm:mx-8 sm:mb-8 lg:order-none lg:mx-0 lg:mb-0"><span className="inline-flex items-center gap-1"><Tag size={13} /> {campaign.name}</span><span className="inline-flex items-center gap-1"><Images size={13} /> {images.length || 0} ảnh</span>{identified && <span className="inline-flex items-center gap-1 text-[#08865e]"><CheckCircle2 size={13} /> Đã xác minh nguồn</span>}</div>
      </div>
    </section>

    <section className="relative mx-auto mt-4 w-full max-w-[1180px] overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-[0_18px_48px_rgba(20,55,95,0.10)]">
      <div className="grid grid-cols-2 divide-x divide-y divide-[#e3edf6] sm:grid-cols-4 sm:divide-y-0">
        {landingConfig.trustStats.map(item => <div key={`${item.value}-${item.label}`} className="px-3 py-4 text-center sm:px-4 sm:py-5"><strong className="block text-sm font-black text-[#0870e8] sm:text-base">{item.value}</strong><span className="mt-1 block text-[11px] font-semibold text-[#75879c] sm:text-xs">{item.label}</span></div>)}
      </div>

      <div className="border-t border-[#e6edf5] px-4 py-7 sm:px-8 sm:py-10">
        <div className="text-center"><div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0877ff]">SmartFurni đồng hành cùng Anh/Chị</div><h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-[#10213a] sm:text-3xl">{landingConfig.reasonTitle}</h2></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {landingConfig.reasonCards.map((item, index) => {
            const Icon = REASON_ICONS[index % REASON_ICONS.length];
            return <article key={`${item.title}-${index}`} className="rounded-2xl border border-[#dce7f2] bg-[linear-gradient(145deg,#ffffff,#f7fbff)] p-4 shadow-[0_8px_22px_rgba(30,65,105,0.06)]"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf4ff] text-[#0877ff]"><Icon size={21} /></div><h3 className="mt-3 text-sm font-black text-[#17304f]">{item.title}</h3><p className="mt-1.5 text-xs leading-5 text-[#718399]">{item.description}</p></article>;
          })}
        </div>
      </div>

      {landingConfig.testimonials.length > 0 && <div className="border-t border-[#e6edf5] bg-[#f8fbff] px-4 py-7 sm:px-8 sm:py-10">
        <h2 className="text-center text-2xl font-black tracking-[-0.025em] text-[#10213a]">{landingConfig.testimonialTitle}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {landingConfig.testimonials.map((item, index) => <article key={`${item.name}-${index}`} className="rounded-2xl border border-[#dae6f1] bg-white p-5 shadow-[0_8px_22px_rgba(30,65,105,0.06)]"><div className="flex items-center justify-between"><div className="flex text-[#e4a40e]">{Array.from({ length: 5 }).map((_, star) => <Star key={star} size={15} fill="currentColor" />)}</div><Quote size={22} className="text-[#b9d8fa]" /></div><p className="mt-3 text-sm leading-6 text-[#40556e]">“{item.quote}”</p><div className="mt-3 text-xs font-black text-[#203752]">{item.name}{item.location && <span className="font-semibold text-[#8291a3]"> · {item.location}</span>}</div></article>)}
        </div>
      </div>}

      <div className="border-t border-[#e6edf5] px-4 py-6 sm:px-8 sm:py-8">
        <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#087fff,#0057d8)] px-5 py-7 text-center text-white shadow-[0_18px_42px_rgba(0,92,220,0.25)] sm:px-8 sm:py-9"><div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[30px] border-white/10" /><h2 className="relative text-xl font-black sm:text-2xl">{landingConfig.finalCtaTitle}</h2><p className="relative mx-auto mt-2 max-w-xl text-sm leading-6 text-blue-50/90">{landingConfig.finalCtaDescription}</p><button type="button" onClick={() => { setLeadSuccess(false); setLeadOpen(true); }} className="relative mt-5 inline-flex min-h-14 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ffe57f,#e7ad1b)] px-5 text-base font-black text-[#342600] shadow-[0_12px_28px_rgba(17,49,92,0.28)]"><Sparkles size={19} /> {landingConfig.finalCtaLabel}<ArrowRight size={18} /></button></div>
      </div>
    </section>

    {!leadOpen && <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[990] flex justify-center px-2 pb-[calc(8px+env(safe-area-inset-bottom))] sm:px-5 sm:pb-[calc(14px+env(safe-area-inset-bottom))]"><div className="pointer-events-auto grid w-full max-w-[620px] grid-cols-2 gap-2 rounded-[20px] border border-white/80 bg-white/95 p-2 shadow-[0_18px_55px_rgba(6,34,76,0.26)] backdrop-blur-xl"><button type="button" onClick={openOaForFollow} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-2 border-[#0877ff] bg-white px-3 text-sm font-black text-[#0870e8]"><MessageCircle size={18} /> Mở Zalo ngay</button><button type="button" onClick={() => { setLeadSuccess(false); setLeadOpen(true); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#ffe16f,#e5ad1c)] px-3 text-sm font-black text-[#362700] shadow-[0_8px_20px_rgba(202,148,10,0.23)]"><Sparkles size={17} /> {landingConfig.finalCtaLabel}</button></div></div>}

    {leadOpen && <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-[#071326]/75 p-0 backdrop-blur-[5px] sm:items-center sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setLeadOpen(false); }}>
      <div ref={leadDialogRef} role="dialog" aria-modal="true" aria-labelledby="zalo-lead-title" tabIndex={-1} className="relative max-h-[96dvh] w-full overflow-y-auto rounded-t-[28px] bg-white text-[#10213a] shadow-[0_32px_100px_rgba(0,0,0,0.42)] outline-none sm:max-w-[760px] sm:rounded-[28px]">
        <button type="button" onClick={() => setLeadOpen(false)} aria-label="Đóng form" className="absolute right-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/45 bg-[#07326d]/55 text-white backdrop-blur-md transition hover:bg-[#05234d]"><X size={20} /></button>

        <header className="relative overflow-hidden bg-[linear-gradient(135deg,#005be8_0%,#0788ff_58%,#43adff_100%)] px-5 pb-5 pt-6 text-white sm:px-7 sm:pb-6">
          <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[28px] border-white/10" />
          <div className="relative flex items-start gap-3 sm:gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/50 bg-white/95 text-[#0877f9] shadow-[0_10px_25px_rgba(0,43,112,0.22)]"><MessageCircle size={29} /></div>
            <div className="min-w-0 pr-8">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-100 sm:text-xs"><BadgeCheck size={15} /> SmartFurni · Zalo Official Account</div>
              <h2 id="zalo-lead-title" className="mt-2 text-[22px] font-black leading-[1.18] tracking-[-0.025em] sm:text-[30px]">{landingConfig.popupTitle}</h2>
              <p className="mt-2 text-sm leading-5 text-blue-50/90 sm:text-[15px] sm:leading-6">{landingConfig.popupDescription}</p>
            </div>
          </div>
          <button type="button" onClick={openOaForFollow} className="relative mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/45 bg-white/16 px-3.5 py-3 text-left text-white shadow-inner backdrop-blur-sm transition hover:bg-white/22">
            <span className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#0877f9]"><MessageCircle size={22} /></span><span className="min-w-0"><strong className="block text-sm">Đã dùng Zalo? Quan tâm OA ngay</strong><span className="block truncate text-xs text-blue-100">Mở Zalo chính thức của SmartFurni</span></span></span><ArrowRight size={20} />
          </button>
        </header>

        {leadSuccess ? <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-10 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={45} /></div>
          <h3 className="mt-5 text-2xl font-black">SmartFurni đã nhận yêu cầu</h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#66798f]">Chuyên viên sẽ liên hệ để gửi thông tin phù hợp. Bước tiếp theo, Anh/Chị hãy Quan tâm Zalo OA để nhận tư vấn và các nội dung chăm sóc hữu ích.</p>
          <button type="button" onClick={continueToFollow} className="mt-6 inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1181ff,#005ae0)] px-5 text-base font-black text-white shadow-[0_12px_28px_rgba(0,104,255,0.30)]"><MessageCircle size={20} /> {mobileMode ? "Mở Zalo và bấm Quan tâm" : "Tiếp tục Quan tâm Zalo OA"} <ArrowRight size={18} /></button>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#6d7f94]"><ShieldCheck size={15} className="text-emerald-600" /> Không mất phí · Có thể bỏ Quan tâm bất kỳ lúc nào</div>
        </div> : <form onSubmit={submitLead} className="px-4 py-5 sm:px-7 sm:py-6">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900"><Sparkles size={16} className="shrink-0 text-amber-600" /> Chỉ mất khoảng 30 giây · Không cần thanh toán · Không spam</div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-[#233651]">Tên của Anh/Chị <span className="text-red-500">*</span><input value={leadName} onChange={event => setLeadName(event.target.value)} autoComplete="name" placeholder="Nguyễn Văn A" className="mt-1.5 h-12 w-full rounded-xl border border-[#cfdae8] bg-white px-4 text-[15px] font-medium text-[#12243e] outline-none transition placeholder:text-[#a8b4c4] focus:border-[#0877f9] focus:ring-4 focus:ring-blue-100" /></label>
            <label className="block text-sm font-bold text-[#233651]">Số điện thoại <span className="text-red-500">*</span><span className="relative mt-1.5 block"><Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7c8ca0]" /><input value={leadPhone} onChange={event => setLeadPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="09xx xxx xxx" className="h-12 w-full rounded-xl border border-[#cfdae8] bg-white pl-11 pr-4 text-[15px] font-medium text-[#12243e] outline-none transition placeholder:text-[#a8b4c4] focus:border-[#0877f9] focus:ring-4 focus:ring-blue-100" /></span></label>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-black text-[#182c48]">Anh/Chị đang quan tâm nhu cầu nào? <span className="text-red-500">*</span></legend>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
              {leadOptions.map((option, index) => {
                const selected = option.id === leadChoice;
                const image = option.image || images[index % Math.max(images.length, 1)] || campaign.heroImage;
                return <button key={option.id} type="button" onClick={() => setLeadChoice(option.id)} className={`relative flex min-h-[88px] items-center gap-3 rounded-2xl border p-3 text-left transition sm:block ${selected ? "border-[#0877f9] bg-blue-50 shadow-[0_0_0_2px_rgba(8,119,249,0.10)]" : "border-[#dce4ee] bg-white hover:border-[#95bff2]"}`}>
                  {image ? <img src={image} alt="" className="h-14 w-16 shrink-0 rounded-xl object-cover sm:h-16 sm:w-full" /> : <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0877f9] sm:h-16 sm:w-full"><Sparkles size={23} /></span>}
                  <span className="min-w-0 sm:mt-2 sm:block">{option.badge && <span className="mb-1 inline-flex rounded-full bg-[#fff0b8] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#765300]">{option.badge}</span>}<strong className="block text-[13px] leading-4 text-[#172b46]">{option.label}</strong><span className="mt-1 block text-[11px] leading-4 text-[#6f7f92]">{option.description}</span>{option.price && <span className="mt-1.5 inline-flex rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{option.price}</span>}</span>
                  <span className={`absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full border ${selected ? "border-[#0877f9] bg-[#0877f9] text-white" : "border-[#c7d2df] bg-white text-transparent"}`}><Check size={13} /></span>
                </button>;
              })}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-black text-[#182c48]">{leadQualifierConfig.label} <span className="text-red-500">*</span></legend>
            <div className="mt-2.5 flex flex-wrap gap-2">{leadQualifierConfig.values.map(value => <button key={value} type="button" onClick={() => setLeadQualifier(value)} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${leadQualifier === value ? "border-[#0877f9] bg-[#0877f9] text-white shadow-[0_5px_14px_rgba(8,119,249,0.22)]" : "border-[#d4deea] bg-[#f8fafc] text-[#50627a] hover:border-[#91b9ec]"}`}>{value}</button>)}</div>
          </fieldset>

          {leadError && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{leadError}</div>}
          <button type="submit" disabled={leadLoading} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ffdf69_0%,#e8ad18_100%)] px-5 py-3 text-[15px] font-black uppercase tracking-[0.025em] text-[#302300] shadow-[0_12px_28px_rgba(210,157,20,0.28)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">{leadLoading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />} {leadLoading ? "Đang gửi yêu cầu..." : "Nhận báo giá & ưu đãi ngay"}</button>
          <div className="mt-3 flex items-start justify-center gap-2 text-center text-[11px] leading-4 text-[#718198]"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" /> Thông tin chỉ dùng để tư vấn sản phẩm và chăm sóc khách hàng, không chia sẻ cho bên thứ ba.</div>
        </form>}
      </div>
    </div>}
  </main>;
}
