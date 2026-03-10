"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import BedSVG from "@/components/ui/BedSVG";
import type { SiteTheme } from "@/lib/theme-types";

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
  const ctaSecondaryText = theme?.hero.ctaSecondaryText ?? "Tải ứng dụng";
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

          <div className="flex flex-wrap gap-4">
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
  );
}
