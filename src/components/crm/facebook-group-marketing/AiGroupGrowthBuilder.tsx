"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowRight, Bot, CheckCircle2, ExternalLink, FileText,
  Layers3, Loader2, Plus, RefreshCw, Rocket, ShieldCheck, Sparkles, Trash2,
} from "lucide-react";

type Row = Record<string, unknown>;
type BlueprintPlan = {
  nameOptions: string[];
  selectedName: string;
  positioning: string;
  description: string;
  rules: string[];
  membershipQuestions: string[];
  pillars: Array<{
    name: string;
    description: string;
    objective: string;
    audienceNeed: string;
    contentRatio: number;
    formats: string[];
    exampleTopics: string[];
  }>;
  launchPlan: { setup: string[]; first7Days: string[]; first30Days: string[] };
  kpis: {
    memberTarget30Days: number;
    postsPerWeek: number;
    engagementTargetPercent: number;
    qualifiedLeadTarget30Days: number;
  };
};

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/crm/facebook-group-marketing/${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Không thể xử lý yêu cầu.");
  return result;
}

const cardClass = "rounded-2xl border border-amber-200/10 bg-[#111722]/90";
const inputClass = "min-h-11 rounded-xl border border-amber-200/10 bg-[#0b1019] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-amber-300/40";

function Modal({
  title, children, onClose,
}: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm md:items-center"
      onMouseDown={onClose}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-amber-300/15 bg-[#111722] shadow-2xl"
        onMouseDown={event => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-200/10 bg-[#111722]/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300/75">AI Group Growth</p>
            <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">Đóng</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
export default function AiGroupGrowthBuilder({
  canManage,
  isAdmin,
}: {
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [blueprints, setBlueprints] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);
  const [topics, setTopics] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [aiModels, setAiModels] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [plan, setPlan] = useState<BlueprintPlan | null>(null);
  const [planMeta, setPlanMeta] = useState<Row | null>(null);
  const [draftContext, setDraftContext] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [items, options] = await Promise.all([api("blueprints"), api("options")]);
      setBlueprints(items);
      setProducts(options.products || []);
      setTopics(options.topics || []);
      setStaff(options.staff || []);
      setAiModels(options.aiModels || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải Group Builder.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const generate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const context = {
      productIds: form.getAll("productIds").map(String).filter(Boolean),
      targetAudience: String(form.get("targetAudience") || ""),
      objective: String(form.get("objective") || ""),
      region: String(form.get("region") || ""),
      groupKind: String(form.get("groupKind") || "owned"),
      aiModel: String(form.get("aiModel") || ""),
    };
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api("blueprints/generate", {
        method: "POST",
        body: JSON.stringify(context),
      });
      setPlan(result.plan);
      setPlanMeta({
        runId: result.runId,
        provider: result.provider,
        model: result.model,
        fallbackUsed: result.fallbackUsed,
        promptVersion: result.promptVersion,
      });
      setDraftContext(context);
      setNotice("AI đã tạo bản thiết kế từ dữ liệu sản phẩm CRM. Hãy kiểm tra trước khi lưu.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI chưa tạo được blueprint.");
    } finally {
      setBusy(false);
    }
  };

  const saveBlueprint = async () => {
    if (!plan || !draftContext) return;
    setBusy(true); setError("");
    try {
      await api("blueprints", {
        method: "POST",
        body: JSON.stringify({
          ...draftContext,
          name: plan.selectedName,
          plan,
        }),
      });
      setPlan(null);
      setPlanMeta(null);
      setDraftContext(null);
      setNotice("Đã lưu blueprint và các trụ cột nội dung ở trạng thái Bản nháp.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu blueprint.");
    } finally {
      setBusy(false);
    }
  };

  const openBlueprint = async (blueprintId: unknown) => {
    setBusy(true); setError("");
    try {
      setSelected(await api(`blueprints/${blueprintId}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể mở blueprint.");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selected?.id) return;
    setBusy(true); setError("");
    try {
      await api(`blueprints/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSelected(await api(`blueprints/${selected.id}`));
      setNotice(status === "approved"
        ? "Blueprint đã được duyệt. Bước tiếp theo là tạo Group thủ công trên Facebook."
        : "Đã cập nhật trạng thái blueprint.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật blueprint.");
    } finally {
      setBusy(false);
    }
  };

  const registerGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected?.id) return;
    const form = new FormData(event.currentTarget);
    setRegistering(true); setError("");
    try {
      const detail = await api(`blueprints/${selected.id}/register-group`, {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          groupUrl: form.get("groupUrl"),
          topic: form.get("topic"),
          region: form.get("region"),
          assignedStaffId: form.get("assignedStaffId"),
        }),
      });
      setSelected(detail);
      setNotice("Đã liên kết Group Facebook thật với blueprint. Group đang chờ kiểm tra nội quy.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể liên kết Group.");
    } finally {
      setRegistering(false);
    }
  };

  const deleteBlueprint = async () => {
    if (!selected?.id || !isAdmin) return;
    if (!window.confirm("Xóa blueprint chưa liên kết Group này?")) return;
    setBusy(true); setError("");
    try {
      await api(`blueprints/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      setNotice("Đã xóa blueprint.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa blueprint.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {notice && <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">
        <CheckCircle2 size={17} /> {notice}
      </div>}
      {error && <div className="flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
        <AlertTriangle size={17} /> {error}
      </div>}

      <section className={`${cardClass} overflow-hidden`}>
        <div className="grid gap-6 p-5 xl:grid-cols-[.8fr_1.2fr]">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
              <Rocket size={22} />
            </div>
            <h2 className="text-xl font-black text-white">Tạo hệ thống Group từ sản phẩm thật</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              AI lập định vị, nội quy, trụ cột nội dung và kế hoạch 30 ngày. Việc tạo Group trên Facebook vẫn do nhân viên thực hiện.
            </p>
            <div className="mt-5 space-y-3 text-xs text-slate-400">
              {[
                "Dữ liệu sản phẩm lấy trực tiếp từ CRM",
                "Mọi kết quả AI được lưu model và prompt version",
                "Không lưu cookie hoặc token Facebook",
                "Không tự tạo, tham gia, đăng bài hay nhắn tin",
              ].map(item => <div key={item} className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-emerald-300" /> {item}
              </div>)}
            </div>
          </div>

          <form onSubmit={generate} className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm text-slate-300">
              <span>Loại Group</span>
              <select name="groupKind" className={inputClass}>
                <option value="owned">Group SmartFurni sở hữu</option>
                <option value="external_distribution">Group bên ngoài để phân phối</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm text-slate-300">
              <span>Khu vực</span>
              <input name="region" required defaultValue="Việt Nam" className={inputClass} />
            </label>
            <label className="md:col-span-2 grid gap-1.5 text-sm text-slate-300">
              <span>Model AI</span>
              <select name="aiModel" className={inputClass}>
                <option value="">Tự động theo cấu hình hệ thống</option>
                {(Array.isArray(aiModels?.models) ? aiModels.models : []).map((item: unknown) => {
                  const model = item && typeof item === "object" ? item as Row : {};
                  return <option key={String(model.id)} value={String(model.id)} disabled={!model.configured}>
                    {String(model.label)}{model.configured ? "" : " — chưa có API key"}
                  </option>;
                })}
              </select>
            </label>
            <label className="md:col-span-2 grid gap-1.5 text-sm text-slate-300">
              <span>Dòng sản phẩm <b className="text-red-300">*</b></span>
              <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-amber-200/10 bg-[#0b1019] p-3 md:grid-cols-2">
                {products.map(product => <label key={String(product.id)} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-white/[.03]">
                  <input type="checkbox" name="productIds" value={String(product.id)} className="mt-1" />
                  <span>{String(product.name)} <small className="text-slate-500">{String(product.sku || "")}</small></span>
                </label>)}
                {!products.length && <p className="text-slate-500">Chưa có sản phẩm CRM hoạt động.</p>}
              </div>
            </label>
            <label className="md:col-span-2 grid gap-1.5 text-sm text-slate-300">
              <span>Khách hàng mục tiêu <b className="text-red-300">*</b></span>
              <textarea name="targetAudience" required rows={3} className={inputClass}
                placeholder="Ví dụ: người sống trong căn hộ nhỏ, gia đình trẻ cần tối ưu diện tích..." />
            </label>
            <label className="md:col-span-2 grid gap-1.5 text-sm text-slate-300">
              <span>Mục tiêu Group <b className="text-red-300">*</b></span>
              <textarea name="objective" required rows={3} className={inputClass}
                placeholder="Giá trị cộng đồng, mục tiêu tăng trưởng và vai trò kinh doanh..." />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button disabled={!canManage || busy || !products.length}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-5 font-black text-[#171006] shadow-lg shadow-amber-500/10 disabled:cursor-not-allowed disabled:opacity-45">
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                {busy ? "AI đang xây blueprint…" : "AI xây bản thiết kế"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {plan && <section className={`${cardClass} p-5`}>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-300/70">Bản AI chờ người duyệt</p>
            <input value={plan.selectedName}
              onChange={event => setPlan(current => current ? { ...current, selectedName: event.target.value } : current)}
              className="mt-2 w-full border-0 bg-transparent p-0 text-2xl font-black text-white outline-none" />
            <p className="mt-2 text-xs text-slate-500">
              Model: {String(planMeta?.provider || "AI")} / {String(planMeta?.model || "—")}
              {planMeta?.fallbackUsed ? " · đã dùng dự phòng" : ""} · Prompt: {String(planMeta?.promptVersion || "—")}
            </p>
          </div>
          <button onClick={() => void saveBlueprint()} disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-[#171006] disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Duyệt nội dung và lưu nháp
          </button>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <label className="grid gap-1.5 text-sm text-slate-300">
            <span>Định vị</span>
            <textarea value={plan.positioning} rows={5} className={inputClass}
              onChange={event => setPlan(current => current ? { ...current, positioning: event.target.value } : current)} />
          </label>
          <label className="grid gap-1.5 text-sm text-slate-300">
            <span>Mô tả Group</span>
            <textarea value={plan.description} rows={5} className={inputClass}
              onChange={event => setPlan(current => current ? { ...current, description: event.target.value } : current)} />
          </label>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plan.pillars.map((pillar, index) => <article key={`${pillar.name}-${index}`} className="rounded-2xl border border-amber-200/10 bg-black/15 p-4">
            <div className="flex items-center justify-between">
              <Layers3 size={17} className="text-amber-300" />
              <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">{pillar.contentRatio}%</span>
            </div>
            <h3 className="mt-3 font-black text-white">{pillar.name}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">{pillar.description}</p>
            <p className="mt-3 text-[11px] text-slate-500">{pillar.exampleTopics.slice(0, 2).join(" · ")}</p>
          </article>)}
        </div>
      </section>}

      <section className={`${cardClass} p-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-white">Blueprint đã lưu</h2>
            <p className="mt-1 text-xs text-slate-500">Chỉ blueprint được duyệt mới nên chuyển sang bước tạo Group trên Facebook.</p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
        {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="animate-spin text-amber-300" /></div>
          : blueprints.length ? <div className="grid gap-3 lg:grid-cols-2">
            {blueprints.map(blueprint => <button key={String(blueprint.id)} onClick={() => void openBlueprint(blueprint.id)}
              className="group rounded-2xl border border-amber-200/10 bg-black/15 p-4 text-left transition hover:border-amber-300/30 hover:bg-amber-300/[.035]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{String(blueprint.code)}</p>
                  <h3 className="mt-1 font-black text-white">{String(blueprint.selectedName || blueprint.name)}</h3>
                </div>
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">
                  {String(blueprint.status)}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{String(blueprint.positioning || "Chưa có định vị")}</p>
              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
                <span>{Number(blueprint.pillarCount || 0)} trụ cột · {Number(blueprint.groupCount || 0)} Group</span>
                <ArrowRight size={15} className="transition group-hover:translate-x-1 group-hover:text-amber-300" />
              </div>
            </button>)}
          </div> : <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
            Chưa có blueprint. Hãy bắt đầu bằng dữ liệu sản phẩm CRM phía trên.
          </div>}
      </section>

      {selected && <Modal title={String(selected.selectedName || selected.name)} onClose={() => setSelected(null)}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/10 bg-black/15 p-4">
            <div>
              <p className="text-xs text-slate-500">{String(selected.code)} · {String(selected.groupKind)}</p>
              <p className="mt-1 text-sm font-bold text-white">Trạng thái: {String(selected.status)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage && selected.status !== "approved" && <button onClick={() => void updateStatus("approved")}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-[#171006]">
                <CheckCircle2 size={15} /> Duyệt blueprint
              </button>}
              {isAdmin && !(Array.isArray(selected.groups) && selected.groups.length) && <button onClick={() => void deleteBlueprint()}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-2.5 text-xs font-bold text-red-200">
                <Trash2 size={15} /> Xóa
              </button>}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className={`${cardClass} p-4`}>
              <h3 className="font-black text-white">Định vị</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-400">{String(selected.positioning)}</p>
            </article>
            <article className={`${cardClass} p-4`}>
              <h3 className="font-black text-white">Mô tả để dán vào Facebook</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-400">{String(selected.description)}</p>
            </article>
          </div>

          <div>
            <h3 className="mb-3 font-black text-white">Trụ cột nội dung</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {(Array.isArray(selected.pillars) ? selected.pillars : []).map((pillar: Row) =>
                <article key={String(pillar.id)} className={`${cardClass} p-4`}>
                  <div className="flex items-center justify-between">
                    <b className="text-white">{String(pillar.name)}</b>
                    <span className="text-xs text-amber-200">{Number(pillar.contentRatio || 0)}%</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{String(pillar.description)}</p>
                </article>)}
            </div>
          </div>

          {Array.isArray(selected.groups) && selected.groups.length > 0 ? <div>
            <h3 className="mb-3 font-black text-white">Group đã liên kết</h3>
            {selected.groups.map((group: Row) => <a key={String(group.id)} href={String(group.groupUrl)}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-between rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-sm">
              <span><b className="text-white">{String(group.name)}</b><small className="ml-2 text-slate-500">{String(group.lifecycleStage)}</small></span>
              <ExternalLink size={16} className="text-emerald-300" />
            </a>)}
          </div> : <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[.045] p-4">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 shrink-0 text-amber-300" size={20} />
              <div>
                <h3 className="font-black text-white">Bước thao tác trên Facebook</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Sao chép tên, mô tả và nội quy ở trên; nhân viên tạo Group trực tiếp trên Facebook. Sau đó dán URL Group thật vào biểu mẫu này.
                </p>
              </div>
            </div>
            <form onSubmit={registerGroup} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 text-xs text-slate-400">
                Tên Group
                <input name="name" required defaultValue={String(selected.selectedName || "")} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-xs text-slate-400">
                URL Group Facebook thật
                <input name="groupUrl" type="url" required placeholder="https://facebook.com/groups/..." className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-xs text-slate-400">
                Chủ đề
                <select name="topic" className={inputClass}>
                  <option value="">Chọn chủ đề</option>
                  {topics.map(topic => <option key={String(topic.key)} value={String(topic.key)}>{String(topic.label)}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs text-slate-400">
                Nhân viên phụ trách
                <select name="assignedStaffId" className={inputClass}>
                  <option value="">Chọn nhân viên</option>
                  {staff.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item.name)}</option>)}
                </select>
              </label>
              <input type="hidden" name="region" value={String(selected.region || "Việt Nam")} />
              <div className="md:col-span-2 flex flex-wrap justify-between gap-2">
                <a href="https://www.facebook.com/groups/create/" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300">
                  <ExternalLink size={15} /> Mở Facebook để tạo Group
                </a>
                <button disabled={!canManage || registering || !["approved", "launching"].includes(String(selected.status))}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-[#171006] disabled:opacity-40">
                  {registering ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Liên kết Group với CRM
                </button>
              </div>
            </form>
            {!["approved", "launching"].includes(String(selected.status)) && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200">
              <AlertTriangle size={14} /> Phải duyệt blueprint trước khi liên kết Group.
            </p>}
          </section>}

          <div className="flex flex-wrap gap-2 border-t border-amber-200/10 pt-4">
            <a href="/crm/facebook-group-marketing/content"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300">
              <FileText size={15} /> Sang lịch nội dung
            </a>
            <a href="/crm/facebook-group-marketing/tasks"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300">
              <Rocket size={15} /> Sang Publishing Desk
            </a>
          </div>
        </div>
      </Modal>}
    </div>
  );
}
