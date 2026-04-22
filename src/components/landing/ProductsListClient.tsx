"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import type { Product, ProductCategory } from "@/lib/product-store";
import type { SiteTheme } from "@/lib/theme-types";
import { ScrollReveal, StaggerReveal } from "./ScrollReveal";

interface Props {
  products: Product[];
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

const CATEGORIES: { key: ProductCategory | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "standard", label: "Standard" },
  { key: "premium", label: "Premium" },
  { key: "elite", label: "Elite" },
  { key: "accessory", label: "Phụ kiện" },
];

const SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "price_asc", label: "Giá tăng dần" },
  { key: "price_desc", label: "Giá giảm dần" },
  { key: "rating", label: "Đánh giá cao nhất" },
  { key: "bestseller", label: "Bán chạy nhất" },
];

function ProductCardSkeleton({ colors }: { colors: { surface: string; border: string } }) {
  return (
    <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border overflow-hidden flex flex-col animate-pulse">
      <div style={{ backgroundColor: `${colors.border}` }} className="h-[200px] w-full" />
      <div className="p-4 flex flex-col gap-3">
        <div style={{ backgroundColor: colors.border }} className="h-3 w-16 rounded-full" />
        <div style={{ backgroundColor: colors.border }} className="h-4 w-3/4 rounded-full" />
        <div style={{ backgroundColor: colors.border }} className="h-3 w-1/2 rounded-full" />
        <div style={{ backgroundColor: colors.border }} className="h-6 w-24 rounded-full mt-2" />
        <div style={{ backgroundColor: colors.border }} className="h-8 w-full rounded-lg mt-1" />
      </div>
    </div>
  );
}

// ─── Product Card with auto-slideshow ────────────────────────────────────────
interface CardProps {
  product: Product;
  disc: number;
  isComingSoon: boolean;
  isOutOfStock: boolean;
  colors: SiteTheme["colors"];
  compareList: string[];
  onToggleCompare: (e: React.MouseEvent, id: string) => void;
}

function ProductCard({ product: p, disc, isComingSoon, isOutOfStock, colors, compareList, onToggleCompare }: CardProps) {
  const allImages = p.images && p.images.length > 0
    ? p.images
    : p.coverImage ? [p.coverImage] : [];
  const [imgIdx, setImgIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startSlideshow() {
    if (allImages.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setImgIdx((i) => (i + 1) % allImages.length);
    }, 1500);
  }

  function stopSlideshow() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setImgIdx(0);
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const currentImage = allImages[imgIdx] || null;

  return (
    <Link
      href={`/products/${p.slug}`}
      style={{ backgroundColor: "#221D00", borderColor: "#2E2800" }}
      className="rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
      onMouseEnter={startSlideshow}
      onMouseLeave={stopSlideshow}
    >
      {/* Image with auto-slideshow */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`,
          height: 200,
          position: "relative",
        }}
        className="flex items-center justify-center overflow-hidden"
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={p.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        ) : (
          <svg viewBox="0 0 200 130" width="160" height="104" fill="none">
            <rect x="20" y="65" width="160" height="50" rx="6"
              fill={`${colors.primary}12`} stroke={`${colors.primary}35`} strokeWidth="1.5" />
            <rect x="26" y="52" width="148" height="56" rx="8"
              fill={`${colors.primary}18`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
            <rect x="32" y="42" width="48" height="26" rx="10"
              fill={`${colors.primary}25`} stroke={`${colors.primary}45`} strokeWidth="1" />
            <rect x="90" y="42" width="48" height="26" rx="10"
              fill={`${colors.primary}25`} stroke={`${colors.primary}45`} strokeWidth="1" />
            <rect x="12" y="28" width="18" height="62" rx="4"
              fill={`${colors.primary}20`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
            <rect x="12" y="88" width="176" height="4" rx="2"
              fill={colors.primary} opacity="0.6" />
            <rect x="26" y="112" width="12" height="16" rx="3"
              fill={`${colors.primary}25`} stroke={`${colors.primary}35`} strokeWidth="1" />
            <rect x="162" y="112" width="12" height="16" rx="3"
              fill={`${colors.primary}25`} stroke={`${colors.primary}35`} strokeWidth="1" />
          </svg>
        )}

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {p.isFeatured && (
            <span
              style={{ backgroundColor: `${colors.primary}ee`, color: colors.background }}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
            >
              ⭐ Nổi bật
            </span>
          )}
          {disc > 0 && (
            <span
              style={{ backgroundColor: `${colors.error}ee`, color: "#fff" }}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
            >
              -{disc}%
            </span>
          )}
          {isComingSoon && (
            <span
              style={{ backgroundColor: `${colors.warning}ee`, color: "#000" }}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
            >
              Sắp ra mắt
            </span>
          )}
          {isOutOfStock && (
            <span
              style={{ backgroundColor: `${colors.error}ee`, color: "#fff" }}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
            >
              Hết hàng
            </span>
          )}
        </div>

        {/* Slideshow dots indicator */}
        {allImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {allImages.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === imgIdx ? 14 : 6,
                  height: 6,
                  backgroundColor: i === imgIdx ? colors.primary : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[#C9A84C]/70">
          {p.category === "standard" ? "Standard" : p.category === "premium" ? "Premium" : p.category === "elite" ? "Elite" : "Phụ kiện"}
        </p>
        <h3 className="text-sm font-semibold text-[#F5EDD6] leading-snug" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.6em" }}>
          {p.name}
        </h3>

        {/* Rating */}
        {p.reviewCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path
                    d="M5.5 1L6.8 3.9L10 4.3L7.8 6.4L8.4 9.6L5.5 8L2.6 9.6L3.2 6.4L1 4.3L4.2 3.9L5.5 1Z"
                    fill={s <= Math.round(p.rating) ? colors.primary : "transparent"}
                    stroke={s <= Math.round(p.rating) ? colors.primary : `${colors.primary}30`}
                    strokeWidth="0.7"
                  />
                </svg>
              ))}
            </div>
            <span style={{ color: `${colors.text}60` }} className="text-xs">{p.rating.toFixed(1)} ({p.reviewCount})</span>
          </div>
        )}

        {/* Top feature */}
        {p.features[0] && (
          <p className="text-xs text-[#F5EDD6]/40 line-clamp-1">
            ✓ {p.features[0]}
          </p>
        )}

        {/* Price */}
        <div className="mt-auto pt-2 flex items-baseline gap-2">
          <span style={{ color: colors.primary }} className="text-base font-bold">
            {formatPrice(p.price)}
          </span>
          {p.originalPrice > p.price && (
            <span style={{ color: `${colors.text}35` }} className="text-xs line-through">
              {formatPrice(p.originalPrice)}
            </span>
          )}
        </div>

        {/* CTA */}
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            color: colors.background,
          }}
          className="w-full py-2 rounded-lg text-xs font-semibold text-center mt-1 group-hover:opacity-90 transition-opacity"
        >
          {isComingSoon ? "Đặt trước" : isOutOfStock ? "Hết hàng" : "Xem chi tiết"}
        </div>
        {p.category !== "accessory" && (
          <button
            onClick={(e) => onToggleCompare(e, p.id)}
            style={compareList.includes(p.id)
              ? { backgroundColor: `${colors.primary}20`, color: colors.primary, borderColor: colors.primary }
              : { backgroundColor: "transparent", color: `${colors.text}40`, borderColor: colors.border }
            }
            className="w-full py-1.5 rounded-lg text-xs border transition-all duration-200 mt-1"
          >
            {compareList.includes(p.id) ? "✓ Đã chọn so sánh" : "+ So sánh"}
          </button>
        )}
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductsListClient({ products, theme }: Props) {
  const { colors, layout } = theme;
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">("all");
  const [sortKey, setSortKey] = useState("default");
  const [search, setSearch] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);

  const toggleCompare = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCompareList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeCategory !== "all") list = list.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (sortKey === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortKey === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sortKey === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sortKey === "bestseller") list.sort((a, b) => b.totalSold - a.totalSold);
    return list;
  }, [products, activeCategory, sortKey, search]);

  return (
    <div style={{ maxWidth: layout.maxWidth }} className="mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <circle cx="7" cy="7" r="5" stroke={`${colors.text}40`} strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke={`${colors.text}40`} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-1"
          />
        </div>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
          className="px-4 py-2.5 rounded-xl border text-sm outline-none cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            style={
              activeCategory === c.key
                ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }
                : { backgroundColor: colors.surface, color: `${colors.text}60`, borderColor: colors.border }
            }
            className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all duration-200"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p style={{ color: `${colors.text}40` }} className="text-xs mb-5">
        {filtered.length} sản phẩm
      </p>

      {/* Grid */}
      {!isLoaded ? (
        <StaggerReveal baseDelay={0} step={50} variant="fadeUp" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} colors={colors} />
          ))}
        </StaggerReveal>
      ) : filtered.length === 0 ? (
        <div
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          className="rounded-2xl border p-16 text-center"
        >
          <p style={{ color: `${colors.text}40` }} className="text-base">
            Không tìm thấy sản phẩm phù hợp.
          </p>
          <button
            onClick={() => { setSearch(""); setActiveCategory("all"); }}
            style={{ color: colors.primary }}
            className="text-sm mt-3 hover:opacity-70 transition-opacity"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <StaggerReveal baseDelay={0} step={60} variant="fadeUp" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((p) => {
            const disc = p.originalPrice > p.price
              ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
              : 0;
            const isComingSoon = p.status === "coming_soon";
            const isOutOfStock = p.status === "out_of_stock";

            return (
              <ProductCard
                key={p.id}
                product={p}
                disc={disc}
                isComingSoon={isComingSoon}
                isOutOfStock={isOutOfStock}
                colors={colors}
                compareList={compareList}
                onToggleCompare={toggleCompare}
              />
            );
          })}
        </StaggerReveal>
      )}

      {/* Compare floating bar */}
      {compareList.length >= 2 && (
        <div
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl whitespace-nowrap"
        >
          <span className="text-xs text-[#F5EDD6]/60">{compareList.length} sản phẩm đã chọn</span>
          <Link
            href="/products/compare"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            So sánh ngay →
          </Link>
          <button
            onClick={() => setCompareList([])}
            style={{ color: `${colors.text}40` }}
            className="text-xs hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
