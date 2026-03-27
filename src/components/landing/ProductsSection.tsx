"use client";
import { useState } from "react";
import Link from "next/link";
import type { Product, ProductCategory } from "@/lib/product-store";
import type { SiteTheme } from "@/lib/theme-types";
import type { HomepageProductConfig } from "@/lib/homepage-products-store";

interface ProductsSectionProps {
  products: Product[];
  theme: SiteTheme;
  config?: HomepageProductConfig;
}

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  standard: "Standard",
  premium: "Premium",
  elite: "Elite",
  accessory: "Phụ kiện",
};

const STATUS_CONFIG = {
  active: { label: "Đang bán", color: "success" },
  out_of_stock: { label: "Hết hàng", color: "error" },
  coming_soon: { label: "Sắp ra mắt", color: "warning" },
  discontinued: { label: "Ngừng SX", color: "muted" },
};

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu`;
  return price.toLocaleString("vi-VN") + " đ";
}

function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 1L7.35 4.22L10.9 4.64L8.45 6.97L9.09 10.5L6 8.77L2.91 10.5L3.55 6.97L1.1 4.64L4.65 4.22L6 1Z"
            fill={s <= Math.round(rating) ? color : "transparent"}
            stroke={s <= Math.round(rating) ? color : `${color}50`}
            strokeWidth="0.8"
          />
        </svg>
      ))}
      <span className="text-xs ml-1" style={{ color: `${color}80` }}>
        ({rating.toFixed(1)})
      </span>
    </div>
  );
}

function ProductCard({ product, theme }: { product: Product; theme: SiteTheme }) {
  const [hovered, setHovered] = useState(false);
  const { colors } = theme;
  const isAvailableLink = product.status !== "discontinued";
  const discount =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;
  const statusCfg = STATUS_CONFIG[product.status];
  const isAvailable = product.status === "active";
  const isComingSoon = product.status === "coming_soon";

  return (
    <Link
      href={isAvailableLink ? `/products/${product.slug}` : "#"}
      style={{ display: "block", textDecoration: "none" }}
    >
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: colors.surface,
        borderColor: hovered ? colors.primary : colors.border,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 16px 40px ${colors.primary}20, 0 4px 12px rgba(0,0,0,0.3)`
          : "0 2px 8px rgba(0,0,0,0.2)",
        transition: "all 0.3s ease",
      }}
      className="rounded-2xl border overflow-hidden flex flex-col"
    >
      {/* Image area */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`,
          height: 220,
        }}
      >
        {product.coverImage ? (
          <img
            src={product.coverImage}
            alt={product.name}
            className="w-full h-full object-cover"
            style={{ opacity: isAvailable || isComingSoon ? 1 : 0.5 }}
          />
        ) : (
          /* Placeholder SVG giường */
          <div className="w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 200 140" width="160" height="112" fill="none">
              {/* Bed frame */}
              <rect x="20" y="70" width="160" height="50" rx="6"
                fill={`${colors.primary}15`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
              {/* Mattress */}
              <rect x="25" y="55" width="150" height="55" rx="8"
                fill={`${colors.primary}20`} stroke={`${colors.primary}50`} strokeWidth="1.5" />
              {/* Pillow */}
              <rect x="30" y="45" width="50" height="25" rx="10"
                fill={`${colors.primary}30`} stroke={`${colors.primary}60`} strokeWidth="1.5" />
              {/* Headboard */}
              <rect x="15" y="30" width="20" height="60" rx="4"
                fill={`${colors.primary}25`} stroke={`${colors.primary}50`} strokeWidth="1.5" />
              {/* LED strip */}
              <rect x="15" y="88" width="170" height="4" rx="2"
                fill={hovered ? colors.primary : `${colors.primary}60`}
                style={{ transition: "fill 0.3s" }} />
              {/* Legs */}
              <rect x="25" y="118" width="10" height="16" rx="3"
                fill={`${colors.primary}30`} stroke={`${colors.primary}40`} strokeWidth="1" />
              <rect x="165" y="118" width="10" height="16" rx="3"
                fill={`${colors.primary}30`} stroke={`${colors.primary}40`} strokeWidth="1" />
              {/* Smart icon */}
              <circle cx="155" cy="65" r="10"
                fill={`${colors.primary}20`} stroke={`${colors.primary}50`} strokeWidth="1" />
              <path d="M151 65 L154 68 L159 62" stroke={colors.primary} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isFeatured && (
            <span
              style={{ backgroundColor: colors.primary, color: colors.background }}
              className="text-xs font-bold px-2 py-0.5 rounded-full"
            >
              Nổi bật
            </span>
          )}
          {discount > 0 && (
            <span
              style={{ backgroundColor: colors.error, color: "#fff" }}
              className="text-xs font-bold px-2 py-0.5 rounded-full"
            >
              -{discount}%
            </span>
          )}
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span
            style={{
              backgroundColor:
                product.status === "active" ? `${colors.success}20` :
                product.status === "coming_soon" ? `${colors.warning}20` :
                `${colors.error}20`,
              color:
                product.status === "active" ? colors.success :
                product.status === "coming_soon" ? colors.warning :
                colors.error,
              borderColor:
                product.status === "active" ? `${colors.success}40` :
                product.status === "coming_soon" ? `${colors.warning}40` :
                `${colors.error}40`,
            }}
            className="text-xs px-2 py-0.5 rounded-full border"
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Category tag */}
        <div className="absolute bottom-3 left-3">
          <span
            style={{ backgroundColor: `${colors.primary}20`, color: colors.primary, borderColor: `${colors.primary}30` }}
            className="text-xs px-2 py-0.5 rounded-full border font-medium"
          >
            {CATEGORY_LABELS[product.category]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div>
          <h3 style={{ color: colors.text }} className="font-semibold text-base leading-snug">
            {product.name}
          </h3>
          <p style={{ color: `${colors.text}60` }} className="text-sm mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Rating */}
        {product.reviewCount > 0 && (
          <StarRating rating={product.rating} color={colors.primary} />
        )}

        {/* Features highlights */}
        {product.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.features.slice(0, 3).map((f, i) => (
              <span
                key={i}
                style={{ backgroundColor: `${colors.primary}10`, color: `${colors.text}70`, borderColor: `${colors.border}` }}
                className="text-xs px-2 py-0.5 rounded-full border"
              >
                {f.length > 20 ? f.slice(0, 20) + "…" : f}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span style={{ color: colors.primary }} className="text-xl font-bold">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <span style={{ color: `${colors.text}40` }} className="text-sm line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          {/* CTA button */}
          <button
            disabled={!isAvailable && !isComingSoon}
            style={
              isAvailable
                ? {
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                    color: colors.background,
                  }
                : isComingSoon
                ? { backgroundColor: `${colors.warning}20`, color: colors.warning, border: `1px solid ${colors.warning}40` }
                : { backgroundColor: `${colors.border}`, color: `${colors.text}40`, cursor: "not-allowed" }
            }
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          >
            {isAvailable ? "Xem chi tiết" : isComingSoon ? "Đặt trước" : statusCfg.label}
          </button>
        </div>
      </div>
    </div>
    </Link>
  );
}

export default function ProductsSection({ products, theme, config }: ProductsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | ProductCategory>("all");
  const { colors, layout } = theme;

  // Dùng config nếu có
  const sectionTitle = config?.sectionTitle || "Dòng Giường Thông Minh";
  const sectionSubtitle = config?.sectionSubtitle || "Từ dòng phổ thông đến cao cấp, SmartFurni mang đến giải pháp giấc ngủ hoàn hảo cho mọi nhu cầu.";
  const showCategoryFilter = config?.showCategoryFilter !== false;
  const showCta = config?.showCta !== false;
  const ctaText = config?.ctaText || "Trải nghiệm Dashboard điều khiển";
  const ctaLink = config?.ctaLink || "/dashboard";

  const filters: { key: "all" | ProductCategory; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "standard", label: "Standard" },
    { key: "premium", label: "Premium" },
    { key: "elite", label: "Elite" },
    { key: "accessory", label: "Phụ kiện" },
  ];

  const visibleProducts = products.filter(
    (p) =>
      p.status !== "discontinued" &&
      (activeFilter === "all" || p.category === activeFilter)
  );

  if (products.length === 0) return null;

  return (
    <section
      id="products"
      style={{ backgroundColor: colors.background }}
      className="py-20 px-6"
    >
      <div style={{ maxWidth: layout.maxWidth }} className="mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div
            style={{ borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}0d` }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4"
          >
            <div style={{ backgroundColor: colors.primary }} className="w-2 h-2 rounded-full" />
            <span style={{ color: colors.primary }} className="text-xs font-medium tracking-wider uppercase">
              Sản phẩm của chúng tôi
            </span>
          </div>
          <h2 style={{ color: colors.text }} className="text-3xl md:text-4xl font-bold mb-3">
            {sectionTitle}
          </h2>
          <p style={{ color: `${colors.text}60` }} className="text-base max-w-xl mx-auto leading-relaxed">
            {sectionSubtitle}
          </p>
        </div>

        {/* Filter tabs */}
        {showCategoryFilter && <div className="flex flex-wrap justify-center gap-2 mb-10">
          {filters.map((f) => {
            const isActive = activeFilter === f.key;
            const count =
              f.key === "all"
                ? products.filter((p) => p.status !== "discontinued").length
                : products.filter((p) => p.category === f.key && p.status !== "discontinued").length;
            if (count === 0 && f.key !== "all") return null;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                style={
                  isActive
                    ? {
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                        color: colors.background,
                        borderColor: "transparent",
                      }
                    : {
                        backgroundColor: "transparent",
                        color: `${colors.text}70`,
                        borderColor: colors.border,
                      }
                }
                className="px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 hover:opacity-80"
              >
                {f.label}
                <span
                  style={{
                    backgroundColor: isActive ? `${colors.background}30` : `${colors.primary}15`,
                    color: isActive ? colors.background : colors.primary,
                  }}
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>}

        {/* Products grid */}
        {visibleProducts.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: `${colors.text}40` }} className="text-sm">
              Không có sản phẩm trong danh mục này.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} theme={theme} />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/products"
            style={{ borderColor: colors.primary, color: colors.primary }}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm border hover:opacity-80 transition-opacity"
          >
            Xem tất cả sản phẩm
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {showCta && (
            <Link
              href={ctaLink}
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                color: colors.background,
              }}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {ctaText}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
