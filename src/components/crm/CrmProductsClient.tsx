"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Package, Tag, ChevronRight, Edit3, X, Loader2, Check } from "lucide-react";
import type { CrmProduct, DiscountTier } from "@/lib/crm-store";
import { formatVND } from "@/lib/crm-store";

interface Props { initialProducts: CrmProduct[] }

export default function CrmProductsClient({ initialProducts }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<CrmProduct | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<CrmProduct | null>(null);

  return (
    <div className="flex h-full" style={{ background: "#f0f2f5" }}>
      {/* Left: Product list */}
      <div className="flex flex-col w-80 flex-shrink-0 bg-white" style={{ borderRight: "1px solid #e5e7eb" }}>
        <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Sản phẩm</h1>
            <p className="text-xs text-gray-500">{products.length} sản phẩm</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: "#C9A84C" }}>
            <Plus size={16} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex px-4 py-2 gap-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">Tất cả</span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Sofa giường</span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Giường CT</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {products.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Package size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có sản phẩm</p>
            </div>
          )}
          {products.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-50/50"
              style={{
                borderBottom: "1px solid #f9fafb",
                background: selected?.id === p.id ? "#fffbf0" : "transparent",
                borderLeft: selected?.id === p.id ? "3px solid #C9A84C" : "3px solid transparent",
              }}>
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={20} className="text-gray-300" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                <div className="text-xs text-gray-500">{p.sku}</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: "#C9A84C" }}>{formatVND(p.basePrice)}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: p.category === "sofa_bed" ? "#dbeafe" : "#f3e8ff", color: p.category === "sofa_bed" ? "#1d4ed8" : "#7c3aed" }}>
                  {p.category === "sofa_bed" ? "Sofa" : "Giường CT"}
                </span>
                {!p.isActive && <span className="text-[10px] text-gray-400">Ẩn</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Product detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Package size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Chọn sản phẩm để xem chi tiết</p>
            <p className="text-sm mt-1">hoặc thêm sản phẩm mới</p>
          </div>
        ) : (
          <ProductDetail product={selected} onEdit={() => setEditProduct(selected)}
            onCreateQuote={() => {}} />
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {(showAddModal || editProduct) && (
        <ProductModal
          product={editProduct}
          onClose={() => { setShowAddModal(false); setEditProduct(null); }}
          onSaved={p => {
            setProducts(prev => {
              const idx = prev.findIndex(x => x.id === p.id);
              if (idx >= 0) { const n = [...prev]; n[idx] = p; return n; }
              return [p, ...prev];
            });
            setSelected(p);
            setShowAddModal(false);
            setEditProduct(null);
          }}
        />
      )}
    </div>
  );
}

function ProductDetail({ product: p, onEdit, onCreateQuote }: { product: CrmProduct; onEdit: () => void; onCreateQuote: () => void }) {
  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4" style={{ border: "1px solid #e5e7eb" }}>
        <div className="relative h-48 bg-gray-100">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={48} className="text-gray-300" />
            </div>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <span className="text-xs px-2 py-1 rounded-full font-semibold"
              style={{ background: p.category === "sofa_bed" ? "#dbeafe" : "#f3e8ff", color: p.category === "sofa_bed" ? "#1d4ed8" : "#7c3aed" }}>
              {p.category === "sofa_bed" ? "Sofa giường" : "Giường công thái học"}
            </span>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{p.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">SKU: {p.sku}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>{formatVND(p.basePrice)}</div>
              <p className="text-xs text-gray-400">Giá gốc / bộ</p>
            </div>
          </div>
          {p.description && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{p.description}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Edit3 size={14} /> Sửa
            </button>
            <Link href={`/crm/quotes/new`}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors"
              style={{ background: "#C9A84C" }}>
              <Tag size={14} /> Tạo báo giá
            </Link>
          </div>
        </div>
      </div>

      {/* Specs */}
      {Object.keys(p.specs).length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4" style={{ border: "1px solid #e5e7eb" }}>
          <h3 className="font-semibold text-gray-900 mb-3">Thông số kỹ thuật</h3>
          <div className="space-y-2">
            {Object.entries(p.specs).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px dashed #f3f4f6" }}>
                <span className="text-sm text-gray-500">{key}</span>
                <span className="text-sm font-medium text-gray-900">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discount tiers */}
      {p.discountTiers.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
          <h3 className="font-semibold text-gray-900 mb-3">Chính sách chiết khấu B2B</h3>
          <div className="space-y-2">
            {p.discountTiers.map((tier, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "#fffbf0", border: "1px solid #fef3c7" }}>
                <span className="text-sm font-medium text-gray-700">{tier.label}</span>
                <div className="text-right">
                  <span className="text-lg font-black" style={{ color: "#C9A84C" }}>-{tier.discountPct}%</span>
                  <div className="text-xs text-gray-500">= {formatVND(p.basePrice * (1 - tier.discountPct / 100))}/bộ</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }: { product: CrmProduct | null; onClose: () => void; onSaved: (p: CrmProduct) => void }) {
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    category: product?.category || "ergonomic_bed" as CrmProduct["category"],
    description: product?.description || "",
    imageUrl: product?.imageUrl || "",
    basePrice: product?.basePrice?.toString() || "",
    isActive: product?.isActive ?? true,
    specsText: product ? Object.entries(product.specs).map(([k, v]) => `${k}: ${v}`).join("\n") : "",
    tiersText: product ? product.discountTiers.map(t => `${t.minQty}:${t.discountPct}:${t.label}`).join("\n") : "5:10:≥5 bộ: -10%\n10:15:≥10 bộ: -15%\n20:20:≥20 bộ: -20%",
  });

  function set(k: string, v: string | boolean) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const specs: Record<string, string> = {};
      form.specsText.split("\n").forEach(line => {
        const [k, ...rest] = line.split(":");
        if (k?.trim()) specs[k.trim()] = rest.join(":").trim();
      });
      const discountTiers: DiscountTier[] = form.tiersText.split("\n").map(line => {
        const [minQty, discountPct, ...labelParts] = line.split(":");
        return { minQty: parseInt(minQty) || 0, discountPct: parseInt(discountPct) || 0, label: labelParts.join(":").trim() };
      }).filter(t => t.minQty > 0);

      const body: CrmProduct = {
        id: product?.id || crypto.randomUUID(),
        name: form.name,
        sku: form.sku,
        category: form.category,
        description: form.description,
        imageUrl: form.imageUrl,
        basePrice: parseFloat(form.basePrice) || 0,
        isActive: form.isActive,
        specs,
        discountTiers,
        createdAt: product?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/crm/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      onSaved(await res.json());
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white rounded-t-2xl z-10"
          style={{ borderBottom: "1px solid #f3f4f6" }}>
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tên sản phẩm *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} required
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">SKU</label>
              <input value={form.sku} onChange={e => set("sku", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30" placeholder="SF-PRO-MAX" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Danh mục</label>
              <select value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none bg-white">
                <option value="ergonomic_bed">Giường công thái học</option>
                <option value="sofa_bed">Sofa giường</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Giá gốc (VND)</label>
              <input type="number" value={form.basePrice} onChange={e => set("basePrice", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30" placeholder="28900000" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">URL ảnh</label>
            <input value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mô tả</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Thông số kỹ thuật (mỗi dòng: Tên: Giá trị)</label>
            <textarea value={form.specsText} onChange={e => set("specsText", e.target.value)} rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none font-mono"
              placeholder="Kích thước: 160x200cm&#10;Tải trọng: 200kg&#10;Bảo hành: 5 năm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Chiết khấu (mỗi dòng: SốLượng:Phần%:Nhãn)</label>
            <textarea value={form.tiersText} onChange={e => set("tiersText", e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none font-mono"
              placeholder="5:10:≥5 bộ: -10%&#10;10:15:≥10 bộ: -15%" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white flex items-center justify-center gap-2"
              style={{ background: "#C9A84C" }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
