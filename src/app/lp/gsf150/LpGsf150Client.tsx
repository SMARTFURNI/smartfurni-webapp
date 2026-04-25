"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { EditableText } from "@/components/lp/EditableText";
import { LpEditBar } from "@/components/lp/LpEditBar";

// ─── Design tokens (đồng bộ với landing page B2B) ────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E2C97E";
const BLACK = "#0D0B00";
const BLACK_SOFT = "#1A1600";
const BLACK_CARD = "#221D00";
const BLACK_BORDER = "#2E2800";
const WHITE = "#F5EDD6";
const GRAY = "#A89070";
const GRAY_LIGHT = "#D4C4A0";
const RED_SOFT = "#FF6B6B";

const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BRAND = "'Cormorant Garamond', Georgia, serif";

const R_SM = 8;
const R_MD = 12;
const R_LG = 16;
const R_FULL = 999;

const LP_SLUG = "gsf150";

interface Props {
  isEditor?: boolean;
  initialContent?: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
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

function GoldButton({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const [hovered, setHovered] = useState(false);
  const style: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: hovered
      ? `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #9A7A2E 100%)`
      : `linear-gradient(135deg, ${GOLD} 0%, #9A7A2E 100%)`,
    color: BLACK, border: "none", fontWeight: 700,
    fontSize: "clamp(13px, 1.6vw, 15px)", cursor: "pointer",
    letterSpacing: "0.08em", textTransform: "uppercase" as const,
    padding: "16px 36px",
    boxShadow: hovered ? `0 12px 36px rgba(201,168,76,0.45)` : `0 6px 24px rgba(201,168,76,0.3)`,
    borderRadius: R_MD, fontFamily: FONT_BODY,
    transition: "all 0.25s ease",
    textDecoration: "none",
    transform: hovered ? "translateY(-1px)" : "none",
  };
  if (href) return <a href={href} style={style} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>{children}</a>;
  return <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={style}>{children}</button>;
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: "Giường cũ của tôi kích thước lẻ có dùng được không?", a: "GSF150 có đầy đủ kích thước chuẩn (1m6, 1m8). Vui lòng để lại số điện thoại để kỹ thuật viên tư vấn kích thước lọt lòng chính xác nhất cho bạn." },
  { q: "Nệm lò xo có dùng được khung này không?", a: "Hoàn toàn được. Các dòng lò xo túi hiện đại có độ đàn hồi rất tốt, khớp hoàn hảo với chuyển động của khung nâng." },
  { q: "Lắp đặt có phức tạp không?", a: "Sản phẩm được thiết kế theo dạng \"Plug & Play\". Chỉ cần đặt lên giường, cắm điện là sử dụng ngay. SmartFurni cung cấp video hướng dẫn chi tiết — chỉ 15 phút là thao tác thuần thục." },
  { q: "Nếu động cơ (motor) gặp sự cố thì bảo hành thế nào?", a: "SmartFurni sử dụng dòng motor lõi đồng tiêu chuẩn xuất khẩu Đức với độ bền trên 10 năm. Chúng tôi áp dụng chính sách \"Đổi mới động cơ\" ngay lập tức nếu có lỗi nhà sản xuất. Đội kỹ thuật hỗ trợ tận nơi." },
  { q: "Tôi có thể đặt khung lên giường gỗ hiện tại không?", a: "Đây chính là điểm độc đáo của GSF150. Bạn chỉ cần tháo chân khung và đặt trực tiếp vào lòng giường gỗ hiện có — không cần bỏ giường cũ, không cần lắp đặt phức tạp." },
  { q: "Trả góp có được không?", a: "Có. SmartFurni hỗ trợ trả góp 0% lãi suất qua các đối tác tài chính. Liên hệ hotline để được tư vấn phương thức phù hợp nhất." },
];

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <FadeIn key={i} delay={i * 60}>
            <div style={{ background: isOpen ? BLACK_CARD : BLACK_SOFT, border: `1px solid ${isOpen ? "rgba(201,168,76,0.45)" : BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden", transition: "border-color 0.25s ease, background 0.25s ease" }}>
              <button onClick={() => setOpenIndex(isOpen ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "22px 24px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const }}>
                <span style={{ color: isOpen ? GOLD : WHITE, fontSize: "clamp(14px, 1.8vw, 16px)", fontWeight: 500, lineHeight: 1.5, fontFamily: FONT_HEADING, transition: "color 0.25s ease" }}>{item.q}</span>
                <span style={{ color: GOLD, fontSize: 20, flexShrink: 0, transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.3s ease", lineHeight: 1 }}>+</span>
              </button>
              <div style={{ maxHeight: isOpen ? 400 : 0, overflow: "hidden", transition: "max-height 0.4s ease" }}>
                <div style={{ padding: "0 24px 24px", borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 18 }}>
                  <p style={{ color: GRAY_LIGHT, fontSize: "clamp(13px, 1.6vw, 15px)", lineHeight: 1.75, fontFamily: FONT_BODY, margin: 0 }}>{item.a}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        );
      })}
    </div>
  );
}

// ─── Lead Form (bán lẻ) ───────────────────────────────────────────────────────
function LeadFormRetail({ submitLabel }: { submitLabel?: string }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { setError("Vui lòng điền đầy đủ Họ tên và Số điện thoại."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, source: "lp-gsf150", type: "retail" }) });
      if (!res.ok) throw new Error("Lỗi server");
      setSuccess(true);
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hotline 028.7122.0818.");
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { width: "100%", background: "rgba(245,237,214,0.04)", border: `1px solid rgba(201,168,76,0.2)`, color: WHITE, padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box" as const, transition: "border-color 0.2s, box-shadow 0.2s", borderRadius: R_MD };

  if (success) return (
    <div style={{ textAlign: "center", padding: "56px 32px", background: BLACK_CARD, border: `1px solid ${GOLD}`, borderRadius: R_LG }}>
      <div style={{ fontSize: 52, marginBottom: 18 }}>✅</div>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: GOLD, marginBottom: 12, fontFamily: FONT_HEADING, letterSpacing: "0.06em" }}>Đặt hàng thành công!</h3>
      <p style={{ color: GRAY_LIGHT, fontSize: 15, lineHeight: 1.75, fontFamily: FONT_BODY }}>Cảm ơn bạn đã tin tưởng SmartFurni.<br />Đội ngũ tư vấn sẽ liên hệ qua <strong style={{ color: GOLD }}>Zalo / điện thoại</strong> trong vòng 2 giờ làm việc để xác nhận đơn hàng.</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, padding: "clamp(24px,4vw,44px)", borderRadius: R_LG }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
        {[{ k: "name", label: "Họ và tên *", ph: "Nguyễn Văn A" }, { k: "phone", label: "Số điện thoại (Zalo) *", ph: "0912 345 678" }].map(f => (
          <div key={f.k}>
            <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>{f.label}</label>
            <input type="text" placeholder={f.ph} value={form[f.k as keyof typeof form]} onChange={set(f.k)} style={inp}
              onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px rgba(201,168,76,0.12)`; }}
              onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.2)"; e.target.style.boxShadow = "none"; }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Địa chỉ giao hàng</label>
        <input type="text" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố" value={form.address} onChange={set("address")} style={inp}
          onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px rgba(201,168,76,0.12)`; }}
          onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.2)"; e.target.style.boxShadow = "none"; }} />
      </div>
      <div style={{ marginBottom: 26 }}>
        <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Câu hỏi hoặc yêu cầu thêm</label>
        <textarea placeholder="Kích thước giường, loại nệm hiện tại, yêu cầu đặc biệt…" rows={3} value={form.note} onChange={set("note")} style={{ ...inp, resize: "vertical" }}
          onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px rgba(201,168,76,0.12)`; }}
          onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.2)"; e.target.style.boxShadow = "none"; }} />
      </div>
      {error && <div style={{ color: RED_SOFT, fontSize: 13, marginBottom: 16, padding: "12px 16px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: R_SM, fontFamily: FONT_BODY }}>{error}</div>}
      <button type="submit" disabled={loading} style={{ width: "100%", padding: "17px", background: loading ? "#333" : `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #9A7A2E 100%)`, color: BLACK, border: "none", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, boxShadow: loading ? "none" : `0 8px 28px rgba(201,168,76,0.3)`, borderRadius: R_MD, fontFamily: FONT_BODY, transition: "all 0.25s ease" }}>
        {loading ? "Đang gửi…" : (submitLabel || "Tư Vấn & Đặt Hàng Ngay →")}
      </button>
      <p style={{ color: GRAY, fontSize: 12, textAlign: "center", marginTop: 14, fontFamily: FONT_BODY }}>🔒 Thông tin được bảo mật tuyệt đối. Không spam.</p>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LpGsf150Client({ isEditor = false, initialContent = {} }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [editedCount, setEditedCount] = useState(0);

  const handleSaved = useCallback((blockKey: string, newValue: string) => {
    setContent(prev => ({ ...prev, [blockKey]: newValue }));
    setEditedCount(c => c + 1);
  }, []);

  const E = useCallback((bk: string, def: string) => (
    <EditableText slug={LP_SLUG} blockKey={bk} defaultValue={def} editMode={editMode}
      as="span" savedValue={content[bk]} onSaved={handleSaved} />
  ), [editMode, content, handleSaved]);

  const sec: React.CSSProperties = { padding: "clamp(64px, 8vw, 120px) clamp(20px, 5vw, 80px)", maxWidth: 1200, margin: "0 auto" };

  return (
    <div style={{ background: BLACK, minHeight: "100vh", fontFamily: FONT_BODY, color: WHITE }}>
      <LpEditBar isEditor={isEditor} editMode={editMode} onToggleEditMode={() => setEditMode(v => !v)} editedCount={editedCount} />

      {/* ── NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(13,11,0,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BLACK_BORDER}`, padding: "0 clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, border: `1.5px solid ${GOLD}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <span style={{ fontFamily: FONT_BRAND, fontSize: 16, letterSpacing: "0.12em", color: WHITE, fontWeight: 400 }}>SMARTFURNI</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#features" style={{ color: GRAY_LIGHT, fontSize: 13, textDecoration: "none", letterSpacing: "0.06em" }}>Tính năng</a>
            <a href="#pricing" style={{ color: GRAY_LIGHT, fontSize: 13, textDecoration: "none", letterSpacing: "0.06em" }}>Giá</a>
            <a href="#register-form" style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A2E 100%)`, color: BLACK, padding: "9px 20px", borderRadius: R_MD, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", textTransform: "uppercase" as const }}>Đặt hàng</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: `linear-gradient(180deg, ${BLACK} 0%, ${BLACK_SOFT} 100%)`, padding: "clamp(80px,10vw,140px) clamp(20px,5vw,80px) clamp(60px,8vw,100px)", textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn><SectionLabel>Chương trình ưu đãi tháng này</SectionLabel></FadeIn>
          <FadeIn delay={100}>
            <h1 style={{ fontSize: "clamp(32px, 5.5vw, 64px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 12, fontFamily: FONT_HEADING, letterSpacing: "-0.02em" }}>
              {E("hero_h1_line1", "Nâng Cấp Giường Thường")}
              <br /><span style={{ color: GOLD, fontWeight: 700 }}>{E("hero_h1_line2", "Thành Giường Thông Minh")}</span>
              <br />{E("hero_h1_line3", "Trong 5 Phút")}
            </h1>
          </FadeIn>
          <FadeIn delay={200}>
            <p style={{ fontSize: "clamp(15px, 2vw, 19px)", color: GRAY_LIGHT, lineHeight: 1.7, marginBottom: 36, maxWidth: 680, margin: "0 auto 36px" }}>
              {E("hero_sub", "Tận hưởng công nghệ ngủ không trọng lực với Khung giường công thái học SmartFurni GSF150. Không cần bỏ giường cũ — Không cần lắp đặt phức tạp.")}
            </p>
          </FadeIn>
          <FadeIn delay={300}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginBottom: 40 }}>
              <GoldButton href="#register-form">{E("hero_cta", "Nhận Ưu Đãi Trải Nghiệm Ngay")}</GoldButton>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
              {["Bảo hành motor 5 năm", "Đổi trả trong 7 ngày", "Lắp đặt toàn quốc"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: GOLD, fontSize: 14 }}>✓</span>
                  <span style={{ color: GRAY_LIGHT, fontSize: 13, fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={400}>
            <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              <div style={{ borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <Image src="/gsf150-standalone.jpg" alt="SmartFurni GSF150 khung độc lập" width={600} height={450} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
              <div style={{ borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <Image src="/gsf150-wood-frame.jpg" alt="SmartFurni GSF150 lắp vào giường gỗ" width={600} height={450} style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── NỖI ĐAU ── */}
      <section style={{ ...sec, textAlign: "center" }}>
        <FadeIn>
          <SectionLabel>Thực trạng giấc ngủ</SectionLabel>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 12, fontFamily: FONT_HEADING }}>
            {E("pain_h2_1", "Bạn Có Đang Gặp Phải")}
            <br /><span style={{ color: GOLD, fontWeight: 700 }}>{E("pain_h2_2", "Tình Trạng Này?")}</span>
          </h2>
          <GoldDivider />
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 20 }}>
          {[
            { icon: "😰", title: "Đau mỏi vai gáy mỗi sáng", desc: "Do ngủ sai tư thế trên mặt phẳng cứng nhắc suốt 8 tiếng." },
            { icon: "🪑", title: "Tiếc chiếc giường gỗ quý", desc: "Muốn mua giường thông minh nhưng không nỡ vứt bỏ nội thất cũ đang dùng tốt." },
            { icon: "😤", title: "Ngủ ngáy & Trào ngược", desc: "Khiến giấc ngủ chập chờn, mệt mỏi cả ngày hôm sau." },
            { icon: "📚", title: "Mỏi lưng khi đọc sách, xem phim", desc: "Phải chèn hàng đống gối sau lưng nhưng vẫn không thoải mái." },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 80}>
              <div style={{ background: BLACK_SOFT, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "28px 24px", textAlign: "left" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ color: WHITE, fontSize: 16, fontWeight: 600, marginBottom: 10, fontFamily: FONT_HEADING }}>{item.title}</h3>
                <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.65, margin: 0, fontFamily: FONT_BODY }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── GIẢI PHÁP ── */}
      <section style={{ background: BLACK_SOFT, padding: "clamp(64px,8vw,120px) clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>Giải pháp đột phá</SectionLabel>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 12, fontFamily: FONT_HEADING }}>
                {E("sol_h2_1", "Giải Pháp \"Cứu Rỗi\"")}
                <br /><span style={{ color: GOLD, fontWeight: 700 }}>{E("sol_h2_2", "Phòng Ngủ Của Bạn")}</span>
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY_LIGHT, fontSize: "clamp(14px, 1.8vw, 17px)", lineHeight: 1.75, maxWidth: 640, margin: "0 auto" }}>
                {E("sol_sub", "SmartFurni GSF150 không chỉ là một chiếc giường — đó là một hệ thống nâng cấp sức khỏe thông minh.")}
              </p>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 28 }}>
            {[
              { num: "01", title: "\"Lót\" giường thông minh — Giữ nguyên giường cũ", desc: "Điểm độc đáo nhất của GSF150 là thiết kế tháo rời chân. Bạn chỉ việc đặt trực tiếp khung giường vào lòng giường hiện có. Vẫn giữ được vẻ đẹp sang trọng của chiếc giường gỗ đắt tiền, nhưng sở hữu công năng của một chiếc giường công nghệ hàng đầu.", img: "/gsf150-wood-frame.jpg" },
              { num: "02", title: "Biến hình linh hoạt — Giường độc lập tối giản", desc: "Muốn phong cách tối giản (Minimalism)? Chỉ cần lắp bộ chân thép đi kèm, GSF150 trở thành một chiếc giường công nghệ đứng độc lập, thanh thoát và hiện đại.", img: "/gsf150-standalone.jpg" },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden" }}>
                  <div style={{ position: "relative", height: 240 }}>
                    <Image src={item.img} alt={item.title} fill style={{ objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,11,0,0.7) 0%, transparent 60%)" }} />
                    <div style={{ position: "absolute", top: 16, left: 16, background: GOLD, color: BLACK, fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: R_FULL, letterSpacing: "0.1em" }}>{item.num}</div>
                  </div>
                  <div style={{ padding: "24px 24px 28px" }}>
                    <h3 style={{ color: WHITE, fontSize: "clamp(16px, 2vw, 18px)", fontWeight: 600, marginBottom: 12, lineHeight: 1.4, fontFamily: FONT_HEADING }}>{item.title}</h3>
                    <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: FONT_BODY }}>{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={200}>
            <div style={{ marginTop: 40, borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}`, background: BLACK_CARD }}>
              <Image src="/gsf150-exploded.jpg" alt="Cấu tạo SmartFurni GSF150" width={1200} height={600} style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── TÍNH NĂNG ── */}
      <section id="features" style={{ ...sec, textAlign: "center" }}>
        <FadeIn>
          <SectionLabel>Công nghệ chăm sóc giấc ngủ</SectionLabel>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 12, fontFamily: FONT_HEADING }}>
            {E("feat_h2_1", "Công Nghệ Chăm Sóc Giấc Ngủ")}
            <br /><span style={{ color: GOLD, fontWeight: 700 }}>{E("feat_h2_2", "Đến Từ Tương Lai")}</span>
          </h2>
          <GoldDivider />
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 20 }}>
          {[
            { icon: "🌙", title: "Chế độ Zero Gravity", desc: "Nâng cao đầu và chân ở góc độ hoàn hảo, giúp máu lưu thông về tim tốt hơn, giải tỏa áp lực tối đa lên cột sống. Cảm giác như đang lơ lửng giữa tầng mây." },
            { icon: "🫁", title: "Chống ngủ ngáy & Trào ngược", desc: "Nâng nhẹ phần đầu giúp đường thở thông thoáng và ngăn axit dạ dày trào ngược — giấc ngủ trọn vẹn hơn cho cả hai người." },
            { icon: "📱", title: "Điều khiển không dây một chạm", desc: "Tùy chỉnh mọi góc độ chỉ với một nút bấm. Lưu thiết lập yêu thích để giường tự động trở về tư thế bạn thoải mái nhất." },
            { icon: "⚙️", title: "Động cơ Motor Đức siêu êm", desc: "Vận hành bền bỉ, không tiếng ồn, chịu tải lên đến 300kg. Thay đổi tư thế ngay trong đêm mà không làm ảnh hưởng đến người bên cạnh." },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 80}>
              <div style={{ background: BLACK_SOFT, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "32px 24px", textAlign: "left", transition: "border-color 0.25s ease, transform 0.25s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(201,168,76,0.4)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = BLACK_BORDER; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ color: GOLD, fontSize: 16, fontWeight: 600, marginBottom: 10, fontFamily: FONT_HEADING }}>{item.title}</h3>
                <p style={{ color: GRAY_LIGHT, fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: FONT_BODY }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── TẠI SAO CHỌN ── */}
      <section style={{ background: BLACK_SOFT, padding: "clamp(64px,8vw,120px) clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Sự khác biệt</SectionLabel>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 12, fontFamily: FONT_HEADING }}>
              {E("why_h2_1", "Tại Sao Phải Chọn")}
              <br /><span style={{ color: GOLD, fontWeight: 700 }}>{E("why_h2_2", "SmartFurni GSF150?")}</span>
            </h2>
            <GoldDivider />
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginTop: 20 }}>
            {[
              { icon: "✅", title: "Tương thích 100% các loại nệm", desc: "Từ nệm cao su, nệm lò xo túi đến nệm foam." },
              { icon: "📐", title: "Thiết kế Slim-fit", desc: "Siêu mỏng, ôm sát lòng giường, thẩm mỹ tuyệt đối." },
              { icon: "🏗️", title: "Vật liệu cao cấp", desc: "Khung thép sơn tĩnh điện chống gỉ sét, mặt giường bọc vải mềm mại, thoát khí." },
              { icon: "🛡️", title: "Bảo hành 5 năm", desc: "Motor tuyến tính tiêu chuẩn CE/TÜV, bảo hành chính hãng toàn quốc." },
              { icon: "🚚", title: "Lắp đặt toàn quốc", desc: "Đội kỹ thuật hỗ trợ lắp đặt và hướng dẫn sử dụng tận nơi." },
              { icon: "🔄", title: "Đổi trả 7 ngày", desc: "Không hài lòng? Đổi trả miễn phí trong 7 ngày đầu sử dụng." },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "24px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                  <h3 style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: FONT_HEADING, lineHeight: 1.4 }}>{item.title}</h3>
                  <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: FONT_BODY }}>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUY TRÌNH ── */}
      <section style={{ ...sec, textAlign: "center" }}>
        <FadeIn>
          <SectionLabel>Hướng dẫn sử dụng</SectionLabel>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 12, fontFamily: FONT_HEADING }}>
            {E("how_h2_1", "Dễ Dàng")}
            <br /><span style={{ color: GOLD, fontWeight: 700 }}>{E("how_h2_2", "Đến Không Ngờ")}</span>
          </h2>
          <GoldDivider />
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginTop: 20 }}>
          {[
            { step: "01", icon: "📦", title: "Mở hộp", desc: "Sản phẩm được đóng gói gọn gàng, an toàn. Kiểm tra đầy đủ phụ kiện đi kèm." },
            { step: "02", icon: "🛏️", title: "Đặt lên", desc: "Tháo chân khung giường, đặt trực tiếp lên giường cũ. Hoặc lắp chân nếu muốn dùng riêng." },
            { step: "03", icon: "⚡", title: "Cắm điện & Tận hưởng", desc: "Kết nối nguồn điện và trải nghiệm ngay lập tức. Không cần kỹ thuật viên." },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 100}>
              <div style={{ background: BLACK_SOFT, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "32px 24px", position: "relative" }}>
                <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: GOLD, color: BLACK, fontSize: 12, fontWeight: 800, padding: "5px 16px", borderRadius: R_FULL, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>BƯỚC {item.step}</div>
                <div style={{ fontSize: 40, marginBottom: 16, marginTop: 8 }}>{item.icon}</div>
                <h3 style={{ color: WHITE, fontSize: 18, fontWeight: 600, marginBottom: 10, fontFamily: FONT_HEADING }}>{item.title}</h3>
                <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: FONT_BODY }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── GIÁ & ƯU ĐÃI ── */}
      <section id="pricing" style={{ background: BLACK_SOFT, padding: "clamp(64px,8vw,120px) clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Ưu đãi & cam kết</SectionLabel>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 12, fontFamily: FONT_HEADING }}>
              {E("price_h2_1", "Đầu Tư Cho Sức Khỏe")}
              <br /><span style={{ color: GOLD, fontWeight: 700 }}>{E("price_h2_2", "Là Khoản Đầu Tư Có Lời Nhất")}</span>
            </h2>
            <GoldDivider />
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ background: BLACK_CARD, border: `1px solid rgba(201,168,76,0.4)`, borderRadius: R_LG, padding: "clamp(32px,4vw,52px)", marginTop: 20 }}>
              <div style={{ marginBottom: 32 }}>
                <div style={{ color: GRAY_LIGHT, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8, fontFamily: FONT_BODY }}>Giá bán lẻ niêm yết</div>
                <div style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, color: GOLD, fontFamily: FONT_HEADING, lineHeight: 1 }}>{E("price_value", "9.790.000 ₫")}</div>
                <div style={{ color: GRAY, fontSize: 14, marginTop: 6, fontFamily: FONT_BODY }}>/ size — nhiều kích thước</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                {[
                  { icon: "🎁", text: E("price_gift", "Ưu đãi tháng này: Tặng kèm bộ gối cao su non trị giá 500.000đ") },
                  { icon: "💳", text: E("price_installment", "Trả góp 0% lãi suất — sở hữu ngay chỉ từ 27.000đ/ngày") },
                  { icon: "🚚", text: "Miễn phí giao hàng & lắp đặt toàn quốc" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, textAlign: "left", padding: "14px 18px", background: BLACK_SOFT, borderRadius: R_MD, border: `1px solid ${BLACK_BORDER}` }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ color: GRAY_LIGHT, fontSize: 14, lineHeight: 1.6, fontFamily: FONT_BODY }}>{item.text}</span>
                  </div>
                ))}
              </div>
              <GoldButton href="#register-form">Đặt Hàng Ngay — Nhận Ưu Đãi</GoldButton>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ ...sec }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Câu hỏi thường gặp</SectionLabel>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 12, fontFamily: FONT_HEADING }}>
                {E("faq_h2_1", "Giải Đáp Thắc Mắc")}
                <br /><span style={{ color: GOLD, fontWeight: 700 }}>{E("faq_h2_2", "Của Bạn")}</span>
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <FaqAccordion />
        </div>
      </section>

      {/* ── FORM ĐĂNG KÝ ── */}
      <section id="register-form" style={{ background: BLACK_SOFT, padding: "clamp(64px,8vw,120px) clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Đặt hàng ngay</SectionLabel>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 12, fontFamily: FONT_HEADING }}>
                {E("form_h2_1", "Đừng Để Cơn Đau Lưng")}
                <br /><span style={{ color: GOLD, fontWeight: 700 }}>{E("form_h2_2", "Làm Phiền Giấc Ngủ Của Bạn")}</span>
                <br />{E("form_h2_3", "Thêm Một Đêm Nào Nữa!")}
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY_LIGHT, fontSize: "clamp(14px, 1.8vw, 16px)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
                {E("form_sub", "Điền thông tin bên dưới — đội ngũ tư vấn sẽ liên hệ trong vòng 2 giờ làm việc để xác nhận đơn hàng và hướng dẫn lắp đặt.")}
              </p>
            </div>
          </FadeIn>
          {editMode && (
            <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(201,168,76,0.08)", border: `1px dashed ${GOLD}`, borderRadius: R_MD }}>
              <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginRight: 10 }}>NÚT ĐẶT HÀNG:</span>
              <EditableText slug={LP_SLUG} blockKey="form_submit" defaultValue="Tư Vấn & Đặt Hàng Ngay →" editMode={true} as="span" savedValue={content["form_submit"]} onSaved={handleSaved} />
            </div>
          )}
          <FadeIn delay={100}>
            <LeadFormRetail submitLabel={content["form_submit"] || undefined} />
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: BLACK, borderTop: `1px solid ${BLACK_BORDER}`, padding: "clamp(40px,5vw,64px) clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, border: `1.5px solid ${GOLD}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <span style={{ fontFamily: FONT_BRAND, fontSize: 16, letterSpacing: "0.12em", color: WHITE }}>SMARTFURNI</span>
              </div>
              <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: FONT_BODY }}>Tiên phong trong lĩnh vực giường công thái học điều chỉnh điện tại Việt Nam.</p>
            </div>
            <div>
              <h4 style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: 16, fontFamily: FONT_BODY }}>Showroom</h4>
              {[
                { city: "TP. HCM", addr: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức" },
                { city: "Hà Nội", addr: "B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông" },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, marginBottom: 4, fontFamily: FONT_BODY }}>📍 {s.city}</div>
                  <div style={{ color: GRAY, fontSize: 13, lineHeight: 1.5, fontFamily: FONT_BODY }}>{s.addr}</div>
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: 16, fontFamily: FONT_BODY }}>Liên hệ</h4>
              {[
                { icon: "📞", val: "028.7122.0818", href: "tel:02871220818" },
                { icon: "💬", val: "Zalo: 0918.326.552", href: "https://zalo.me/0918326552" },
                { icon: "✉️", val: "info@smartfurni.vn", href: "mailto:info@smartfurni.vn" },
              ].map((c, i) => (
                <a key={i} href={c.href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, textDecoration: "none", color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = GOLD}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = GRAY_LIGHT}>
                  <span>{c.icon}</span><span>{c.val}</span>
                </a>
              ))}
            </div>
            <div>
              <h4 style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: 16, fontFamily: FONT_BODY }}>Đặt hàng ngay</h4>
              <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.6, marginBottom: 16, fontFamily: FONT_BODY }}>Nhận tư vấn miễn phí & báo giá trong vòng 2 giờ làm việc.</p>
              <a href="#register-form" style={{ display: "inline-block", background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A2E 100%)`, color: BLACK, padding: "11px 24px", borderRadius: R_MD, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", textTransform: "uppercase" as const }}>Đặt Hàng →</a>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 24, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ color: GRAY, fontSize: 12, margin: 0, fontFamily: FONT_BODY }}>© 2025 Công ty Cổ phần SmartFurni. Tất cả quyền được bảo lưu.</p>
            <div style={{ display: "flex", gap: 20 }}>
              {[{ label: "Chính sách bảo mật", href: "/privacy" }, { label: "Điều khoản sử dụng", href: "/terms" }].map((l, i) => (
                <a key={i} href={l.href} style={{ color: GRAY, fontSize: 12, textDecoration: "none", fontFamily: FONT_BODY }}>{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky CTA mobile */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99, background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #9A7A2E 100%)`, padding: "14px 20px", textAlign: "center", display: "none" }} className="lp-mobile-cta">
        <a href="#register-form" style={{ color: BLACK, fontWeight: 700, fontSize: 14, letterSpacing: "0.08em", textDecoration: "none", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Đặt Hàng Ngay — Nhận Ưu Đãi →</a>
      </div>
      <style>{`@media (max-width: 768px) { .lp-mobile-cta { display: block !important; } }`}</style>
    </div>
  );
}
