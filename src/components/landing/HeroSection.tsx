"use client";
import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { ScrollReveal } from "./ScrollReveal";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";
import { openB2BPopup } from "@/lib/b2b-popup";

// ─── Trust badges ─────────────────────────────────────────────────────────────
const TRUST_STATS = [
  { value: "10.000+", label: "Khách hàng hài lòng" },
  { value: "5 năm", label: "Bảo hành toàn diện" },
  { value: "30 ngày", label: "Dùng thử miễn phí" },
  { value: "2 giờ", label: "Lắp đặt tại nhà" },
];

const SLEEP_PHASES = [
  {
    number: "01",
    image: "/hero/sleep-cycle/01-relax.jpg",
    shortLabel: "Thư giãn",
    eyebrow: "TRƯỚC GIẤC NGỦ",
    title: "Chạm để cơ thể thả lỏng",
    description: "Nâng đầu đọc sách · Thả lỏng vai lưng · Lưu tư thế yêu thích",
  },
  {
    number: "02",
    image: "/hero/sleep-cycle/02-sleep.jpg",
    shortLabel: "Giấc ngủ",
    eyebrow: "TRONG GIẤC NGỦ",
    title: "Êm ái theo từng nhịp nghỉ ngơi",
    description: "Tư thế Zero Gravity · Motor vận hành êm · Điều chỉnh nâng đỡ linh hoạt",
  },
  {
    number: "03",
    image: "/hero/sleep-cycle/03-wake.jpg",
    shortLabel: "Thức dậy",
    eyebrow: "BẮT ĐẦU NGÀY MỚI",
    title: "Thức dậy nhẹ nhàng hơn",
    description: "Nâng đầu vừa vặn · Rời giường thuận tiện · Khởi đầu ngày mới thoải mái",
  },
];

const MIDNIGHT_MILESTONE = 0.46;
const WAKE_MILESTONE = 0.82;
const PHASE_MILESTONES = [0, MIDNIGHT_MILESTONE, WAKE_MILESTONE];

interface HeroSectionProps {
  theme?: SiteTheme;
}

export default function HeroSection({ theme }: HeroSectionProps) {
  const [activePhase, setActivePhase] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  const primary = theme?.colors.primary ?? "#C9A84C";
  const secondary = theme?.colors.secondary ?? "#9A7A2E";
  const bgFrom = theme?.hero.bgGradientFrom ?? "#080600";
  const bgTo = theme?.hero.bgGradientTo ?? "#1A1500";
  const textColor = theme?.colors.text ?? "#F5EDD6";
  const borderColor = theme?.colors.border ?? "#2D2500";
  const maxWidth = theme?.layout.maxWidth ?? 1280;
  const heroTitle = theme?.hero.title ?? "Ngủ Ngon Hơn\nMỗi Đêm";
  const heroSubtitle = theme?.hero.subtitle ?? "Giường điều chỉnh điện SmartFurni — nâng hạ đầu & chân chính xác, motor êm ái, điều khiển bằng remote hoặc ứng dụng di động.";
  const titleFontSizeBase = theme?.hero.titleFontSize ?? 64;
  const titleFontSize = `${titleFontSizeBase}px`;
  const titleColor = theme?.hero.titleColor ?? textColor;
  const titleAccentColor = theme?.hero.titleAccentColor ?? primary;
  const ctaSecondaryText = theme?.hero.ctaSecondaryText ?? "Nhận tư vấn miễn phí";
  const configuredSecondaryLink = theme?.hero.ctaSecondaryLink?.trim();
  const ctaSecondaryLink = !configuredSecondaryLink || configuredSecondaryLink === "#demo"
    ? "/dashboard"
    : configuredSecondaryLink;

  const heroOverlayOpacity = Math.min(90, Math.max(35, theme?.hero?.overlayOpacity ?? 60)) / 100;
  const phase = SLEEP_PHASES[activePhase];
  const elapsedClockHours = scrollProgress <= MIDNIGHT_MILESTONE
    ? 5 * (scrollProgress / MIDNIGHT_MILESTONE)
    : scrollProgress <= WAKE_MILESTONE
      ? 5 + 6 * ((scrollProgress - MIDNIGHT_MILESTONE) / (WAKE_MILESTONE - MIDNIGHT_MILESTONE))
      : 11;
  const clockHandAngle = 210 + elapsedClockHours * 30;
  const clockArcPercent = (elapsedClockHours / 12) * 100;
  const heroTitleParts = heroTitle.includes("\n")
    ? heroTitle.split("\n")
    : (() => {
        const words = heroTitle.split(" ");
        const half = Math.ceil(words.length / 2);
        return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
      })();

  useEffect(() => {
    const updatePhaseFromScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const scrollDistance = Math.max(1, hero.offsetHeight - window.innerHeight);
      const progress = Math.min(0.9999, Math.max(0, -rect.top / scrollDistance));
      const nextPhase = progress >= WAKE_MILESTONE ? 2 : progress >= MIDNIGHT_MILESTONE ? 1 : 0;
      setScrollProgress(progress);
      setActivePhase((current) => current === nextPhase ? current : nextPhase);
    };

    updatePhaseFromScroll();
    window.addEventListener("scroll", updatePhaseFromScroll, { passive: true });
    window.addEventListener("resize", updatePhaseFromScroll);
    return () => {
      window.removeEventListener("scroll", updatePhaseFromScroll);
      window.removeEventListener("resize", updatePhaseFromScroll);
    };
  }, []);

  const selectPhase = (index: number) => {
    setActivePhase(index);
    const hero = heroRef.current;
    if (!hero) return;
    const sectionTop = window.scrollY + hero.getBoundingClientRect().top;
    const scrollDistance = Math.max(1, hero.offsetHeight - window.innerHeight);
    const targetProgress = PHASE_MILESTONES[index] + (index === 0 ? 0 : 0.012);
    window.scrollTo({ top: sectionTop + scrollDistance * targetProgress, behavior: "smooth" });
  };

  const heroVars = {
    "--sf-hero-primary": primary,
    "--sf-hero-secondary": secondary,
    "--sf-hero-text": textColor,
    "--sf-hero-border": borderColor,
    "--sf-hero-bg": bgFrom,
    "--sf-cycle-gold": "#d8c69f",
    "--sf-hero-title-size": `${titleFontSizeBase}px`,
  } as CSSProperties;

  return (
    <>
      {/* ── SMARTFURNI SLEEP-CYCLE HERO ── */}
      <section
        ref={heroRef}
        style={heroVars}
        className="sf-cycle-hero relative isolate max-w-full"
      >
        <div className="sf-cycle-hero__sticky" style={{ background: `linear-gradient(160deg, ${bgFrom} 0%, ${bgTo} 100%)` }}>
        <div className="sf-cycle-hero__media absolute inset-0 z-0">
          {SLEEP_PHASES.map((item, index) => (
            <img
              key={`backdrop-${item.number}`}
              src={item.image}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
              className={`sf-cycle-hero__backdrop ${activePhase === index ? "is-active" : ""}`}
            />
          ))}
          {SLEEP_PHASES.map((item, index) => (
            <img
              key={item.number}
              src={item.image}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
              fetchPriority={index === 0 ? "high" : "auto"}
              className={`sf-cycle-hero__image h-full w-full object-cover ${activePhase === index ? "is-active" : ""}`}
            />
          ))}
          <div
            className="sf-cycle-hero__shade absolute inset-0"
            style={{
              opacity: Math.max(0.12, heroOverlayOpacity * 0.2),
            }}
          />
        </div>

        <div className="sf-cycle-hero__atmosphere absolute inset-0 z-[1] pointer-events-none" aria-hidden="true">
          <span className="sf-cycle-hero__glow" />
          <span className="sf-cycle-hero__stars" />
        </div>

        <div style={{ maxWidth }} className="sf-cycle-hero__inner relative z-10 mx-auto w-full px-5 sm:px-8">
          <ScrollReveal variant="fadeUp" delay={0} className="sf-cycle-hero__intro">
            <div className="sf-cycle-hero__eyebrow">
              <span /> Giường điều chỉnh điện SmartFurni
            </div>
            <h1 className="sf-cycle-hero__headline" style={{ fontSize: titleFontSize }}>
              <span style={{ color: titleColor }}>{heroTitleParts[0]}</span>
              <strong style={{ color: titleAccentColor }}>
                {heroTitleParts[1] || "Trọn vẹn từng nhịp nghỉ ngơi"}
              </strong>
            </h1>
            <p className="sf-cycle-hero__subtitle">{heroSubtitle}</p>
          </ScrollReveal>

          <div className="sf-cycle-stage" aria-live="polite">
            <div className="sf-cycle-ring" aria-hidden="true">
              <svg className="sf-cycle-clock" viewBox="0 0 100 100">
                <g className="sf-cycle-clock__ticks">
                  {Array.from({ length: 60 }, (_, index) => {
                    const isMajorTick = index % 5 === 0;
                    return (
                      <line
                        key={index}
                        className={isMajorTick ? "sf-cycle-clock__tick sf-cycle-clock__tick--major" : "sf-cycle-clock__tick"}
                        x1="50"
                        y1="4"
                        x2="50"
                        y2={isMajorTick ? "7.1" : "6.1"}
                        transform={`rotate(${index * 6} 50 50)`}
                      />
                    );
                  })}
                </g>
                <circle
                  className="sf-cycle-clock__progress"
                  cx="50"
                  cy="50"
                  r="46"
                  pathLength="100"
                  strokeDasharray={`${clockArcPercent} 100`}
                />
                <circle className="sf-cycle-clock__milestone" cx="27" cy="90" r="0.9" />
                <circle className="sf-cycle-clock__milestone" cx="50" cy="4" r="0.9" />
                <circle className="sf-cycle-clock__milestone" cx="50" cy="96" r="0.9" />
                <text className="sf-cycle-clock__label" x="22" y="84">19:00</text>
                <text className="sf-cycle-clock__label" x="50" y="10" textAnchor="middle">00:00</text>
                <text className="sf-cycle-clock__label" x="50" y="91" textAnchor="middle">06:00</text>
              </svg>
              <span className="sf-cycle-ring__hand" style={{ transform: `translateX(-50%) rotate(${clockHandAngle}deg)` }} />
              <span className="sf-cycle-sensor sf-cycle-sensor--one" />
              <span className="sf-cycle-sensor sf-cycle-sensor--two" />
              <span className="sf-cycle-sensor sf-cycle-sensor--three" />
            </div>

            <div className="sf-cycle-copy" key={phase.number}>
              <span className="sf-cycle-copy__eyebrow">{phase.eyebrow}</span>
              <h2>{phase.title}</h2>
              <p>{phase.description}</p>
            </div>

            <div className="sf-cycle-index" aria-label={`Giai đoạn ${phase.number} trên 03`}>
              <strong>{phase.number}</strong><span>/ 03</span>
            </div>
          </div>

          <div className="sf-cycle-hero__footer">
            <div className="sf-cycle-tabs" role="tablist" aria-label="Các giai đoạn nghỉ ngơi">
              {SLEEP_PHASES.map((item, index) => (
                <button
                  key={item.number}
                  type="button"
                  role="tab"
                  aria-selected={activePhase === index}
                  className={activePhase === index ? "is-active" : ""}
                  onClick={() => selectPhase(index)}
                >
                  <span>{item.number}</span>{item.shortLabel}
                </button>
              ))}
            </div>

            <div className="sf-cycle-actions">
              <div className="sf-cycle-actions__links">
                  <button
                    type="button"
                    onClick={openB2BPopup}
                    className="sf-cycle-cta sf-cycle-cta--b2b"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Trở thành đối tác B2B
                  </button>
                  <Link
                    href={ctaSecondaryLink}
                    className="sf-cycle-cta sf-cycle-cta--secondary"
                  >
                    {ctaSecondaryText}
                  </Link>
              </div>
              <div className="sf-cycle-trust">
                {TRUST_STATS.slice(0, 2).map((stat) => (
                  <span key={stat.label}><strong>{stat.value}</strong>{stat.label}</span>
                ))}
              </div>
            </div>
          </div>

        </div>
        </div>
      </section>
    </>
  );
}
