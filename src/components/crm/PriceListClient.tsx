"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Printer, ChevronDown, ChevronUp,
  Package, Tag, Ruler, Phone, Mail, Globe, CheckCircle2,
} from "lucide-react";
import type { CrmProduct, SizePricing } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const D = {
  pageBg: "linear-gradient(135deg, #0f172a 0%, #1e1a0e 50%, #1a1200 100%)",
  headerBg: "rgba(15,23,42,0.95)",
  cardBg: "rgba(255,255,255,0.04)",
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

type PrintFilter = "all" | CrmProduct["category"];

interface Props {
  products: CrmProduct[];
}

export default function PriceListClient({ products }: Props) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["ergonomic_bed", "sofa_bed"])
  );
  const [printFilter, setPrintFilter] = useState<PrintFilter>("all");
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(false);

  const activeProducts = products.filter(p => p.isActive);

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

  // Trigger print sau khi state cập nhật
  useEffect(() => {
    if (pendingPrint) {
      setPendingPrint(false);
      window.print();
    }
  }, [pendingPrint, expandedProducts]);

  const handlePrint = (filter: PrintFilter) => {
    setPrintFilter(filter);
    setShowPrintMenu(false);
    // Mở rộng tất cả sản phẩm trước khi in
    setExpandedProducts(new Set(activeProducts.map(p => p.id)));
    setExpandedCategories(new Set(Object.keys(grouped)));
    setPendingPrint(true);
  };

  const today = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  // Danh mục sẽ hiển thị khi in
  const printCategories = printFilter === "all"
    ? categoryOrder
    : [printFilter as CrmProduct["category"]];

  const printLabel = printFilter === "all"
    ? "Tất cả sản phẩm"
    : CATEGORY_CONFIG[printFilter as CrmProduct["category"]]?.label ?? "";

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: D.pageBg }}>

      {/* ── Global Print Styles ── */}
      <style>{`
        @media print {
          @page { margin: 15mm 12mm; size: A4 portrait; }
          html, body { background: white !important; color: #111 !important; }

          /* Ẩn sidebar và các element không cần in */
          .no-print { display: none !important; }
          aside { display: none !important; }
          nav { display: none !important; }
          [data-sidebar] { display: none !important; }

          /* Card in */
          .print-card {
            background: #f9f9f9 !important;
            border: 1px solid #ddd !important;
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 12px;
          }
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
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: D.gold }}>
              Bảng Báo Giá Tổng Hợp
            </span>
            <h1 className="text-lg font-bold leading-tight" style={{ color: D.textPrimary }}>
              SmartFurni — Giường & Sofa Thông Minh
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
            Thu gọn
          </button>
          <button onClick={expandAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
            Mở rộng tất cả
          </button>

          {/* Print dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPrintMenu(v => !v)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold"
              style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff", boxShadow: D.goldGlow }}>
              <Printer size={15} />
              In / Xuất PDF
              <ChevronDown size={13} />
            </button>

            {showPrintMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl min-w-[220px]"
                style={{ background: "#1a1a2e", border: `1px solid ${D.borderGold}` }}>
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: D.textMuted, borderBottom: `1px solid ${D.divider}` }}>
                  Chọn danh mục xuất
                </div>
                {/* Tất cả */}
                <button
                  onClick={() => handlePrint("all")}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5"
                  style={{ borderBottom: `1px solid ${D.divider}` }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                    style={{ background: D.goldDim }}>
                    📋
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: D.textPrimary }}>Tất cả sản phẩm</div>
                    <div className="text-xs" style={{ color: D.textMuted }}>{activeProducts.length} sản phẩm · 2 danh mục</div>
                  </div>
                </button>
                {/* Từng danh mục */}
                {categoryOrder.map(cat => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const count = grouped[cat]?.length ?? 0;
                  if (!count) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => handlePrint(cat)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5"
                      style={{ borderBottom: `1px solid ${D.divider}` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                        style={{ background: cfg.dim }}>
                        {cfg.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</div>
                        <div className="text-xs" style={{ color: D.textMuted }}>{count} sản phẩm</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Bar ── */}
      <div className="no-print flex-shrink-0 px-6 py-3 flex items-center gap-6 flex-wrap"
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
        <div className="ml-auto text-xs" style={{ color: D.textMuted }}>Cập nhật: {today}</div>
      </div>

      {/* ── Content (screen only) ── */}
      <div className="flex-1 p-6 space-y-8">
        {categoryOrder.map(cat => {
          const items = grouped[cat];
          if (!items?.length) return null;
          const cfg = CATEGORY_CONFIG[cat];
          const isExpanded = expandedCategories.has(cat);

          return (
            <div key={cat}>
              <button
                onClick={() => toggleCategory(cat)}
                className="no-print w-full flex items-center gap-3 mb-4">
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
                  {isExpanded ? <ChevronUp size={16} style={{ color: D.textMuted }} /> : <ChevronDown size={16} style={{ color: D.textMuted }} />}
                </div>
              </button>

              <div className="no-print h-px mb-4" style={{ background: `linear-gradient(90deg, ${cfg.color}40, transparent)` }} />

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

        {/* Footer */}
        <div className="mt-8 pt-6 space-y-4" style={{ borderTop: `1px solid ${D.divider}` }}>
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
            © {new Date().getFullYear()} SmartFurni — Tài liệu nội bộ
          </div>
        </div>
      </div>

      {/* Click outside to close print menu */}
      {showPrintMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPrintMenu(false)} />
      )}
    </div>
  );
}

// ─── Print Document (render riêng, chỉ hiện khi in) ───────────────────────────
function PrintDocument({
  products,
  grouped,
  printCategories,
  printLabel,
  today,
}: {
  products: CrmProduct[];
  grouped: Record<string, CrmProduct[]>;
  printCategories: CrmProduct["category"][];
  printLabel: string;
  today: string;
}) {
  const printCount = printCategories.reduce((sum, cat) => sum + (grouped[cat]?.length ?? 0), 0);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111", background: "white", padding: "0" }}>
      {/* Print Header */}
      <div style={{ background: "#1a1a2e", color: "white", padding: "24px 32px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "2px", color: "#C9A84C" }}>SMARTFURNI</div>
            <div style={{ fontSize: "14px", color: "#ccc", marginTop: "2px" }}>Giường & Sofa Thông Minh</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#C9A84C" }}>BẢNG BÁO GIÁ SẢN PHẨM</div>
            <div style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>{printLabel} · {printCount} sản phẩm</div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>Ngày: {today} · Giá chưa bao gồm VAT</div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {printCategories.map(cat => {
        const items = grouped[cat];
        if (!items?.length) return null;
        const cfg = CATEGORY_CONFIG[cat];
        return (
          <div key={cat} style={{ marginBottom: "32px", padding: "0 32px" }}>
            {/* Category title */}
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              borderBottom: `2px solid ${cfg.color}`,
              paddingBottom: "8px", marginBottom: "16px"
            }}>
              <span style={{ fontSize: "20px" }}>{cfg.icon}</span>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
                <div style={{ fontSize: "11px", color: "#666" }}>{cfg.description}</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: "12px", color: "#888" }}>{items.length} sản phẩm</div>
            </div>

            {/* Products */}
            {items.map((product) => {
              const hasSizes = product.sizePricings && product.sizePricings.length > 0;
              const minPrice = hasSizes ? Math.min(...product.sizePricings!.map(s => s.price)) : product.basePrice;
              const maxPrice = hasSizes ? Math.max(...product.sizePricings!.map(s => s.price)) : product.basePrice;
              const hasRange = hasSizes && minPrice !== maxPrice;
              const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);

              return (
                <div key={product.id} className="print-card" style={{
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  marginBottom: "14px",
                  overflow: "hidden",
                  pageBreakInside: "avoid",
                  background: "#fafafa",
                }}>
                  {/* Product header */}
                  <div style={{ display: "flex", gap: "16px", padding: "14px 16px" }}>
                    {/* Image */}
                    <div style={{
                      width: "100px", height: "100px", flexShrink: 0,
                      borderRadius: "8px", overflow: "hidden",
                      background: "#eee", border: "1px solid #ddd",
                      position: "relative",
                    }}>
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>
                          {cfg.icon}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "3px" }}>{product.name}</div>
                          <div style={{ fontSize: "11px", color: "#888", fontFamily: "monospace", marginBottom: "6px" }}>
                            SKU: {product.sku}
                            {hasSizes && <span style={{ marginLeft: "8px", color: cfg.color }}>· {product.sizePricings!.length} kích thước</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", color: "#888" }}>{hasRange ? "Từ" : "Giá"}</div>
                          <div style={{ fontSize: "16px", fontWeight: 900, color: "#9A7A2E" }}>
                            {minPrice > 0 ? formatVND(minPrice) : "Liên hệ"}
                          </div>
                          {hasRange && <div style={{ fontSize: "11px", color: "#888" }}>đến {formatVND(maxPrice)}</div>}
                        </div>
                      </div>

                      {/* Quick specs */}
                      {specEntries.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {specEntries.slice(0, 4).map(([key, val]) => (
                            <span key={key} style={{
                              fontSize: "10px", padding: "2px 8px", borderRadius: "4px",
                              background: "#f0f0f0", border: "1px solid #ddd", color: "#555"
                            }}>
                              <span style={{ color: "#888" }}>{key}:</span> {val}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Size pricing table */}
                  {hasSizes && (
                    <div style={{ borderTop: "1px solid #eee", padding: "12px 16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#555", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Bảng giá theo kích thước
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#f0f0f0" }}>
                            <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, color: "#555", border: "1px solid #ddd" }}>Kích thước</th>
                            <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, color: "#555", border: "1px solid #ddd" }}>Mã size</th>
                            <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 600, color: "#555", border: "1px solid #ddd" }}>Đơn giá (VNĐ)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.sizePricings!.map((sp: SizePricing, i: number) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}>
                              <td style={{ padding: "6px 10px", border: "1px solid #eee", fontWeight: 500 }}>{sp.label || sp.size}</td>
                              <td style={{ padding: "6px 10px", border: "1px solid #eee", fontFamily: "monospace", color: "#888", fontSize: "11px" }}>{sp.size}</td>
                              <td style={{ padding: "6px 10px", border: "1px solid #eee", textAlign: "right", fontWeight: 700, color: "#9A7A2E" }}>
                                {sp.price > 0 ? formatVND(sp.price) : "Liên hệ"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Full specs */}
                  {specEntries.length > 4 && (
                    <div style={{ borderTop: "1px solid #eee", padding: "10px 16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#555", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Thông số kỹ thuật
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                        {specEntries.map(([key, val]) => (
                          <div key={key} style={{ background: "#f5f5f5", borderRadius: "4px", padding: "4px 8px", border: "1px solid #e5e5e5" }}>
                            <div style={{ fontSize: "10px", color: "#888" }}>{key}</div>
                            <div style={{ fontSize: "11px", fontWeight: 500, color: "#444" }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Print Footer */}
      <div style={{ padding: "16px 32px", borderTop: "1px solid #ddd", marginTop: "16px" }}>
        <div style={{ background: "#fffbf0", border: "1px solid #C9A84C50", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9A7A2E", marginBottom: "6px" }}>ĐIỀU KHOẢN BÁO GIÁ</div>
          <div style={{ fontSize: "10px", color: "#555", lineHeight: "1.6" }}>
            • Giá trên chưa bao gồm VAT (10%). Giá có thể thay đổi mà không báo trước.<br />
            • Giá theo kích thước là giá niêm yết. Liên hệ để được báo giá dự án (số lượng lớn).<br />
            • Bảo hành: Khung cơ 5 năm · Motor điện 3 năm · Nệm & vải 1 năm.<br />
            • Thời gian giao hàng: 7–14 ngày làm việc sau khi xác nhận đơn hàng.<br />
            • Hỗ trợ lắp đặt miễn phí trong bán kính 30km tại TP.HCM.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888" }}>
          <div>📞 Hotline: <strong style={{ color: "#111" }}>1800 6868</strong> &nbsp;·&nbsp; ✉️ <strong style={{ color: "#111" }}>sales@smartfurni.vn</strong> &nbsp;·&nbsp; 🌐 <strong style={{ color: "#111" }}>smartfurni.vn</strong></div>
          <div>© {new Date().getFullYear()} SmartFurni</div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card (screen view) ───────────────────────────────────────────────
function ProductCard({
  product, cfg, isExpanded, onToggle,
}: {
  product: CrmProduct;
  cfg: { label: string; color: string; dim: string; icon: string };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;
  const minPrice = hasSizes ? Math.min(...product.sizePricings!.map(s => s.price)) : product.basePrice;
  const maxPrice = hasSizes ? Math.max(...product.sizePricings!.map(s => s.price)) : product.basePrice;
  const hasRange = hasSizes && minPrice !== maxPrice;
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);

  return (
    <div className="print-card rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: D.cardBg,
        border: `1px solid ${isExpanded ? cfg.color + "30" : D.border}`,
        boxShadow: isExpanded ? `0 4px 24px rgba(0,0,0,0.3)` : "none",
      }}>
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0 rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${D.border}` }}>
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="144px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">{cfg.icon}</div>
          )}
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
            style={{ background: cfg.dim, color: cfg.color, backdropFilter: "blur(4px)" }}>
            {cfg.icon}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-base leading-snug mb-0.5" style={{ color: D.textPrimary }}>{product.name}</h3>
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
            <div className="text-right flex-shrink-0">
              <div className="text-xs mb-0.5" style={{ color: D.textMuted }}>{hasRange ? "Từ" : "Giá"}</div>
              <div className="text-lg font-black" style={{ color: D.gold }}>
                {minPrice > 0 ? formatVND(minPrice) : "Liên hệ"}
              </div>
              {hasRange && <div className="text-xs" style={{ color: D.textMuted }}>đến {formatVND(maxPrice)}</div>}
            </div>
          </div>
          {product.description && (
            <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: D.textSecondary }}>{product.description}</p>
          )}
          {specEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {specEntries.slice(0, 3).map(([key, val]) => (
                <span key={key} className="text-xs px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(255,255,255,0.04)", color: D.textMuted, border: `1px solid ${D.border}` }}>
                  <span style={{ color: D.textSecondary }}>{key}:</span> {val}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Toggle */}
        <button onClick={onToggle}
          className="self-start mt-1 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: isExpanded ? cfg.dim : D.cardBg,
            border: `1px solid ${isExpanded ? cfg.color + "50" : D.border}`,
            color: isExpanded ? cfg.color : D.textMuted,
          }}>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${D.divider}` }}>
          {hasSizes && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={13} style={{ color: D.gold }} />
                <span className="text-sm font-semibold" style={{ color: D.textPrimary }}>Bảng giá theo kích thước</span>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: D.textMuted, borderBottom: `1px solid ${D.border}` }}>Kích thước</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: D.textMuted, borderBottom: `1px solid ${D.border}` }}>Mã size</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: D.textMuted, borderBottom: `1px solid ${D.border}` }}>Đơn giá (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.sizePricings!.map((sp: SizePricing, i: number) => (
                      <tr key={i} style={{
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                        borderBottom: i < product.sizePricings!.length - 1 ? `1px solid ${D.divider}` : "none",
                      }}>
                        <td className="px-4 py-3 font-medium" style={{ color: D.textPrimary }}>{sp.label || sp.size}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: D.textMuted }}>{sp.size}</td>
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

          {specEntries.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={13} style={{ color: D.textMuted }} />
                <span className="text-sm font-semibold" style={{ color: D.textPrimary }}>Thông số kỹ thuật</span>
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

          {product.description && (
            <div className="px-4 pb-4">
              <p className="text-xs leading-relaxed" style={{ color: D.textMuted }}>{product.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
