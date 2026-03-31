"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Filter, Search, Phone, MapPin, Calendar,
  AlertCircle, Building2, User, Store, ChevronDown, X, RefreshCw,
} from "lucide-react";
import type { Lead, LeadStage, LeadType } from "@/lib/crm-types";
import {
  STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS,
  SOURCES, formatVND, isOverdue,
} from "@/lib/crm-types";
import { VIETNAM_PROVINCES } from "@/lib/crm-locations";
import AddLeadModal from "./AddLeadModal";
import React from "react";

const STAGES: LeadStage[] = ["new", "profile_sent", "surveyed", "quoted", "negotiating", "won", "lost"];

interface Props {
  initialLeads: Lead[];
  isAdmin?: boolean;
  currentUserName?: string;
}

export default function KanbanClient({ initialLeads, isAdmin = false, currentUserName = "" }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterType, setFilterType] = useState<LeadType | "">("")
  const [filterSource, setFilterSource] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStage | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadTypes, setLeadTypes] = useState<Array<{id: string; label: string}>>([]);
  const dragLeadId = useRef<string | null>(null);

  React.useEffect(() => {
    const loadLeadTypes = async () => {
      try {
        const res = await fetch("/api/crm/lead-types");
        if (res.ok) {
          const types = await res.json();
          setLeadTypes(types || []);
        }
      } catch (e) {
        console.error("Failed to load lead types:", e);
      }
    };
    loadLeadTypes();
  }, []);

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

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Bộ lọc"
          >
            <Filter size={18} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Thêm khách</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Quận/Huyện</label>
              <select
                value={filterDistrict}
                onChange={e => setFilterDistrict(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white"
              >
                <option value="">Tất cả</option>
                {VIETNAM_PROVINCES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Loại khách</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as LeadType | "")}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white"
              >
                <option value="">Tất cả</option>
                {leadTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nguồn</label>
              <select
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white"
              >
                <option value="">Tất cả</option>
                {SOURCES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {STAGES.map(stage => (
          <div
            key={stage}
            onDragOver={e => onDragOver(e, stage)}
            onDrop={e => onDrop(e, stage)}
            onDragLeave={() => setDragOver(null)}
            className={`flex-shrink-0 w-80 rounded-lg p-4 transition-colors ${
              dragOver === stage ? "bg-amber-50 border-2 border-amber-400" : "bg-gray-50 border border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{STAGE_LABELS[stage]}</h3>
              <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
                {getStageLeads(stage).length}
              </span>
            </div>
            <div className="space-y-3">
              {getStageLeads(stage).map(lead => (
                <Link
                  key={lead.id}
                  href={`/crm/leads/${lead.id}`}
                  draggable
                  onDragStart={e => onDragStart(e, lead.id)}
                  onDragEnd={onDragEnd}
                  className={`block p-3 rounded-lg border-2 cursor-move transition-all ${
                    dragging === lead.id
                      ? "opacity-50 border-amber-400"
                      : "border-gray-200 hover:border-amber-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm text-gray-900 flex-1 line-clamp-2">{lead.name}</h4>
                    {lead.isOverdue && (
                      <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  {lead.company && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-1">{lead.company}</p>
                  )}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: TYPE_COLORS[lead.type] || "#999" }}
                    >
                      {TYPE_LABELS[lead.type] || lead.type}
                    </span>
                    {lead.source && (
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                        {lead.source}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone size={12} />
                    {lead.phone}
                  </div>
                  {lead.district && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                      <MapPin size={12} />
                      {lead.district}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddLeadModal onClose={() => setShowAddModal(false)} onAdded={lead => {
          setLeads(prev => [...prev, lead]);
          setShowAddModal(false);
        }} />
      )}
    </div>
  );
}
