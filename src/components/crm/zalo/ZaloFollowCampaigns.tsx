"use client";

import {
  BarChart3, CalendarDays, CheckCircle2, Copy, ExternalLink, Eye, Loader2,
  Megaphone, MessageCircle, MousePointerClick, PauseCircle, Pencil, PlayCircle,
  Plus, RefreshCw, ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Metrics {
  visits: number; uniqueVisitors: number; sdkLoaded: number; followCallbacks: number;
  verifiedFollowers: number; chatOpens: number; fallbackOpens: number; errors: number; conversionRate: number;
}

interface Campaign {
  id: string; slug: string; name: string; productKey: string; headline: string; description: string;
  benefits: string[]; heroImage: string; chatUrl: string; welcomeMessage: string;
  widgetMode: "follow" | "interactive"; status: "active" | "paused"; trackingUrl: string; createdAt: string; metrics: Metrics;
}

interface Report { range: { from: string; to: string }; summary: Metrics; campaigns: Campaign[] }

interface FormValue {
  id?: string; name: string; slug: string; productKey: string; headline: string; description: string;
  benefits: string; heroImage: string; chatUrl: string; welcomeMessage: string; widgetMode: "follow" | "interactive";
}

const EMPTY: FormValue = {
  name: "", slug: "", productKey: "", headline: "", description: "", benefits: "",
  heroImage: "/uploads/migrated/THAO_TA-CC-81C_SMF12_DA_PU_a880rv-2f2905c3e0.webp",
  chatUrl: "", welcomeMessage: "", widgetMode: "follow",
};

function localDate(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + offset * 86_400_000));
}

function formatNumber(value: number) { return new Intl.NumberFormat("vi-VN").format(value || 0); }

export default function ZaloFollowCampaigns({ isAdmin, refreshKey = 0 }: { isAdmin: boolean; refreshKey?: number }) {
  const [report, setReport] = useState<Report | null>(null);
  const [from, setFrom] = useState(localDate(-6));
  const [to, setTo] = useState(localDate());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState<FormValue | null>(null);
  const [notice, setNotice] = useState("");

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
        body: JSON.stringify({ action: "save", campaign: { ...form, benefits: form.benefits.split("\n").map(item => item.trim()).filter(Boolean) } }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || result.ok === false) throw new Error(result.error || "Không lưu được chiến dịch.");
      setForm(null); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Không lưu được chiến dịch."); }
    finally { setBusy(""); }
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
        {isAdmin && <button type="button" onClick={() => setForm({ ...EMPTY })} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f0d46e,#c99925)] px-4 text-sm font-bold text-[#2d2208] shadow-[0_9px_22px_rgba(170,121,22,0.20)]"><Plus size={17} /> Tạo chiến dịch</button>}
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

      <section className="rounded-2xl border border-[#dbe4ef] bg-white p-4 shadow-[0_14px_36px_rgba(35,55,82,0.07)] sm:p-5">
        <div className="flex items-center justify-between"><div><h3 className="font-bold text-[#172033]">Landing page đang quản lý</h3><p className="mt-1 text-xs text-[#7d8c9f]">Số liệu trong khoảng {report?.range.from} đến {report?.range.to}.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d6e0eb] text-[#5e7085] hover:bg-[#f2f7fc]"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button></div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {(report?.campaigns || []).map(campaign => <article key={campaign.id} className="overflow-hidden rounded-2xl border border-[#dce5ef] bg-[#fbfcfe]">
            <div className="flex gap-4 p-4">
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#eaf1f8]">{campaign.heroImage ? <img src={campaign.heroImage} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#8ba0b7]"><Megaphone /></div>}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="truncate font-bold text-[#1c2a40]">{campaign.name}</h4><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${campaign.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{campaign.status === "active" ? "Đang chạy" : "Tạm dừng"}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#728197]">{campaign.headline}</p><div className="mt-2 text-[11px] text-[#96a2b1]">/{campaign.slug}</div></div>
            </div>
            <div className="grid grid-cols-4 border-y border-[#e3eaf2] bg-white text-center"><Metric label="Truy cập" value={campaign.metrics.visits} /><Metric label="Callback" value={campaign.metrics.followCallbacks} /><Metric label="Xác minh" value={campaign.metrics.verifiedFollowers} /><Metric label="Tỷ lệ" value={`${campaign.metrics.conversionRate}%`} /></div>
            <div className="flex flex-wrap gap-2 p-3">
              <button type="button" onClick={() => { void navigator.clipboard.writeText(campaign.trackingUrl); setNotice("Đã sao chép link chiến dịch."); }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#d5e0eb] bg-white px-3 py-2 text-xs font-bold text-[#52657b]"><Copy size={14} /> Sao chép link</button>
              <a href={campaign.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#b9d5f6] bg-[#edf6ff] px-3 py-2 text-xs font-bold text-[#075fbf]"><ExternalLink size={14} /> Xem</a>
              {isAdmin && <><button type="button" onClick={() => setForm({ id: campaign.id, name: campaign.name, slug: campaign.slug, productKey: campaign.productKey, headline: campaign.headline, description: campaign.description, benefits: campaign.benefits.join("\n"), heroImage: campaign.heroImage, chatUrl: campaign.chatUrl, welcomeMessage: campaign.welcomeMessage, widgetMode: campaign.widgetMode })} className="grid h-9 w-9 place-items-center rounded-lg border border-[#d5e0eb] bg-white text-[#596d83]"><Pencil size={14} /></button><button type="button" onClick={() => void setStatus(campaign)} disabled={busy === campaign.id} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e5d7af] bg-[#fffbef] text-[#8b6815]">{busy === campaign.id ? <Loader2 size={14} className="animate-spin" /> : campaign.status === "active" ? <PauseCircle size={15} /> : <PlayCircle size={15} />}</button></>}
            </div>
          </article>)}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-[#dbe4ef] bg-white p-5 shadow-[0_12px_30px_rgba(35,55,82,0.06)]"><div className="flex items-center gap-2 font-bold text-[#172033]"><BarChart3 size={19} className="text-[#0068ff]" /> Cách đọc phễu</div><div className="mt-4 grid gap-3 sm:grid-cols-3"><FunnelStep number="01" title="Truy cập" text="Khách mở landing từ quảng cáo có UTM." /><FunnelStep number="02" title="Quan tâm" text="SDK Zalo gọi callback thành công." /><FunnelStep number="03" title="Xác minh" text="Webhook follower khớp UID và nguồn." /></div></div>
        <div className="rounded-2xl border border-[#e8d9aa] bg-[linear-gradient(135deg,#fffdf5,#fff7dc)] p-5 shadow-[0_12px_30px_rgba(126,90,15,0.07)]"><div className="flex items-center gap-2 font-bold text-[#5e4610]"><ShieldCheck size={19} /> Nguyên tắc dữ liệu</div><ul className="mt-3 space-y-2 text-xs leading-5 text-[#78643a]"><li>• Không lưu IP thô; chỉ băm IP theo ngày để chống đếm trùng.</li><li>• Callback và follower xác minh là hai chỉ số khác nhau.</li><li>• Chỉ gắn tag nguồn CRM khi webhook khớp UID.</li></ul></div>
      </section>
    </>}

    {form && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0b1930]/70 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/70 bg-white shadow-[0_28px_80px_rgba(5,22,48,0.30)]"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5ebf2] bg-white/95 px-5 py-4 backdrop-blur"><div><h3 className="font-bold text-[#172033]">{form.id ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch Quan tâm"}</h3><p className="mt-0.5 text-xs text-[#7b899a]">Nội dung này hiển thị trên landing page quảng cáo.</p></div><button type="button" onClick={() => setForm(null)} className="rounded-lg border border-[#d8e1eb] px-3 py-2 text-xs font-bold text-[#63758a]">Đóng</button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><FormField label="Tên chiến dịch *"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></FormField><FormField label="Slug URL (để trống sẽ tự tạo)"><input value={form.slug} disabled={Boolean(form.id)} onChange={e => setForm({ ...form, slug: e.target.value })} /></FormField><FormField label="Nhóm sản phẩm"><input value={form.productKey} onChange={e => setForm({ ...form, productKey: e.target.value })} placeholder="sofa_bed" /></FormField><FormField label="Chế độ widget"><select value={form.widgetMode} onChange={e => setForm({ ...form, widgetMode: e.target.value as FormValue["widgetMode"] })}><option value="follow">Nút Quan tâm cơ bản</option><option value="interactive">Widget tương tác có UID</option></select></FormField><div className="sm:col-span-2"><FormField label="Tiêu đề popup *"><input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} /></FormField></div><div className="sm:col-span-2"><FormField label="Mô tả"><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></FormField></div><FormField label="Ảnh nền"><input value={form.heroImage} onChange={e => setForm({ ...form, heroImage: e.target.value })} /></FormField><FormField label="Link chat Zalo dự phòng"><input value={form.chatUrl} onChange={e => setForm({ ...form, chatUrl: e.target.value })} placeholder="Tự dùng OA ID nếu để trống" /></FormField><div className="sm:col-span-2"><FormField label="Quyền lợi (mỗi dòng một ý)"><textarea rows={4} value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} /></FormField></div><div className="sm:col-span-2"><FormField label="Tin chào theo chiến dịch"><textarea rows={4} value={form.welcomeMessage} onChange={e => setForm({ ...form, welcomeMessage: e.target.value })} placeholder="Có thể dùng {{name}}" /></FormField></div></div><div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#e5ebf2] bg-white/95 px-5 py-4 backdrop-blur"><button type="button" onClick={() => setForm(null)} className="rounded-xl border border-[#d3dde8] px-4 py-2.5 text-sm font-bold text-[#5b6d82]">Hủy</button><button type="button" onClick={() => void save()} disabled={busy === "save" || form.name.trim().length < 3 || form.headline.trim().length < 8} className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f0d46e,#c99925)] px-5 py-2.5 text-sm font-bold text-[#2c2107] disabled:opacity-50">{busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Lưu chiến dịch</button></div></div></div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: number | string }) { return <div className="border-r border-[#e8edf3] px-2 py-3 last:border-r-0"><strong className="text-sm text-[#1d2b40]">{typeof value === "number" ? formatNumber(value) : value}</strong><div className="mt-0.5 text-[10px] text-[#8492a4]">{label}</div></div>; }
function FunnelStep({ number, title, text }: { number: string; title: string; text: string }) { return <div className="rounded-xl border border-[#e1e8f0] bg-[#f8fafc] p-3"><div className="text-[10px] font-black tracking-[0.14em] text-[#0068ff]">{number}</div><div className="mt-1 text-sm font-bold text-[#25364c]">{title}</div><p className="mt-1 text-xs leading-5 text-[#758499]">{text}</p></div>; }
function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-[#526479]"><span className="mb-1.5 block">{label}</span><div className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-[#ccd8e5] [&>input]:bg-white [&>input]:px-3.5 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-[#ccd8e5] [&>textarea]:bg-white [&>textarea]:px-3.5 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-[#ccd8e5] [&>select]:bg-white [&>select]:px-3.5 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal">{children}</div></label>; }
