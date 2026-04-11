"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus, Package, Tag, Edit3, X, Loader2, Check,
  Search, Grid3X3, List, ShieldCheck,
  Trash2, Eye, EyeOff, Upload,
  Layers, DollarSign, Percent, Ruler, Sparkles,
} from "lucide-react";
import type { CrmProduct, DiscountTier, SizePricing } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";

// ─── Dark Luxury Design Tokens (matches Dashboard: #0f172a → #1e1a0e → #1a1200) ─
const D = {
  // Backgrounds — same gradient as CrmDashboard
  pageBg: "linear-gradient(135deg, #0f172a 0%, #1e1a0e 50%, #1a1200 100%)",
  headerBg: "rgba(15,23,42,0.92)",
  cardBg: "rgba(255,255,255,0.04)",
  cardBgHover: "rgba(255,255,255,0.07)",
  surfaceBg: "rgba(255,255,255,0.03)",
  filterBg: "rgba(15,23,42,0.7)",

  // Borders
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.14)",
  borderGold: "rgba(201,168,76,0.45)",

  // Text
  textPrimary: "#f5edd6",
  textSecondary: "rgba(245,237,214,0.75)",
  textMuted: "rgba(255,255,255,0.4)",

  // Accent — Gold
  gold: "#C9A84C",
  goldDim: "rgba(201,168,76,0.12)",
  goldGlow: "0 0 20px rgba(201,168,76,0.25)",

  // Semantic
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.12)",
  blue: "#60a5fa",
  blueDim: "rgba(96,165,250,0.12)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.10)",
  red: "#f87171",
  redDim: "rgba(248,113,113,0.10)",
  indigo: "#8b5cf6",
  indigoDim: "rgba(139,92,246,0.12)",
};

const CATEGORY_MAP: Record<CrmProduct["category"], { label: string; color: string; dim: string; icon: string }> = {
  ergonomic_bed: { label: "Giường CT", color: D.purple, dim: D.purpleDim, icon: "🛏️" },
  sofa_bed: { label: "Sofa giường", color: D.blue, dim: D.blueDim, icon: "🛋️" },
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
    <div className="flex flex-col h-full" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1a0e 50%, #1a1200 100%)" }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0" style={{ background: D.headerBg, borderBottom: `1px solid ${D.border}` }}>
        {/* Title + CTA */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} style={{ color: D.gold }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: D.gold }}>
                Danh mục sản phẩm
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: D.textPrimary }}>
              SmartFurni Products
            </h1>
            <p className="text-sm mt-0.5" style={{ color: D.textMuted }}>
              {stats.total} sản phẩm · {stats.active} đang bán
            </p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: `linear-gradient(135deg, ${D.gold}, #A8893C)`,
              color: "#0D0D0F",
              boxShadow: `0 4px 20px rgba(201,168,76,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`,
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
            <Plus size={15} /> Thêm sản phẩm
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-0 px-6 pb-0">
          {[
            { icon: Package, label: "Tổng sản phẩm", value: stats.total, color: D.indigo, dim: D.indigoDim },
            { icon: ShieldCheck, label: "Đang bán", value: stats.active, color: D.green, dim: D.greenDim },
            { icon: Layers, label: "Danh mục", value: stats.categories, color: D.purple, dim: D.purpleDim },
            { icon: DollarSign, label: "Giá trung bình", value: formatVND(stats.avgPrice), color: D.gold, dim: D.goldDim },
          ].map(({ icon: Icon, label, value, color, dim }, idx) => (
            <div key={label}
              className="flex items-center gap-3 px-5 py-4 relative"
              style={{
                background: dim,
                borderTop: `2px solid ${color}`,
                borderRight: idx < 3 ? `1px solid ${D.border}` : "none",
              }}>
              {/* Glow dot */}
              <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: D.textMuted }}>{label}</div>
                <div className="text-xl font-black leading-tight truncate mt-0.5" style={{ color: D.textPrimary }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-3"
        style={{ background: "rgba(15,23,42,0.6)", borderBottom: `1px solid ${D.border}`, backdropFilter: "blur(8px)" }}>
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: D.textMuted }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, SKU..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none transition-all"
            style={{
              background: D.cardBg,
              border: `1px solid ${D.border}`,
              color: D.textPrimary,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = D.gold)}
            onBlur={e => (e.currentTarget.style.borderColor = D.border)}
          />
        </div>

        <div className="w-px h-5" style={{ background: D.border }} />

        {/* Category filter */}
        <div className="flex items-center gap-1">
          {([
            { val: "all", label: "Tất cả" },
            { val: "ergonomic_bed", label: "Giường CT" },
            { val: "sofa_bed", label: "Sofa giường" },
          ] as const).map(({ val, label }) => {
            const colorMap: Record<string, string> = { all: D.textPrimary, ergonomic_bed: D.purple, sofa_bed: D.blue };
            const active = filterCat === val;
            return (
              <button key={val} onClick={() => setFilterCat(val)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: active ? `${colorMap[val]}22` : "transparent",
                  color: active ? colorMap[val] : D.textMuted,
                  border: `1px solid ${active ? colorMap[val] + "55" : "transparent"}`,
                }}>
                {label}
              </button>
            );
          })}
        </div>

        <div className="w-px h-5" style={{ background: D.border }} />

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {([
            { val: "all", label: "Tất cả" },
            { val: "active", label: "Đang bán" },
            { val: "inactive", label: "Ẩn" },
          ] as const).map(({ val, label }) => {
            const colorMap: Record<string, string> = { all: D.textPrimary, active: D.green, inactive: D.red };
            const active = filterActive === val;
            return (
              <button key={val} onClick={() => setFilterActive(val)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: active ? `${colorMap[val]}22` : "transparent",
                  color: active ? colorMap[val] : D.textMuted,
                  border: `1px solid ${active ? colorMap[val] + "55" : "transparent"}`,
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* View toggle + count */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: D.goldDim, color: D.gold, border: `1px solid ${D.borderGold}` }}>
            {filtered.length} sản phẩm
          </span>
          <div className="flex items-center gap-0.5 p-1 rounded-xl" style={{ background: D.cardBg, border: `1px solid ${D.border}` }}>
            {([["grid", Grid3X3], ["list", List]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className="p-1.5 rounded-lg transition-all"
                style={{
                  background: viewMode === mode ? D.gold : "transparent",
                  color: viewMode === mode ? "#0D0D0F" : D.textMuted,
                }}>
                <Icon size={13} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: D.cardBg, border: `1px solid ${D.border}` }}>
              <Package size={28} style={{ color: D.textMuted }} />
            </div>
            <p className="font-semibold" style={{ color: D.textSecondary }}>Không tìm thấy sản phẩm</p>
            <p className="text-sm mt-1" style={{ color: D.textMuted }}>Thử thay đổi bộ lọc hoặc thêm sản phẩm mới</p>
            <button onClick={openAdd} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: D.goldDim, color: D.gold, border: `1px solid ${D.borderGold}` }}>
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
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: D.cardBg,
              border: `1px solid ${D.border}`,
              boxShadow: `0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px ${D.border}`,
            }}
            onClick={e => e.stopPropagation()}>
            <ProductDetail
              product={selected}
              onEdit={() => openEdit(selected)}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
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

// ─── Product Card (Grid) ──────────────────────────────────────────────────────
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
        background: hovered ? D.cardBgHover : D.cardBg,
        border: `1px solid ${isSelected ? D.gold : hovered ? D.borderHover : D.border}`,
        boxShadow: isSelected
          ? `0 0 0 1px ${D.gold}, 0 8px 32px rgba(201,168,76,0.2)`
          : hovered
          ? `0 8px 32px rgba(0,0,0,0.4)`
          : "none",
        transform: hovered ? "translateY(-3px)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      {/* Image */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ aspectRatio: "4/3", background: D.surfaceBg }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover"
            style={{ transition: "transform 0.4s ease", transform: hovered ? "scale(1.07)" : "scale(1)" }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl opacity-20">{cat.icon}</span>
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)" }} />

        {/* Category badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              background: `${cat.color}22`,
              color: cat.color,
              border: `1px solid ${cat.color}44`,
              backdropFilter: "blur(8px)",
            }}>
            {cat.label}
          </span>
        </div>

        {/* Hidden badge */}
        {!p.isActive && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(0,0,0,0.7)", color: D.textMuted, backdropFilter: "blur(4px)" }}>
              Ẩn
            </span>
          </div>
        )}

        {/* Discount badge */}
        {maxDiscount > 0 && (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-black"
            style={{
              background: `linear-gradient(135deg, ${D.gold}, #A8893C)`,
              color: "#0D0D0F",
              boxShadow: "0 2px 8px rgba(201,168,76,0.4)",
            }}>
            -{minDiscount}~{maxDiscount}%
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute top-2.5 right-2.5 flex gap-1"
          style={{
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s, transform 0.15s",
            transform: hovered ? "translateY(0)" : "translateY(-4px)",
          }}
          onClick={e => e.stopPropagation()}>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm"
            style={{ background: "rgba(20,20,24,0.85)", color: D.textSecondary, border: `1px solid ${D.border}` }}>
            <Edit3 size={11} />
          </button>
          <button onClick={onToggleActive}
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm"
            style={{ background: "rgba(20,20,24,0.85)", color: p.isActive ? D.textMuted : D.green, border: `1px solid ${D.border}` }}>
            {p.isActive ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm"
            style={{ background: "rgba(20,20,24,0.85)", color: D.red, border: `1px solid ${D.border}` }}>
            <Trash2 size={11} />
          </button>
        </div>

        {/* Price overlay on image */}
        <div className="absolute bottom-2.5 right-2.5">
          <div className="text-right">
            {hasSizes && <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Từ</div>}
            <div className="text-sm font-black" style={{ color: D.gold, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
              {formatVND(minPrice)}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div>
          <div className="font-bold text-sm leading-snug line-clamp-2" style={{ color: D.textPrimary }}>{p.name}</div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: D.textMuted }}>{p.sku}</div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2" style={{ borderTop: `1px solid ${D.border}` }}>
          {hasSizes && (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md font-semibold"
              style={{ background: D.indigoDim, color: D.indigo }}>
              <Ruler size={8} />{p.sizePricings!.length} kích thước
            </span>
          )}
          {p.discountTiers.length > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md font-semibold"
              style={{ background: D.greenDim, color: D.green }}>
              <Percent size={8} />{p.discountTiers.length} mức CK
            </span>
          )}
          {hasSizes && minPrice !== maxPrice && (
            <span className="text-[9px] ml-auto" style={{ color: D.textMuted }}>
              đến {formatVND(maxPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Product Row (List) ───────────────────────────────────────────────────────
function ProductRow({ product: p, isSelected, onSelect, onEdit, onToggleActive, onDelete }: {
  product: CrmProduct; isSelected: boolean;
  onSelect: () => void; onEdit: () => void; onToggleActive: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cat = CATEGORY_MAP[p.category];
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all"
      style={{
        background: isSelected ? D.goldDim : hovered ? D.cardBgHover : D.cardBg,
        border: `1px solid ${isSelected ? D.borderGold : hovered ? D.borderHover : D.border}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: D.surfaceBg }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl opacity-30">{cat.icon}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate" style={{ color: D.textPrimary }}>{p.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
            style={{ background: cat.dim, color: cat.color }}>{cat.label}</span>
          {!p.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: D.surfaceBg, color: D.textMuted }}>Ẩn</span>}
        </div>
        <div className="text-xs mt-0.5" style={{ color: D.textMuted }}>
          {p.sku} · {Object.keys(p.specs).length} thông số · {p.discountTiers.length} mức CK
          {p.sizePricings && p.sizePricings.length > 0 && ` · ${p.sizePricings.length} kích thước`}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {p.sizePricings && p.sizePricings.length > 0 ? (
          <div>
            <div className="font-black text-sm" style={{ color: D.gold }}>
              {formatVND(Math.min(...p.sizePricings.map(s => s.price)))}
              {Math.min(...p.sizePricings.map(s => s.price)) !== Math.max(...p.sizePricings.map(s => s.price)) &&
                ` – ${formatVND(Math.max(...p.sizePricings.map(s => s.price)))}`}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: D.textMuted }}>theo kích thước</div>
          </div>
        ) : (
          <div>
            <div className="font-black text-sm" style={{ color: D.gold }}>{formatVND(p.basePrice)}</div>
            {p.discountTiers.length > 0 && (
              <div className="text-[10px] mt-0.5" style={{ color: D.textMuted }}>
                CK -{Math.min(...p.discountTiers.map(t => t.discountPct))}~{Math.max(...p.discountTiers.map(t => t.discountPct))}%
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} className="p-1.5 rounded-lg transition-colors"
          style={{ color: D.textSecondary }}
          onMouseEnter={e => (e.currentTarget.style.background = D.surfaceBg)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <Edit3 size={13} />
        </button>
        <button onClick={onToggleActive} className="p-1.5 rounded-lg transition-colors"
          style={{ color: p.isActive ? D.textMuted : D.green }}
          onMouseEnter={e => (e.currentTarget.style.background = D.surfaceBg)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          {p.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg transition-colors"
          style={{ color: D.red }}
          onMouseEnter={e => (e.currentTarget.style.background = D.redDim)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
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
    <div style={{ background: D.cardBg, borderRadius: 20, overflow: "hidden", width: "100%" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ background: D.surfaceBg, borderBottom: `1px solid ${D.border}` }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full font-bold"
            style={{ background: cat.dim, color: cat.color, border: `1px solid ${cat.color}33` }}>
            {cat.icon} {cat.label}
          </span>
          {!p.isActive && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: D.surfaceBg, color: D.textMuted, border: `1px solid ${D.border}` }}>Ẩn</span>
          )}
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md"
            style={{ background: D.surfaceBg, color: D.textMuted, border: `1px solid ${D.border}` }}>{p.sku}</span>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ background: D.surfaceBg, color: D.textMuted, border: `1px solid ${D.border}` }}
          onMouseEnter={e => (e.currentTarget.style.background = D.border)}
          onMouseLeave={e => (e.currentTarget.style.background = D.surfaceBg)}>
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="flex">
        {/* Left: image */}
        <div className="flex-shrink-0 relative" style={{ width: 340, height: 340, background: D.surfaceBg }}>
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: "12px" }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl opacity-10">{cat.icon}</span>
            </div>
          )}
          {/* Price overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-4"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              {hasSizes && selectedSize ? selectedSize.label : "Giá bán"}
            </div>
            <div className="text-2xl font-black" style={{ color: D.gold, textShadow: `0 0 20px rgba(201,168,76,0.5)` }}>
              {formatVND(displayPrice)}
            </div>
          </div>
        </div>

        {/* Right: info */}
        <div className="flex-1 flex flex-col overflow-y-auto" style={{ minWidth: 0, maxHeight: 500 }}>
          {/* Name */}
          <div className="px-5 pt-4 pb-4" style={{ borderBottom: `1px solid ${D.border}` }}>
            <h2 className="text-base font-black leading-snug" style={{ color: D.textPrimary }}>{p.name}</h2>
            {p.description && (
              <p className="text-xs leading-relaxed mt-2" style={{ color: D.textSecondary }}>{p.description}</p>
            )}
          </div>

          {/* Size selector */}
          {hasSizes && (
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${D.border}` }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: D.textMuted }}>Kích thước &amp; Giá</div>
              <div className="grid grid-cols-2 gap-2">
                {p.sizePricings!.map((s, i) => {
                  const active = selectedSizeIdx === i;
                  return (
                    <button key={i} onClick={() => setSelectedSizeIdx(i)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left"
                      style={{
                        background: active ? D.goldDim : D.surfaceBg,
                        border: `1.5px solid ${active ? D.gold : D.border}`,
                        boxShadow: active ? D.goldGlow : "none",
                      }}>
                      <div className="text-[11px] font-bold" style={{ color: active ? D.textPrimary : D.textSecondary }}>{s.label}</div>
                      <div className="text-xs font-black" style={{ color: D.gold }}>{formatVND(s.price)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Discount tiers */}
          {p.discountTiers.length > 0 && (
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${D.border}` }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: D.textMuted }}>Chiết khấu số lượng</div>
              <div className="grid grid-cols-3 gap-2">
                {p.discountTiers.map((tier, i) => (
                  <div key={i} className="flex flex-col items-center py-2.5 px-2 rounded-xl"
                    style={{ background: D.goldDim, border: `1px solid ${D.borderGold}` }}>
                    <div className="text-[10px]" style={{ color: D.textMuted }}>≥{tier.minQty} bộ</div>
                    <div className="text-sm font-black mt-0.5" style={{ color: D.gold }}>-{tier.discountPct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specs */}
          {hasSpecs && (
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${D.border}` }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: D.textMuted }}>Thông số kỹ thuật</div>
              <div className="space-y-1.5">
                {Object.entries(p.specs).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: D.surfaceBg }}>
                    <span className="text-xs" style={{ color: D.textSecondary }}>{k}</span>
                    <span className="text-xs font-bold" style={{ color: D.textPrimary }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <div className="px-5 py-4 flex gap-2.5" style={{ borderTop: `1px solid ${D.border}` }}>
            <button onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ border: `1px solid ${D.border}`, color: D.textSecondary, background: D.surfaceBg }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = D.borderHover)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = D.border)}>
              <Edit3 size={14} /> Chỉnh sửa
            </button>
            <Link href="/crm/quotes/new"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: `linear-gradient(135deg, ${D.gold}, #A8893C)`,
                color: "#0D0D0F",
                boxShadow: `0 4px 14px rgba(201,168,76,0.35)`,
              }}
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
  const [activeTab, setActiveTab] = useState<"basic" | "images" | "specs" | "discount" | "size">("basic");
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
  const [uploadingExtraImage, setUploadingExtraImage] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState({
    imageSpec: product?.imageSpec || "",
    imageAngle1: product?.imageAngle1 || "",
    imageAngle2: product?.imageAngle2 || "",
    imageScene: product?.imageScene || "",
  });
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    product ? Object.entries(product.specs).map(([key, value]) => ({ key, value })) : [{ key: "", value: "" }]
  );
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

  async function handleExtraImageUpload(key: keyof typeof extraImages, file: File) {
    setUploadingExtraImage(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/crm/facebook-scheduler/upload-image", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setExtraImages(prev => ({ ...prev, [key]: url }));
      }
    } finally { setUploadingExtraImage(null); }
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
      const finalTiers = usingDefaultTiers ? [] : tiers.filter(t => t.minQty > 0);
      const body: CrmProduct = {
        id: product?.id || crypto.randomUUID(),
        name: form.name,
        sku: form.sku,
        category: form.category,
        description: form.description,
        imageUrl: form.imageUrl,
        imageSpec: extraImages.imageSpec || undefined,
        imageAngle1: extraImages.imageAngle1 || undefined,
        imageAngle2: extraImages.imageAngle2 || undefined,
        imageScene: extraImages.imageScene || undefined,
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

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none transition-all";
  const inputStyle = {
    borderColor: D.border,
    color: D.textPrimary,
    background: D.surfaceBg,
  };
  const inputFocus = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = D.gold),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = D.border),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          background: D.cardBg,
          border: `1px solid ${D.border}`,
          boxShadow: `0 25px 80px rgba(0,0,0,0.7)`,
        }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${D.border}`, background: D.surfaceBg }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: D.goldDim, border: `1px solid ${D.borderGold}` }}>
              <Package size={16} style={{ color: D.gold }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: D.textPrimary }}>
                {isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </h2>
              {isEdit && <p className="text-xs" style={{ color: D.textMuted }}>{product.sku}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors"
            style={{ color: D.textMuted }}
            onMouseEnter={e => (e.currentTarget.style.background = D.border)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-3 gap-1 flex-shrink-0 flex-wrap"
          style={{ borderBottom: `1px solid ${D.border}` }}>
          {([
            ["basic", "Thông tin cơ bản"],
            ["images", `Ảnh (${[form.imageUrl, extraImages.imageSpec, extraImages.imageAngle1, extraImages.imageAngle2, extraImages.imageScene].filter(Boolean).length}/5)`],
            ["specs", `Thông số (${specs.filter(s => s.key).length})`],
            ["discount", usingDefaultTiers ? "Chiết khấu (mặc định)" : `Chiết khấu (${tiers.filter(t => t.minQty > 0).length})`],
            ["size", `Kích thước (${sizePricings.filter(s => s.size.trim()).length})`],
          ] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all relative"
              style={{
                color: activeTab === tab ? D.gold : D.textMuted,
                borderBottom: activeTab === tab ? `2px solid ${D.gold}` : "2px solid transparent",
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
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: D.textSecondary }}>Tên sản phẩm *</label>
                  <input value={form.name} onChange={e => setF("name", e.target.value)} required
                    className={inputCls} style={inputStyle} {...inputFocus} placeholder="SmartFurni Pro Max" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: D.textSecondary }}>SKU</label>
                  <input value={form.sku} onChange={e => setF("sku", e.target.value)}
                    className={inputCls} style={inputStyle} {...inputFocus} placeholder="SF-PRO-MAX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: D.textSecondary }}>Danh mục</label>
                  <select value={form.category} onChange={e => setF("category", e.target.value)}
                    className={inputCls} style={{ ...inputStyle, appearance: "none" }} {...inputFocus}>
                    <option value="ergonomic_bed">🛏️ Giường công thái học</option>
                    <option value="sofa_bed">🛋️ Sofa giường</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: D.textSecondary }}>Giá gốc (VND)</label>
                  <input type="number" value={form.basePrice} onChange={e => setF("basePrice", e.target.value)}
                    className={inputCls} style={inputStyle} {...inputFocus} placeholder="28900000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: D.textSecondary }}>Ảnh sản phẩm</label>
                <label className="flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
                  style={{ borderColor: D.borderGold, background: D.goldDim }}>
                  {uploadingImage ? (
                    <Loader2 size={20} className="animate-spin" style={{ color: D.gold }} />
                  ) : form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <Upload size={20} style={{ color: D.gold }} />
                      <span className="text-xs font-semibold" style={{ color: D.gold }}>Nhấn để chọn ảnh từ máy tính</span>
                      <span className="text-[10px]" style={{ color: D.textMuted }}>JPG, PNG, WEBP · Tối đa 10MB</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </label>
                <div className="mt-2">
                  <input value={form.imageUrl} onChange={e => setF("imageUrl", e.target.value)}
                    className={inputCls} style={inputStyle} {...inputFocus} placeholder="Hoặc dán URL ảnh..." />
                </div>
                {form.imageUrl && (
                  <button type="button" onClick={() => setF("imageUrl", "")}
                    className="mt-1 text-xs flex items-center gap-1 hover:opacity-70"
                    style={{ color: D.red }}>
                    <X size={11} /> Xóa ảnh
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: D.textSecondary }}>Mô tả sản phẩm</label>
                <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={3}
                  className={inputCls} style={{ ...inputStyle, resize: "none" } as React.CSSProperties}
                  {...inputFocus}
                  placeholder="Mô tả ngắn về sản phẩm, tính năng nổi bật..." />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: D.surfaceBg, border: `1px solid ${D.border}` }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: D.textPrimary }}>Hiển thị sản phẩm</div>
                  <div className="text-xs mt-0.5" style={{ color: D.textMuted }}>Sản phẩm sẽ xuất hiện trong báo giá</div>
                </div>
                <button type="button" onClick={() => setF("isActive", !form.isActive)}
                  className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
                  style={{ background: form.isActive ? D.green : D.border }}>
                  <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                    style={{ left: form.isActive ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </div>
            </div>
          )}

          {activeTab === "images" && (
            <div className="space-y-4">
              <p className="text-xs" style={{ color: D.textMuted }}>Mỗi sản phẩm có 5 ảnh: đại diện, thông số kỹ thuật, 2 góc chụp, phối cảnh. Ảnh tỉ lệ 1:1, căn giữa.</p>
              {([
                { key: "imageUrl" as const, label: "🖼️ Ảnh đại diện", desc: "Ảnh chính hiển thị trong danh sách và catalogue", isMain: true },
                { key: "imageSpec" as const, label: "📐 Ảnh thông số kỹ thuật", desc: "Ảnh kích thước, sơ đồ cơ chế hoạt động" },
                { key: "imageAngle1" as const, label: "📷 Góc chụp 1", desc: "Góc nhìn chính diện hoặc 3/4" },
                { key: "imageAngle2" as const, label: "📷 Góc chụp 2", desc: "Góc nhìn khác (phía sau, cận cảnh chi tiết)" },
                { key: "imageScene" as const, label: "🏠 Ảnh phối cảnh", desc: "Sản phẩm trong không gian thực tế" },
              ]).map(({ key, label, desc, isMain }) => {
                const isMainKey = isMain;
                const currentUrl = isMainKey ? form.imageUrl : extraImages[key as keyof typeof extraImages];
                const isUploading = isMainKey ? uploadingImage : uploadingExtraImage === key;
                return (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: D.textSecondary }}>{label}</label>
                    <p className="text-[10px] mb-2" style={{ color: D.textMuted }}>{desc}</p>
                    <div className="flex gap-3 items-start">
                      {/* Square preview */}
                      <label className="flex-shrink-0 cursor-pointer relative rounded-xl overflow-hidden border-2 border-dashed transition-all hover:opacity-80"
                        style={{ width: 80, height: 80, borderColor: currentUrl ? D.borderGold : D.border, background: currentUrl ? "transparent" : D.surfaceBg }}>
                        {isUploading ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 size={16} className="animate-spin" style={{ color: D.gold }} />
                          </div>
                        ) : currentUrl ? (
                          <img src={currentUrl} alt="" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                            <Upload size={14} style={{ color: D.textMuted }} />
                            <span className="text-[9px]" style={{ color: D.textMuted }}>Tải lên</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (isMainKey) handleImageUpload(f);
                          else handleExtraImageUpload(key as keyof typeof extraImages, f);
                        }} />
                      </label>
                      {/* URL input */}
                      <div className="flex-1 space-y-1.5">
                        <input
                          value={currentUrl}
                          onChange={e => {
                            if (isMainKey) setF("imageUrl", e.target.value);
                            else setExtraImages(prev => ({ ...prev, [key]: e.target.value }));
                          }}
                          className={inputCls} style={inputStyle} {...inputFocus}
                          placeholder="Dán URL ảnh hoặc click ô vuông để upload..."
                        />
                        {currentUrl && (
                          <button type="button"
                            onClick={() => {
                              if (isMainKey) setF("imageUrl", "");
                              else setExtraImages(prev => ({ ...prev, [key]: "" }));
                            }}
                            className="text-[10px] flex items-center gap-1 hover:opacity-70"
                            style={{ color: D.red }}>
                            <X size={10} /> Xóa ảnh
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "specs" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: D.textMuted }}>Thêm thông số kỹ thuật cho sản phẩm</p>
                <button type="button" onClick={addSpec}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: D.goldDim, color: D.gold, border: `1px solid ${D.borderGold}` }}>
                  <Plus size={12} /> Thêm dòng
                </button>
              </div>
              {specs.map((spec, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={spec.key} onChange={e => updateSpec(i, "key", e.target.value)}
                    className={inputCls} style={inputStyle} {...inputFocus} placeholder="Tên thông số (vd: Kích thước)" />
                  <span style={{ color: D.textMuted }}>:</span>
                  <input value={spec.value} onChange={e => updateSpec(i, "value", e.target.value)}
                    className={inputCls} style={inputStyle} {...inputFocus} placeholder="Giá trị (vd: 160x200cm)" />
                  <button type="button" onClick={() => removeSpec(i)}
                    className="p-2 rounded-lg flex-shrink-0 transition-colors"
                    style={{ color: D.red }}
                    onMouseEnter={e => (e.currentTarget.style.background = D.redDim)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <X size={13} />
                  </button>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: D.textMuted }}>Gợi ý nhanh</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Kích thước", "Tải trọng", "Chất liệu", "Màu sắc", "Bảo hành", "Xuất xứ"].map(preset => (
                    <button key={preset} type="button"
                      onClick={() => setSpecs(prev => [...prev.filter(s => s.key), { key: preset, value: "" }])}
                      className="px-2.5 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                      style={{ background: D.indigoDim, color: D.indigo }}>
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "discount" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl flex items-start gap-3"
                style={{
                  background: usingDefaultTiers ? "rgba(52,211,153,0.08)" : D.goldDim,
                  border: `1px solid ${usingDefaultTiers ? "rgba(52,211,153,0.3)" : D.borderGold}`,
                }}>
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ color: usingDefaultTiers ? D.green : D.gold }}>
                    {usingDefaultTiers ? "✅ Đang dùng chiết khấu chung" : "⚡ Chiết khấu riêng cho sản phẩm này"}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: usingDefaultTiers ? "rgba(52,211,153,0.7)" : D.textSecondary }}>
                    {usingDefaultTiers
                      ? `Áp dụng ${defaultTiers.length} bậc từ Cài đặt CRM. Xóa để tùy chỉnh riêng.`
                      : "Chiết khấu này sẽ ghi đè lên cài đặt chung."}
                  </p>
                  {usingDefaultTiers && defaultTiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {defaultTiers.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: "rgba(52,211,153,0.15)", color: D.green }}>
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
                  style={{
                    background: D.surfaceBg,
                    color: D.textSecondary,
                    border: `1px solid ${D.border}`,
                  }}>
                  {usingDefaultTiers ? "Tùy chỉnh riêng" : "Dùng mặc định"}
                </button>
              </div>

              {!usingDefaultTiers && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: D.textMuted }}>Chính sách chiết khấu theo số lượng (B2B)</p>
                    <button type="button" onClick={addTier}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: D.goldDim, color: D.gold, border: `1px solid ${D.borderGold}` }}>
                      <Plus size={12} /> Thêm mức
                    </button>
                  </div>
                  {tiers.map((tier, i) => (
                    <div key={i} className="p-3 rounded-xl space-y-2"
                      style={{ background: D.surfaceBg, border: `1px solid ${D.border}` }}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-semibold mb-1" style={{ color: D.textMuted }}>Số lượng tối thiểu</label>
                          <input type="number" value={tier.minQty} onChange={e => updateTier(i, "minQty", e.target.value)}
                            className={inputCls} style={inputStyle} {...inputFocus} placeholder="5" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-semibold mb-1" style={{ color: D.textMuted }}>Chiết khấu (%)</label>
                          <input type="number" value={tier.discountPct} onChange={e => updateTier(i, "discountPct", e.target.value)}
                            className={inputCls} style={inputStyle} {...inputFocus} placeholder="10" min="0" max="100" />
                        </div>
                        <button type="button" onClick={() => removeTier(i)}
                          className="p-2 rounded-lg mt-5 flex-shrink-0 transition-colors"
                          style={{ color: D.red }}
                          onMouseEnter={e => (e.currentTarget.style.background = D.redDim)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <X size={13} />
                        </button>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: D.textMuted }}>Nhãn hiển thị</label>
                        <input value={tier.label} onChange={e => updateTier(i, "label", e.target.value)}
                          className={inputCls} style={inputStyle} {...inputFocus} placeholder="≥5 bộ: -10%" />
                      </div>
                      {tier.minQty > 0 && tier.discountPct > 0 && form.basePrice && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px]" style={{ color: D.textMuted }}>Giá sau CK:</span>
                          <span className="text-xs font-bold" style={{ color: D.gold }}>
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
                  <p className="text-xs font-semibold" style={{ color: D.textSecondary }}>Giá theo kích thước</p>
                  <p className="text-[10px] mt-0.5" style={{ color: D.textMuted }}>Mỗi kích thước có giá riêng.</p>
                </div>
                <button type="button" onClick={addSizePricing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                  style={{ background: D.goldDim, color: D.gold, border: `1px solid ${D.borderGold}` }}>
                  <Plus size={12} /> Thêm kích thước
                </button>
              </div>
              {sizePricings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: D.textMuted }}>
                  <Ruler size={28} style={{ opacity: 0.3 }} />
                  <p className="text-xs">Chưa có kích thước nào. Nhấn "Thêm kích thước" để bắt đầu.</p>
                </div>
              )}
              {sizePricings.map((sp, i) => (
                <div key={i} className="p-3 rounded-xl space-y-2"
                  style={{ background: D.surfaceBg, border: `1px solid ${D.border}` }}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: D.textMuted }}>Kích thước</label>
                      <input value={sp.size} onChange={e => updateSizePricing(i, "size", e.target.value)}
                        className={inputCls} style={inputStyle} {...inputFocus} placeholder="VD: 1.2x2m" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: D.textMuted }}>Giá (VND)</label>
                      <input type="number" value={sp.price || ""} onChange={e => updateSizePricing(i, "price", e.target.value)}
                        className={inputCls} style={inputStyle} {...inputFocus} placeholder="28900000" />
                    </div>
                    <button type="button" onClick={() => removeSizePricing(i)}
                      className="p-2 rounded-lg mt-5 flex-shrink-0 transition-colors"
                      style={{ color: D.red }}
                      onMouseEnter={e => (e.currentTarget.style.background = D.redDim)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <X size={13} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: D.textMuted }}>Nhãn hiển thị (tùy chọn)</label>
                    <input value={sp.label} onChange={e => updateSizePricing(i, "label", e.target.value)}
                      className={inputCls} style={inputStyle} {...inputFocus} placeholder="VD: 1.2m x 2m (Standard)" />
                  </div>
                  {sp.price > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px]" style={{ color: D.textMuted }}>Giá:</span>
                      <span className="text-xs font-bold" style={{ color: D.gold }}>{formatVND(sp.price)}</span>
                    </div>
                  )}
                </div>
              ))}
              {sizePricings.length === 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: D.textMuted }}>Gợi ý nhanh</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["1.2x2m", "1.4x2m", "1.6x2m", "1.8x2m", "2x2m", "1.2x2.2m", "1.6x2.2m", "1.8x2.2m"].map(size => (
                      <button key={size} type="button"
                        onClick={() => setSizePricings(prev => [...prev, { size, price: 0, label: size }])}
                        className="px-2.5 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                        style={{ background: D.blueDim, color: D.blue }}>
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
        <div className="flex gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: `1px solid ${D.border}`, background: D.surfaceBg }}>
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
            style={{ border: `1px solid ${D.border}`, color: D.textSecondary, background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.background = D.border)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            Hủy
          </button>
          <button
            onClick={submit as unknown as React.MouseEventHandler}
            disabled={loading || !form.name}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${D.gold}, #A8893C)`,
              color: "#0D0D0F",
              boxShadow: `0 4px 14px rgba(201,168,76,0.35)`,
            }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm sản phẩm"}
          </button>
        </div>
      </div>
    </div>
  );
}
