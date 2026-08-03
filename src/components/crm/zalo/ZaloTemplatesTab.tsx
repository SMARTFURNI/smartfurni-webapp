"use client";

import { useMemo, useState } from "react";
import {
  Ban, CheckCircle2, ChevronRight, Clock3, ExternalLink, FileText, Loader2,
  Pencil, Phone, Plus, RefreshCw, Search, ShieldCheck, Smartphone, XCircle,
} from "lucide-react";

export type ZaloTemplateApprovalStatus = "LOCAL" | "PENDING_REVIEW" | "ENABLE" | "REJECT" | "DISABLE" | "DELETE";
export type ZaloTemplateCategory = "consultation" | "zbs_transaction" | "zbs_after_sale";

export interface ZaloTemplateView {
  id: string;
  name: string;
  category: ZaloTemplateCategory;
  content: string;
  zbsTemplateId: string;
  variables: string[];
  isActive: boolean;
  requiresApproval: boolean;
  approvalStatus: ZaloTemplateApprovalStatus;
  quality: "HIGH" | "MEDIUM" | "LOW" | "UNDEFINED";
  templateTag: string;
  reason: string;
  previewUrl: string;
  priceSdt: string;
  priceUid: string;
  buttons: Array<{ type: number; title: string; content: string }>;
  source: "crm" | "zalo";
  zaloCreatedAt: string | null;
  syncedAt: string | null;
  updatedAt: string;
}

export interface ZaloTemplateSyncView {
  status: "never" | "running" | "completed" | "partial" | "failed";
  startedAt: string | null;
  finishedAt: string | null;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  disabled: number;
  warnings: string[];
  error: string;
}

const panel = "rounded-2xl border border-[rgba(255,200,100,0.14)] bg-[linear-gradient(145deg,rgba(31,22,3,0.96),rgba(15,12,7,0.98))] shadow-[0_18px_50px_rgba(0,0,0,0.22)]";
const goldButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6b64f] px-4 py-2.5 text-sm font-semibold text-[#171005] shadow-[0_8px_24px_rgba(201,168,76,0.18)] transition hover:bg-[#e3c862] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,200,100,0.14)] bg-black/15 px-4 py-2.5 text-sm text-[rgba(245,237,214,0.72)] transition hover:border-[rgba(255,200,100,0.26)] hover:bg-[#c9a84c]/8 hover:text-[#f5edd6] disabled:cursor-not-allowed disabled:opacity-50";

const STATUS_META: Record<ZaloTemplateApprovalStatus, { label: string; classes: string; icon: typeof CheckCircle2 }> = {
  ENABLE: { label: "Đã duyệt", classes: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200", icon: CheckCircle2 },
  PENDING_REVIEW: { label: "Đang duyệt", classes: "border-sky-400/25 bg-sky-400/10 text-sky-200", icon: Clock3 },
  REJECT: { label: "Bị từ chối", classes: "border-red-400/25 bg-red-400/10 text-red-200", icon: XCircle },
  DISABLE: { label: "Đã tắt", classes: "border-amber-400/25 bg-amber-400/10 text-amber-100", icon: Ban },
  DELETE: { label: "Đã xóa", classes: "border-white/10 bg-white/[0.04] text-[#8f99aa]", icon: Ban },
  LOCAL: { label: "Chưa gửi duyệt", classes: "border-violet-400/25 bg-violet-400/10 text-violet-200", icon: FileText },
};

function formatDate(value: string | null) {
  if (!value) return "Chưa có thời gian";
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function categoryLabel(item: ZaloTemplateView) {
  const tag = item.templateTag.toUpperCase();
  if (tag.includes("TRANSACTION")) return "Tin Giao dịch";
  if (tag.includes("CUSTOMER_CARE")) return "Tin Chăm sóc khách hàng";
  if (tag.includes("PROMOTION")) return "Tin Truyền thông";
  if (item.category === "zbs_transaction") return "ZBS giao dịch";
  if (item.category === "zbs_after_sale") return "Tin Truyền thông";
  return "Tin tư vấn nội bộ";
}

function StatusBadge({ status }: { status: ZaloTemplateApprovalStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.classes}`}><Icon size={12} />{meta.label}</span>;
}

export default function ZaloTemplatesTab({ templates, syncSummary, configured, busy, sync, open }: {
  templates: ZaloTemplateView[];
  syncSummary: ZaloTemplateSyncView;
  configured: boolean;
  busy: boolean;
  sync: () => void;
  open: (item?: ZaloTemplateView) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selectedId, setSelectedId] = useState("");

  const counts = useMemo(() => ({
    all: templates.length,
    approved: templates.filter(item => item.approvalStatus === "ENABLE").length,
    pending: templates.filter(item => item.approvalStatus === "PENDING_REVIEW").length,
    unapproved: templates.filter(item => item.approvalStatus !== "ENABLE").length,
  }), [templates]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi");
    const filtered = templates.filter(item => {
      const searchable = `${item.name} ${item.zbsTemplateId} ${categoryLabel(item)}`.toLocaleLowerCase("vi");
      if (keyword && !searchable.includes(keyword)) return false;
      if (status === "approved") return item.approvalStatus === "ENABLE";
      if (status === "pending") return item.approvalStatus === "PENDING_REVIEW";
      if (status === "unapproved") return item.approvalStatus !== "ENABLE";
      if (status === "rejected") return item.approvalStatus === "REJECT";
      if (status === "disabled") return ["DISABLE", "DELETE"].includes(item.approvalStatus);
      if (status === "local") return item.approvalStatus === "LOCAL";
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "vi");
      const left = new Date(a.zaloCreatedAt || a.updatedAt).getTime();
      const right = new Date(b.zaloCreatedAt || b.updatedAt).getTime();
      return sort === "oldest" ? left - right : right - left;
    });
  }, [query, sort, status, templates]);

  const selected = visible.find(item => item.id === selectedId) || visible[0] || null;
  const latestSync = syncSummary.finishedAt || templates.find(item => item.syncedAt)?.syncedAt || null;

  return <div className="space-y-4">
    <section className={`${panel} overflow-hidden`}>
      <div className="flex flex-col gap-4 border-b border-[rgba(255,200,100,0.10)] p-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-semibold">Quản lý Template</h2><span className="rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/10 px-2.5 py-1 text-[11px] font-semibold text-[#e3c86f]">ZBS Template Message</span></div>
          <p className="mt-1 text-sm text-[#8f99aa]">Đồng bộ trạng thái kiểm duyệt và xem trước template giống Zalo OA Manager.</p>
          {latestSync && <p className="mt-1 text-xs text-[#6f7b8d]">Đồng bộ gần nhất: {formatDate(latestSync)}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={secondaryButton} disabled={busy || !configured} onClick={sync}>{busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} {busy ? "Đang đồng bộ..." : "Đồng bộ Template"}</button>
          <button className={goldButton} onClick={() => open()}><Plus size={15} /> Tạo mẫu nội bộ</button>
        </div>
      </div>
      <div className="grid gap-px bg-[rgba(255,200,100,0.08)] sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Tất cả Template", counts.all, "text-[#e0c66f]", "blue"],
          ["Đã duyệt", counts.approved, "text-emerald-300", "emerald"],
          ["Đang duyệt", counts.pending, "text-sky-300", "violet"],
          ["Chưa được duyệt", counts.unapproved, "text-amber-200", "amber"],
        ].map(([label, value, color, tone]) => <div key={String(label)} data-zalo-tone={tone} className="bg-[#130f08] px-5 py-4"><div className={`text-2xl font-semibold ${color}`}>{value}</div><div className="mt-1 text-xs text-[#738095]">{label}</div></div>)}
      </div>
    </section>

    {syncSummary.error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-200">{syncSummary.error}</div>}
    {syncSummary.warnings.length > 0 && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs leading-5 text-amber-100/80">{syncSummary.warnings.slice(0, 3).join(" • ")}</div>}
    {!configured && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100">Hãy kích hoạt kết nối OA và lưu Access Token có quyền <strong>Quản lý Message Template</strong> trước khi đồng bộ.</div>}

    <div className="grid min-h-[650px] gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section className={`${panel} overflow-hidden`}>
        <div className="grid gap-3 border-b border-[rgba(255,200,100,0.10)] p-4 md:grid-cols-[minmax(240px,1fr)_190px_190px]">
          <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7b8d]" size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo ID hoặc tên template" className="w-full rounded-xl border border-[rgba(255,200,100,0.12)] bg-[#0b111d] py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-[#536071] focus:border-[#c9a84c]/40" /></label>
          <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-[rgba(255,200,100,0.12)] bg-[#0b111d] px-3 py-2.5 text-sm text-[#c0c7d2] outline-none focus:border-[#c9a84c]/40"><option value="all">Tất cả trạng thái</option><option value="approved">Đã duyệt</option><option value="pending">Đang duyệt</option><option value="unapproved">Chưa được duyệt</option><option value="rejected">Bị từ chối</option><option value="disabled">Đã tắt / đã xóa</option><option value="local">Mẫu nội bộ</option></select>
          <select value={sort} onChange={event => setSort(event.target.value)} className="rounded-xl border border-[rgba(255,200,100,0.12)] bg-[#0b111d] px-3 py-2.5 text-sm text-[#c0c7d2] outline-none focus:border-[#c9a84c]/40"><option value="newest">Tạo gần nhất</option><option value="oldest">Tạo lâu nhất</option><option value="name">Tên A–Z</option></select>
        </div>

        <div className="divide-y divide-[rgba(255,200,100,0.08)]">
          {visible.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`group flex w-full items-start gap-4 px-4 py-4 text-left transition hover:bg-[#c9a84c]/[0.05] md:px-5 ${selected?.id === item.id ? "bg-[#c9a84c]/[0.08] shadow-[inset_3px_0_0_#c9a84c]" : ""}`}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,200,100,0.12)] bg-[linear-gradient(145deg,#172133,#0c1220)]"><FileText size={24} className="text-[#d6b75b]" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-[#f5edd6]">{item.name}</h3><StatusBadge status={item.approvalStatus} /></div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#7f8998]"><span>{categoryLabel(item)}</span><span>•</span><span>{item.zbsTemplateId ? `ID${item.zbsTemplateId}` : "Mẫu nội bộ"}</span><span>•</span><span>{item.source === "zalo" ? "Zalo OA" : "CRM"}</span></div>
              {item.reason && item.approvalStatus === "REJECT" && <p className="mt-2 line-clamp-2 text-xs leading-5 text-red-200/75">{item.reason}</p>}
              <p className="mt-2 text-xs text-[#697587]">{formatDate(item.zaloCreatedAt || item.updatedAt)}</p>
            </div>
            <ChevronRight size={18} className="mt-4 shrink-0 text-[#596576] transition group-hover:translate-x-0.5 group-hover:text-[#d6b75b]" />
          </button>)}
          {!visible.length && <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center text-sm text-[#687487]"><Search size={30} className="mb-3 text-[#c9a84c]/40" /><p>Không có template phù hợp bộ lọc.</p></div>}
        </div>
      </section>

      <aside className={`${panel} h-fit overflow-hidden xl:sticky xl:top-4`}>
        <div className="flex items-center justify-between border-b border-[rgba(255,200,100,0.10)] px-5 py-4"><div><div className="text-sm font-semibold">Xem trước</div><div className="mt-0.5 text-xs text-[#697587]">Hiển thị theo mẫu Zalo OA</div></div>{selected && <StatusBadge status={selected.approvalStatus} />}</div>
        {selected ? <>
          <div className="bg-[linear-gradient(180deg,#e8edf2,#d7dde5)] p-4">
            {selected.previewUrl ? <iframe title={`Xem trước ${selected.name}`} src={selected.previewUrl} className="h-[500px] w-full rounded-2xl border-0 bg-white shadow-[0_16px_35px_rgba(26,40,59,0.18)]" /> : <div className="mx-auto min-h-[430px] max-w-[340px] rounded-[28px] border-[7px] border-[#152033] bg-[#eef2f6] p-3 shadow-[0_16px_35px_rgba(26,40,59,0.20)]">
              <div className="mb-3 flex items-center justify-between px-2 text-[10px] font-semibold text-[#25344b]"><span>9:41</span><span>ZOA Testing</span></div>
              <div className="rounded-2xl bg-white p-4 text-[#202b3d] shadow-sm"><div className="mb-3 flex h-32 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#d9e4ef,#f7f9fb)]"><FileText className="text-[#4677a9]" size={38} /></div><h3 className="text-sm font-bold">{selected.name}</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#536174]">{selected.content || "Nội dung chi tiết được quản lý trên Zalo OA. Đồng bộ thành công để mở bản xem trước chính thức."}</p>{selected.variables.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{selected.variables.map(variable => <span key={variable} className="rounded-md bg-[#edf3fa] px-2 py-1 text-[10px] text-[#41688e]">{`<${variable}>`}</span>)}</div>}{selected.buttons.map((button, index) => <div key={`${button.title}-${index}`} className="mt-3 border-t border-[#e6eaf0] pt-3 text-center text-xs font-semibold text-[#2074c8]">{button.title}</div>)}</div>
            </div>}
          </div>

          <div className="space-y-4 p-5">
            <div><h3 className="font-semibold leading-6">{selected.name}</h3><div className="mt-1 text-xs text-[#7b8798]">{categoryLabel(selected)} {selected.zbsTemplateId && `• ID${selected.zbsTemplateId}`}</div></div>
            {selected.reason && <div className={`rounded-xl border p-3 text-xs leading-5 ${selected.approvalStatus === "REJECT" ? "border-red-400/20 bg-red-400/[0.07] text-red-200" : "border-amber-400/20 bg-amber-400/[0.06] text-amber-100"}`}><strong>Lý do trạng thái:</strong> {selected.reason}</div>}
            {selected.approvalStatus === "ENABLE" && <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-xs leading-5 text-emerald-200"><ShieldCheck size={16} className="mt-0.5 shrink-0" /><span>Mẫu đã được Zalo duyệt và có thể chọn khi gửi chiến dịch.</span></div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-black/10 p-3"><div className="flex items-center gap-2 text-xs text-[#778396]"><Phone size={14} />Gửi qua SĐT</div><div className="mt-1 font-semibold text-[#e4c96e]">{selected.priceSdt ? `${selected.priceSdt}đ/tin` : "Theo biểu phí"}</div></div>
              <div className="rounded-xl border border-white/8 bg-black/10 p-3"><div className="flex items-center gap-2 text-xs text-[#778396]"><Smartphone size={14} />Gửi theo UID</div><div className="mt-1 font-semibold text-[#e4c96e]">{selected.priceUid ? `${selected.priceUid}đ/tin` : "Theo biểu phí"}</div></div>
            </div>
            <div className="flex gap-2">
              {selected.previewUrl && <a href={selected.previewUrl} target="_blank" rel="noreferrer" className={`${secondaryButton} flex-1`}><ExternalLink size={14} /> Xem chi tiết</a>}
              {selected.source === "crm" && <button className={`${secondaryButton} flex-1`} onClick={() => open(selected)}><Pencil size={14} /> Chỉnh sửa</button>}
            </div>
          </div>
        </> : <div className="flex min-h-[520px] flex-col items-center justify-center p-8 text-center text-sm text-[#687487]"><FileText size={34} className="mb-3 text-[#c9a84c]/40" /><p>Chọn một template để xem trước.</p></div>}
      </aside>
    </div>
  </div>;
}
