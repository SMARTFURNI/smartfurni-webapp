"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { CrmProduct } from "@/lib/crm-types";
import Image from "next/image";
import { EditableText } from "@/components/lp/EditableText";
import { LpEditBar } from "@/components/lp/LpEditBar";

// ─── Design tokens — đồng bộ với website chính ────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E2C97E";
const BLACK = "#0D0B00";          // dark-bg của website chính
const BLACK_SOFT = "#1A1600";     // dark-surface
const BLACK_CARD = "#221D00";     // dark-card
const BLACK_BORDER = "#2E2800";   // dark-border
const WHITE = "#F5EDD6";          // màu text chính của website
const GRAY = "#A89070";
const GRAY_LIGHT = "#D4C4A0";
const RED_SOFT = "#FF6B6B";
const LP_SLUG = "doi-tac-showroom-nem";

// Font stack đồng bộ với website chính
// Website chính dùng Inter cho TẤT CẢ (H1 fw:300, H2 fw:700, H3 fw:600, body fw:400)
// Cormorant Garamond CHỈ dùng cho .font-brand (logo text, letter-spacing: 0.12em)
const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
// Logo brand font (giống website chính .font-brand)
const FONT_BRAND = "'Cormorant Garamond', Georgia, serif";

// Border-radius system (đồng bộ website chính)
const R_SM = 8;    // rounded-lg: badge nhỏ, tag
const R_MD = 12;   // rounded-xl: button CTA, input
const R_LG = 16;   // rounded-2xl: card, panel
const R_FULL = 999; // rounded-full: pill badge, icon button

interface Props {
  products: CrmProduct[];
  isEditor?: boolean;
  initialContent?: Record<string, string>;
}

// ─── YouTube helper ─────────────────────────────────────────────────────────────────────────────────────
function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function YoutubeAutoplay({ videoId, title }: { videoId: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);
  const src = started
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0&modestbranding=1`
    : `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&modestbranding=1`;
  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000" }}>
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}

// ─── Intersection Observer fade-in ───────────────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto 28px", maxWidth: 140 }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
      <div style={{ width: 5, height: 5, background: GOLD, transform: "rotate(45deg)", borderRadius: 1 }} />
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
    </div>
  );
}

// Badge nhỏ kiểu website chính: rounded-full, border vàng
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      border: `1px solid rgba(201,168,76,0.35)`, background: "rgba(201,168,76,0.06)",
      color: GOLD, fontSize: 10, fontWeight: 600, letterSpacing: "0.18em",
      padding: "6px 16px", marginBottom: 18,
      borderRadius: R_FULL, textTransform: "uppercase" as const,
      fontFamily: FONT_BODY,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
      {children}
    </div>
  );
}

// Button CTA chính — rounded-xl, gradient vàng
function GoldButton({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #9A7A2E 100%)`,
        color: BLACK, border: "none",
        padding: "15px 32px",
        fontWeight: 700, fontSize: 13, cursor: "pointer",
        letterSpacing: "0.08em", textTransform: "uppercase" as const,
        borderRadius: R_MD,
        boxShadow: hovered ? `0 12px 36px rgba(201,168,76,0.4)` : `0 6px 24px rgba(201,168,76,0.25)`,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.25s ease",
        fontFamily: FONT_BODY,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Button outline — rounded-xl, border trắng
function OutlineButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "transparent", color: hovered ? GOLD : WHITE,
        border: `1px solid ${hovered ? GOLD : "rgba(245,237,214,0.3)"}`,
        padding: "15px 32px",
        fontWeight: 500, fontSize: 13, cursor: "pointer",
        letterSpacing: "0.06em",
        borderRadius: R_MD,
        transition: "all 0.25s ease",
        fontFamily: FONT_BODY,
      }}
    >
      {children}
    </button>
  );
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Sản phẩm có làm hỏng nệm hiện tại của khách hàng không?",
    a: "Hoàn toàn không. Khung giường Smartfurni được thiết kế với bề mặt phẳng, bo góc mịn và lực nâng phân bổ đều, tương thích 100% với các dòng nệm cao su, nệm lò xo túi độc lập và nệm foam cao cấp mà không làm biến dạng hay ảnh hưởng đến kết cấu nệm.",
  },
  {
    q: "Showroom của tôi nhỏ, trưng bày có tốn diện tích không?",
    a: "Đây là ưu điểm lớn nhất. Bạn chỉ cần đặt khung giường Smartfurni ngay bên dưới tấm nệm đang trưng bày sẵn có. Không tốn thêm một centimet mặt bằng nào nhưng lại biến góc trưng bày đó thành khu vực trải nghiệm công nghệ thu hút khách nhất Showroom.",
  },
  {
    q: "Nếu động cơ (motor) gặp sự cố thì bảo hành thế nào?",
    a: "Smartfurni sử dụng dòng motor lõi đồng tiêu chuẩn xuất khẩu Đức với độ bền trên 10 năm. Chúng tôi áp dụng chính sách \"Đổi mới động cơ\" ngay lập tức nếu có lỗi nhà sản xuất. Đội ngũ kỹ thuật của Smartfurni sẽ hỗ trợ xử lý tận nơi, đại lý không cần phải lo lắng về khâu bảo trì.",
  },
  {
    q: "Chính sách chiết khấu và giá bán lẻ được kiểm soát ra sao?",
    a: "Chúng tôi cam kết mức chiết khấu hấp dẫn nhất thị trường nội thất thông minh hiện nay. Smartfurni kiểm soát chặt chẽ giá bán lẻ niêm yết trên toàn hệ thống (bao gồm cả các kênh online của hãng) để đảm bảo đại lý luôn có lợi nhuận tốt và cạnh tranh công bằng.",
  },
  {
    q: "Tôi có phải nhập hàng số lượng lớn (ôm hàng) không?",
    a: "Không. Chúng tôi hỗ trợ mô hình \"Trưng bày mẫu - Giao hàng từ kho hãng\". Bạn chỉ cần đầu tư bộ mẫu tại Showroom để khách trải nghiệm. Khi có đơn hàng, Smartfurni sẽ phụ trách vận chuyển và lắp đặt trực tiếp cho khách của bạn.",
  },
  {
    q: "Lắp đặt có phức tạp không, nhân viên cửa hàng có làm được không?",
    a: "Sản phẩm được thiết kế theo dạng \"Plug & Play\". Chỉ cần đặt lên giường, cắm điện là sử dụng ngay. Smartfurni sẽ cung cấp video hướng dẫn chi tiết và đào tạo nhân viên của bạn chỉ trong 15 phút là có thể thao tác thuần thục.",
  },
];

// ─── FAQ Accordion component ────────────────────────────────────────────────
function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <FadeIn key={i} delay={i * 60}>
            <div
              style={{
                background: isOpen ? BLACK_CARD : BLACK_SOFT,
                border: `1px solid ${isOpen ? "rgba(201,168,76,0.45)" : BLACK_BORDER}`,
                borderRadius: R_LG,
                overflow: "hidden",
                transition: "border-color 0.25s ease, background 0.25s ease",
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 16,
                  padding: "22px 24px", background: "transparent",
                  border: "none", cursor: "pointer", textAlign: "left" as const,
                }}
              >
                <span style={{
                  color: isOpen ? GOLD : WHITE,
                  fontSize: "clamp(14px, 1.8vw, 16px)",
                  fontWeight: 500, lineHeight: 1.5,
                  fontFamily: FONT_HEADING, letterSpacing: "normal",
                  transition: "color 0.25s ease",
                }}>
                  {item.q}
                </span>
                <span style={{
                  color: GOLD, fontSize: 20, flexShrink: 0,
                  transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                  lineHeight: 1,
                }}>+</span>
              </button>
              <div style={{
                maxHeight: isOpen ? 400 : 0,
                overflow: "hidden",
                transition: "max-height 0.4s ease",
              }}>
                <div style={{
                  padding: "0 24px 24px",
                  borderTop: `1px solid ${BLACK_BORDER}`,
                  paddingTop: 18,
                }}>
                  <p style={{
                    color: GRAY_LIGHT, fontSize: 14, lineHeight: 1.85,
                    fontFamily: FONT_BODY, margin: 0,
                  }}>
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        );
      })}
    </div>
  );
}

// ─── Showroom Comparison Section ────────────────────────────────────────────
function ShowroomComparisonSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.15 });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  const leftIn = inView;
  const rightIn = inView;
  const imgIn = inView;

  return (
    <section style={{ background: BLACK, padding: "0 0 80px" }}>
      {/* Caption trên */}
      <div style={{ textAlign: "center", padding: "0 24px 36px" }}>
        <p style={{ color: GRAY_LIGHT, fontSize: 15, fontFamily: FONT_BODY, lineHeight: 1.7, maxWidth: 680, margin: "0 auto" }}>
          Cùng một tấm nệm — nhưng trải nghiệm của khách hàng hoàn toàn khác nhau
        </p>
      </div>

      {/* Layout 3 cột: text trái | ảnh | text phải */}
      <div
        ref={ref}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr minmax(0, 2.4fr) 1fr",
          gap: 0,
          alignItems: "center",
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 16px",
        }}
      >
        {/* ── Cột TRÁI: Nệm thường ── */}
        <div
          style={{
            padding: "0 28px 0 8px",
            opacity: leftIn ? 1 : 0,
            transform: leftIn ? "translateX(0)" : "translateX(-60px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.35)", borderRadius: R_FULL, padding: "5px 14px", marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: RED_SOFT, display: "inline-block", flexShrink: 0 }} />
            <span style={{ color: RED_SOFT, fontSize: 10, fontWeight: 700, fontFamily: FONT_BODY, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>Nệm trên giường thường</span>
          </div>
          {/* Heading */}
          <h3 style={{ color: WHITE, fontSize: "clamp(16px, 1.6vw, 22px)", fontWeight: 600, fontFamily: FONT_HEADING, lineHeight: 1.35, marginBottom: 14, letterSpacing: "-0.01em" }}>
            Khách chỉ nằm thử —<br />rồi về
          </h3>
          {/* Bullets */}
          {[
            "Không có điểm khác biệt với showroom khác",
            "Khách so sánh giá, không thấy giá trị",
            "Biên lợi nhuận ngày càng mỏng",
          ].map((txt, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <span style={{ color: RED_SOFT, fontSize: 8, fontWeight: 700 }}>✕</span>
              </div>
              <span style={{ color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY, lineHeight: 1.65 }}>{txt}</span>
            </div>
          ))}
          {/* Mũi tên trỏ sang phải vào ảnh */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, paddingRight: 4 }}>
            <svg width="80" height="36" viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: leftIn ? 1 : 0, transform: leftIn ? "translateX(0)" : "translateX(-20px)", transition: "opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s" }}
            >
              <path d="M4 18 Q 30 4, 68 18" stroke="rgba(255,107,107,0.55)" strokeWidth="1.5" fill="none" strokeDasharray="5 3" />
              <polygon points="72,18 62,13 64,18 62,23" fill="rgba(255,107,107,0.7)" />
            </svg>
          </div>
        </div>

        {/* ── Cột GIỮA: Ảnh ── */}
        <div
          style={{
            position: "relative",
            borderRadius: R_LG,
            overflow: "hidden",
            border: `1px solid ${BLACK_BORDER}`,
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            opacity: imgIn ? 1 : 0,
            transform: imgIn ? "scale(1) translateY(0)" : "scale(0.96) translateY(20px)",
            transition: "opacity 0.7s ease 0s, transform 0.7s ease 0s",
          }}
        >
          <Image
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663305063350/ZjsaIdyBylPYjjuJ.webp"
            alt="So sánh showroom nệm thường vs showroom với giường công thái học SmartFurni"
            width={1920}
            height={1080}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          {/* Đường kẻ phân cách giữa */}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", transform: "translateX(-50%)", width: 2, background: `linear-gradient(to bottom, transparent, ${GOLD}, transparent)`, opacity: 0.6, pointerEvents: "none" }} />
          {/* Badge VS ở giữa */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 48, height: 48, borderRadius: "50%", background: BLACK, border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, boxShadow: `0 0 20px rgba(201,168,76,0.3)` }}>
            <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, fontFamily: FONT_HEADING, letterSpacing: "0.05em" }}>VS</span>
          </div>
          {/* Gold accent lines top/bottom */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, opacity: 0.5 }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, opacity: 0.5 }} />
        </div>

        {/* ── Cột PHẢI: SmartFurni ── */}
        <div
          style={{
            padding: "0 8px 0 28px",
            opacity: rightIn ? 1 : 0,
            transform: rightIn ? "translateX(0)" : "translateX(60px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          {/* Mũi tên trỏ sang trái vào ảnh */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 20, paddingLeft: 4 }}>
            <svg width="80" height="36" viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: rightIn ? 1 : 0, transform: rightIn ? "translateX(0)" : "translateX(20px)", transition: "opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s" }}
            >
              <path d="M76 18 Q 50 4, 12 18" stroke="rgba(201,168,76,0.55)" strokeWidth="1.5" fill="none" strokeDasharray="5 3" />
              <polygon points="8,18 18,13 16,18 18,23" fill="rgba(201,168,76,0.7)" />
            </svg>
          </div>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.35)`, borderRadius: R_FULL, padding: "5px 14px", marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, display: "inline-block", flexShrink: 0 }} />
            <span style={{ color: GOLD, fontSize: 10, fontWeight: 700, fontFamily: FONT_BODY, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>Nệm trên khung SmartFurni</span>
          </div>
          {/* Heading */}
          <h3 style={{ color: WHITE, fontSize: "clamp(16px, 1.6vw, 22px)", fontWeight: 600, fontFamily: FONT_HEADING, lineHeight: 1.35, marginBottom: 14, letterSpacing: "-0.01em" }}>
            Khách trải nghiệm —<br />và mua ngay
          </h3>
          {/* Bullets */}
          {[
            "Điều chỉnh độ nâng đầu, chân theo ý muốn",
            "Tính năng độc đáo tạo quyết định mua tức thì",
            "Biên lợi nhuận 30–40%, cao nhất ngành",
          ].map((txt, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.35)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <span style={{ color: GOLD, fontSize: 8, fontWeight: 700 }}>✓</span>
              </div>
              <span style={{ color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY, lineHeight: 1.65 }}>{txt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Caption dưới ảnh */}
      <div
        style={{
          display: "flex", justifyContent: "center", gap: 8, marginTop: 28, flexWrap: "wrap" as const, padding: "0 24px",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease 0.4s, transform 0.6s ease 0.4s",
        }}
      >
        {[
          { icon: "📍", text: "Thực tế tại showroom đối tác" },
          { icon: "💡", text: "Cùng thương hiệu nệm — khác biệt hoàn toàn" },
          { icon: "📈", text: "Tăng tỷ lệ chốt đơn lên đến 3×" },
        ].map((tag, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: BLACK_SOFT, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 14px" }}>
            <span style={{ fontSize: 13 }}>{tag.icon}</span>
            <span style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY }}>{tag.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product, index }: { product: CrmProduct; index: number }) {
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);
  const badges = ["Phổ thông cao cấp", "Bán chạy nhất ★", "Cao cấp nhất"];
  return (
    <FadeIn delay={index * 100}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: BLACK_CARD, overflow: "hidden",
          border: `1px solid ${hovered ? "rgba(201,168,76,0.45)" : BLACK_BORDER}`,
          borderRadius: R_LG,
          transform: hovered ? "translateY(-6px)" : "translateY(0)",
          boxShadow: hovered ? "0 20px 48px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.3)",
          transition: "all 0.3s ease",
          display: "flex", flexDirection: "column",
        }}>
        <div style={{ position: "relative", width: "100%", paddingBottom: "100%", background: "#0A0800", borderRadius: `${R_LG}px ${R_LG}px 0 0`, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>
          {product.imageUrl && !imgErr ? (
            <Image src={product.imageUrl} alt={product.name} fill style={{ objectFit: "cover" }} onError={() => setImgErr(true)} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>🛏️</div>
          )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,11,0,0.7) 0%, transparent 55%)" }} />
          </div>
          <div style={{
            position: "absolute", top: 14, right: 14, zIndex: 2,
            background: index === 1 ? GOLD : "rgba(13,11,0,0.8)",
            color: index === 1 ? BLACK : GRAY_LIGHT,
            border: index !== 1 ? `1px solid rgba(212,196,160,0.3)` : "none",
            fontSize: 10, fontWeight: 700, padding: "5px 12px",
            letterSpacing: "0.08em", borderRadius: R_FULL,
            fontFamily: FONT_BODY,
          }}>{badges[index] || "Sản phẩm"}</div>
        </div>
        <div style={{ padding: "22px 22px 26px", display: "flex", flexDirection: "column", flex: 1 }}>
          {product.sku && <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6, fontFamily: FONT_BODY }}>{product.sku}</div>}
          <h3 style={{ color: WHITE, fontSize: 16, fontWeight: 600, marginBottom: 8, lineHeight: 1.4, fontFamily: FONT_HEADING, letterSpacing: "normal", minHeight: 44 }}>{product.name}</h3>
          {product.description && <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, marginBottom: 14, fontFamily: FONT_BODY, flex: 1 }}>{product.description.slice(0, 90)}{product.description.length > 90 ? "…" : ""}</p>}
          <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.2)`, padding: "12px 14px", borderRadius: R_SM, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: GRAY, fontSize: 10, marginBottom: 3, fontFamily: FONT_BODY }}>Giá đại lý từ</div>
              <div style={{ color: GOLD, fontSize: 18, fontWeight: 800, fontFamily: FONT_BODY }}>{product.basePrice > 0 ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(product.basePrice * 0.68) : "Liên hệ"}</div>
            </div>
            {product.basePrice > 0 && <div style={{ textAlign: "right" }}><div style={{ color: GRAY, fontSize: 10, marginBottom: 3, fontFamily: FONT_BODY }}>Giá lẻ</div><div style={{ color: GRAY, fontSize: 13, textDecoration: "line-through", fontFamily: FONT_BODY }}>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(product.basePrice)}</div></div>}
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── Lead form ────────────────────────────────────────────────────────────────
function LeadForm({ submitLabel }: { submitLabel?: string }) {
  const [form, setForm] = useState({ showroomName: "", ownerName: "", phone: "", address: "", mattressBrand: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [utms, setUtms] = useState<Record<string, string>>({});
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setUtms({ utmSource: p.get("utm_source") || "", utmMedium: p.get("utm_medium") || "", utmCampaign: p.get("utm_campaign") || "", utmContent: p.get("utm_content") || "" });
  }, []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.showroomName.trim() || !form.ownerName.trim() || !form.phone.trim()) { setError("Vui lòng điền đầy đủ các trường bắt buộc (*)"); return; }
    if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone.replace(/\s/g, ""))) { setError("Số điện thoại không hợp lệ"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/lp/submit-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingPageSlug: LP_SLUG, name: form.ownerName, phone: form.phone, email: "", note: `Showroom: ${form.showroomName} | Địa chỉ: ${form.address} | Thương hiệu nệm: ${form.mattressBrand} | Ghi chú: ${form.note}`, ...utms }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Lỗi server"); }
      setSuccess(true);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại"); }
    finally { setLoading(false); }
  }
  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(245,237,214,0.04)",
    border: `1px solid rgba(201,168,76,0.2)`,
    color: WHITE, padding: "13px 16px", fontSize: 14, outline: "none",
    fontFamily: FONT_BODY, boxSizing: "border-box" as const,
    transition: "border-color 0.2s, box-shadow 0.2s",
    borderRadius: R_MD,
  };
  if (success) return (
    <div style={{ textAlign: "center", padding: "56px 32px", background: BLACK_CARD, border: `1px solid ${GOLD}`, borderRadius: R_LG }}>
      <div style={{ fontSize: 52, marginBottom: 18 }}>✅</div>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: GOLD, marginBottom: 12, fontFamily: FONT_HEADING, letterSpacing: "0.06em" }}>Đăng ký thành công!</h3>
      <p style={{ color: GRAY_LIGHT, fontSize: 15, lineHeight: 1.75, fontFamily: FONT_BODY }}>Cảm ơn bạn đã quan tâm đến chương trình đại lý SmartFurni.<br />Đội ngũ tư vấn sẽ liên hệ qua <strong style={{ color: GOLD }}>Zalo / điện thoại</strong> trong vòng 2 giờ làm việc.</p>
    </div>
  );
  return (
    <form onSubmit={handleSubmit} style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, padding: "clamp(24px,4vw,44px)", borderRadius: R_LG }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
        {[{ k: "showroomName", label: "Tên Showroom *", ph: "VD: Showroom Nệm Thiên Phú" }, { k: "ownerName", label: "Tên chủ sở hữu *", ph: "Họ và tên đầy đủ" }, { k: "phone", label: "Số điện thoại (Zalo) *", ph: "0912 345 678" }, { k: "mattressBrand", label: "Thương hiệu nệm đang kinh doanh", ph: "VD: Vạn Thành, Liên Á, Everon…" }].map(f => (
          <div key={f.k}>
            <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>{f.label}</label>
            <input type="text" placeholder={f.ph} value={form[f.k as keyof typeof form]} onChange={set(f.k)} style={inp}
              onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px rgba(201,168,76,0.12)`; }}
              onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.2)"; e.target.style.boxShadow = "none"; }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Địa chỉ showroom</label>
        <input type="text" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố" value={form.address} onChange={set("address")} style={inp}
          onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px rgba(201,168,76,0.12)`; }}
          onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.2)"; e.target.style.boxShadow = "none"; }} />
      </div>
      <div style={{ marginBottom: 26 }}>
        <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Câu hỏi hoặc yêu cầu thêm</label>
        <textarea placeholder="Diện tích showroom, số nhân viên, khu vực hoạt động…" rows={3} value={form.note} onChange={set("note")}
          style={{ ...inp, resize: "vertical" }}
          onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px rgba(201,168,76,0.12)`; }}
          onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.2)"; e.target.style.boxShadow = "none"; }} />
      </div>
      {error && <div style={{ color: RED_SOFT, fontSize: 13, marginBottom: 16, padding: "12px 16px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: R_SM, fontFamily: FONT_BODY }}>{error}</div>}
      <button type="submit" disabled={loading} style={{
        width: "100%", padding: "17px",
        background: loading ? "#333" : `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #9A7A2E 100%)`,
        color: BLACK, border: "none", fontWeight: 700, fontSize: 14,
        cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const,
        boxShadow: loading ? "none" : `0 8px 28px rgba(201,168,76,0.3)`,
        borderRadius: R_MD, fontFamily: FONT_BODY,
        transition: "all 0.25s ease",
      }}>
        {loading ? "Đang gửi…" : (submitLabel || "Nhận Chính Sách Đại Lý & Bảng Giá Sĩ →")}
      </button>
      <p style={{ color: GRAY, fontSize: 12, textAlign: "center", marginTop: 14, fontFamily: FONT_BODY }}>🔒 Thông tin được bảo mật tuyệt đối. Không spam.</p>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LpShowroomNemClient({ products, isEditor = false, initialContent = {} }: Props) {
  const [scrollY, setScrollY] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [editedCount, setEditedCount] = useState(0);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const scrollToForm = () => scrollTo("register-form");

  const NAV_ITEMS = [
    { label: "Giải pháp", id: "giai-phap" },
    { label: "Sản phẩm", id: "products" },
    { label: "Đặc quyền", id: "dac-quyen" },
    { label: "Đối tác", id: "doi-tac" },
    { label: "Đăng ký", id: "register-form" },
  ];

  const handleSaved = useCallback((blockKey: string, newValue: string) => {
    setContent(prev => ({ ...prev, [blockKey]: newValue }));
    setEditedCount(prev => prev + 1);
  }, []);

  const handleDeleted = useCallback((blockKey: string) => {
    setContent(prev => { const next = { ...prev }; delete next[blockKey]; return next; });
    setEditedCount(prev => prev + 1);
  }, []);

  const E = useCallback(({ bk, def, as, style, multiline }: {
    bk: string; def: string;
    as?: "h1"|"h2"|"h3"|"h4"|"h5"|"h6"|"p"|"span"|"div"|"li";
    style?: React.CSSProperties; multiline?: boolean;
  }) => (
    <EditableText slug={LP_SLUG} blockKey={bk} defaultValue={def} editMode={editMode}
      as={as} style={style} multiline={multiline}
      savedValue={content[bk]} onSaved={handleSaved} onDeleted={handleDeleted} />
  ), [editMode, content, handleSaved, handleDeleted]);

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: FONT_BODY, overflowX: "hidden" }}>

      {/* ── EDIT BAR ── */}
      <LpEditBar isEditor={isEditor} editMode={editMode} onToggleEditMode={() => setEditMode(v => !v)} editedCount={editedCount} />

      {/* ── STICKY NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 60 ? "rgba(13,11,0,0.96)" : "transparent",
        borderBottom: scrollY > 60 ? `1px solid ${BLACK_BORDER}` : "none",
        backdropFilter: scrollY > 60 ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrollY > 60 ? "blur(16px)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 24px",
          height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          {/* Logo */}
          <a href="/" style={{ flexShrink: 0, textDecoration: "none" }}>
            <img
              src="/smartfurni-logo-transparent.png"
              alt="SmartFurni"
              style={{ height: 44, objectFit: "contain", filter: "brightness(1.05)" }}
            />
          </a>

          {/* Main menu */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(212,196,160,0.7)", fontSize: 13, fontWeight: 500,
                  fontFamily: FONT_BODY, padding: "8px 14px", borderRadius: R_SM,
                  letterSpacing: "0.01em", transition: "color 0.2s, background 0.2s",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = GOLD;
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.08)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(212,196,160,0.7)";
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button onClick={scrollToForm} style={{
            flexShrink: 0,
            background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
            color: BLACK, border: "none", padding: "9px 20px",
            fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", cursor: "pointer",
            textTransform: "uppercase" as const, borderRadius: R_MD, fontFamily: FONT_BODY,
            transition: "opacity 0.2s, transform 0.15s",
            whiteSpace: "nowrap" as const,
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}>
            {E({ bk: "nav_cta", def: "ĐĂNG KÝ ĐẠI LÝ", as: "span" })}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "120px 24px 80px", background: `linear-gradient(160deg, ${BLACK} 0%, #110E00 60%, ${BLACK} 100%)` }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `linear-gradient(${GOLD} 1px, transparent 1px), linear-gradient(90deg, ${GOLD} 1px, transparent 1px)`, backgroundSize: "64px 64px" }} />
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 65%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>Chương trình đối tác độc quyền 2025</SectionLabel>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h1 style={{ fontSize: "clamp(30px, 5.5vw, 62px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.01em", fontFamily: FONT_HEADING }}>
              {E({ bk: "hero_title_1", def: "SMARTFURNI —", as: "span", style: { color: WHITE, display: "block", fontWeight: 200, letterSpacing: "0.04em", fontFamily: FONT_BRAND } })}
              {E({ bk: "hero_title_2", def: "Giải Pháp Đột Phá Doanh Thu", as: "span", style: { color: GOLD, display: "block", fontWeight: 300 } })}
              {E({ bk: "hero_title_3", def: "Cho Showroom Nệm 4.0", as: "span", style: { color: WHITE, display: "block", fontWeight: 300 } })}
            </h1>
          </FadeIn>
          <FadeIn delay={200}>
            <p style={{ fontSize: "clamp(15px, 2vw, 19px)", color: GRAY_LIGHT, lineHeight: 1.8, maxWidth: 680, margin: "0 auto 48px", fontWeight: 300, fontFamily: FONT_BODY }}>
              {E({ bk: "hero_subtitle", def: "Biến tấm nệm tĩnh thành giường thông minh trong 5 phút. Tăng lợi nhuận trên mỗi mét vuông mặt bằng mà không cần tăng vốn nhập hàng.", as: "span", multiline: true })}
            </p>
          </FadeIn>
          <FadeIn delay={300}>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <GoldButton onClick={scrollToForm}>
                {E({ bk: "hero_cta", def: "Nhận Chính Sách Đại Lý & Bảng Giá Sỉ", as: "span" })}
              </GoldButton>
              <OutlineButton onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
                {E({ bk: "hero_cta_outline", def: "Xem sản phẩm ↓", as: "span" })}
              </OutlineButton>
            </div>
          </FadeIn>
          {/* Stats row */}
          <FadeIn delay={400}>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 72, flexWrap: "wrap", borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 40 }}>
              {[
                { bkNum: "stat_1_num", defNum: "500+", bkLabel: "stat_1_label", defLabel: "Đối tác đại lý" },
                { bkNum: "stat_2_num", defNum: "30–40%", bkLabel: "stat_2_label", defLabel: "Biên lợi nhuận" },
                { bkNum: "stat_3_num", defNum: "5 năm", bkLabel: "stat_3_label", defLabel: "Bảo hành motor" },
                { bkNum: "stat_4_num", defNum: "100%", bkLabel: "stat_4_label", defLabel: "Tương thích nệm" },
              ].map((s, i) => (
                <div key={i} style={{ padding: "20px 32px", borderLeft: i > 0 ? `1px solid ${BLACK_BORDER}` : "none", textAlign: "center", minWidth: 110 }}>
                  <div style={{ fontSize: "clamp(22px, 2.8vw, 32px)", fontWeight: 700, color: GOLD, letterSpacing: "-0.02em", fontFamily: FONT_HEADING }}>
                    {E({ bk: s.bkNum, def: s.defNum, as: "span" })}
                  </div>
                  <div style={{ fontSize: 11, color: GRAY, marginTop: 5, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>
                    {E({ bk: s.bkLabel, def: s.defLabel, as: "span" })}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section id="giai-phap" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>Thực trạng thị trường</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "problem_title_1", def: "Showroom Nệm Đang Cạnh Tranh", as: "span", style: { display: "block" } })}
                {E({ bk: "problem_title_2", def: "Khốc Liệt Về Giá", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <FadeIn delay={100}>
              <div style={{ background: BLACK_SOFT, padding: "36px 28px", borderTop: `3px solid rgba(255,107,107,0.4)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG }}>
                <div style={{ fontSize: 28, marginBottom: 18 }}>😰</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 18, color: RED_SOFT, fontFamily: FONT_HEADING, letterSpacing: "normal" }}>
                  {E({ bk: "problem_col1_title", def: "Vấn đề hiện tại", as: "span" })}
                </h3>
                {[
                  { bk: "problem_item_1", def: "Sản phẩm giống nhau, cạnh tranh giá với hàng trăm showroom khác" },
                  { bk: "problem_item_2", def: "Khách hàng chỉ so sánh giá, không thấy sự khác biệt" },
                  { bk: "problem_item_3", def: "Biên lợi nhuận ngày càng mỏng, chi phí mặt bằng tăng cao" },
                  { bk: "problem_item_4", def: "Không có sản phẩm độc quyền để tạo lợi thế cạnh tranh" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ color: RED_SOFT, fontSize: 9 }}>✕</span>
                    </div>
                    <span style={{ color: GRAY_LIGHT, fontSize: 14, lineHeight: 1.7, fontFamily: FONT_BODY }}>
                      {E({ bk: item.bk, def: item.def, as: "span", multiline: true })}
                    </span>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div style={{ background: BLACK_SOFT, padding: "36px 28px", borderTop: `3px solid ${GOLD}`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG }}>
                <div style={{ fontSize: 28, marginBottom: 18 }}>✨</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 18, color: GOLD, fontFamily: FONT_HEADING, letterSpacing: "normal" }}>
                  {E({ bk: "solution_col2_title", def: "Giải pháp SmartFurni", as: "span" })}
                </h3>
                {[
                  { bk: "solution_item_1", def: "Khung giường thông minh — \"linh hồn\" biến mọi tấm nệm trở nên đắt giá hơn" },
                  { bk: "solution_item_2", def: "Tương thích 100% với mọi loại nệm: lò xo, foam, latex, hybrid" },
                  { bk: "solution_item_3", def: "Khách hàng trải nghiệm tính năng độc đáo → quyết định mua ngay" },
                  { bk: "solution_item_4", def: "Biên lợi nhuận 30–40%, cao nhất trong ngành nội thất thông minh" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.35)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ color: GOLD, fontSize: 9 }}>✓</span>
                    </div>
                    <span style={{ color: GRAY_LIGHT, fontSize: 14, lineHeight: 1.7, fontFamily: FONT_BODY }}>
                      {E({ bk: item.bk, def: item.def, as: "span", multiline: true })}
                    </span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── SHOWROOM COMPARISON IMAGE ── */}
      <ShowroomComparisonSection />

      {/* ── HERO VIDEO ── */}
      <section style={{ background: BLACK }}>
        {/* Label + tiêu đề */}
        <div style={{ textAlign: "center", padding: "56px 24px 24px" }}>
          <FadeIn>
            <SectionLabel>
              {E({ bk: "hero_video_label", def: "Xem sản phẩm hoạt động thực tế", as: "span" })}
            </SectionLabel>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, color: WHITE, fontFamily: FONT_HEADING, marginTop: 12, marginBottom: 0, letterSpacing: "-0.01em" }}>
              {E({ bk: "hero_video_title", def: "Giường Công Thái Học Điều Chỉnh Điện SmartFurni", as: "span" })}
            </h2>
          </FadeIn>
        </div>
        {/* Video — căn đối, bo góc, có padding */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 12px" }}>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, border: "1px solid #2E2800", boxShadow: "0 0 60px rgba(201,168,76,0.08)" }}>
            <YoutubeAutoplay
              videoId={extractYoutubeId(content["hero_video_url"] || "") || "_placeholder_"}
              title={content["hero_video_title"] || "SmartFurni Demo"}
            />
            {/* Gold accent lines */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
          </div>
        </div>
        {/* Edit video URL — chỉ hiện khi editMode */}
        {editMode && (
          <div style={{ padding: "16px 24px", background: BLACK_SOFT, borderTop: `1px solid ${BLACK_BORDER}` }}>
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" as const }}>
              <span style={{ color: GOLD, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const, paddingTop: 4 }}>🎬 Link YouTube:</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                {E({ bk: "hero_video_url", def: "https://www.youtube.com/watch?v=PASTE_VIDEO_ID_HERE", as: "span", style: { fontSize: 13, color: GRAY_LIGHT, wordBreak: "break-all" as const } })}
              </div>
            </div>
            <p style={{ color: GRAY, fontSize: 11, marginTop: 8, maxWidth: 900, margin: "8px auto 0" }}>Dán link YouTube (youtube.com/watch?v=... hoặc youtu.be/...) rồi nhấn Lưu. Video sẽ tự phát khi khách cuộn tới.</p>
          </div>
        )}
        <div style={{ height: 56 }} />
      </section>

      {/* ── PRODUCTS ── */}
      <section id="products" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>Dòng sản phẩm</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "products_title_1", def: "Giường Công Thái Học", as: "span", style: { display: "block" } })}
                {E({ bk: "products_title_2", def: "Điều Chỉnh Điện SmartFurni", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 14, maxWidth: 520, margin: "0 auto", fontFamily: FONT_BODY, lineHeight: 1.7 }}>
                {E({ bk: "products_subtitle", def: "Được chế tác từ thép cường lực, tích hợp motor Đức — bảo hành 5 năm chính hãng", as: "span", multiline: true })}
              </p>
            </div>
          </FadeIn>
          {products.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
              {[
                { bkName: "product_1_name", defName: "SmartFurni GSF300", bkDesc: "product_1_desc", defDesc: "Điều chỉnh đầu 0–60°, chân 0–40°. Motor Đức im lặng, điều khiển từ xa + App.", img: "/lp/bed-gsf300.jpg", sku: "GSF300", bkCta: "product_1_cta", defCta: "Liên hệ nhận báo giá sỉ →" },
                { bkName: "product_2_name", defName: "SmartFurni GSF350", bkDesc: "product_2_desc", defDesc: "Điều chỉnh đầu + chân + lưng. Massage rung toàn thân. Chế độ Zero Gravity.", img: "/lp/bed-gsf350.jpg", sku: "GSF350", bkCta: "product_2_cta", defCta: "Liên hệ nhận báo giá sỉ →" },
                { bkName: "product_3_name", defName: "SmartFurni SMF808", bkDesc: "product_3_desc", defDesc: "Đèn LED viền giường, loa Bluetooth, điều khiển giọng nói AI. Cao cấp nhất.", img: "/lp/bed-smf808.jpg", sku: "SMF808", bkCta: "product_3_cta", defCta: "Liên hệ nhận báo giá sỉ →" },
              ].map((p, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, overflow: "hidden", borderRadius: R_LG, transition: "all 0.3s ease", display: "flex", flexDirection: "column" }}
                    onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "rgba(201,168,76,0.45)"; d.style.transform = "translateY(-6px)"; d.style.boxShadow = "0 20px 48px rgba(0,0,0,0.5)"; }}
                    onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = BLACK_BORDER; d.style.transform = "translateY(0)"; d.style.boxShadow = "none"; }}>
                    <div style={{ position: "relative", width: "100%", paddingBottom: "100%", borderRadius: `${R_LG}px ${R_LG}px 0 0`, overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ position: "absolute", inset: 0 }}>
                        <img src={p.img} alt={content[p.bkName] || p.defName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,11,0,0.65) 0%, transparent 55%)" }} />
                      </div>
                      <div style={{ position: "absolute", top: 14, right: 14, zIndex: 2, background: i === 1 ? GOLD : "rgba(13,11,0,0.8)", color: i === 1 ? BLACK : GRAY_LIGHT, border: i !== 1 ? `1px solid rgba(212,196,160,0.3)` : "none", fontSize: 10, fontWeight: 700, padding: "5px 12px", letterSpacing: "0.08em", borderRadius: R_FULL, fontFamily: FONT_BODY }}>
                        {["Phổ thông cao cấp", "Bán chạy nhất ★", "Cao cấp nhất"][i]}
                      </div>
                    </div>
                    <div style={{ padding: "20px 20px 24px", display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6, fontFamily: FONT_BODY }}>{p.sku}</div>
                      <h3 style={{ color: WHITE, fontSize: 16, fontWeight: 600, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "normal", lineHeight: 1.4, minHeight: 44 }}>
                        {E({ bk: p.bkName, def: p.defName, as: "span" })}
                      </h3>
                      <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, marginBottom: 16, fontFamily: FONT_BODY, flex: 1 }}>
                        {E({ bk: p.bkDesc, def: p.defDesc, as: "span", multiline: true })}
                      </p>
                      <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.2)`, padding: "12px 14px", color: GOLD, fontSize: 13, fontWeight: 600, borderRadius: R_SM, fontFamily: FONT_BODY }}>
                        {E({ bk: p.bkCta, def: p.defCta, as: "span" })}
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 6 PARTNER BENEFITS ── */}
      <section id="dac-quyen" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>Đặc quyền đối tác</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "benefits_title_1", def: "6 Đặc Quyền Dành Riêng", as: "span", style: { display: "block" } })}
                {E({ bk: "benefits_title_2", def: "Cho Đại Lý SmartFurni", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {[
              { icon: "◈", bkTitle: "benefit_1_title", defTitle: "Biên Lợi Nhuận Dẫn Đầu Ngành", bkDesc: "benefit_1_desc", defDesc: "Chiết khấu 30–40% trên giá bán lẻ đề xuất. Biên lợi nhuận cao nhất trong phân khúc nội thất thông minh tại Việt Nam.", bkBadge: "benefit_1_badge", defBadge: "30–40% biên LN" },
              { icon: "◇", bkTitle: "benefit_2_title", defTitle: "Rủi Ro Bằng 0 — Mô Hình Dropship", bkDesc: "benefit_2_desc", defDesc: "Chỉ cần 1 sản phẩm trưng bày mẫu. SmartFurni giao hàng trực tiếp từ kho đến tay khách hàng của bạn.", bkBadge: "benefit_2_badge", defBadge: "Không cần tồn kho" },
              { icon: "◉", bkTitle: "benefit_3_title", defTitle: "Độc Quyền Khu Vực", bkDesc: "benefit_3_desc", defDesc: "Mỗi đại lý được bảo vệ vùng kinh doanh riêng. Không có đại lý thứ 2 trong cùng khu vực. Quyền lợi được ký kết trong hợp đồng.", bkBadge: "benefit_3_badge", defBadge: "Bảo vệ lãnh thổ" },
              { icon: "◆", bkTitle: "benefit_4_title", defTitle: "SmartFurni Chạy Quảng Cáo Cho Bạn", bkDesc: "benefit_4_desc", defDesc: "Hãng đầu tư ngân sách quảng cáo Google, Facebook, Zalo đổ khách hàng tiềm năng trực tiếp về showroom của đối tác.", bkBadge: "benefit_4_badge", defBadge: "Marketing miễn phí" },
              { icon: "◐", bkTitle: "benefit_5_title", defTitle: "Đào Tạo & Kịch Bản Chốt Sale", bkDesc: "benefit_5_desc", defDesc: "Cung cấp tài liệu đào tạo sản phẩm, kịch bản tư vấn và chốt sale đã được kiểm chứng với tỷ lệ chuyển đổi cao.", bkBadge: "benefit_5_badge", defBadge: "Tỷ lệ chốt sale cao" },
              { icon: "◎", bkTitle: "benefit_6_title", defTitle: "Kho Tư Liệu Hình Ảnh & Video 4K", bkDesc: "benefit_6_desc", defDesc: "Cung cấp toàn bộ hình ảnh, video 4K chuyên nghiệp về sản phẩm để đại lý sử dụng cho truyền thông mạng xã hội.", bkBadge: "benefit_6_badge", defBadge: "Nội dung sẵn sàng" },
            ].map((b, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div style={{ padding: "30px 26px", background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, transition: "all 0.3s ease" }}
                  onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "rgba(201,168,76,0.4)"; d.style.background = BLACK_SOFT; d.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = BLACK_BORDER; d.style.background = BLACK_CARD; d.style.transform = "translateY(0)"; }}>
                  <div style={{ fontSize: 24, color: GOLD, marginBottom: 14, lineHeight: 1 }}>{b.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, color: WHITE, lineHeight: 1.4, fontFamily: FONT_HEADING, letterSpacing: "normal" }}>
                    {E({ bk: b.bkTitle, def: b.defTitle, as: "span" })}
                  </h3>
                  <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.75, marginBottom: 16, fontFamily: FONT_BODY }}>
                    {E({ bk: b.bkDesc, def: b.defDesc, as: "span", multiline: true })}
                  </p>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.07)", border: `1px solid rgba(201,168,76,0.25)`, color: GOLD, fontSize: 10, fontWeight: 600, padding: "5px 12px", letterSpacing: "0.1em", borderRadius: R_FULL, fontFamily: FONT_BODY }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
                    {E({ bk: b.bkBadge, def: b.defBadge, as: "span" })}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARKETING SUPPORT ── */}
      <section id="marketing" style={{ background: `linear-gradient(135deg, #0D0B00 0%, #1A1200 40%, #0D0B00 100%)`, padding: "96px 24px", position: "relative", overflow: "hidden" }}>
        {/* Decorative glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1060, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.12)", border: `2px solid rgba(201,168,76,0.5)`, borderRadius: R_FULL, padding: "8px 20px", marginBottom: 20 }}>
                <span style={{ fontSize: 14 }}>🚀</span>
                <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Cam kết độc quyền</span>
              </div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 16, fontFamily: FONT_HEADING, letterSpacing: "-0.02em", color: WHITE }}>
                SmartFurni Chạy Quảng Cáo
              </h2>
              <div style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 700, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", marginBottom: 20, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Đổ Khách Về Showroom Của Bạn
              </div>
              <p style={{ color: GRAY_LIGHT, fontSize: "clamp(15px, 1.8vw, 18px)", lineHeight: 1.75, maxWidth: 680, margin: "0 auto 48px", fontFamily: FONT_BODY }}>
                Bạn tập trung bán hàng. SmartFurni lo việc kéo khách. Chúng tôi chạy quảng cáo nhắm đúng khách hàng trong bán kính khu vực Showroom của bạn và điều hướng họ đến trực tiếp để trải nghiệm.
              </p>
            </div>
          </FadeIn>

          {/* 3 platforms */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 52 }}>
            {[
              {
                icon: "📘",
                platform: "Facebook Ads",
                color: "#1877F2",
                desc: "Target theo địa lý — chỉ hiển thị cho khách trong bán kính 5–15km quanh Showroom của bạn.",
                badge: "Retargeting + Lookalike",
              },
              {
                icon: "🎵",
                platform: "TikTok Ads",
                color: "#FF0050",
                desc: "Video sản phẩm viral tiếp cận đúng tập khách hàng trẻ, hiện đại đang tìm kiếm nội thất thông minh.",
                badge: "Video + Spark Ads",
              },
              {
                icon: "🔍",
                platform: "Google Ads",
                color: "#34A853",
                desc: "Bắt khách đang tìm kiếm \"giường thông minh\", \"nệm cao cấp\" trong khu vực — dẫn thẳng về Showroom bạn.",
                badge: "Search + Display",
              },
            ].map((p, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div style={{
                  background: BLACK_CARD,
                  border: `1px solid ${BLACK_BORDER}`,
                  borderTop: `3px solid ${p.color}`,
                  borderRadius: R_LG,
                  padding: "32px 28px",
                  transition: "all 0.3s ease",
                }}
                  onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = p.color; d.style.transform = "translateY(-6px)"; d.style.boxShadow = `0 20px 48px rgba(0,0,0,0.5)`; }}
                  onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = BLACK_BORDER; d.style.transform = "translateY(0)"; d.style.boxShadow = "none"; }}
                >
                  <div style={{ fontSize: 36, marginBottom: 14 }}>{p.icon}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <h3 style={{ color: WHITE, fontSize: 18, fontWeight: 600, fontFamily: FONT_HEADING, letterSpacing: "normal", margin: 0 }}>{p.platform}</h3>
                    <span style={{ background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}44`, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: R_FULL, fontFamily: FONT_BODY, whiteSpace: "nowrap" as const }}>{p.badge}</span>
                  </div>
                  <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.75, fontFamily: FONT_BODY, margin: 0 }}>{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* How it works */}
          <FadeIn delay={200}>
            <div style={{ background: `linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%)`, border: `1px solid rgba(201,168,76,0.25)`, borderRadius: R_LG, padding: "40px 36px" }}>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <h3 style={{ color: GOLD, fontSize: "clamp(16px, 2vw, 22px)", fontWeight: 500, fontFamily: FONT_HEADING, letterSpacing: "normal", marginBottom: 8 }}>Quy trình hoạt động</h3>
                <p style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY }}>SmartFurni quản lý toàn bộ — đại lý không cần làm gì</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24, alignItems: "start" }}>
                {[
                  { step: "01", icon: "📍", title: "Xác định khu vực", desc: "SmartFurni nhập tọa độ Showroom của bạn và thiết lập bán kính quảng cáo" },
                  { step: "02", icon: "🎯", title: "Target chính xác", desc: "Quảng cáo hiển thị đúng người đang có nhu cầu nội thất, giường ngủ trong khu vực" },
                  { step: "03", icon: "📲", title: "Dẫn khách về", desc: "Khách click quảng cáo → thấy địa chỉ Showroom của bạn → đến trải nghiệm" },
                  { step: "04", icon: "💰", title: "Bạn chốt sale", desc: "Khách đến nằm thử, trải nghiệm tính năng → quyết định mua ngay" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 20 }}>{s.icon}</div>
                    <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 6, fontFamily: FONT_BODY }}>BƯỚC {s.step}</div>
                    <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: FONT_HEADING }}>{s.title}</div>
                    <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* CTA */}
          <FadeIn delay={300}>
            <div style={{ textAlign: "center", marginTop: 52 }}>
              <p style={{ color: GRAY_LIGHT, fontSize: 15, marginBottom: 24, fontFamily: FONT_BODY }}>
                Đăng ký đại lý ngay hôm nay — SmartFurni sẽ kích hoạt chiến dịch quảng cáo cho khu vực của bạn trong vòng <strong style={{ color: GOLD }}>7 ngày</strong> sau ký hợp đồng.
              </p>
              <GoldButton onClick={scrollToForm} style={{ fontSize: 14, padding: "16px 40px", borderRadius: R_MD }}>
                {E({ bk: "cta_bottom_gold", def: "Đăng Ký Đại Lý — Nhận Hỗ Trợ Marketing Ngay", as: "span" })}
              </GoldButton>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── TRUST / SOCIAL PROOF ── */}
      <section id="doi-tac" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>Bằng chứng niềm tin</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "trust_title_1", def: "Được Kiểm Chứng Bởi", as: "span", style: { display: "block" } })}
                {E({ bk: "trust_title_2", def: "Hàng Trăm Đối Tác", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 48 }}>
            {[
              { icon: "🏆", bkTitle: "cert_1_title", defTitle: "Motor Đức", bkDesc: "cert_1_desc", defDesc: "Tiêu chuẩn CE/TÜV, bảo hành 5 năm chính hãng" },
              { icon: "🔬", bkTitle: "cert_2_title", defTitle: "Công Thái Học", bkDesc: "cert_2_desc", defDesc: "Chứng nhận ergonomic quốc tế ISO 9241" },
              { icon: "⚡", bkTitle: "cert_3_title", defTitle: "Tải Trọng 300kg", bkDesc: "cert_3_desc", defDesc: "Khung thép cường lực, kiểm định 50.000 lần" },
              { icon: "🛡️", bkTitle: "cert_4_title", defTitle: "An Toàn Điện", bkDesc: "cert_4_desc", defDesc: "Điện áp thấp 24V DC, chứng nhận TCVN" },
            ].map((c, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div style={{ padding: "26px 18px", textAlign: "center", background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{c.icon}</div>
                  <div style={{ color: GOLD, fontWeight: 600, fontSize: 14, marginBottom: 7, fontFamily: FONT_HEADING, letterSpacing: "normal" }}>
                    {E({ bk: c.bkTitle, def: c.defTitle, as: "span" })}
                  </div>
                  <div style={{ color: GRAY, fontSize: 12, lineHeight: 1.65, fontFamily: FONT_BODY }}>
                    {E({ bk: c.bkDesc, def: c.defDesc, as: "span", multiline: true })}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {[
              { bkName: "testimonial_1_name", defName: "Anh Minh Tuấn", bkLoc: "testimonial_1_loc", defLoc: "Showroom Nệm Thiên Phú — Bình Dương", bkQuote: "testimonial_1_quote", defQuote: "Từ khi trưng bày giường SmartFurni, doanh thu tăng 40% chỉ sau 3 tháng. Khách hàng nằm thử xong là mua ngay, không cần thuyết phục nhiều." },
              { bkName: "testimonial_2_name", defName: "Chị Hương Lan", bkLoc: "testimonial_2_loc", defLoc: "Showroom Nệm Hòa Bình — Long An", bkQuote: "testimonial_2_quote", defQuote: "Mô hình dropship rất tiện lợi, không cần nhập hàng nhiều mà vẫn bán được. SmartFurni hỗ trợ giao hàng nhanh, khách hàng rất hài lòng." },
              { bkName: "testimonial_3_name", defName: "Anh Văn Đức", bkLoc: "testimonial_3_loc", defLoc: "Showroom Nệm Sao Việt — Đồng Nai", bkQuote: "testimonial_3_quote", defQuote: "Sản phẩm khác biệt hoàn toàn so với các showroom khác trong khu vực. Đây là lợi thế cạnh tranh thực sự mà tôi tìm kiếm bấy lâu." },
            ].map((t, i) => (
              <FadeIn key={i} delay={i * 90}>
                <div style={{ padding: "28px 24px", background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderTop: `2px solid ${GOLD}`, borderRadius: R_LG }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>{Array.from({ length: 5 }).map((_, j) => <span key={j} style={{ color: GOLD, fontSize: 14 }}>★</span>)}</div>
                  <p style={{ color: GRAY_LIGHT, fontSize: 14, lineHeight: 1.8, marginBottom: 20, fontStyle: "italic", fontFamily: FONT_BODY }}>
                    &ldquo;{E({ bk: t.bkQuote, def: t.defQuote, as: "span", multiline: true })}&rdquo;
                  </p>
                  <div style={{ color: WHITE, fontWeight: 600, fontSize: 14, fontFamily: FONT_HEADING, letterSpacing: "normal" }}>
                    {E({ bk: t.bkName, def: t.defName, as: "span" })}
                  </div>
                  <div style={{ color: GRAY, fontSize: 12, marginTop: 4, fontFamily: FONT_BODY }}>
                    {E({ bk: t.bkLoc, def: t.defLoc, as: "span" })}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>Câu hỏi thường gặp</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                Giải Đáp Thắc Mắc
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 8 }}>
                Dành Cho Đối Tác Đại Lý
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <FaqAccordion />
        </div>
      </section>

      {/* ── FORM ── */}
      <section id="register-form" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <SectionLabel>Đăng ký hợp tác</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "form_title_1", def: "Trở Thành Đại Lý", as: "span", style: { display: "block" } })}
                {E({ bk: "form_title_2", def: "SmartFurni Ngay Hôm Nay", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.75, fontFamily: FONT_BODY }}>
                {E({ bk: "form_subtitle", def: "Điền thông tin bên dưới — đội ngũ tư vấn sẽ liên hệ trong vòng 2 giờ làm việc", as: "span", multiline: true })}
              </p>
            </div>
          </FadeIn>
          {/* Hidden editable block for form submit button text */}
          <div style={{ display: "none" }}>{E({ bk: "form_submit", def: "Nhận Chính Sách Đại Lý & Bảng Giá Sĩ →", as: "span" })}</div>
          <FadeIn delay={100}><LeadForm submitLabel={content["form_submit"] || undefined} /></FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#060500", borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 64 }}>
        {/* Top accent line */}
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, opacity: 0.5, marginBottom: 0 }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 32px 0" }}>
          {/* Main grid: 4 cột */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1.2fr 1.2fr 1fr",
            gap: "48px 40px",
            marginBottom: 52,
          }}>

            {/* Cột 1: Brand */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <img
                  src="/smartfurni-logo-transparent.png"
                  alt="SmartFurni"
                  style={{ height: 48, objectFit: "contain", filter: "brightness(1.05)" }}
                />
              </div>
              <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.85, fontFamily: FONT_BODY, marginBottom: 24, maxWidth: 280 }}>
                {E({ bk: "footer_about", def: "Tiên phong trong lĩnh vực giường công thái học điều chỉnh điện tại Việt Nam. Chất lượng Đức — Thiết kế Việt.", as: "span", multiline: true })}
              </p>
              {/* Social links */}
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Facebook", icon: "f", href: "https://facebook.com/smartfurni" },
                  { label: "YouTube", icon: "▶", href: "https://youtube.com/@smartfurni" },
                  { label: "Zalo", icon: "Z", href: "https://zalo.me/0918326552" },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "rgba(201,168,76,0.08)",
                      border: `1px solid rgba(201,168,76,0.25)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY,
                      textDecoration: "none",
                      transition: "background 0.2s, border-color 0.2s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.18)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = GOLD; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.08)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(201,168,76,0.25)"; }}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Cột 2: Showroom */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2 }} />
                <h4 style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>Showroom</h4>
              </div>
              {[
                { icon: "📍", label: "TP. HCM", val: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức" },
                { icon: "📍", label: "Hà Nội", val: "B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông" },
                { icon: "🏭", label: "Xưởng SX", val: "202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                  <div>
                    <div style={{ color: GOLD_LIGHT, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 2 }}>{a.label}</div>
                    <div style={{ color: GRAY, fontSize: 12, lineHeight: 1.65, fontFamily: FONT_BODY }}>{a.val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cột 3: Liên hệ */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2 }} />
                <h4 style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>Liên hệ</h4>
              </div>
              {[
                { icon: "📞", label: "Hotline", val: "028.7122.0818", href: "tel:02871220818" },
                { icon: "💬", label: "Zalo tư vấn", val: "0918.326.552", href: "https://zalo.me/0918326552" },
                { icon: "✉️", label: "Email", val: "info@smartfurni.vn", href: "mailto:info@smartfurni.vn" },
                { icon: "🌐", label: "Website", val: "smartfurni.vn", href: "https://smartfurni.vn" },
              ].map((c, i) => (
                <a
                  key={i}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start", textDecoration: "none" }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
                  <div>
                    <div style={{ color: GRAY, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 1 }}>{c.label}</div>
                    <div style={{ color: GOLD_LIGHT, fontSize: 13, fontFamily: FONT_BODY, fontWeight: 700 }}>{c.val}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* Cột 4: CTA mini */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2 }} />
                <h4 style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>Đăng ký ngay</h4>
              </div>
              <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.75, fontFamily: FONT_BODY, marginBottom: 20 }}>
                Nhận chính sách đại lý &amp; bảng giá sỉ trong vòng <strong style={{ color: GOLD_LIGHT }}>2 giờ làm việc</strong>.
              </p>
              <a
                href="#dang-ky"
                style={{
                  display: "block", textAlign: "center",
                  background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, #9A7A2E 100%)`,
                  color: BLACK, fontWeight: 700, fontSize: 11,
                  letterSpacing: "0.1em", textTransform: "uppercase" as const,
                  padding: "13px 20px", borderRadius: R_MD,
                  textDecoration: "none",
                  fontFamily: FONT_BODY,
                  boxShadow: "0 6px 24px rgba(201,168,76,0.25)",
                  marginBottom: 12,
                }}
              >
                {E({ bk: "footer_cta_primary", def: "Đăng ký đại lý →", as: "span" })}
              </a>
              <a
                href="https://zalo.me/0918326552"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", textAlign: "center",
                  background: "transparent",
                  color: GRAY_LIGHT, fontWeight: 500, fontSize: 11,
                  letterSpacing: "0.06em",
                  padding: "12px 20px", borderRadius: R_MD,
                  textDecoration: "none",
                  fontFamily: FONT_BODY,
                  border: `1px solid rgba(212,196,160,0.2)`,
                }}
              >
                {E({ bk: "footer_cta_zalo", def: "💬 Chat Zalo ngay", as: "span" })}
              </a>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${BLACK_BORDER} 20%, ${BLACK_BORDER} 80%, transparent)`, marginBottom: 24 }} />

          {/* Bottom bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap" as const, gap: 12,
            paddingBottom: 28,
          }}>
            <p style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT_BODY, margin: 0 }}>
              © 2025 <span style={{ color: "#5A4E30" }}>Công ty Cổ phần SmartFurni</span>. Tất cả quyền được bảo lưu.
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Chính sách bảo mật", href: "/privacy" },
                { label: "Điều khoản sử dụng", href: "/terms" },
                { label: "Chính sách đại lý", href: "/dai-ly" },
              ].map((l) => (
                <a key={l.label} href={l.href} style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT_BODY, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = GRAY)}
                  onMouseLeave={e => (e.currentTarget.style.color = "#3A3020")}
                >{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
