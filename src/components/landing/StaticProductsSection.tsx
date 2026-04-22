"use client";
import { useState } from "react";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";

// ─── Static product data (copy độc lập, không phụ thuộc CRM hay landing page) ─
// Chỉnh sửa tại đây mà không ảnh hưởng đến CRM hay landing page
const STATIC_PRODUCTS = [
  {
    id: "gsf300",
    sku: "GSF300",
    name: "SmartFurni GSF300",
    tagline: "Phổ thông cao cấp",
    description: "Điều chỉnh đầu 0–60°, chân 0–40°. Motor Đức im lặng, điều khiển từ xa + App. Phù hợp cho mọi gia đình.",
    image: "/lp/bed-gsf300.jpg",
    badge: null,
    badgeHighlight: false,
    href: "/products/smartfurni-gsf300",
    features: ["Điều chỉnh đầu 0–60°", "Điều chỉnh chân 0–40°", "Motor Đức im lặng", "Điều khiển từ xa + App"],
  },
  {
    id: "gsf350",
    sku: "GSF350",
    name: "SmartFurni GSF350",
    tagline: "Bán chạy nhất ★",
    description: "Điều chỉnh đầu + chân + lưng. Massage rung toàn thân. Chế độ Zero Gravity giảm áp lực cột sống tối ưu.",
    image: "/lp/bed-gsf350.jpg",
    badge: "Bán chạy nhất ★",
    badgeHighlight: true,
    href: "/products/smartfurni-gsf350",
    features: ["Điều chỉnh đầu + chân + lưng", "Massage rung toàn thân", "Chế độ Zero Gravity", "Điều khiển giọng nói"],
  },
  {
    id: "smf808",
    sku: "SMF808",
    name: "SmartFurni SMF808",
    tagline: "Cao cấp nhất",
    description: "Đèn LED viền giường, loa Bluetooth, điều khiển giọng nói AI. Tích hợp Apple HomeKit & Google Home.",
    image: "/lp/bed-smf808.jpg",
    badge: "Cao cấp nhất",
    badgeHighlight: false,
    href: "/products/smartfurni-smf808",
    features: ["Đèn LED viền giường", "Loa Bluetooth tích hợp", "Điều khiển giọng nói AI", "Apple HomeKit & Google Home"],
  },
];

interface StaticProductsSectionProps {
  theme: SiteTheme;
}

function ProductCard({ product, theme }: { product: typeof STATIC_PRODUCTS[0]; theme: SiteTheme }) {
  const [hovered, setHovered] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const { colors } = theme;
  const primary = colors.primary;
  const secondary = colors.secondary ?? primary;
  const bgColor = colors.background;
  const textColor = colors.text ?? "#F5EDD6";
  const borderColor = colors.border ?? "#2D2500";
  const surfaceColor = colors.surface ?? "#1A1500";

  return (
    <Link href={product.href} style={{ textDecoration: "none", display: "block" }}>
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
          transform: hovered ? "translateY(-6px)" : "translateY(0)",
          boxShadow: hovered
            ? `0 20px 48px ${primary}25, 0 4px 16px rgba(0,0,0,0.4)`
            : "0 2px 8px rgba(0,0,0,0.25)",
          transition: "all 0.3s ease",
          cursor: "pointer",
        }}
      >
        {/* Image */}
        <div
          style={{
            position: "relative",
            height: 240,
            background: `linear-gradient(135deg, ${bgColor}, ${surfaceColor})`,
            overflow: "hidden",
          }}
        >
          {!imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              onError={() => setImgErr(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={`${primary}40`} strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9l4-4 4 4 4-4 4 4" />
                <circle cx="8.5" cy="8.5" r="1.5" />
              </svg>
            </div>
          )}
          {/* Gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,11,0,0.65) 0%, transparent 55%)", pointerEvents: "none" }} />
          {/* Badge */}
          {product.badge && (
            <div
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                zIndex: 2,
                background: product.badgeHighlight ? `linear-gradient(135deg, ${primary}, ${secondary})` : "rgba(13,11,0,0.8)",
                color: product.badgeHighlight ? bgColor : `${textColor}90`,
                border: product.badgeHighlight ? "none" : `1px solid rgba(212,196,160,0.3)`,
                fontSize: 10,
                fontWeight: 700,
                padding: "5px 12px",
                letterSpacing: "0.08em",
                borderRadius: 999,
              }}
            >
              {product.badge}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "20px 20px 24px", display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ color: primary, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6, textTransform: "uppercase" }}>
            {product.sku}
          </div>
          <h3 style={{ color: textColor, fontSize: 17, fontWeight: 600, marginBottom: 8, lineHeight: 1.4, minHeight: 44 }}>
            {product.name}
          </h3>
          <p style={{ color: `${textColor}70`, fontSize: 13, lineHeight: 1.7, marginBottom: 16, flex: 1 }}>
            {product.description}
          </p>
          {/* Features */}
          <div style={{ marginBottom: 16 }}>
            {product.features.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: primary, flexShrink: 0 }} />
                <span style={{ color: `${textColor}80`, fontSize: 12, lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
          {/* CTA */}
          <div
            style={{
              background: `${primary}12`,
              border: `1px solid ${primary}35`,
              padding: "12px 14px",
              color: primary,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              textAlign: "center",
              transition: "all 0.2s",
            }}
          >
            Xem chi tiết →
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function StaticProductsSection({ theme }: StaticProductsSectionProps) {
  const { colors, layout } = theme;
  const primary = colors.primary;
  const secondary = colors.secondary ?? primary;
  const bgColor = colors.background;
  const textColor = colors.text ?? "#F5EDD6";
  const borderColor = colors.border ?? "#2D2500";
  const maxWidth = layout.maxWidth ?? 1280;

  return (
    <section style={{ background: `${bgColor}f8`, padding: "80px 0" }}>
      <div style={{ maxWidth, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: `${primary}15`,
              border: `1px solid ${primary}40`,
              borderRadius: 999,
              padding: "6px 16px",
              marginBottom: 20,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: primary, display: "inline-block" }} />
            <span style={{ color: primary, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Dòng sản phẩm
            </span>
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 300,
              lineHeight: 1.15,
              color: textColor,
              marginBottom: 16,
              letterSpacing: "-0.01em",
            }}
          >
            Giường Công Thái Học{" "}
            <span style={{ color: primary }}>Điều Chỉnh Điện SmartFurni</span>
          </h2>
          {/* Gold divider */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 1, background: `linear-gradient(to right, transparent, ${primary})` }} />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: primary }} />
            <div style={{ width: 40, height: 1, background: `linear-gradient(to left, transparent, ${primary})` }} />
          </div>
          <p style={{ color: `${textColor}60`, fontSize: 15, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
            Được chế tác từ thép cường lực, tích hợp motor Đức — bảo hành 5 năm chính hãng
          </p>
        </div>

        {/* Product grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            marginBottom: 40,
          }}
        >
          {STATIC_PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} theme={theme} />
          ))}
        </div>

        {/* View all CTA */}
        <div style={{ textAlign: "center" }}>
          <Link
            href="/products"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 32px",
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              color: bgColor,
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              letterSpacing: "0.04em",
              boxShadow: `0 8px 24px ${primary}30`,
              transition: "all 0.2s",
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
