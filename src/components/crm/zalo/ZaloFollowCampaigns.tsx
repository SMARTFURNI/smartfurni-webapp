"use client";

import {
  BarChart3, CalendarDays, CheckCircle2, Copy, ExternalLink, Eye, Loader2,
  Megaphone, MessageCircle, MousePointerClick, PauseCircle, Pencil, PlayCircle,
  Gift, ImagePlus, ListChecks, Plus, RefreshCw, ShieldCheck, Star, Tags, Trash2,
  LayoutTemplate, SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultZaloFollowLandingConfig, type ZaloFollowLandingConfig } from "@/lib/zalo-follow-content";

interface Metrics {
  visits: number; uniqueVisitors: number; sdkLoaded: number; followCallbacks: number;
  verifiedFollowers: number; chatOpens: number; fallbackOpens: number; errors: number; conversionRate: number;
}

interface CareStep { week: number; title: string; content: string; cta: string }
interface SourceMetric { source: string; visits: number; oaOpens: number; followCallbacks: number; verifiedFollowers: number; openRate: number; conversionRate: number }

interface Campaign {
  id: string; slug: string; name: string; productKey: string; headline: string; description: string;
  benefits: string[]; heroImage: string; galleryImages: string[]; chatUrl: string; welcomeMessage: string;
  offerTitle: string; offerDescription: string; ctaLabel: string; audienceTags: string[]; carePlan: CareStep[];
  landingConfig: ZaloFollowLandingConfig;
  widgetMode: "follow" | "interactive"; status: "active" | "paused"; trackingUrl: string; createdAt: string; metrics: Metrics;
}

interface Report { range: { from: string; to: string }; summary: Metrics; campaigns: Campaign[]; sources: SourceMetric[] }

interface FormValue {
  id?: string; name: string; slug: string; productKey: string; headline: string; description: string;
  benefits: string; heroImage: string; galleryImages: string[]; chatUrl: string; welcomeMessage: string; widgetMode: "follow" | "interactive";
  offerTitle: string; offerDescription: string; ctaLabel: string; audienceTags: string; carePlan: CareStep[];
  landingConfig: ZaloFollowLandingConfig;
}

const DEFAULT_CARE_PLAN: CareStep[] = [
  { week: 1, title: "Chọn đúng kích thước", content: "Hướng dẫn chọn kích thước phù hợp với diện tích và nhu cầu sử dụng.", cta: "Gửi kích thước phòng" },
  { week: 2, title: "Xem công năng thực tế", content: "Video vận hành, vật liệu và các chi tiết quan trọng của sản phẩm.", cta: "Xem mẫu phù hợp" },
  { week: 3, title: "Công trình & trải nghiệm", content: "Case study thực tế giúp khách hình dung sản phẩm trong không gian sử dụng.", cta: "Yêu cầu báo giá" },
  { week: 4, title: "Mẫu mới & showroom", content: "Cập nhật mẫu mới, hàng có sẵn và lịch trải nghiệm tại showroom.", cta: "Đặt lịch xem" },
];

const PRODUCT_OPTIONS = [
  ["sofa_bed", "Sofa giường"], ["electric_sofa", "Sofa chỉnh điện"],
  ["ergonomic_bed", "Giường công thái học"], ["care_bed", "Giường chăm sóc"],
  ["adjustable_frame", "Khung giường điều chỉnh"], ["mattress", "Nệm"], ["all_products", "Tất cả sản phẩm"],
] as const;

const EMPTY: FormValue = {
  name: "", slug: "", productKey: "", headline: "", description: "", benefits: "",
  heroImage: "/uploads/migrated/THAO_TA-CC-81C_SMF12_DA_PU_a880rv-2f2905c3e0.webp",
  galleryImages: ["/uploads/migrated/THAO_TA-CC-81C_SMF12_DA_PU_a880rv-2f2905c3e0.webp"],
  chatUrl: "", welcomeMessage: "", widgetMode: "follow",
  offerTitle: "Nhận catalogue & báo giá theo nhu cầu",
  offerDescription: "Quyền lợi dành riêng cho người Quan tâm Zalo OA SmartFurni.",
  ctaLabel: "Mở Zalo nhận catalogue & báo giá",
  audienceTags: "Facebook Ads\nKhách nhận báo giá",
  carePlan: DEFAULT_CARE_PLAN.map(item => ({ ...item })),
  landingConfig: defaultZaloFollowLandingConfig("all_products"),
};

function pipeLines<T>(value: string, build: (parts: string[], index: number) => T): T[] {
  return value.split("\n").map(line => line.trim()).filter(Boolean).map((line, index) => build(line.split("|").map(part => part.trim()), index));
}

function cloneLandingConfig(value: ZaloFollowLandingConfig): ZaloFollowLandingConfig {
  return JSON.parse(JSON.stringify(value)) as ZaloFollowLandingConfig;
}

function localDate(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + offset * 86_400_000));
}

function formatNumber(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }

function facebookTrackingUrl(campaign: Campaign) {
  const url = new URL(campaign.trackingUrl);
  url.searchParams.set("utm_source", "facebook");
  url.searchParams.set("utm_medium", "paid_social");
  url.searchParams.set("utm_campaign", campaign.slug);
  return url.toString();
}

export default function ZaloFollowCampaigns({ isAdmin, refreshKey = 0 }: { isAdmin: boolean; refreshKey?: number }) {
  const [report, setReport] = useState<Report | null>(null);
  const [from, setFrom] = useState(localDate(-6));
  const [to, setTo] = useState(localDate());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState<FormValue | null>(null);
  const [notice, setNotice] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setNotice("");
    try {
      const response = await fetch(`/api/crm/zalo/follow-campaigns?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
      const result = await response.json() as Report & { error?: string };
      if (!response.ok) throw new Error(result.error || "Không tải được chiến dịch Quan tâm.");
      setReport(result);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không tải được báo cáo."); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const setPreset = (fromOffset: number, toOffset = 0) => { setFrom(localDate(fromOffset)); setTo(localDate(toOffset)); };

  async function save() {
    if (!form) return;
    setBusy("save"); setNotice("");
    try {
      const response = await fetch("/api/crm/zalo/follow-campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          campaign: {
            ...form,
            heroImage: form.galleryImages[0] || form.heroImage,
            galleryImages: form.galleryImages,
            benefits: form.benefits.split("\n").map(item => item.trim()).filter(Boolean),
            audienceTags: form.audienceTags.split("\n").map(item => item.trim()).filter(Boolean),
            carePlan: form.carePlan.map((item, index) => ({ ...item, week: index + 1 })),
          },
        }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || result.ok === false) throw new Error(result.error || "Không lưu được chiến dịch.");
      setForm(null); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không lưu được chiến dịch."); }
    finally { setBusy(""); }
  }

  async function uploadGalleryImages(files: FileList | null) {
    if (!form || !files?.length) return;
    const selected = Array.from(files).filter(file => file.type.startsWith("image/")).slice(0, Math.max(0, 12 - form.galleryImages.length));
    if (!selected.length) return;
    setBusy("upload-images"); setNotice("");
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const payload = new FormData();
        payload.append("file", file);
        payload.append("folder", "landing-pages");
        payload.append("subfolder", form.slug || form.id || "zalo-follow");
        const response = await fetch("/api/admin/upload", { method: "POST", body: payload });
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error || `Không tải được ảnh ${file.name}.`);
        uploaded.push(result.url);
      }
      setForm(current => current ? { ...current, galleryImages: Array.from(new Set([...current.galleryImages, ...uploaded])).slice(0, 12) } : current);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không tải được ảnh landing."); }
    finally { setBusy(""); if (imageInputRef.current) imageInputRef.current.value = ""; }
  }

  function makePrimaryImage(index: number) {
    setForm(current => {
      if (!current) return current;
      const image = current.galleryImages[index];
      if (!image) return current;
      return { ...current, heroImage: image, galleryImages: [image, ...current.galleryImages.filter((_, itemIndex) => itemIndex !== index)] };
    });
  }

  function removeGalleryImage(index: number) {
    setForm(current => {
      if (!current) return current;
      const galleryImages = current.galleryImages.filter((_, itemIndex) => itemIndex !== index);
      return { ...current, galleryImages, heroImage: galleryImages[0] || "" };
    });
  }

  function updateCareStep(index: number, field: keyof Omit<CareStep, "week">, value: string) {
    setForm(current => {
      if (!current) return current;
      return {
        ...current,
        carePlan: current.carePlan.map((step, stepIndex) => stepIndex === index ? { ...step, [field]: value } : step),
      };
    });
  }

  function updateLandingConfig(patch: Partial<ZaloFollowLandingConfig>) {
    setForm(current => current ? { ...current, landingConfig: { ...current.landingConfig, ...patch } } : current);
  }

  async function setStatus(campaign: Campaign) {
    setBusy(campaign.id); setNotice("");
    try {
      const response = await fetch("/api/crm/zalo/follow-campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", id: campaign.id, status: campaign.status === "active" ? "paused" : "active" }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || result.ok === false) throw new Error(result.error || "Không đổi được trạng thái.");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không đổi được trạng thái."); }
    finally { setBusy(""); }
  }

  const cards = useMemo(() => report ? [
    { label: "Lượt truy cập", value: report.summary.visits, hint: `${formatNumber(report.summary.uniqueVisitors)} thiết bị`, icon: Eye, tone: "blue" },
    { label: "Nút Zalo đã tải", value: report.summary.sdkLoaded, hint: "SDK sẵn sàng", icon: MousePointerClick, tone: "cyan" },
    { label: "Callback Quan tâm", value: report.summary.followCallbacks, hint: `${report.summary.conversionRate}% / truy cập`, icon: CheckCircle2, tone: "violet" },
    { label: "Follower xác minh", value: report.summary.verifiedFollowers, hint: "Webhook khớp UID", icon: ShieldCheck, tone: "green" },
    { label: "Mở hội thoại", value: report.summary.chatOpens + report.summary.fallbackOpens, hint: "Chat và dự phòng", icon: MessageCircle, tone: "amber" },
  ] : [], [report]);

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-2xl border border-[#dbe4ef] bg-white shadow-[0_14px_36px_rgba(35,55,82,0.08)]">
      <div className="flex flex-col gap-4 bg-[radial-gradient(circle_at_90%_0%,rgba(0,104,255,0.10),transparent_22rem),linear-gradient(135deg,#ffffff,#f7fbff)] p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,#147cff,#005cdc)] text-white shadow-[0_9px_22px_rgba(0,104,255,0.24)]"><Megaphone size={21} /></div>
          <div><h2 className="text-lg font-bold text-[#172033]">Chiến dịch quảng cáo Quan tâm Zalo OA</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#69788d]">Tạo landing page theo sản phẩm, dùng nút Quan tâm chính thức của Zalo và đo phễu từ quảng cáo đến follower đã xác minh.</p></div>
        </div>
        {isAdmin && <button type="button" onClick={() => setForm({ ...EMPTY, carePlan: DEFAULT_CARE_PLAN.map(item => ({ ...item })), landingConfig: cloneLandingConfig(defaultZaloFollowLandingConfig("all_products")) })} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f0d46e,#c99925)] px-4 text-sm font-bold text-[#2d2208] shadow-[0_9px_22px_rgba(170,121,22,0.20)]"><Plus size={17} /> Tạo chiến dịch</button>}
      </div>
      <div className="flex flex-col gap-3 border-t border-[#e6edf5] bg-[#fbfcfe] p-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b99aa]">Khoảng báo cáo</div><div className="mt-2 flex flex-wrap gap-2">{[[0,0,"Hôm nay"],[-1,-1,"Hôm qua"],[-6,0,"7 ngày"],[-29,0,"30 ngày"],[-59,0,"60 ngày"]].map(([start,end,label]) => <button key={String(label)} type="button" onClick={() => setPreset(Number(start), Number(end))} className="rounded-lg border border-[#d4deea] bg-white px-3 py-2 text-xs font-semibold text-[#53657a] hover:border-[#9ec6f6] hover:text-[#0068ff]">{label}</button>)}</div></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="text-xs font-medium text-[#718197]">Từ ngày<input type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1 block h-10 rounded-lg border border-[#cfd9e5] bg-white px-3 text-sm text-[#26384f]" /></label><label className="text-xs font-medium text-[#718197]">Đến ngày<input type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-1 block h-10 rounded-lg border border-[#cfd9e5] bg-white px-3 text-sm text-[#26384f]" /></label><button type="button" onClick={() => void load()} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#b9d6f6] bg-[#edf6ff] px-4 text-sm font-bold text-[#075ebc]"><CalendarDays size={16} /> Xem</button></div>
      </div>
    </section>

    {notice && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{notice}</div>}
    {loading && !report ? <div className="flex min-h-52 items-center justify-center rounded-2xl border border-[#dbe4ef] bg-white text-sm text-[#68798e]"><Loader2 size={20} className="mr-2 animate-spin text-[#0068ff]" /> Đang tải báo cáo Quan tâm...</div> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(card => { const Icon = card.icon; return <div key={card.label} data-tone={card.tone} className="rounded-2xl border border-[#dbe4ef] bg-white p-4 shadow-[0_9px_24px_rgba(31,50,76,0.06)]"><div className="flex items-start justify-between"><div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#76879b]">{card.label}</div><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef5ff] text-[#0068ff]"><Icon size={17} /></div></div><div className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#172033]">{formatNumber(card.value)}</div><div className="mt-1 text-xs text-[#8290a2]">{card.hint}</div></div>; })}
      </section>

      <SourceReport sources={report?.sources || []} />

      <section className="rounded-2xl border border-[#dbe4ef] bg-white p-4 shadow-[0_14px_36px_rgba(35,55,82,0.07)] sm:p-5">
        <div className="flex items-center justify-between"><div><h3 className="font-bold text-[#172033]">Landing page đang quản lý</h3><p className="mt-1 text-xs text-[#7d8c9f]">Số liệu trong khoảng {report?.range.from} đến {report?.range.to}.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d6e0eb] text-[#5e7085] hover:bg-[#f2f7fc]"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button></div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {(report?.campaigns || []).map(campaign => <article key={campaign.id} className="overflow-hidden rounded-2xl border border-[#dce5ef] bg-[#fbfcfe]">
            <div className="flex gap-4 p-4">
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#eaf1f8]">{campaign.heroImage ? <img src={campaign.heroImage} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#8ba0b7]"><Megaphone /></div>}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="truncate font-bold text-[#1c2a40]">{campaign.name}</h4><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${campaign.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{campaign.status === "active" ? "Đang chạy" : "Tạm dừng"}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#728197]">{campaign.headline}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-[#fff5cf] px-2 py-1 text-[10px] font-bold text-[#79580e]"><Gift size={11} className="mr-1 inline" />{campaign.offerTitle}</span><span className="rounded-full bg-[#eef6ff] px-2 py-1 text-[10px] font-bold text-[#1765ae]"><ListChecks size={11} className="mr-1 inline" />{campaign.carePlan.length} tuần</span></div></div>
            </div>
            <div className="grid grid-cols-4 border-y border-[#e3eaf2] bg-white text-center"><Metric label="Truy cập" value={campaign.metrics.visits} /><Metric label="Callback" value={campaign.metrics.followCallbacks} /><Metric label="Xác minh" value={campaign.metrics.verifiedFollowers} /><Metric label="Tỷ lệ" value={`${campaign.metrics.conversionRate}%`} /></div>
            <div className="flex flex-wrap gap-2 p-3">
              <button type="button" onClick={() => { void navigator.clipboard.writeText(campaign.trackingUrl); setNotice("Đã sao chép link chiến dịch."); }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#d5e0eb] bg-white px-3 py-2 text-xs font-bold text-[#52657b]"><Copy size={14} /> Link chung</button>
              <button type="button" onClick={() => { void navigator.clipboard.writeText(facebookTrackingUrl(campaign)); setNotice("Đã sao chép link Facebook Ads có UTM."); }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#b9d5f6] bg-[#edf6ff] px-3 py-2 text-xs font-bold text-[#075fbf]"><Megaphone size={14} /> Link Facebook</button>
              <a href={campaign.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#b9d5f6] bg-[#edf6ff] px-3 py-2 text-xs font-bold text-[#075fbf]"><ExternalLink size={14} /> Xem</a>
              {isAdmin && <><button type="button" onClick={() => setForm({ id: campaign.id, name: campaign.name, slug: campaign.slug, productKey: campaign.productKey, headline: campaign.headline, description: campaign.description, benefits: campaign.benefits.join("\n"), heroImage: campaign.heroImage, galleryImages: campaign.galleryImages?.length ? campaign.galleryImages : campaign.heroImage ? [campaign.heroImage] : [], chatUrl: campaign.chatUrl, welcomeMessage: campaign.welcomeMessage, widgetMode: campaign.widgetMode, offerTitle: campaign.offerTitle, offerDescription: campaign.offerDescription, ctaLabel: campaign.ctaLabel, audienceTags: campaign.audienceTags.join("\n"), carePlan: campaign.carePlan.map(item => ({ ...item })), landingConfig: cloneLandingConfig(campaign.landingConfig || defaultZaloFollowLandingConfig(campaign.productKey, campaign.benefits)) })} className="grid h-9 w-9 place-items-center rounded-lg border border-[#d5e0eb] bg-white text-[#596d83]"><Pencil size={14} /></button><button type="button" onClick={() => void setStatus(campaign)} disabled={busy === campaign.id} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e5d7af] bg-[#fffbef] text-[#8b6815]">{busy === campaign.id ? <Loader2 size={14} className="animate-spin" /> : campaign.status === "active" ? <PauseCircle size={15} /> : <PlayCircle size={15} />}</button></>}
            </div>
          </article>)}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-[#dbe4ef] bg-white p-5 shadow-[0_12px_30px_rgba(35,55,82,0.06)]"><div className="flex items-center gap-2 font-bold text-[#172033]"><BarChart3 size={19} className="text-[#0068ff]" /> Cách đọc phễu</div><div className="mt-4 grid gap-3 sm:grid-cols-3"><FunnelStep number="01" title="Truy cập" text="Khách mở landing từ quảng cáo có UTM." /><FunnelStep number="02" title="Quan tâm" text="SDK Zalo gọi callback thành công." /><FunnelStep number="03" title="Xác minh" text="Webhook follower khớp UID và nguồn." /></div></div>
        <div className="rounded-2xl border border-[#e8d9aa] bg-[linear-gradient(135deg,#fffdf5,#fff7dc)] p-5 shadow-[0_12px_30px_rgba(126,90,15,0.07)]"><div className="flex items-center gap-2 font-bold text-[#5e4610]"><ShieldCheck size={19} /> Nguyên tắc dữ liệu</div><ul className="mt-3 space-y-2 text-xs leading-5 text-[#78643a]"><li>• Không lưu IP thô; chỉ băm IP theo ngày để chống đếm trùng.</li><li>• Callback và follower xác minh là hai chỉ số khác nhau.</li><li>• Chỉ gắn tag nguồn CRM khi webhook khớp UID.</li></ul></div>
      </section>
    </>}

    {form && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0b1930]/70 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/70 bg-white shadow-[0_28px_80px_rgba(5,22,48,0.30)]"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5ebf2] bg-white/95 px-5 py-4 backdrop-blur"><div><h3 className="font-bold text-[#172033]">{form.id ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch Quan tâm"}</h3><p className="mt-0.5 text-xs text-[#7b899a]">Cấu hình landing, ưu đãi, phân nhóm và kế hoạch chăm sóc follower.</p></div><button type="button" onClick={() => setForm(null)} className="rounded-lg border border-[#d8e1eb] px-3 py-2 text-xs font-bold text-[#63758a]">Đóng</button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><FormField label="Tên chiến dịch *"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></FormField><FormField label="Slug URL (để trống sẽ tự tạo)"><input value={form.slug} disabled={Boolean(form.id)} onChange={e => setForm({ ...form, slug: e.target.value })} /></FormField><FormField label="Nhóm sản phẩm"><select value={form.productKey} onChange={e => { const productKey = e.target.value; setForm({ ...form, productKey, landingConfig: form.id ? form.landingConfig : defaultZaloFollowLandingConfig(productKey, form.benefits.split("\n").filter(Boolean)) }); }}><option value="">Chọn nhóm sản phẩm</option>{PRODUCT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField><FormField label="Chế độ widget"><select value={form.widgetMode} onChange={e => setForm({ ...form, widgetMode: e.target.value as FormValue["widgetMode"] })}><option value="follow">Nút Quan tâm cơ bản</option><option value="interactive">Widget tương tác có UID</option></select></FormField><div className="sm:col-span-2"><FormField label="Tiêu đề landing *"><input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} /></FormField></div><div className="sm:col-span-2"><FormField label="Mô tả"><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></FormField></div>
      <div className="sm:col-span-2 rounded-2xl border border-[#ead58e] bg-[linear-gradient(135deg,#fffdf6,#fff7db)] p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#674d0d]"><Gift size={18} /> Lý do để khách Quan tâm</div><p className="mt-1 text-xs leading-5 text-[#8b7541]">Nêu rõ quyền lợi khách nhận ngay và lời kêu gọi hành động trên điện thoại.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><FormField label="Tiêu đề quyền lợi"><input value={form.offerTitle} onChange={e => setForm({ ...form, offerTitle: e.target.value })} /></FormField><FormField label="Nhãn nút CTA trên điện thoại"><input value={form.ctaLabel} onChange={e => setForm({ ...form, ctaLabel: e.target.value })} /></FormField><div className="sm:col-span-2"><FormField label="Mô tả quyền lợi"><textarea rows={2} value={form.offerDescription} onChange={e => setForm({ ...form, offerDescription: e.target.value })} /></FormField></div></div></div>
      <div className="sm:col-span-2 rounded-2xl border border-[#d8e4f1] bg-[#f8fbff] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-bold text-[#203650]"><ImagePlus size={18} className="text-[#0877ff]" /> Gallery ảnh landing</div><p className="mt-1 text-xs text-[#7a8ba0]">Tối đa 12 ảnh. Ảnh đầu tiên hiển thị chính; khách có thể vuốt hoặc chọn ảnh nhỏ.</p></div><button type="button" disabled={busy === "upload-images" || form.galleryImages.length >= 12} onClick={() => imageInputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1684ff,#0059db)] px-4 text-xs font-bold text-white shadow-[0_8px_18px_rgba(0,104,255,0.24)] disabled:opacity-50">{busy === "upload-images" ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} Thêm ảnh</button><input ref={imageInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={event => void uploadGalleryImages(event.target.files)} /></div>
        {form.galleryImages.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{form.galleryImages.map((image, index) => <div key={`${image}-${index}`} className={`overflow-hidden rounded-xl border-2 bg-white ${index === 0 ? "border-[#d2a228]" : "border-[#dce5ef]"}`}><div className="relative aspect-[4/3]"><img src={image} alt={`Ảnh landing ${index + 1}`} className="h-full w-full object-cover" />{index === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#ffe177] px-2 py-1 text-[10px] font-black text-[#5c4100]"><Star size={11} fill="currentColor" /> ẢNH CHÍNH</span>}</div><div className="flex gap-1 p-2">{index > 0 && <button type="button" onClick={() => makePrimaryImage(index)} className="flex-1 rounded-lg border border-[#ead58c] bg-[#fff9df] px-2 py-1.5 text-[10px] font-bold text-[#755713]">Đặt chính</button>}<button type="button" onClick={() => removeGalleryImage(index)} className="grid h-8 w-8 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600"><Trash2 size={13} /></button></div></div>)}</div> : <button type="button" onClick={() => imageInputRef.current?.click()} className="mt-4 flex min-h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#bad3ef] bg-white text-[#5c7693]"><ImagePlus size={26} /><span className="mt-2 text-sm font-bold">Tải ảnh đầu tiên</span></button>}
        <label className="mt-4 block text-xs font-bold text-[#526479]">Hoặc nhập URL ảnh, mỗi dòng một ảnh<textarea rows={3} value={form.galleryImages.join("\n")} onChange={event => { const galleryImages = event.target.value.split("\n").map(item => item.trim()).filter(Boolean).slice(0, 12); setForm({ ...form, galleryImages, heroImage: galleryImages[0] || "" }); }} className="mt-1.5 w-full rounded-xl border border-[#ccd8e5] bg-white px-3.5 py-2.5 text-xs font-normal leading-5" /></label>
      </div>
      <FormField label="Link chat Zalo OA (để trống sẽ tự dùng OA ID)"><input value={form.chatUrl} onChange={e => setForm({ ...form, chatUrl: e.target.value })} placeholder="https://zalo.me/..." /></FormField><div className="sm:col-span-2"><FormField label="Quyền lợi (mỗi dòng một ý)"><textarea rows={4} value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} /></FormField></div><div className="sm:col-span-2"><FormField label="Tin chào theo chiến dịch"><textarea rows={4} value={form.welcomeMessage} onChange={e => setForm({ ...form, welcomeMessage: e.target.value })} placeholder="Có thể dùng {{name}}" /></FormField></div>
      <div className="sm:col-span-2 rounded-2xl border border-[#cfe0f3] bg-[linear-gradient(135deg,#f8fbff,#eef6ff)] p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#173a63]"><LayoutTemplate size={18} className="text-[#0877ff]" /> Các khối nội dung trên landing</div>
        <p className="mt-1 text-xs leading-5 text-[#6f8299]">Các dòng dùng dấu <strong>|</strong> để tách cột. Mọi nội dung được lưu riêng theo từng landing.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Nhãn uy tín trên ảnh"><input value={form.landingConfig.authorityLabel} onChange={event => updateLandingConfig({ authorityLabel: event.target.value })} /></FormField>
          <FormField label="Tiêu đề khối lý do"><input value={form.landingConfig.reasonTitle} onChange={event => updateLandingConfig({ reasonTitle: event.target.value })} /></FormField>
          <div className="sm:col-span-2"><FormField label="Dải chỉ số tin cậy — Giá trị | Nhãn (tối đa 4)"><textarea rows={4} value={form.landingConfig.trustStats.map(item => `${item.value} | ${item.label}`).join("\n")} onChange={event => updateLandingConfig({ trustStats: pipeLines(event.target.value, parts => ({ value: parts[0] || "", label: parts[1] || "" })).slice(0, 4) })} placeholder="Chính hãng | Zalo OA&#10;Miễn phí | Tư vấn" /></FormField></div>
          <div className="sm:col-span-2"><FormField label="Thẻ lý do lựa chọn — Tiêu đề | Mô tả (tối đa 6)"><textarea rows={6} value={form.landingConfig.reasonCards.map(item => `${item.title} | ${item.description}`).join("\n")} onChange={event => updateLandingConfig({ reasonCards: pipeLines(event.target.value, parts => ({ title: parts[0] || "", description: parts.slice(1).join(" | ") })).slice(0, 6) })} /></FormField></div>
          <FormField label="Tiêu đề khối phản hồi"><input value={form.landingConfig.testimonialTitle} onChange={event => updateLandingConfig({ testimonialTitle: event.target.value })} /></FormField>
          <div className="sm:col-span-2"><FormField label="Phản hồi thật — Tên | Khu vực | Nội dung (mỗi dòng một phản hồi)"><textarea rows={5} value={form.landingConfig.testimonials.map(item => `${item.name} | ${item.location} | ${item.quote}`).join("\n")} onChange={event => updateLandingConfig({ testimonials: pipeLines(event.target.value, parts => ({ name: parts[0] || "", location: parts[1] || "", quote: parts.slice(2).join(" | ") })).filter(item => item.quote).slice(0, 6) })} placeholder="Chị Hương | TP.HCM | Nội dung phản hồi đã được khách cho phép sử dụng" /></FormField><p className="mt-1 text-[11px] leading-4 text-amber-700">Chỉ đăng phản hồi có thật và đã được khách hàng đồng ý sử dụng.</p></div>
          <FormField label="Tiêu đề CTA cuối trang"><input value={form.landingConfig.finalCtaTitle} onChange={event => updateLandingConfig({ finalCtaTitle: event.target.value })} /></FormField>
          <FormField label="Nhãn nút CTA cuối trang"><input value={form.landingConfig.finalCtaLabel} onChange={event => updateLandingConfig({ finalCtaLabel: event.target.value })} /></FormField>
          <div className="sm:col-span-2"><FormField label="Mô tả CTA cuối trang"><textarea rows={2} value={form.landingConfig.finalCtaDescription} onChange={event => updateLandingConfig({ finalCtaDescription: event.target.value })} /></FormField></div>
        </div>
      </div>
      <div className="sm:col-span-2 rounded-2xl border border-[#bcd9fb] bg-white p-4 shadow-[0_10px_24px_rgba(0,104,255,0.06)]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#173a63]"><SlidersHorizontal size={18} className="text-[#0877ff]" /> Nội dung popup thu lead</div>
        <p className="mt-1 text-xs leading-5 text-[#6f8299]">Chỉnh tiêu đề, danh sách sản phẩm, badge, khoảng giá, ảnh và kích thước hiển thị trong popup.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Tiêu đề popup"><input value={form.landingConfig.popupTitle} onChange={event => updateLandingConfig({ popupTitle: event.target.value })} /></FormField>
          <div className="sm:col-span-2"><FormField label="Mô tả popup"><textarea rows={2} value={form.landingConfig.popupDescription} onChange={event => updateLandingConfig({ popupDescription: event.target.value })} /></FormField></div>
          <div className="sm:col-span-2"><FormField label="Lựa chọn — Tên | Mô tả | Badge | Khoảng giá | URL ảnh"><textarea rows={7} value={form.landingConfig.leadOptions.map(item => `${item.label} | ${item.description} | ${item.badge} | ${item.price} | ${item.image}`).join("\n")} onChange={event => updateLandingConfig({ leadOptions: pipeLines(event.target.value, (parts, index) => ({ id: `lua-chon-${index + 1}`, label: parts[0] || "", description: parts[1] || "", badge: parts[2] || "", price: parts[3] || "", image: parts.slice(4).join(" | ") })).filter(item => item.label).slice(0, 6) })} placeholder="Sofa giường khung gỗ | Phù hợp căn hộ | Bán chạy | Giá theo kích thước | /uploads/..." /></FormField></div>
          <FormField label="Tên nhóm kích thước / thuộc tính"><input value={form.landingConfig.qualifierLabel} onChange={event => updateLandingConfig({ qualifierLabel: event.target.value })} /></FormField>
          <div className="sm:col-span-2"><FormField label="Các lựa chọn kích thước (mỗi dòng một giá trị)"><textarea rows={4} value={form.landingConfig.qualifierValues.join("\n")} onChange={event => updateLandingConfig({ qualifierValues: event.target.value.split("\n").map(item => item.trim()).filter(Boolean).slice(0, 12) })} /></FormField></div>
        </div>
      </div>
      <div className="sm:col-span-2 rounded-2xl border border-[#d8e4f1] bg-[#f8fbff] p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#203650]"><Tags size={18} className="text-[#0877ff]" /> Phân nhóm CRM tự động</div><p className="mt-1 text-xs leading-5 text-[#7a8ba0]">Mỗi tag một dòng. Tag chỉ được gắn khi webhook Zalo xác minh đúng follower.</p><div className="mt-3"><FormField label="Tag phân khúc"><textarea rows={3} value={form.audienceTags} onChange={e => setForm({ ...form, audienceTags: e.target.value })} placeholder="Facebook Ads&#10;Quan tâm Sofa giường&#10;Khách nhận báo giá" /></FormField></div></div>
      <div className="sm:col-span-2 rounded-2xl border border-[#d8e4f1] bg-white p-4"><div className="flex items-center gap-2 text-sm font-bold text-[#203650]"><ListChecks size={18} className="text-[#0877ff]" /> Kế hoạch chăm sóc 4 tuần</div><p className="mt-1 text-xs leading-5 text-[#7a8ba0]">Mỗi tuần một nội dung hữu ích; tối đa 4 tin/tháng để duy trì quan hệ mà không gây làm phiền.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{form.carePlan.map((step, index) => <div key={step.week} className="rounded-xl border border-[#dce6f0] bg-[#f8fafc] p-3"><div className="mb-3 inline-flex rounded-full bg-[#e9f3ff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#0068ff]">Tuần {index + 1}</div><div className="space-y-3"><FormField label="Chủ đề"><input value={step.title} onChange={event => updateCareStep(index, "title", event.target.value)} /></FormField><FormField label="Nội dung định hướng"><textarea rows={3} value={step.content} onChange={event => updateCareStep(index, "content", event.target.value)} /></FormField><FormField label="CTA"><input value={step.cta} onChange={event => updateCareStep(index, "cta", event.target.value)} /></FormField></div></div>)}</div></div>
      </div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#e5ebf2] bg-white/95 px-5 py-4 backdrop-blur"><button type="button" onClick={() => setForm(null)} className="rounded-xl border border-[#d3dde8] px-4 py-2.5 text-sm font-bold text-[#5b6d82]">Hủy</button><button type="button" onClick={() => void save()} disabled={busy === "save" || busy === "upload-images" || form.name.trim().length < 3 || form.headline.trim().length < 8 || !form.galleryImages.length} className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f0d46e,#c99925)] px-5 py-2.5 text-sm font-bold text-[#2c2107] disabled:opacity-50">{busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Lưu chiến dịch</button></div></div></div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: number | string }) { return <div className="border-r border-[#e8edf3] px-2 py-3 last:border-r-0"><strong className="text-sm text-[#1d2b40]">{typeof value === "number" ? formatNumber(value) : value}</strong><div className="mt-0.5 text-[10px] text-[#8492a4]">{label}</div></div>; }
function SourceReport({ sources }: { sources: SourceMetric[] }) {
  return <section className="overflow-hidden rounded-2xl border border-[#dbe4ef] bg-white shadow-[0_12px_30px_rgba(35,55,82,0.06)]">
    <div className="flex items-start gap-3 border-b border-[#e5ecf3] bg-[linear-gradient(135deg,#fbfdff,#f1f7ff)] p-4 sm:p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6f2ff] text-[#0068ff]"><BarChart3 size={19} /></div><div><h3 className="font-bold text-[#172033]">Hiệu quả theo nguồn quảng cáo</h3><p className="mt-1 text-xs leading-5 text-[#738399]">Đọc UTM Source để so sánh Facebook Ads, nguồn trực tiếp và các kênh khác.</p></div></div>
    {sources.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#f8fafc] text-[10px] font-black uppercase tracking-[0.12em] text-[#8290a2]"><tr><th className="px-5 py-3">Nguồn</th><th className="px-4 py-3 text-right">Truy cập</th><th className="px-4 py-3 text-right">Mở OA</th><th className="px-4 py-3 text-right">Tỷ lệ mở</th><th className="px-4 py-3 text-right">Callback</th><th className="px-4 py-3 text-right">Xác minh</th><th className="px-5 py-3 text-right">Tỷ lệ callback</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{sources.map(source => <tr key={source.source} className="text-[#4f6177]"><td className="px-5 py-3 font-bold text-[#22344a]"><span className="inline-flex items-center gap-2"><Megaphone size={14} className="text-[#0877ff]" />{source.source}</span></td><td className="px-4 py-3 text-right">{formatNumber(source.visits)}</td><td className="px-4 py-3 text-right">{formatNumber(source.oaOpens)}</td><td className="px-4 py-3 text-right font-bold text-[#0877ff]">{source.openRate}%</td><td className="px-4 py-3 text-right">{formatNumber(source.followCallbacks)}</td><td className="px-4 py-3 text-right">{formatNumber(source.verifiedFollowers)}</td><td className="px-5 py-3 text-right font-black text-[#0068ff]">{source.conversionRate}%</td></tr>)}</tbody></table></div> : <div className="p-8 text-center text-sm text-[#7b899a]">Chưa có dữ liệu UTM trong khoảng thời gian này.</div>}
  </section>;
}
function FunnelStep({ number, title, text }: { number: string; title: string; text: string }) { return <div className="rounded-xl border border-[#e1e8f0] bg-[#f8fafc] p-3"><div className="text-[10px] font-black tracking-[0.14em] text-[#0068ff]">{number}</div><div className="mt-1 text-sm font-bold text-[#25364c]">{title}</div><p className="mt-1 text-xs leading-5 text-[#758499]">{text}</p></div>; }
function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-[#526479]"><span className="mb-1.5 block">{label}</span><div className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-[#ccd8e5] [&>input]:bg-white [&>input]:px-3.5 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-[#ccd8e5] [&>textarea]:bg-white [&>textarea]:px-3.5 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-[#ccd8e5] [&>select]:bg-white [&>select]:px-3.5 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal">{children}</div></label>; }
