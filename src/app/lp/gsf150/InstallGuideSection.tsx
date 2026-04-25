"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

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

const INSTALL_VIDEO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663305063350/hVRGaTInwtcssKOh.mp4";

const STEPS = [
  {
    num: "01",
    title: "Tháo nệm ra khỏi giường",
    desc: "Nhấc nệm ra khỏi giường hiện tại và đặt sang một bên. Không cần tháo khung giường gỗ.",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663305063350/GMFkFfNyYvPnnXnxnhdKGr/install_step1-gVvLJDLjfQCtVHPj9R4KHn.webp",
  },
  {
    num: "02",
    title: "Cắm điện & kiểm tra hoạt động",
    desc: "Đặt khung GSF150 ra ngoài, cắm điện 220V và nhấn remote kiểm tra motor nâng đầu/chân hoạt động bình thường.",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663305063350/GMFkFfNyYvPnnXnxnhdKGr/install_step2-T6wUQcUsbLZCsssfygA2WH.webp",
  },
  {
    num: "03",
    title: "Đặt khung vào lòng giường",
    desc: "Trả khung về vị trí phẳng, trượt vào lòng giường gỗ hiện có. Khung tự khớp — không cần vít hay dụng cụ.",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663305063350/GMFkFfNyYvPnnXnxnhdKGr/install_step3-HKaeWb8Lsa5dbSesau2m3r.webp",
  },
  {
    num: "04",
    title: "Đặt nệm lại & tận hưởng",
    desc: "Đặt nệm lên khung GSF150. Dùng remote điều chỉnh tư thế đầu giường 0–70° và chân giường 0–45° theo ý muốn.",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663305063350/GMFkFfNyYvPnnXnxnhdKGr/install_step4-mGm6PRjYrRc8ZkdnDn6YbN.webp",
  },
];

export function InstallGuideSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.25 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !autoPlay) return;
    timerRef.current = setInterval(() => {
      setActiveStep(prev => (prev + 1) % STEPS.length);
    }, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isVisible, autoPlay]);

  const handleStep = (i: number) => {
    setActiveStep(i);
    setAutoPlay(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <section
      ref={sectionRef}
      style={{
        background: `linear-gradient(180deg, ${BLACK} 0%, ${BLACK_SOFT} 100%)`,
        padding: "clamp(60px, 8vw, 100px) clamp(20px, 5vw, 60px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>

        {/* ── Header ── */}
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
            fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300,
            lineHeight: 1.1, marginBottom: 10, fontFamily: FONT_HEADING,
            letterSpacing: "-0.02em", color: WHITE,
          }}>
            Lắp Đặt Trong
          </h2>
          <div style={{
            fontSize: "clamp(22px, 3.5vw, 42px)", fontWeight: 700,
            fontFamily: FONT_HEADING, letterSpacing: "-0.01em", marginBottom: 16,
            background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            4 Bước Đơn Giản
          </div>
          <p style={{
            color: GRAY_LIGHT, fontSize: "clamp(14px, 1.6vw, 16px)",
            lineHeight: 1.75, fontFamily: FONT_BODY, maxWidth: 520, margin: "0 auto",
          }}>
            Không cần thợ. Không cần tháo giường cũ. Chỉ 15–20 phút là xong.
          </p>
        </div>

        {/* ── Video Player ── */}
        <div style={{
          marginBottom: "clamp(40px, 5vw, 56px)",
          borderRadius: "16px",
          overflow: "hidden",
          border: `1px solid rgba(201,168,76,0.2)`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          position: "relative",
          background: "#000",
        }}>
          <video
            ref={videoRef}
            src={INSTALL_VIDEO_URL}
            style={{ width: "100%", display: "block", maxHeight: "480px", objectFit: "contain" }}
            controls
            playsInline
            preload="metadata"
            poster={STEPS[0].img}
          />
          {/* Gold border accent */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            pointerEvents: "none",
          }} />
        </div>

        {/* ── Desktop: 4 cards side by side ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "clamp(12px, 2vw, 20px)",
          marginBottom: 40,
        }}
          className="install-grid"
        >
          {STEPS.map((step, i) => {
            const isActive = i === activeStep;
            return (
              <button
                key={i}
                onClick={() => handleStep(i)}
                style={{
                  background: isActive ? "rgba(201,168,76,0.08)" : BLACK_CARD,
                  border: `1px solid ${isActive ? "rgba(201,168,76,0.5)" : BLACK_BORDER}`,
                  borderRadius: "16px",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left" as const,
                  transition: "all 0.3s ease",
                  overflow: "hidden",
                  transform: isActive ? "translateY(-4px)" : "translateY(0)",
                  boxShadow: isActive ? "0 12px 40px rgba(201,168,76,0.12)" : "none",
                }}
              >
                {/* Image area */}
                <div style={{
                  position: "relative",
                  width: "100%",
                  paddingBottom: "80%",
                  background: "#fff",
                  overflow: "hidden",
                }}>
                  <Image
                    src={step.img}
                    alt={step.title}
                    fill
                    style={{ objectFit: "contain", padding: "12px", transition: "transform 0.4s ease", transform: isActive ? "scale(1.04)" : "scale(1)" }}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {/* Step number badge */}
                  <div style={{
                    position: "absolute", top: 10, left: 10,
                    background: isActive
                      ? `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`
                      : "rgba(0,0,0,0.55)",
                    color: isActive ? BLACK : WHITE,
                    fontWeight: 800, fontSize: 12,
                    fontFamily: FONT_BODY, letterSpacing: "0.08em",
                    padding: "4px 10px", borderRadius: "100px",
                    transition: "all 0.3s",
                  }}>
                    {step.num}
                  </div>
                </div>

                {/* Text area */}
                <div style={{ padding: "clamp(14px, 2vw, 20px)" }}>
                  <div style={{
                    fontSize: "clamp(13px, 1.4vw, 15px)", fontWeight: 600,
                    fontFamily: FONT_HEADING, color: isActive ? WHITE : GRAY_LIGHT,
                    lineHeight: 1.4, marginBottom: 8,
                    transition: "color 0.3s",
                  }}>
                    {step.title}
                  </div>
                  <p style={{
                    color: isActive ? GRAY_LIGHT : GRAY,
                    fontSize: "clamp(11px, 1.1vw, 13px)",
                    lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0,
                    transition: "color 0.3s",
                  }}>
                    {step.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Progress bar ── */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 32 }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => handleStep(i)}
              style={{
                width: i === activeStep ? 32 : 10,
                height: 10, borderRadius: 5,
                background: i === activeStep
                  ? `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD})`
                  : "rgba(201,168,76,0.2)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 0.35s ease",
              }}
            />
          ))}
        </div>

        {/* ── Bottom note ── */}
        <div style={{
          textAlign: "center",
          background: "rgba(201,168,76,0.06)",
          border: `1px solid rgba(201,168,76,0.18)`,
          borderRadius: "12px",
          padding: "clamp(16px, 2.5vw, 24px) clamp(20px, 4vw, 40px)",
          maxWidth: 640, margin: "0 auto",
        }}>
          <p style={{
            color: GRAY_LIGHT, fontSize: "clamp(13px, 1.4vw, 15px)",
            lineHeight: 1.75, fontFamily: FONT_BODY, margin: 0,
          }}>
            <span style={{ color: GOLD, fontWeight: 600 }}>✓ Không cần thợ lắp đặt</span>
            {"  ·  "}
            <span style={{ color: GOLD, fontWeight: 600 }}>✓ Không cần tháo giường cũ</span>
            {"  ·  "}
            <span style={{ color: GOLD, fontWeight: 600 }}>✓ Tương thích mọi loại nệm</span>
          </p>
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 640px) {
          .install-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}
