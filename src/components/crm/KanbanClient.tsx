"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Plus, Filter, Search, Phone, MapPin, Calendar,
  AlertCircle, Building2, User, Store, ChevronDown, X, RefreshCw,
} from "lucide-react";
import type { Lead, LeadStage, LeadType } from "@/lib/crm-types";
import {
  STAGE_LABELS, STAGE_COLORS,
  SOURCES, formatVND, isOverdue,
} from "@/lib/crm-types";
import { VIETNAM_PROVINCES } from "@/lib/crm-locations";
import AddLeadModal from "./AddLeadModal";
import CrmFoundationHeader from "./CrmFoundationHeader";
import customerStyles from "./CustomerWorkspace.module.css";
import {
  CRM_LEAD_TYPE_OPTIONS,
  PRODUCT_LABELS,
  getLeadTypeMeta,
} from "@/lib/crm-taxonomy";

const STAGES: LeadStage[] = ["new", "profile_sent", "surveyed", "quoted", "negotiating", "won", "lost"];

interface LeadTypeItem { id: string; label: string; color?: string; }
interface Props {
  initialLeads: Lead[];
  isAdmin?: boolean;
  currentUserName?: string;
  initialLeadTypes?: LeadTypeItem[];
}
const DEFAULT_LEAD_TYPES_FALLBACK: LeadTypeItem[] = CRM_LEAD_TYPE_OPTIONS.map(item => ({ ...item }));
export default function KanbanClient({ initialLeads, isAdmin = false, currentUserName = "", initialLeadTypes }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterType, setFilterType] = useState<LeadType | "">("")
  const [filterSource, setFilterSource] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [leadTypes, setLeadTypes] = useState<LeadTypeItem[]>(
    initialLeadTypes && initialLeadTypes.length > 0 ? initialLeadTypes : DEFAULT_LEAD_TYPES_FALLBACK
  );
  useEffect(() => {
    if (initialLeadTypes && initialLeadTypes.length > 0) return; // đã có từ server
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
    return getLeadTypeMeta(typeId);
  }
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStage | null>(null);
  const [loading, setLoading] = useState(false);
  const dragLeadId = useRef<string | null>(null);

  // Filter leads
  const filtered = leads.filter(lead => {
    if (search && !lead.name.toLowerCase().includes(search.toLowerCase()) &&
      !lead.company.toLowerCase().includes(search.toLowerCase()) &&
      !lead.phone.includes(search)) return false;
    if (filterDistrict && lead.district !== filterDistrict) return false;
    if (filterType && lead.type !== filterType) return false;
    if (filterSource && lead.source !== filterSource) return false;
    return true;
  });

  const getStageLeads = (stage: LeadStage) => filtered.filter(l => l.stage === stage);

  // Drag handlers
  function onDragStart(e: React.DragEvent, leadId: string) {
    dragLeadId.current = leadId;
    setDragging(leadId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, stage: LeadStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(stage);
  }

  async function onDrop(e: React.DragEvent, stage: LeadStage) {
    e.preventDefault();
    const leadId = dragLeadId.current;
    if (!leadId) return;
    setDragging(null);
    setDragOver(null);
    dragLeadId.current = null;

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage === stage) return;

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage } : l));

    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Revert
      setLeads(prev => prev.map(l => l.id === leadId ? lead : l));
    }
  }

  function onDragEnd() {
    setDragging(null);
    setDragOver(null);
    dragLeadId.current = null;
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/leads");
      if (res.ok) setLeads(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const activeFilters = [filterDistrict, filterType, filterSource].filter(Boolean).length;

  return (
    <div
      className={`${customerStyles.workspace} ${customerStyles.kanbanWorkspace} crm-kanban flex h-full flex-col gap-3 p-3 md:p-4`}
      style={{ background: "radial-gradient(circle at 92% 2%, rgba(0,104,255,0.10), transparent 25rem), linear-gradient(160deg, #f8fbff 0%, #f4f7fb 58%, #f7fbff 100%)" }}
    >
      <CrmFoundationHeader
        active="kanban"
        title="Bảng Kanban chăm sóc"
        description={`${filtered.length} khách hàng · ${leads.filter(isOverdue).length} quá hạn tương tác`}
        variant="zalo"
      />
      {/* Header */}
      <div className="crm-admin-page-header flex-shrink-0 rounded-2xl border border-[#dbe5f1] bg-white px-4 py-3 shadow-[0_10px_28px_rgba(33,82,150,0.07)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pipeline khách hàng</h2>
            <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>
              {filtered.length} khách hàng · {leads.filter(isOverdue).length} quá hạn tương tác
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none w-48 transition-all"
                style={{ background: "#f5f8fc", border: "1px solid #dbe5f1" }}
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors"
              style={{
                background: showFilters || activeFilters > 0 ? "#eaf3ff" : "#f5f8fc",
                borderColor: showFilters || activeFilters > 0 ? "#8bbcff" : "#dbe5f1",
                color: showFilters || activeFilters > 0 ? "#0068ff" : "#64748b",
              }}
            >
              <Filter size={15} />
              Bộ lọc
              {activeFilters > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: "#0068ff", color: "#fff" }}>{activeFilters}</span>
              )}
            </button>

            {/* Refresh */}
            <button onClick={refresh}
              className="p-2 rounded-xl transition-colors"
              style={{ background: "#f5f8fc", border: "1px solid #dbe5f1", color: "#64748b" }}
              title="Làm mới">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Add lead */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-white transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #1687ff, #0068ff)", boxShadow: "0 8px 18px rgba(0,104,255,0.20)" }}
            >
              <Plus size={15} />
              Thêm khách hàng
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 pt-3 flex items-center gap-3 flex-wrap"
            style={{ borderTop: "1px solid #e7eef7" }}>
            <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-xl text-gray-900 focus:outline-none"
              style={{ background: "#f5f8fc", border: "1px solid #dbe5f1" }}>
              <option value="">Tất cả tỉnh/thành</option>
              {VIETNAM_PROVINCES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value as LeadType | "")}
              className="text-sm px-3 py-1.5 rounded-xl text-gray-900 focus:outline-none"
              style={{ background: "#f5f8fc", border: "1px solid #dbe5f1" }}>
              <option value="">Tất cả loại</option>
              {leadTypes.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.label}</option>
              ))}
            </select>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-xl text-gray-900 focus:outline-none"
              style={{ background: "#f5f8fc", border: "1px solid #dbe5f1" }}>
              <option value="">Tất cả nguồn</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {activeFilters > 0 && (
              <button onClick={() => { setFilterDistrict(""); setFilterType(""); setFilterSource(""); }}
                className="flex items-center gap-1 text-sm" style={{ color: "#f87171" }}>
                <X size={13} /> Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="crm-kanban-scroll flex-1 overflow-x-auto overflow-y-hidden">
        <div className="crm-kanban-track flex gap-3 p-1 pb-3 h-full" style={{ minWidth: "max-content" }}>
          {STAGES.map(stage => {
            const stageLeads = getStageLeads(stage);
            const isWon = stage === "won";
            const isLost = stage === "lost";
            const isDragTarget = dragOver === stage;

            return (
              <div
                key={stage}
                className="crm-kanban-column flex flex-col rounded-2xl transition-all duration-200"
                style={{
                  width: "250px",
                  minWidth: "250px",
                  background: isDragTarget ? `${STAGE_COLORS[stage]}0d` : "#f7f9fc",
                  border: `1px solid ${isDragTarget ? STAGE_COLORS[stage] + "55" : "#dbe5f1"}`,
                  minHeight: "200px",
                  boxShadow: isDragTarget ? `0 0 0 3px ${STAGE_COLORS[stage]}18` : "0 10px 24px rgba(33,82,150,0.06)",
                }}
                onDragOver={e => onDragOver(e, stage)}
                onDrop={e => onDrop(e, stage)}
                onDragLeave={() => setDragOver(null)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-3 flex-shrink-0 rounded-t-2xl"
                  style={{ background: `linear-gradient(135deg, #ffffff, ${STAGE_COLORS[stage]}0d)`, borderBottom: `1px solid ${STAGE_COLORS[stage]}25` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                    <span className="text-[12px] font-semibold" style={{ color: STAGE_COLORS[stage] }}>{STAGE_LABELS[stage]}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: `${STAGE_COLORS[stage]}20`, color: STAGE_COLORS[stage] }}>
                      {stageLeads.length}
                    </span>
                    {!isLost && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-blue-50 transition-colors text-gray-500"
                        title="Thêm khách hàng"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards container */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {stageLeads.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-8 h-8 rounded-xl border-2 border-dashed flex items-center justify-center mb-2"
                        style={{ borderColor: "#b9c9dc", color: "#94a3b8" }}>
                        <Plus size={14} />
                      </div>
                      <span className="text-xs" style={{ color: "#9ca3af" }}>Kéo thả vào đây</span>
                    </div>
                  )}
                  {stageLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isDragging={dragging === lead.id}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      getTypeInfo={getTypeInfo}
                    />
                  ))}
                </div>

                {/* Column footer - total value */}
                {stageLeads.length > 0 && (
                  <div className="px-3 py-2 flex-shrink-0 rounded-b-2xl"
                    style={{ borderTop: `1px solid ${STAGE_COLORS[stage]}18`, background: `linear-gradient(135deg, #ffffff, ${STAGE_COLORS[stage]}08)` }}>
                    <span className="text-xs font-medium" style={{ color: STAGE_COLORS[stage] + "99" }}>
                      {formatVND(stageLeads.reduce((s, l) => s + (l.expectedValue || 0), 0))}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreated={lead => {
            setLeads(prev => [lead, ...prev]);
            setShowAddModal(false);
          }}
          currentUserName={currentUserName}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  isDragging,
  onDragStart,
  onDragEnd,
  getTypeInfo,
}: {
  lead: Lead;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  getTypeInfo: (typeId: string) => { label: string; color: string };
}) {
  const overdue = isOverdue(lead);
  const daysAgo = Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
  const TypeIcon = lead.type === "architect" ? User : lead.type === "investor" ? Building2 : Store;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className="rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing select-none hover:-translate-y-0.5"
      style={{
        background: overdue ? "linear-gradient(145deg, #ffffff, #fff5f6)" : "linear-gradient(145deg, #ffffff, #fbfdff)",
        border: overdue ? "1px solid #fecdd3" : "1px solid #dbe5f1",
        boxShadow: isDragging ? "0 14px 30px rgba(33,82,150,0.18)" : overdue ? "0 8px 18px rgba(239,68,68,0.08)" : "0 6px 16px rgba(33,82,150,0.06)",
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? "rotate(1.5deg) scale(1.02)" : "none",
      }}
    >
      <Link href={`/crm/leads/${lead.id}`} onClick={e => e.stopPropagation()}>
        <div className="p-3">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">{lead.name}</div>
              {lead.company && (
                <div className="text-xs truncate" style={{ color: "#6b7280" }}>{lead.company}</div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {overdue && (
                <div title="Quá 3 ngày chưa tương tác">
                  <AlertCircle size={14} className="text-red-500" />
                </div>
              )}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${getTypeInfo(lead.type).color}15`, color: getTypeInfo(lead.type).color }}>
                {getTypeInfo(lead.type).label}
              </span>
            </div>
          </div>

          {/* Value */}
          {lead.expectedValue > 0 && (
            <div className="text-sm font-bold mb-2" style={{ color: "#C9A84C" }}>
              {formatVND(lead.expectedValue)}
            </div>
          )}

          {/* Product and operational context */}
          <div className="flex items-center gap-2 flex-wrap">
            {lead.interestedProducts?.map(product => (
              <span key={product} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                {PRODUCT_LABELS[product]}
              </span>
            ))}
            {!lead.interestedProducts?.length && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Chưa xác định sản phẩm</span>
            )}
            {lead.district && (
              <div className="flex items-center gap-1 text-[11px]" style={{ color: "#9ca3af" }}>
                <MapPin size={10} />
                <span className="truncate max-w-[80px]">{lead.district.split(",")[0]}</span>
              </div>
            )}
            {lead.unitCount > 0 && (
              <div className="text-[11px]" style={{ color: "#9ca3af" }}>
                {lead.unitCount} căn
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2"
            style={{ borderTop: "1px solid #f3f4f6" }}>
            <div className="flex items-center gap-1 text-[11px]"
              style={{ color: overdue ? "#ef4444" : "#9ca3af" }}>
              <Calendar size={11} />
              <span>{daysAgo === 0 ? "Hôm nay" : daysAgo === 1 ? "Hôm qua" : `${daysAgo} ngày trước`}</span>
            </div>
            {lead.assignedTo && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #1687ff, #0068ff)" }}>
                {lead.assignedTo.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
