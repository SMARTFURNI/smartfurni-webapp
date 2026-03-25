"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, AlertCircle, Phone, MapPin, X } from "lucide-react";
import type { Lead, LeadType, LeadStage } from "@/lib/crm-store";
import {
  STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS,
  DISTRICTS, SOURCES, formatVND, isOverdue,
} from "@/lib/crm-store";
import AddLeadModal from "./AddLeadModal";

interface Props { initialLeads: Lead[] }

export default function LeadsListClient({ initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "">("");
  const [filterType, setFilterType] = useState<LeadType | "">("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = leads.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
      !l.company.toLowerCase().includes(search.toLowerCase()) &&
      !l.phone.includes(search)) return false;
    if (filterStage && l.stage !== filterStage) return false;
    if (filterType && l.type !== filterType) return false;
    if (filterDistrict && l.district !== filterDistrict) return false;
    return true;
  });

  const activeFilters = [filterStage, filterType, filterDistrict].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full" style={{ background: "#f0f2f5" }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Khách hàng</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} / {leads.length} khách hàng</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 w-48" />
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors"
              style={{ background: activeFilters > 0 ? "#fef3c7" : "#f9fafb", borderColor: activeFilters > 0 ? "#f59e0b" : "#e5e7eb", color: activeFilters > 0 ? "#92400e" : "#374151" }}>
              <Filter size={15} />
              Bộ lọc {activeFilters > 0 && `(${activeFilters})`}
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white"
              style={{ background: "#C9A84C" }}>
              <Plus size={15} /> Thêm khách hàng
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-3 pt-3 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid #f3f4f6" }}>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value as LeadStage | "")}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none">
              <option value="">Tất cả giai đoạn</option>
              {(Object.keys(STAGE_LABELS) as LeadStage[]).map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value as LeadType | "")}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none">
              <option value="">Tất cả loại</option>
              <option value="architect">Kiến trúc sư</option>
              <option value="investor">Chủ đầu tư CHDV</option>
              <option value="dealer">Đại lý</option>
            </select>
            <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none">
              <option value="">Tất cả Quận</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {activeFilters > 0 && (
              <button onClick={() => { setFilterStage(""); setFilterType(""); setFilterDistrict(""); }}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                <X size={13} /> Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Loại</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Giai đoạn</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Khu vực</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Giá trị</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tương tác cuối</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">Không có khách hàng nào</td></tr>
              )}
              {filtered.map(lead => {
                const overdue = isOverdue(lead);
                const daysAgo = Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={lead.id}
                    className="hover:bg-amber-50/30 transition-colors cursor-pointer"
                    style={{ borderBottom: "1px solid #f3f4f6", borderLeft: overdue ? "3px solid #ef4444" : "3px solid transparent" }}>
                    <td className="px-4 py-3">
                      <Link href={`/crm/leads/${lead.id}`} className="block">
                        <div className="flex items-center gap-2">
                          {overdue && <AlertCircle size={13} className="text-red-500 flex-shrink-0" />}
                          <div>
                            <div className="font-semibold text-gray-900">{lead.name}</div>
                            {lead.company && <div className="text-xs text-gray-500">{lead.company}</div>}
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <Phone size={10} /> {lead.phone}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${TYPE_COLORS[lead.type]}15`, color: TYPE_COLORS[lead.type] }}>
                        {TYPE_LABELS[lead.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${STAGE_COLORS[lead.stage]}15`, color: STAGE_COLORS[lead.stage] }}>
                        {STAGE_LABELS[lead.stage]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <MapPin size={11} /> {lead.district || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-sm" style={{ color: "#C9A84C" }}>
                        {lead.expectedValue > 0 ? formatVND(lead.expectedValue) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${overdue ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                        {daysAgo === 0 ? "Hôm nay" : daysAgo === 1 ? "Hôm qua" : `${daysAgo} ngày trước`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddLeadModal onClose={() => setShowAddModal(false)} onCreated={lead => { setLeads(prev => [lead, ...prev]); setShowAddModal(false); }} />
      )}
    </div>
  );
}
