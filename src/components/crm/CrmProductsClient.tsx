"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus, Package, Tag, Edit3, X, Loader2, Check,
  Search, Grid3X3, List, Star, TrendingUp, ShieldCheck,
  ChevronDown, Trash2, Eye, EyeOff, Copy, BarChart2,
  Layers, DollarSign, Percent, AlertCircle,
} from "lucide-react";
import type { CrmProduct, DiscountTier } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  cardShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  cardHover: "0 4px 12px rgba(0,0,0,0.08)",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  gold: "#C9A84C",
  goldLight: "#FEF3C7",
  goldBorder: "#FDE68A",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  green: "#10B981",
  greenLight: "#ECFDF5",
  red: "#EF4444",
  redLight: "#FEF2F2",
  indigo: "#6366F1",
  indigoLight: "#EEF2FF",
};

const CATEGORY_MAP: Record<CrmProduct["category"], { label: string; color: string; bg: string; icon: string }> = {
  ergonomic_bed: { label: "Giường CT", color: T.purple, bg: T.purpleLight, icon: "🛏️" },
  sofa_bed: { label: "Sofa giường", color: T.blue, bg: T.blueLight, icon: "🛋️" },
};

interface Props { initialProducts: CrmProduct[] }

export default function CrmProductsClient({ initialProducts }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<CrmProduct | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<CrmProduct | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<"all" | CrmProduct["category"]>("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "all" || p.category === filterCat;
      const matchActive = filterActive === "all" || (filterActive === "active" ? p.isActive : !p.isActive);
      return matchSearch && matchCat && matchActive;
    });
  }, [products, search, filterCat, filterActive]);

  function openAdd() { setEditProduct(null); setShowModal(true); }
  function openEdit(p: CrmProduct) { setEditProduct(p); setShowModal(true); }

  async function toggleActive(p: CrmProduct) {
    const updated = { ...p, isActive: !p.isActive };
    await fetch("/api/crm/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    setProducts(prev => prev.map(x => x.id === p.id ? updated : x));
    if (selected?.id === p.id) setSelected(updated);
  }

  async function deleteProduct(p: CrmProduct) {
    if (!confirm(`Xóa sản phẩm "${p.name}"?`)) return;
    await fetch(`/api/crm/products?id=${p.id}`, { method: "DELETE" });
    setProducts(prev => prev.filter(x => x.id !== p.id));
    if (selected?.id === p.id) setSelected(null);
  }

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.isActive).length,
    avgPrice: products.length > 0 ? products.reduce((s, p) => s + p.basePrice, 0) / products.length : 0,
    categories: [...new Set(products.map(p => p.category))].length,
  }), [products]);

  return (
    <div className="flex flex-col h-full" style={{ background: T.bg }}>
      {/* ── Top header ── */}
      <div className="flex-shrink-0 px-6 py-4" style={{ background: T.card, borderBottom: `1px solid ${T.cardBorder}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: T.textPrimary }}>Danh mục sản phẩm</h1>
            <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>{stats.total} sản phẩm · {stats.active} đang bán</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: T.gold, color: "#fff", boxShadow: "0 2px 8px rgba(201,168,76,0.35)" }}>
            <Plus size={15} /> Thêm sản phẩm
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { icon: Package, label: "Tổng SP", value: stats.total, color: T.indigo, bg: T.indigoLight },
            { icon: ShieldCheck, label: "Đang bán", value: stats.active, color: T.green, bg: T.greenLight },
            { icon: Layers, label: "Danh mục", value: stats.categories, color: T.purple, bg: T.purpleLight },
            { icon: DollarSign, label: "Giá TB", value: formatVND(stats.avgPrice), color: T.gold, bg: T.goldLight },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: bg, border: `1px solid ${color}22` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}22` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: T.textMuted }}>{label}</div>
                <div className="text-sm font-bold" style={{ color: T.textPrimary }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textMuted }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, SKU..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2"
              style={{ borderColor: T.cardBorder, color: T.textPrimary, background: T.bg }}
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
            {([["all", "Tất cả"], ["ergonomic_bed", "Giường CT"], ["sofa_bed", "Sofa"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilterCat(val)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: filterCat === val ? T.gold : "transparent",
                  color: filterCat === val ? "#fff" : T.textSecondary,
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Active filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
            {([["all", "Tất cả"], ["active", "Đang bán"], ["inactive", "Ẩn"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilterActive(val)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: filterActive === val ? T.textPrimary : "transparent",
                  color: filterActive === val ? "#fff" : T.textSecondary,
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl ml-auto" style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
            {([["grid", Grid3X3], ["list", List]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className="p-1.5 rounded-lg transition-all"
                style={{ background: viewMode === mode ? T.card : "transparent", color: viewMode === mode ? T.textPrimary : T.textMuted, boxShadow: viewMode === mode ? T.cardShadow : "none" }}>
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Product grid/list */}
        <div className={`flex-1 overflow-y-auto p-6 ${selected ? "max-w-2xl" : ""}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package size={40} className="mb-3 opacity-20" style={{ color: T.textMuted }} />
              <p className="font-medium" style={{ color: T.textSecondary }}>Không tìm thấy sản phẩm</p>
              <p className="text-sm mt-1" style={{ color: T.textMuted }}>Thử thay đổi bộ lọc hoặc thêm sản phẩm mới</p>
              <button onClick={openAdd} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: T.gold, color: "#fff" }}>
                <Plus size={14} /> Thêm sản phẩm
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(p => (
                <ProductCard key={p.id} product={p}
                  isSelected={selected?.id === p.id}
                  onSelect={() => setSelected(p)}
                  onEdit={() => openEdit(p)}
                  onToggleActive={() => toggleActive(p)}
                  onDelete={() => deleteProduct(p)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(p => (
                <ProductRow key={p.id} product={p}
                  isSelected={selected?.id === p.id}
                  onSelect={() => setSelected(p)}
                  onEdit={() => openEdit(p)}
                  onToggleActive={() => toggleActive(p)}
                  onDelete={() => deleteProduct(p)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-96 flex-shrink-0 overflow-y-auto border-l" style={{ borderColor: T.cardBorder, background: T.card }}>
            <ProductDetail
              product={selected}
              onEdit={() => openEdit(selected)}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ProductModal
          product={editProduct}
          onClose={() => setShowModal(false)}
          onSaved={p => {
            setProducts(prev => {
              const idx = prev.findIndex(x => x.id === p.id);
              if (idx >= 0) { const n = [...prev]; n[idx] = p; return n; }
              return [p, ...prev];
            });
            setSelected(p);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Product Card (Grid view) ─────────────────────────────────────────────────
function ProductCard({ product: p, isSelected, onSelect, onEdit, onToggleActive, onDelete }: {
  product: CrmProduct; isSelected: boolean;
  onSelect: () => void; onEdit: () => void; onToggleActive: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cat = CATEGORY_MAP[p.category];
  const minDiscount = p.discountTiers.length > 0 ? Math.min(...p.discountTiers.map(t => t.discountPct)) : 0;
  const maxDiscount = p.discountTiers.length > 0 ? Math.max(...p.discountTiers.map(t => t.discountPct)) : 0;

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        background: T.card,
        border: `1.5px solid ${isSelected ? T.gold : T.cardBorder}`,
        boxShadow: hovered || isSelected ? T.cardHover : T.cardShadow,
        transform: hovered ? "translateY(-2px)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      {/* Image */}
      <div className="relative" style={{ aspectRatio: "1/1", background: "#F8FAFC" }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">{cat.icon}</span>
            <span className="text-xs font-medium" style={{ color: T.textMuted }}>{cat.label}</span>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: cat.bg, color: cat.color }}>
            {cat.label}
          </span>
          {!p.isActive && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "#F1F5F9", color: T.textMuted }}>
              Ẩn
            </span>
          )}
        </div>
        {/* Actions overlay */}
        {hovered && (
          <div className="absolute top-2 right-2 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-all hover:scale-110"
              style={{ background: T.card, color: T.textSecondary }}>
              <Edit3 size={12} />
            </button>
            <button onClick={onToggleActive} className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-all hover:scale-110"
              style={{ background: T.card, color: p.isActive ? T.textMuted : T.green }}>
              {p.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-all hover:scale-110"
              style={{ background: T.card, color: T.red }}>
              <Trash2 size={12} />
            </button>
          </div>
        )}
        {/* Discount badge */}
        {maxDiscount > 0 && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-black"
            style={{ background: T.gold, color: "#fff" }}>
            -{minDiscount}~{maxDiscount}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="font-bold text-sm truncate mb-0.5" style={{ color: T.textPrimary }}>{p.name}</div>
        <div className="text-[11px] font-mono mb-2" style={{ color: T.textMuted }}>{p.sku}</div>
        <div className="flex items-center justify-between">
          <div className="font-black text-base" style={{ color: T.gold }}>{formatVND(p.basePrice)}</div>
          {p.discountTiers.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px]" style={{ color: T.textMuted }}>
              <Percent size={10} />
              <span>{p.discountTiers.length} mức CK</span>
            </div>
          )}
        </div>
        {/* Specs preview */}
        {Object.keys(p.specs).length > 0 && (
          <div className="mt-2 pt-2 flex flex-wrap gap-1" style={{ borderTop: `1px solid ${T.cardBorder}` }}>
            {Object.entries(p.specs).slice(0, 2).map(([k, v]) => (
              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-md"
                style={{ background: T.bg, color: T.textSecondary }}>
                {k}: <strong>{v}</strong>
              </span>
            ))}
            {Object.keys(p.specs).length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: T.bg, color: T.textMuted }}>
                +{Object.keys(p.specs).length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Product Row (List view) ──────────────────────────────────────────────────
function ProductRow({ product: p, isSelected, onSelect, onEdit, onToggleActive, onDelete }: {
  product: CrmProduct; isSelected: boolean;
  onSelect: () => void; onEdit: () => void; onToggleActive: () => void; onDelete: () => void;
}) {
  const cat = CATEGORY_MAP[p.category];
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all"
      style={{
        background: isSelected ? T.goldLight : T.card,
        border: `1.5px solid ${isSelected ? T.goldBorder : T.cardBorder}`,
      }}
      onClick={onSelect}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: T.bg }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">{cat.icon}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate" style={{ color: T.textPrimary }}>{p.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
            style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
          {!p.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "#F1F5F9", color: T.textMuted }}>Ẩn</span>}
        </div>
        <div className="text-xs mt-0.5" style={{ color: T.textMuted }}>{p.sku} · {Object.keys(p.specs).length} thông số · {p.discountTiers.length} mức chiết khấu</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-black text-sm" style={{ color: T.gold }}>{formatVND(p.basePrice)}</div>
        {p.discountTiers.length > 0 && (
          <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>
            CK -{Math.min(...p.discountTiers.map(t => t.discountPct))}~{Math.max(...p.discountTiers.map(t => t.discountPct))}%
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: T.textSecondary }}>
          <Edit3 size={13} />
        </button>
        <button onClick={onToggleActive} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: p.isActive ? T.textMuted : T.green }}>
          {p.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: T.red }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Product Detail Panel ─────────────────────────────────────────────────────
function ProductDetail({ product: p, onEdit, onClose }: { product: CrmProduct; onEdit: () => void; onClose: () => void }) {
  const cat = CATEGORY_MAP[p.category];
  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: T.card, borderBottom: `1px solid ${T.cardBorder}` }}>
        <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Chi tiết sản phẩm</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X size={14} style={{ color: T.textMuted }} />
        </button>
      </div>

      {/* Image */}
      <div className="relative" style={{ aspectRatio: "1/1", background: "#F8FAFC" }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <span className="text-6xl">{cat.icon}</span>
            <span className="text-sm font-medium" style={{ color: T.textMuted }}>{cat.label}</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
        </div>
        {!p.isActive && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)" }}>
            <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: "rgba(0,0,0,0.6)" }}>
              Đang ẩn
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Name + price */}
        <div>
          <h2 className="text-lg font-bold leading-tight" style={{ color: T.textPrimary }}>{p.name}</h2>
          <p className="text-xs mt-0.5 font-mono" style={{ color: T.textMuted }}>SKU: {p.sku}</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-black" style={{ color: T.gold }}>{formatVND(p.basePrice)}</span>
            <span className="text-xs mb-1" style={{ color: T.textMuted }}>/ bộ</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
            style={{ borderColor: T.cardBorder, color: T.textSecondary }}>
            <Edit3 size={13} /> Chỉnh sửa
          </button>
          <Link href="/crm/quotes/new"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: T.gold, color: "#fff" }}>
            <Tag size={13} /> Tạo báo giá
          </Link>
        </div>

        {/* Description */}
        {p.description && (
          <div className="p-3 rounded-xl" style={{ background: T.bg }}>
            <p className="text-sm leading-relaxed" style={{ color: T.textSecondary }}>{p.description}</p>
          </div>
        )}

        {/* Specs */}
        {Object.keys(p.specs).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 size={13} style={{ color: T.indigo }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textMuted }}>Thông số kỹ thuật</span>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.cardBorder}` }}>
              {Object.entries(p.specs).map(([k, v], i) => (
                <div key={k} className="flex items-center justify-between px-3 py-2.5"
                  style={{ background: i % 2 === 0 ? T.card : T.bg, borderBottom: i < Object.keys(p.specs).length - 1 ? `1px solid ${T.cardBorder}` : "none" }}>
                  <span className="text-xs" style={{ color: T.textSecondary }}>{k}</span>
                  <span className="text-xs font-semibold" style={{ color: T.textPrimary }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discount tiers */}
        {p.discountTiers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Percent size={13} style={{ color: T.green }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textMuted }}>Chính sách chiết khấu B2B</span>
            </div>
            <div className="space-y-2">
              {p.discountTiers.map((tier, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: T.goldLight, border: `1px solid ${T.goldBorder}` }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: T.textPrimary }}>{tier.label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>≥ {tier.minQty} bộ</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black" style={{ color: T.gold }}>-{tier.discountPct}%</div>
                    <div className="text-[10px]" style={{ color: T.textMuted }}>{formatVND(p.basePrice * (1 - tier.discountPct / 100))}/bộ</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Product Modal (Add/Edit) ─────────────────────────────────────────────────
function ProductModal({ product, onClose, onSaved }: {
  product: CrmProduct | null; onClose: () => void; onSaved: (p: CrmProduct) => void;
}) {
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "specs" | "discount">("basic");
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    category: product?.category || "ergonomic_bed" as CrmProduct["category"],
    description: product?.description || "",
    imageUrl: product?.imageUrl || "",
    basePrice: product?.basePrice?.toString() || "",
    isActive: product?.isActive ?? true,
  });
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    product ? Object.entries(product.specs).map(([key, value]) => ({ key, value })) : [{ key: "", value: "" }]
  );
  const [tiers, setTiers] = useState<DiscountTier[]>(
    product?.discountTiers.length ? product.discountTiers : [
      { minQty: 5, discountPct: 10, label: "≥5 bộ: -10%" },
      { minQty: 10, discountPct: 15, label: "≥10 bộ: -15%" },
      { minQty: 20, discountPct: 20, label: "≥20 bộ: -20%" },
    ]
  );

  function setF(k: string, v: string | boolean) { setForm(prev => ({ ...prev, [k]: v })); }

  function addSpec() { setSpecs(prev => [...prev, { key: "", value: "" }]); }
  function removeSpec(i: number) { setSpecs(prev => prev.filter((_, idx) => idx !== i)); }
  function updateSpec(i: number, field: "key" | "value", val: string) {
    setSpecs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  function addTier() { setTiers(prev => [...prev, { minQty: 0, discountPct: 0, label: "" }]); }
  function removeTier(i: number) { setTiers(prev => prev.filter((_, idx) => idx !== i)); }
  function updateTier(i: number, field: keyof DiscountTier, val: string) {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: field === "label" ? val : parseInt(val) || 0 } : t));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const specsObj: Record<string, string> = {};
      specs.filter(s => s.key.trim()).forEach(s => { specsObj[s.key.trim()] = s.value.trim(); });

      const body: CrmProduct = {
        id: product?.id || crypto.randomUUID(),
        name: form.name,
        sku: form.sku,
        category: form.category,
        description: form.description,
        imageUrl: form.imageUrl,
        basePrice: parseFloat(form.basePrice) || 0,
        isActive: form.isActive,
        specs: specsObj,
        discountTiers: tiers.filter(t => t.minQty > 0),
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

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all";
  const inputStyle = { borderColor: T.cardBorder, color: T.textPrimary, background: "#FAFAFA" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ border: `1px solid ${T.cardBorder}` }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: T.goldLight }}>
              <Package size={16} style={{ color: T.gold }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: T.textPrimary }}>
                {isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </h2>
              {isEdit && <p className="text-xs" style={{ color: T.textMuted }}>{product.sku}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: T.textMuted }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-3 gap-1 flex-shrink-0">
          {([
            ["basic", "Thông tin cơ bản"],
            ["specs", `Thông số (${specs.filter(s => s.key).length})`],
            ["discount", `Chiết khấu (${tiers.filter(t => t.minQty > 0).length})`],
          ] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-xs font-semibold rounded-xl transition-all"
              style={{
                background: activeTab === tab ? T.textPrimary : "transparent",
                color: activeTab === tab ? "#fff" : T.textSecondary,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: T.textSecondary }}>Tên sản phẩm *</label>
                  <input value={form.name} onChange={e => setF("name", e.target.value)} required
                    className={inputCls} style={inputStyle} placeholder="SmartFurni Pro Max" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: T.textSecondary }}>SKU</label>
                  <input value={form.sku} onChange={e => setF("sku", e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="SF-PRO-MAX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: T.textSecondary }}>Danh mục</label>
                  <select value={form.category} onChange={e => setF("category", e.target.value)}
                    className={inputCls} style={{ ...inputStyle, appearance: "none" }}>
                    <option value="ergonomic_bed">🛏️ Giường công thái học</option>
                    <option value="sofa_bed">🛋️ Sofa giường</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: T.textSecondary }}>Giá gốc (VND)</label>
                  <input type="number" value={form.basePrice} onChange={e => setF("basePrice", e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="28900000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.textSecondary }}>URL ảnh sản phẩm</label>
                <input value={form.imageUrl} onChange={e => setF("imageUrl", e.target.value)}
                  className={inputCls} style={inputStyle} placeholder="https://..." />
                {form.imageUrl && (
                  <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.cardBorder}` }}>
                    <img src={form.imageUrl} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.textSecondary }}>Mô tả sản phẩm</label>
                <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={3}
                  className={inputCls} style={{ ...inputStyle, resize: "none" }}
                  placeholder="Mô tả ngắn về sản phẩm, tính năng nổi bật..." />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: T.textPrimary }}>Hiển thị sản phẩm</div>
                  <div className="text-xs mt-0.5" style={{ color: T.textMuted }}>Sản phẩm sẽ xuất hiện trong báo giá</div>
                </div>
                <button type="button" onClick={() => setF("isActive", !form.isActive)}
                  className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
                  style={{ background: form.isActive ? T.green : "#CBD5E1" }}>
                  <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                    style={{ left: form.isActive ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </div>
            </div>
          )}

          {activeTab === "specs" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: T.textMuted }}>Thêm thông số kỹ thuật cho sản phẩm</p>
                <button type="button" onClick={addSpec}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: T.goldLight, color: T.gold }}>
                  <Plus size={12} /> Thêm dòng
                </button>
              </div>
              {specs.map((spec, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={spec.key} onChange={e => updateSpec(i, "key", e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="Tên thông số (vd: Kích thước)" />
                  <span style={{ color: T.textMuted }}>:</span>
                  <input value={spec.value} onChange={e => updateSpec(i, "value", e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="Giá trị (vd: 160x200cm)" />
                  <button type="button" onClick={() => removeSpec(i)}
                    className="p-2 rounded-lg hover:bg-red-50 flex-shrink-0 transition-colors"
                    style={{ color: T.red }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
              {/* Quick presets */}
              <div className="pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>Gợi ý nhanh</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Kích thước", "Tải trọng", "Chất liệu", "Màu sắc", "Bảo hành", "Xuất xứ"].map(preset => (
                    <button key={preset} type="button"
                      onClick={() => setSpecs(prev => [...prev.filter(s => s.key), { key: preset, value: "" }])}
                      className="px-2.5 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                      style={{ background: T.indigoLight, color: T.indigo }}>
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "discount" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: T.textMuted }}>Chính sách chiết khấu theo số lượng (B2B)</p>
                <button type="button" onClick={addTier}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: T.goldLight, color: T.gold }}>
                  <Plus size={12} /> Thêm mức
                </button>
              </div>
              {tiers.map((tier, i) => (
                <div key={i} className="p-3 rounded-xl space-y-2" style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: T.textMuted }}>Số lượng tối thiểu</label>
                      <input type="number" value={tier.minQty} onChange={e => updateTier(i, "minQty", e.target.value)}
                        className={inputCls} style={inputStyle} placeholder="5" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: T.textMuted }}>Chiết khấu (%)</label>
                      <input type="number" value={tier.discountPct} onChange={e => updateTier(i, "discountPct", e.target.value)}
                        className={inputCls} style={inputStyle} placeholder="10" min="0" max="100" />
                    </div>
                    <button type="button" onClick={() => removeTier(i)}
                      className="p-2 rounded-lg hover:bg-red-50 mt-5 flex-shrink-0"
                      style={{ color: T.red }}>
                      <X size={13} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: T.textMuted }}>Nhãn hiển thị</label>
                    <input value={tier.label} onChange={e => updateTier(i, "label", e.target.value)}
                      className={inputCls} style={inputStyle} placeholder="≥5 bộ: -10%" />
                  </div>
                  {tier.minQty > 0 && tier.discountPct > 0 && form.basePrice && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px]" style={{ color: T.textMuted }}>Giá sau CK:</span>
                      <span className="text-xs font-bold" style={{ color: T.gold }}>
                        {formatVND(parseFloat(form.basePrice) * (1 - tier.discountPct / 100))}/bộ
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${T.cardBorder}` }}>
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all hover:bg-gray-50"
            style={{ borderColor: T.cardBorder, color: T.textSecondary }}>
            Hủy
          </button>
          <button
            onClick={submit as unknown as React.MouseEventHandler}
            disabled={loading || !form.name}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: T.gold, color: "#fff" }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm sản phẩm"}
          </button>
        </div>
      </div>
    </div>
  );
}
