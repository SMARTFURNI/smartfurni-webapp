"use client";
import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/product-store";
import type { SiteTheme } from "@/lib/theme-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu`;
  return price.toLocaleString("vi-VN") + " đ";
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, theme, index }: { product: Product; theme: SiteTheme; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const { colors } = theme;
  const primary = colors.primary;
  const secondary = colors.secondary ?? primary;
  const bgColor = colors.background;
  const textColor = colors.text ?? "#F5EDD6";
  const borderColor = colors.border ?? "#2D2500";
  const surfaceColor = colors.surface ?? "#1A1500";

  const isAvailable = product.status === "active";
  const isComingSoon = product.status === "coming_soon";
  const discount =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const BADGE_LABELS = ["Phổ thông cao cấp", "Bán chạy nhất ★", "Cao cấp nhất"];
  const badgeLabel = BADGE_LABELS[index] ?? null;
  const badgeHighlight = index === 1;

  return (
    <Link
      href={isAvailable || isComingSoon ? `/products/${product.slug}` : "#"}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          backgroundColor: surfaceColor,
          border: `1px solid ${hovered ? primary : borderColor}`,
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          transform: hovered ? "translateY(-6px)" : "translateY(0)",
          boxShadow: hovered
            ? `0 20px 48px ${primary}25, 0 4px 16px rgba(0,0,0,0.4)`
            : "0 2px 8px rgba(0,0,0,0.25)",
          transition: "all 0.3s ease",
          cursor: isAvailable || isComingSoon ? "pointer" : "default",
          opacity: product.status === "discontinued" ? 0.6 : 1,
        }}
      >
        {/* Image */}
        <div
          style={{
            position: "relative",
            height: 240,
            background: `linear-gradient(135deg, ${bgColor}, ${surfaceColor})`,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {product.coverImage && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.coverImage}
              alt={product.name}
              onError={() => setImgErr(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: isAvailable || isComingSoon ? 1 : 0.5,
              }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={`${primary}30`} strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9l4-4 4 4 4-4 4 4" />
                <circle cx="8.5" cy="8.5" r="1.5" />
              </svg>
            </div>
          )}
          {/* Gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,11,0,0.65) 0%, transparent 55%)", pointerEvents: "none" }} />

          {/* Status / badge */}
          <div style={{ position: "absolute", top: 14, right: 14, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {badgeLabel && (
              <div style={{
                background: badgeHighlight ? `linear-gradient(135deg, ${primary}, ${secondary})` : "rgba(13,11,0,0.8)",
                color: badgeHighlight ? bgColor : `${textColor}90`,
                border: badgeHighlight ? "none" : `1px solid rgba(212,196,160,0.3)`,
                fontSize: 10, fontWeight: 700, padding: "5px 12px", letterSpacing: "0.08em", borderRadius: 999,
              }}>
                {badgeLabel}
              </div>
            )}
            {product.status === "out_of_stock" && (
              <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#F87171", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
                Hết hàng
              </div>
            )}
            {isComingSoon && (
              <div style={{ background: `${primary}20`, border: `1px solid ${primary}50`, color: primary, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
                Sắp ra mắt
              </div>
            )}
            {discount > 0 && isAvailable && (
              <div style={{ background: "rgba(239,68,68,0.9)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
                -{discount}%
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 20px 24px", display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Category / SKU */}
          <div style={{ color: primary, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6, textTransform: "uppercase" }}>
            {product.category === "standard" ? "Standard" : product.category === "premium" ? "Premium" : product.category === "elite" ? "Elite" : "Phụ kiện"}
          </div>

          {/* Name */}
          <h3 style={{ color: textColor, fontSize: 17, fontWeight: 600, marginBottom: 8, lineHeight: 1.4, minHeight: 44 }}>
            {product.name}
          </h3>

          {/* Description */}
          <p style={{ color: `${textColor}70`, fontSize: 13, lineHeight: 1.7, marginBottom: 14, flex: 1 }}>
            {product.description.slice(0, 100)}{product.description.length > 100 ? "…" : ""}
          </p>

          {/* Features (top 4) */}
          {product.features.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {product.features.slice(0, 4).map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: primary, flexShrink: 0, marginTop: 5 }} />
                  <span style={{ color: `${textColor}75`, fontSize: 12, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Price */}
          {product.price > 0 && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
              <span style={{ color: primary, fontSize: 18, fontWeight: 800 }}>
                {formatPrice(product.price)}
              </span>
              {discount > 0 && (
                <span style={{ color: `${textColor}40`, fontSize: 13, textDecoration: "line-through" }}>
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          )}

          {/* CTA */}
          <div style={{
            background: hovered ? `${primary}20` : `${primary}10`,
            border: `1px solid ${hovered ? primary + "60" : primary + "30"}`,
            padding: "12px 14px",
            color: primary,
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            textAlign: "center",
            transition: "all 0.2s",
          }}>
            {isComingSoon ? "Đặt trước ngay →" : isAvailable ? "Xem chi tiết →" : "Xem thêm →"}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Section Props ────────────────────────────────────────────────────────────
interface StaticProductsSectionProps {
  theme: SiteTheme;
  products: Product[];
  sectionTitle?: string;
  sectionSubtitle?: string;
}

export default function StaticProductsSection({
  theme,
  products,
  sectionTitle = "Dòng Giường Công Thái Học",
  sectionSubtitle = "Được chế tác từ thép cường lực, tích hợp motor Đức — bảo hành 5 năm chính hãng",
}: StaticProductsSectionProps) {
  const { colors, layout } = theme;
  const primary = colors.primary;
  const secondary = colors.secondary ?? primary;
  const bgColor = colors.background;
  const textColor = colors.text ?? "#F5EDD6";
  const maxWidth = layout.maxWidth ?? 1280;

  // Lọc chỉ sản phẩm không discontinued
  const displayProducts = products.filter((p) => p.status !== "discontinued");

  if (displayProducts.length === 0) return null;

  return (
    <section style={{ background: `${bgColor}`, padding: "80px 0" }}>
      <div style={{ maxWidth, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: `${primary}15`, border: `1px solid ${primary}40`,
            borderRadius: 999, padding: "6px 16px", marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: primary, display: "inline-block" }} />
            <span style={{ color: primary, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Dòng sản phẩm
            </span>
          </div>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.15,
            color: textColor, marginBottom: 16, letterSpacing: "-0.01em",
          }}>
            {sectionTitle.split(" ").slice(0, -2).join(" ")}{" "}
            <span style={{ color: primary }}>
              {sectionTitle.split(" ").slice(-2).join(" ")}
            </span>
          </h2>
          {/* Gold divider */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 1, background: `linear-gradient(to right, transparent, ${primary})` }} />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: primary }} />
            <div style={{ width: 40, height: 1, background: `linear-gradient(to left, transparent, ${primary})` }} />
          </div>
          <p style={{ color: `${textColor}60`, fontSize: 15, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
            {sectionSubtitle}
          </p>
        </div>

        {/* Product grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: displayProducts.length === 1
            ? "minmax(280px, 480px)"
            : displayProducts.length === 2
              ? "repeat(2, 1fr)"
              : "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 24,
          marginBottom: 40,
          justifyContent: displayProducts.length <= 2 ? "center" : undefined,
        }}>
          {displayProducts.map((p, i) => (
            <ProductCard key={p.id} product={p} theme={theme} index={i} />
          ))}
        </div>

        {/* View all CTA */}
        <div style={{ textAlign: "center" }}>
          <Link
            href="/products"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 32px",
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              color: bgColor, borderRadius: 999, fontSize: 14, fontWeight: 700,
              textDecoration: "none", letterSpacing: "0.04em",
              boxShadow: `0 8px 24px ${primary}30`,
            }}
          >
            Xem toàn bộ sản phẩm
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
