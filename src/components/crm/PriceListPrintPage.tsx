"use client";

import { useEffect } from "react";
import Image from "next/image";
import { CheckCircle2, Ruler, Phone, Mail, Globe } from "lucide-react";
import type { CrmProduct, SizePricing } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";

const CATEGORY_CONFIG: Record<CrmProduct["category"], {
  label: string; color: string; icon: string; description: string;
}> = {
  ergonomic_bed: {
    label: "Giường Công Thái Học",
    color: "#6d28d9",
    icon: "🛏️",
    description: "Giường điều khiển điện thông minh, hỗ trợ nâng đầu/chân, tích hợp massage",
  },
  sofa_bed: {
    label: "Sofa Giường Đa Năng",
    color: "#1d4ed8",
    icon: "🛋️",
    description: "Sofa gấp gọn thành giường, tiết kiệm không gian, phù hợp căn hộ hiện đại",
  },
};

const categoryOrder: CrmProduct["category"][] = ["ergonomic_bed", "sofa_bed"];

interface Props {
  products: CrmProduct[];
  category: string;
}

export default function PriceListPrintPage({ products, category }: Props) {
  const activeProducts = products.filter(p => p.isActive);

  const grouped = activeProducts.reduce<Record<string, CrmProduct[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  // Lọc theo category
  const printCategories = category === "all"
    ? categoryOrder.filter(c => grouped[c]?.length)
    : categoryOrder.filter(c => c === category && grouped[c]?.length);

  const today = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  // Tự động mở hộp thoại in khi trang load xong
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; color: #111; }
        @media print {
          @page { margin: 12mm 10mm; size: A4 portrait; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .product-card { break-inside: avoid; page-break-inside: avoid; }
          .category-section { break-before: auto; }
        }
        @media screen {
          body { background: #f5f5f5; }
          .print-wrapper { max-width: 800px; margin: 0 auto; background: white; padding: 24px; min-height: 100vh; }
        }
      `}</style>

      <div className="print-wrapper">
        {/* Header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #C9A84C", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #C9A84C, #9A7A2E)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 13 }}>SF</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>SMARTFURNI</div>
              <div style={{ fontSize: 11, color: "#888", letterSpacing: 2, textTransform: "uppercase" }}>Giường Điều Khiển Thông Minh</div>
            </div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#333", marginBottom: 4 }}>BẢNG BÁO GIÁ SẢN PHẨM</div>
          <div style={{ fontSize: 11, color: "#888" }}>
            Ngày: {today} · Giá chưa bao gồm VAT · Liên hệ để được báo giá tốt nhất
          </div>
          {/* Summary chips */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ background: "#f3f0ff", color: "#6d28d9", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 600 }}>
              📦 {activeProducts.length} sản phẩm
            </span>
            {printCategories.map(cat => (
              <span key={cat} style={{ background: cat === "ergonomic_bed" ? "#f3f0ff" : "#eff6ff", color: cat === "ergonomic_bed" ? "#6d28d9" : "#1d4ed8", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 600 }}>
                {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}: {grouped[cat]?.length ?? 0} SP
              </span>
            ))}
          </div>
        </div>

        {/* Categories */}
        {printCategories.map(cat => {
          const cfg = CATEGORY_CONFIG[cat];
          const catProducts = grouped[cat] ?? [];
          return (
            <div key={cat} className="category-section" style={{ marginBottom: 24 }}>
              {/* Category Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: cat === "ergonomic_bed" ? "#f3f0ff" : "#eff6ff", borderRadius: 10, marginBottom: 12, borderLeft: `4px solid ${cfg.color}` }}>
                <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: cfg.color, fontSize: 14 }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>{cfg.description}</div>
                </div>
                <div style={{ marginLeft: "auto", background: cfg.color, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                  {catProducts.length} sản phẩm
                </div>
              </div>

              {/* Products */}
              {catProducts.map(product => {
                const sizes: SizePricing[] = Array.isArray(product.sizePricing) ? product.sizePricing : [];
                const specs = product.specifications as Record<string, string> | null;
                const minPrice = sizes.length > 0 ? Math.min(...sizes.map(s => s.price)) : product.basePrice;
                const maxPrice = sizes.length > 0 ? Math.max(...sizes.map(s => s.price)) : product.basePrice;

                return (
                  <div key={product.id} className="product-card" style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, marginBottom: 12, background: "#fafafa" }}>
                    <div style={{ display: "flex", gap: 14 }}>
                      {/* Image */}
                      <div style={{ width: 100, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#f0f0f0", position: "relative" }}>
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            style={{ objectFit: "cover" }}
                            unoptimized
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                            {cfg.icon}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#111", lineHeight: 1.3, marginBottom: 3 }}>{product.name}</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                              <span style={{ background: "#f3f0ff", color: "#6d28d9", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>{product.sku}</span>
                              {sizes.length > 0 && (
                                <span style={{ background: "#f0fdf4", color: "#16a34a", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>
                                  <Ruler size={9} style={{ display: "inline", marginRight: 2 }} />
                                  {sizes.length} kích thước
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Price */}
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            {minPrice === 0 ? (
                              <div style={{ fontWeight: 700, fontSize: 14, color: "#C9A84C" }}>Liên hệ</div>
                            ) : sizes.length > 1 ? (
                              <>
                                <div style={{ fontSize: 10, color: "#888" }}>Từ</div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "#C9A84C" }}>{formatVND(minPrice)}</div>
                                <div style={{ fontSize: 10, color: "#888" }}>đến {formatVND(maxPrice)}</div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontSize: 10, color: "#888" }}>Giá</div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "#C9A84C" }}>{formatVND(minPrice)}</div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {product.description && (
                          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5, marginBottom: 6 }}>
                            {product.description.slice(0, 120)}{product.description.length > 120 ? "..." : ""}
                          </div>
                        )}

                        {/* Warranty & Size */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {specs?.["Bảo hành"] && (
                            <span style={{ background: "#f0fdf4", color: "#16a34a", borderRadius: 4, padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}>
                              <CheckCircle2 size={9} />Bảo hành: {specs["Bảo hành"]}
                            </span>
                          )}
                          {specs?.["Kích thước"] && (
                            <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 4, padding: "2px 8px", fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}>
                              <Ruler size={9} />Kích thước: {specs["Kích thước"]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Size Pricing Table */}
                    {sizes.length > 1 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
                          <Ruler size={11} />Bảng giá theo kích thước
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                          <thead>
                            <tr style={{ background: "#f5f5f5" }}>
                              <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #e5e7eb" }}>Kích thước</th>
                              <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "#555", borderBottom: "1px solid #e5e7eb" }}>Mã SKU</th>
                              <th style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600, color: "#555", borderBottom: "1px solid #e5e7eb" }}>Đơn giá (VNĐ)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sizes.map((s, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                <td style={{ padding: "4px 8px", color: "#333", borderBottom: "1px solid #f0f0f0" }}>{s.size}</td>
                                <td style={{ padding: "4px 8px", color: "#666", borderBottom: "1px solid #f0f0f0" }}>{s.sku || "-"}</td>
                                <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: "#C9A84C", borderBottom: "1px solid #f0f0f0" }}>
                                  {s.price === 0 ? "Liên hệ" : formatVND(s.price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Specs */}
                    {specs && Object.keys(specs).length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 5 }}>Thông số kỹ thuật</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px 12px" }}>
                          {Object.entries(specs).map(([k, v]) => (
                            <div key={k} style={{ fontSize: 10, color: "#555" }}>
                              <span style={{ fontWeight: 600, color: "#333" }}>{k}:</span> {v}
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

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 8 }}>Điều khoản báo giá</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 16px", marginBottom: 12 }}>
            {[
              "Giá trên chưa bao gồm VAT (10%). Giá có thể thay đổi mà không báo trước.",
              "Giá theo kích thước là giá niêm yết. Liên hệ để được báo giá dự án (số lượng lớn).",
              "Bảo hành: Khung cơ 5 năm · Motor điện 3 năm · Nệm & vải 1 năm.",
              "Thời gian giao hàng: 7–14 ngày làm việc sau khi xác nhận đơn hàng.",
              "Hỗ trợ lắp đặt miễn phí trong bán kính 30km tại TP.HCM.",
            ].map((t, i) => (
              <div key={i} style={{ fontSize: 10, color: "#666", display: "flex", gap: 4 }}>
                <span style={{ color: "#C9A84C", flexShrink: 0 }}>•</span>{t}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 4 }}>
                <Phone size={11} />1800 6868
              </span>
              <span style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 4 }}>
                <Mail size={11} />sales@smartfurni.vn
              </span>
              <span style={{ fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 4 }}>
                <Globe size={11} />smartfurni.vn
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#aaa" }}>© 2026 SmartFurni — Tài liệu nội bộ</div>
          </div>
        </div>
      </div>
    </>
  );
}
