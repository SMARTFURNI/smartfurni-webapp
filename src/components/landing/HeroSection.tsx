"use client";
import { useState, useEffect, useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";

// ─── B2B Partner types ───────────────────────────────────────────────────────
const B2B_PARTNERS = [
  {
    icon: "bed",
    title: "Showroom Nệm & Nội thất",
    desc: "Phân phối sỉ, chiết khấu cao, hỗ trợ trưng bày",
    href: "/lp/doi-tac-showroom-nem",
    badge: "Phổ biến nhất",
  },
  {
    icon: "hotel",
    title: "Khách sạn & Resort",
    desc: "Giải pháp giường thông minh cho phòng VIP, spa",
    href: "/catalogue",
    badge: null,
  },
  {
    icon: "hospital",
    title: "Bệnh viện & Phòng khám",
    desc: "Giường điều chỉnh y tế, hỗ trợ phục hồi chức năng",
    href: "/catalogue",
    badge: null,
  },
  {
    icon: "building",
    title: "Nhà phân phối nội thất",
    desc: "Đại lý chính thức, hỗ trợ marketing & bảo hành",
    href: "/catalogue",
    badge: null,
  },
  {
    icon: "construction",
    title: "Chủ đầu tư & Developer",
    desc: "Tích hợp giường thông minh vào dự án bất động sản",
    href: "/catalogue",
    badge: null,
  },
  {
    icon: "plane",
    title: "Xuất khẩu & Đối tác quốc tế",
    desc: "Hợp tác OEM/ODM, xuất khẩu sang thị trường nước ngoài",
    href: "/contact",
    badge: null,
  },
];

function B2BPopup({
  open,
  onClose,
  primary,
  secondary,
  bgFrom,
  textColor,
  borderColor,
  surfaceColor,
}: {
  open: boolean;
  onClose: () => void;
  primary: string;
  secondary: string;
  bgFrom: string;
  textColor: string;
  borderColor: string;
  surfaceColor: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: bgFrom, border: `1px solid ${primary}30` }}
      >
        <div className="px-6 pt-6 pb-4 flex items-start justify-between" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: textColor }}>Hợp tác B2B với SmartFurni</h3>
            <p className="text-sm mt-1" style={{ color: `${textColor}60` }}>Chọn lĩnh vực phù hợp để nhận thông tin chi tiết</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:opacity-70 transition-opacity" style={{ color: `${textColor}60` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-4 grid sm:grid-cols-2 gap-2">
          {B2B_PARTNERS.map((p) => (
            <a
              key={p.title}
              href={p.href}
              className="group flex items-start gap-3 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.01]"
              style={{ backgroundColor: `${surfaceColor}`, border: `1px solid ${borderColor}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${primary}50`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = borderColor; }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium" style={{ color: textColor }}>{p.title}</span>
                  {p.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${primary}20`, color: primary }}>{p.badge}</span>
                  )}
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: `${textColor}55` }}>{p.desc}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="px-6 pb-5 text-center">
          <p className="text-xs" style={{ color: `${textColor}40` }}>
            Chưa tìm thấy lĩnh vực phù hợp?{" "}
            <a href="/contact" onClick={onClose} className="underline" style={{ color: primary }}>Liên hệ trực tiếp</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Trust badges ─────────────────────────────────────────────────────────────
const TRUST_STATS = [
  { value: "10.000+", label: "Khách hàng hài lòng" },
  { value: "5 năm", label: "Bảo hành toàn diện" },
  { value: "30 ngày", label: "Dùng thử miễn phí" },
  { value: "2 giờ", label: "Lắp đặt tại nhà" },
];

interface HeroSectionProps {
  theme?: SiteTheme;
}

export default function HeroSection({ theme }: HeroSectionProps) {
  const [b2bOpen, setB2bOpen] = useState(false);

  const primary = theme?.colors.primary ?? "#C9A84C";
  const secondary = theme?.colors.secondary ?? "#9A7A2E";
  const bgFrom = theme?.hero.bgGradientFrom ?? "#080600";
  const bgTo = theme?.hero.bgGradientTo ?? "#1A1500";
  const textColor = theme?.colors.text ?? "#F5EDD6";
  const borderColor = theme?.colors.border ?? "#2D2500";
  const surfaceColor = theme?.colors.surface ?? "#1A1500";
  const maxWidth = theme?.layout.maxWidth ?? 1280;
  const heroTitle = theme?.hero.title ?? "Ngủ Ngon Hơn\nMỗi Đêm";
  const heroSubtitle = theme?.hero.subtitle ?? "Giường điều chỉnh điện SmartFurni — nâng hạ đầu & chân chính xác, motor êm ái, điều khiển bằng remote hoặc ứng dụng di động.";
  const titleFontSizeBase = theme?.hero.titleFontSize ?? 64;
  const titleFontSize = `clamp(36px, 5vw + 1rem, ${titleFontSizeBase}px)`;
  const titleColor = theme?.hero.titleColor ?? textColor;
  const titleAccentColor = theme?.hero.titleAccentColor ?? primary;
  const ctaText = theme?.hero.ctaText ?? "Xem sản phẩm";
  const ctaLink = theme?.hero.ctaLink ?? "/products";
  const ctaSecondaryText = theme?.hero.ctaSecondaryText ?? "Nhận tư vấn miễn phí";
  const ctaSecondaryLink = theme?.hero.ctaSecondaryLink ?? "/contact";

  // Hero image from theme or fallback
  const heroImageUrl = theme?.hero?.imageUrl;

  return (
    <>
      <B2BPopup
        open={b2bOpen}
        onClose={() => setB2bOpen(false)}
        primary={primary}
        secondary={secondary}
        bgFrom={bgFrom}
        textColor={textColor}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
      />

      {/* ── HERO ── */}
      <section
        style={{ background: `linear-gradient(160deg, ${bgFrom} 0%, ${bgTo} 100%)` }}
        className="relative overflow-hidden pt-16"
      >
        {/* Subtle background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ background: `radial-gradient(ellipse at 20% 50%, ${primary}0a, transparent 55%)` }} className="absolute inset-0" />
          <div style={{ background: `radial-gradient(ellipse at 80% 20%, ${primary}06, transparent 50%)` }} className="absolute inset-0" />
        </div>

        <div style={{ maxWidth }} className="relative mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center py-12 sm:py-16 lg:py-20">

            {/* ── LEFT: Copy ── */}
            <ScrollReveal variant="fadeRight" delay={0}>
              <div className="space-y-6 lg:space-y-8">

                {/* Badge */}
                <div
                  style={{ borderColor: `${primary}35`, backgroundColor: `${primary}0c` }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
                >
                  <div style={{ backgroundColor: primary }} className="w-1.5 h-1.5 rounded-full animate-pulse" />
                  <span style={{ color: primary }} className="text-xs font-medium tracking-widest uppercase">Giường Điều Chỉnh Điện</span>
                </div>

                {/* Headline */}
                <h1 className="leading-[1.1] tracking-tight" style={{ fontSize: titleFontSize }}>
                  {(() => {
                    const parts = heroTitle.includes("\n")
                      ? heroTitle.split("\n")
                      : (() => {
                          const words = heroTitle.split(" ");
                          const half = Math.ceil(words.length / 2);
                          return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
                        })();
                    return (
                      <>
                        <span style={{ color: titleColor }} className="block font-light">{parts[0]}</span>
                        {parts[1] && <span style={{ color: titleAccentColor }} className="block font-semibold">{parts[1]}</span>}
                      </>
                    );
                  })()}
                </h1>

                {/* Subtitle */}
                <p style={{ color: `${textColor}80` }} className="text-base sm:text-lg leading-relaxed max-w-lg">
                  {heroSubtitle}
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-3 items-center">
                  <Link
                    href={ctaLink}
                    style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, color: bgFrom }}
                    className="px-7 py-3.5 rounded-full font-semibold text-sm hover:opacity-90 transition-all duration-200 shadow-lg"
                  >
                    {ctaText}
                  </Link>
                  <Link
                    href={ctaSecondaryLink}
                    style={{ borderColor: `${primary}50`, color: primary }}
                    className="px-7 py-3.5 rounded-full border text-sm font-medium hover:opacity-80 transition-opacity"
                  >
                    {ctaSecondaryText}
                  </Link>
                </div>

                {/* Trust stats */}
                <div style={{ borderTopColor: `${borderColor}60` }} className="grid grid-cols-4 gap-3 pt-5 border-t">
                  {TRUST_STATS.map((stat) => (
                    <div key={stat.label}>
                      <div style={{ color: primary }} className="text-lg sm:text-xl font-semibold leading-tight">{stat.value}</div>
                      <div style={{ color: `${textColor}45` }} className="text-[11px] mt-0.5 leading-tight">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* ── RIGHT: Product image ── */}
            <ScrollReveal variant="fadeLeft" delay={120}>
              <div className="relative">
                {/* Glow behind image */}
                <div
                  style={{ background: `radial-gradient(circle, ${primary}18, transparent 65%)` }}
                  className="absolute inset-0 scale-110 pointer-events-none"
                />
                <div
                  style={{ borderColor: `${borderColor}80`, backgroundColor: `${surfaceColor}60` }}
                  className="relative rounded-3xl overflow-hidden border backdrop-blur-sm aspect-[4/3]"
                >
                  {heroImageUrl ? (
                    <img
                      src={heroImageUrl}
                      alt="SmartFurni Giường Điều Chỉnh Điện"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Placeholder khi chưa có ảnh */
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-4"
                      style={{ backgroundColor: `${surfaceColor}` }}
                    >
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={{ opacity: 0.2 }}>
                        <rect x="8" y="32" width="64" height="28" rx="4" stroke={primary} strokeWidth="2" fill="none"/>
                        <rect x="8" y="20" width="64" height="16" rx="4" stroke={primary} strokeWidth="2" fill="none"/>
                        <rect x="12" y="60" width="8" height="10" rx="2" fill={primary} fillOpacity="0.5"/>
                        <rect x="60" y="60" width="8" height="10" rx="2" fill={primary} fillOpacity="0.5"/>
                      </svg>
                      <p style={{ color: `${textColor}30` }} className="text-sm text-center px-8">
                        Thêm ảnh sản phẩm qua<br/>Admin → Cài đặt giao diện → Hero
                      </p>
                    </div>
                  )}

                  {/* Floating badge */}
                  <div
                    style={{ backgroundColor: `${bgFrom}e0`, borderColor: `${primary}30`, backdropFilter: "blur(8px)" }}
                    className="absolute bottom-4 left-4 right-4 rounded-2xl border px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <div style={{ color: primary }} className="text-xs font-semibold tracking-wide">SMARTFURNI</div>
                      <div style={{ color: textColor }} className="text-sm font-medium mt-0.5">Giường Điều Chỉnh Điện</div>
                    </div>
                    <div className="text-right">
                      <div style={{ color: `${textColor}50` }} className="text-[10px]">Từ</div>
                      <div style={{ color: primary }} className="text-base font-bold">29.900.000₫</div>
                    </div>
                  </div>
                </div>

                {/* B2B pill */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setB2bOpen(true)}
                    style={{ borderColor: `${textColor}20`, color: `${textColor}55` }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium hover:opacity-80 transition-opacity"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Trở thành đối tác B2B
                  </button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}
