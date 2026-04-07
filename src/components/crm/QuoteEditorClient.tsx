"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Loader2, Package, Ruler } from "lucide-react";
import type { CrmProduct, DiscountTier, Lead, QuoteItem } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";

interface Props {
  products: CrmProduct[];
  leads: Lead[];
  defaultLead?: Lead;
  defaultTiers?: DiscountTier[];
}

export default function QuoteEditorClient({ products, leads, defaultLead, defaultTiers = [] }: Props) {
  // Helper: get discount using product-specific tiers first, fallback to global defaultTiers
  // totalQty: tổng số lượng toàn bộ báo giá (để áp mức chiết khấu theo tổng SL)
  function getDiscount(product: CrmProduct, totalQty: number): number {
    const tiers = product.discountTiers && product.discountTiers.length > 0
      ? product.discountTiers
      : defaultTiers;
    const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
    for (const tier of sorted) {
      if (totalQty >= tier.minQty) return tier.discountPct;
    }
    return 0;
  }

  // Tính tổng số lượng hiện tại của báo giá (dùng để xác định mức chiết khấu)
  function getTotalQty(currentItems: typeof items, excludeIdx?: number, addQty?: number): number {
    let total = currentItems.reduce((sum, item, i) => {
      if (i === excludeIdx) return sum;
      return sum + item.qty;
    }, 0);
    if (addQty !== undefined) total += addQty;
    return total;
  }
  const router = useRouter();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(defaultLead || null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [extraDiscountPct, setExtraDiscountPct] = useState(0);
  const [includeVat, setIncludeVat] = useState(false);
  const VAT_RATE = 0.08;
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // subtotalBeforeDiscount: tổng chưa áp chiết khấu theo số lượng (unitPrice * qty)
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  // subtotal: tổng sau chiết khấu theo số lượng (finalPrice * qty)
  const subtotal = items.reduce((sum, item) => sum + item.finalPrice * item.qty, 0);
  // afterExtraDiscount: sau khi trừ thêm chiết khấu bổ sung
  const afterExtraDiscount = subtotal * (1 - extraDiscountPct / 100);
  // vatAmount: tiền VAT (chỉ tính khi tích)
  const vatAmount = includeVat ? afterExtraDiscount * VAT_RATE : 0;
  // total: tổng cộng cuối cùng
  const total = afterExtraDiscount + vatAmount;

  function addProduct(product: CrmProduct) {
    const qty = 1;
    // Nếu có sizePricings, dùng kích thước đầu tiên làm mặc định
    const firstSize = product.sizePricings && product.sizePricings.length > 0 ? product.sizePricings[0] : null;
    const unitPrice = firstSize ? firstSize.price : product.basePrice;
    // Tổng SL sau khi thêm sản phẩm mới
    const newTotalQty = getTotalQty(items) + qty;
    const discountPct = getDiscount(product, newTotalQty);
    const finalPrice = unitPrice * (1 - discountPct / 100);
    setItems(prev => {
      const newItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        qty,
        unitPrice,
        discountPct,
        finalPrice,
        notes: "",
        selectedSize: firstSize?.size,
        selectedSizeLabel: firstSize?.label || firstSize?.size,
      };
      const newItems = [...prev, newItem];
      // Tái tính chiết khấu cho tất cả items theo tổng SL mới
      const totalQty = newItems.reduce((s, it) => s + it.qty, 0);
      return newItems.map(it => {
        const prod = products.find(p => p.id === it.productId);
        if (!prod) return it;
        const dp = getDiscount(prod, totalQty);
        return { ...it, discountPct: dp, finalPrice: it.unitPrice * (1 - dp / 100) };
      });
    });
    setShowProductPicker(false);
  }

  function updateSize(idx: number, sizeKey: string) {
    setItems(prev => {
      const totalQty = prev.reduce((s, it) => s + it.qty, 0);
      return prev.map((item, i) => {
        if (i !== idx) return item;
        const product = products.find(p => p.id === item.productId);
        if (!product) return item;
        const sizePricing = product.sizePricings?.find(s => s.size === sizeKey);
        const unitPrice = sizePricing ? sizePricing.price : product.basePrice;
        // Dùng tổng SL toàn bộ báo giá để xác định mức chiết khấu
        const discountPct = getDiscount(product, totalQty);
        const finalPrice = unitPrice * (1 - discountPct / 100);
        return {
          ...item,
          unitPrice,
          discountPct,
          finalPrice,
          selectedSize: sizeKey,
          selectedSizeLabel: sizePricing?.label || sizeKey,
        };
      });
    });
  }

  function updateQty(idx: number, qty: number) {
    setItems(prev => {
      // Tính tổng SL mới (thay SL cũ của item idx bằng qty mới)
      const totalQty = prev.reduce((s, it, i) => s + (i === idx ? qty : it.qty), 0);
      // Tái tính chiết khấu cho tất cả items theo tổng SL mới
      return prev.map((item, i) => {
        const newQty = i === idx ? qty : item.qty;
        const product = products.find(p => p.id === item.productId);
        const discountPct = product ? getDiscount(product, totalQty) : item.discountPct;
        const finalPrice = item.unitPrice * (1 - discountPct / 100);
        return { ...item, qty: newQty, discountPct, finalPrice };
      });
    });
  }

  function removeItem(idx: number) {
    setItems(prev => {
      const newItems = prev.filter((_, i) => i !== idx);
      // Tái tính chiết khấu cho các items còn lại theo tổng SL mới
      const totalQty = newItems.reduce((s, it) => s + it.qty, 0);
      return newItems.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return item;
        const discountPct = getDiscount(product, totalQty);
        const finalPrice = item.unitPrice * (1 - discountPct / 100);
        return { ...item, discountPct, finalPrice };
      });
    });
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
          includeVat,
          vatAmount,
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
      <div className="flex-shrink-0 bg-transparent px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
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
          <div className="bg-transparent rounded-2xl p-5 shadow-sm" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
            <h2 className="font-semibold text-gray-900 mb-3">Khách hàng</h2>
            <select
              value={selectedLead?.id || ""}
              onChange={e => setSelectedLead(leads.find(l => l.id === e.target.value) || null)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[rgba(255,255,255,0.12)] focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-transparent">
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
          <div className="bg-transparent rounded-2xl p-5 shadow-sm" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
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
                {items.map((item, idx) => {
                  const product = products.find(p => p.id === item.productId);
                  const hasSizes = product?.sizePricings && product.sizePricings.length > 0;
                  return (
                    <div key={idx} className="p-3 rounded-xl space-y-2"
                      style={{ background: "transparent", border: "1px solid #f3f4f6" }}>
                      {/* Main row */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <div className="text-sm font-medium text-gray-900 truncate">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.sku}</div>
                          {item.selectedSizeLabel && (
                            <div className="text-[10px] font-medium mt-0.5" style={{ color: "#C9A84C" }}>{item.selectedSizeLabel}</div>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center justify-center">
                          <div className="flex items-center border border-[rgba(255,255,255,0.12)] rounded-lg overflow-hidden">
                            <button onClick={() => updateQty(idx, Math.max(1, item.qty - 1))}
                              className="w-7 h-7 flex items-center justify-center hover:bg-transparent text-gray-600">−</button>
                            <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                            <button onClick={() => updateQty(idx, item.qty + 1)}
                              className="w-7 h-7 flex items-center justify-center hover:bg-transparent text-gray-600">+</button>
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
                          <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Size selector — chỉ hiện nếu sản phẩm có kích thước */}
                      {hasSizes && (
                        <div className="flex items-start gap-2 pt-2" style={{ borderTop: "1px dashed #e5e7eb" }}>
                          <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                            <Ruler size={11} className="text-[rgba(245,237,214,0.35)]" />
                            <span className="text-xs text-gray-500">Kích thước:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {product!.sizePricings!.map(s => (
                              <button
                                key={s.size}
                                onClick={() => updateSize(idx, s.size)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                                style={{
                                  background: item.selectedSize === s.size ? "#C9A84C" : "#fff",
                                  color: item.selectedSize === s.size ? "#fff" : "#374151",
                                  border: `1.5px solid ${item.selectedSize === s.size ? "#C9A84C" : "#d1d5db"}`,
                                }}>
                                {s.label || s.size}
                                <span className="ml-1.5 opacity-80">{formatVND(s.price)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Totals */}
                <div className="pt-3 space-y-2" style={{ borderTop: "2px solid #f3f4f6" }}>
                  {/* Tổng chưa chiết khấu */}
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Tổng chưa chiết khấu</span>
                    <span>{formatVND(subtotalBeforeDiscount)}</span>
                  </div>
                  {/* Tổng sau chiết khấu SL */}
                  {subtotalBeforeDiscount !== subtotal && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tổng sau chiết khấu số lượng</span>
                      <span className="font-medium text-green-600">{formatVND(subtotal)}</span>
                    </div>
                  )}
                  {/* Chiết khấu bổ sung */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>Chiết khấu thêm</span>
                      <input type="number" min={0} max={50} value={extraDiscountPct}
                        onChange={e => setExtraDiscountPct(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-xs rounded border border-[rgba(255,255,255,0.12)] focus:outline-none focus:ring-1 focus:ring-amber-400 text-center" />
                      <span className="text-xs">%</span>
                    </div>
                    <span className="font-medium text-green-600">
                      {extraDiscountPct > 0 ? `-${formatVND(subtotal * extraDiscountPct / 100)}` : "—"}
                    </span>
                  </div>
                  {/* Tổng sau chiết khấu bổ sung */}
                  <div className="flex justify-between text-sm font-semibold text-gray-700 pt-1" style={{ borderTop: "1px solid #f3f4f6" }}>
                    <span>Tổng sau chiết khấu</span>
                    <span>{formatVND(afterExtraDiscount)}</span>
                  </div>
                  {/* VAT */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeVat}
                        onChange={e => setIncludeVat(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                      />
                      <span>VAT 8%</span>
                    </label>
                    <span className={includeVat ? "font-medium text-gray-700" : "text-[rgba(245,237,214,0.35)]"}>
                      {includeVat ? `+${formatVND(vatAmount)}` : "—"}
                    </span>
                  </div>
                  {/* Tổng cộng */}
                  <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: "2px solid #e5e7eb" }}>
                    <div>
                      <div className="text-[#f5edd6]">Tổng cộng</div>
                      {includeVat && <div className="text-[10px] font-normal text-gray-500">(bao gồm VAT 8%)</div>}
                    </div>
                    <span style={{ color: "#C9A84C" }}>{formatVND(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-transparent rounded-2xl p-5 shadow-sm" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
            <h2 className="font-semibold text-gray-900 mb-4">Thông tin báo giá</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Hiệu lực đến</label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-[rgba(255,255,255,0.12)] focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Người lập</label>
                <input value={createdBy} onChange={e => setCreatedBy(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-[rgba(255,255,255,0.12)] focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder="Tên sales" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ghi chú</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 text-sm text-gray-900 rounded-lg border border-[rgba(255,255,255,0.12)] focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
                placeholder="Điều khoản, ghi chú thêm..." />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button onClick={() => router.back()}
              className="flex-1 py-3 text-sm rounded-xl border border-[rgba(255,255,255,0.12)] text-gray-600 hover:bg-transparent font-medium">
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
          <div className="bg-transparent rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-transparent"
              style={{ borderBottom: "1px solid #f3f4f6" }}>
              <h3 className="font-bold text-gray-900">Chọn sản phẩm</h3>
              <button onClick={() => setShowProductPicker(false)}
                className="w-8 h-8 rounded-full hover:bg-transparent flex items-center justify-center">×</button>
            </div>
            <div className="p-3 space-y-2">
              {products.filter(p => p.isActive).map(p => {
                const hasSizes = p.sizePricings && p.sizePricings.length > 0;
                const minPrice = hasSizes ? Math.min(...p.sizePricings!.map(s => s.price)) : p.basePrice;
                const maxPrice = hasSizes ? Math.max(...p.sizePricings!.map(s => s.price)) : p.basePrice;
                return (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-amber-50 transition-colors"
                    style={{ border: "1px solid #f3f4f6" }}>
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-transparent flex-shrink-0">
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> :
                        <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-[rgba(245,237,214,0.35)]" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.sku}</div>
                      {hasSizes && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Ruler size={10} className="text-[rgba(245,237,214,0.35)]" />
                          <span className="text-[10px] text-gray-400">{p.sizePricings!.length} kích thước</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {hasSizes && minPrice !== maxPrice ? (
                        <div>
                          <div className="text-[10px] text-gray-400">từ</div>
                          <div className="text-sm font-bold" style={{ color: "#C9A84C" }}>{formatVND(minPrice)}</div>
                        </div>
                      ) : (
                        <div className="text-sm font-bold" style={{ color: "#C9A84C" }}>{formatVND(minPrice)}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
