"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { CrmProduct, SizePricing } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";

// ─── Design Tokens (same as CRM) ─────────────────────────────────────────────
const D = {
  pageBg: "#0d0b1a",
  textPrimary: "#f5edd6",
  textSecondary: "rgba(245,237,214,0.75)",
  textMuted: "rgba(255,255,255,0.4)",
  gold: "#C9A84C",
  goldDark: "#9A7A2E",
  goldDim: "rgba(201,168,76,0.12)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.12)",
  blue: "#60a5fa",
  blueDim: "rgba(96,165,250,0.12)",
  divider: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  slideBg: "linear-gradient(160deg, #1c1a2e 0%, #241c08 55%, #2e2004 100%)",
};
const FONT_PRODUCT = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const FONT_HEADING = "'Inter', 'SF Pro Display', system-ui, sans-serif";

// ─── Slide Types ──────────────────────────────────────────────────────────────
type SlideType =
  | "cover" | "intro" | "category_header"
  | "product_intro" | "product_feature" | "product_pricing"
  | "product_feature_pricing" | "product_full" | "product_gallery"
  | "why_smartfurni" | "warranty" | "contact";

interface SlideOverrides {
  title?: string; subtitle?: string; body?: string;
  imageDataUrl?: string; image2DataUrl?: string; image3DataUrl?: string;
  [key: string]: string | undefined;
}

interface Slide {
  id: string;
  type: SlideType;
  visible: boolean;
  productId?: string;
  category?: "ergonomic_bed" | "sofa_bed";
  overrides?: SlideOverrides;
}

// ─── Shared Shell ─────────────────────────────────────────────────────────────
function SlideShell({ accentColor = D.gold, children }: { accentColor?: string; children: React.ReactNode }) {
  return (
    <div style={{ width: 794, height: 1123, minWidth: 794, minHeight: 1123, maxWidth: 794, maxHeight: 1123, display: "flex", flexDirection: "column", background: D.slideBg, fontFamily: FONT_HEADING, overflow: "hidden", boxSizing: "border-box" }}>
      <div style={{ height: 5, flexShrink: 0, background: `linear-gradient(90deg, ${accentColor}, #f5edd6, ${accentColor})` }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
      <div style={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${accentColor}, #f5edd6, ${accentColor})` }} />
    </div>
  );
}

// ─── Slide: Cover ─────────────────────────────────────────────────────────────
function SlideCover({ today, overrides }: { today: string; overrides?: SlideOverrides }) {
  return (
    <SlideShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", textAlign: "center" }}>
        <div style={{ marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 120, width: "auto", objectFit: "contain" }} />
        </div>
        <h1 style={{ fontSize: 54, fontWeight: 900, color: D.textPrimary, lineHeight: 1.1, marginBottom: 16, fontFamily: FONT_HEADING, width: "100%", whiteSpace: "pre-line" }}>
          {overrides?.title || "CATALOGUE\nSẢN PHẨM"}
        </h1>
        <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, transparent, ${D.gold}, transparent)`, marginBottom: 20 }} />
        <p style={{ fontSize: 20, fontWeight: 500, color: "rgba(245,237,214,0.8)", marginBottom: 8 }}>
          {overrides?.subtitle || "Giường Công Thái Học & Sofa Giường Đa Năng"}
        </p>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>
          {overrides?.body || "Công nghệ điều khiển điện thông minh — Thiết kế sang trọng hiện đại"}
        </p>
      </div>
      <div style={{ padding: "0 48px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Ngày phát hành</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: D.gold }}>{today}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Phiên bản</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(245,237,214,0.6)" }}>
            {(overrides as any)?.edition || "2025 Edition"}
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Intro ─────────────────────────────────────────────────────────────
const SHOWROOM_DEFAULT_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663305063350/uQGftdPVABiTalLy.png";
function SlideIntro({ overrides }: { overrides?: SlideOverrides }) {
  const defaultBody = "🏆 Chất lượng cao cấp — Vật liệu nhập khẩu, kiểm định nghiêm ngặt\n⚡ Công nghệ thông minh — Điều khiển điện, kết nối app di động\n🛡️ Bảo hành dài hạn — Khung cơ 5 năm, motor điện 3 năm\n🚚 Giao hàng & lắp đặt — Miễn phí trong bán kính 30km TP.HCM";
  const bodyLines = (overrides?.body ?? defaultBody).split("\n").filter(Boolean);
  const showroomImg = (overrides as any)?.showroomImageDataUrl || SHOWROOM_DEFAULT_IMG;
  return (
    <SlideShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ width: "100%", aspectRatio: "16 / 9", flexShrink: 0, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={showroomImg} alt="SmartFurni Showroom" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ flex: 1, padding: "20px 40px 16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ marginBottom: 14, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 6 }}>VỀ CHÚNG TÔI</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING, margin: 0 }}>
              {overrides?.title || "Thương Hiệu SmartFurni"}
            </h2>
            <div style={{ width: 48, height: 2, background: D.gold, marginTop: 8 }} />
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(245,237,214,0.7)", marginBottom: 14, flexShrink: 0 }}>
            {overrides?.subtitle || "SmartFurni là thương hiệu nội thất thông minh tiên phong tại Việt Nam, chuyên cung cấp giường công thái học điều khiển điện và sofa giường đa năng cao cấp."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflow: "hidden" }}>
            {bodyLines.map((line, i) => {
              const parts = line.split(" — ");
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 10, padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{parts[0]?.match(/^\p{Emoji}/u)?.[0] ?? "•"}</span>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: D.textPrimary }}>{parts[0]?.replace(/^\p{Emoji}\s*/u, "") ?? ""}</span>
                    {parts[1] && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginLeft: 6 }}>— {parts[1]}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14, flexShrink: 0 }}>
            {[
              [(overrides as any)?.stat1Value ?? "5+", (overrides as any)?.stat1Label ?? "Năm kinh nghiệm"],
              [(overrides as any)?.stat2Value ?? "1000+", (overrides as any)?.stat2Label ?? "Khách hàng tin dùng"],
              [(overrides as any)?.stat3Value ?? "8", (overrides as any)?.stat3Label ?? "Dòng sản phẩm"],
            ].map(([v, l], i) => (
              <div key={i} style={{ textAlign: "center", borderRadius: 10, padding: "10px 6px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: D.gold, marginBottom: 2 }}>{v}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, borderRadius: 12, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: D.gold, marginBottom: 10 }}>HỆ THỐNG SHOWROOM</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.gold }}>Showroom TP.HCM</div>
                <div style={{ fontSize: 11, color: "rgba(245,237,214,0.7)", lineHeight: 1.45 }}>{(overrides as any)?.showroomHcm ?? "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.gold }}>Showroom Hà Nội</div>
                <div style={{ fontSize: 11, color: "rgba(245,237,214,0.7)", lineHeight: 1.45 }}>{(overrides as any)?.showroomHn ?? "B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>📞</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: D.gold }}>{(overrides as any)?.hotline ?? "028.7122.0818"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>🌐</span>
                <span style={{ fontSize: 12, color: "rgba(245,237,214,0.7)" }}>{(overrides as any)?.website ?? "smartfurni.vn"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Category Header ───────────────────────────────────────────────────
function SlideCategoryHeader({ category, overrides }: { category: "ergonomic_bed" | "sofa_bed"; overrides?: SlideOverrides }) {
  const isBed = category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const colorDim = isBed ? D.purpleDim : D.blueDim;
  const icon = isBed ? "🛏️" : "🛋️";
  const defaultTitle = isBed ? "Giường Công Thái Học" : "Sofa Giường Đa Năng";
  const defaultSubtitle = isBed
    ? "Dòng giường điều khiển điện thông minh, hỗ trợ nâng đầu/chân, tích hợp massage"
    : "Dòng sofa gấp thành giường thông minh, tiết kiệm không gian, phù hợp căn hộ hiện đại";
  const defaultFeatures = isBed
    ? ["Điều khiển điện không dây", "Nâng đầu 0–70°, nâng chân 0–45°", "Massage rung tích hợp", "Khung thép mạ kẽm bảo hành 5 năm", "Điều khiển từ xa & app"]
    : ["Gấp mở dễ dàng trong 30 giây", "Kết cấu khung thép chắc chắn", "Đệm foam cao cấp thoáng khí", "Tiết kiệm không gian tối đa", "Phù hợp căn hộ 30–80m²"];
  const bodyLines = (overrides?.body ?? defaultFeatures.join("\n")).split("\n").filter(Boolean);
  const iconImg = overrides?.imageDataUrl;
  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", textAlign: "center" }}>
        <div style={{ width: 96, height: 96, borderRadius: 24, overflow: "hidden", background: colorDim, border: `2px solid ${color}40`, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {iconImg
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={iconImg} alt="" style={{ width: 96, height: 96, objectFit: "cover" }} />
            : <span style={{ fontSize: 46 }}>{icon}</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.4em", textTransform: "uppercase", color, marginBottom: 12 }}>DÒNG SẢN PHẨM</div>
        <h2 style={{ fontSize: 44, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING, marginBottom: 16 }}>
          {overrides?.title || defaultTitle}
        </h2>
        <div style={{ width: 72, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, marginBottom: 20 }} />
        <p style={{ fontSize: 17, maxWidth: 440, color: "rgba(245,237,214,0.7)", marginBottom: 36 }}>
          {overrides?.subtitle || defaultSubtitle}
        </p>
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 10 }}>
          {bodyLines.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 12, padding: "10px 18px", background: colorDim, border: `1px solid ${color}25` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: color }} />
              <span style={{ fontSize: 15, color: "rgba(245,237,214,0.85)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Full ──────────────────────────────────────────────────────
function SlideProductFull({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const featureLines = bodyLines.length > 0 ? bodyLines : specEntries.map(([k, v]) => `${k}: ${v}`);
  const mainImageUrl = overrides?.imageDataUrl || product.imageUrl || product.imageAngle1;
  const minPrice = hasSizes ? Math.min(...product.sizePricings!.map((s: SizePricing) => s.price)) : product.basePrice;
  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "10px 24px 8px", flexShrink: 0, borderBottom: `1px solid ${color}22` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color }}>{isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>SKU: {product.sku}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 32px 10px", overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 16, paddingTop: 10, paddingBottom: 10, flexShrink: 0, borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
            <div style={{ width: 150, height: 150, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30` }}>
              {mainImageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={mainImageUrl} alt={product.name} style={{ width: 150, height: 150, objectFit: "cover" }} />
                : <div style={{ width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>{isBed ? "🛏️" : "🛋️"}</div>}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.25, marginBottom: 6 }}>
                  {overrides?.title || product.name}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(245,237,214,0.65)", marginBottom: 8 }}>
                  {overrides?.subtitle || product.description}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Giá từ</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: D.gold, fontFamily: FONT_PRODUCT }}>{minPrice > 0 ? formatVND(minPrice) : "Liên hệ"}</div>
                </div>
              </div>
            </div>
          </div>
          {featureLines.length > 0 && (
            <div style={{ paddingTop: 10, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>TÍNH NĂNG NỔI BẬT</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {featureLines.slice(0, 10).map((line, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, borderRadius: 6, padding: "6px 9px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: color }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: D.textPrimary, lineHeight: 1.35 }}>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ flexShrink: 0, paddingTop: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 5, alignSelf: "flex-start" }}>ẢNH THÔNG SỐ KỸ THUẬT</div>
            <div style={{ width: "70%", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", border: `1px solid ${color}20`, background: "rgba(255,255,255,0.03)" }}>
              {((overrides as any)?.specImageDataUrl || product.imageSpec || product.imageAngle2)
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={(overrides as any)?.specImageDataUrl || product.imageSpec || product.imageAngle2} alt="Thông số" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: D.textMuted, fontSize: 12 }}>Ảnh thông số</div>}
            </div>
          </div>
          <div style={{ paddingTop: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>BẢNG GIÁ</div>
            {hasSizes ? (
              <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(201,168,76,0.2)" }}>
                <div style={{ padding: "5px 12px", background: "rgba(201,168,76,0.1)", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr" }}>
                  {["KÍCH THƯỚC", "MÃ SIZE", "ĐƠN GIÁ (VNĐ)"].map((h, i) => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "rgba(255,255,255,0.45)", textAlign: i === 2 ? "right" : "left" }}>{h}</div>
                  ))}
                </div>
                {product.sizePricings!.map((sp: SizePricing, i: number) => (
                  <div key={i} style={{ padding: "5px 12px", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: D.textPrimary }}>{sp.label || sp.size}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{sp.size}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: D.gold, textAlign: "right" }}>{sp.price > 0 ? formatVND(sp.price) : "Liên hệ"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ borderRadius: 10, padding: "10px 16px", textAlign: "center", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: D.gold }}>{product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Giá niêm yết chưa VAT</div>
              </div>
            )}
            <div style={{ marginTop: 5, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>• Giá chưa bao gồm VAT (10%) &nbsp;•&nbsp; Giá có thể thay đổi mà không báo trước</div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Intro ─────────────────────────────────────────────────────
function SlideProductIntro({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const colorDim = isBed ? D.purpleDim : D.blueDim;
  const imageUrl = overrides?.imageDataUrl || product.imageUrl || product.imageAngle1;
  const defaultHighlights = isBed
    ? ["Điều khiển điện không dây", "Nâng đầu 0–70°, nâng chân 0–45°", "Massage rung tích hợp", "Khung thép mạ kẽm bảo hành 5 năm"]
    : ["Gấp mở dễ dàng trong 30 giây", "Kết cấu khung thép chắc chắn", "Đệm foam cao cấp thoáng khí", "Tiết kiệm không gian tối đa"];
  const highlights = (overrides?.body ?? defaultHighlights.join("\n")).split("\n").filter(Boolean);
  const minPrice = product.sizePricings && product.sizePricings.length > 0 ? Math.min(...product.sizePricings.map(s => s.price)) : null;
  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 44px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, padding: "4px 12px", borderRadius: 20, background: colorDim, border: `1px solid ${color}40` }}>
              {isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}
            </div>
            <div style={{ fontSize: 11, color: D.textMuted, letterSpacing: "0.2em" }}>SKU: {product.sku}</div>
          </div>
          <div style={{ fontSize: 11, color: D.textMuted, letterSpacing: "0.15em" }}>1 / 4</div>
        </div>
        <div style={{ flex: 1, display: "flex", gap: 36, alignItems: "flex-start" }}>
          <div style={{ width: "42%", flexShrink: 0 }}>
            <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 16, overflow: "hidden", background: colorDim, border: `1px solid ${color}30` }}>
              {imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60 }}>{isBed ? "🛏️" : "🛋️"}</div>}
            </div>
            {minPrice && (
              <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: colorDim, border: `1px solid ${color}30`, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: D.textMuted, letterSpacing: "0.2em", marginBottom: 4 }}>GIÁ TỪ</div>
                <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: FONT_PRODUCT }}>{formatVND(minPrice)}</div>
                <div style={{ fontSize: 11, color: D.textMuted, marginTop: 2 }}>Chưa bao gồm VAT</div>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.25, marginBottom: 12 }}>
              {overrides?.title || product.name}
            </h2>
            <div style={{ width: 48, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${color}, transparent)`, marginBottom: 16 }} />
            <p style={{ fontSize: 15, color: D.textSecondary, lineHeight: 1.7, marginBottom: 24 }}>
              {overrides?.subtitle || product.description || "Mô tả sản phẩm..."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {highlights.slice(0, 5).map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${D.border}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: D.textSecondary, lineHeight: 1.4 }}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${D.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 20, width: "auto", objectFit: "contain", opacity: 0.85 }} />
          <div style={{ fontSize: 11, color: D.textMuted }}>smartfurni.vn · Giường & Sofa Thông Minh</div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Feature ───────────────────────────────────────────────────
function SlideProductFeature({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const imageUrl = overrides?.imageDataUrl || product.imageSpec || product.imageUrl || product.imageAngle1;
  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 24 }}>
          <div style={{ width: 140, height: 140, borderRadius: 18, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: `1px solid ${color}30` }}>
            {imageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={imageUrl} alt={product.name} style={{ width: 140, height: 140, objectFit: "cover" }} />
              : <div style={{ width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46 }}>{isBed ? "🛏️" : "🛋️"}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, marginBottom: 6 }}>
              {isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.25 }}>
              {overrides?.title || product.name}
            </h3>
            <div style={{ fontSize: 13, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginBottom: 10, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {product.sku}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(245,237,214,0.7)" }}>
              {overrides?.subtitle || product.description || ""}
            </p>
          </div>
        </div>
        {bodyLines.length > 0 ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>TÍNH NĂNG NỔI BẬT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {bodyLines.map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: color }} />
                  <span style={{ fontSize: 14, color: D.textPrimary }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        ) : specEntries.length > 0 ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>THÔNG SỐ KỸ THUẬT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {specEntries.map(([key, val]) => (
                <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 8, borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: color }} />
                  <div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{key}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: D.textPrimary }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div style={{ marginTop: "auto", borderRadius: 16, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)" }}>
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Giá tham khảo từ</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: D.gold, fontFamily: FONT_HEADING }}>
              {product.sizePricings && product.sizePricings.length > 0 ? formatVND(Math.min(...product.sizePricings.map(s => s.price))) : product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Bảo hành</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: D.textPrimary }}>{isBed ? "Khung 5 năm · Motor 3 năm" : "Khung 3 năm · Đệm 1 năm"}</div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Pricing ───────────────────────────────────────────────────
function SlideProductPricing({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;
  const imageUrl = overrides?.imageDataUrl || product.imageUrl || product.imageAngle1;
  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          {imageUrl && (
            <div style={{ width: 72, height: 72, borderRadius: 14, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(201,168,76,0.3)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={product.name} style={{ width: 72, height: 72, objectFit: "cover" }} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 4 }}>BẢNG GIÁ</div>
            <h3 style={{ fontSize: 28, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.2 }}>{overrides?.title || product.name}</h3>
            <div style={{ fontSize: 14, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{product.sku}</div>
          </div>
        </div>
        {hasSizes ? (
          <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20, border: "1px solid rgba(201,168,76,0.2)" }}>
            <div style={{ padding: "12px 20px", background: "rgba(201,168,76,0.1)", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", gap: 16 }}>
              {["Kích thước", "Mã size", "Đơn giá (VNĐ)"].map((h, i) => (
                <div key={h} style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.5)", textAlign: i === 2 ? "right" : "left" }}>{h}</div>
              ))}
            </div>
            {product.sizePricings!.map((sp: SizePricing, i: number) => (
              <div key={i} style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", gap: 16, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: D.textPrimary }}>{sp.label || sp.size}</div>
                <div style={{ fontSize: 13, fontFamily: "monospace", color: "rgba(255,255,255,0.45)" }}>{sp.size}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: D.gold, textAlign: "right" }}>{sp.price > 0 ? formatVND(sp.price) : "Liên hệ"}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ borderRadius: 16, padding: "24px", marginBottom: 20, textAlign: "center", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: D.gold, marginBottom: 4 }}>{product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>Giá niêm yết chưa VAT</div>
          </div>
        )}
        {product.discountTiers && product.discountTiers.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>CHIẾT KHẤU THEO SỐ LƯỢNG</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(product.discountTiers.length, 4)}, 1fr)`, gap: 10 }}>
              {product.discountTiers.map((tier, i) => (
                <div key={i} style={{ borderRadius: 12, padding: "12px 8px", textAlign: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: D.gold }}>{tier.discountPct}%</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{tier.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {overrides?.body && (
          <div style={{ marginBottom: 16 }}>
            {overrides.body.split("\n").filter(Boolean).map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: D.gold, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "rgba(245,237,214,0.75)" }}>{line}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: "auto", borderRadius: 12, padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>
            • Giá trên chưa bao gồm VAT (10%) &nbsp;•&nbsp; Giá có thể thay đổi mà không báo trước &nbsp;•&nbsp; Liên hệ để được báo giá dự án
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Feature + Pricing ────────────────────────────────────────
function SlideProductFeaturePricing({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const featureLines = bodyLines.length > 0 ? bodyLines : specEntries.map(([k, v]) => `${k}: ${v}`);
  const mainImageUrl = overrides?.imageDataUrl || product.imageSpec || product.imageUrl || product.imageAngle1;
  const specImageUrl = (overrides as any)?.specImageDataUrl || product.imageSpec || product.imageAngle2 || product.imageAngle1;
  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, padding: "20px 36px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexShrink: 0 }}>
          <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: `1px solid ${color}30` }}>
            {mainImageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={mainImageUrl} alt={product.name} style={{ width: 72, height: 72, objectFit: "cover" }} />
              : <div style={{ width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{isBed ? "🛏️" : "🛋️"}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, marginBottom: 3 }}>{isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}</div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, marginBottom: 4, lineHeight: 1.2 }}>{overrides?.title || product.name}</h3>
            <div style={{ fontSize: 11, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, display: "inline-block", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>{product.sku}</div>
          </div>
        </div>
        {featureLines.length > 0 && (
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>TÍNH NĂNG NỔI BẬT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {featureLines.slice(0, 10).map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, borderRadius: 6, padding: "6px 9px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: color }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: D.textPrimary, lineHeight: 1.4 }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>BẢNG GIÁ</div>
          {hasSizes ? (
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(201,168,76,0.25)" }}>
              <div style={{ padding: "6px 14px", background: "rgba(201,168,76,0.12)", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", gap: 10 }}>
                {["Kích thước", "Mã size", "Đơn giá (VNĐ)"].map((h, i) => (
                  <div key={h} style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.5)", textAlign: i === 2 ? "right" : "left" }}>{h}</div>
                ))}
              </div>
              {product.sizePricings!.map((sp: SizePricing, i: number) => (
                <div key={i} style={{ padding: "7px 14px", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", gap: 10, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: D.textPrimary }}>{sp.label || sp.size}</div>
                  <div style={{ fontSize: 13, fontFamily: "monospace", color: "rgba(255,255,255,0.45)" }}>{sp.size}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: D.gold, textAlign: "right" }}>{sp.price > 0 ? formatVND(sp.price) : "Liên hệ"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ borderRadius: 10, padding: "10px 16px", textAlign: "center", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: D.gold }}>{product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Giá niêm yết chưa VAT</div>
            </div>
          )}
          <div style={{ marginTop: 5, fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>• Giá chưa bao gồm VAT (10%) &nbsp;•&nbsp; Giá có thể thay đổi mà không báo trước</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6, flexShrink: 0 }}>ẢNH THÔNG SỐ KỸ THUẬT</div>
          <div style={{ flex: 1, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: `1px solid ${color}25` }}>
            {specImageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={specImageUrl} alt="Thông số kỹ thuật" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: D.textMuted, fontSize: 12 }}>Ảnh thông số kỹ thuật</div>}
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Gallery ───────────────────────────────────────────────────
function SlideProductGallery({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const colorDim = isBed ? D.purpleDim : D.blueDim;
  const img1 = overrides?.imageDataUrl || product.imageAngle1 || product.imageUrl;
  const img2 = overrides?.image2DataUrl || product.imageAngle2 || product.imageScene || "";
  const img3 = overrides?.image3DataUrl || product.imageScene || product.imageSpec || "";
  const defaultApplications = isBed
    ? ["Căn hộ cao cấp & Penthouse", "Biệt thự & nhà phố", "Khách sạn 4–5 sao", "Không gian cần sự tinh tế"]
    : ["Căn hộ studio & 1PN", "Căn hộ 2–3 phòng ngủ", "Homestay & căn hộ dịch vụ", "Không gian cần tối ưu diện tích"];
  const applications = (overrides?.body ?? defaultApplications.join("\n")).split("\n").filter(Boolean);
  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "22px 40px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, marginBottom: 4 }}>ẢNH THỰC TẾ & ỨNG DỤNG</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, margin: 0 }}>{overrides?.title || product.name}</h3>
          </div>
          <div style={{ fontSize: 11, color: D.textMuted, letterSpacing: "0.15em", flexShrink: 0 }}>4 / 4</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, flexShrink: 0 }}>
          {[img1, img2].map((src, i) => (
            <div key={i} style={{ aspectRatio: "4 / 3", borderRadius: 12, overflow: "hidden", border: `1px solid ${color}30`, background: colorDim }}>
              {src
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={src} alt={`Góc chụp ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: D.textMuted, fontSize: 12 }}>Góc chụp {i + 1}</div>}
            </div>
          ))}
        </div>
        <div style={{ flexShrink: 0, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: D.textMuted, marginBottom: 8, textAlign: "center" }}>PHÂN KHÚC PHÙ HỢP</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {applications.map((app, i) => (
              <div key={i} style={{ padding: "6px 16px", borderRadius: 20, background: colorDim, border: `1px solid ${color}30`, fontSize: 12.5, color: D.textSecondary }}>{app}</div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", borderRadius: 12, border: `1px solid ${color}30`, background: colorDim }}>
          {img3
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={img3} alt="Phối cảnh" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: D.textMuted, fontSize: 12 }}>Phối cảnh</div>}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${D.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 20, width: "auto", objectFit: "contain", opacity: 0.85 }} />
          <div style={{ fontSize: 11, color: D.textMuted }}>smartfurni.vn · Giường & Sofa Thông Minh</div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Why SmartFurni ────────────────────────────────────────────────────
function SlideWhySmartFurni({ overrides }: { overrides?: SlideOverrides }) {
  const defaultReasons = [
    ["🏆", "Chất lượng vượt trội", "Vật liệu nhập khẩu cao cấp, quy trình sản xuất đạt chuẩn ISO, kiểm định nghiêm ngặt từng sản phẩm trước khi xuất xưởng."],
    ["⚡", "Công nghệ thông minh", "Hệ thống điều khiển điện tử tiên tiến, điều chỉnh góc nâng chính xác, kết nối điều khiển từ xa và ứng dụng di động."],
    ["🛡️", "Bảo hành toàn diện", "Khung cơ bảo hành 5 năm, motor điện 3 năm, đệm và vải 1 năm. Hỗ trợ kỹ thuật 24/7 trong suốt thời gian bảo hành."],
    ["🚚", "Dịch vụ trọn gói", "Giao hàng và lắp đặt miễn phí trong bán kính 30km TP.HCM. Thời gian giao hàng 7–14 ngày làm việc sau xác nhận đơn."],
    ["💎", "Thiết kế sang trọng", "Ngôn ngữ thiết kế tối giản, tinh tế. Phù hợp với không gian nội thất cao cấp, căn hộ penthouse, biệt thự."],
    ["🤝", "Hỗ trợ chuyên nghiệp", "Đội ngũ tư vấn chuyên nghiệp, hỗ trợ thiết kế không gian, báo giá dự án và chính sách đặc biệt cho đối tác B2B."],
  ];
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const reasons = bodyLines.length > 0
    ? bodyLines.map(line => { const parts = line.split(" — "); return [parts[0] ?? "✓", parts[1] ?? line, parts[2] ?? ""]; })
    : defaultReasons;
  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>LÝ DO LỰA CHỌN</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }}>{overrides?.title || "Tại Sao Chọn SmartFurni?"}</h2>
          <div style={{ width: 56, height: 2, background: D.gold, marginTop: 10 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1 }}>
          {reasons.map((r, i) => (
            <div key={i} style={{ borderRadius: 16, padding: "18px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{r[0]}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: D.textPrimary }}>{r[1]}</div>
              {r[2] && <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.5)" }}>{r[2]}</div>}
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Warranty ─────────────────────────────────────────────────────────
function SlideWarranty({ overrides }: { overrides?: SlideOverrides }) {
  const defaultTerms = [
    "Sản phẩm được sử dụng đúng mục đích và hướng dẫn sử dụng",
    "Không tự ý tháo lắp, sửa chữa hoặc thay thế linh kiện",
    "Hư hỏng do thiên tai, điện áp bất thường không thuộc diện bảo hành",
    "Xuất trình hóa đơn mua hàng khi yêu cầu bảo hành",
  ];
  const terms = (overrides?.body ?? defaultTerms.join("\n")).split("\n").filter(Boolean);
  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>CHÍNH SÁCH</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }}>{overrides?.title || "Chính Sách Bảo Hành"}</h2>
          <div style={{ width: 56, height: 2, background: D.gold, marginTop: 10 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
          {[
            { yearKey: "w1_year", labelKey: "w1_label", descKey: "w1_desc", defaultYear: "5", defaultLabel: "Khung cơ", defaultDesc: "Khung thép mạ kẽm, hàn điểm công nghiệp" },
            { yearKey: "w2_year", labelKey: "w2_label", descKey: "w2_desc", defaultYear: "3", defaultLabel: "Motor điện", defaultDesc: "Động cơ nâng đầu & nâng chân độc lập" },
            { yearKey: "w3_year", labelKey: "w3_label", descKey: "w3_desc", defaultYear: "1", defaultLabel: "Đệm & vải", defaultDesc: "Đệm foam cao cấp, vải bọc chống bẩn" },
          ].map(({ yearKey, labelKey, descKey, defaultYear, defaultLabel, defaultDesc }) => (
            <div key={yearKey} style={{ borderRadius: 16, padding: "20px 12px", textAlign: "center", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: D.gold, textAlign: "center", display: "block" }}>{(overrides as any)?.[yearKey] || defaultYear}</div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: D.gold, marginBottom: 6 }}>NĂM</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: D.textPrimary, marginBottom: 4 }}>{(overrides as any)?.[labelKey] || defaultLabel}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{(overrides as any)?.[descKey] || defaultDesc}</div>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 16, padding: "18px 22px", marginBottom: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: D.textPrimary, marginBottom: 12 }}>{(overrides as any)?.terms_title || "Điều kiện bảo hành"}</div>
          {terms.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: D.gold, flexShrink: 0, marginTop: 5 }} />
              <span style={{ fontSize: 14, color: "rgba(245,237,214,0.7)", lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 16, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <span style={{ fontSize: 30 }}>📞</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: D.textPrimary, display: "block" }}>{(overrides as any)?.hotline_label || "Hotline hỗ trợ kỹ thuật"}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: D.gold, display: "block" }}>{(overrides as any)?.hotline_number || "1800 6868"}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", display: "block" }}>{(overrides as any)?.hotline_hours || "Thứ 2 – Thứ 7, 8:00 – 18:00"}</div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Contact ───────────────────────────────────────────────────────────
function SlideContact({ today, overrides }: { today: string; overrides?: SlideOverrides }) {
  const contactItems = [
    { icon: "📞", labelKey: "c1_label", valueKey: "c1_value", subKey: "c1_sub", defaultLabel: "Hotline", defaultValue: "1800 6868", defaultSub: "Miễn phí · Thứ 2–7, 8:00–18:00" },
    { icon: "✉️", labelKey: "c2_label", valueKey: "c2_value", subKey: "c2_sub", defaultLabel: "Email", defaultValue: "sales@smartfurni.vn", defaultSub: "Phản hồi trong 2 giờ làm việc" },
    { icon: "🌐", labelKey: "c3_label", valueKey: "c3_value", subKey: "c3_sub", defaultLabel: "Website", defaultValue: "smartfurni.vn", defaultSub: "Xem thêm sản phẩm & khuyến mãi" },
    { icon: "📍", labelKey: "c4_label", valueKey: "c4_value", subKey: "c4_sub", defaultLabel: "Showroom", defaultValue: "TP. Hồ Chí Minh", defaultSub: "Đặt lịch tham quan miễn phí" },
  ];
  return (
    <SlideShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", textAlign: "center" }}>
        <div style={{ marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 80, width: "auto", objectFit: "contain" }} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.4em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>LIÊN HỆ</div>
        <h2 style={{ fontSize: 36, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING, marginBottom: 8 }}>{overrides?.title || "Thông Tin Liên Hệ"}</h2>
        <div style={{ width: 56, height: 2, background: D.gold, marginBottom: 28 }} />
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {contactItems.map(c => (
            <div key={c.labelKey} style={{ display: "flex", alignItems: "center", gap: 16, borderRadius: 16, padding: "14px 20px", textAlign: "left", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{(overrides as any)?.[c.labelKey] || c.defaultLabel}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: D.textPrimary, fontFamily: FONT_HEADING }}>{(overrides as any)?.[c.valueKey] || c.defaultValue}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{(overrides as any)?.[c.subKey] || c.defaultSub}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 16, padding: "16px 28px", textAlign: "center", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", width: "100%", maxWidth: 440 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: D.gold, marginBottom: 4 }}>{overrides?.subtitle || "Nhận báo giá ngay hôm nay"}</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{overrides?.body || "Liên hệ để được tư vấn miễn phí và nhận ưu đãi đặc biệt"}</div>
        </div>
      </div>
      <div style={{ padding: "0 48px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
          © {new Date().getFullYear()} SmartFurni · Catalogue phát hành ngày {today} · Giá chưa bao gồm VAT
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Empty ─────────────────────────────────────────────────────────────
function SlideEmpty() {
  return (
    <SlideShell>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}>Slide trống</div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide Renderer ───────────────────────────────────────────────────────────
function SlideRenderer({ slide, product, products, today }: { slide: Slide; product?: CrmProduct; products: CrmProduct[]; today: string }) {
  switch (slide.type) {
    case "cover": return <SlideCover today={today} overrides={slide.overrides} />;
    case "intro": return <SlideIntro overrides={slide.overrides} />;
    case "category_header": return <SlideCategoryHeader category={slide.category!} overrides={slide.overrides} />;
    case "product_intro": return product ? <SlideProductIntro product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "product_feature": return product ? <SlideProductFeature product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "product_pricing": return product ? <SlideProductPricing product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "product_feature_pricing": return product ? <SlideProductFeaturePricing product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "product_full": return product ? <SlideProductFull product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "product_gallery": return product ? <SlideProductGallery product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "why_smartfurni": return <SlideWhySmartFurni overrides={slide.overrides} />;
    case "warranty": return <SlideWarranty overrides={slide.overrides} />;
    case "contact": return <SlideContact today={today} overrides={slide.overrides} />;
    default: return <SlideEmpty />;
  }
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function SlideThumbnail({ slide, product, products, today, isActive, idx, onClick }: {
  slide: Slide; product?: CrmProduct; products: CrmProduct[]; today: string;
  isActive: boolean; idx: number; onClick: () => void;
}) {
  const THUMB_W = 100;
  const THUMB_H = Math.round(THUMB_W * 1123 / 794);
  const scale = THUMB_W / 794;
  return (
    <button
      onClick={onClick}
      style={{
        width: THUMB_W, height: THUMB_H, position: "relative", borderRadius: 6, overflow: "hidden", flexShrink: 0,
        border: isActive ? `2px solid ${D.gold}` : "1px solid rgba(255,255,255,0.1)",
        cursor: "pointer", background: "none", padding: 0, display: "block",
        boxShadow: isActive ? `0 0 12px rgba(201,168,76,0.3)` : "none",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 794, height: 1123, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
        <SlideRenderer slide={slide} product={product} products={products} today={today} />
      </div>
      <div style={{ position: "absolute", bottom: 3, right: 4, fontSize: 9, color: isActive ? D.gold : "rgba(255,255,255,0.4)", fontWeight: 600 }}>{idx + 1}</div>
    </button>
  );
}

// ─── Main Viewer ──────────────────────────────────────────────────────────────
interface CataloguePublicViewerProps {
  initialSlides: Slide[];
  initialProducts: CrmProduct[];
}

export default function CataloguePublicViewer({ initialSlides, initialProducts }: CataloguePublicViewerProps) {
  const [slides] = useState<Slide[]>(initialSlides);
  const [products] = useState<CrmProduct[]>(initialProducts);
  const [activeIdx, setActiveIdx] = useState(0);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const today = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const visibleSlides = slides.filter(s => s.visible !== false);

  // Measure main area to compute scale
  useEffect(() => {
    const el = mainAreaRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const getProduct = useCallback((productId?: string) => {
    if (!productId) return undefined;
    return products.find(p => p.id === productId);
  }, [products]);

  const activeSlide = visibleSlides[activeIdx];

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setActiveIdx(i => Math.min(i + 1, visibleSlides.length - 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setActiveIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visibleSlides.length]);

  const thumbRef = useRef<HTMLDivElement>(null);
  // Auto-scroll thumbnail into view
  useEffect(() => {
    const container = thumbRef.current;
    if (!container) return;
    const thumb = container.children[activeIdx] as HTMLElement;
    if (thumb) thumb.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx]);

  if (visibleSlides.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: D.pageBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: D.textPrimary, marginBottom: 8 }}>Catalogue đang được cập nhật</h1>
        <p style={{ fontSize: 16, color: D.textMuted, marginBottom: 24 }}>Vui lòng quay lại sau hoặc liên hệ trực tiếp để nhận catalogue.</p>
        <Link href="/contact" style={{ padding: "12px 28px", borderRadius: 8, background: D.gold, color: "#000", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
          Liên hệ ngay
        </Link>
      </div>
    );
  }

  // Slide native dimensions (A4)
  const SLIDE_W = 794;
  const SLIDE_H = 1123;
  // Nav bar height estimate (px) for scale calculation
  const NAV_H = 60; // nav buttons + hint text
  const PAD_V = 48; // 24px top + 24px bottom padding

  // Compute scale to fit both width and height of the available area
  const availW = containerSize.w > 0 ? containerSize.w - 64 : 560; // minus horizontal padding
  const availH = containerSize.h > 0 ? containerSize.h - NAV_H - PAD_V : 700;
  const scaleByW = availW / SLIDE_W;
  const scaleByH = availH / SLIDE_H;
  const scale = Math.min(scaleByW, scaleByH, 1); // never upscale
  const displayW = Math.round(SLIDE_W * scale);
  const displayH = Math.round(SLIDE_H * scale);

  return (
    <div style={{ height: "100vh", background: D.pageBg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(13,11,26,0.98)", backdropFilter: "blur(12px)", flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 32, width: "auto" }} />
          </Link>
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: D.textMuted, letterSpacing: "0.05em" }}>CATALOGUE SẢN PHẨM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: D.textMuted }}>{activeIdx + 1} / {visibleSlides.length}</span>
          <Link href="/contact" style={{ padding: "7px 16px", borderRadius: 6, background: D.gold, color: "#000", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            Liên hệ đặt hàng
          </Link>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Thumbnail sidebar */}
        <div ref={thumbRef} style={{ width: 120, flexShrink: 0, background: "rgba(8,7,18,0.9)", borderRight: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", overflowX: "hidden", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
          {visibleSlides.map((slide, idx) => (
            <SlideThumbnail
              key={slide.id}
              slide={slide}
              product={getProduct(slide.productId)}
              products={products}
              today={today}
              isActive={idx === activeIdx}
              idx={idx}
              onClick={() => setActiveIdx(idx)}
            />
          ))}
        </div>

        {/* Main slide area */}
        <div ref={mainAreaRef} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "24px 32px", overflow: "hidden", minHeight: 0 }}>
          {activeSlide && (
            <>
              <div style={{
                width: displayW,
                height: displayH,
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid rgba(201,168,76,0.2)`,
                boxShadow: "0 0 40px rgba(201,168,76,0.1)",
                flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0,
                  width: SLIDE_W, height: SLIDE_H,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}>
                  <SlideRenderer
                    slide={activeSlide}
                    product={getProduct(activeSlide.productId)}
                    products={products}
                    today={today}
                  />
                </div>
              </div>

              {/* Navigation buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20 }}>
                <button
                  onClick={() => setActiveIdx(i => Math.max(i - 1, 0))}
                  disabled={activeIdx === 0}
                  style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: activeIdx === 0 ? "rgba(255,255,255,0.2)" : D.textPrimary, cursor: activeIdx === 0 ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}
                >
                  ← Trước
                </button>
                <span style={{ fontSize: 13, color: D.textMuted, minWidth: 80, textAlign: "center" }}>
                  {activeIdx + 1} / {visibleSlides.length}
                </span>
                <button
                  onClick={() => setActiveIdx(i => Math.min(i + 1, visibleSlides.length - 1))}
                  disabled={activeIdx === visibleSlides.length - 1}
                  style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: activeIdx === visibleSlides.length - 1 ? "rgba(255,255,255,0.2)" : D.textPrimary, cursor: activeIdx === visibleSlides.length - 1 ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}
                >
                  Tiếp →
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                Dùng phím ← → để điều hướng
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
