"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BedSVG from "@/components/ui/BedSVG";
import type { SiteTheme } from "@/lib/theme-types";

// ─── B2B Partner types ───────────────────────────────────────────────────────
const B2B_PARTNERS = [
  {
    icon: "🛏️",
    title: "Showroom Nệm & Nội thất",
    desc: "Phân phối sỉ, chiết khấu cao, hỗ trợ trưng bày",
    href: "/lp/doi-tac-showroom-nem",
    badge: "Phổ biến nhất",
  },
  {
    icon: "🏨",
    title: "Khách sạn & Resort",
    desc: "Giải pháp giường thông minh cho phòng VIP, spa",
    href: "/catalogue",
    badge: null,
  },
  {
    icon: "🏥",
    title: "Bệnh viện & Phòng khám",
    desc: "Giường điều chỉnh y tế, hỗ trợ phục hồi chức năng",
    href: "/catalogue",
    badge: null,
  },
  {
    icon: "🏢",
    title: "Nhà phân phối nội thất",
    desc: "Đại lý chính thức, hỗ trợ marketing & bảo hành",
    href: "/catalogue",
    badge: null,
  },
  {
    icon: "🏗️",
    title: "Chủ đầu tư & Developer",
    desc: "Tích hợp giường thông minh vào dự án bất động sản",
    href: "/catalogue",
    badge: null,
  },
  {
    icon: "✈️",
    title: "Xuất khẩu & Đối tác quốc tế",
    desc: "Hợp tác OEM/ODM, xuất khẩu sang thị trường nước ngoài",
    href: "/contact",
    badge: null,
  },
];

// ─── B2B Popup ───────────────────────────────────────────────────────────────
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
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 flex items-start justify-between"
          style={{ borderBottom: `1px solid ${borderColor}` }}
        >
          <div>
            <h2 className="text-xl font-semibold" style={{ color: textColor }}>Trở thành Đối tác B2B</h2>
            <p className="text-sm mt-1" style={{ color: `${textColor}60` }}>Chọn lĩnh vực phù hợp để nhận tư vấn chuyên biệt</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
            style={{ color: `${textColor}60`, backgroundColor: `${textColor}10` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = `${primary}20`; (e.currentTarget as HTMLElement).style.color = primary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = `${textColor}10`; (e.currentTarget as HTMLElement).style.color = `${textColor}60`; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Partner grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {B2B_PARTNERS.map((p) => (
            <a
              key={p.title}
              href={p.href}
              onClick={onClose}
              className="group relative flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: `${textColor}06`, border: `1px solid ${borderColor}` }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = `${primary}12`;
                (e.currentTarget as HTMLElement).style.borderColor = `${primary}50`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = `${textColor}06`;
                (e.currentTarget as HTMLElement).style.borderColor = borderColor;
              }}
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{p.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: textColor }}>{p.title}</span>
                  {p.badge && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `linear-gradient(to right, ${primary}, ${secondary})`, color: bgFrom }}
                    >
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: `${textColor}55` }}>{p.desc}</p>
              </div>
              <svg
                className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: primary }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          ))}
        </div>

        {/* Footer note */}
        <div className="px-6 pb-5 text-center">
          <p className="text-xs" style={{ color: `${textColor}40` }}>
            Chưa tìm thấy lĩnh vực phù hợp?{" "}
            <a href="/contact" onClick={onClose} className="underline" style={{ color: primary }}>Liên hệ trực tiếp với chúng tôi</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const DEMO_PRESETS = [
  { name: "Nằm phẳng", head: 0, foot: 0 },
  { name: "Đọc sách", head: 45, foot: 15 },
  { name: "Xem TV", head: 35, foot: 15 },
  { name: "Ngồi dậy", head: 45, foot: 0 },
  { name: "Chống ngáy", head: 12, foot: 0 },
];

interface HeroSectionProps {
  theme?: SiteTheme;
}

export default function HeroSection({ theme }: HeroSectionProps) {
  const [b2bOpen, setB2bOpen] = useState(false);
  const [presetIdx, setPresetIdx] = useState(0);
  const [headAngle, setHeadAngle] = useState(0);
  const [footAngle, setFootAngle] = useState(0);
  const [ledOn, setLedOn] = useState(false);

  const primary = theme?.colors.primary ?? "#C9A84C";
  const secondary = theme?.colors.secondary ?? "#9A7A2E";
  const bgFrom = theme?.hero.bgGradientFrom ?? "#080600";
  const bgTo = theme?.hero.bgGradientTo ?? "#1A1500";
  const textColor = theme?.colors.text ?? "#F5EDD6";
  const borderColor = theme?.colors.border ?? "#2D2500";
  const surfaceColor = theme?.colors.surface ?? "#1A1500";
  const maxWidth = theme?.layout.maxWidth ?? 1280;
  const heroTitle = theme?.hero.title ?? "Giường Điều Khiển Thông Minh SmartFurni";
  const heroSubtitle = theme?.hero.subtitle ?? "Trải nghiệm giấc ngủ hoàn hảo với công nghệ điều khiển thông minh.";
  const ctaText = theme?.hero.ctaText ?? "Thử Dashboard ngay";
  const ctaLink = theme?.hero.ctaLink ?? "/dashboard";
  const ctaSecondaryText = theme?.hero.ctaSecondaryText ?? "Xem demo";
  const ctaSecondaryLink = theme?.hero.ctaSecondaryLink ?? "#download";

  useEffect(() => {
    const interval = setInterval(() => {
      setPresetIdx((i) => (i + 1) % DEMO_PRESETS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const target = DEMO_PRESETS[presetIdx];
    const steps = 30;
    let step = 0;
    const startHead = headAngle;
    const startFoot = footAngle;
    const timer = setInterval(() => {
      step++;
      const t = step / steps;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setHeadAngle(Math.round(startHead + (target.head - startHead) * ease));
      setFootAngle(Math.round(startFoot + (target.foot - startFoot) * ease));
      if (step >= steps) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [presetIdx]); // eslint-disable-line

  useEffect(() => {
    const t = setInterval(() => setLedOn((v) => !v), 4000);
    return () => clearInterval(t);
  }, []);

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
    <section
      style={{ background: `linear-gradient(135deg, ${bgFrom} 0%, ${bgTo} 100%)` }}
      className="relative min-h-screen flex items-center overflow-hidden pt-16"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ background: `radial-gradient(circle at 30% 30%, ${primary}08, transparent 60%)` }} className="absolute inset-0" />
        <div style={{ background: `radial-gradient(circle at 70% 70%, ${primary}05, transparent 60%)` }} className="absolute inset-0" />
      </div>

      <div style={{ maxWidth }} className="relative mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — Text */}
        <div className="space-y-8">
          <div
            style={{ borderColor: `${primary}40`, backgroundColor: `${primary}0d` }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
          >
            <div style={{ backgroundColor: primary }} className="w-2 h-2 rounded-full animate-pulse" />
            <span style={{ color: primary }} className="text-xs font-medium tracking-wider">CÔNG NGHỆ ĐIỀU KHIỂN THÔNG MINH</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-light leading-tight">
            <span style={{ color: textColor }} className="block opacity-90">
              {heroTitle}
            </span>
          </h1>

          <p style={{ color: `${textColor}99` }} className="text-lg leading-relaxed max-w-md">
            {heroSubtitle}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href={ctaLink}
              style={{ background: `linear-gradient(to right, ${primary}, ${secondary})`, color: bgFrom }}
              className="px-6 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {ctaText}
            </Link>
            <a
              href={ctaSecondaryLink}
              style={{ borderColor: `${primary}60`, color: primary }}
              className="px-6 py-3 rounded-full border text-sm font-medium hover:opacity-80 transition-opacity"
            >
              {ctaSecondaryText}
            </a>
            <button
              onClick={() => setB2bOpen(true)}
              style={{ borderColor: `${textColor}25`, color: `${textColor}80` }}
              className="px-6 py-3 rounded-full border text-sm font-medium transition-all duration-200 flex items-center gap-2"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${primary}60`;
                (e.currentTarget as HTMLElement).style.color = primary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${textColor}25`;
                (e.currentTarget as HTMLElement).style.color = `${textColor}80`;
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Đối tác B2B
            </button>
          </div>

          {/* Stats — benefit-oriented */}
          <div style={{ borderTopColor: borderColor }} className="grid grid-cols-3 gap-6 pt-4 border-t">
            {[
              { value: "10.000+", label: "Khách hàng hài lòng" },
              { value: "30 ngày", label: "Dùng thử miễn phí" },
              { value: "5 năm", label: "Bảo hành toàn diện" },
            ].map((stat) => (
              <div key={stat.label}>
                <div style={{ color: primary }} className="text-xl font-semibold">{stat.value}</div>
                <div style={{ color: `${textColor}50` }} className="text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Bed Demo */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-full max-w-lg">
            <div style={{ background: `radial-gradient(circle, ${primary}15, transparent 70%)` }} className="absolute inset-0 rounded-3xl" />
            <div
              style={{ backgroundColor: `${surfaceColor}99`, borderColor: borderColor }}
              className="relative border rounded-3xl p-8 backdrop-blur-sm"
            >
              <BedSVG
                headAngle={headAngle}
                footAngle={footAngle}
                ledOn={ledOn}
                ledColor={primary}
                size={380}
                className="w-full"
              />
            </div>
          </div>

          {/* Preset pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {DEMO_PRESETS.map((p, i) => (
              <button
                key={p.name}
                onClick={() => setPresetIdx(i)}
                style={i === presetIdx
                  ? { backgroundColor: primary, color: bgFrom }
                  : { borderColor: borderColor, color: `${textColor}60` }
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${i !== presetIdx ? "border" : ""}`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <p style={{ color: `${textColor}40` }} className="text-xs text-center">
            Demo tương tác — nhấn để thay đổi tư thế giường
          </p>
        </div>
      </div>
    </section>
    </>
  );
}
