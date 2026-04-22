"use client";
import { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/product-store";
import type { SiteTheme } from "@/lib/theme-types";

// ─── Design tokens (giống landing page) ──────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E2C97E";
const BLACK_CARD = "#221D00";
const BLACK_BORDER = "#2E2800";
const WHITE = "#F5EDD6";
const GRAY = "#A89070";
const GRAY_LIGHT = "#D4C4A0";
const R_SM = 8;
const R_LG = 16;
const R_FULL = 999;
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu`;
  return price.toLocaleString("vi-VN") + " đ";
}

const BADGE_LABELS = ["Phổ thông cao cấp", "Bán chạy nhất ★", "Cao cấp nhất"];

// ─── Product Card — giống hệt landing page ───────────────────────────────────
function ProductCard({ product, index }: { product: Product; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const isAvailable = product.status === "active";
  const isComingSoon = product.status === "coming_soon";
  const discount =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const badgeLabel = BADGE_LABELS[index] ?? "Sản phẩm";
  const badgeHighlight = index === 1; // index 1 = "Bán chạy nhất" → nền vàng

  const href = isAvailable || isComingSoon ? `/products/${product.slug}` : "#";

  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: BLACK_CARD,
          border: `1px solid ${hovered ? "rgba(201,168,76,0.45)" : BLACK_BORDER}`,
          borderRadius: R_LG,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transform: hovered ? "translateY(-6px)" : "translateY(0)",
          boxShadow: hovered ? "0 20px 48px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.3)",
          transition: "all 0.3s ease",
          cursor: "pointer",
          opacity: product.status === "discontinued" ? 0.55 : 1,
        }}
      >
        {/* ── Image 1:1 ratio (giống landing page) ── */}
        <div style={{
          position: "relative",
          width: "100%",
          paddingBottom: "100%", // tỷ lệ 1:1
          background: "#0A0800",
          borderRadius: `${R_LG}px ${R_LG}px 0 0`,
          overflow: "hidden",
          flexShrink: 0,
        }}>
          <div style={{ position: "absolute", inset: 0 }}>
            {product.coverImage && !imgErr ? (
              <Image
                src={product.coverImage}
                alt={product.name}
                fill
                style={{ objectFit: "cover" }}
                onError={() => setImgErr(true)}
              />
            ) : (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 56,
              }}>
                🛏️
              </div>
            )}
            {/* Gradient overlay */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,11,0,0.7) 0%, transparent 55%)" }} />
          </div>

          {/* Badges */}
          <div style={{ position: "absolute", top: 14, right: 14, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {/* Position badge */}
            <div style={{
              background: badgeHighlight ? GOLD : "rgba(13,11,0,0.8)",
              color: badgeHighlight ? "#0A0800" : GRAY_LIGHT,
              border: badgeHighlight ? "none" : `1px solid rgba(212,196,160,0.3)`,
              fontSize: 10, fontWeight: 700, padding: "5px 12px",
              letterSpacing: "0.08em", borderRadius: R_FULL,
              fontFamily: FONT,
            }}>
              {badgeLabel}
            </div>
            {/* Discount badge */}
            {discount > 0 && isAvailable && (
              <div style={{
                background: "rgba(239,68,68,0.9)", color: "#fff",
                fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: R_FULL,
                fontFamily: FONT,
              }}>
                -{discount}%
              </div>
            )}
            {/* Status badges */}
            {product.status === "out_of_stock" && (
              <div style={{
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                color: "#F87171", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: R_FULL,
                fontFamily: FONT,
              }}>
                Hết hàng
              </div>
            )}
            {isComingSoon && (
              <div style={{
                background: `rgba(201,168,76,0.15)`, border: `1px solid rgba(201,168,76,0.4)`,
                color: GOLD, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: R_FULL,
                fontFamily: FONT,
              }}>
                Sắp ra mắt
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "22px 22px 26px", display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Category label */}
          <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6, fontFamily: FONT, textTransform: "uppercase" }}>
            {product.category === "standard" ? "Standard"
              : product.category === "premium" ? "Premium"
              : product.category === "elite" ? "Elite"
              : "Phụ kiện"}
          </div>

          {/* Name */}
          <h3 style={{ color: WHITE, fontSize: 16, fontWeight: 600, marginBottom: 8, lineHeight: 1.4, fontFamily: FONT, minHeight: 44 }}>
            {product.name}
          </h3>

          {/* Description */}
          {product.description && (
            <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, marginBottom: 14, fontFamily: FONT, flex: 1 }}>
              {product.description.slice(0, 90)}{product.description.length > 90 ? "…" : ""}
            </p>
          )}

          {/* Features (top 4) */}
          {product.features.length > 0 && (
            <ul style={{ margin: "0 0 14px 0", padding: 0, listStyle: "none" }}>
              {product.features.slice(0, 4).map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
                  <span style={{ color: GOLD, fontSize: 12, lineHeight: 1.6, flexShrink: 0 }}>•</span>
                  <span style={{ color: GRAY_LIGHT, fontSize: 12, lineHeight: 1.6, fontFamily: FONT }}>{f}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Price box — giống landing page */}
          <div style={{
            background: "rgba(201,168,76,0.06)",
            border: `1px solid rgba(201,168,76,0.2)`,
            padding: "12px 14px",
            borderRadius: R_SM,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ color: GRAY, fontSize: 10, marginBottom: 3, fontFamily: FONT }}>
                {isComingSoon ? "Đặt trước" : "Giá bán lẻ"}
              </div>
              <div style={{ color: GOLD, fontSize: 18, fontWeight: 800, fontFamily: FONT }}>
                {product.price > 0 ? formatPrice(product.price) : "Liên hệ"}
              </div>
            </div>
            {discount > 0 && product.price > 0 && (
              <div style={{ textAlign: "right" }}>
                <div style={{ color: GRAY, fontSize: 10, marginBottom: 3, fontFamily: FONT }}>Giá gốc</div>
                <div style={{ color: GRAY, fontSize: 13, textDecoration: "line-through", fontFamily: FONT }}>
                  {formatPrice(product.originalPrice)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
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
  const primary = colors.primary ?? GOLD;
  const secondary = colors.secondary ?? GOLD_LIGHT;
  const bgColor = "#1A1500";
  const maxWidth = layout.maxWidth ?? 1280;

  const displayProducts = products.filter((p) => p.status !== "discontinued");
  if (displayProducts.length === 0) return null;

  return (
    <section style={{ background: bgColor, padding: "80px 0", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
      <div style={{ maxWidth, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Header ── */}
        <ScrollReveal variant="fadeUp" delay={0}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          {/* Label pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(201,168,76,0.08)",
            border: `1px solid rgba(201,168,76,0.3)`,
            borderRadius: R_FULL, padding: "6px 18px", marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
            <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: FONT }}>
              Dòng sản phẩm
            </span>
          </div>

          {/* Title — 2 dòng: dòng 1 trắng kem, dòng 2 vàng gold */}
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 300, lineHeight: 1.2,
            marginBottom: 16,
            letterSpacing: "-0.01em", fontFamily: FONT,
          }}>
            {(() => {
              // Tách tại vị trí xuống dòng (\n) nếu có, nếu không tách đôi từ
              const parts = sectionTitle.includes("\n")
                ? sectionTitle.split("\n")
                : (() => {
                    const words = sectionTitle.split(" ");
                    const half = Math.ceil(words.length / 2);
                    return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
                  })();
              return (
                <>
                  <span style={{ display: "block", color: WHITE }}>{parts[0]}</span>
                  {parts[1] && <span style={{ display: "block", color: GOLD }}>{parts[1]}</span>}
                </>
              );
            })()}
          </h2>

          {/* Gold divider */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
            <div style={{ width: 5, height: 5, background: GOLD, transform: "rotate(45deg)", borderRadius: 1 }} />
            <div style={{ flex: 1, maxWidth: 60, height: 1, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
          </div>

          <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.7, maxWidth: 560, margin: "0 auto", fontFamily: FONT }}>
            {sectionSubtitle}
          </p>
        </div>
        </ScrollReveal>

        {/* ── Product grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: displayProducts.length === 1
            ? "minmax(280px, 480px)"
            : displayProducts.length === 2
              ? "repeat(2, 1fr)"
              : "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
          marginBottom: 44,
          justifyContent: displayProducts.length <= 2 ? "center" : undefined,
        }}>
          {displayProducts.map((p, i) => (
            <ScrollReveal key={p.id} variant="fadeUp" delay={100 + i * 100}>
            <ProductCard product={p} index={i} />
            </ScrollReveal>
          ))}
        </div>

        {/* ── CTA ── */}
        <ScrollReveal variant="fadeUp" delay={200}>
        <div style={{ textAlign: "center" }}>
          <Link
            href="/products"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "15px 36px",
              background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #9A7A2E 100%)`,
              color: "#0A0800",
              borderRadius: R_FULL,
              fontSize: 14, fontWeight: 700,
              textDecoration: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              boxShadow: `0 8px 28px rgba(201,168,76,0.3)`,
              fontFamily: FONT,
            }}
          >
            Xem toàn bộ sản phẩm
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
