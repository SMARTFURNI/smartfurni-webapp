"use client";
import { useState, useEffect, useRef } from "react";
import BedSVG from "@/components/ui/BedSVG";

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E2C97E";
const BG = "#060500";
const SURFACE = "#0f0d08";
const BORDER = "rgba(201,168,76,0.18)";
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const DEMO_PRESETS = [
  { name: "Nằm phẳng", head: 0, foot: 0, desc: "Tư thế ngủ tự nhiên, cột sống thẳng hoàn toàn" },
  { name: "Đọc sách", head: 45, foot: 15, desc: "Nâng đầu 45°, chân nhẹ — giảm mỏi cổ khi đọc" },
  { name: "Xem TV", head: 35, foot: 15, desc: "Góc thoải mái nhất để xem màn hình lớn" },
  { name: "Ngồi dậy", head: 60, foot: 0, desc: "Hỗ trợ người cao tuổi, sau phẫu thuật" },
  { name: "Chống ngáy", head: 12, foot: 0, desc: "Nâng nhẹ đầu, mở thông đường thở" },
];

export function BedDemoSection() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [headAngle, setHeadAngle] = useState(0);
  const [footAngle, setFootAngle] = useState(0);
  const [ledOn, setLedOn] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Animate to preset
  useEffect(() => {
    const target = DEMO_PRESETS[presetIdx];
    const startHead = headAngle;
    const startFoot = footAngle;
    const duration = 600;
    const start = performance.now();

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setHeadAngle(startHead + (target.head - startHead) * ease);
      setFootAngle(startFoot + (target.foot - startFoot) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [presetIdx]); // eslint-disable-line

  // LED blink
  useEffect(() => {
    const t = setInterval(() => setLedOn((v) => !v), 4000);
    return () => clearInterval(t);
  }, []);

  // Auto-cycle presets
  useEffect(() => {
    const t = setInterval(() => setPresetIdx((i) => (i + 1) % DEMO_PRESETS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const current = DEMO_PRESETS[presetIdx];

  return (
    <section style={{ background: BG, padding: "clamp(48px,7vw,80px) 0", fontFamily: FONT }}>
      {/* Gold accent line top */}
      <div style={{ width: "100%", height: 1, background: `linear-gradient(to right, transparent, ${GOLD}60, transparent)`, marginBottom: "clamp(40px,6vw,64px)" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "clamp(36px,5vw,56px)" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            border: `1px solid ${BORDER}`, borderRadius: 999,
            padding: "6px 18px", marginBottom: 20,
            background: `${GOLD}10`,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
            <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              CÔNG NGHỆ ĐIỀU KHIỂN THÔNG MINH
            </span>
          </div>
          <h2 style={{
            color: "#F5EDD6",
            fontSize: "clamp(26px, 4vw, 44px)",
            fontWeight: 700,
            lineHeight: 1.2,
            margin: "0 0 16px",
            letterSpacing: "-0.01em",
          }}>
            Trải Nghiệm Demo{" "}
            <span style={{ color: GOLD_LIGHT }}>Giường Công Thái Học</span>
          </h2>
          <p style={{ color: "#A89070", fontSize: "clamp(14px,1.5vw,16px)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Nhấn các tư thế bên dưới để xem giường tự động điều chỉnh theo từng nhu cầu sử dụng thực tế
          </p>
        </div>

        {/* Main content: 2 columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "clamp(24px,4vw,56px)",
          alignItems: "center",
        }}
          className="lp-bed-demo-grid"
        >
          {/* Left: Info + Presets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* Current preset info */}
            <div style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: "clamp(20px,3vw,32px)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${GOLD}20`, border: `1px solid ${GOLD}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: GOLD, fontSize: 18 }}>🛏️</span>
                </div>
                <div>
                  <div style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 18 }}>{current.name}</div>
                  <div style={{ color: "#A89070", fontSize: 12 }}>
                    Đầu giường: {Math.round(headAngle)}° · Chân giường: {Math.round(footAngle)}°
                  </div>
                </div>
              </div>
              <p style={{ color: "#C4A97A", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{current.desc}</p>
            </div>

            {/* Preset pills */}
            <div>
              <div style={{ color: "#A89070", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                Chọn tư thế
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DEMO_PRESETS.map((p, i) => (
                  <button
                    key={p.name}
                    onClick={() => setPresetIdx(i)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontFamily: FONT,
                      ...(i === presetIdx
                        ? { background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`, color: "#1a1200", border: "none" }
                        : { background: "transparent", color: "#A89070", border: `1px solid ${BORDER}` }
                      ),
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Features list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Điều chỉnh đầu giường 0–70°",
                "Điều chỉnh chân giường 0–45°",
                "Điều khiển qua app iOS/Android",
                "Nhớ 4 tư thế yêu thích",
                "Chế độ massage tích hợp",
              ].map((feat) => (
                <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${GOLD}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ color: "#C4A97A", fontSize: 13 }}>{feat}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href="/lp/doi-tac-showroom-nem#dang-ky"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
                color: "#1a1200",
                fontWeight: 700,
                fontSize: 14,
                padding: "14px 28px",
                borderRadius: 999,
                textDecoration: "none",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Đăng ký nhận báo giá sỉ →
            </a>
          </div>

          {/* Right: Bed SVG */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              position: "relative",
              width: "100%",
              maxWidth: 480,
              background: `radial-gradient(ellipse at center, ${GOLD}12, transparent 70%)`,
              borderRadius: 24,
              padding: "clamp(16px,3vw,32px)",
              border: `1px solid ${BORDER}`,
            }}>
              <BedSVG
                headAngle={headAngle}
                footAngle={footAngle}
                ledOn={ledOn}
                ledColor={GOLD}
                size={400}
                className="w-full"
              />
            </div>
            <p style={{ color: "#5a4a30", fontSize: 12, textAlign: "center", fontStyle: "italic" }}>
              Demo tương tác — nhấn để thay đổi tư thế giường
            </p>
          </div>
        </div>
      </div>

      {/* Gold accent line bottom */}
      <div style={{ width: "100%", height: 1, background: `linear-gradient(to right, transparent, ${GOLD}60, transparent)`, marginTop: "clamp(40px,6vw,64px)" }} />

      <style>{`
        @media (max-width: 768px) {
          .lp-bed-demo-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
