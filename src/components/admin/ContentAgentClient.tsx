"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle, Bot, Check, CheckCircle2, ChevronRight, FilePenLine,
  Loader2, SearchCheck, ShieldCheck, Sparkles, Target,
} from "lucide-react";
import type {
  ContentPlan, ContentPlanItem, ContentPlanItemStatus, FunnelStage,
} from "@/lib/content-agent-store";
import { PRODUCT_FAMILIES } from "@/lib/product-families";

const STAGE_STYLE: Record<FunnelStage, { label: string; description: string; color: string; panel: string }> = {
  TOFU: { label: "TOFU · Nhận biết", description: "Giải đáp nhu cầu rộng và thu hút tìm kiếm mới", color: "#60A5FA", panel: "border-blue-400/20 bg-blue-500/[0.04]" },
  MOFU: { label: "MOFU · Cân nhắc", description: "Hướng dẫn lựa chọn, so sánh và nuôi dưỡng", color: "#A78BFA", panel: "border-violet-400/20 bg-violet-500/[0.04]" },
  BOFU: { label: "BOFU · Chuyển đổi", description: "Giải đáp ý định mua và dẫn tới tư vấn", color: "#E6BF55", panel: "border-[#C9A84C]/25 bg-[#C9A84C]/[0.05]" },
};

const STATUS_LABEL: Record<ContentPlanItemStatus, string> = {
  idea: "Chờ duyệt", approved: "Đã duyệt", drafted: "Đã tạo nháp",
  review: "Đang biên tập", ready: "Sẵn sàng", published: "Đã đăng",
};

function replacePlan(plans: ContentPlan[], updated: ContentPlan): ContentPlan[] {
  return plans.map((plan) => plan.id === updated.id ? updated : plan);
}

export default function ContentAgentClient({ initialPlans }: { initialPlans: ContentPlan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [activePlanId, setActivePlanId] = useState(initialPlans[0]?.id || "");
  const [creating, setCreating] = useState(false);
  const [busyItem, setBusyItem] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "Cụm nội dung SmartFurni",
    goal: "Tăng truy cập tìm kiếm chất lượng và tạo nhu cầu tư vấn sản phẩm SmartFurni",
    audience: "Người trưởng thành quan tâm chất lượng nghỉ ngơi, gia đình có người lớn tuổi và khách hàng đang tìm giải pháp điều chỉnh tư thế",
    productFamilySlug: PRODUCT_FAMILIES[0].slug,
    horizonWeeks: 4,
    weeklyCadence: 2,
  });

  const activePlan = plans.find((plan) => plan.id === activePlanId) || plans[0];
  const progress = useMemo(() => {
    if (!activePlan) return { approved: 0, drafted: 0, total: 0 };
    return {
      approved: activePlan.items.filter((item) => item.status !== "idea").length,
      drafted: activePlan.items.filter((item) => item.postSlug).length,
      total: activePlan.items.length,
    };
  }, [activePlan]);

  async function createPlan() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content-agent/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo kế hoạch");
      setPlans((current) => [data.plan, ...current]);
      setActivePlanId(data.plan.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(item: ContentPlanItem, status: ContentPlanItemStatus) {
    if (!activePlan) return;
    setBusyItem(item.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/content-agent/plans/${activePlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật brief");
      setPlans((current) => replacePlan(current, data.plan));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyItem("");
    }
  }

  async function approveAll() {
    if (!activePlan) return;
    const pending = activePlan.items.filter((item) => item.status === "idea");
    for (const item of pending) await updateStatus(item, "approved");
  }

  async function createDraft(item: ContentPlanItem) {
    if (!activePlan) return;
    setBusyItem(item.id);
    setError("");
    try {
      const res = await fetch("/api/admin/content-agent/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: activePlan.id, itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo bản nháp");
      const refreshed = await fetch("/api/admin/content-agent/plans");
      const payload = await refreshed.json();
      if (refreshed.ok) setPlans(payload.plans);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyItem("");
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <section className="overflow-hidden rounded-3xl border border-[#C9A84C]/20 bg-[linear-gradient(125deg,rgba(19,29,48,.96),rgba(30,25,20,.96))]">
        <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-[#E6BF55]">
              <Sparkles size={16} /> Content Strategy Agent
            </div>
            <h2 className="max-w-2xl text-2xl font-semibold text-[#F5EDD6] md:text-3xl">
              Từ chiến lược tìm kiếm đến bản nháp có kiểm soát
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F5EDD6]/55">
              AI đề xuất cụm bài theo hành trình khách hàng. Admin duyệt từng brief trước khi tạo bài; bài AI luôn được lưu ở trạng thái nháp để kiểm tra nguồn, claim và giọng thương hiệu.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {[
                [Target, "1. Lập kế hoạch", "Keyword, intent, outline"],
                [CheckCircle2, "2. Admin duyệt", "Kiểm soát hướng nội dung"],
                [SearchCheck, "3. Viết & QA", "Draft + SEO + claim check"],
              ].map(([Icon, title, note]) => {
                const StepIcon = Icon as typeof Target;
                return <div key={String(title)} className="rounded-2xl border border-white/[.07] bg-black/15 p-3">
                  <StepIcon size={17} className="mb-2 text-[#E6BF55]" />
                  <div className="text-sm font-medium text-[#F5EDD6]">{String(title)}</div>
                  <div className="mt-1 text-xs text-[#F5EDD6]/40">{String(note)}</div>
                </div>;
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><ShieldCheck size={18} /> Hàng rào an toàn</div>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[#F5EDD6]/55">
              <li>• Không tự bịa số liệu, nghiên cứu, chuyên gia, giá hoặc đánh giá.</li>
              <li>• Nội dung sức khỏe cần nguồn và người có chuyên môn duyệt.</li>
              <li>• Không dùng claim chữa bệnh hoặc cam kết tuyệt đối.</li>
              <li>• AI không có quyền tự xuất bản bài viết.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/[.08] bg-[#151820] p-4 md:p-6">
        <div className="mb-5 flex items-center gap-2"><Bot className="text-[#E6BF55]" size={20} /><h2 className="font-semibold text-[#F5EDD6]">Tạo kế hoạch mới</h2></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1.5 text-xs text-[#F5EDD6]/50">Tên chiến dịch
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sf-agent-input" />
          </label>
          <label className="space-y-1.5 text-xs text-[#F5EDD6]/50">Dòng sản phẩm
            <select value={form.productFamilySlug} onChange={(e) => setForm({ ...form, productFamilySlug: e.target.value })} className="sf-agent-input">
              {PRODUCT_FAMILIES.map((family) => <option key={family.slug} value={family.slug}>{family.label}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-[#F5EDD6]/50 lg:col-span-2">Mục tiêu
            <textarea rows={2} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className="sf-agent-input resize-none" />
          </label>
          <label className="space-y-1.5 text-xs text-[#F5EDD6]/50 lg:col-span-2">Đối tượng khách hàng
            <textarea rows={2} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="sf-agent-input resize-none" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs text-[#F5EDD6]/50">Số tuần
              <select value={form.horizonWeeks} onChange={(e) => setForm({ ...form, horizonWeeks: Number(e.target.value) })} className="sf-agent-input">
                {[2, 4, 6, 8, 12].map((value) => <option key={value} value={value}>{value} tuần</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs text-[#F5EDD6]/50">Bài/tuần
              <select value={form.weeklyCadence} onChange={(e) => setForm({ ...form, weeklyCadence: Number(e.target.value) })} className="sf-agent-input">
                {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value} bài</option>)}
              </select>
            </label>
          </div>
          <div className="flex items-end">
            <button onClick={createPlan} disabled={creating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(110deg,#E4C557,#B98B20)] px-4 py-3 text-sm font-semibold text-[#151005] disabled:opacity-50">
              {creating ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
              {creating ? "AI đang lập kế hoạch..." : "Tạo kế hoạch TOFU–MOFU–BOFU"}
            </button>
          </div>
        </div>
      </section>

      {error && <div className="flex items-start gap-2 rounded-2xl border border-red-400/20 bg-red-500/[.06] p-4 text-sm text-red-300"><AlertTriangle className="mt-0.5 shrink-0" size={17} />{error}</div>}

      {plans.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/[.07] bg-[#151820] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <select value={activePlan?.id} onChange={(e) => setActivePlanId(e.target.value)} className="sf-agent-input max-w-xl font-medium text-[#F5EDD6]">
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.productFamilyLabel}</option>)}
              </select>
              <p className="mt-2 line-clamp-2 text-xs text-[#F5EDD6]/45">{activePlan?.strategySummary}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-[#F5EDD6]/55">
              <span className="rounded-full border border-white/10 px-3 py-1.5">{progress.total} brief</span>
              <span className="rounded-full border border-emerald-400/20 px-3 py-1.5 text-emerald-300">{progress.approved} đã duyệt</span>
              <span className="rounded-full border border-[#C9A84C]/25 px-3 py-1.5 text-[#E6BF55]">{progress.drafted} bản nháp</span>
              {activePlan?.items.some((item) => item.status === "idea") && <button onClick={approveAll} className="rounded-xl bg-emerald-500/15 px-3 py-2 font-medium text-emerald-300 hover:bg-emerald-500/25">Duyệt tất cả brief</button>}
            </div>
          </div>

          {(["TOFU", "MOFU", "BOFU"] as FunnelStage[]).map((stage) => {
            const style = STAGE_STYLE[stage];
            const items = activePlan?.items.filter((item) => item.funnelStage === stage) || [];
            return <div key={stage} className={`rounded-3xl border p-4 md:p-5 ${style.panel}`}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div><h3 className="font-semibold" style={{ color: style.color }}>{style.label}</h3><p className="mt-1 text-xs text-[#F5EDD6]/40">{style.description}</p></div>
                <span className="text-xs text-[#F5EDD6]/40">{items.length} bài</span>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {items.map((item) => <BriefCard key={item.id} item={item} busy={busyItem === item.id} onStatus={updateStatus} onDraft={createDraft} />)}
              </div>
            </div>;
          })}
        </section>
      )}

      {plans.length === 0 && !creating && <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center"><Bot className="mx-auto text-[#E6BF55]/60" size={36} /><h3 className="mt-3 font-medium text-[#F5EDD6]">Chưa có kế hoạch nội dung</h3><p className="mt-1 text-sm text-[#F5EDD6]/40">Điền chiến lược phía trên để AI tạo funnel đầu tiên.</p></div>}

      <style jsx>{`
        :global(.sf-agent-input) { width:100%; border:1px solid rgba(255,255,255,.09); border-radius:12px; background:#0f1219; padding:10px 12px; color:#f5edd6; font-size:13px; outline:none; }
        :global(.sf-agent-input:focus) { border-color:rgba(201,168,76,.55); box-shadow:0 0 0 3px rgba(201,168,76,.08); }
        :global(.sf-agent-input option) { background:#151820; color:#f5edd6; }
      `}</style>
    </div>
  );
}

function BriefCard({ item, busy, onStatus, onDraft }: {
  item: ContentPlanItem;
  busy: boolean;
  onStatus: (item: ContentPlanItem, status: ContentPlanItemStatus) => Promise<void>;
  onDraft: (item: ContentPlanItem) => Promise<void>;
}) {
  return <article className="rounded-2xl border border-white/[.07] bg-[#11141b]/90 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-[#F5EDD6]/40"><span>Tuần {item.plannedWeek}</span><span>•</span><span>{item.category.replaceAll("-", " ")}</span></div>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${item.status === "idea" ? "bg-white/[.06] text-[#F5EDD6]/45" : item.status === "approved" ? "bg-emerald-500/10 text-emerald-300" : "bg-[#C9A84C]/10 text-[#E6BF55]"}`}>{STATUS_LABEL[item.status]}</span>
    </div>
    <h4 className="mt-3 text-sm font-semibold leading-6 text-[#F5EDD6]">{item.title}</h4>
    <div className="mt-3 grid gap-2 text-xs text-[#F5EDD6]/45 sm:grid-cols-2"><p><span className="text-[#F5EDD6]/65">Keyword:</span> {item.primaryKeyword}</p><p><span className="text-[#F5EDD6]/65">Intent:</span> {item.searchIntent}</p></div>
    <details className="mt-3 rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs text-[#F5EDD6]/50">
      <summary className="cursor-pointer font-medium text-[#F5EDD6]/70">Xem brief & dàn ý</summary>
      <p className="mt-3"><strong className="text-[#F5EDD6]/70">Nỗi đau:</strong> {item.audiencePainPoint}</p>
      <p className="mt-2"><strong className="text-[#F5EDD6]/70">Góc bài:</strong> {item.angle}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">{item.outline.map((line) => <li key={line}>{line}</li>)}</ul>
      <p className="mt-2"><strong className="text-[#F5EDD6]/70">CTA:</strong> {item.cta}</p>
    </details>
    {item.qa && <div className={`mt-3 rounded-xl border p-3 text-xs ${item.qa.passed ? "border-emerald-400/15 bg-emerald-500/[.04] text-emerald-300" : "border-amber-400/15 bg-amber-500/[.04] text-amber-200"}`}>
      <div className="flex items-center justify-between"><span>Điểm QA bản nháp</span><strong>{item.qa.score}/100</strong></div>
      {item.qa.riskFlags.length > 0 && <p className="mt-1 text-amber-300">{item.qa.riskFlags.length} claim cần biên tập viên xác minh</p>}
    </div>}
    <div className="mt-4 flex flex-wrap gap-2">
      {item.status === "idea" && <button disabled={busy} onClick={() => onStatus(item, "approved")} className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Duyệt brief</button>}
      {item.status === "approved" && <button disabled={busy} onClick={() => onDraft(item)} className="flex items-center gap-1.5 rounded-xl bg-[#C9A84C]/15 px-3 py-2 text-xs font-medium text-[#E6BF55] disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={14} /> : <FilePenLine size={14} />} AI viết bản nháp</button>}
      {item.postSlug && <Link href={`/admin/posts/${item.postSlug}/edit`} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-[#F5EDD6]/60 hover:text-[#F5EDD6]">Mở trình biên tập <ChevronRight size={13} /></Link>}
      {item.status === "approved" && <button disabled={busy} onClick={() => onStatus(item, "idea")} className="rounded-xl px-3 py-2 text-xs text-[#F5EDD6]/35 hover:text-[#F5EDD6]/65">Huỷ duyệt</button>}
    </div>
  </article>;
}
