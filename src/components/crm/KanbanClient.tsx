"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Filter, Search, Phone, MapPin, Calendar,
  AlertCircle, Building2, User, Store, ChevronDown, X, RefreshCw,
} from "lucide-react";
import type { Lead, LeadStage, LeadType } from "@/lib/crm-store";
import {
  STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS,
  DISTRICTS, SOURCES, formatVND, isOverdue,
} from "@/lib/crm-store";
import AddLeadModal from "./AddLeadModal";

const STAGES: LeadStage[] = ["new", "profile_sent", "surveyed", "quoted", "negotiating", "won", "lost"];

interface Props {
  initialLeads: Lead[];
}

export default function KanbanClient({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterType, setFilterType] = useState<LeadType | "">("");
  const [filterSource, setFilterSource] = useState("");
  const [showFilters, setShowFilters] = useState(false);
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
    <div className="flex flex-col h-full" style={{ background: "#f0f2f5" }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-6 py-4"
        style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bảng Kanban</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filtered.length} khách hàng · {leads.filter(isOverdue).length} quá hạn tương tác
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 w-48"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors"
              style={{
                background: showFilters || activeFilters > 0 ? "#fef3c7" : "#f9fafb",
                borderColor: showFilters || activeFilters > 0 ? "#f59e0b" : "#e5e7eb",
                color: showFilters || activeFilters > 0 ? "#92400e" : "#374151",
              }}
            >
              <Filter size={15} />
              Bộ lọc
              {activeFilters > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: "#f59e0b", color: "#fff" }}>{activeFilters}</span>
              )}
            </button>

            {/* Refresh */}
            <button onClick={refresh}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500"
              title="Làm mới">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Add lead */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
              style={{ background: "#C9A84C" }}
            >
              <Plus size={15} />
              Thêm khách hàng
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 pt-3 flex items-center gap-3 flex-wrap"
            style={{ borderTop: "1px solid #f3f4f6" }}>
            <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30">
              <option value="">Tất cả Quận</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value as LeadType | "")}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30">
              <option value="">Tất cả loại</option>
              <option value="architect">Kiến trúc sư</option>
              <option value="investor">Chủ đầu tư CHDV</option>
              <option value="dealer">Đại lý</option>
            </select>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30">
              <option value="">Tất cả nguồn</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {activeFilters > 0 && (
              <button onClick={() => { setFilterDistrict(""); setFilterType(""); setFilterSource(""); }}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                <X size={13} /> Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full" style={{ minWidth: "max-content" }}>
          {STAGES.map(stage => {
            const stageLeads = getStageLeads(stage);
            const isWon = stage === "won";
            const isLost = stage === "lost";
            const isDragTarget = dragOver === stage;

            return (
              <div
                key={stage}
                className="flex flex-col rounded-xl transition-all duration-200"
                style={{
                  width: "260px",
                  minWidth: "260px",
                  background: isDragTarget ? "#f0fdf4" : "#f8f9fa",
                  border: `2px solid ${isDragTarget ? "#22c55e" : "transparent"}`,
                }}
                onDragOver={e => onDragOver(e, stage)}
                onDrop={e => onDrop(e, stage)}
                onDragLeave={() => setDragOver(null)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0 rounded-t-xl"
                  style={{ background: `${STAGE_COLORS[stage]}15`, borderBottom: `2px solid ${STAGE_COLORS[stage]}30` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                    <span className="text-sm font-semibold text-gray-800">{STAGE_LABELS[stage]}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: STAGE_COLORS[stage], color: "#fff" }}>
                      {stageLeads.length}
                    </span>
                    {!isLost && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-black/10 transition-colors text-gray-500"
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
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-2">
                        <Plus size={14} />
                      </div>
                      <span className="text-xs">Kéo thả vào đây</span>
                    </div>
                  )}
                  {stageLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isDragging={dragging === lead.id}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </div>

                {/* Column footer - total value */}
                {stageLeads.length > 0 && (
                  <div className="px-3 py-2 flex-shrink-0 rounded-b-xl"
                    style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: `${STAGE_COLORS[stage]}08` }}>
                    <span className="text-xs font-medium text-gray-500">
                      Tổng: {formatVND(stageLeads.reduce((s, l) => s + (l.expectedValue || 0), 0))}
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
}: {
  lead: Lead;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  const overdue = isOverdue(lead);
  const daysAgo = Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24));

  const TypeIcon = lead.type === "architect" ? User : lead.type === "investor" ? Building2 : Store;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className="rounded-xl bg-white transition-all duration-200 cursor-grab active:cursor-grabbing select-none"
      style={{
        border: overdue ? "1.5px solid #ef4444" : "1px solid #e5e7eb",
        boxShadow: isDragging
          ? "0 8px 24px rgba(0,0,0,0.15)"
          : overdue
          ? "0 0 0 3px rgba(239,68,68,0.08)"
          : "0 1px 3px rgba(0,0,0,0.06)",
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? "rotate(2deg)" : "none",
      }}
    >
      <Link href={`/crm/leads/${lead.id}`} onClick={e => e.stopPropagation()}>
        <div className="p-3">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">{lead.name}</div>
              {lead.company && (
                <div className="text-xs text-gray-500 truncate">{lead.company}</div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {overdue && (
                <div title="Quá 3 ngày chưa tương tác">
                  <AlertCircle size={14} className="text-red-500" />
                </div>
              )}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${TYPE_COLORS[lead.type]}15`, color: TYPE_COLORS[lead.type] }}>
                {TYPE_LABELS[lead.type]}
              </span>
            </div>
          </div>

          {/* Value */}
          {lead.expectedValue > 0 && (
            <div className="text-sm font-bold mb-2" style={{ color: "#C9A84C" }}>
              {formatVND(lead.expectedValue)}
            </div>
          )}

          {/* Tags row */}
          <div className="flex items-center gap-2 flex-wrap">
            {lead.district && (
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <MapPin size={11} />
                <span>{lead.district}</span>
              </div>
            )}
            {lead.unitCount > 0 && (
              <div className="text-[11px] text-gray-500">
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
                style={{ background: "#6366f1" }}>
                {lead.assignedTo.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
