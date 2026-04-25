"use client";
import React, { useState, useEffect, useRef } from "react";

// ─── Design tokens (match LpGsf150Client) ────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#D4C4A0";
const BLACK = "#0A0A08";
const BLACK_SOFT = "#111109";
const BLACK_CARD = "#16140E";
const BLACK_BORDER = "rgba(201,168,76,0.12)";
const WHITE = "#F5F0E8";
const GRAY = "#7A7468";
const GRAY_LIGHT = "#A8A090";
const FONT_HEADING = "'Cormorant Garamond', 'Playfair Display', Georgia, serif";
const FONT_BODY = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const R_LG = "16px";

// ─── SVG Illustrations ────────────────────────────────────────────────────────

// Bước 1: Giường có nệm → tháo nệm ra
function BedWithMattressSVG({ showMattress }: { showMattress: boolean }) {
  return (
    <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 260 }}>
      {/* Headboard */}
      <rect x="20" y="30" width="220" height="28" rx="4" fill="#2A2418" stroke={GOLD} strokeWidth="1.2" />
      {/* Bed frame */}
      <rect x="20" y="58" width="220" height="80" rx="3" fill="#1A1610" stroke={GOLD} strokeWidth="1" />
      {/* Legs */}
      <rect x="28" y="138" width="12" height="28" rx="3" fill="#2A2418" />
      <rect x="220" y="138" width="12" height="28" rx="3" fill="#2A2418" />
      {/* Mattress - animates out */}
      <g style={{ transition: "opacity 0.6s ease, transform 0.6s ease", opacity: showMattress ? 1 : 0, transform: showMattress ? "translateY(0)" : "translateY(-30px)" }}>
        <rect x="28" y="42" width="204" height="22" rx="4" fill="#3A3020" stroke={GOLD} strokeWidth="1" />
        <rect x="28" y="44" width="204" height="6" rx="2" fill="rgba(201,168,76,0.15)" />
        <text x="130" y="57" textAnchor="middle" fill={GRAY_LIGHT} fontSize="9" fontFamily={FONT_BODY}>NỆM</text>
      </g>
      {/* Arrow indicating removal */}
      {!showMattress && (
        <g style={{ animation: "fadeIn 0.4s ease 0.3s both" }}>
          <line x1="130" y1="35" x2="130" y2="15" stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 2" />
          <polygon points="126,16 130,8 134,16" fill={GOLD} />
          <text x="130" y="6" textAnchor="middle" fill={GOLD} fontSize="8" fontFamily={FONT_BODY}>Tháo nệm</text>
        </g>
      )}
      {/* Bed slats */}
      {[75, 90, 105, 120].map((y, i) => (
        <rect key={i} x="28" y={y} width="204" height="5" rx="1" fill="#2A2418" />
      ))}
    </svg>
  );
}

// Bước 2: Khung GSF150 độc lập + cắm điện
function FramePlugSVG({ plugged }: { plugged: boolean }) {
  return (
    <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 260 }}>
      {/* Frame base */}
      <rect x="30" y="90" width="200" height="12" rx="3" fill="#2A2418" stroke={GOLD} strokeWidth="1" />
      {/* Frame legs */}
      <rect x="30" y="102" width="10" height="40" rx="2" fill="#2A2418" stroke={GOLD} strokeWidth="0.8" />
      <rect x="220" y="102" width="10" height="40" rx="2" fill="#2A2418" stroke={GOLD} strokeWidth="0.8" />
      <rect x="80" y="102" width="10" height="30" rx="2" fill="#2A2418" />
      <rect x="170" y="102" width="10" height="30" rx="2" fill="#2A2418" />
      {/* Head section (raised) */}
      <g style={{ transition: "transform 0.8s ease", transformOrigin: "30px 90px", transform: "rotate(-28deg)" }}>
        <rect x="30" y="60" width="100" height="30" rx="3" fill="#1E1C14" stroke={GOLD} strokeWidth="1" />
        <rect x="32" y="62" width="96" height="8" rx="2" fill="rgba(201,168,76,0.1)" />
      </g>
      {/* Foot section (raised slightly) */}
      <g style={{ transition: "transform 0.8s ease", transformOrigin: "230px 90px", transform: "rotate(15deg)" }}>
        <rect x="130" y="72" width="100" height="18" rx="3" fill="#1E1C14" stroke={GOLD} strokeWidth="1" />
      </g>
      {/* Motor icon */}
      <circle cx="130" cy="90" r="8" fill="#2A2418" stroke={GOLD} strokeWidth="1" />
      <text x="130" y="94" textAnchor="middle" fill={GOLD} fontSize="8" fontFamily={FONT_BODY}>M</text>
      {/* Power cord */}
      <path d="M 230 102 Q 248 110 248 130" stroke={GRAY} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Power outlet */}
      <g style={{ transition: "opacity 0.5s ease, transform 0.5s ease", opacity: plugged ? 1 : 0.3, transform: plugged ? "scale(1)" : "scale(0.85)", transformOrigin: "248px 148px" }}>
        <rect x="236" y="136" width="24" height="24" rx="3" fill="#1A1610" stroke={plugged ? GOLD : GRAY} strokeWidth="1.5" />
        <rect x="241" y="141" width="4" height="8" rx="1" fill={plugged ? GOLD : GRAY} />
        <rect x="247" y="141" width="4" height="8" rx="1" fill={plugged ? GOLD : GRAY} />
        {plugged && (
          <>
            <circle cx="248" cy="162" r="4" fill="rgba(201,168,76,0.2)" stroke={GOLD} strokeWidth="1" />
            <text x="248" y="165" textAnchor="middle" fill={GOLD} fontSize="6">⚡</text>
          </>
        )}
      </g>
      {/* Plug */}
      <g style={{ transition: "transform 0.6s ease", transform: plugged ? "translate(0,0)" : "translate(10px, -8px)" }}>
        <path d="M 248 130 L 248 136" stroke={GRAY} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="244" y="126" width="8" height="6" rx="1" fill="#2A2418" stroke={GRAY} strokeWidth="1" />
      </g>
      {/* Status text */}
      {plugged && (
        <text x="130" y="175" textAnchor="middle" fill={GOLD} fontSize="9" fontFamily={FONT_BODY}>✓ Hoạt động bình thường</text>
      )}
    </svg>
  );
}

// Bước 3: Đặt khung vào lòng giường
function FrameInBedSVG({ progress }: { progress: number }) {
  // progress: 0 = khung bên ngoài, 1 = khung đã vào trong lòng giường
  const frameX = 28 + (1 - progress) * 80;
  const frameOpacity = 0.4 + progress * 0.6;
  return (
    <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 260 }}>
      {/* Headboard */}
      <rect x="20" y="25" width="220" height="25" rx="4" fill="#2A2418" stroke={GOLD} strokeWidth="1.2" />
      {/* Bed frame outer */}
      <rect x="20" y="50" width="220" height="90" rx="3" fill="#1A1610" stroke={GOLD} strokeWidth="1" />
      {/* Legs */}
      <rect x="28" y="140" width="12" height="25" rx="3" fill="#2A2418" />
      <rect x="220" y="140" width="12" height="25" rx="3" fill="#2A2418" />
      {/* Bed interior */}
      <rect x="28" y="55" width="204" height="80" rx="2" fill="#111109" />
      {/* GSF150 frame sliding in */}
      <g style={{ transition: "transform 0.8s cubic-bezier(0.4,0,0.2,1)", transform: `translateX(${(1 - progress) * -60}px)`, opacity: frameOpacity }}>
        <rect x={frameX} y="60" width="204" height="12" rx="2" fill="#2A2418" stroke={GOLD} strokeWidth="1" />
        {/* Head section */}
        <rect x={frameX} y="48" width="90" height="14" rx="2" fill="#1E1C14" stroke={GOLD} strokeWidth="0.8"
          style={{ transition: "transform 0.8s ease", transformOrigin: `${frameX}px 60px`, transform: progress > 0.5 ? "rotate(-20deg)" : "rotate(0deg)" }} />
        {/* Foot section */}
        <rect x={frameX + 114} y="55" width="90" height="7" rx="2" fill="#1E1C14" stroke={GOLD} strokeWidth="0.8"
          style={{ transition: "transform 0.8s ease", transformOrigin: `${frameX + 204}px 60px`, transform: progress > 0.5 ? "rotate(10deg)" : "rotate(0deg)" }} />
        {/* Motor */}
        <circle cx={frameX + 102} cy="66" r="7" fill="#2A2418" stroke={GOLD} strokeWidth="0.8" />
        {/* Slats */}
        {[72, 82, 92, 102, 112].map((y, i) => (
          <rect key={i} x={frameX} y={y} width="204" height="4" rx="1" fill="#2A2418" />
        ))}
      </g>
      {/* Arrow */}
      {progress < 0.9 && (
        <g>
          <line x1="240" y1="95" x2="220" y2="95" stroke={GOLD} strokeWidth="1.5" markerEnd="url(#arrow)" />
          <polygon points="220,91 212,95 220,99" fill={GOLD} />
        </g>
      )}
      {/* Checkmark when done */}
      {progress >= 0.9 && (
        <g style={{ animation: "fadeIn 0.4s ease" }}>
          <circle cx="130" cy="165" r="10" fill="rgba(201,168,76,0.15)" stroke={GOLD} strokeWidth="1" />
          <text x="130" y="169" textAnchor="middle" fill={GOLD} fontSize="10">✓</text>
        </g>
      )}
    </svg>
  );
}

// Bước 4: Đặt nệm lại + điều khiển remote
function FinalBedSVG({ showRemote }: { showRemote: boolean }) {
  return (
    <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: 260 }}>
      {/* Headboard */}
      <rect x="20" y="20" width="220" height="28" rx="4" fill="#2A2418" stroke={GOLD} strokeWidth="1.2" />
      {/* Bed frame */}
      <rect x="20" y="48" width="220" height="95" rx="3" fill="#1A1610" stroke={GOLD} strokeWidth="1" />
      {/* Legs */}
      <rect x="28" y="143" width="12" height="28" rx="3" fill="#2A2418" />
      <rect x="220" y="143" width="12" height="28" rx="3" fill="#2A2418" />
      {/* GSF150 frame (head raised) */}
      <g style={{ transformOrigin: "20px 100px", transform: "rotate(-18deg)", transition: "transform 0.8s ease" }}>
        <rect x="28" y="85" width="100" height="12" rx="2" fill="#2A2418" stroke={GOLD} strokeWidth="0.8" />
      </g>
      {/* Foot section */}
      <g style={{ transformOrigin: "240px 100px", transform: "rotate(10deg)", transition: "transform 0.8s ease" }}>
        <rect x="132" y="92" width="100" height="8" rx="2" fill="#2A2418" stroke={GOLD} strokeWidth="0.8" />
      </g>
      {/* Mattress on top (raised) */}
      <g style={{ transformOrigin: "20px 80px", transform: "rotate(-18deg)" }}>
        <rect x="28" y="62" width="100" height="24" rx="4" fill="#3A3020" stroke={GOLD} strokeWidth="1" />
        <rect x="28" y="64" width="100" height="6" rx="2" fill="rgba(201,168,76,0.15)" />
      </g>
      <g style={{ transformOrigin: "240px 88px", transform: "rotate(10deg)" }}>
        <rect x="132" y="76" width="100" height="18" rx="4" fill="#3A3020" stroke={GOLD} strokeWidth="1" />
        <rect x="132" y="78" width="100" height="5" rx="2" fill="rgba(201,168,76,0.12)" />
      </g>
      {/* Remote control */}
      <g style={{ transition: "opacity 0.5s ease, transform 0.5s ease", opacity: showRemote ? 1 : 0, transform: showRemote ? "translate(0,0)" : "translate(20px, 10px)" }}>
        <rect x="10" y="110" width="22" height="38" rx="5" fill="#1E1C14" stroke={GOLD} strokeWidth="1.2" />
        <rect x="14" y="114" width="14" height="8" rx="2" fill="rgba(201,168,76,0.2)" />
        {[0, 1, 2].map(row => [0, 1].map(col => (
          <rect key={`${row}-${col}`} x={14 + col * 8} y={125 + row * 7} width="6" height="5" rx="1.5" fill={GOLD} opacity="0.6" />
        )))}
        {/* Signal waves */}
        {[1, 2, 3].map(i => (
          <path key={i} d={`M ${21 + i * 5} 108 Q ${21 + i * 5} 104 ${25 + i * 5} 100`}
            stroke={GOLD} strokeWidth="1" fill="none" opacity={0.3 + i * 0.2}
            style={{ animation: `pulse ${0.8 + i * 0.2}s ease-in-out infinite alternate` }} />
        ))}
      </g>
      {/* Stars / comfort indicators */}
      {showRemote && [
        { x: 180, y: 55 }, { x: 200, y: 45 }, { x: 220, y: 58 }
      ].map((pos, i) => (
        <text key={i} x={pos.x} y={pos.y} fill={GOLD} fontSize="10"
          style={{ animation: `fadeIn 0.3s ease ${i * 0.15}s both` }}>✦</text>
      ))}
    </svg>
  );
}

// ─── Step data ────────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: "01",
    title: "Tháo nệm ra khỏi giường",
    desc: "Nhấc nệm ra khỏi giường hiện tại của bạn và đặt sang một bên. Không cần tháo khung giường gỗ.",
    tip: "Giữ nguyên khung giường gỗ — GSF150 sẽ đặt vừa vào lòng giường.",
  },
  {
    num: "02",
    title: "Cắm điện & kiểm tra hoạt động",
    desc: "Đặt khung GSF150 ra ngoài, cắm điện vào ổ cắm tiêu chuẩn 220V. Nhấn remote để kiểm tra motor hoạt động bình thường.",
    tip: "Đảm bảo motor nâng đầu và chân hoạt động trơn tru trước khi lắp vào giường.",
  },
  {
    num: "03",
    title: "Đặt khung vào lòng giường",
    desc: "Trả khung GSF150 về vị trí phẳng, trượt vào lòng giường gỗ hiện có. Khung tự khớp — không cần vít hay dụng cụ.",
    tip: "Kiểm tra 4 góc khung nằm gọn trong lòng giường trước khi tiếp tục.",
  },
  {
    num: "04",
    title: "Đặt nệm lại & tận hưởng",
    desc: "Đặt nệm lên khung GSF150. Dùng remote điều chỉnh tư thế đầu giường 0–70° và chân giường 0–45° theo ý muốn.",
    tip: "Nệm lò xo túi và foam đều tương thích hoàn hảo với GSF150.",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export function InstallGuideSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Intersection observer for auto-start
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-advance steps
  useEffect(() => {
    if (!isVisible || !autoPlay) return;
    timerRef.current = setInterval(() => {
      setActiveStep(prev => (prev + 1) % STEPS.length);
    }, 3200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isVisible, autoPlay]);

  const handleStepClick = (i: number) => {
    setActiveStep(i);
    setAutoPlay(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const renderIllustration = () => {
    switch (activeStep) {
      case 0: return <BedWithMattressSVG showMattress={false} />;
      case 1: return <FramePlugSVG plugged={true} />;
      case 2: return <FrameInBedSVG progress={1} />;
      case 3: return <FinalBedSVG showRemote={true} />;
      default: return null;
    }
  };

  return (
    <section
      ref={sectionRef}
      style={{
        background: `linear-gradient(180deg, ${BLACK_SOFT} 0%, ${BLACK} 100%)`,
        padding: "clamp(60px, 8vw, 100px) clamp(20px, 5vw, 80px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(40px, 6vw, 64px)" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.3)`,
            borderRadius: "100px", padding: "7px 18px", marginBottom: 20,
          }}>
            <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>
              Hướng dẫn lắp đặt
            </span>
          </div>
          <h2 style={{
            fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.1,
            marginBottom: 12, fontFamily: FONT_HEADING, letterSpacing: "-0.02em", color: WHITE,
          }}>
            Lắp Đặt Trong
          </h2>
          <div style={{
            fontSize: "clamp(22px, 3.5vw, 42px)", fontWeight: 700, fontFamily: FONT_HEADING,
            letterSpacing: "-0.01em", marginBottom: 16,
            background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            4 Bước Đơn Giản
          </div>
          <p style={{ color: GRAY_LIGHT, fontSize: "clamp(14px, 1.6vw, 16px)", lineHeight: 1.75, fontFamily: FONT_BODY, maxWidth: 560, margin: "0 auto" }}>
            Không cần thợ lắp đặt. Không cần tháo giường cũ. Chỉ cần 15–20 phút là hoàn thành.
          </p>
        </div>

        {/* Main content: illustration + step info */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "clamp(24px, 4vw, 60px)",
          alignItems: "center",
          marginBottom: "clamp(32px, 5vw, 52px)",
        }}>
          {/* SVG Illustration panel */}
          <div style={{
            background: BLACK_CARD,
            border: `1px solid ${BLACK_BORDER}`,
            borderRadius: "20px",
            padding: "clamp(24px, 4vw, 48px)",
            display: "flex", flexDirection: "column" as const, alignItems: "center",
            minHeight: 280,
            position: "relative" as const,
            overflow: "hidden",
          }}>
            {/* Step badge */}
            <div style={{
              position: "absolute" as const, top: 16, left: 16,
              background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
              color: BLACK, fontWeight: 800, fontSize: 11,
              fontFamily: FONT_BODY, letterSpacing: "0.1em",
              padding: "4px 12px", borderRadius: "100px",
            }}>
              BƯỚC {STEPS[activeStep].num}
            </div>

            {/* Illustration */}
            <div style={{
              width: "100%", maxWidth: 260,
              transition: "opacity 0.35s ease",
              marginTop: 24,
            }}>
              {renderIllustration()}
            </div>

            {/* Progress dots */}
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleStepClick(i)}
                  style={{
                    width: i === activeStep ? 24 : 8,
                    height: 8, borderRadius: 4,
                    background: i === activeStep ? GOLD : "rgba(201,168,76,0.25)",
                    border: "none", cursor: "pointer", padding: 0,
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Step info panel */}
          <div>
            <div style={{
              fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 600,
              fontFamily: FONT_HEADING, color: WHITE, marginBottom: 14, lineHeight: 1.3,
            }}>
              {STEPS[activeStep].title}
            </div>
            <p style={{
              color: GRAY_LIGHT, fontSize: "clamp(14px, 1.6vw, 16px)",
              lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 20,
            }}>
              {STEPS[activeStep].desc}
            </p>
            {/* Tip box */}
            <div style={{
              background: "rgba(201,168,76,0.06)",
              border: `1px solid rgba(201,168,76,0.2)`,
              borderLeft: `3px solid ${GOLD}`,
              borderRadius: "0 10px 10px 0",
              padding: "12px 16px",
              marginBottom: 28,
            }}>
              <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", fontFamily: FONT_BODY, marginBottom: 4 }}>💡 MẸO</div>
              <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>
                {STEPS[activeStep].tip}
              </p>
            </div>

            {/* Navigation buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
              <button
                onClick={() => handleStepClick(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                style={{
                  padding: "10px 20px", borderRadius: "100px",
                  background: "transparent",
                  border: `1px solid ${activeStep === 0 ? "rgba(201,168,76,0.15)" : "rgba(201,168,76,0.4)"}`,
                  color: activeStep === 0 ? GRAY : GOLD_LIGHT,
                  fontSize: 13, fontFamily: FONT_BODY, cursor: activeStep === 0 ? "default" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                ← Trước
              </button>
              {activeStep < STEPS.length - 1 ? (
                <button
                  onClick={() => handleStepClick(activeStep + 1)}
                  style={{
                    padding: "10px 24px", borderRadius: "100px",
                    background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
                    border: "none", color: BLACK,
                    fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  Tiếp theo →
                </button>
              ) : (
                <button
                  onClick={() => { setActiveStep(0); setAutoPlay(true); }}
                  style={{
                    padding: "10px 24px", borderRadius: "100px",
                    background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
                    border: "none", color: BLACK,
                    fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY, cursor: "pointer",
                  }}
                >
                  ↺ Xem lại
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step tabs (bottom navigation) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "clamp(8px, 1.5vw, 16px)",
        }}>
          {STEPS.map((step, i) => (
            <button
              key={i}
              onClick={() => handleStepClick(i)}
              style={{
                background: i === activeStep ? "rgba(201,168,76,0.12)" : "transparent",
                border: `1px solid ${i === activeStep ? "rgba(201,168,76,0.45)" : BLACK_BORDER}`,
                borderRadius: R_LG,
                padding: "clamp(12px, 2vw, 18px) clamp(10px, 1.5vw, 16px)",
                cursor: "pointer",
                textAlign: "left" as const,
                transition: "all 0.25s ease",
              }}
            >
              <div style={{
                color: i === activeStep ? GOLD : GRAY,
                fontSize: 9, fontWeight: 700, letterSpacing: "0.2em",
                fontFamily: FONT_BODY, marginBottom: 4,
                transition: "color 0.25s",
              }}>
                BƯỚC {step.num}
              </div>
              <div style={{
                color: i === activeStep ? WHITE : GRAY_LIGHT,
                fontSize: "clamp(11px, 1.3vw, 13px)", fontWeight: i === activeStep ? 600 : 400,
                fontFamily: FONT_HEADING, lineHeight: 1.4,
                transition: "color 0.25s",
              }}>
                {step.title}
              </div>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { from { opacity: 0.3; } to { opacity: 0.9; } }
      `}</style>
    </section>
  );
}
