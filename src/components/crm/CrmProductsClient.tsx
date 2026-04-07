"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus, Package, Tag, Edit3, X, Loader2, Check,
  Search, Grid3X3, List, Star, TrendingUp, ShieldCheck,
  ChevronDown, Trash2, Eye, EyeOff, Copy, BarChart2,
  Layers, DollarSign, Percent, AlertCircle, Upload, ImageIcon, Ruler,
} from "lucide-react";
import type { CrmProduct, DiscountTier, SizePricing } from "@/lib/crm-types";
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

interface Props { initialProducts: CrmProduct[]; defaultTiers?: DiscountTier[] }

export default function CrmProductsClient({ initialProducts, defaultTiers = [] }: Props) {
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
    <div className="flex flex-col h-full" style={{ background: "#F0F2F5" }}>

      {/* ── Dark hero header ── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0" style={{ background: "#1c1c1e" }}>
        {/* Title row */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: "#FFFFFF" }}>Danh mục sản phẩm</h1>
            <p className="text-sm mt-0.5" style={{ color: "#9BA1A6" }}>{stats.total} sản phẩm · {stats.active} đang bán</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: T.gold, color: "#fff", boxShadow: "0 4px 14px rgba(201,168,76,0.45)" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            <Plus size={15} /> Thêm sản phẩm
          </button>
        </div>

        {/* Stats row — dark cards */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { icon: Package, label: "Tổng sản phẩm", value: stats.total, accent: T.indigo },
            { icon: ShieldCheck, label: "Đang bán", value: stats.active, accent: T.green },
            { icon: Layers, label: "Danh mục", value: stats.categories, accent: T.purple },
            { icon: DollarSign, label: "Giá trung bình", value: formatVND(stats.avgPrice), accent: T.gold },
          ].map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5 rounded-t-xl"
              style={{ background: "#28282c", borderTop: `3px solid ${accent}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${accent}22` }}>
                <Icon size={17} style={{ color: accent }} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide truncate" style={{ color: "#6B7280" }}>{label}</div>
                <div className="text-lg font-black leading-tight truncate" style={{ color: "#FFFFFF" }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex-shrink-0 px-6 py-3 flex items-center gap-3"
        style={{ background: T.card, borderBottom: `1px solid ${T.cardBorder}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textMuted }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, SKU..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none"
            style={{ borderColor: T.cardBorder, color: T.textPrimary, background: "#F8FAFC" }}
          />
        </div>

        {/* Divider */}
        <div className="w-px h-5" style={{ background: T.cardBorder }} />

        {/* Category + status filters merged */}
        <div className="flex items-center gap-1">
          {([
            { val: "all", label: "Tất cả", type: "cat" },
            { val: "ergonomic_bed", label: "Giường CT", type: "cat" },
            { val: "sofa_bed", label: "Sofa giường", type: "cat" },
          ] as const).map(({ val, label }) => {
            const colors: Record<string, string> = { all: T.textPrimary, ergonomic_bed: T.purple, sofa_bed: T.blue };
            const active = filterCat === val;
            return (
              <button key={val} onClick={() => setFilterCat(val)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: active ? colors[val] : "transparent",
                  color: active ? "#fff" : T.textSecondary,
                  boxShadow: active ? `0 2px 6px ${colors[val]}40` : "none",
                }}>
                {label}
              </button>
            );
          })}
        </div>

        <div className="w-px h-5" style={{ background: T.cardBorder }} />

        <div className="flex items-center gap-1">
          {([
            { val: "all", label: "Tất cả" },
            { val: "active", label: "Đang bán" },
            { val: "inactive", label: "Ẩn" },
          ] as const).map(({ val, label }) => {
            const colors: Record<string, string> = { all: T.textPrimary, active: T.green, inactive: T.red };
            const active = filterActive === val;
            return (
              <button key={val} onClick={() => setFilterActive(val)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: active ? colors[val] : "transparent",
                  color: active ? "#fff" : T.textSecondary,
                  boxShadow: active ? `0 2px 6px ${colors[val]}40` : "none",
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* View toggle right */}
        <div className="flex items-center gap-1 ml-auto p-1 rounded-xl" style={{ background: "#F8FAFC", border: `1px solid ${T.cardBorder}` }}>
          {([["grid", Grid3X3], ["list", List]] as const).map(([mode, Icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className="p-1.5 rounded-lg transition-all"
              style={{
                background: viewMode === mode ? "#1c1c1e" : "transparent",
                color: viewMode === mode ? "#fff" : T.textMuted,
              }}>
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Count badge */}
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: T.goldLight, color: T.gold, border: `1px solid ${T.goldBorder}` }}>
          {filtered.length} sản phẩm
        </span>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Product grid/list */}
        <div className="flex-1 overflow-y-auto p-5">
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
            <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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

        {/* Detail modal popup */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelected(null)}>
            <div className="w-full max-w-3xl rounded-2xl shadow-2xl"
              style={{ background: "#FFFFFF", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}
              onClick={e => e.stopPropagation()}>
              <ProductDetail
                product={selected}
                onEdit={() => openEdit(selected)}
                onClose={() => setSelected(null)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ProductModal
          product={editProduct ?? undefined}
          defaultTiers={defaultTiers}
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
  const hasSizes = !!(p.sizePricings && p.sizePricings.length > 0);
  const minPrice = hasSizes ? Math.min(...p.sizePricings!.map(s => s.price)) : p.basePrice;
  const maxPrice = hasSizes ? Math.max(...p.sizePricings!.map(s => s.price)) : p.basePrice;

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col"
      style={{
        background: T.card,
        border: `1.5px solid ${isSelected ? T.gold : T.cardBorder}`,
        boxShadow: hovered || isSelected ? "0 8px 24px rgba(0,0,0,0.12)" : T.cardShadow,
        transform: hovered ? "translateY(-3px)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      {/* Image - 4:3 ratio */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "4/3", background: cat.bg, flexShrink: 0 }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover"
            style={{ transition: "transform 0.35s ease", transform: hovered ? "scale(1.06)" : "scale(1)" }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl opacity-60">{cat.icon}</span>
          </div>
        )}
        {/* Gradient overlay */}
        {p.imageUrl && (
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)" }} />
        )}
        {/* Category badge top-left */}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}55`, backdropFilter: "blur(4px)" }}>
            {cat.label}
          </span>
        </div>
        {/* Status badge */}
        {!p.isActive && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>Ẩn</span>
          </div>
        )}
        {/* Discount badge bottom-left on image */}
        {maxDiscount > 0 && (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-black"
            style={{ background: T.gold, color: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
            -{minDiscount}~{maxDiscount}%
          </div>
        )}
        {/* Actions - appear on hover */}
        <div className="absolute top-2.5 right-2.5 flex gap-1"
          style={{ opacity: hovered && p.isActive ? 1 : (hovered && !p.isActive ? 1 : 0), transition: "opacity 0.15s, transform 0.15s", transform: hovered ? "translateY(0)" : "translateY(-4px)" }}
          onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md"
            style={{ background: "rgba(255,255,255,0.93)", color: T.textSecondary }}>
            <Edit3 size={12} />
          </button>
          <button onClick={onToggleActive} className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md"
            style={{ background: "rgba(255,255,255,0.93)", color: p.isActive ? T.textMuted : T.green }}>
            {p.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md"
            style={{ background: "rgba(255,255,255,0.93)", color: T.red }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Info section */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        {/* Name + SKU */}
        <div>
          <div className="font-bold text-sm leading-snug line-clamp-2" style={{ color: T.textPrimary }}>{p.name}</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: T.textMuted }}>{p.sku}</div>
        </div>
        {/* Price row */}
        <div className="flex items-end justify-between mt-auto pt-2" style={{ borderTop: `1px solid ${T.cardBorder}` }}>
          <div>
            {hasSizes ? (
              <>
                <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: T.textMuted }}>Từ</div>
                <div className="font-black text-base leading-none" style={{ color: T.gold }}>{formatVND(minPrice)}</div>
                {minPrice !== maxPrice && (
                  <div className="text-[9px] mt-0.5" style={{ color: T.textMuted }}>đến {formatVND(maxPrice)}</div>
                )}
              </>
            ) : (
              <div className="font-black text-base leading-none" style={{ color: T.gold }}>{formatVND(p.basePrice)}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {hasSizes && (
              <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md font-semibold"
                style={{ background: T.indigoLight, color: T.indigo }}>
                <Ruler size={9} />{p.sizePricings!.length} kích thước
              </span>
            )}
            {p.discountTiers.length > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md font-semibold"
                style={{ background: T.greenLight, color: T.green }}>
                <Percent size={9} />{p.discountTiers.length} mức CK
              </span>
            )}
          </div>
        </div>
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
        <div className="text-xs mt-0.5" style={{ color: T.textMuted }}>
          {p.sku} · {Object.keys(p.specs).length} thông số · {p.discountTiers.length} mức CK
          {p.sizePricings && p.sizePricings.length > 0 && ` · ${p.sizePricings.length} kích thước`}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {p.sizePricings && p.sizePricings.length > 0 ? (
          <div>
            <div className="font-black text-sm" style={{ color: T.gold }}>
              {formatVND(Math.min(...p.sizePricings.map(s => s.price)))}
              {Math.min(...p.sizePricings.map(s => s.price)) !== Math.max(...p.sizePricings.map(s => s.price)) &&
                ` – ${formatVND(Math.max(...p.sizePricings.map(s => s.price)))}`}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>theo kích thước</div>
          </div>
        ) : (
          <div>
            <div className="font-black text-sm" style={{ color: T.gold }}>{formatVND(p.basePrice)}</div>
            {p.discountTiers.length > 0 && (
              <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>
                CK -{Math.min(...p.discountTiers.map(t => t.discountPct))}~{Math.max(...p.discountTiers.map(t => t.discountPct))}%
              </div>
            )}
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
  const hasSizes = !!(p.sizePricings && p.sizePricings.length > 0);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0);
  const selectedSize = hasSizes ? p.sizePricings![selectedSizeIdx] : null;
  const displayPrice = selectedSize ? selectedSize.price : p.basePrice;
  const hasSpecs = Object.keys(p.specs).length > 0;

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 20, overflow: "hidden", width: "100%" }}>
      {/* Dark header */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full font-bold"
            style={{ background: `${cat.color}30`, color: cat.color, border: `1px solid ${cat.color}50` }}>
            {cat.icon} {cat.label}
          </span>
          {!p.isActive && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "#F1F5F9", color: "#64748B" }}>Ẩn</span>
          )}
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md"
            style={{ background: "#F1F5F9", color: "#64748B" }}>{p.sku}</span>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "#F1F5F9", color: "#64748B" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#E2E8F0")}
          onMouseLeave={e => (e.currentTarget.style.background = "#F1F5F9")}>
          <X size={13} />
        </button>
      </div>

      {/* Body: Left image | Right info */}
      <div className="flex">

        {/* Left: square image 1:1 */}
        <div className="flex-shrink-0 relative" style={{ width: 340, height: 340, background: cat.bg }}>
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: "12px" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl opacity-30">{cat.icon}</span>
            </div>
          )}
          {/* Price overlay bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-4"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              {hasSizes && selectedSize ? selectedSize.label : "Giá bán"}
            </div>
            <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>{formatVND(displayPrice)}</div>
          </div>
        </div>

        {/* Right: scrollable info */}
        <div className="flex-1 flex flex-col overflow-y-auto" style={{ minWidth: 0, maxHeight: 500 }}>

          {/* Product name + description */}
          <div className="px-5 pt-4 pb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h2 className="text-base font-black leading-snug" style={{ color: "#0F172A" }}>{p.name}</h2>
            {p.description && (
              <p className="text-xs leading-relaxed mt-2" style={{ color: "#64748B" }}>{p.description}</p>
            )}
          </div>

          {/* Size selector with price */}
          {hasSizes && (
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "#94A3B8" }}>Kích thước &amp; Giá</div>
              <div className="grid grid-cols-2 gap-2">
                {p.sizePricings!.map((s, i) => {
                  const active = selectedSizeIdx === i;
                  return (
                    <button key={i} onClick={() => setSelectedSizeIdx(i)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left"
                      style={{
                        background: active ? "#FEF3C7" : "#F8FAFC",
                        border: `1.5px solid ${active ? "#C9A84C" : "#E2E8F0"}`,
                        boxShadow: active ? "0 2px 10px rgba(201,168,76,0.25)" : "none",
                      }}>
                      <div className="text-[11px] font-bold" style={{ color: active ? "#0F172A" : "#475569" }}>{s.label}</div>
                      <div className="text-xs font-black" style={{ color: "#C9A84C" }}>{formatVND(s.price)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Discount tiers */}
          {p.discountTiers.length > 0 && (
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "#94A3B8" }}>Chiết khấu số lượng</div>
              <div className="grid grid-cols-3 gap-2">
                {p.discountTiers.map((tier, i) => (
                  <div key={i} className="flex flex-col items-center py-2.5 px-2 rounded-xl"
                    style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)" }}>
                    <div className="text-[10px]" style={{ color: "#64748B" }}>≥{tier.minQty} bộ</div>
                    <div className="text-sm font-black mt-0.5" style={{ color: "#C9A84C" }}>-{tier.discountPct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specs */}
          {hasSpecs && (
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "#94A3B8" }}>Thông số kỹ thuật</div>
              <div className="space-y-1.5">
                {Object.entries(p.specs).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: "#F8FAFC" }}>
                    <span className="text-xs" style={{ color: "#64748B" }}>{k}</span>
                    <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <div className="px-5 py-4 flex gap-2.5" style={{ borderTop: "1px solid #E2E8F0" }}>
            <button onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ border: "1.5px solid #E2E8F0", color: "#64748B", background: "#F8FAFC" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#E2E8F0")}
              onMouseLeave={e => (e.currentTarget.style.background = "#F8FAFC")}>
              <Edit3 size={14} /> Chỉnh sửa
            </button>
            <Link href="/crm/quotes/new"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "#C9A84C", color: "#fff", boxShadow: "0 4px 14px rgba(201,168,76,0.35)" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              <Tag size={14} /> Tạo báo giá
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Modal (Add/Edit) ─────────────────────────────────────────────────
function ProductModal({ product, onClose, onSaved, defaultTiers = [] }: {
  product?: CrmProduct;
  onClose: () => void;
  onSaved: (p: CrmProduct) => void;
  defaultTiers?: DiscountTier[];
}) {
  const isEdit = !!product;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "specs" | "discount" | "size">("basic");
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    category: product?.category || "ergonomic_bed" as CrmProduct["category"],
    description: product?.description || "",
    imageUrl: product?.imageUrl || "",
    basePrice: product?.basePrice?.toString() || "",
    isActive: product?.isActive ?? true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    product ? Object.entries(product.specs).map(([key, value]) => ({ key, value })) : [{ key: "", value: "" }]
  );
  // If product has no custom tiers, use empty array (will fall back to default)
  const hasCustomTiers = !!(product?.discountTiers?.length);
  const [tiers, setTiers] = useState<DiscountTier[]>(product?.discountTiers || []);
  const [usingDefaultTiers, setUsingDefaultTiers] = useState(!hasCustomTiers);
  const [sizePricings, setSizePricings] = useState<SizePricing[]>(product?.sizePricings || []);

  function setF(k: string, v: string | boolean) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/crm/facebook-scheduler/upload-image", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setF("imageUrl", url);
      }
    } finally { setUploadingImage(false); }
  }

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

  function addSizePricing() { setSizePricings(prev => [...prev, { size: "", price: 0, label: "" }]); }
  function removeSizePricing(i: number) { setSizePricings(prev => prev.filter((_, idx) => idx !== i)); }
  function updateSizePricing(i: number, field: keyof SizePricing, val: string) {
    setSizePricings(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: field === "price" ? parseFloat(val) || 0 : val } : s));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const specsObj: Record<string, string> = {};
      specs.filter(s => s.key.trim()).forEach(s => { specsObj[s.key.trim()] = s.value.trim(); });

      // If using default tiers, save empty array (will fall back to global setting)
      const finalTiers = usingDefaultTiers ? [] : tiers.filter(t => t.minQty > 0);

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
        discountTiers: finalTiers,
        sizePricings: sizePricings.filter(s => s.size.trim() && s.price > 0),
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
        <div className="flex px-6 pt-3 gap-1 flex-shrink-0 flex-wrap">
          {([
            ["basic", "Thông tin cơ bản"],
            ["specs", `Thông số (${specs.filter(s => s.key).length})`],
            ["discount", usingDefaultTiers ? "Chiết khấu (mặc định)" : `Chiết khấu (${tiers.filter(t => t.minQty > 0).length})`],
            ["size", `Kích thước (${sizePricings.filter(s => s.size.trim()).length})`],
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
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.textSecondary }}>Ảnh sản phẩm</label>
                {/* Upload zone */}
                <label className="flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
                  style={{ borderColor: T.goldBorder, background: T.goldLight }}>
                  {uploadingImage ? (
                    <Loader2 size={20} className="animate-spin" style={{ color: T.gold }} />
                  ) : form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <Upload size={20} style={{ color: T.gold }} />
                      <span className="text-xs font-semibold" style={{ color: T.gold }}>Nhấn để chọn ảnh từ máy tính</span>
                      <span className="text-[10px]" style={{ color: T.textMuted }}>JPG, PNG, WEBP · Tối đa 10MB</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
                {/* URL fallback */}
                <div className="mt-2">
                  <input value={form.imageUrl} onChange={e => setF("imageUrl", e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="Hoặc dán URL ảnh..." />
                </div>
                {form.imageUrl && (
                  <button type="button" onClick={() => setF("imageUrl", "")}
                    className="mt-1 text-xs flex items-center gap-1 hover:opacity-70"
                    style={{ color: T.red }}>
                    <X size={11} /> Xóa ảnh
                  </button>
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
              {/* Default tiers banner */}
              <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: usingDefaultTiers ? "#F0FDF4" : T.goldLight, border: `1px solid ${usingDefaultTiers ? "#86EFAC" : T.goldBorder}` }}>
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: usingDefaultTiers ? "#16A34A" : T.gold }}>
                    {usingDefaultTiers ? "✅ Đang dùng chiết khấu chung" : "⚡ Chiết khấu riêng cho sản phẩm này"}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: usingDefaultTiers ? "#15803D" : T.textSecondary }}>
                    {usingDefaultTiers
                      ? `Áp dụng ${defaultTiers.length} bậc từ Cài đặt CRM. Xóa để tùy chỉnh riêng.`
                      : "Chiết khấu này sẽ ghi đè lên cài đặt chung."}
                  </p>
                  {usingDefaultTiers && defaultTiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {defaultTiers.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "#DCFCE7", color: "#16A34A" }}>
                          ≥{t.minQty} bộ: -{t.discountPct}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button"
                  onClick={() => {
                    if (usingDefaultTiers) {
                      setUsingDefaultTiers(false);
                      if (tiers.length === 0) setTiers(defaultTiers.length ? [...defaultTiers] : [{ minQty: 5, discountPct: 10, label: "≥5 bộ: -10%" }]);
                    } else {
                      setUsingDefaultTiers(true);
                    }
                  }}
                  className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: usingDefaultTiers ? "#DCFCE7" : T.bg, color: usingDefaultTiers ? "#16A34A" : T.textSecondary, border: `1px solid ${usingDefaultTiers ? "#86EFAC" : T.cardBorder}` }}>
                  {usingDefaultTiers ? "Tùy chỉnh riêng" : "Dùng mặc định"}
                </button>
              </div>

              {!usingDefaultTiers && (
              <>
              <div className="flex items-center justify-between">
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
              </>
              )}
            </div>
          )}

          {activeTab === "size" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-xs font-semibold" style={{ color: T.textSecondary }}>Giá theo kích thước</p>
                  <p className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>Mỗi kích thước có giá riêng. Khi tạo báo giá, nhân viên có thể chọn kích thước phù hợp.</p>
                </div>
                <button type="button" onClick={addSizePricing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                  style={{ background: T.goldLight, color: T.gold }}>
                  <Plus size={12} /> Thêm kích thước
                </button>
              </div>
              {sizePricings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: T.textMuted }}>
                  <Ruler size={28} style={{ opacity: 0.4 }} />
                  <p className="text-xs">Chưa có kích thước nào. Nhấn "Thêm kích thước" để bắt đầu.</p>
                </div>
              )}
              {sizePricings.map((sp, i) => (
                <div key={i} className="p-3 rounded-xl space-y-2" style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: T.textMuted }}>Kích thước</label>
                      <input value={sp.size} onChange={e => updateSizePricing(i, "size", e.target.value)}
                        className={inputCls} style={inputStyle} placeholder="VD: 1.2x2m" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: T.textMuted }}>Giá (VND)</label>
                      <input type="number" value={sp.price || ""} onChange={e => updateSizePricing(i, "price", e.target.value)}
                        className={inputCls} style={inputStyle} placeholder="28900000" />
                    </div>
                    <button type="button" onClick={() => removeSizePricing(i)}
                      className="p-2 rounded-lg hover:bg-red-50 mt-5 flex-shrink-0"
                      style={{ color: T.red }}>
                      <X size={13} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: T.textMuted }}>Nhãn hiển thị (tùy chọn)</label>
                    <input value={sp.label} onChange={e => updateSizePricing(i, "label", e.target.value)}
                      className={inputCls} style={inputStyle} placeholder="VD: 1.2m x 2m (Standard)" />
                  </div>
                  {sp.price > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px]" style={{ color: T.textMuted }}>Giá:</span>
                      <span className="text-xs font-bold" style={{ color: T.gold }}>{formatVND(sp.price)}</span>
                    </div>
                  )}
                </div>
              ))}
              {/* Preset sizes */}
              {sizePricings.length === 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>Gợi ý nhanh</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["1.2x2m", "1.4x2m", "1.6x2m", "1.8x2m", "2x2m", "1.2x2.2m", "1.6x2.2m", "1.8x2.2m"].map(size => (
                      <button key={size} type="button"
                        onClick={() => setSizePricings(prev => [...prev, { size, price: 0, label: size }])}
                        className="px-2.5 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                        style={{ background: T.blueLight, color: T.blue }}>
                        + {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
