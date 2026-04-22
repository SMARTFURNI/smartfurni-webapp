"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { Product } from "@/lib/product-store";
import type { SiteTheme } from "@/lib/theme-types";
import { ScrollReveal } from "./ScrollReveal";

interface Props {
  products: Product[];
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

// Score dimensions for radar chart
const SCORE_DIMS: { key: string; label: string; icon: string }[] = [
  { key: "comfort", label: "Thoải mái", icon: "🛏️" },
  { key: "tech", label: "Công nghệ", icon: "⚡" },
  { key: "health", label: "Sức khỏe", icon: "❤️" },
  { key: "value", label: "Giá trị", icon: "💰" },
  { key: "smart", label: "Smart Home", icon: "🏠" },
];

function computeScores(product: Product): Record<string, number> {
  const hasFeat = (kws: string[]) =>
    kws.some((kw) => product.features.some((f) => f.toLowerCase().includes(kw.toLowerCase())));

  const comfort =
    (hasFeat(["massage"]) ? 25 : 0) +
    (hasFeat(["điều chỉnh đầu", "điều chỉnh chân"]) ? 30 : 0) +
    (hasFeat(["không trọng lực", "zero gravity"]) ? 25 : 0) +
    (product.rating >= 4.5 ? 20 : product.rating >= 4 ? 12 : 5);

  const tech =
    (hasFeat(["bluetooth"]) ? 20 : 0) +
    (hasFeat(["app", "ứng dụng"]) ? 20 : 0) +
    (hasFeat(["giọng nói"]) ? 20 : 0) +
    (hasFeat(["màn hình", "touchscreen"]) ? 20 : 0) +
    (hasFeat(["chip", "ai"]) ? 20 : 0);

  const health =
    (hasFeat(["theo dõi giấc ngủ", "sleep tracking", "ai sleep"]) ? 35 : 0) +
    (hasFeat(["chống ngáy"]) ? 25 : 0) +
    (hasFeat(["tự động điều chỉnh"]) ? 25 : 0) +
    (hasFeat(["báo cáo giấc ngủ"]) ? 15 : 0);

  const priceScore =
    product.price < 10_000_000 ? 95 :
    product.price < 25_000_000 ? 80 :
    product.price < 45_000_000 ? 60 :
    product.price < 60_000_000 ? 40 : 25;
  const value = Math.round(priceScore * 0.6 + product.rating * 8);

  const smart =
    (hasFeat(["google home", "homekit", "alexa"]) ? 35 : 0) +
    (hasFeat(["giọng nói"]) ? 25 : 0) +
    (hasFeat(["tự động"]) ? 20 : 0) +
    (hasFeat(["bluetooth"]) ? 20 : 0);

  return {
    comfort: Math.min(100, comfort),
    tech: Math.min(100, tech),
    health: Math.min(100, health),
    value: Math.min(100, value),
    smart: Math.min(100, smart),
  };
}

function computeOverallScore(scores: Record<string, number>) {
  const vals = Object.values(scores);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// Radar chart SVG
function RadarChart({
  scores,
  color,
  size = 160,
}: {
  scores: Record<string, number>;
  color: string;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const dims = SCORE_DIMS.map((d) => d.key);
  const n = dims.length;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const getPoint = (i: number, radius: number) => {
    const angle = startAngle + i * angleStep;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Grid lines at 25%, 50%, 75%, 100%
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPaths = gridLevels.map((level) => {
    const pts = dims.map((_, i) => getPoint(i, r * level));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  });

  // Data polygon
  const dataPts = dims.map((key, i) => getPoint(i, r * (scores[key] ?? 0) / 100));
  const dataPath = dataPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  // Axis lines
  const axisLines = dims.map((_, i) => {
    const end = getPoint(i, r);
    return { x1: cx, y1: cy, x2: end.x, y2: end.y };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={`${color}20`} strokeWidth="0.8" />
      ))}
      {/* Axes */}
      {axisLines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={`${color}25`} strokeWidth="0.8" />
      ))}
      {/* Data fill */}
      <path d={dataPath} fill={`${color}25`} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Data points */}
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
      {/* Labels */}
      {dims.map((key, i) => {
        const labelPt = getPoint(i, r * 1.22);
        const dim = SCORE_DIMS.find((d) => d.key === key)!;
        return (
          <text
            key={i}
            x={labelPt.x}
            y={labelPt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fill={`${color}80`}
          >
            {dim.icon}
          </text>
        );
      })}
    </svg>
  );
}

// Score bar component
function ScoreBar({ score, color, label }: { score: number; color: string; label: string }) {
  const grade = score >= 85 ? "S" : score >= 70 ? "A" : score >= 55 ? "B" : score >= 40 ? "C" : "D";
  const gradeColor = score >= 85 ? "#22C55E" : score >= 70 ? "#84CC16" : score >= 55 ? "#F59E0B" : score >= 40 ? "#F97316" : "#EF4444";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#F5EDD6]/50 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          style={{ width: `${score}%`, backgroundColor: color }}
          className="h-full rounded-full transition-all duration-700"
        />
      </div>
      <span style={{ color: gradeColor }} className="text-xs font-bold w-5 text-right">{grade}</span>
    </div>
  );
}

const COMPARE_ROWS: { key: string; label: string; section: string }[] = [
  { key: "price", label: "Giá bán", section: "Giá & Bảo hành" },
  { key: "warranty", label: "Bảo hành", section: "Giá & Bảo hành" },
  { key: "Kích thước", label: "Kích thước", section: "Thông số kỹ thuật" },
  { key: "Chất liệu khung", label: "Chất liệu khung", section: "Thông số kỹ thuật" },
  { key: "Động cơ", label: "Động cơ", section: "Thông số kỹ thuật" },
  { key: "Tiếng ồn", label: "Tiếng ồn", section: "Thông số kỹ thuật" },
  { key: "f_adjust_head", label: "Điều chỉnh đầu giường", section: "Tính năng điều chỉnh" },
  { key: "f_adjust_foot", label: "Điều chỉnh chân giường", section: "Tính năng điều chỉnh" },
  { key: "f_remote", label: "Remote không dây", section: "Tính năng điều chỉnh" },
  { key: "f_app", label: "App iOS/Android", section: "Tính năng điều chỉnh" },
  { key: "f_massage", label: "Massage tích hợp", section: "Tính năng cao cấp" },
  { key: "f_led", label: "Đèn LED RGB", section: "Tính năng cao cấp" },
  { key: "f_bluetooth", label: "Bluetooth 5.0", section: "Tính năng cao cấp" },
  { key: "f_speaker", label: "Loa tích hợp", section: "Tính năng cao cấp" },
  { key: "f_wireless_charge", label: "Sạc không dây", section: "Tính năng cao cấp" },
  { key: "f_ai_sleep", label: "AI theo dõi giấc ngủ", section: "AI & Smart Home" },
  { key: "f_voice", label: "Điều khiển giọng nói", section: "AI & Smart Home" },
  { key: "f_auto_adjust", label: "Tự động điều chỉnh", section: "AI & Smart Home" },
  { key: "f_smart_home", label: "Google Home / HomeKit", section: "AI & Smart Home" },
  { key: "f_sleep_report", label: "Báo cáo giấc ngủ", section: "AI & Smart Home" },
];

function getProductValue(product: Product, key: string): string | boolean {
  if (key === "price") return formatPrice(product.price);
  if (key === "warranty") return product.specs["Bảo hành"] ?? "—";
  if (key.startsWith("f_")) {
    const featureMap: Record<string, string[]> = {
      f_adjust_head: ["Điều chỉnh đầu giường"],
      f_adjust_foot: ["Điều chỉnh chân giường"],
      f_remote: ["Remote không dây"],
      f_app: ["App điều khiển", "App iOS/Android"],
      f_massage: ["Massage"],
      f_led: ["LED", "Đèn LED"],
      f_bluetooth: ["Bluetooth"],
      f_speaker: ["Loa tích hợp"],
      f_wireless_charge: ["Sạc không dây"],
      f_ai_sleep: ["AI Sleep", "AI theo dõi"],
      f_voice: ["giọng nói", "Điều khiển giọng"],
      f_auto_adjust: ["tự động", "Tự động điều chỉnh"],
      f_smart_home: ["Google Home", "HomeKit", "Smart Home"],
      f_sleep_report: ["Báo cáo giấc ngủ"],
    };
    const keywords = featureMap[key] ?? [];
    return keywords.some((kw) =>
      product.features.some((f) => f.toLowerCase().includes(kw.toLowerCase()))
    );
  }
  return product.specs[key] ?? "—";
}

// Product color palette for multi-product comparison
const PRODUCT_COLORS = ["#C9A84C", "#60A5FA", "#34D399", "#F472B6"];

export default function CompareClient({ products, theme }: Props) {
  const { colors } = theme;
  const [selected, setSelected] = useState<string[]>(
    products.slice(0, 3).map((p) => p.id)
  );
  const [viewMode, setViewMode] = useState<"table" | "score">("score");
  const [highlightDiff, setHighlightDiff] = useState(true);

  const selectedProducts = products.filter((p) => selected.includes(p.id));

  const toggleProduct = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length > 2) setSelected(selected.filter((s) => s !== id));
    } else {
      if (selected.length < 4) setSelected([...selected, id]);
    }
  };

  const allScores = useMemo(
    () => selectedProducts.map((p) => ({ id: p.id, scores: computeScores(p) })),
    [selectedProducts]
  );

  const sections = Array.from(new Set(COMPARE_ROWS.map((r) => r.section)));

  // Find best product for each row (for highlighting)
  const bestForRow = useMemo(() => {
    const result: Record<string, string | null> = {};
    COMPARE_ROWS.forEach((row) => {
      if (row.key === "price") {
        // Lowest price wins
        let best: Product | null = null;
        selectedProducts.forEach((p) => {
          if (!best || p.price < best.price) best = p;
        });
        result[row.key] = (best as Product | null)?.id ?? null;
      } else if (row.key.startsWith("f_")) {
        // Boolean: no single "best"
        result[row.key] = null;
      } else {
        result[row.key] = null;
      }
    });
    return result;
  }, [selectedProducts]);

  return (
    <div className="pt-28 sm:pt-32 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <ScrollReveal variant="fadeUp" delay={0}>
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">So sánh</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-[#F5EDD6] mb-3">
            So sánh <span className="font-semibold" style={{ color: colors.primary }}>sản phẩm</span>
          </h1>
          <p className="text-sm text-[#F5EDD6]/50 max-w-xl mx-auto">
            Chọn 2–4 sản phẩm để so sánh. Xem điểm đánh giá tổng thể, biểu đồ radar và bảng tính năng chi tiết.
          </p>
        </div>
        </ScrollReveal>

        {/* Product selector */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {products.map((p, idx) => {
            const isSelected = selected.includes(p.id);
            const selIdx = selected.indexOf(p.id);
            const productColor = isSelected ? PRODUCT_COLORS[selIdx] : undefined;
            const disc = p.originalPrice > p.price
              ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
              : 0;
            return (
              <button
                key={p.id}
                onClick={() => toggleProduct(p.id)}
                style={isSelected
                  ? { backgroundColor: `${productColor}20`, color: productColor, borderColor: productColor }
                  : { backgroundColor: colors.surface, borderColor: colors.border, color: `${colors.text}60` }
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200"
              >
                {isSelected && (
                  <span
                    style={{ backgroundColor: productColor, color: "#000" }}
                    className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold"
                  >
                    {selIdx + 1}
                  </span>
                )}
                <span>{p.name}</span>
                {disc > 0 && <span className="text-xs opacity-60">-{disc}%</span>}
              </button>
            );
          })}
        </div>

        {/* View mode toggle + options */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: colors.surface }}>
            {(["score", "table"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={viewMode === mode
                  ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }
                  : { color: `${colors.text}50` }
                }
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              >
                {mode === "score" ? "📊 Điểm & Radar" : "📋 Bảng chi tiết"}
              </button>
            ))}
          </div>
          {viewMode === "table" && (
            <button
              onClick={() => setHighlightDiff(!highlightDiff)}
              style={{ color: highlightDiff ? colors.primary : `${colors.text}40`, borderColor: highlightDiff ? colors.primary : colors.border }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all duration-200"
            >
              <span>{highlightDiff ? "✓" : "○"}</span>
              Nổi bật sự khác biệt
            </button>
          )}
        </div>

        {/* ─── SCORE VIEW ─── */}
        {viewMode === "score" && (
          <div className="space-y-6">
            {/* Score cards row */}
            <div className={`grid gap-4 ${selectedProducts.length === 2 ? "grid-cols-2" : selectedProducts.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
              {selectedProducts.map((p, idx) => {
                const productColor = PRODUCT_COLORS[idx];
                const scores = allScores.find((s) => s.id === p.id)?.scores ?? {};
                const overall = computeOverallScore(scores);
                const disc = p.originalPrice > p.price
                  ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                  : 0;
                return (
                  <div
                    key={p.id}
                    style={{ backgroundColor: colors.surface, borderColor: `${productColor}40` }}
                    className="rounded-2xl border p-4 flex flex-col gap-3"
                  >
                    {/* Product header */}
                    <div className="flex items-start gap-2">
                      <span
                        style={{ backgroundColor: productColor, color: "#000" }}
                        className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5"
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p style={{ color: `${productColor}90` }} className="text-[10px] font-medium uppercase tracking-wider">
                          {p.category === "standard" ? "Standard" : p.category === "premium" ? "Premium" : "Elite"}
                        </p>
                        <p className="text-sm font-semibold text-[#F5EDD6] leading-tight truncate">{p.name}</p>
                      </div>
                    </div>

                    {/* Product image */}
                    <div
                      style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`, borderColor: `${productColor}20` }}
                      className="w-full h-24 rounded-xl border flex items-center justify-center overflow-hidden"
                    >
                      {p.coverImage ? (
                        <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg viewBox="0 0 120 80" width="100" height="67" fill="none">
                          <rect x="10" y="40" width="100" height="35" rx="5" fill={`${productColor}12`} stroke={`${productColor}30`} strokeWidth="1.5" />
                          <rect x="14" y="30" width="92" height="38" rx="7" fill={`${productColor}18`} stroke={`${productColor}35`} strokeWidth="1.5" />
                          <rect x="4" y="18" width="14" height="50" rx="4" fill={`${productColor}20`} stroke={`${productColor}30`} strokeWidth="1" />
                          <rect x="4" y="73" width="112" height="3" rx="1.5" fill={productColor} opacity="0.5" />
                        </svg>
                      )}
                    </div>

                    {/* Overall score */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#F5EDD6]/40 mb-0.5">Điểm tổng thể</p>
                        <div className="flex items-baseline gap-1">
                          <span style={{ color: productColor }} className="text-2xl font-bold">{overall}</span>
                          <span className="text-xs text-[#F5EDD6]/30">/100</span>
                        </div>
                      </div>
                      <RadarChart scores={scores} color={productColor} size={72} />
                    </div>

                    {/* Score breakdown */}
                    <div className="space-y-1.5">
                      {SCORE_DIMS.map((dim) => (
                        <ScoreBar
                          key={dim.key}
                          score={scores[dim.key] ?? 0}
                          color={productColor}
                          label={dim.label}
                        />
                      ))}
                    </div>

                    {/* Price */}
                    <div className="pt-2 border-t" style={{ borderColor: `${productColor}20` }}>
                      <div className="flex items-baseline gap-2">
                        <span style={{ color: productColor }} className="text-base font-bold">{formatPrice(p.price)}</span>
                        {disc > 0 && (
                          <span className="text-xs text-[#F5EDD6]/30 line-through">{formatPrice(p.originalPrice)}</span>
                        )}
                      </div>
                      {p.reviewCount > 0 && (
                        <p className="text-xs text-[#F5EDD6]/40 mt-0.5">★ {p.rating.toFixed(1)} ({p.reviewCount} đánh giá)</p>
                      )}
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/products/${p.slug}`}
                      style={{ background: `linear-gradient(135deg, ${productColor}, ${productColor}bb)`, color: "#000" }}
                      className="block text-center py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      {p.status === "coming_soon" ? "Đặt trước" : p.status === "out_of_stock" ? "Hết hàng" : "Chọn sản phẩm này →"}
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Full radar comparison */}
            <div
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-2xl border p-6"
            >
              <h3 className="text-sm font-semibold text-[#F5EDD6]/70 mb-5 text-center">Biểu đồ so sánh đa chiều</h3>
              <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
                {/* Combined radar */}
                <div className="relative">
                  <svg width={220} height={220} viewBox="0 0 220 220">
                    {/* Grid */}
                    {[0.25, 0.5, 0.75, 1].map((level) => {
                      const n = SCORE_DIMS.length;
                      const cx = 110, cy = 110, r = 80;
                      const pts = SCORE_DIMS.map((_, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
                        return { x: cx + r * level * Math.cos(angle), y: cy + r * level * Math.sin(angle) };
                      });
                      const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
                      return <path key={level} d={d} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
                    })}
                    {/* Axes */}
                    {SCORE_DIMS.map((dim, i) => {
                      const n = SCORE_DIMS.length;
                      const cx = 110, cy = 110, r = 80;
                      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
                      const ex = cx + r * Math.cos(angle);
                      const ey = cy + r * Math.sin(angle);
                      const lx = cx + r * 1.25 * Math.cos(angle);
                      const ly = cy + r * 1.25 * Math.sin(angle);
                      return (
                        <g key={dim.key}>
                          <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                          <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="rgba(255,255,255,0.35)">
                            {dim.icon} {dim.label}
                          </text>
                        </g>
                      );
                    })}
                    {/* Data polygons per product */}
                    {selectedProducts.map((p, idx) => {
                      const productColor = PRODUCT_COLORS[idx];
                      const scores = allScores.find((s) => s.id === p.id)?.scores ?? {};
                      const n = SCORE_DIMS.length;
                      const cx = 110, cy = 110, r = 80;
                      const pts = SCORE_DIMS.map((dim, i) => {
                        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
                        const val = (scores[dim.key] ?? 0) / 100;
                        return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
                      });
                      const d = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ") + " Z";
                      return (
                        <path key={p.id} d={d} fill={`${productColor}18`} stroke={productColor} strokeWidth="1.5" strokeLinejoin="round" />
                      );
                    })}
                  </svg>
                </div>

                {/* Legend + dim scores */}
                <div className="space-y-3 min-w-[200px]">
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {selectedProducts.map((p, idx) => (
                      <div key={p.id} className="flex items-center gap-1.5">
                        <span style={{ backgroundColor: PRODUCT_COLORS[idx] }} className="w-3 h-3 rounded-full" />
                        <span className="text-xs text-[#F5EDD6]/60">{p.name}</span>
                      </div>
                    ))}
                  </div>
                  {/* Dimension scores */}
                  {SCORE_DIMS.map((dim) => (
                    <div key={dim.key}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">{dim.icon}</span>
                        <span className="text-xs text-[#F5EDD6]/50">{dim.label}</span>
                      </div>
                      <div className="flex gap-2">
                        {selectedProducts.map((p, idx) => {
                          const productColor = PRODUCT_COLORS[idx];
                          const score = allScores.find((s) => s.id === p.id)?.scores[dim.key] ?? 0;
                          return (
                            <div key={p.id} className="flex-1">
                              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                <div style={{ width: `${score}%`, backgroundColor: productColor }} className="h-full rounded-full" />
                              </div>
                              <p style={{ color: `${productColor}90` }} className="text-[10px] text-center mt-0.5">{score}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendation banner */}
            {selectedProducts.length >= 2 && (() => {
              const best = selectedProducts.reduce((a, b) => {
                const sa = computeOverallScore(computeScores(a));
                const sb = computeOverallScore(computeScores(b));
                return sa >= sb ? a : b;
              });
              const bestIdx = selectedProducts.indexOf(best);
              const bestColor = PRODUCT_COLORS[bestIdx];
              return (
                <div
                  style={{ backgroundColor: `${bestColor}12`, borderColor: `${bestColor}30` }}
                  className="rounded-2xl border p-4 flex items-center gap-4"
                >
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p style={{ color: bestColor }} className="text-sm font-bold">{best.name} được đề xuất</p>
                    <p className="text-xs text-[#F5EDD6]/50 mt-0.5">
                      Điểm tổng thể cao nhất trong nhóm so sánh. Cân bằng tốt giữa tính năng, công nghệ và giá trị.
                    </p>
                  </div>
                  <Link
                    href={`/products/${best.slug}`}
                    style={{ background: `linear-gradient(135deg, ${bestColor}, ${bestColor}bb)`, color: "#000" }}
                    className="ml-auto flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Xem ngay →
                  </Link>
                </div>
              );
            })()}
          </div>
        )}

        {/* ─── TABLE VIEW ─── */}
        {viewMode === "table" && (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: colors.border }}>
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
                  <th className="text-left p-4 w-44 text-xs font-medium tracking-wider uppercase text-[#C9A84C]">
                    Tính năng
                  </th>
                  {selectedProducts.map((p, idx) => {
                    const productColor = PRODUCT_COLORS[idx];
                    const disc = p.originalPrice > p.price
                      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                      : 0;
                    return (
                      <th key={p.id} className="p-4 text-center min-w-[180px]">
                        <div className="flex flex-col items-center gap-2">
                          <div
                            style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`, borderColor: `${productColor}30` }}
                            className="w-20 h-14 rounded-lg border flex items-center justify-center overflow-hidden"
                          >
                            {p.coverImage ? (
                              <img src={p.coverImage} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <svg viewBox="0 0 80 50" width="60" height="38" fill="none">
                                <rect x="6" y="25" width="68" height="20" rx="3" fill={`${productColor}15`} stroke={`${productColor}30`} strokeWidth="1" />
                                <rect x="8" y="20" width="64" height="23" rx="4" fill={`${productColor}20`} stroke={`${productColor}35`} strokeWidth="1" />
                                <rect x="5" y="11" width="8" height="32" rx="2" fill={`${productColor}18`} stroke={`${productColor}30`} strokeWidth="1" />
                                <rect x="5" y="43" width="70" height="2" rx="1" fill={productColor} opacity="0.5" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p style={{ color: `${productColor}80` }} className="text-[10px] font-medium uppercase tracking-wider mb-0.5">
                              {p.category === "standard" ? "Standard" : p.category === "premium" ? "Premium" : "Elite"}
                            </p>
                            <p className="text-sm font-semibold text-[#F5EDD6] leading-tight">{p.name}</p>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                              <span style={{ color: productColor }} className="text-sm font-bold">{formatPrice(p.price)}</span>
                              {disc > 0 && (
                                <span style={{ backgroundColor: `${colors.error}20`, color: colors.error }} className="text-xs px-1.5 py-0.5 rounded-full">
                                  -{disc}%
                                </span>
                              )}
                            </div>
                            {p.reviewCount > 0 && (
                              <p className="text-xs text-[#F5EDD6]/40 mt-0.5">{p.rating}★ ({p.reviewCount})</p>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {sections.map((section) => {
                  const rows = COMPARE_ROWS.filter((r) => r.section === section);
                  return (
                    <>
                      <tr key={`section-${section}`} style={{ backgroundColor: `${colors.primary}08`, borderBottom: `1px solid ${colors.border}` }}>
                        <td colSpan={selectedProducts.length + 1} className="px-4 py-2">
                          <span className="text-xs font-medium tracking-wider uppercase text-[#C9A84C]">{section}</span>
                        </td>
                      </tr>
                      {rows.map((row, rowIdx) => {
                        const vals = selectedProducts.map((p) => getProductValue(p, row.key));
                        // Detect if values differ (for highlight)
                        const hasDiff = highlightDiff && vals.some((v) => v !== vals[0]);
                        return (
                          <tr
                            key={row.key}
                            style={{
                              backgroundColor: hasDiff
                                ? `${colors.primary}05`
                                : rowIdx % 2 === 0 ? colors.background : `${colors.surface}80`,
                              borderBottom: `1px solid ${colors.border}40`,
                            }}
                          >
                            <td className="p-4 text-xs text-[#F5EDD6]/60 font-medium">
                              {row.label}
                              {hasDiff && (
                                <span style={{ color: colors.primary }} className="ml-1.5 text-[10px] font-bold">●</span>
                              )}
                            </td>
                            {selectedProducts.map((p, idx) => {
                              const productColor = PRODUCT_COLORS[idx];
                              const val = getProductValue(p, row.key);
                              if (typeof val === "boolean") {
                                return (
                                  <td key={p.id} className="p-4 text-center">
                                    {val ? (
                                      <span style={{ backgroundColor: `${productColor}15`, color: productColor }} className="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm">✓</span>
                                    ) : (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 text-white/20 text-sm">—</span>
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <td key={p.id} className="p-4 text-center text-sm text-[#F5EDD6]/70">
                                  {row.key === "price" ? (
                                    <span style={{ color: productColor }} className="font-bold">{val as string}</span>
                                  ) : (
                                    val as string
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </>
                  );
                })}

                {/* CTA row */}
                <tr style={{ backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}` }}>
                  <td className="p-4 text-xs text-[#F5EDD6]/40">Đặt hàng</td>
                  {selectedProducts.map((p, idx) => {
                    const productColor = PRODUCT_COLORS[idx];
                    return (
                      <td key={p.id} className="p-4 text-center">
                        <Link
                          href={`/products/${p.slug}`}
                          style={{ background: `linear-gradient(135deg, ${productColor}, ${productColor}bb)`, color: "#000" }}
                          className="inline-block px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          {p.status === "coming_soon" ? "Đặt trước" : p.status === "out_of_stock" ? "Hết hàng" : "Chọn sản phẩm này"}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Help text */}
        <p className="text-center text-xs text-[#F5EDD6]/30 mt-6">
          Cần tư vấn thêm? Gọi <span className="text-[#C9A84C]">1800 1234 56</span> (miễn phí) hoặc{" "}
          <Link href="/contact" className="text-[#C9A84C] hover:opacity-70 transition-opacity">liên hệ chúng tôi</Link>.
        </p>
      </div>
    </div>
  );
}
