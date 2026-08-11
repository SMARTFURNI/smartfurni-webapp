"use client";

import Script from "next/script";
import {
  BadgeCheck, Check, CheckCircle2, ExternalLink, Loader2, MessageCircle,
  RefreshCw, ShieldCheck, Sparkles, Star, Tag,
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
  const started = useRef(false);
  const interactive = campaign.widgetMode === "interactive" && Boolean(appId);

  const patchVisit = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    if (!visitId) return;
    await fetch(`/api/zalo-follow/${encodeURIComponent(campaign.slug)}/visit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, visitId, ...extra }),
      keepalive: true,
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        ? action === "click_followed" || action === "followed" || action === "follow_success"
        : true;
      if (!followed) return;
      setWidgetState("success");
      trackClientEvent("zalo_follow_success", campaign);
      void patchVisit("follow_success");
    };
    if (visitId) {
      window.setTimeout(() => {
        window.ZaloSocialSDK?.reload?.();
        setWidgetState(current => current === "preparing" ? "ready" : current);
      }, 50);
    }
    return () => { delete window.smartFurniZaloFollowCallback; };
  }, [campaign, interactive, patchVisit, sdkKey, visitId]);

  const benefits = useMemo(() => campaign.benefits.length ? campaign.benefits : [
    "Catalogue sản phẩm mới", "Báo giá theo nhu cầu", "Tư vấn trực tiếp trên Zalo",
  ], [campaign.benefits]);

  const openChat = () => {
    trackClientEvent("zalo_follow_chat_open", campaign);
    void patchVisit("chat_open");
    window.location.assign(campaign.chatUrl || `https://zalo.me/${encodeURIComponent(campaign.oaId)}`);
  };

  const retry = () => {
    setWidgetState("preparing");
    setSdkKey(value => value + 1);
    window.setTimeout(() => window.ZaloSocialSDK?.reload?.(), 50);
  };

  return <main className="relative min-h-[100svh] overflow-hidden bg-[#eff5ff] px-4 py-6 text-[#10213a] sm:px-6 sm:py-10">
    <Script
      key={sdkKey}
      src="https://sp.zalo.me/plugins/sdk.js"
      strategy="afterInteractive"
      onLoad={() => {
        setWidgetState("ready");
        void patchVisit("sdk_loaded");
        window.ZaloSocialSDK?.reload?.();
      }}
      onError={() => {
        setWidgetState("error");
        void patchVisit("error", { error: "zalo_sdk_load_failed" });
      }}
    />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_13%_6%,rgba(0,104,255,0.18),transparent_28rem),radial-gradient(circle_at_92%_94%,rgba(227,182,64,0.20),transparent_29rem)]" />
    <div className="pointer-events-none absolute left-[-7rem] top-[18%] h-72 w-72 rounded-full border-[60px] border-white/40" />
    <div className="pointer-events-none absolute right-[-5rem] top-[-5rem] h-64 w-64 rounded-full border-[52px] border-[#0068ff]/5" />

    <section className="relative mx-auto grid min-h-[calc(100svh-3rem)] w-full max-w-[1100px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(20,55,95,0.18)] lg:min-h-0 lg:grid-cols-[1.07fr_0.93fr]">
      <div className="relative min-h-[320px] overflow-hidden bg-[#0b67df] lg:min-h-[690px]">
        {campaign.heroImage
          ? <img src={campaign.heroImage} alt={campaign.headline} className="absolute inset-0 h-full w-full object-cover" />
          : <div className="absolute inset-0 bg-[linear-gradient(145deg,#0755ba,#1e8cff)]" />}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,36,89,0.05)_0%,rgba(0,35,80,0.36)_52%,rgba(0,28,65,0.92)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#073b86]/50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
            <MessageCircle size={16} /> SmartFurni · Zalo OA
          </div>
          <div className="rounded-full border border-white/25 bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md">Official Account</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-9 lg:p-11">
          <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-[#ffd85e] px-3 py-1.5 text-xs font-bold text-[#3b2a00]"><Star size={14} fill="currentColor" /> Tư vấn chính hãng</div>
          <h1 className="max-w-[580px] text-[30px] font-black leading-[1.13] tracking-[-0.035em] sm:text-[40px] lg:text-[47px]">{campaign.headline}</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/[0.82] sm:text-base">{campaign.description}</p>
        </div>
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-11">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(145deg,#0d78ff,#0060e6)] text-white shadow-[0_10px_24px_rgba(0,104,255,0.28)]"><MessageCircle size={25} /></div>
          <div><div className="text-lg font-black tracking-[-0.02em]">SmartFurni</div><div className="flex items-center gap-1 text-xs font-medium text-[#63758c]"><BadgeCheck size={14} className="text-[#087cff]" /> Zalo Official Account</div></div>
        </div>

        <div className="mt-7 rounded-2xl border border-[#dfe8f4] bg-[#f8fbff] p-4">
          <div className="text-sm font-bold text-[#21344f]">Anh/Chị sẽ nhận được</div>
          <ul className="mt-3 space-y-2.5">
            {benefits.map(item => <li key={item} className="flex items-start gap-2.5 text-sm leading-5 text-[#52667e]"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#dcf8ea] text-[#078455]"><Check size={13} strokeWidth={3} /></span>{item}</li>)}
          </ul>
        </div>

        <div className="mt-6 rounded-[22px] border border-[#cfe0f5] bg-white p-5 text-center shadow-[0_14px_35px_rgba(40,73,112,0.10)]">
          {widgetState === "success" ? <div className="py-2">
            <CheckCircle2 size={46} className="mx-auto text-[#08a36c]" />
            <h2 className="mt-3 text-lg font-black">Đã ghi nhận Quan tâm</h2>
            <p className="mt-1 text-sm leading-6 text-[#66798f]">SmartFurni sẽ tư vấn và gửi báo giá qua Zalo OA.</p>
            <button type="button" onClick={openChat} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0068ff] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,104,255,0.24)] transition hover:bg-[#0058d7]"><MessageCircle size={18} /> Mở chat Zalo ngay</button>
          </div> : <>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#21344f]"><Sparkles size={17} className="text-[#d39d13]" /> Bấm nút bên dưới để nhận tư vấn</div>
            <p className="mt-1 text-xs leading-5 text-[#7a8ba0]">Không cần điền biểu mẫu · Tư vấn trực tiếp trên Zalo</p>
            <div className="relative mt-5 flex min-h-[56px] items-center justify-center rounded-xl bg-[#eef6ff] px-3 py-2">
              {widgetState === "preparing" && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#eef6ff] text-sm font-semibold text-[#536982]"><Loader2 size={18} className="mr-2 animate-spin text-[#0068ff]" /> Đang tải nút Quan tâm...</div>}
              {interactive
                ? <div
                    ref={node => { if (node) { node.setAttribute("user_external_id", visitId); node.setAttribute("status", "show"); } }}
                    className="zalo-interaction-widget"
                    data-oaid={campaign.oaId}
                    data-appid={appId}
                    data-callback="smartFurniZaloFollowCallback"
                    data-reason-msg="SmartFurni xin phép kết nối để gửi tư vấn và báo giá theo yêu cầu của Anh/Chị."
                  />
                : <div className="zalo-follow-only-button" data-oaid={campaign.oaId} data-callback="smartFurniZaloFollowCallback" />}
            </div>
            {widgetState === "error" && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs leading-5 text-amber-800">
              <div className="font-bold">Nút Zalo chưa tải được</div>
              <div>Kiểm tra chặn nội dung của trình duyệt hoặc mở trực tiếp Zalo OA.</div>
              <div className="mt-2 flex gap-2"><button type="button" onClick={retry} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 font-bold"><RefreshCw size={14} /> Thử lại</button><button type="button" onClick={() => { void patchVisit("fallback_open"); openChat(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0068ff] px-3 py-2 font-bold text-white"><ExternalLink size={14} /> Mở Zalo</button></div>
            </div>}
          </>}
        </div>

        <div className="mt-5 flex items-start gap-2.5 text-xs leading-5 text-[#77899e]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#15976c]" /><span>Nút Quan tâm được tải từ SDK chính thức của Zalo. SmartFurni chỉ dùng dữ liệu để tư vấn, đo hiệu quả chiến dịch và chăm sóc khách hàng.</span></div>
        <div className="mt-4 flex items-center justify-center gap-4 border-t border-[#edf1f5] pt-4 text-[11px] font-medium text-[#91a0b2]"><span className="inline-flex items-center gap-1"><Tag size={13} /> {campaign.name}</span>{identified && <span className="inline-flex items-center gap-1 text-[#08865e]"><CheckCircle2 size={13} /> Đã xác minh nguồn</span>}</div>
      </div>
    </section>
  </main>;
}
