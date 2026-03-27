"use client";
import { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, Search, Filter, Eye, Edit2, Trash2,
  CheckCircle, Clock, XCircle, Send, Download, PenTool,
  Building2, User, Calendar, DollarSign, ChevronRight,
  AlertCircle, RefreshCw, Printer
} from "lucide-react";
import type { Contract, ContractStatus } from "@/lib/crm-contracts-store";

const STATUS_MAP: Record<ContractStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Bản nháp", color: "text-gray-500 bg-gray-400/10 border-gray-400/20", icon: <Edit2 size={12} /> },
  sent: { label: "Đã gửi", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: <Send size={12} /> },
  signed: { label: "Đã ký", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: <CheckCircle size={12} /> },
  cancelled: { label: "Đã hủy", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: <XCircle size={12} /> },
  expired: { label: "Hết hạn", color: "text-orange-400 bg-orange-400/10 border-orange-400/20", icon: <AlertCircle size={12} /> },
};

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("vi-VN"); } catch { return s; }
}

export default function ContractsClient() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ContractStatus | "all">("all");
  const [selected, setSelected] = useState<Contract | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingContract, setEditingContract] = useState<Partial<Contract> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contracts");
      if (res.ok) setContracts(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = contracts.filter(c => {
    const matchSearch = !search || c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.leadName.toLowerCase().includes(search.toLowerCase()) ||
      c.buyerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === "draft").length,
    sent: contracts.filter(c => c.status === "sent").length,
    signed: contracts.filter(c => c.status === "signed").length,
    totalValue: contracts.filter(c => c.status === "signed").reduce((s, c) => s + c.finalValue, 0),
  };

  async function handleStatusChange(id: string, status: ContractStatus) {
    await fetch(`/api/crm/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa hợp đồng này?")) return;
    await fetch(`/api/crm/contracts/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    load();
  }

  async function handleSave() {
    if (!editingContract) return;
    const method = editingContract.id ? "PATCH" : "POST";
    const url = editingContract.id ? `/api/crm/contracts/${editingContract.id}` : "/api/crm/contracts";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingContract),
    });
    setShowEditor(false);
    setEditingContract(null);
    load();
  }

  return (
    <div className="flex h-full gap-0">
      {/* Left panel */}
      <div className={`flex flex-col ${selected ? "w-[420px]" : "flex-1"} border-r border-gray-200 transition-all duration-300`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Hợp đồng điện tử</h1>
              <p className="text-sm text-gray-500 mt-0.5">Tạo, ký và lưu trữ hợp đồng PDF</p>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => { setEditingContract({ status: "draft", items: [], signatures: [], totalValue: 0, discount: 0, finalValue: 0 }); setShowEditor(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A84C] text-black text-sm font-medium hover:bg-[#d4b55a] transition-colors"
              >
                <Plus size={16} /> Tạo hợp đồng
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Tổng", value: stats.total, color: "text-gray-900" },
              { label: "Bản nháp", value: stats.draft, color: "text-gray-500" },
              { label: "Đã gửi", value: stats.sent, color: "text-blue-400" },
              { label: "Đã ký", value: stats.signed, color: "text-emerald-400" },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {stats.signed > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
              <span className="text-xs text-gray-500">Tổng giá trị đã ký: </span>
              <span className="text-emerald-400 font-semibold">{fmt(stats.totalValue)}</span>
            </div>
          )}

          {/* Search & Filter */}
          <div className="flex gap-2 mt-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm hợp đồng, khách hàng..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A84C]/50"
              />
            </div>
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value as ContractStatus | "all")}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400/70"
            >
              <option value="all">Tất cả</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <RefreshCw size={20} className="animate-spin mr-2" /> Đang tải...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <FileText size={32} className="mb-3 opacity-30" />
              <p className="text-sm">Chưa có hợp đồng nào</p>
              <button
                onClick={() => { setEditingContract({ status: "draft", items: [], signatures: [], totalValue: 0, discount: 0, finalValue: 0 }); setShowEditor(true); }}
                className="mt-3 text-[#C9A84C] text-sm hover:underline"
              >Tạo hợp đồng đầu tiên</button>
            </div>
          ) : filtered.map(c => {
            const st = STATUS_MAP[c.status];
            const isSelected = selected?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(isSelected ? null : c)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50/50 transition-colors ${isSelected ? "bg-gray-50 border-l-2 border-l-[#C9A84C]" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[#C9A84C]">{c.contractNumber}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 truncate">{c.title || c.leadName}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{c.buyerName || c.leadName}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-emerald-400 font-medium">{fmt(c.finalValue)}</span>
                      <span className="text-xs text-gray-500">{fmtDate(c.contractDate)}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-gray-600 flex-shrink-0 mt-1 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel - Contract Detail */}
      {selected && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">{selected.contractNumber}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${STATUS_MAP[selected.status].color}`}>
                  {STATUS_MAP[selected.status].icon} {STATUS_MAP[selected.status].label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{selected.title}</p>
            </div>
            <div className="flex gap-2">
              {selected.status === "draft" && (
                <button
                  onClick={() => handleStatusChange(selected.id, "sent")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm hover:bg-blue-500/20 transition-colors"
                >
                  <Send size={14} /> Gửi KH
                </button>
              )}
              {selected.status === "sent" && (
                <button
                  onClick={() => handleStatusChange(selected.id, "signed")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm hover:bg-emerald-500/20 transition-colors"
                >
                  <PenTool size={14} /> Đánh dấu đã ký
                </button>
              )}
              <button
                onClick={() => { setEditingContract(selected); setShowEditor(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 border border-gray-200 text-sm hover:text-gray-900 transition-colors"
              >
                <Edit2 size={14} /> Chỉnh sửa
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Parties */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={16} className="text-[#C9A84C]" />
                  <span className="text-sm font-medium text-gray-900">Bên Bán (A)</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="text-gray-900 font-medium">{selected.sellerName || "SmartFurni"}</div>
                  <div className="text-gray-500">{selected.sellerAddress}</div>
                  <div className="text-gray-500">MST: {selected.sellerTaxId}</div>
                  <div className="text-gray-500">Đại diện: {selected.sellerRepresentative}</div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-blue-400" />
                  <span className="text-sm font-medium text-gray-900">Bên Mua (B)</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="text-gray-900 font-medium">{selected.buyerName}</div>
                  <div className="text-gray-500">{selected.buyerAddress}</div>
                  <div className="text-gray-500">MST: {selected.buyerTaxId}</div>
                  <div className="text-gray-500">Đại diện: {selected.buyerRepresentative}</div>
                </div>
              </div>
            </div>

            {/* Items */}
            {selected.items.length > 0 && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Danh sách sản phẩm</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {["Sản phẩm", "SL", "Đơn giá", "CK%", "Thành tiền"].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-200/50 hover:bg-gray-100/30">
                          <td className="px-4 py-2.5">
                            <div className="text-gray-900 font-medium">{item.productName}</div>
                            <div className="text-xs text-gray-500">{item.sku}</div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-2.5 text-gray-600">{fmt(item.unitPrice)}</td>
                          <td className="px-4 py-2.5 text-orange-400">{item.discount}%</td>
                          <td className="px-4 py-2.5 text-emerald-400 font-medium">{fmt(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tổng cộng</span>
                    <span className="text-gray-900">{fmt(selected.totalValue)}</span>
                  </div>
                  {selected.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Chiết khấu</span>
                      <span className="text-orange-400">-{fmt(selected.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold pt-1 border-t border-gray-200">
                    <span className="text-gray-900">Thành tiền</span>
                    <span className="text-[#C9A84C]">{fmt(selected.finalValue)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Terms */}
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "Điều khoản thanh toán", value: selected.paymentTerms },
                { label: "Điều khoản giao hàng", value: selected.deliveryTerms },
                { label: "Bảo hành", value: selected.warrantyTerms },
                { label: "Điều khoản đặc biệt", value: selected.specialTerms },
              ].filter(t => t.value).map(t => (
                <div key={t.label} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1.5">{t.label}</div>
                  <div className="text-sm text-gray-600 leading-relaxed">{t.value}</div>
                </div>
              ))}
            </div>

            {/* Signatures */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <PenTool size={16} className="text-[#C9A84C]" />
                <span className="text-sm font-medium text-gray-900">Chữ ký</span>
              </div>
              {selected.signatures.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có chữ ký</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {selected.signatures.map((sig, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">{sig.party === "seller" ? "Bên Bán" : "Bên Mua"}</div>
                      <div className="text-sm text-gray-900 font-medium">{sig.name}</div>
                      <div className="text-xs text-gray-500">{sig.title}</div>
                      <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle size={10} /> Đã ký: {fmtDate(sig.signedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Ngày ký", value: selected.contractDate, icon: <Calendar size={14} /> },
                { label: "Ngày giao hàng", value: selected.deliveryDate, icon: <Clock size={14} /> },
                { label: "Hiệu lực đến", value: selected.validUntil, icon: <AlertCircle size={14} /> },
              ].map(d => (
                <div key={d.label} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                    {d.icon}
                    <span className="text-xs">{d.label}</span>
                  </div>
                  <div className="text-sm text-gray-900">{fmtDate(d.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && editingContract && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingContract.id ? "Chỉnh sửa hợp đồng" : "Tạo hợp đồng mới"}
              </h2>
              <button onClick={() => { setShowEditor(false); setEditingContract(null); }} className="text-gray-500 hover:text-gray-900">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tiêu đề hợp đồng *</label>
                <input
                  value={editingContract.title ?? ""}
                  onChange={e => setEditingContract(p => ({ ...p, title: e.target.value }))}
                  placeholder="VD: Hợp đồng cung cấp nội thất thông minh..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Khách hàng (Lead ID)</label>
                  <input
                    value={editingContract.leadId ?? ""}
                    onChange={e => setEditingContract(p => ({ ...p, leadId: e.target.value }))}
                    placeholder="ID khách hàng trong CRM"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Tên khách hàng *</label>
                  <input
                    value={editingContract.leadName ?? ""}
                    onChange={e => setEditingContract(p => ({ ...p, leadName: e.target.value }))}
                    placeholder="Tên khách hàng"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Tên công ty mua</label>
                  <input
                    value={editingContract.buyerName ?? ""}
                    onChange={e => setEditingContract(p => ({ ...p, buyerName: e.target.value }))}
                    placeholder="Công ty TNHH ABC..."
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">MST bên mua</label>
                  <input
                    value={editingContract.buyerTaxId ?? ""}
                    onChange={e => setEditingContract(p => ({ ...p, buyerTaxId: e.target.value }))}
                    placeholder="0123456789"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Địa chỉ bên mua</label>
                <input
                  value={editingContract.buyerAddress ?? ""}
                  onChange={e => setEditingContract(p => ({ ...p, buyerAddress: e.target.value }))}
                  placeholder="Số nhà, đường, quận, tỉnh/thành phố"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Người đại diện bên mua</label>
                  <input
                    value={editingContract.buyerRepresentative ?? ""}
                    onChange={e => setEditingContract(p => ({ ...p, buyerRepresentative: e.target.value }))}
                    placeholder="Họ và tên"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Chức vụ</label>
                  <input
                    value={editingContract.buyerTitle ?? ""}
                    onChange={e => setEditingContract(p => ({ ...p, buyerTitle: e.target.value }))}
                    placeholder="Giám đốc, Trưởng phòng..."
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Giá trị hợp đồng (VND)</label>
                  <input
                    type="number"
                    value={editingContract.finalValue ?? 0}
                    onChange={e => setEditingContract(p => ({ ...p, finalValue: Number(e.target.value), totalValue: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Ngày ký</label>
                  <input
                    type="date"
                    value={editingContract.contractDate ?? ""}
                    onChange={e => setEditingContract(p => ({ ...p, contractDate: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Ngày giao hàng</label>
                  <input
                    type="date"
                    value={editingContract.deliveryDate ?? ""}
                    onChange={e => setEditingContract(p => ({ ...p, deliveryDate: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400/70"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Điều khoản thanh toán</label>
                <textarea
                  value={editingContract.paymentTerms ?? ""}
                  onChange={e => setEditingContract(p => ({ ...p, paymentTerms: e.target.value }))}
                  rows={2}
                  placeholder="Thanh toán 50% khi ký, 50% khi giao hàng..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Điều khoản bảo hành</label>
                <textarea
                  value={editingContract.warrantyTerms ?? ""}
                  onChange={e => setEditingContract(p => ({ ...p, warrantyTerms: e.target.value }))}
                  rows={2}
                  placeholder="Bảo hành 5 năm..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Ghi chú</label>
                <textarea
                  value={editingContract.notes ?? ""}
                  onChange={e => setEditingContract(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-400/70 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setShowEditor(false); setEditingContract(null); }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:text-gray-900 transition-colors">Hủy</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-[#C9A84C] text-black text-sm font-medium hover:bg-[#d4b55a] transition-colors">
                {editingContract.id ? "Lưu thay đổi" : "Tạo hợp đồng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
