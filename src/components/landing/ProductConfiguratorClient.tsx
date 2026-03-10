"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { Product } from "@/lib/product-store";
import type { SiteTheme } from "@/lib/theme-types";
import { useCart } from "@/lib/cart-context";

interface Props {
  product: Product;
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

// Frame material options
const FRAME_MATERIALS = [
  { id: "steel", label: "Thép không gỉ", desc: "Bền bỉ, chịu lực tốt", priceAdd: 0, icon: "🔩" },
  { id: "aluminum", label: "Nhôm cao cấp", desc: "Nhẹ, chống oxy hóa", priceAdd: 2_000_000, icon: "✨" },
  { id: "carbon", label: "Carbon fiber", desc: "Siêu nhẹ, cứng cáp", priceAdd: 8_000_000, icon: "⚡" },
];

// Upholstery color options
const FABRIC_COLORS = [
  { id: "charcoal", label: "Đen than", hex: "#2D2D2D", accent: "#4A4A4A" },
  { id: "ivory", label: "Trắng ngà", hex: "#F5F0E8", accent: "#E8E0D0" },
  { id: "navy", label: "Xanh navy", hex: "#1E3A5F", accent: "#2A4F80" },
  { id: "sage", label: "Xanh rêu", hex: "#4A6741", accent: "#5C7D52" },
  { id: "blush", label: "Hồng nhạt", hex: "#C4857A", accent: "#D4958A" },
  { id: "gold", label: "Vàng đồng", hex: "#C9A84C", accent: "#D4B86A" },
];

// Size options
const BED_SIZES = [
  { id: "single", label: "Đơn", dim: "90×200 cm", priceAdd: -5_000_000, icon: "🛏" },
  { id: "double", label: "Đôi", dim: "140×200 cm", priceAdd: 0, icon: "🛏" },
  { id: "queen", label: "Queen", dim: "160×200 cm", priceAdd: 3_000_000, icon: "🛏" },
  { id: "king", label: "King", dim: "180×200 cm", priceAdd: 6_000_000, icon: "🛏" },
];

// Headboard style options
const HEADBOARD_STYLES = [
  { id: "flat", label: "Phẳng", desc: "Tối giản, hiện đại" },
  { id: "curved", label: "Cong nhẹ", desc: "Mềm mại, sang trọng" },
  { id: "tufted", label: "Bọc nút", desc: "Cổ điển, tinh tế" },
  { id: "panel", label: "Ô vuông", desc: "Hình học, cá tính" },
];

// Leg finish options
const LEG_FINISHES = [
  { id: "chrome", label: "Chrome", hex: "#C0C0C0" },
  { id: "black", label: "Đen mờ", hex: "#2A2A2A" },
  { id: "gold", label: "Vàng", hex: "#C9A84C" },
  { id: "wood", label: "Gỗ sồi", hex: "#8B6914" },
];

// Bed SVG Preview — renders based on config
function BedPreview({
  fabricColor,
  legFinish,
  headboardStyle,
  size,
  headAngle,
  footAngle,
}: {
  fabricColor: (typeof FABRIC_COLORS)[0];
  legFinish: (typeof LEG_FINISHES)[0];
  headboardStyle: string;
  size: string;
  headAngle: number;
  footAngle: number;
}) {
  const w = size === "single" ? 220 : size === "double" ? 280 : size === "queen" ? 300 : 320;
  const h = 180;
  const cx = 200;
  const cy = 120;
  const fw = w;
  const fh = h;

  // Head section height based on angle
  const headH = 55 + headAngle * 0.6;
  const footH = 30 + footAngle * 0.4;

  return (
    <svg viewBox="0 0 400 260" width="100%" height="100%" style={{ maxHeight: 280 }}>
      {/* Shadow */}
      <ellipse cx={cx} cy={cy + fh / 2 + 18} rx={fw / 2 + 10} ry={12} fill="rgba(0,0,0,0.25)" />

      {/* Bed frame base */}
      <rect
        x={cx - fw / 2}
        y={cy - fh / 2 + headH - 30}
        width={fw}
        height={fh - headH + 30 - footH + 20}
        rx={6}
        fill={fabricColor.hex}
        stroke={fabricColor.accent}
        strokeWidth="1.5"
      />

      {/* Head section (elevated) */}
      <rect
        x={cx - fw / 2 + 4}
        y={cy - fh / 2}
        width={fw - 8}
        height={headH}
        rx={8}
        fill={fabricColor.hex}
        stroke={fabricColor.accent}
        strokeWidth="1.5"
      />

      {/* Foot section (elevated) */}
      <rect
        x={cx - fw / 2 + 4}
        y={cy + fh / 2 - footH}
        width={fw - 8}
        height={footH}
        rx={6}
        fill={fabricColor.hex}
        stroke={fabricColor.accent}
        strokeWidth="1.5"
      />

      {/* Pillows */}
      <rect x={cx - fw / 2 + 14} y={cy - fh / 2 + 8} width={fw / 2 - 22} height={28} rx={10}
        fill={fabricColor.accent} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <rect x={cx + 8} y={cy - fh / 2 + 8} width={fw / 2 - 22} height={28} rx={10}
        fill={fabricColor.accent} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

      {/* Headboard */}
      {headboardStyle === "flat" && (
        <rect x={cx - fw / 2 - 4} y={cy - fh / 2 - 40} width={fw + 8} height={44} rx={4}
          fill={fabricColor.hex} stroke={fabricColor.accent} strokeWidth="2" />
      )}
      {headboardStyle === "curved" && (
        <path
          d={`M${cx - fw / 2 - 4},${cy - fh / 2 + 4} Q${cx},${cy - fh / 2 - 55} ${cx + fw / 2 + 4},${cy - fh / 2 + 4}`}
          fill={fabricColor.hex} stroke={fabricColor.accent} strokeWidth="2"
        />
      )}
      {headboardStyle === "tufted" && (
        <>
          <rect x={cx - fw / 2 - 4} y={cy - fh / 2 - 44} width={fw + 8} height={48} rx={4}
            fill={fabricColor.hex} stroke={fabricColor.accent} strokeWidth="2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <circle key={i} cx={cx - fw / 2 + 20 + i * (fw / 5)} cy={cy - fh / 2 - 20}
              r={4} fill={fabricColor.accent} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          ))}
        </>
      )}
      {headboardStyle === "panel" && (
        <>
          <rect x={cx - fw / 2 - 4} y={cy - fh / 2 - 44} width={fw + 8} height={48} rx={4}
            fill={fabricColor.hex} stroke={fabricColor.accent} strokeWidth="2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <rect key={i} x={cx - fw / 2 + 8 + i * (fw / 3)} y={cy - fh / 2 - 38}
              width={fw / 3 - 12} height={36} rx={3}
              fill="transparent" stroke={fabricColor.accent} strokeWidth="1.2" />
          ))}
        </>
      )}

      {/* Legs */}
      {[
        [cx - fw / 2 + 10, cy + fh / 2 - 4],
        [cx + fw / 2 - 10, cy + fh / 2 - 4],
        [cx - fw / 2 + 10, cy - fh / 2 + headH - 10],
        [cx + fw / 2 - 10, cy - fh / 2 + headH - 10],
      ].map(([lx, ly], i) => (
        <rect key={i} x={lx - 5} y={ly} width={10} height={22} rx={3}
          fill={legFinish.hex} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      ))}

      {/* Angle indicators */}
      {headAngle > 0 && (
        <text x={cx - fw / 2 + 8} y={cy - fh / 2 + headH / 2}
          fill="rgba(255,255,255,0.5)" fontSize="10" fontWeight="bold">
          {headAngle}°
        </text>
      )}
      {footAngle > 0 && (
        <text x={cx - fw / 2 + 8} y={cy + fh / 2 - footH / 2}
          fill="rgba(255,255,255,0.5)" fontSize="10" fontWeight="bold">
          {footAngle}°
        </text>
      )}
    </svg>
  );
}

export default function ProductConfiguratorClient({ product, theme }: Props) {
  const { colors } = theme;
  const { addItem } = useCart();

  const [fabricColor, setFabricColor] = useState(FABRIC_COLORS[0]);
  const [frameMaterial, setFrameMaterial] = useState(FRAME_MATERIALS[0]);
  const [bedSize, setBedSize] = useState(BED_SIZES[1]); // default: double
  const [headboardStyle, setHeadboardStyle] = useState(HEADBOARD_STYLES[0].id);
  const [legFinish, setLegFinish] = useState(LEG_FINISHES[0]);
  const [headAngle, setHeadAngle] = useState(0);
  const [footAngle, setFootAngle] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  const configPrice = useMemo(
    () => product.price + frameMaterial.priceAdd + bedSize.priceAdd,
    [product.price, frameMaterial.priceAdd, bedSize.priceAdd]
  );

  const configSummary = useMemo(() => {
    const parts = [
      `Màu ${fabricColor.label}`,
      `Khung ${frameMaterial.label}`,
      `Size ${bedSize.label} (${bedSize.dim})`,
      `Đầu giường ${HEADBOARD_STYLES.find((h) => h.id === headboardStyle)?.label}`,
      `Chân ${legFinish.label}`,
    ];
    return parts.join(" · ");
  }, [fabricColor, frameMaterial, bedSize, headboardStyle, legFinish]);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: `${product.name} (${fabricColor.label}, ${bedSize.label})`,
      slug: product.slug,
      variantId: `${product.id}-custom-${fabricColor.id}-${bedSize.id}`,
      variantName: `${fabricColor.label} / ${bedSize.label}`,
      sku: `${product.variants[0]?.sku ?? product.id}-CUSTOM`,
      price: configPrice,
      originalPrice: product.originalPrice + frameMaterial.priceAdd + bedSize.priceAdd,
      coverImage: product.coverImage,
      quantity: 1,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      <div style={{ maxWidth: 1200 }} className="mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-[#F5EDD6]/40 mb-3">
            <Link href="/" className="hover:text-[#C9A84C] transition-colors">Trang chủ</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-[#C9A84C] transition-colors">Sản phẩm</Link>
            <span>/</span>
            <Link href={`/products/${product.slug}`} className="hover:text-[#C9A84C] transition-colors">{product.name}</Link>
            <span>/</span>
            <span style={{ color: colors.primary }}>Cấu hình</span>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-[#F5EDD6]">
                Cấu hình <span style={{ color: colors.primary }} className="font-semibold">{product.name}</span>
              </h1>
              <p className="text-sm text-[#F5EDD6]/50 mt-1">Tùy chỉnh màu sắc, vật liệu và kích thước theo sở thích của bạn</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Preview */}
          <div className="lg:col-span-3 space-y-4">
            {/* 3D Preview */}
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.surface} 100%)`,
                borderColor: colors.border,
              }}
              className="rounded-2xl border p-6 flex flex-col items-center"
            >
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: colors.primary }} className="text-xs font-medium tracking-wider uppercase">Preview trực tiếp</span>
                <span className="text-xs text-[#F5EDD6]/30">• Cập nhật theo lựa chọn</span>
              </div>

              {/* Bed SVG preview */}
              <div className="w-full" style={{ maxWidth: 420 }}>
                <BedPreview
                  fabricColor={fabricColor}
                  legFinish={legFinish}
                  headboardStyle={headboardStyle}
                  size={bedSize.id}
                  headAngle={headAngle}
                  footAngle={footAngle}
                />
              </div>

              {/* Angle controls */}
              <div className="w-full mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#F5EDD6]/50">Góc đầu giường</span>
                    <span style={{ color: colors.primary }} className="text-xs font-bold">{headAngle}°</span>
                  </div>
                  <input
                    type="range" min={0} max={70} step={5} value={headAngle}
                    onChange={(e) => setHeadAngle(Number(e.target.value))}
                    className="w-full accent-[#C9A84C] h-1"
                  />
                  <div className="flex justify-between text-[10px] text-[#F5EDD6]/25 mt-0.5">
                    <span>0°</span><span>35°</span><span>70°</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#F5EDD6]/50">Góc chân giường</span>
                    <span style={{ color: colors.primary }} className="text-xs font-bold">{footAngle}°</span>
                  </div>
                  <input
                    type="range" min={0} max={45} step={5} value={footAngle}
                    onChange={(e) => setFootAngle(Number(e.target.value))}
                    className="w-full accent-[#C9A84C] h-1"
                  />
                  <div className="flex justify-between text-[10px] text-[#F5EDD6]/25 mt-0.5">
                    <span>0°</span><span>22°</span><span>45°</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Config summary */}
            <div
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-xl border p-4"
            >
              <p className="text-xs text-[#F5EDD6]/40 mb-1">Cấu hình hiện tại</p>
              <p className="text-sm text-[#F5EDD6]/70">{configSummary}</p>
            </div>
          </div>

          {/* Right: Config options */}
          <div className="lg:col-span-2 space-y-5">
            {/* Fabric color */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#F5EDD6]">Màu sắc bọc nệm</h3>
                <span style={{ color: colors.primary }} className="text-xs font-medium">{fabricColor.label}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {FABRIC_COLORS.map((fc) => (
                  <button
                    key={fc.id}
                    onClick={() => setFabricColor(fc)}
                    title={fc.label}
                    style={{
                      backgroundColor: fc.hex,
                      borderColor: fabricColor.id === fc.id ? colors.primary : "transparent",
                      boxShadow: fabricColor.id === fc.id ? `0 0 0 3px ${colors.primary}40` : "none",
                    }}
                    className="w-9 h-9 rounded-full border-2 transition-all duration-200 hover:scale-110"
                  />
                ))}
              </div>
            </div>

            {/* Frame material */}
            <div>
              <h3 className="text-sm font-semibold text-[#F5EDD6] mb-3">Chất liệu khung</h3>
              <div className="space-y-2">
                {FRAME_MATERIALS.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => setFrameMaterial(mat)}
                    style={{
                      backgroundColor: frameMaterial.id === mat.id ? `${colors.primary}15` : colors.surface,
                      borderColor: frameMaterial.id === mat.id ? colors.primary : colors.border,
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200"
                  >
                    <span className="text-lg">{mat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p style={{ color: frameMaterial.id === mat.id ? colors.primary : "#F5EDD6" }} className="text-sm font-medium">{mat.label}</p>
                      <p className="text-xs text-[#F5EDD6]/40">{mat.desc}</p>
                    </div>
                    {mat.priceAdd !== 0 && (
                      <span style={{ color: mat.priceAdd > 0 ? colors.warning : colors.success }} className="text-xs font-semibold flex-shrink-0">
                        {mat.priceAdd > 0 ? "+" : ""}{formatPrice(mat.priceAdd)}
                      </span>
                    )}
                    {mat.priceAdd === 0 && (
                      <span className="text-xs text-[#F5EDD6]/30 flex-shrink-0">Tiêu chuẩn</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bed size */}
            <div>
              <h3 className="text-sm font-semibold text-[#F5EDD6] mb-3">Kích thước</h3>
              <div className="grid grid-cols-2 gap-2">
                {BED_SIZES.map((sz) => (
                  <button
                    key={sz.id}
                    onClick={() => setBedSize(sz)}
                    style={{
                      backgroundColor: bedSize.id === sz.id ? `${colors.primary}15` : colors.surface,
                      borderColor: bedSize.id === sz.id ? colors.primary : colors.border,
                    }}
                    className="p-3 rounded-xl border text-left transition-all duration-200"
                  >
                    <p style={{ color: bedSize.id === sz.id ? colors.primary : "#F5EDD6" }} className="text-sm font-semibold">{sz.label}</p>
                    <p className="text-xs text-[#F5EDD6]/40">{sz.dim}</p>
                    {sz.priceAdd !== 0 && (
                      <p style={{ color: sz.priceAdd > 0 ? colors.warning : colors.success }} className="text-xs font-medium mt-1">
                        {sz.priceAdd > 0 ? "+" : ""}{formatPrice(sz.priceAdd)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Headboard style */}
            <div>
              <h3 className="text-sm font-semibold text-[#F5EDD6] mb-3">Kiểu đầu giường</h3>
              <div className="grid grid-cols-2 gap-2">
                {HEADBOARD_STYLES.map((hs) => (
                  <button
                    key={hs.id}
                    onClick={() => setHeadboardStyle(hs.id)}
                    style={{
                      backgroundColor: headboardStyle === hs.id ? `${colors.primary}15` : colors.surface,
                      borderColor: headboardStyle === hs.id ? colors.primary : colors.border,
                    }}
                    className="p-3 rounded-xl border text-left transition-all duration-200"
                  >
                    <p style={{ color: headboardStyle === hs.id ? colors.primary : "#F5EDD6" }} className="text-sm font-medium">{hs.label}</p>
                    <p className="text-xs text-[#F5EDD6]/40">{hs.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Leg finish */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#F5EDD6]">Màu chân giường</h3>
                <span style={{ color: colors.primary }} className="text-xs font-medium">{legFinish.label}</span>
              </div>
              <div className="flex gap-3">
                {LEG_FINISHES.map((lf) => (
                  <button
                    key={lf.id}
                    onClick={() => setLegFinish(lf)}
                    title={lf.label}
                    style={{
                      backgroundColor: lf.hex,
                      borderColor: legFinish.id === lf.id ? colors.primary : "transparent",
                      boxShadow: legFinish.id === lf.id ? `0 0 0 3px ${colors.primary}40` : "none",
                    }}
                    className="w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110"
                  />
                ))}
              </div>
            </div>

            {/* Price & CTA */}
            <div
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-2xl border p-4 space-y-3"
            >
              <div>
                <p className="text-xs text-[#F5EDD6]/40 mb-1">Giá cấu hình này</p>
                <div className="flex items-baseline gap-2">
                  <span style={{ color: colors.primary }} className="text-2xl font-bold">{formatPrice(configPrice)}</span>
                  {configPrice !== product.price && (
                    <span className="text-sm text-[#F5EDD6]/30 line-through">{formatPrice(product.price)}</span>
                  )}
                </div>
                {frameMaterial.priceAdd !== 0 || bedSize.priceAdd !== 0 ? (
                  <p className="text-xs text-[#F5EDD6]/40 mt-0.5">
                    Giá cơ bản {formatPrice(product.price)}
                    {frameMaterial.priceAdd !== 0 && ` + khung ${formatPrice(frameMaterial.priceAdd)}`}
                    {bedSize.priceAdd !== 0 && ` + size ${formatPrice(bedSize.priceAdd)}`}
                  </p>
                ) : null}
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.status !== "active"}
                style={{
                  background: product.status === "active"
                    ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                    : colors.border,
                  color: product.status === "active" ? colors.background : `${colors.text}40`,
                }}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              >
                {addedToCart ? "✓ Đã thêm vào giỏ hàng!" : product.status === "coming_soon" ? "Đặt trước cấu hình này" : "Thêm vào giỏ hàng"}
              </button>

              <Link
                href="/checkout"
                onClick={handleAddToCart}
                style={{
                  borderColor: colors.primary,
                  color: colors.primary,
                }}
                className="w-full py-3 rounded-xl text-sm font-bold border text-center block hover:opacity-80 transition-opacity"
              >
                Mua ngay →
              </Link>

              <p className="text-xs text-[#F5EDD6]/30 text-center">
                🔒 Thời gian sản xuất: 7–14 ngày · Bảo hành {product.specs["Bảo hành"] ?? "5 năm"}
              </p>
            </div>

            {/* Back to product */}
            <Link
              href={`/products/${product.slug}`}
              className="flex items-center gap-1.5 text-xs text-[#F5EDD6]/40 hover:text-[#C9A84C] transition-colors"
            >
              ← Quay lại trang sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
