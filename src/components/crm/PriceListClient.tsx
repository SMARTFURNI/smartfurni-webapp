"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Printer, Download, Share2, ChevronDown, ChevronUp,
  Package, Tag, Ruler, Phone, Mail, Globe, CheckCircle2,
} from "lucide-react";
import type { CrmProduct, SizePricing } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";

// ─── Design Tokens (Dark Luxury — matches Dashboard) ──────────────────────────
const D = {
  pageBg: "linear-gradient(135deg, #0f172a 0%, #1e1a0e 50%, #1a1200 100%)",
  headerBg: "rgba(15,23,42,0.95)",
  cardBg: "rgba(255,255,255,0.04)",
  cardBgHover: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,168,76,0.5)",
  textPrimary: "#f5edd6",
  textSecondary: "rgba(245,237,214,0.75)",
  textMuted: "rgba(255,255,255,0.4)",
  gold: "#C9A84C",
  goldDark: "#9A7A2E",
  goldDim: "rgba(201,168,76,0.12)",
  goldGlow: "0 0 24px rgba(201,168,76,0.3)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.12)",
  blue: "#60a5fa",
  blueDim: "rgba(96,165,250,0.12)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.10)",
  divider: "rgba(255,255,255,0.06)",
};

const CATEGORY_CONFIG: Record<CrmProduct["category"], {
  label: string; color: string; dim: string; icon: string; description: string;
}> = {
  ergonomic_bed: {
    label: "Giường Công Thái Học",
    color: D.purple,
    dim: D.purpleDim,
    icon: "🛏️",
    description: "Giường điều khiển điện thông minh, hỗ trợ nâng đầu/chân, tích hợp massage",
  },
  sofa_bed: {
    label: "Sofa Giường Đa Năng",
    color: D.blue,
    dim: D.blueDim,
    icon: "🛋️",
    description: "Sofa gấp gọn thành giường, tiết kiệm không gian, phù hợp căn hộ hiện đại",
  },
};

interface Props {
  products: CrmProduct[];
}

export default function PriceListClient({ products }: Props) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["ergonomic_bed", "sofa_bed"])
  );
  const printRef = useRef<HTMLDivElement>(null);

  const activeProducts = products.filter(p => p.isActive);

  // Group by category
  const grouped = activeProducts.reduce<Record<string, CrmProduct[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const categoryOrder: CrmProduct["category"][] = ["ergonomic_bed", "sofa_bed"];

  const toggleProduct = (id: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedProducts(new Set(activeProducts.map(p => p.id)));
    setExpandedCategories(new Set(Object.keys(grouped)));
  };

  const collapseAll = () => {
    setExpandedProducts(new Set());
  };

  const handlePrint = () => {
    // Mở rộng tất cả sản phẩm và danh mục trước khi in
    setExpandedProducts(new Set(activeProducts.map(p => p.id)));
    setExpandedCategories(new Set(Object.keys(grouped)));
    setTimeout(() => window.print(), 400);
  };

  const today = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: D.pageBg }}>

      {/* ── Print Styles ── */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          aside { display: none !important; }
          nav { display: none !important; }
          header { display: none !important; }
          [data-sidebar] { display: none !important; }
          .print-page { background: white !important; color: #111 !important; width: 100% !important; margin: 0 !important; }
          .print-card { background: #f8f8f8 !important; border: 1px solid #ddd !important; break-inside: avoid; }
          .print-header { background: #1a1a2e !important; color: white !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="no-print flex-shrink-0 px-6 py-4 flex items-center justify-between gap-4"
        style={{ background: D.headerBg, borderBottom: `1px solid ${D.border}`, backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff" }}>
            SF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: D.gold }}>
                Bảng Báo Giá Tổng Hợp
              </span>
            </div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: D.textPrimary }}>
              SmartFurni — Giường & Sofa Thông Minh
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
            Thu gọn
          </button>
          <button onClick={expandAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
            Mở rộng tất cả
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff", boxShadow: D.goldGlow }}>
            <Printer size={15} />
            In / Xuất PDF
          </button>
        </div>
      </div>

      {/* ── Print Header (chỉ hiện khi in) ── */}
      <div className="hidden print:block print-header p-8 text-center" style={{ background: "#1a1a2e" }}>
        <div className="text-3xl font-black text-white mb-1">SMARTFURNI</div>
        <div className="text-lg font-semibold" style={{ color: D.gold }}>BẢNG BÁO GIÁ SẢN PHẨM</div>
        <div className="text-sm text-gray-300 mt-1">Ngày: {today} · Giá chưa bao gồm VAT · Liên hệ để được báo giá tốt nhất</div>
      </div>

      {/* ── Summary Bar ── */}
      <div className="flex-shrink-0 px-6 py-3 flex items-center gap-6 flex-wrap"
        style={{ borderBottom: `1px solid ${D.divider}` }}>
        <div className="flex items-center gap-2">
          <Package size={14} style={{ color: D.gold }} />
          <span className="text-sm font-medium" style={{ color: D.textSecondary }}>
            <span className="font-bold" style={{ color: D.textPrimary }}>{activeProducts.length}</span> sản phẩm
          </span>
        </div>
        {categoryOrder.map(cat => {
          const cfg = CATEGORY_CONFIG[cat];
          const count = grouped[cat]?.length ?? 0;
          if (!count) return null;
          return (
            <div key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: cfg.dim, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
              {cfg.icon} {cfg.label}: {count} SP
            </div>
          );
        })}
        <div className="ml-auto text-xs" style={{ color: D.textMuted }}>
          Cập nhật: {today}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 p-6 space-y-8" ref={printRef}>

        {categoryOrder.map(cat => {
          const items = grouped[cat];
          if (!items?.length) return null;
          const cfg = CATEGORY_CONFIG[cat];
          const isExpanded = expandedCategories.has(cat);

          return (
            <div key={cat} className="print-section">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="no-print w-full flex items-center gap-3 mb-4 group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: cfg.dim, border: `1px solid ${cfg.color}40` }}>
                  {cfg.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-lg font-bold" style={{ color: cfg.color }}>{cfg.label}</div>
                  <div className="text-xs" style={{ color: D.textMuted }}>{cfg.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: cfg.dim, color: cfg.color }}>
                    {items.length} sản phẩm
                  </span>
                  {isExpanded
                    ? <ChevronUp size={16} style={{ color: D.textMuted }} />
                    : <ChevronDown size={16} style={{ color: D.textMuted }} />}
                </div>
              </button>

              {/* Print-only category header */}
              <div className="hidden print:flex items-center gap-3 mb-4 pb-2"
                style={{ borderBottom: `2px solid ${cfg.color}` }}>
                <span className="text-2xl">{cfg.icon}</span>
                <div>
                  <div className="text-xl font-bold" style={{ color: cfg.color }}>{cfg.label}</div>
                  <div className="text-sm text-gray-500">{cfg.description}</div>
                </div>
              </div>

              {/* Divider */}
              <div className="no-print h-px mb-4" style={{ background: `linear-gradient(90deg, ${cfg.color}40, transparent)` }} />

              {/* Products Grid */}
              {isExpanded && (
                <div className="grid grid-cols-1 gap-4">
                  {items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      cfg={cfg}
                      isExpanded={expandedProducts.has(product.id)}
                      onToggle={() => toggleProduct(product.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Footer ── */}
        <div className="mt-8 pt-6 space-y-4" style={{ borderTop: `1px solid ${D.divider}` }}>
          {/* Notes */}
          <div className="rounded-xl p-4" style={{ background: D.goldDim, border: `1px solid ${D.borderGold}` }}>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={15} style={{ color: D.gold }} className="mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: D.gold }}>Điều khoản báo giá</div>
                <ul className="text-xs space-y-1" style={{ color: D.textSecondary }}>
                  <li>• Giá trên chưa bao gồm VAT (10%). Giá có thể thay đổi mà không báo trước.</li>
                  <li>• Giá theo kích thước là giá niêm yết. Liên hệ để được báo giá dự án (số lượng lớn).</li>
                  <li>• Bảo hành: Khung cơ 5 năm · Motor điện 3 năm · Nệm & vải 1 năm.</li>
                  <li>• Thời gian giao hàng: 7–14 ngày làm việc sau khi xác nhận đơn hàng.</li>
                  <li>• Hỗ trợ lắp đặt miễn phí trong bán kính 30km tại TP.HCM.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Phone, label: "Hotline", value: "1800 6868" },
              { icon: Mail, label: "Email", value: "sales@smartfurni.vn" },
              { icon: Globe, label: "Website", value: "smartfurni.vn" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: D.cardBg, border: `1px solid ${D.border}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: D.goldDim }}>
                  <Icon size={14} style={{ color: D.gold }} />
                </div>
                <div>
                  <div className="text-xs" style={{ color: D.textMuted }}>{label}</div>
                  <div className="text-sm font-semibold" style={{ color: D.textPrimary }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-xs pb-4" style={{ color: D.textMuted }}>
            © {new Date().getFullYear()} SmartFurni — Tài liệu nội bộ, không phát tán ra ngoài khi chưa được phép
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({
  product,
  cfg,
  isExpanded,
  onToggle,
}: {
  product: CrmProduct;
  cfg: { label: string; color: string; dim: string; icon: string };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;
  const minPrice = hasSizes
    ? Math.min(...product.sizePricings!.map(s => s.price))
    : product.basePrice;
  const maxPrice = hasSizes
    ? Math.max(...product.sizePricings!.map(s => s.price))
    : product.basePrice;
  const hasRange = hasSizes && minPrice !== maxPrice;

  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);

  return (
    <div className="print-card rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: D.cardBg,
        border: `1px solid ${D.border}`,
        boxShadow: isExpanded ? `0 4px 24px rgba(0,0,0,0.3), inset 0 0 0 1px ${cfg.color}20` : "none",
      }}>

      {/* ── Card Header (always visible) ── */}
      <div className="flex gap-4 p-4">
        {/* Product Image */}
        <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0 rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${D.border}` }}>
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="144px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              {cfg.icon}
            </div>
          )}
          {/* Category badge */}
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
            style={{ background: cfg.dim, color: cfg.color, backdropFilter: "blur(4px)" }}>
            {cfg.icon} {cfg.label.split(" ")[0]}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-base leading-snug mb-0.5" style={{ color: D.textPrimary }}>
                {product.name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: D.textMuted, border: `1px solid ${D.border}` }}>
                  {product.sku}
                </span>
                {hasSizes && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: D.goldDim, color: D.gold }}>
                    <Ruler size={10} className="inline mr-1" />
                    {product.sizePricings!.length} kích thước
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="text-right flex-shrink-0">
              <div className="text-xs mb-0.5" style={{ color: D.textMuted }}>
                {hasRange ? "Từ" : "Giá"}
              </div>
              <div className="text-lg font-black" style={{ color: D.gold }}>
                {minPrice > 0 ? formatVND(minPrice) : "Liên hệ"}
              </div>
              {hasRange && (
                <div className="text-xs" style={{ color: D.textMuted }}>
                  đến {formatVND(maxPrice)}
                </div>
              )}
            </div>
          </div>

          {/* Short description */}
          {product.description && (
            <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: D.textSecondary }}>
              {product.description}
            </p>
          )}

          {/* Quick specs (top 3) */}
          {specEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {specEntries.slice(0, 3).map(([key, val]) => (
                <span key={key} className="text-xs px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(255,255,255,0.04)", color: D.textMuted, border: `1px solid ${D.border}` }}>
                  <span style={{ color: D.textSecondary }}>{key}:</span> {val}
                </span>
              ))}
              {specEntries.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-md cursor-pointer"
                  style={{ background: D.cardBg, color: D.textMuted, border: `1px solid ${D.border}` }}
                  onClick={onToggle}>
                  +{specEntries.length - 3} thông số
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="no-print self-start mt-1 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: isExpanded ? cfg.dim : D.cardBg,
            border: `1px solid ${isExpanded ? cfg.color + "50" : D.border}`,
            color: isExpanded ? cfg.color : D.textMuted,
          }}>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Expanded Detail ── */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${D.divider}` }}>

          {/* Size Pricing Table */}
          {hasSizes && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={13} style={{ color: D.gold }} />
                <span className="text-sm font-semibold" style={{ color: D.textPrimary }}>
                  Bảng giá theo kích thước
                </span>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: D.textMuted, borderBottom: `1px solid ${D.border}` }}>
                        Kích thước
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: D.textMuted, borderBottom: `1px solid ${D.border}` }}>
                        Mã size
                      </th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: D.textMuted, borderBottom: `1px solid ${D.border}` }}>
                        Đơn giá (VNĐ)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.sizePricings!.map((sp: SizePricing, i: number) => (
                      <tr key={i}
                        style={{
                          background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                          borderBottom: i < product.sizePricings!.length - 1 ? `1px solid ${D.divider}` : "none",
                        }}>
                        <td className="px-4 py-3 font-medium" style={{ color: D.textPrimary }}>
                          {sp.label || sp.size}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: D.textMuted }}>
                          {sp.size}
                        </td>
                        <td className="px-4 py-3 text-right font-bold" style={{ color: D.gold }}>
                          {sp.price > 0 ? formatVND(sp.price) : "Liên hệ"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Full Specs */}
          {specEntries.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={13} style={{ color: D.textMuted }} />
                <span className="text-sm font-semibold" style={{ color: D.textPrimary }}>
                  Thông số kỹ thuật
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {specEntries.map(([key, val]) => (
                  <div key={key} className="rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${D.border}` }}>
                    <div className="text-xs mb-0.5" style={{ color: D.textMuted }}>{key}</div>
                    <div className="text-sm font-medium" style={{ color: D.textSecondary }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discount Tiers */}
          {product.discountTiers && product.discountTiers.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={13} style={{ color: D.green }} />
                <span className="text-sm font-semibold" style={{ color: D.textPrimary }}>
                  Chiết khấu theo số lượng
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.discountTiers.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ background: D.greenDim, border: `1px solid ${D.green}30` }}>
                    <span className="text-xs" style={{ color: D.textMuted }}>
                      ≥ {tier.minQty} SP
                    </span>
                    <span className="text-sm font-bold" style={{ color: D.green }}>
                      -{tier.discountPct}%
                    </span>
                    {tier.label && (
                      <span className="text-xs" style={{ color: D.textMuted }}>({tier.label})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full description */}
          {product.description && (
            <div className="px-4 pb-4">
              <p className="text-xs leading-relaxed" style={{ color: D.textMuted }}>
                {product.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
