"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus, Search, Filter, AlertCircle, Phone, MapPin, X,
  ChevronUp, ChevronDown, Users, DollarSign, TrendingUp,
  Award, ArrowUpRight, Eye, Edit3, Trash2, Loader2,
} from "lucide-react";
import type { Lead, LeadType, LeadStage } from "@/lib/crm-types";
import {
  STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS,
  formatVND, isOverdue,
} from "@/lib/crm-types";
import AddLeadModal from "./AddLeadModal";
import CustomerContactActions from "./high-performance-features/CustomerContactActions";

interface Props { initialLeads: Lead[]; isAdmin?: boolean; currentUserName?: string; }

type SortKey = "name" | "expectedValue" | "lastContactAt" | "createdAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

export default function LeadsListClient({ initialLeads, isAdmin = false, currentUserName = "" }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "">("");
  const [filterType, setFilterType] = useState<LeadType | "">("");
  const [showFilters, setShowFilters] = useState(false);
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
  }, [leads, search, filterStage, filterType, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = [filterStage, filterType].filter(Boolean).length;

  // Summary stats
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
    if (sortKey !== k) return <ChevronDown size={12} className="opacity-30" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />;
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
    <div className="flex flex-col h-full" style={{ background: "#f4f5f7" }}>
      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-white px-6 py-4" style={{ borderBottom: "1px solid #e8eaed" }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quản lý khách hàng</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filtered.length} / {leads.length} khách hàng
              {overdueCount > 0 && (
                <span className="ml-2 text-red-500 font-semibold">· {overdueCount} quá hạn</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm tên, công ty, SĐT..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 w-52"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors"
              style={{
                background: activeFilters > 0 ? "#fef3c7" : "#f9fafb",
                borderColor: activeFilters > 0 ? "#f59e0b" : "#e5e7eb",
                color: activeFilters > 0 ? "#92400e" : "#374151",
              }}>
              <Filter size={15} />
              Bộ lọc {activeFilters > 0 && `(${activeFilters})`}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-gray-900 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)" }}>
              <Plus size={15} /> Thêm khách hàng
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid #f3f4f6" }}>
            <select
              value={filterStage}
              onChange={e => { setFilterStage(e.target.value as LeadStage | ""); setPage(1); }}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30">
              <option value="">Tất cả giai đoạn</option>
              {(Object.keys(STAGE_LABELS) as LeadStage[]).map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value as LeadType | ""); setPage(1); }}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30">
              <option value="">Tất cả loại</option>
              <option value="architect">Kiến trúc sư</option>
              <option value="investor">Chủ đầu tư CHDV</option>
              <option value="dealer">Đại lý</option>
            </select>
            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterStage(""); setFilterType(""); setPage(1); }}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                <X size={13} /> Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Summary Stats ── */}
      <div className="flex-shrink-0 px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Tổng khách hàng", value: String(leads.length), color: "#6366f1", sub: `${leads.filter(l => !["won","lost"].includes(l.stage)).length} đang theo dõi` },
          { icon: DollarSign, label: "Tổng giá trị", value: formatVND(totalValue), color: "#C9A84C", sub: "Pipeline" },
          { icon: Award, label: "Tỷ lệ chốt", value: `${winRate}%`, color: "#22c55e", sub: `${wonCount} đơn thành công` },
          { icon: AlertCircle, label: "Cần liên hệ", value: String(overdueCount), color: "#ef4444", sub: "Quá 3 ngày" },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid #e8eaed" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 truncate">{label}</div>
              <div className="text-sm font-bold text-gray-900 truncate">{value}</div>
              <div className="text-[10px] text-gray-400 truncate">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                    Khách hàng <SortIcon k="name" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Loại</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Giai đoạn</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Khu vực</th>
                <th className="text-right px-4 py-3">
                  <button onClick={() => toggleSort("expectedValue")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800 ml-auto">
                    Giá trị <SortIcon k="expectedValue" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">
                  <button onClick={() => toggleSort("lastContactAt")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800">
                    Tương tác cuối <SortIcon k="lastContactAt" />
                  </button>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-gray-300" />
                      <p className="text-sm text-gray-500">Không có khách hàng nào</p>
                      {(search || activeFilters > 0) && (
                        <button onClick={() => { setSearch(""); setFilterStage(""); setFilterType(""); }}
                          className="text-xs text-amber-600 hover:underline">
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {paginated.map(lead => {
                const overdue = isOverdue(lead);
                const daysAgo = Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-gradient-to-r hover:from-amber-50/30 hover:to-blue-50/30 transition-all duration-300 hover:shadow-sm"
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      borderLeft: overdue ? "4px solid #ef4444" : "4px solid #3b82f6",
                    }}>
                    {/* Customer */}
                    <td className="px-4 py-3">
                      <Link href={`/crm/leads/${lead.id}`} className="block group">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md"
                            style={{ background: overdue ? "linear-gradient(135deg, #ef4444, #dc2626)" : `linear-gradient(135deg, ${TYPE_COLORS[lead.type]}, ${TYPE_COLORS[lead.type]}dd)` }}>
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors truncate max-w-[160px]">
                              {overdue && <AlertCircle size={11} className="inline text-red-500 mr-1" />}
                              {lead.name}
                            </div>
                            {lead.company && <div className="text-xs text-gray-500 truncate max-w-[160px]">{lead.company}</div>}
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Phone size={9} /> {lead.phone}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: `${TYPE_COLORS[lead.type]}15`, color: TYPE_COLORS[lead.type] }}>
                        {TYPE_LABELS[lead.type]}
                      </span>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: `${STAGE_COLORS[lead.stage]}15`, color: STAGE_COLORS[lead.stage] }}>
                        {STAGE_LABELS[lead.stage]}
                      </span>
                    </td>

                    {/* District */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <MapPin size={11} className="flex-shrink-0" />
                        <span className="truncate max-w-[100px]">{lead.district || "—"}</span>
                      </div>
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-sm whitespace-nowrap" style={{ color: "#C9A84C" }}>
                        {lead.expectedValue > 0 ? formatVND(lead.expectedValue) : "—"}
                      </span>
                    </td>

                    {/* Last contact */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs whitespace-nowrap ${overdue ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                        {daysAgo === 0 ? "Hôm nay" : daysAgo === 1 ? "Hôm qua" : `${daysAgo} ngày trước`}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <CustomerContactActions lead={lead} />
                        <Link href={`/crm/leads/${lead.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                          title="Xem chi tiết">
                          <Eye size={14} />
                        </Link>
                        <Link href={`/crm/leads/${lead.id}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                          title="Chỉnh sửa">
                          <Edit3 size={14} />
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => setConfirmDeleteId(lead.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid #f3f4f6" }}>
              <span className="text-xs text-gray-500">
                Trang {page} / {totalPages} · {filtered.length} khách hàng
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  ← Trước
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-8 h-8 text-xs rounded-lg border transition-colors"
                      style={{
                        background: page === p ? "#C9A84C" : "#fff",
                        borderColor: page === p ? "#C9A84C" : "#e5e7eb",
                        color: page === p ? "#fff" : "#374151",
                        fontWeight: page === p ? 700 : 400,
                      }}>
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
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
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={e => { if (e.target === e.currentTarget) setConfirmDeleteId(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Xóa khách hàng?</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Thao tác này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-5 p-3 bg-gray-50 rounded-lg">
                Bạn có chắc muốn xóa <strong>{lead.name}</strong>? Tất cả hoạt động, báo giá và công việc liên quan cũng sẽ bị xóa.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Hủy
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={deletingId === confirmDeleteId}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white flex items-center justify-center gap-2"
                  style={{ background: "#ef4444" }}>
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
