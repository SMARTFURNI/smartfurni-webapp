"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Loader2, Package, ChevronDown } from "lucide-react";
import type { CrmProduct, Lead, QuoteItem } from "@/lib/crm-types";
import { formatVND, getDiscountForQty } from "@/lib/crm-types";

interface Props {
  products: CrmProduct[];
  leads: Lead[];
  defaultLead?: Lead;
}

export default function QuoteEditorClient({ products, leads, defaultLead }: Props) {
  const router = useRouter();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(defaultLead || null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [extraDiscountPct, setExtraDiscountPct] = useState(0);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.finalPrice * item.qty, 0);
  const total = subtotal * (1 - extraDiscountPct / 100);

  function addProduct(product: CrmProduct) {
    const qty = 1;
    const discountPct = getDiscountForQty(product, qty);
    const finalPrice = product.basePrice * (1 - discountPct / 100);
    setItems(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      qty,
      unitPrice: product.basePrice,
      discountPct,
      finalPrice,
      notes: "",
    }]);
    setShowProductPicker(false);
  }

  function updateQty(idx: number, qty: number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const product = products.find(p => p.id === item.productId);
      const discountPct = product ? getDiscountForQty(product, qty) : item.discountPct;
      const finalPrice = item.unitPrice * (1 - discountPct / 100);
      return { ...item, qty, discountPct, finalPrice };
    }));
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!selectedLead || items.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/crm/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead.id,
          leadName: selectedLead.name,
          items,
          subtotal,
          extraDiscountPct,
          total,
          validUntil,
          status: "draft",
          notes,
          createdBy,
        }),
      });
      if (!res.ok) throw new Error();
      const quote = await res.json();
      router.push(`/crm/quotes/${quote.id}`);
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#f0f2f5" }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Quay lại
          </button>
          <h1 className="text-xl font-bold text-gray-900">Tạo báo giá mới</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Lead selector */}
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
            <h2 className="font-semibold text-gray-900 mb-3">Khách hàng</h2>
            <select
              value={selectedLead?.id || ""}
              onChange={e => setSelectedLead(leads.find(l => l.id === e.target.value) || null)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white">
              <option value="">-- Chọn khách hàng --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.name} {l.company ? `— ${l.company}` : ""}</option>
              ))}
            </select>
            {selectedLead && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm">
                <span className="font-medium text-gray-900">{selectedLead.name}</span>
                {selectedLead.phone && <span className="text-gray-500 ml-2">· {selectedLead.phone}</span>}
                {selectedLead.district && <span className="text-gray-500 ml-2">· {selectedLead.district}</span>}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Sản phẩm</h2>
              <button onClick={() => setShowProductPicker(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-900"
                style={{ background: "#C9A84C" }}>
                <Plus size={14} /> Thêm sản phẩm
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có sản phẩm nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                  <div className="col-span-4">Sản phẩm</div>
                  <div className="col-span-2 text-center">SL</div>
                  <div className="col-span-2 text-right">Đơn giá</div>
                  <div className="col-span-2 text-right">CK</div>
                  <div className="col-span-2 text-right">Thành tiền</div>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl"
                    style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}>
                    <div className="col-span-4">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.productName}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button onClick={() => updateQty(idx, Math.max(1, item.qty - 1))}
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 text-gray-600">−</button>
                        <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                        <button onClick={() => updateQty(idx, item.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 text-gray-600">+</button>
                      </div>
                    </div>
                    <div className="col-span-2 text-right text-xs text-gray-600">{formatVND(item.unitPrice)}</div>
                    <div className="col-span-2 text-right">
                      {item.discountPct > 0 ? (
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">-{item.discountPct}%</span>
                      ) : <span className="text-xs text-gray-500">—</span>}
                    </div>
                    <div className="col-span-1 text-right text-sm font-bold" style={{ color: "#C9A84C" }}>
                      {formatVND(item.finalPrice * item.qty)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => removeItem(idx)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="pt-3 space-y-2" style={{ borderTop: "2px solid #f3f4f6" }}>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tạm tính</span>
                    <span className="font-medium">{formatVND(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>Chiết khấu thêm</span>
                      <input type="number" min={0} max={50} value={extraDiscountPct}
                        onChange={e => setExtraDiscountPct(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-xs rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-400 text-center" />
                      <span className="text-xs">%</span>
                    </div>
                    <span className="font-medium text-green-600">
                      {extraDiscountPct > 0 ? `-${formatVND(subtotal * extraDiscountPct / 100)}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: "1px solid #e5e7eb" }}>
                    <span className="text-gray-900">Tổng cộng</span>
                    <span style={{ color: "#C9A84C" }}>{formatVND(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
            <h2 className="font-semibold text-gray-900 mb-4">Thông tin báo giá</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Hiệu lực đến</label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Người lập</label>
                <input value={createdBy} onChange={e => setCreatedBy(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="Tên sales" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
                placeholder="Điều khoản, ghi chú thêm..." />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button onClick={() => router.back()}
              className="flex-1 py-3 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
              Hủy
            </button>
            <button onClick={submit} disabled={loading || !selectedLead || items.length === 0}
              className="flex-1 py-3 text-sm font-bold rounded-xl text-gray-900 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#C9A84C" }}>
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Đang tạo..." : "Tạo báo giá"}
            </button>
          </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowProductPicker(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-white"
              style={{ borderBottom: "1px solid #f3f4f6" }}>
              <h3 className="font-bold text-gray-900">Chọn sản phẩm</h3>
              <button onClick={() => setShowProductPicker(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">×</button>
            </div>
            <div className="p-3 space-y-2">
              {products.map(p => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-amber-50 transition-colors"
                  style={{ border: "1px solid #f3f4f6" }}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-gray-600" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.sku}</div>
                  </div>
                  <div className="text-sm font-bold flex-shrink-0" style={{ color: "#C9A84C" }}>{formatVND(p.basePrice)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
