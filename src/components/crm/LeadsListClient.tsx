"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Plus, Search, Filter, AlertCircle, Phone, MapPin, X,
  ChevronUp, ChevronDown, Users, DollarSign,
  Award, Eye, Edit3, Trash2, Loader2, UserCheck,
} from "lucide-react";
import type { Lead, LeadType, LeadStage } from "@/lib/crm-types";
import {
  STAGE_LABELS, STAGE_COLORS,
  formatVND, isOverdue,
} from "@/lib/crm-types";
import AddLeadModal from "./AddLeadModal";
import CustomerContactActions from "./high-performance-features/CustomerContactActions";

interface LeadTypeItem { id: string; label: string; color?: string; }
interface Props { initialLeads: Lead[]; isAdmin?: boolean; currentUserName?: string; initialLeadTypes?: LeadTypeItem[]; }

type SortKey = "name" | "expectedValue" | "lastContactAt" | "createdAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

const DEFAULT_LEAD_TYPES_FALLBACK: LeadTypeItem[] = [
  { id: "architect", label: "Kiến trúc sư",    color: "#8b5cf6" },
  { id: "investor",  label: "Chủ đầu tư CHDV", color: "#3b82f6" },
  { id: "dealer",    label: "Đại lý",           color: "#f59e0b" },
];

// ── Dark Luxury Color Tokens — đồng bộ với Content Marketing AI ─────────────
// Nền: linear-gradient(160deg, #0d0b1a → #1a1000 → #2a1800) — deep purple-navy → dark amber → rich brown
const C = {
  bg:         "#0d0b1a",                    // deep purple-navy
  bgGradient: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 45%, #2a1800 100%)",
  surface:    "rgba(255,255,255,0.06)",      // card bg — CM AI style
  surface2:   "rgba(255,255,255,0.04)",      // elevated card
  surfaceSolid: "#1a1200",                  // solid bg for inputs/selects
  border:     "rgba(255,255,255,0.10)",      // CM AI border
  borderGold: "rgba(245,158,11,0.30)",       // gold border
  text:       "#f5edd6",                    // CM AI primary text (warm cream)
  textMuted:  "#9ca3af",                    // CM AI muted
  textDim:    "rgba(255,255,255,0.45)",      // CM AI dim
  gold:       "#f59e0b",                    // CM AI gold
  goldDark:   "#d97706",                    // CM AI gold dark
  goldBg:     "rgba(245,158,11,0.15)",       // gold bg tint
  goldBorder: "rgba(245,158,11,0.25)",       // gold border
  blue:       "#60a5fa",                    // soft blue
  blueBg:     "rgba(96,165,250,0.15)",       // blue bg tint
  green:      "#4ade80",                    // soft green
  greenBg:    "rgba(74,222,128,0.15)",       // green bg tint
  red:        "#f87171",                    // soft red
  redBg:      "rgba(248,113,113,0.15)",      // red bg tint
  purple:     "#c084fc",                    // soft purple
  purpleBg:   "rgba(192,132,252,0.15)",      // purple bg tint
  headerBg:   "rgba(0,0,0,0.25)",           // table header
  rowHover:   "rgba(245,158,11,0.06)",       // row hover — warm gold tint
  rowBorder:  "rgba(255,255,255,0.06)",      // row divider
};

export default function LeadsListClient({ initialLeads, isAdmin = false, currentUserName = "", initialLeadTypes }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "">("");
  const [filterType, setFilterType] = useState<LeadType | "">("");
  const [filterAssigned, setFilterAssigned] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [leadTypes, setLeadTypes] = useState<LeadTypeItem[]>(
    initialLeadTypes && initialLeadTypes.length > 0 ? initialLeadTypes : DEFAULT_LEAD_TYPES_FALLBACK
  );

  useEffect(() => {
    if (initialLeadTypes && initialLeadTypes.length > 0) return;
    fetch("/api/crm/settings/lead-types")
      .then(r => r.ok ? r.json() : [])
      .then((data: LeadTypeItem[]) => {
        if (Array.isArray(data) && data.length > 0) setLeadTypes(data);
      })
      .catch(() => {});
  }, []);

  const DEFAULT_COLORS = ["#8b5cf6","#3b82f6","#f59e0b","#10b981","#ef4444","#ec4899","#14b8a6","#f97316"];
  function getTypeInfo(typeId: string) {
    const found = leadTypes.find(lt => lt.id === typeId);
    if (found) return { label: found.label, color: found.color || DEFAULT_COLORS[leadTypes.indexOf(found) % DEFAULT_COLORS.length] };
    if (typeId === "architect") return { label: "Kiến trúc sư", color: "#8b5cf6" };
    if (typeId === "investor")  return { label: "Chủ đầu tư CHDV", color: "#3b82f6" };
    if (typeId === "dealer")    return { label: "Đại lý", color: "#f59e0b" };
    return { label: typeId || "Không rõ", color: "#6b7280" };
  }

  // Danh sách nhân viên phụ trách duy nhất
  const assigneeList = useMemo(() => {
    const names = [...new Set(leads.map(l => l.assignedTo).filter(Boolean))].sort();
    return names;
  }, [leads]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("lastContactAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = leads.filter(l => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
        !l.company.toLowerCase().includes(search.toLowerCase()) &&
        !l.phone.includes(search)) return false;
      if (filterStage && l.stage !== filterStage) return false;
      if (filterType && l.type !== filterType) return false;
      if (filterAssigned && l.assignedTo !== filterAssigned) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let va: string | number = a[sortKey] ?? "";
      let vb: string | number = b[sortKey] ?? "";
      if (sortKey === "expectedValue") { va = Number(va); vb = Number(vb); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [leads, search, filterStage, filterType, filterAssigned, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = [filterStage, filterType, filterAssigned].filter(Boolean).length;

  const overdueCount = leads.filter(isOverdue).length;
  const wonCount = leads.filter(l => l.stage === "won").length;
  const totalValue = leads.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const winRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown size={11} style={{ color: C.textMuted, opacity: 0.5 }} />;
    return sortDir === "asc"
      ? <ChevronUp size={11} style={{ color: C.gold }} />
      : <ChevronDown size={11} style={{ color: C.gold }} />;
  }

  // Avatar initials color based on name
  function avatarColor(name: string) {
    const colors = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#14B8A6","#F97316"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/crm/leads/${id}`, { method: "DELETE" });
      setLeads(prev => prev.filter(l => l.id !== id));
      setConfirmDeleteId(null);
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: C.bgGradient }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 py-4" style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: C.text }}>Quản lý khách hàng</h1>
            <p className="text-sm mt-0.5" style={{ color: C.textMuted }}>
              {filtered.length} / {leads.length} khách hàng
              {overdueCount > 0 && (
                <span className="ml-2 font-semibold" style={{ color: C.red }}>· {overdueCount} quá hạn</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
              <input
                type="text"
                placeholder="Tìm tên, công ty, SĐT..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  caretColor: C.gold,
                }}
                className="pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none w-52 placeholder:text-slate-500"
              />
            </div>
            {/* Filter */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-all"
              style={{
                background: activeFilters > 0 ? C.goldBg : C.surface2,
                border: `1px solid ${activeFilters > 0 ? C.gold : C.border}`,
                color: activeFilters > 0 ? C.gold : C.textDim,
              }}>
              <Filter size={14} />
              Bộ lọc {activeFilters > 0 && `(${activeFilters})`}
            </button>
            {/* Add */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, color: "#fff", boxShadow: "0 4px 16px rgba(245,158,11,0.35)" }}>
              <Plus size={14} /> Thêm khách hàng
            </button>
          </div>
        </div>

        {/* Filters row */}
        {showFilters && (
          <div className="mt-3 pt-3 flex items-center gap-3 flex-wrap" style={{ borderTop: `1px solid ${C.border}` }}>
            <select
              value={filterStage}
              onChange={e => { setFilterStage(e.target.value as LeadStage | ""); setPage(1); }}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text }}
              className="text-sm px-3 py-1.5 rounded-xl focus:outline-none">
              <option value="">Tất cả giai đoạn</option>
              {(Object.keys(STAGE_LABELS) as LeadStage[]).map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value as LeadType | ""); setPage(1); }}
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text }}
              className="text-sm px-3 py-1.5 rounded-xl focus:outline-none">
              <option value="">Tất cả loại</option>
              {leadTypes.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.label}</option>
              ))}
            </select>
            {/* Filter by assignee */}
            {(isAdmin || assigneeList.length > 1) && (
              <select
                value={filterAssigned}
                onChange={e => { setFilterAssigned(e.target.value); setPage(1); }}
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text }}
                className="text-sm px-3 py-1.5 rounded-xl focus:outline-none">
                <option value="">Tất cả nhân viên</option>
                {assigneeList.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterStage(""); setFilterType(""); setFilterAssigned(""); setPage(1); }}
                className="flex items-center gap-1 text-sm transition-colors"
                style={{ color: C.red }}>
                <X size={13} /> Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Summary Stats ── */}
      <div className="flex-shrink-0 px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users,       label: "Tổng khách hàng", value: String(leads.length),    color: C.blue,   bg: C.blueBg,   sub: `${leads.filter(l => !["won","lost"].includes(l.stage)).length} đang theo dõi` },
          { icon: DollarSign,  label: "Tổng giá trị",    value: formatVND(totalValue),   color: C.gold,   bg: C.goldBg,   sub: "Pipeline" },
          { icon: Award,       label: "Tỷ lệ chốt",      value: `${winRate}%`,           color: C.green,  bg: C.greenBg,  sub: `${wonCount} đơn thành công` },
          { icon: AlertCircle, label: "Cần liên hệ",     value: String(overdueCount),    color: C.red,    bg: C.redBg,    sub: "Quá 3 ngày" },
        ].map(({ icon: Icon, label, value, color, bg, sub }) => (
          <div key={label} className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] truncate" style={{ color: C.textMuted }}>{label}</div>
              <div className="text-sm font-bold truncate" style={{ color: C.text }}>{value}</div>
              <div className="text-[10px] truncate" style={{ color: C.textMuted }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.surface }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: C.headerBg, borderBottom: `1px solid ${C.border}` }}>
                {/* Khách hàng */}
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort("name")}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: C.textMuted }}>
                    Khách hàng <SortIcon k="name" />
                  </button>
                </th>
                {/* Loại */}
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: C.textMuted }}>Loại</th>
                {/* Giai đoạn */}
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: C.textMuted }}>Giai đoạn</th>
                {/* NV phụ trách */}
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest hidden md:table-cell"
                  style={{ color: C.textMuted }}>NV Phụ trách</th>
                {/* Khu vực */}
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest hidden lg:table-cell"
                  style={{ color: C.textMuted }}>Khu vực</th>
                {/* Giá trị */}
                <th className="text-right px-4 py-3">
                  <button onClick={() => toggleSort("expectedValue")}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest ml-auto"
                    style={{ color: C.textMuted }}>
                    Giá trị <SortIcon k="expectedValue" />
                  </button>
                </th>
                {/* Tương tác */}
                <th className="text-left px-4 py-3 hidden xl:table-cell">
                  <button onClick={() => toggleSort("lastContactAt")}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: C.textMuted }}>
                    Tương tác cuối <SortIcon k="lastContactAt" />
                  </button>
                </th>
                {/* Thao tác */}
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: C.textMuted }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}` }}>
                        <Users size={24} style={{ color: C.textMuted }} />
                      </div>
                      <p className="text-sm" style={{ color: C.textMuted }}>Không có khách hàng nào</p>
                      {(search || activeFilters > 0) && (
                        <button onClick={() => { setSearch(""); setFilterStage(""); setFilterType(""); setFilterAssigned(""); }}
                          className="text-xs hover:underline" style={{ color: C.gold }}>
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {paginated.map((lead, idx) => {
                const overdue = isOverdue(lead);
                const daysAgo = Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
                const typeInfo = getTypeInfo(lead.type);
                const isOwnLead = lead.assignedTo === currentUserName;
                return (
                  <tr
                    key={lead.id}
                    style={{
                      borderBottom: `1px solid ${C.rowBorder}`,
                      borderLeft: overdue ? `3px solid ${C.red}` : `3px solid ${isOwnLead ? C.gold : "rgba(255,255,255,0.15)"}`,
                      background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)")}
                  >
                    {/* Customer */}
                    <td className="px-4 py-3">
                      <Link href={`/crm/leads/${lead.id}`} className="block group">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{
                              background: overdue
                                ? `linear-gradient(135deg, ${C.red}, #dc2626)`
                                : `linear-gradient(135deg, ${avatarColor(lead.name)}, ${avatarColor(lead.name)}bb)`,
                              boxShadow: `0 2px 8px ${overdue ? C.red : avatarColor(lead.name)}40`,
                            }}>
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate max-w-[150px] flex items-center gap-1"
                              style={{ color: overdue ? C.red : C.text }}>
                              {overdue && <AlertCircle size={11} style={{ color: C.red, flexShrink: 0 }} />}
                              {lead.name}
                            </div>
                            {lead.company && (
                              <div className="text-xs truncate max-w-[150px]" style={{ color: C.textMuted }}>{lead.company}</div>
                            )}
                            <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: C.textMuted }}>
                              <Phone size={9} /> {lead.phone}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ background: `${typeInfo.color}20`, color: typeInfo.color, border: `1px solid ${typeInfo.color}30` }}>
                        {typeInfo.label}
                      </span>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{
                          background: `${STAGE_COLORS[lead.stage]}20`,
                          color: STAGE_COLORS[lead.stage],
                          border: `1px solid ${STAGE_COLORS[lead.stage]}30`,
                        }}>
                        {STAGE_LABELS[lead.stage]}
                      </span>
                    </td>

                    {/* Assigned To */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {lead.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${avatarColor(lead.assignedTo)}, ${avatarColor(lead.assignedTo)}bb)` }}>
                            {lead.assignedTo.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs truncate max-w-[100px]"
                            style={{ color: isOwnLead ? C.gold : C.textDim }}>
                            {lead.assignedTo}
                          </span>
                          {isOwnLead && (
                            <UserCheck size={11} style={{ color: C.gold, flexShrink: 0 }} />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: C.textMuted }}>—</span>
                      )}
                    </td>

                    {/* District */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-xs" style={{ color: C.textDim }}>
                        <MapPin size={10} style={{ flexShrink: 0 }} />
                        <span className="truncate max-w-[90px]">{lead.district || "—"}</span>
                      </div>
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-sm whitespace-nowrap"
                        style={{ color: lead.expectedValue > 0 ? C.gold : C.textMuted }}>
                        {lead.expectedValue > 0 ? formatVND(lead.expectedValue) : "—"}
                      </span>
                    </td>

                    {/* Last contact */}
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className={`text-xs whitespace-nowrap font-medium`}
                        style={{ color: overdue ? C.red : daysAgo <= 1 ? C.green : C.textDim }}>
                        {daysAgo === 0 ? "Hôm nay" : daysAgo === 1 ? "Hôm qua" : `${daysAgo} ngày trước`}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <CustomerContactActions lead={lead} />
                        <Link href={`/crm/leads/${lead.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ color: C.textMuted, background: "transparent" }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.color = C.blue;
                            (e.currentTarget as HTMLElement).style.background = C.blueBg;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.color = C.textMuted;
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                          title="Xem chi tiết">
                          <Eye size={14} />
                        </Link>
                        <Link href={`/crm/leads/${lead.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ color: C.textMuted, background: "transparent" }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.color = C.gold;
                            (e.currentTarget as HTMLElement).style.background = C.goldBg;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.color = C.textMuted;
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                          title="Chỉnh sửa">
                          <Edit3 size={14} />
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => setConfirmDeleteId(lead.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: C.textMuted, background: "transparent" }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.color = C.red;
                              (e.currentTarget as HTMLElement).style.background = C.redBg;
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.color = C.textMuted;
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                            }}
                            title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <span className="text-xs" style={{ color: C.textMuted }}>
                Trang {page} / {totalPages} · {filtered.length} khách hàng
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ border: `1px solid ${C.border}`, color: C.textDim, background: "rgba(255,255,255,0.07)" }}>
                  ← Trước
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-8 h-8 text-xs rounded-xl transition-all"
                      style={{
                        background: page === p ? C.gold : C.surface2,
                        border: `1px solid ${page === p ? C.gold : C.border}`,
                        color: page === p ? "#0B0F1A" : C.textDim,
                        fontWeight: page === p ? 700 : 400,
                      }}>
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ border: `1px solid ${C.border}`, color: C.textDim, background: "rgba(255,255,255,0.07)" }}>
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreated={lead => { setLeads(prev => [lead, ...prev]); setShowAddModal(false); }}
          currentUserName={currentUserName}
          isAdmin={isAdmin}
        />
      )}

      {/* Delete Confirm Modal */}
      {confirmDeleteId && (() => {
        const lead = leads.find(l => l.id === confirmDeleteId);
        if (!lead) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={e => { if (e.target === e.currentTarget) setConfirmDeleteId(null); }}>
            <div className="rounded-2xl shadow-2xl w-full max-w-sm p-6"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: C.redBg }}>
                  <Trash2 size={18} style={{ color: C.red }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: C.text }}>Xóa khách hàng?</h2>
                  <p className="text-sm mt-0.5" style={{ color: C.textMuted }}>Thao tác này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-sm mb-5 p-3 rounded-xl" style={{ color: C.textDim, background: C.surface2 }}>
                Bạn có chắc muốn xóa <strong style={{ color: C.text }}>{lead.name}</strong>? Tất cả hoạt động, báo giá và công việc liên quan cũng sẽ bị xóa.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2.5 text-sm rounded-xl transition-all"
                  style={{ border: `1px solid ${C.border}`, color: C.textDim, background: C.surface2 }}>
                  Hủy
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={deletingId === confirmDeleteId}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-2"
                  style={{ background: C.red }}>
                  {deletingId === confirmDeleteId && <Loader2 size={14} className="animate-spin" />}
                  Xóa khách hàng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
