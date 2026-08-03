"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check, ChevronLeft, ChevronRight, Filter, FolderPlus, Loader2, MessageSquareText,
  Plus, RefreshCw, Search, Send, Tag, UserRound, Users, X,
} from "lucide-react";

export interface ZaloCustomerView {
  userId: string;
  displayName: string;
  phone: string;
  avatar: string;
  lastUserInteraction: string | null;
  lastMessageAt: string | null;
  tags: string[];
  tagIds: string[];
}

export interface ZaloCustomerTagView {
  id: string;
  name: string;
  color: string;
  source: "oa" | "crm";
  customerCount: number;
}

export interface ZaloCustomerSegmentView {
  id: string;
  name: string;
  description: string;
  tagIds: string[];
  matchType: "any" | "all";
  activeWithinDays: number;
  customerCount: number;
  eligibleCount: number;
}

export interface ZaloCampaignView {
  id: string;
  name: string;
  segmentId: string;
  segmentName: string;
  content: string;
  status: "draft" | "sending" | "completed" | "partial" | "failed";
  totalCount: number;
  eligibleCount: number;
  sentCount: number;
  failedCount: number;
  excludedCount: number;
  createdAt: string;
}

type ActionRunner = (key: string, payload: Record<string, unknown>, success: string) => Promise<void>;

const panel = "rounded-2xl border border-[rgba(255,200,100,0.14)] bg-[#1a1200] shadow-[0_18px_55px_rgba(0,0,0,0.22)]";
const field = "w-full rounded-xl border border-[rgba(255,200,100,0.16)] bg-[#0d0b06] px-3.5 py-2.5 text-sm text-[#f5edd6] outline-none transition placeholder:text-[rgba(245,237,214,0.28)] focus:border-[rgba(255,200,100,0.42)] focus:ring-2 focus:ring-[#c9a84c]/10";
const goldButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#c9a84c] px-4 py-2.5 text-sm font-semibold text-[#171007] transition hover:bg-[#dfbf62] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,200,100,0.14)] bg-[#110d05] px-4 py-2.5 text-sm font-medium text-[rgba(245,237,214,0.72)] transition hover:border-[rgba(255,200,100,0.28)] hover:text-[#f5edd6] disabled:opacity-50";

function formatDate(value: string | null) {
  if (!value) return "Chưa tương tác";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function eligible(value: string | null) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() <= 7 * 86_400_000;
}

function Avatar({ customer }: { customer: ZaloCustomerView }) {
  const initial = customer.displayName.trim().charAt(0).toUpperCase() || "K";
  return customer.avatar ? <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/10">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={customer.avatar} alt={customer.displayName} className="h-full w-full object-cover" />
  </span> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/10 text-xs font-bold text-[#e3c86f]">{initial}</span>;
}

export default function ZaloCustomersTab({
  customers, tags, segments, campaigns, busy, isAdmin, campaignRequest, runAction, sync,
}: {
  customers: ZaloCustomerView[];
  tags: ZaloCustomerTagView[];
  segments: ZaloCustomerSegmentView[];
  campaigns: ZaloCampaignView[];
  busy: string;
  isAdmin: boolean;
  campaignRequest: number;
  runAction: ActionRunner;
  sync: () => void;
}) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [tagModal, setTagModal] = useState(false);
  const [segmentModal, setSegmentModal] = useState(false);
  const [campaignModal, setCampaignModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [assignTagId, setAssignTagId] = useState("");
  const [segmentDraft, setSegmentDraft] = useState({ name: "", description: "", tagIds: [] as string[], matchType: "any" as "any" | "all", activeWithinDays: 0 });
  const [campaignDraft, setCampaignDraft] = useState({ name: "", content: "", segmentId: "" });
  const pageSize = 20;

  useEffect(() => { if (campaignRequest > 0) setCampaignModal(true); }, [campaignRequest]);

  const filtered = useMemo(() => customers.filter(customer => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (keyword && ![customer.displayName, customer.phone, customer.userId].some(value => value.toLocaleLowerCase("vi").includes(keyword))) return false;
    if (tagFilter && !customer.tagIds.includes(tagFilter)) return false;
    if (segmentFilter) {
      const segment = segments.find(item => item.id === segmentFilter);
      if (segment) {
        const tagMatch = !segment.tagIds.length || (segment.matchType === "all" ? segment.tagIds.every(id => customer.tagIds.includes(id)) : segment.tagIds.some(id => customer.tagIds.includes(id)));
        const activeMatch = !segment.activeWithinDays || Boolean(customer.lastUserInteraction && Date.now() - new Date(customer.lastUserInteraction).getTime() <= segment.activeWithinDays * 86_400_000);
        if (!tagMatch || !activeMatch) return false;
      }
    }
    if (eligibilityFilter === "eligible" && !eligible(customer.lastUserInteraction)) return false;
    if (eligibilityFilter === "expired" && eligible(customer.lastUserInteraction)) return false;
    return true;
  }), [customers, eligibilityFilter, search, segmentFilter, segments, tagFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize);
  const crmTags = tags.filter(tag => tag.source === "crm");
  const allVisibleSelected = visible.length > 0 && visible.every(customer => selected.includes(customer.userId));
  const toggleCustomer = (userId: string) => setSelected(current => current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]);
  const toggleVisible = () => setSelected(current => allVisibleSelected ? current.filter(id => !visible.some(customer => customer.userId === id)) : Array.from(new Set([...current, ...visible.map(customer => customer.userId)])));

  async function assignTag() {
    await runAction("assign-customer-tag", { action: "assign_customer_tag", userIds: selected, tagId: assignTagId }, `Đã gắn tag cho ${selected.length} khách hàng.`);
    setAssignTagId(""); setTagModal(false); setSelected([]);
  }

  async function createTag() {
    await runAction("create-customer-tag", { action: "create_customer_tag", name: newTagName }, "Đã tạo tag CRM mới.");
    setNewTagName("");
  }

  async function createSegment() {
    await runAction("save-customer-segment", { action: "save_customer_segment", ...segmentDraft }, "Đã tạo nhóm khách hàng.");
    setSegmentDraft({ name: "", description: "", tagIds: [], matchType: "any", activeWithinDays: 0 }); setSegmentModal(false);
  }

  async function createCampaign() {
    await runAction("create-campaign", {
      action: "create_campaign", ...campaignDraft,
      userIds: campaignDraft.segmentId ? [] : selected,
    }, "Đã tạo bản nháp chiến dịch. Kiểm tra lại trước khi gửi.");
    setCampaignDraft({ name: "", content: "", segmentId: "" }); setCampaignModal(false); setSelected([]);
  }

  const stats = [
    [Users, "Tổng khách hàng", customers.length, "Từ Zalo OA"],
    [Tag, "Có tag Zalo OA", customers.filter(customer => customer.tagIds.some(id => tags.find(tag => tag.id === id)?.source === "oa")).length, `${tags.filter(tag => tag.source === "oa").length} tag đã đồng bộ`],
    [UserRound, "Chưa phân nhóm", customers.filter(customer => !customer.tagIds.length).length, "Cần phân loại"],
    [FolderPlus, "Nhóm đang hoạt động", segments.length, "Nhóm động theo điều kiện"],
  ] as const;

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([Icon, label, value, hint]) => <div key={label} className={`${panel} p-4`}><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c9a84c]/18 bg-[#c9a84c]/10 text-[#d6b75b]"><Icon size={18} /></span><div><div className="text-xs text-[rgba(245,237,214,0.48)]">{label}</div><strong className="mt-0.5 block text-2xl">{value.toLocaleString("vi-VN")}</strong></div></div><p className="mt-3 border-t border-white/6 pt-2 text-[11px] text-[rgba(245,237,214,0.34)]">{hint}</p></div>)}</div>

    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className={`${panel} h-fit overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-white/8 p-4"><h2 className="font-semibold">Nhóm khách hàng</h2>{isAdmin && <button onClick={() => setSegmentModal(true)} className="rounded-lg border border-[#c9a84c]/20 p-2 text-[#d6b75b] hover:bg-[#c9a84c]/10" title="Tạo nhóm"><Plus size={15} /></button>}</div>
        <button onClick={() => { setSegmentFilter(""); setPage(1); }} className={`flex w-full items-center justify-between border-l-2 px-4 py-3 text-left text-sm ${!segmentFilter ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#f0d77e]" : "border-transparent text-[rgba(245,237,214,0.62)] hover:bg-white/[0.025]"}`}><span>Tất cả khách hàng</span><span className="text-xs">{customers.length}</span></button>
        <div className="max-h-[420px] overflow-y-auto">{segments.map(segment => <button key={segment.id} onClick={() => { setSegmentFilter(segment.id); setPage(1); }} className={`flex w-full items-center justify-between border-l-2 px-4 py-3 text-left text-sm ${segmentFilter === segment.id ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#f0d77e]" : "border-transparent text-[rgba(245,237,214,0.56)] hover:bg-white/[0.025]"}`}><span className="min-w-0"><span className="block truncate">{segment.name}</span><span className="mt-0.5 block text-[10px] text-[rgba(245,237,214,0.30)]">{segment.eligibleCount} có thể nhắn</span></span><span className="text-xs">{segment.customerCount}</span></button>)}</div>
        {isAdmin && <div className="border-t border-white/8 p-3"><button className={`${secondaryButton} w-full`} onClick={() => setSegmentModal(true)}><FolderPlus size={14} /> Tạo nhóm mới</button></div>}
      </aside>

      <section className={`${panel} min-w-0 overflow-hidden`}>
        <div className="border-b border-white/8 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="font-semibold">Danh sách khách hàng</h2><p className="mt-1 text-xs text-[rgba(245,237,214,0.38)]">Tag OA đồng bộ một chiều; tag CRM dùng để phân loại nội bộ.</p></div><div className="flex flex-wrap gap-2"><button className={secondaryButton} onClick={sync} disabled={Boolean(busy)}>{busy === "sync-history" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Đồng bộ OA</button>{isAdmin && <button className={goldButton} onClick={() => setCampaignModal(true)}><Send size={14} /> Tạo chiến dịch</button>}</div></div>
          <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_170px_auto]">
            <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(245,237,214,0.32)]" size={15} /><input className={`${field} pl-9`} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm tên, SĐT hoặc Zalo UID" /></label>
            <select className={field} value={tagFilter} onChange={event => { setTagFilter(event.target.value); setPage(1); }}><option value="">Tất cả tag</option>{tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name} · {tag.source.toUpperCase()}</option>)}</select>
            <select className={field} value={segmentFilter} onChange={event => { setSegmentFilter(event.target.value); setPage(1); }}><option value="">Tất cả nhóm</option>{segments.map(segment => <option key={segment.id} value={segment.id}>{segment.name}</option>)}</select>
            <select className={field} value={eligibilityFilter} onChange={event => { setEligibilityFilter(event.target.value); setPage(1); }}><option value="all">Mọi trạng thái</option><option value="eligible">Có thể nhắn</option><option value="expired">Ngoài cửa sổ</option></select>
            <button className={secondaryButton}><Filter size={14} /> Bộ lọc</button>
          </div>
        </div>

        {selected.length > 0 && <div className="m-3 flex flex-col gap-3 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/[0.07] p-3 sm:flex-row sm:items-center"><span className="flex-1 text-sm font-medium">Đã chọn {selected.length} khách</span>{isAdmin && <><button className={secondaryButton} onClick={() => setTagModal(true)}><Tag size={14} /> Gắn tag</button><button className={goldButton} onClick={() => setCampaignModal(true)}><MessageSquareText size={14} /> Tạo chiến dịch chăm sóc</button></>}<button onClick={() => setSelected([])} className="p-2 text-[rgba(245,237,214,0.44)]"><X size={16} /></button></div>}

        <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-black/15 text-[10px] uppercase tracking-[0.12em] text-[rgba(245,237,214,0.34)]"><tr><th className="px-4 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} className="accent-[#c9a84c]" /></th><th className="px-3 py-3">Khách hàng</th><th className="px-3 py-3">Tag Zalo OA / CRM</th><th className="px-3 py-3">Lần tương tác cuối</th><th className="px-3 py-3">Trạng thái</th></tr></thead><tbody>{visible.map(customer => <tr key={customer.userId} className="border-t border-white/6 hover:bg-white/[0.018]"><td className="px-4 py-3"><input type="checkbox" checked={selected.includes(customer.userId)} onChange={() => toggleCustomer(customer.userId)} className="accent-[#c9a84c]" /></td><td className="px-3 py-3"><div className="flex items-center gap-3"><Avatar customer={customer} /><div><div className="font-medium">{customer.displayName}</div><div className="mt-0.5 text-[10px] text-[rgba(245,237,214,0.34)]">{customer.phone || `UID: ${customer.userId}`}</div></div></div></td><td className="max-w-[330px] px-3 py-3"><div className="flex flex-wrap gap-1.5">{customer.tagIds.map((id, index) => { const tag = tags.find(item => item.id === id); return tag ? <span key={id} className="rounded-full border px-2 py-1 text-[10px]" style={{ borderColor: `${tag.color}55`, color: tag.color, backgroundColor: `${tag.color}16` }}>{tag.name}<span className="ml-1 opacity-55">{tag.source.toUpperCase()}</span></span> : <span key={id} className="rounded-full border border-white/10 px-2 py-1 text-[10px]">{customer.tags[index]}</span>; })}{!customer.tagIds.length && <span className="text-xs text-[rgba(245,237,214,0.26)]">Chưa có tag</span>}</div></td><td className="whitespace-nowrap px-3 py-3 text-xs text-[rgba(245,237,214,0.52)]">{formatDate(customer.lastUserInteraction || customer.lastMessageAt)}</td><td className="px-3 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${eligible(customer.lastUserInteraction) ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300" : "border-amber-400/20 bg-amber-400/[0.07] text-amber-200"}`}><span className={`h-1.5 w-1.5 rounded-full ${eligible(customer.lastUserInteraction) ? "bg-emerald-300" : "bg-amber-300"}`} />{eligible(customer.lastUserInteraction) ? "Có thể nhắn" : "Ngoài cửa sổ"}</span></td></tr>)}{!visible.length && <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-[rgba(245,237,214,0.34)]">Không có khách hàng phù hợp bộ lọc.</td></tr>}</tbody></table></div>
        <div className="flex flex-col gap-3 border-t border-white/8 px-4 py-3 text-xs text-[rgba(245,237,214,0.42)] sm:flex-row sm:items-center sm:justify-between"><span>{filtered.length ? `${(Math.min(page, pageCount) - 1) * pageSize + 1}–${Math.min(Math.min(page, pageCount) * pageSize, filtered.length)} / ${filtered.length.toLocaleString("vi-VN")} khách hàng` : "0 khách hàng"}</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-lg border border-white/10 p-2 disabled:opacity-30"><ChevronLeft size={14} /></button><span>Trang {Math.min(page, pageCount)} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))} className="rounded-lg border border-white/10 p-2 disabled:opacity-30"><ChevronRight size={14} /></button></div></div>
      </section>
    </div>

    <section className={`${panel} overflow-hidden`}><div className="flex items-center justify-between border-b border-white/8 p-4"><div><h2 className="font-semibold">Chiến dịch chăm sóc gần đây</h2><p className="mt-1 text-xs text-[rgba(245,237,214,0.36)]">Mỗi lần gửi xử lý tối đa 50 khách đủ điều kiện để tránh timeout và kiểm soát hạn mức.</p></div></div><div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead className="bg-black/15 text-[10px] uppercase tracking-[0.12em] text-[rgba(245,237,214,0.34)]"><tr><th className="px-4 py-3">Chiến dịch</th><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">Khách</th><th className="px-4 py-3">Kết quả</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr></thead><tbody>{campaigns.slice(0, 8).map(campaign => <tr key={campaign.id} className="border-t border-white/6"><td className="px-4 py-3"><div className="font-medium">{campaign.name}</div><div className="mt-1 max-w-md truncate text-[10px] text-[rgba(245,237,214,0.34)]">{campaign.content}</div></td><td className="px-4 py-3 text-xs">{campaign.segmentName}</td><td className="px-4 py-3 text-xs">{campaign.eligibleCount}/{campaign.totalCount} đủ điều kiện</td><td className="px-4 py-3 text-xs text-[rgba(245,237,214,0.55)]">{campaign.sentCount} gửi · {campaign.failedCount} lỗi · {campaign.excludedCount} loại</td><td className="px-4 py-3"><span className="rounded-full border border-[#c9a84c]/20 bg-[#c9a84c]/10 px-2.5 py-1 text-[10px] text-[#e0c66f]">{{ draft: "Bản nháp", sending: "Đang gửi", completed: "Hoàn tất", partial: "Gửi một phần", failed: "Thất bại" }[campaign.status]}</span></td><td className="px-4 py-3 text-right">{isAdmin && ["draft", "partial"].includes(campaign.status) && <button className={goldButton} disabled={Boolean(busy)} onClick={() => void runAction(`send-campaign-${campaign.id}`, { action: "send_campaign", id: campaign.id }, "Đã xử lý thêm một lô người nhận.")}><Send size={13} /> {campaign.status === "draft" ? "Gửi chiến dịch" : "Tiếp tục gửi"}</button>}</td></tr>)}{!campaigns.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-[rgba(245,237,214,0.34)]">Chưa có chiến dịch chăm sóc.</td></tr>}</tbody></table></div></section>

    {tagModal && <Modal title="Gắn tag CRM" close={() => setTagModal(false)}><div className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs text-[rgba(245,237,214,0.55)]">Chọn tag nội bộ</span><select className={field} value={assignTagId} onChange={event => setAssignTagId(event.target.value)}><option value="">Chọn tag CRM</option>{crmTags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></label><div className="rounded-xl border border-white/8 bg-black/10 p-3"><div className="text-xs font-medium">Tạo tag mới</div><div className="mt-2 flex gap-2"><input className={field} value={newTagName} onChange={event => setNewTagName(event.target.value)} placeholder="Ví dụ: Cần chăm sóc" /><button className={secondaryButton} disabled={!newTagName.trim() || Boolean(busy)} onClick={() => void createTag()}><Plus size={14} /> Tạo</button></div></div><div className="flex justify-end gap-2"><button className={secondaryButton} onClick={() => setTagModal(false)}>Hủy</button><button className={goldButton} disabled={!assignTagId || Boolean(busy)} onClick={() => void assignTag()}>{busy === "assign-customer-tag" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Gắn cho {selected.length} khách</button></div></div></Modal>}

    {segmentModal && <Modal title="Tạo nhóm khách hàng" close={() => setSegmentModal(false)}><div className="space-y-4"><InputLabel label="Tên nhóm"><input className={field} value={segmentDraft.name} onChange={event => setSegmentDraft({ ...segmentDraft, name: event.target.value })} placeholder="Ví dụ: Quan tâm Sofa" /></InputLabel><InputLabel label="Mô tả"><input className={field} value={segmentDraft.description} onChange={event => setSegmentDraft({ ...segmentDraft, description: event.target.value })} /></InputLabel><InputLabel label="Điều kiện tag"><select className={field} value={segmentDraft.matchType} onChange={event => setSegmentDraft({ ...segmentDraft, matchType: event.target.value as "any" | "all" })}><option value="any">Có ít nhất một tag</option><option value="all">Có đầy đủ các tag</option></select></InputLabel><div><div className="mb-2 text-xs text-[rgba(245,237,214,0.55)]">Chọn tag</div><div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border border-white/8 p-3 sm:grid-cols-2">{tags.map(tag => <label key={tag.id} className="flex items-center gap-2 rounded-lg bg-black/10 p-2 text-xs"><input type="checkbox" className="accent-[#c9a84c]" checked={segmentDraft.tagIds.includes(tag.id)} onChange={() => setSegmentDraft(current => ({ ...current, tagIds: current.tagIds.includes(tag.id) ? current.tagIds.filter(id => id !== tag.id) : [...current.tagIds, tag.id] }))} /><span>{tag.name}</span><span className="ml-auto opacity-40">{tag.source.toUpperCase()}</span></label>)}</div></div><InputLabel label="Chỉ lấy khách tương tác trong N ngày (0 = không giới hạn)"><input type="number" min={0} max={3650} className={field} value={segmentDraft.activeWithinDays} onChange={event => setSegmentDraft({ ...segmentDraft, activeWithinDays: Number(event.target.value) })} /></InputLabel><div className="flex justify-end gap-2"><button className={secondaryButton} onClick={() => setSegmentModal(false)}>Hủy</button><button className={goldButton} disabled={!segmentDraft.name.trim() || Boolean(busy)} onClick={() => void createSegment()}><FolderPlus size={14} /> Lưu nhóm</button></div></div></Modal>}

    {campaignModal && <Modal title="Tạo chiến dịch chăm sóc" close={() => setCampaignModal(false)}><div className="space-y-4"><InputLabel label="Tên chiến dịch"><input className={field} value={campaignDraft.name} onChange={event => setCampaignDraft({ ...campaignDraft, name: event.target.value })} placeholder="Ví dụ: Chăm sóc khách quan tâm Sofa tháng 8" /></InputLabel><InputLabel label="Nguồn người nhận"><select className={field} value={campaignDraft.segmentId} onChange={event => setCampaignDraft({ ...campaignDraft, segmentId: event.target.value })}><option value="">{selected.length ? `${selected.length} khách đang chọn` : "Chọn một nhóm khách hàng"}</option>{segments.map(segment => <option key={segment.id} value={segment.id}>{segment.name} · {segment.eligibleCount}/{segment.customerCount} có thể nhắn</option>)}</select></InputLabel><InputLabel label="Nội dung tin tư vấn"><textarea rows={6} className={field} value={campaignDraft.content} onChange={event => setCampaignDraft({ ...campaignDraft, content: event.target.value })} placeholder="Nhập nội dung chăm sóc phù hợp chính sách Zalo OA..." /></InputLabel><div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-100/75">Bản nháp chỉ gồm khách còn trong cửa sổ tương tác 7 ngày. Khách không đủ điều kiện được ghi nhận là “loại trừ” và không gửi.</div><div className="flex justify-end gap-2"><button className={secondaryButton} onClick={() => setCampaignModal(false)}>Hủy</button><button className={goldButton} disabled={!campaignDraft.name.trim() || !campaignDraft.content.trim() || !campaignDraft.segmentId && !selected.length || Boolean(busy)} onClick={() => void createCampaign()}><MessageSquareText size={14} /> Tạo bản nháp</button></div></div></Modal>}
  </div>;
}

function InputLabel({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs text-[rgba(245,237,214,0.55)]">{label}</span>{children}</label>; }
function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className={`${panel} max-h-[92vh] w-full max-w-2xl overflow-y-auto`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#1a1200]/95 px-5 py-4"><h2 className="text-lg font-semibold">{title}</h2><button onClick={close} className="rounded-lg p-2 text-[rgba(245,237,214,0.45)] hover:bg-white/5"><X size={18} /></button></div><div className="p-5">{children}</div></div></div>; }
