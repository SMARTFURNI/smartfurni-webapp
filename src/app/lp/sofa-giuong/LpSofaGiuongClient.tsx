"use client";
import "./lp-retail.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { EditableText } from "@/components/lp/EditableText";
import { LpEditBar } from "@/components/lp/LpEditBar";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E2C97E";
const BLACK = "#0A0A08";
const BLACK_SOFT = "#111109";
const BLACK_CARD = "#16140E";
const BLACK_BORDER = "rgba(201,168,76,0.12)";
const WHITE = "#F5F0E8";
const GRAY = "#7A7468";
const GRAY_LIGHT = "#A8A090";
const RED_SOFT = "#FF6B6B";
const LP_SLUG = "sofa-giuong";
const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BRAND = "'Cormorant Garamond', Georgia, serif";
const R_SM = 8;
const R_MD = 12;
const R_LG = 16;
const R_FULL = 999;

interface Props {
  isEditor?: boolean;
  initialContent?: Record<string, string>;
}

// ─── FadeIn ─────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function GoldDivider() {
  return <div style={{ width: 48, height: 2, background: `linear-gradient(90deg, ${GOLD}, transparent)`, margin: "0 auto 32px", borderRadius: 2 }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: GOLD, fontFamily: FONT_BODY }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
      {children}
    </div>
  );
}

// ─── Countdown Display ───────────────────────────────────────────────────────
const CountdownDisplay = React.memo(function CountdownDisplay({ targetHours }: { targetHours: number }) {
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const end = Date.now() + targetHours * 3600 * 1000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      setTime({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetHours]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span style={{ fontFamily: "monospace", fontWeight: 700, color: GOLD, letterSpacing: "0.05em" }}>
      {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
    </span>
  );
});

// ─── Configurator ────────────────────────────────────────────────────────────
const TIERS = [
  {
    id: "standard",
    name: "Dòng Tiêu Chuẩn",
    subtitle: "Phong cách tối giản, tiết kiệm",
    priceRange: "Dưới 5.000.000 ₫",
    basePrice: 4490000,
    features: ["Khung thép mạ kẽm cao cấp", "Không tay vịn", "Nệm dày 7cm", "Vải bố bền chắc", "Không hộc để đồ", "Gỗ ốp công nghiệp"],
    badge: null,
  },
  {
    id: "premium",
    name: "Dòng Nâng Cao",
    subtitle: "Sang trọng, tiện nghi đầy đủ",
    priceRange: "6.000.000 – 8.000.000 ₫",
    basePrice: 6490000,
    features: ["Khung thép mạ kẽm cao cấp", "Tay vịn tiện nghi", "Nệm dày 10cm", "Da PU cao cấp", "Hộc để đồ tiện lợi", "Gỗ ốp tự nhiên"],
    badge: "Bán chạy nhất",
  },
];

const OPTIONS = {
  armrest: [
    { id: "no", label: "Không tay vịn", desc: "Gọn gàng, hiện đại", price: 0, tiers: ["standard"] },
    { id: "yes", label: "Có tay vịn", desc: "Tiện nghi, sang trọng", price: 500000, tiers: ["premium"] },
  ],
  mattress: [
    { id: "7cm", label: "Nệm 7cm", desc: "Đàn hồi tốt, phù hợp mọi vóc dáng", price: 0, tiers: ["standard"] },
    { id: "10cm", label: "Nệm 10cm", desc: "Êm ái vượt trội, hỗ trợ cột sống", price: 800000, tiers: ["premium"] },
  ],
  fabric: [
    { id: "bo", label: "Vải bố", desc: "Bền, thoáng, dễ vệ sinh", price: 0, tiers: ["standard"] },
    { id: "pu", label: "Da PU cao cấp", desc: "Sang trọng, lau chùi dễ dàng", price: 1200000, tiers: ["premium"] },
  ],
  storage: [
    { id: "no", label: "Không hộc", desc: "Thiết kế tối giản", price: 0, tiers: ["standard"] },
    { id: "yes", label: "Có hộc để đồ", desc: "Lưu trữ chăn gối tiện lợi", price: 700000, tiers: ["premium"] },
  ],
  wood: [
    { id: "industrial", label: "Gỗ công nghiệp", desc: "Bền, chống ẩm tốt", price: 0, tiers: ["standard"] },
    { id: "natural", label: "Gỗ tự nhiên", desc: "Vân gỗ đẹp, cao cấp", price: 1500000, tiers: ["premium"] },
  ],
};

function Configurator() {
  const [tier, setTier] = useState<"standard" | "premium">("premium");
  const [opts, setOpts] = useState({ armrest: "yes", mattress: "10cm", fabric: "pu", storage: "yes", wood: "natural" });

  const selectedTier = TIERS.find(t => t.id === tier)!;
  const totalPrice = selectedTier.basePrice +
    (OPTIONS.armrest.find(o => o.id === opts.armrest)?.price ?? 0) +
    (OPTIONS.mattress.find(o => o.id === opts.mattress)?.price ?? 0) +
    (OPTIONS.fabric.find(o => o.id === opts.fabric)?.price ?? 0) +
    (OPTIONS.storage.find(o => o.id === opts.storage)?.price ?? 0) +
    (OPTIONS.wood.find(o => o.id === opts.wood)?.price ?? 0);

  const handleTierChange = (newTier: "standard" | "premium") => {
    setTier(newTier);
    if (newTier === "standard") {
      setOpts({ armrest: "no", mattress: "7cm", fabric: "bo", storage: "no", wood: "industrial" });
    } else {
      setOpts({ armrest: "yes", mattress: "10cm", fabric: "pu", storage: "yes", wood: "natural" });
    }
  };

  const formatPrice = (p: number) => p.toLocaleString("vi-VN") + " ₫";

  return (
    <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden" }}>
      {/* Tier selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${BLACK_BORDER}` }}>
        {TIERS.map(t => (
          <button key={t.id} onClick={() => handleTierChange(t.id as "standard" | "premium")}
            style={{ padding: "20px 24px", background: tier === t.id ? "rgba(201,168,76,0.08)" : "transparent", borderRight: t.id === "standard" ? `1px solid ${BLACK_BORDER}` : "none", border: "none", cursor: "pointer", textAlign: "left" as const, position: "relative" as const, transition: "background 0.2s" }}>
            {t.badge && (
              <div style={{ position: "absolute" as const, top: 10, right: 10, background: GOLD, color: BLACK, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 8px", borderRadius: R_FULL, textTransform: "uppercase" as const }}>
                {t.badge}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${tier === t.id ? GOLD : GRAY}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {tier === t.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />}
              </div>
              <span style={{ color: tier === t.id ? WHITE : GRAY, fontSize: 14, fontWeight: 700, fontFamily: FONT_HEADING }}>{t.name}</span>
            </div>
            <div style={{ color: GRAY, fontSize: 11, fontFamily: FONT_BODY, marginLeft: 22 }}>{t.subtitle}</div>
            <div style={{ color: tier === t.id ? GOLD : GRAY, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY, marginLeft: 22, marginTop: 6 }}>{t.priceRange}</div>
          </button>
        ))}
      </div>

      {/* Options */}
      <div style={{ padding: "24px 24px 0" }}>
        {([
          { key: "armrest", label: "Tay vịn", opts: OPTIONS.armrest },
          { key: "mattress", label: "Độ dày nệm", opts: OPTIONS.mattress },
          { key: "fabric", label: "Chất liệu bọc", opts: OPTIONS.fabric },
          { key: "storage", label: "Hộc để đồ", opts: OPTIONS.storage },
          { key: "wood", label: "Gỗ ốp", opts: OPTIONS.wood },
        ] as const).map(group => (
          <div key={group.key} style={{ marginBottom: 20 }}>
            <div style={{ color: GRAY, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 10 }}>{group.label}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
              {group.opts.map(opt => {
                const isSelected = opts[group.key] === opt.id;
                const isAvailable = opt.tiers.includes(tier);
                return (
                  <button key={opt.id}
                    onClick={() => isAvailable && setOpts(prev => ({ ...prev, [group.key]: opt.id }))}
                    style={{ padding: "10px 16px", borderRadius: R_SM, border: isSelected ? `1.5px solid ${GOLD}` : `1px solid ${isAvailable ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.05)"}`, background: isSelected ? "rgba(201,168,76,0.1)" : "transparent", cursor: isAvailable ? "pointer" : "not-allowed", opacity: isAvailable ? 1 : 0.35, transition: "all 0.15s", textAlign: "left" as const }}>
                    <div style={{ color: isSelected ? GOLD : (isAvailable ? WHITE : GRAY), fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY }}>{opt.label}</div>
                    <div style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY, marginTop: 2 }}>{opt.desc}</div>
                    {opt.price > 0 && isAvailable && (
                      <div style={{ color: GOLD_LIGHT, fontSize: 10, fontFamily: FONT_BODY, marginTop: 3 }}>+{formatPrice(opt.price)}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Price summary */}
      <div style={{ padding: "20px 24px", borderTop: `1px solid ${BLACK_BORDER}`, background: "rgba(201,168,76,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 16 }}>
        <div>
          <div style={{ color: GRAY, fontSize: 11, fontFamily: FONT_BODY, marginBottom: 4 }}>Giá tham khảo</div>
          <div style={{ color: GOLD, fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700, fontFamily: FONT_HEADING, letterSpacing: "-0.02em" }}>{formatPrice(totalPrice)}</div>
          <div style={{ color: GRAY, fontSize: 11, fontFamily: FONT_BODY, marginTop: 2 }}>Miễn phí giao hàng + lắp đặt</div>
        </div>
        <a href="#register-form"
          style={{ display: "inline-block", background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, #9A7A2E 100%)`, color: BLACK, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" as const, padding: "14px 28px", borderRadius: R_MD, textDecoration: "none", fontFamily: FONT_BODY, boxShadow: "0 6px 24px rgba(201,168,76,0.3)", whiteSpace: "nowrap" as const }}>
          Đặt hàng ngay →
        </a>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LpSofaGiuongClient({ isEditor = false, initialContent = {} }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [scrollY, setScrollY] = useState(0);
  const [formData, setFormData] = useState({ name: "", phone: "", note: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [stock, setStock] = useState(7);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSaved = useCallback((bk: string, val: string) => {
    setContent(prev => ({ ...prev, [bk]: val }));
  }, []);
  const handleDeleted = useCallback((bk: string) => {
    setContent(prev => { const n = { ...prev }; delete n[bk]; return n; });
  }, []);

  function E({ bk, def, as: Tag = "span", style, multiline }: { bk: string; def: string; as?: keyof JSX.IntrinsicElements; style?: React.CSSProperties; multiline?: boolean }) {
    const val = content[bk] ?? def;
    if (editMode) {
      return (
        <EditableText key={bk} blockKey={bk} defaultValue={def} currentValue={val} slug={LP_SLUG} multiline={multiline}
          onSaved={handleSaved} onDeleted={handleDeleted} as={Tag} style={style} />
      );
    }
    if (multiline) {
      return <Tag style={style}>{val.split("\n").map((line, i) => <React.Fragment key={i}>{line}{i < val.split("\n").length - 1 && <br />}</React.Fragment>)}</Tag>;
    }
    return <Tag style={style}>{val}</Tag>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone.trim()) return;
    setFormStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, source: "lp-sofa-giuong", slug: LP_SLUG }),
      });
      if (res.ok) {
        setFormStatus("success");
        setStock(s => Math.max(1, s - 1));
      } else setFormStatus("error");
    } catch { setFormStatus("error"); }
  };

  const navScrolled = scrollY > 60;

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: FONT_BODY, overflowX: "hidden" }}>
      {isEditor && <LpEditBar editMode={editMode} onToggle={() => setEditMode(e => !e)} />}

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, transition: "all 0.3s ease", background: navScrolled ? "rgba(10,10,8,0.95)" : "transparent", backdropFilter: navScrolled ? "blur(12px)" : "none", borderBottom: navScrolled ? `1px solid ${BLACK_BORDER}` : "none" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="https://smartfurni.com.vn" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={BLACK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9 22 9 12 15 12 15 22" stroke={BLACK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: FONT_BRAND, fontSize: 18, fontWeight: 600, color: WHITE, letterSpacing: "0.04em" }}>SMARTFURNI</span>
          </a>
          <div className="lp-nav-links" style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {[["#tinh-nang", "Tính năng"], ["#san-pham", "Sản phẩm"], ["#tu-chon", "Tuỳ chọn"], ["#danh-gia", "Đánh giá"], ["#dat-hang", "Đặt hàng"]].map(([href, label]) => (
              <a key={href} href={href} style={{ color: GRAY_LIGHT, fontSize: 13, fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em", fontFamily: FONT_BODY, transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = WHITE)} onMouseLeave={e => (e.currentTarget.style.color = GRAY_LIGHT)}>
                {label}
              </a>
            ))}
            <a href="#register-form" style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, color: BLACK, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", padding: "9px 20px", borderRadius: R_FULL, textDecoration: "none", fontFamily: FONT_BODY, textTransform: "uppercase" as const }}>
              Đặt hàng ngay
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column" as const, justifyContent: "center", padding: "120px 24px 80px", background: `radial-gradient(ellipse 80% 60% at 50% 20%, rgba(201,168,76,0.07) 0%, transparent 70%), ${BLACK}` }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>{E({ bk: "hero_section_label", def: "Ưu đãi đặc biệt tháng này", as: "span" })}</SectionLabel>
            <h1 style={{ fontSize: "clamp(32px, 5.5vw, 68px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 24, fontFamily: FONT_HEADING, letterSpacing: "-0.02em" }}>
              {E({ bk: "hero_title_1", def: "Sofa Giường SmartFurni", as: "span", style: { display: "block", color: GOLD } })}
              {E({ bk: "hero_title_2", def: "Ngủ Ngon — Sống Đẹp", as: "span", style: { display: "block", color: WHITE } })}
              {E({ bk: "hero_title_3", def: "Mỗi Ngày", as: "span", style: { display: "block", color: WHITE } })}
            </h1>
            <p style={{ fontSize: "clamp(15px, 1.8vw, 19px)", color: GRAY_LIGHT, lineHeight: 1.75, marginBottom: 40, maxWidth: 620, margin: "0 auto 40px", fontFamily: FONT_BODY }}>
              {E({ bk: "hero_subtitle", def: "Tuỳ chọn kiểu dáng, chất liệu theo sở thích. Khung thép mạ kẽm bền vững — từ 4.490.000 ₫. Giao hàng & lắp đặt miễn phí toàn quốc.", as: "span", multiline: true })}
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" as const }}>
              <a href="#tu-chon" style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, #9A7A2E 100%)`, color: BLACK, fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", padding: "16px 36px", borderRadius: R_FULL, textDecoration: "none", fontFamily: FONT_BODY, textTransform: "uppercase" as const, boxShadow: "0 8px 32px rgba(201,168,76,0.3)" }}>
                Tuỳ chọn ngay →
              </a>
              <a href="#san-pham" style={{ background: "transparent", color: WHITE, fontWeight: 500, fontSize: 14, padding: "16px 36px", borderRadius: R_FULL, textDecoration: "none", fontFamily: FONT_BODY, border: `1px solid rgba(245,240,232,0.2)` }}>
                Xem sản phẩm ↓
              </a>
            </div>
          </FadeIn>

          {/* Stats */}
          <FadeIn delay={200}>
            <div className="lp-stats-row" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" as const, marginTop: 64, borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 40 }}>
              {[
                { num: "2 dòng", label: "Tiêu chuẩn & Nâng cao" },
                { num: "5 năm", label: "Bảo hành khung" },
                { num: "100%", label: "Thép mạ kẽm" },
                { num: "Miễn phí", label: "Giao hàng & lắp đặt" },
              ].map((s, i) => (
                <div key={i} className="lp-stat-item" style={{ padding: "20px 32px", borderLeft: i > 0 ? `1px solid ${BLACK_BORDER}` : "none", textAlign: "center", minWidth: 110 }}>
                  <div style={{ fontSize: "clamp(20px, 2.5vw, 28px)", fontWeight: 700, color: GOLD, letterSpacing: "-0.02em", fontFamily: FONT_HEADING }}>{s.num}</div>
                  <div style={{ fontSize: 11, color: GRAY, marginTop: 5, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── VẤN ĐỀ / GIẢI PHÁP ── */}
      <section id="tinh-nang" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>{E({ bk: "problem_section_label", def: "Bạn đang tìm kiếm gì?", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "problem_title_1", def: "Sofa Giường Đẹp Nhưng Vẫn", as: "span", style: { display: "block" } })}
                {E({ bk: "problem_title_2", def: "Phải Tiện Nghi & Bền Lâu?", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <FadeIn delay={100}>
              <div style={{ background: BLACK_SOFT, padding: "36px 28px", borderTop: `3px solid rgba(255,107,107,0.4)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={RED_SOFT} strokeWidth="1.5"/><line x1="15" y1="9" x2="9" y2="15" stroke={RED_SOFT} strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke={RED_SOFT} strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 18, color: RED_SOFT, fontFamily: FONT_HEADING }}>
                  {E({ bk: "problem_col1_title", def: "Những lo ngại thường gặp", as: "span" })}
                </h3>
                {[
                  { bk: "problem_item_1", def: "Sofa giường rẻ tiền nhanh hỏng, xộc xệch sau 1-2 năm" },
                  { bk: "problem_item_2", def: "Chất liệu bọc kém, bong tróc, khó vệ sinh" },
                  { bk: "problem_item_3", def: "Nệm mỏng, cứng — ngủ không ngon, đau lưng" },
                  { bk: "problem_item_4", def: "Không có hộc chứa đồ — phòng ngủ lộn xộn" },
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
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={GOLD} strokeWidth="1.5"/><polyline points="9 12 11 14 15 10" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 18, color: GOLD, fontFamily: FONT_HEADING }}>
                  {E({ bk: "solution_col2_title", def: "Sofa Giường SmartFurni giải quyết", as: "span" })}
                </h3>
                {[
                  { bk: "solution_item_1", def: "Khung thép mạ kẽm — bền 10+ năm, không gỉ sét" },
                  { bk: "solution_item_2", def: "Da PU / vải bố cao cấp — lau chùi dễ, không bong tróc" },
                  { bk: "solution_item_3", def: "Nệm 7–10cm đàn hồi cao — ngủ ngon, hỗ trợ cột sống" },
                  { bk: "solution_item_4", def: "Hộc chứa đồ tiện lợi — tối ưu không gian phòng ngủ" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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

      {/* ── 2 DÒNG SẢN PHẨM ── */}
      <section id="san-pham" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "products_section_label", def: "Dòng sản phẩm", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "products_title_1", def: "2 Dòng Sofa Giường", as: "span", style: { display: "block" } })}
                {E({ bk: "products_title_2", def: "Phù Hợp Mọi Nhu Cầu", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {TIERS.map((tier, idx) => (
              <FadeIn key={tier.id} delay={idx * 150}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${idx === 1 ? GOLD : BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden", position: "relative" as const }}>
                  {tier.badge && (
                    <div style={{ position: "absolute" as const, top: 16, right: 16, background: GOLD, color: BLACK, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "4px 12px", borderRadius: R_FULL, textTransform: "uppercase" as const, zIndex: 1 }}>
                      {tier.badge}
                    </div>
                  )}
                  <div style={{ height: 200, background: `linear-gradient(135deg, rgba(201,168,76,0.05) 0%, rgba(201,168,76,0.12) 100%)`, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${BLACK_BORDER}` }}>
                    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
                      <rect x="10" y="40" width="100" height="30" rx="4" fill="rgba(201,168,76,0.15)" stroke={GOLD} strokeWidth="1"/>
                      <rect x="15" y="20" width="90" height="25" rx="8" fill="rgba(201,168,76,0.1)" stroke={GOLD} strokeWidth="1"/>
                      {idx === 1 && <rect x="5" y="35" width="12" height="35" rx="3" fill="rgba(201,168,76,0.2)" stroke={GOLD} strokeWidth="1"/>}
                      {idx === 1 && <rect x="103" y="35" width="12" height="35" rx="3" fill="rgba(201,168,76,0.2)" stroke={GOLD} strokeWidth="1"/>}
                      <rect x="18" y="68" width="16" height="8" rx="2" fill="rgba(201,168,76,0.3)"/>
                      <rect x="86" y="68" width="16" height="8" rx="2" fill="rgba(201,168,76,0.3)"/>
                      {idx === 1 && <rect x="20" y="50" width="80" height="8" rx="2" fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.2)" strokeWidth="0.5"/>}
                    </svg>
                  </div>
                  <div style={{ padding: "28px 24px" }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: WHITE, fontFamily: FONT_HEADING, marginBottom: 6 }}>{tier.name}</h3>
                    <p style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY, marginBottom: 20 }}>{tier.subtitle}</p>
                    <div style={{ marginBottom: 24 }}>
                      {tier.features.map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="7" cy="7" r="6" stroke={GOLD} strokeWidth="1"/><polyline points="4 7 6 9 10 5" stroke={GOLD} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span style={{ color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 20 }}>
                      <div style={{ color: GRAY, fontSize: 11, fontFamily: FONT_BODY, marginBottom: 4 }}>Giá từ</div>
                      <div style={{ color: GOLD, fontSize: 24, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 16 }}>{tier.priceRange}</div>
                      <a href="#tu-chon" style={{ display: "block", textAlign: "center", background: idx === 1 ? `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})` : "transparent", color: idx === 1 ? BLACK : GOLD, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", padding: "12px 20px", borderRadius: R_MD, textDecoration: "none", fontFamily: FONT_BODY, border: `1px solid ${GOLD}`, textTransform: "uppercase" as const }}>
                        Tuỳ chọn dòng này →
                      </a>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONFIGURATOR ── */}
      <section id="tu-chon" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Tuỳ chọn theo sở thích</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                <span style={{ display: "block" }}>Thiết Kế Sofa Giường</span>
                <span style={{ color: GOLD, display: "block" }}>Theo Ý Bạn</span>
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY_LIGHT, fontSize: 14, maxWidth: 480, margin: "0 auto", fontFamily: FONT_BODY }}>
                Chọn dòng sản phẩm và tuỳ chỉnh từng chi tiết — kiểu dáng, chất liệu, tính năng — để có chiếc sofa giường hoàn hảo nhất.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <Configurator />
          </FadeIn>
        </div>
      </section>

      {/* ── SO SÁNH 2 DÒNG ── */}
      <section style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>So sánh 2 dòng</SectionLabel>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                <span style={{ display: "block" }}>Tiêu Chuẩn vs Nâng Cao</span>
                <span style={{ color: GOLD, display: "block" }}>Dòng Nào Phù Hợp Với Bạn?</span>
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ overflowX: "auto" }}>
              <table className="lp-compare-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: FONT_BODY }}>
                <thead>
                  <tr>
                    <th style={{ padding: "14px 20px", textAlign: "left", color: GRAY, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: `1px solid ${BLACK_BORDER}` }}>Tiêu chí</th>
                    <th style={{ padding: "14px 20px", textAlign: "center", color: GRAY, fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${BLACK_BORDER}` }}>Tiêu Chuẩn</th>
                    <th style={{ padding: "14px 20px", textAlign: "center", color: GOLD, fontSize: 13, fontWeight: 700, background: "rgba(201,168,76,0.07)", borderBottom: `2px solid ${GOLD}`, borderRadius: "12px 12px 0 0" }}>
                      Nâng Cao ⭐
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { criteria: "Giá", std: "Dưới 5.000.000 ₫", prem: "6.000.000 – 8.000.000 ₫", highlight: true },
                    { criteria: "Khung", std: "Thép mạ kẽm", prem: "Thép mạ kẽm", highlight: false },
                    { criteria: "Tay vịn", std: "Không có", prem: "✓ Có tay vịn", highlight: false },
                    { criteria: "Độ dày nệm", std: "7cm", prem: "10cm êm ái hơn", highlight: true },
                    { criteria: "Chất liệu bọc", std: "Vải bố bền chắc", prem: "Da PU cao cấp", highlight: true },
                    { criteria: "Hộc để đồ", std: "Không có", prem: "✓ Có hộc tiện lợi", highlight: false },
                    { criteria: "Gỗ ốp", std: "Gỗ công nghiệp", prem: "Gỗ tự nhiên", highlight: false },
                    { criteria: "Bảo hành khung", std: "5 năm", prem: "5 năm", highlight: false },
                  ] as const).map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                      <td style={{ padding: "14px 20px", color: GRAY_LIGHT, fontSize: 13, borderBottom: `1px solid rgba(201,168,76,0.06)` }}>{row.criteria}</td>
                      <td style={{ padding: "14px 20px", textAlign: "center", color: GRAY, fontSize: 13, borderBottom: `1px solid rgba(201,168,76,0.06)` }}>{row.std}</td>
                      <td style={{ padding: "14px 20px", textAlign: "center", color: row.highlight ? GOLD : WHITE, fontSize: 13, fontWeight: row.highlight ? 700 : 500, background: "rgba(201,168,76,0.04)", borderBottom: `1px solid rgba(201,168,76,0.06)`, borderLeft: `1px solid rgba(201,168,76,0.1)`, borderRight: `1px solid rgba(201,168,76,0.1)` }}>{row.prem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── ĐẶC ĐIỂM NỔI BẬT ── */}
      <section style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>Lý do chọn SmartFurni</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                <span style={{ display: "block" }}>Chất Lượng Vượt Trội</span>
                <span style={{ color: GOLD, display: "block" }}>Giá Trị Xứng Đáng</span>
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12l10 5 10-5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Khung Thép Mạ Kẽm", desc: "Chống gỉ sét, chịu tải 300kg, bền vững theo thời gian" },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Êm Ái Tuyệt Vời", desc: "Nệm đàn hồi cao 7–10cm, hỗ trợ cột sống, ngủ ngon sâu giấc" },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={GOLD} strokeWidth="1.5"/><path d="M3 9h18M9 21V9" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"/></svg>, title: "Hộc Chứa Đồ Thông Minh", desc: "Tối ưu không gian phòng ngủ, chứa chăn gối gọn gàng" },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={GOLD} strokeWidth="1.5"/><polyline points="12 6 12 12 16 14" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Lắp Đặt Nhanh Chóng", desc: "Đội ngũ chuyên nghiệp lắp đặt tận nhà, hoàn thành trong 30 phút" },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Bảo Hành 5 Năm", desc: "Bảo hành toàn bộ khung và cơ cấu, hỗ trợ kỹ thuật 24/7" },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3" stroke={GOLD} strokeWidth="1.5"/></svg>, title: "Giao Hàng Toàn Quốc", desc: "Miễn phí giao hàng và lắp đặt tại nhà trên toàn quốc" },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "28px 24px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.15)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: WHITE, fontFamily: FONT_HEADING, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: GRAY_LIGHT, fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── THÔNG SỐ KỸ THUẬT ── */}
      <section style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Thông số kỹ thuật</SectionLabel>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                <span style={{ display: "block" }}>Thông Số Kỹ Thuật</span>
                <span style={{ color: GOLD, display: "block" }}>Sofa Giường SmartFurni</span>
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {[
                { label: "Kích thước", value: "1.2m / 1.4m / 1.6m / 1.8m × 2.0m" },
                { label: "Vật liệu khung", value: "Thép mạ kẽm chịu lực cao" },
                { label: "Tải trọng tối đa", value: "300kg" },
                { label: "Độ dày nệm", value: "7cm (Tiêu chuẩn) / 10cm (Nâng cao)" },
                { label: "Chất liệu bọc", value: "Vải bố (Tiêu chuẩn) / Da PU (Nâng cao)" },
                { label: "Gỗ ốp", value: "Gỗ công nghiệp (Tiêu chuẩn) / Gỗ tự nhiên (Nâng cao)" },
                { label: "Tay vịn", value: "Không (Tiêu chuẩn) / Có (Nâng cao)" },
                { label: "Hộc để đồ", value: "Không (Tiêu chuẩn) / Có (Nâng cao)" },
                { label: "Bảo hành khung", value: "5 năm" },
                { label: "Màu sắc", value: "Xám tro / Kem / Nâu đất / Đen" },
                { label: "Thời gian lắp đặt", value: "30 phút (đội kỹ thuật SmartFurni)" },
                { label: "Giao hàng", value: "Miễn phí toàn quốc" },
              ].map((spec, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px 18px", background: i % 2 === 0 ? BLACK_CARD : "transparent", borderRadius: R_SM, border: `1px solid ${BLACK_BORDER}`, gap: 16 }}>
                  <span style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY, flexShrink: 0 }}>{spec.label}</span>
                  <span style={{ color: WHITE, fontSize: 13, fontFamily: FONT_BODY, textAlign: "right" as const, fontWeight: 500 }}>{spec.value}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CAM KẾT ── */}
      <section style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Mua hàng an tâm</SectionLabel>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                <span style={{ display: "block" }}>Cam Kết Của</span>
                <span style={{ color: GOLD, display: "block" }}>SmartFurni</span>
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { title: "Bảo hành 5 năm", desc: "Toàn bộ khung và cơ cấu, không điều kiện" },
              { title: "Đổi trả 30 ngày", desc: "Không hài lòng, đổi trả miễn phí trong 30 ngày" },
              { title: "Lắp đặt miễn phí", desc: "Đội kỹ thuật chuyên nghiệp lắp tận nhà" },
              { title: "Giao hàng toàn quốc", desc: "Miễn phí vận chuyển, giao trong 3–5 ngày" },
            ].map((g, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "24px 20px", textAlign: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <h4 style={{ color: GOLD, fontSize: 14, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 8 }}>{g.title}</h4>
                  <p style={{ color: GRAY_LIGHT, fontSize: 12, lineHeight: 1.65, fontFamily: FONT_BODY, margin: 0 }}>{g.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Câu hỏi thường gặp</SectionLabel>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                <span style={{ display: "block" }}>Giải Đáp</span>
                <span style={{ color: GOLD, display: "block" }}>Thắc Mắc Của Bạn</span>
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
            {[
              { q: "Sofa giường SmartFurni có bền không?", a: "Khung thép mạ kẽm chịu lực cao, tải trọng tối đa 300kg. Bảo hành toàn bộ khung 5 năm. Chúng tôi tự tin về độ bền sản phẩm." },
              { q: "Tôi nên chọn dòng Tiêu Chuẩn hay Nâng Cao?", a: "Dòng Tiêu Chuẩn phù hợp nếu bạn cần sofa giường gọn gàng, tiết kiệm chi phí. Dòng Nâng Cao phù hợp nếu bạn muốn đầy đủ tiện nghi: tay vịn, nệm dày, da PU và hộc để đồ." },
              { q: "Có thể tuỳ chọn màu sắc không?", a: "Có, SmartFurni cung cấp nhiều màu sắc: Xám tro, Kem, Nâu đất, Đen. Liên hệ tư vấn để chọn màu phù hợp với nội thất phòng ngủ của bạn." },
              { q: "Thời gian giao hàng và lắp đặt là bao lâu?", a: "Giao hàng trong 3–5 ngày làm việc. Đội kỹ thuật SmartFurni lắp đặt tận nhà, hoàn thành trong 30 phút. Miễn phí hoàn toàn." },
              { q: "Chính sách đổi trả như thế nào?", a: "Đổi trả miễn phí trong 30 ngày nếu không hài lòng. Chúng tôi thu hồi sản phẩm và hoàn tiền 100% không điều kiện." },
            ].map((faq, i) => (
              <FadeIn key={i} delay={i * 60}>
                <details style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden" }}>
                  <summary style={{ padding: "18px 24px", color: WHITE, fontSize: 15, fontWeight: 600, fontFamily: FONT_HEADING, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {faq.q}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginLeft: 12 }}><polyline points="6 9 12 15 18 9" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </summary>
                  <div style={{ padding: "0 24px 18px", color: GRAY_LIGHT, fontSize: 14, lineHeight: 1.75, fontFamily: FONT_BODY }}>{faq.a}</div>
                </details>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORM ĐẶT HÀNG ── */}
      <section id="dat-hang" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <SectionLabel>Đặt hàng ngay</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                <span style={{ display: "block" }}>Nhận Tư Vấn</span>
                <span style={{ color: GOLD, display: "block" }}>Miễn Phí Ngay Hôm Nay</span>
              </h2>
              <GoldDivider />
              <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: R_MD, padding: "12px 20px", marginBottom: 32, display: "inline-block" }}>
                <span style={{ color: GOLD, fontSize: 13, fontFamily: FONT_BODY }}>
                  ⏰ Ưu đãi kết thúc sau: <CountdownDisplay targetHours={4} />
                </span>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div id="register-form" style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "36px 32px" }}>
              {formStatus === "success" ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <h3 style={{ color: WHITE, fontSize: 20, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 8 }}>Đặt hàng thành công!</h3>
                  <p style={{ color: GRAY_LIGHT, fontSize: 14, fontFamily: FONT_BODY }}>Chúng tôi sẽ liên hệ với bạn trong vòng 30 phút.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
                  <div>
                    <label style={{ display: "block", color: GRAY, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 8 }}>Họ và tên</label>
                    <input type="text" placeholder="Nguyễn Văn A" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      style={{ width: "100%", background: BLACK, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_SM, padding: "12px 16px", color: WHITE, fontSize: 14, fontFamily: FONT_BODY, outline: "none", boxSizing: "border-box" as const }} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 8 }}>Số điện thoại *</label>
                    <input type="tel" placeholder="0912 345 678" required value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      style={{ width: "100%", background: BLACK, border: `1.5px solid ${GOLD}`, borderRadius: R_SM, padding: "12px 16px", color: WHITE, fontSize: 14, fontFamily: FONT_BODY, outline: "none", boxSizing: "border-box" as const }} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: GRAY, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 8 }}>Ghi chú (tuỳ chọn)</label>
                    <textarea placeholder="Dòng sản phẩm quan tâm, kích thước cần, màu sắc..." value={formData.note} onChange={e => setFormData(p => ({ ...p, note: e.target.value }))} rows={3}
                      style={{ width: "100%", background: BLACK, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_SM, padding: "12px 16px", color: WHITE, fontSize: 14, fontFamily: FONT_BODY, outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const }} />
                  </div>
                  <button type="submit" disabled={formStatus === "loading"}
                    style={{ background: formStatus === "loading" ? GRAY : `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, #9A7A2E 100%)`, color: BLACK, fontWeight: 700, fontSize: 14, letterSpacing: "0.08em", padding: "16px 24px", borderRadius: R_MD, border: "none", cursor: formStatus === "loading" ? "not-allowed" : "pointer", fontFamily: FONT_BODY, textTransform: "uppercase" as const, boxShadow: "0 6px 24px rgba(201,168,76,0.25)", transition: "all 0.2s" }}>
                    {formStatus === "loading" ? "Đang gửi..." : "Nhận tư vấn miễn phí →"}
                  </button>
                  {formStatus === "error" && (
                    <p style={{ color: RED_SOFT, fontSize: 13, textAlign: "center", fontFamily: FONT_BODY }}>Có lỗi xảy ra. Vui lòng thử lại hoặc gọi hotline.</p>
                  )}
                  <p style={{ color: GRAY, fontSize: 11, textAlign: "center", fontFamily: FONT_BODY, margin: 0 }}>
                    🔒 Thông tin của bạn được bảo mật tuyệt đối
                  </p>
                </form>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#060604", padding: "60px 24px 0", borderTop: `1px solid ${BLACK_BORDER}` }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ fontFamily: FONT_BRAND, fontSize: 16, fontWeight: 600, color: WHITE, letterSpacing: "0.04em" }}>SMARTFURNI</span>
              </div>
              <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.75, fontFamily: FONT_BODY }}>Nội thất thông minh — Nâng tầm cuộc sống. Sofa giường cao cấp, thiết kế tinh tế, bền vững theo thời gian.</p>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2 }} />
                <h4 style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>Liên hệ</h4>
              </div>
              {[
                { icon: "📞", label: "Hotline", val: "028.7122.0818", href: "tel:02871220818" },
                { icon: "💬", label: "Zalo tư vấn", val: "0918.326.552", href: "https://zalo.me/0918326552" },
                { icon: "✉️", label: "Email", val: "info@smartfurni.vn", href: "mailto:info@smartfurni.vn" },
              ].map((c, i) => (
                <a key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start", textDecoration: "none" }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
                  <div>
                    <div style={{ color: GRAY, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 1 }}>{c.label}</div>
                    <div style={{ color: GOLD_LIGHT, fontSize: 13, fontFamily: FONT_BODY, fontWeight: 700 }}>{c.val}</div>
                  </div>
                </a>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2 }} />
                <h4 style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>Đặt hàng ngay</h4>
              </div>
              <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.75, fontFamily: FONT_BODY, marginBottom: 20 }}>Nhận tư vấn miễn phí & xác nhận đơn hàng trong vòng 2 giờ làm việc.</p>
              <a href="#register-form"
                style={{ display: "block", textAlign: "center", background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, #9A7A2E 100%)`, color: BLACK, fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "13px 20px", borderRadius: R_MD, textDecoration: "none", fontFamily: FONT_BODY, boxShadow: "0 6px 24px rgba(201,168,76,0.25)", marginBottom: 12 }}>
                Đặt hàng ngay →
              </a>
              <a href="https://zalo.me/0918326552" target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", background: "transparent", color: GRAY_LIGHT, fontWeight: 500, fontSize: 11, letterSpacing: "0.06em", padding: "12px 20px", borderRadius: R_MD, textDecoration: "none", fontFamily: FONT_BODY, border: `1px solid rgba(212,196,160,0.2)` }}>
                💬 Chat Zalo ngay
              </a>
            </div>
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${BLACK_BORDER} 20%, ${BLACK_BORDER} 80%, transparent)`, marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12, paddingBottom: 28 }}>
            <p style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT_BODY, margin: 0 }}>© 2025 Công ty Cổ phần SmartFurni. Tất cả quyền được bảo lưu.</p>
            <div style={{ display: "flex", gap: 20 }}>
              {[{ label: "Chính sách bảo mật", href: "/privacy" }, { label: "Điều khoản sử dụng", href: "/terms" }, { label: "Chính sách bảo hành", href: "/bao-hanh" }].map(l => (
                <a key={l.label} href={l.href} style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT_BODY, textDecoration: "none" }}>{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── STICKY CTA ── */}
      <div className="lp-sticky-cta" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90, background: "rgba(10,10,8,0.96)", backdropFilter: "blur(12px)", borderTop: `1px solid ${BLACK_BORDER}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const, transform: scrollY > 300 ? "translateY(0)" : "translateY(100%)", transition: "transform 0.3s ease" }}>
        <div>
          <div style={{ color: WHITE, fontSize: 14, fontWeight: 700, fontFamily: FONT_HEADING }}>Sofa Giường SmartFurni</div>
          <div style={{ color: GOLD, fontSize: 16, fontWeight: 700, fontFamily: FONT_HEADING }}>Từ 4.490.000 ₫ — Miễn phí giao + lắp đặt</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="https://zalo.me/0918326552" target="_blank" rel="noopener noreferrer"
            style={{ background: "transparent", color: WHITE, fontWeight: 600, fontSize: 12, padding: "10px 18px", borderRadius: R_FULL, textDecoration: "none", fontFamily: FONT_BODY, border: `1px solid rgba(245,240,232,0.2)`, letterSpacing: "0.04em" }}>
            💬 Zalo
          </a>
          <a href="#register-form"
            style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, color: BLACK, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", padding: "10px 22px", borderRadius: R_FULL, textDecoration: "none", fontFamily: FONT_BODY, textTransform: "uppercase" as const }}>
            Đặt hàng ngay
          </a>
        </div>
      </div>
    </div>
  );
}
