"use client";
import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/product-store";
import type { SiteTheme } from "@/lib/theme-types";

interface Props {
  products: Product[];
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

// All feature keys to compare across products
const COMPARE_ROWS: { key: string; label: string; section: string }[] = [
  // Giá & Bảo hành
  { key: "price", label: "Giá bán", section: "Giá & Bảo hành" },
  { key: "warranty", label: "Bảo hành", section: "Giá & Bảo hành" },
  // Thông số kỹ thuật
  { key: "Kích thước", label: "Kích thước", section: "Thông số kỹ thuật" },
  { key: "Chất liệu khung", label: "Chất liệu khung", section: "Thông số kỹ thuật" },
  { key: "Động cơ", label: "Động cơ", section: "Thông số kỹ thuật" },
  { key: "Tiếng ồn", label: "Tiếng ồn", section: "Thông số kỹ thuật" },
  // Tính năng điều chỉnh
  { key: "f_adjust_head", label: "Điều chỉnh đầu giường", section: "Tính năng điều chỉnh" },
  { key: "f_adjust_foot", label: "Điều chỉnh chân giường", section: "Tính năng điều chỉnh" },
  { key: "f_remote", label: "Remote không dây", section: "Tính năng điều chỉnh" },
  { key: "f_app", label: "App iOS/Android", section: "Tính năng điều chỉnh" },
  // Tính năng cao cấp
  { key: "f_massage", label: "Massage tích hợp", section: "Tính năng cao cấp" },
  { key: "f_led", label: "Đèn LED RGB", section: "Tính năng cao cấp" },
  { key: "f_bluetooth", label: "Bluetooth 5.0", section: "Tính năng cao cấp" },
  { key: "f_speaker", label: "Loa tích hợp", section: "Tính năng cao cấp" },
  { key: "f_wireless_charge", label: "Sạc không dây", section: "Tính năng cao cấp" },
  // AI & Smart Home
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

export default function CompareClient({ products, theme }: Props) {
  const { colors } = theme;
  const [selected, setSelected] = useState<string[]>(
    products.slice(0, 3).map((p) => p.id)
  );

  const selectedProducts = products.filter((p) => selected.includes(p.id));

  const toggleProduct = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length > 2) setSelected(selected.filter((s) => s !== id));
    } else {
      if (selected.length < 4) setSelected([...selected, id]);
    }
  };

  // Group rows by section
  const sections = Array.from(new Set(COMPARE_ROWS.map((r) => r.section)));

  return (
    <div className="pt-28 sm:pt-32 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">So sánh</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-[#F5EDD6] mb-3">
            So sánh <span className="text-gold-gradient">sản phẩm</span>
          </h1>
          <p className="text-sm text-[#F5EDD6]/50 max-w-xl mx-auto">
            Chọn 2–4 sản phẩm để so sánh tính năng, thông số và giá cả. Tìm ra dòng giường phù hợp nhất với bạn.
          </p>
        </div>

        {/* Product selector */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {products.map((p) => {
            const isSelected = selected.includes(p.id);
            const disc = p.originalPrice > p.price
              ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
              : 0;
            return (
              <button
                key={p.id}
                onClick={() => toggleProduct(p.id)}
                style={isSelected
                  ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background, borderColor: "transparent" }
                  : { backgroundColor: colors.surface, borderColor: colors.border, color: `${colors.text}80` }
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200"
              >
                {isSelected && <span className="text-xs">✓</span>}
                <span>{p.name}</span>
                {disc > 0 && <span className="text-xs opacity-70">-{disc}%</span>}
              </button>
            );
          })}
        </div>

        {/* Compare table */}
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: colors.border }}>
          <table className="w-full min-w-[640px]">
            {/* Product header row */}
            <thead>
              <tr style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
                <th className="text-left p-4 w-44 text-xs font-medium tracking-wider uppercase text-[#C9A84C]">
                  Tính năng
                </th>
                {selectedProducts.map((p) => {
                  const disc = p.originalPrice > p.price
                    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                    : 0;
                  return (
                    <th key={p.id} className="p-4 text-center min-w-[180px]">
                      <div className="flex flex-col items-center gap-2">
                        {/* Product image placeholder */}
                        <div
                          style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`, borderColor: colors.border }}
                          className="w-20 h-14 rounded-lg border flex items-center justify-center overflow-hidden"
                        >
                          {p.coverImage ? (
                            <img src={p.coverImage} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <svg viewBox="0 0 80 50" width="60" height="38" fill="none">
                              <rect x="6" y="25" width="68" height="20" rx="3" fill={`${colors.primary}15`} stroke={`${colors.primary}30`} strokeWidth="1" />
                              <rect x="8" y="20" width="64" height="23" rx="4" fill={`${colors.primary}20`} stroke={`${colors.primary}35`} strokeWidth="1" />
                              <rect x="5" y="11" width="8" height="32" rx="2" fill={`${colors.primary}18`} stroke={`${colors.primary}30`} strokeWidth="1" />
                              <rect x="5" y="43" width="70" height="2" rx="1" fill={colors.primary} opacity="0.5" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-[#C9A84C]/70 mb-0.5">
                            {p.category === "standard" ? "Standard" : p.category === "premium" ? "Premium" : "Elite"}
                          </p>
                          <p className="text-sm font-semibold text-[#F5EDD6] leading-tight">{p.name}</p>
                          <div className="flex items-center justify-center gap-1.5 mt-1">
                            <span style={{ color: colors.primary }} className="text-sm font-bold">{formatPrice(p.price)}</span>
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
                    {/* Section header */}
                    <tr key={`section-${section}`} style={{ backgroundColor: `${colors.primary}08`, borderBottom: `1px solid ${colors.border}` }}>
                      <td colSpan={selectedProducts.length + 1} className="px-4 py-2">
                        <span className="text-xs font-medium tracking-wider uppercase text-[#C9A84C]">{section}</span>
                      </td>
                    </tr>
                    {rows.map((row, rowIdx) => (
                      <tr
                        key={row.key}
                        style={{
                          backgroundColor: rowIdx % 2 === 0 ? colors.background : `${colors.surface}80`,
                          borderBottom: `1px solid ${colors.border}40`,
                        }}
                      >
                        <td className="p-4 text-xs text-[#F5EDD6]/60 font-medium">{row.label}</td>
                        {selectedProducts.map((p) => {
                          const val = getProductValue(p, row.key);
                          if (typeof val === "boolean") {
                            return (
                              <td key={p.id} className="p-4 text-center">
                                {val ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#22C55E]/15 text-[#22C55E] text-sm">✓</span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F5EDD6]/5 text-[#F5EDD6]/20 text-sm">—</span>
                                )}
                              </td>
                            );
                          }
                          return (
                            <td key={p.id} className="p-4 text-center text-sm text-[#F5EDD6]/70">
                              {row.key === "price" ? (
                                <span style={{ color: colors.primary }} className="font-bold">{val as string}</span>
                              ) : (
                                val as string
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                );
              })}

              {/* CTA row */}
              <tr style={{ backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}` }}>
                <td className="p-4 text-xs text-[#F5EDD6]/40">Đặt hàng</td>
                {selectedProducts.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    <Link
                      href={`/products/${p.slug}`}
                      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
                      className="inline-block px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      {p.status === "coming_soon" ? "Đặt trước" : p.status === "out_of_stock" ? "Hết hàng" : "Chọn sản phẩm này"}
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-[#F5EDD6]/30 mt-6">
          Cần tư vấn thêm? Gọi <span className="text-[#C9A84C]">1800 1234 56</span> (miễn phí) hoặc{" "}
          <Link href="/contact" className="text-[#C9A84C] hover:opacity-70 transition-opacity">liên hệ chúng tôi</Link>.
        </p>
      </div>
    </div>
  );
}
