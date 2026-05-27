"use client";
import "./lp-retail.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { EditableText } from "@/components/lp/EditableText";
import { LpEditBar } from "@/components/lp/LpEditBar";
import { EditableHeroImage } from "@/components/lp/EditableHeroImage";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const GOLD        = "#B8922A";
const GOLD_LIGHT  = "#D4A84B";
const BLACK       = "#FDFAF5";
const BLACK_SOFT  = "#F4F7FA";
const BLACK_CARD  = "#F0EBE0";
const BLACK_BORDER= "rgba(184,146,42,0.18)";
const WHITE       = "#1A1200";
const GRAY        = "#4A3F2F";
const GRAY_LIGHT  = "#6B5A40";
const RED_SOFT    = "#C0392B";

const LP_SLUG = "smf12";
const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BODY    = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BRAND   = "'Cormorant Garamond', Georgia, serif";
const R_SM   = 8;
const R_MD   = 12;
const R_LG   = 16;
const R_FULL = 999;

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}
function gRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Sizes & Pricing ───────────────────────────────────────────────────────────
const SIZES = [
  { key: "0m9x2m", label: "0,9M × 2M", price: 8_900_000, desc: "Phù hợp phòng nhỏ, 1 người" },
  { key: "1m2x2m", label: "1,2M × 2M", price: 10_900_000, desc: "Phổ biến nhất, 1–2 người" },
  { key: "1m4x2m", label: "1,4M × 2M", price: 12_500_000, desc: "Rộng rãi, 2 người thoải mái" },
  { key: "1m6x2m", label: "1,6M × 2M", price: 14_200_000, desc: "Cao cấp, không gian rộng" },
  { key: "1m8x2m", label: "1,8M × 2M", price: 16_800_000, desc: "Luxury, phòng ngủ lớn" },
];

const FEATURES = [
  {
    icon: "🛡️",
    title: "Da PU Nhập Khẩu Cao Cấp",
    desc: "Da PU dày 1.2mm, chịu nhiệt, chống thấm, dễ lau chùi. Màu sắc bền đẹp sau nhiều năm sử dụng.",
  },
  {
    icon: "⚙️",
    title: "Cơ Cấu Gập Mở 50.000 Lần",
    desc: "Gas-lift nhập khẩu, kiểm định 50.000 lần mở gập. Trơn tru, êm ái, không tiếng động.",
  },
  {
    icon: "🏗️",
    title: "Khung Thép Mạ Kẽm 1.5mm",
    desc: "Khung thép chịu tải 300kg, mạ kẽm chống gỉ. Độ bền vượt trội so với khung gỗ thông thường.",
  },
  {
    icon: "📐",
    title: "5 Kích Thước Tùy Chọn",
    desc: "Từ 0,9M đến 1,8M, phù hợp mọi không gian phòng ngủ. Tư vấn miễn phí để chọn size đúng nhất.",
  },
  {
    icon: "🚚",
    title: "Giao Hàng & Lắp Đặt Miễn Phí",
    desc: "Giao tận nơi toàn quốc, đội thợ lắp đặt chuyên nghiệp. Không phát sinh chi phí ẩn.",
  },
  {
    icon: "✅",
    title: "Bảo Hành 3 Năm Toàn Diện",
    desc: "Bảo hành khung, cơ cấu và chất liệu da PU trong 3 năm. Đổi mới nếu có lỗi nhà sản xuất.",
  },
];

const SPECS = [
  { label: "Mã sản phẩm", value: "SMF12" },
  { label: "Chất liệu bọc", value: "Da PU nhập khẩu dày 1.2mm, kháng nước" },
  { label: "Khung", value: "Thép mạ kẽm 1.5mm, chịu tải 300kg" },
  { label: "Cơ cấu mở gập", value: "Gas-lift nhập khẩu, kiểm định 50.000 lần" },
  { label: "Kích thước", value: "0,9M / 1,2M / 1,4M / 1,6M / 1,8M × 2M" },
  { label: "Nệm ngồi", value: "Mút ép đàn hồi cao 7cm, D40" },
  { label: "Tay vịn", value: "Da PU bọc đệm, bo góc an toàn" },
  { label: "Chân đỡ", value: "Inox 304 hoặc chân gỗ tự nhiên (tuỳ chọn)" },
  { label: "Màu sắc", value: "Đen, Nâu, Kem, Xám (theo yêu cầu)" },
  { label: "Bảo hành", value: "3 năm toàn diện (khung + cơ cấu + da PU)" },
  { label: "Xuất xứ", value: "Sản xuất tại Việt Nam, linh kiện nhập khẩu" },
];

const TESTIMONIALS = [
  {
    name: "Chị Lan Anh",
    location: "Hà Nội",
    rating: 5,
    text: "Sofa SMF12 đẹp hơn tôi tưởng rất nhiều! Da PU mịn, màu nâu sang trọng, phòng ngủ nhà mình trông xịn hẳn lên. Lắp đặt nhanh, nhân viên nhiệt tình.",
  },
  {
    name: "Anh Minh Tuấn",
    location: "TP.HCM",
    rating: 5,
    text: "Mua size 1,4M cho phòng ngủ 15m². Cơ cấu gập mở rất êm, không tiếng kẽo kẹt. Dùng 6 tháng vẫn như mới. Giá tốt so với chất lượng.",
  },
  {
    name: "Chị Thu Hương",
    location: "Đà Nẵng",
    rating: 5,
    text: "Nhân viên tư vấn rất tận tâm, giúp mình chọn đúng size và màu. Giao hàng đúng hẹn, đóng gói cẩn thận. Sẽ giới thiệu cho bạn bè.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Sofa giường SMF12 có bền không?",
    a: "SMF12 sử dụng khung thép mạ kẽm 1.5mm chịu tải 300kg và cơ cấu gas-lift kiểm định 50.000 lần mở gập. Bảo hành 3 năm toàn diện, đổi mới nếu có lỗi nhà sản xuất.",
  },
  {
    q: "Da PU có bị bong tróc sau vài năm không?",
    a: "Da PU SMF12 dày 1.2mm, nhập khẩu chất lượng cao, kháng nước và chịu nhiệt tốt. Với điều kiện sử dụng bình thường, da PU bền đẹp 5–7 năm. Tránh tiếp xúc trực tiếp với vật sắc nhọn.",
  },
  {
    q: "Tôi có thể đặt màu sắc theo yêu cầu không?",
    a: "Có! SMF12 có sẵn 4 màu tiêu chuẩn (Đen, Nâu, Kem, Xám). Ngoài ra bạn có thể đặt màu theo yêu cầu với thời gian sản xuất thêm 5–7 ngày.",
  },
  {
    q: "Thời gian giao hàng bao lâu?",
    a: "Hà Nội và TP.HCM: 3–5 ngày làm việc. Các tỉnh thành khác: 5–10 ngày. Đội thợ lắp đặt chuyên nghiệp, hoàn thành trong 30–60 phút.",
  },
  {
    q: "Có hỗ trợ trả góp không?",
    a: "Có! Hỗ trợ trả góp 0% lãi suất qua các đối tác tài chính (Home Credit, FE Credit, thẻ tín dụng). Liên hệ tư vấn để biết thêm chi tiết.",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "20px auto 0", width: "fit-content" }}>
      <div style={{ width: 40, height: 1, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />
      <div style={{ width: 40, height: 1, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: gRgba(GOLD, 0.1), border: `1px solid ${gRgba(GOLD, 0.3)}`, borderRadius: R_FULL, padding: "5px 14px", marginBottom: 16 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />
      <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>{children}</span>
    </div>
  );
}

function GoldButton({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: hovered
          ? `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`
          : `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
        color: "#FFFFFF",
        fontWeight: 700, fontSize: 15, fontFamily: FONT_HEADING,
        padding: "15px 36px", borderRadius: R_FULL, border: "none",
        cursor: "pointer",
        boxShadow: hovered ? `0 8px 32px ${gRgba(GOLD, 0.45)}` : `0 4px 20px ${gRgba(GOLD, 0.3)}`,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SvgIcon({ name, size = 24, color = WHITE }: { name: string; size?: number; color?: string }) {
  const icons: Record<string, React.ReactNode> = {
    check: <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    phone: <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />,
    truck: <><rect x="1" y="3" width="15" height="13" rx="1" stroke={color} strokeWidth="1.5" /><path d="M16 8h4l3 5v4h-7V8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" /><circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.5" /><circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.5" /></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />,
    gift: <><polyline points="20 12 20 22 4 22 4 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="2" y="7" width="20" height="5" rx="1" stroke={color} strokeWidth="1.5" /><line x1="12" y1="22" x2="12" y2="7" stroke={color} strokeWidth="1.5" /><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" stroke={color} strokeWidth="1.5" /><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke={color} strokeWidth="1.5" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {icons[name] || <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />}
    </svg>
  );
}

// ─── Lead Form ─────────────────────────────────────────────────────────────────
function LeadForm({ selectedSize, selectedSizeLabel, selectedPrice, content }: {
  selectedSize?: string;
  selectedSizeLabel?: string;
  selectedPrice?: number;
  content: Record<string, string>;
}) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 16px",
    background: "#FFFFFF",
    border: `1px solid ${gRgba(GOLD, 0.25)}`,
    borderRadius: R_MD, color: WHITE,
    fontSize: 14, fontFamily: FONT_BODY,
    outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  async function handleSubmit(e: React.MouseEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Vui lòng nhập họ tên."); return; }
    if (!form.phone.trim() || !/^[0-9]{9,11}$/.test(form.phone.replace(/\s/g, ""))) {
      setError("Vui lòng nhập số điện thoại hợp lệ."); return;
    }
    setError(""); setLoading(true);
    try {
      const configNote = selectedSizeLabel
        ? `Sofa SMF12 | Size: ${selectedSizeLabel}${selectedPrice ? ` | Giá: ${fmt(selectedPrice)}` : ""}`
        : "Sofa SMF12 — Tư vấn chọn size";
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          note: [configNote, form.note.trim()].filter(Boolean).join(" | "),
          source: "lp_smf12",
          landingPageSlug: LP_SLUG,
          productInterest: "SMF12",
        }),
      });
      if (!res.ok) throw new Error("Lỗi gửi form");
      setSuccess(true);
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ Zalo.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h3 style={{ color: GOLD, fontSize: 22, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 12 }}>Đã Nhận Yêu Cầu!</h3>
        <p style={{ color: GRAY, fontSize: 15, fontFamily: FONT_BODY, lineHeight: 1.7 }}>
          Cảm ơn bạn đã tin tưởng SmartFurni.<br />
          Nhân viên tư vấn sẽ liên hệ qua <strong style={{ color: GOLD }}>Zalo / điện thoại</strong> trong vòng 2 giờ làm việc.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${gRgba(GOLD, 0.2)}`, padding: "clamp(24px,4vw,44px)", borderRadius: R_LG, boxShadow: `0 4px 32px ${gRgba(GOLD, 0.08)}` }}>
      {selectedSizeLabel && (
        <div style={{ marginBottom: 20, padding: "12px 16px", background: gRgba(GOLD, 0.07), border: `1px solid ${gRgba(GOLD, 0.25)}`, borderRadius: R_MD }}>
          <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", fontFamily: FONT_BODY, marginBottom: 4 }}>✓ SIZE ĐÃ CHỌN:</div>
          <div style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY }}>
            Sofa SMF12 — {selectedSizeLabel}
            {selectedPrice && <span style={{ color: GOLD, fontWeight: 700, marginLeft: 8 }}>{fmt(selectedPrice)}</span>}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
        {[
          { k: "name", label: "Họ và tên *", ph: "Nguyễn Văn A" },
          { k: "phone", label: "Số điện thoại (Zalo) *", ph: "0912 345 678" },
        ].map(f => (
          <div key={f.k}>
            <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>{f.label}</label>
            <input type="text" placeholder={f.ph} value={form[f.k as keyof typeof form]} onChange={setF(f.k)} style={inp}
              onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px ${gRgba(GOLD, 0.12)}`; }}
              onBlur={e => { e.target.style.borderColor = gRgba(GOLD, 0.25); e.target.style.boxShadow = "none"; }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Địa chỉ giao hàng</label>
        <input type="text" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố" value={form.address} onChange={setF("address")} style={inp}
          onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px ${gRgba(GOLD, 0.12)}`; }}
          onBlur={e => { e.target.style.borderColor = gRgba(GOLD, 0.25); e.target.style.boxShadow = "none"; }} />
      </div>
      <div style={{ marginBottom: 26 }}>
        <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Yêu cầu thêm (tuỳ chọn)</label>
        <textarea placeholder="Màu sắc, yêu cầu đặc biệt, thời gian giao hàng…" rows={3} value={form.note} onChange={setF("note")} style={{ ...inp, resize: "vertical" as const }}
          onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px ${gRgba(GOLD, 0.12)}`; }}
          onBlur={e => { e.target.style.borderColor = gRgba(GOLD, 0.25); e.target.style.boxShadow = "none"; }} />
      </div>
      {error && (
        <div style={{ color: RED_SOFT, fontSize: 13, marginBottom: 16, padding: "12px 16px", background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: R_SM, fontFamily: FONT_BODY }}>
          {error}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%", padding: "17px",
          background: loading ? "#C8BCA8" : `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
          color: "#FFFFFF", border: "none", fontWeight: 700, fontSize: 14,
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: "0.08em", textTransform: "uppercase" as const,
          boxShadow: loading ? "none" : `0 8px 28px ${gRgba(GOLD, 0.3)}`,
          borderRadius: R_MD, fontFamily: FONT_BODY, transition: "all 0.25s ease",
        }}
      >
        {loading ? "Đang gửi…" : "Nhận Tư Vấn & Báo Giá Miễn Phí →"}
      </button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
        <SvgIcon name="shield" size={13} color={GRAY_LIGHT} />
        <p style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY, margin: 0 }}>Thông tin được bảo mật tuyệt đối. Không spam.</p>
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  isEditor?: boolean;
  initialContent?: Record<string, string>;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LpSmf12Client({ isEditor = false, initialContent = {} }: Props) {
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [editMode, setEditMode] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroImgIdx, setHeroImgIdx] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hero image slideshow
  const heroImages = [0, 1, 2].map(i => content[`hero_bg_${i}`]).filter(Boolean);
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => setHeroImgIdx(i => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  const heroOverlayOpacity = parseFloat(content["hero_overlay"] || "0.45");

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  }

  // EditableText helper
  function E({ bk, def, as: Tag = "span", style }: { bk: string; def: string; as?: React.ElementType; style?: React.CSSProperties }) {
    if (!editMode) {
      const val = content[bk] ?? def;
      return <Tag style={style} dangerouslySetInnerHTML={{ __html: val }} />;
    }
    return (
      <EditableText
        slug={LP_SLUG}
        blockKey={bk}
        defaultValue={def}
        editMode={editMode}
        as={Tag as "span"}
        style={style}
        savedValue={content[bk]}
        onSaved={(key, val) => setContent(c => ({ ...c, [key]: val }))}
        onDeleted={key => setContent(c => { const n = { ...c }; delete n[key]; return n; })}
      />
    );
  }

  const selectedSizeObj = SIZES.find(s => s.key === selectedSize);
  const SECTION_PAD = "clamp(60px,8vw,100px) clamp(20px,5vw,80px)";
  const NAV_ITEMS = [
    { id: "product", label: "Sản Phẩm" },
    { id: "features", label: "Điểm Mạnh" },
    { id: "specs", label: "Thông Số" },
    { id: "reviews", label: "Đánh Giá" },
    { id: "order-form", label: "Đặt Hàng" },
  ];

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: FONT_BODY, overflowX: "hidden" }}>
      {/* ── EDIT BAR ── */}
      <LpEditBar
        isEditor={isEditor}
        editMode={editMode}
        onToggleEditMode={() => setEditMode(m => !m)}
        editedCount={Object.keys(content).filter(k => !k.startsWith("hero_")).length}
        slug={LP_SLUG}
      />

      {/* ── STICKY NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 60 ? "rgba(253,250,245,0.97)" : "transparent",
        borderBottom: scrollY > 60 ? `1px solid ${gRgba(GOLD, 0.2)}` : "none",
        backdropFilter: scrollY > 60 ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrollY > 60 ? "blur(16px)" : "none",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <a href="/" style={{ flexShrink: 0, textDecoration: "none" }}>
            <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 44, objectFit: "contain" }} />
          </a>
          <div className="lp-nav-menu" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: GRAY, fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY, padding: "8px 14px", borderRadius: R_SM, letterSpacing: "0.01em", transition: "color 0.2s, background 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = GOLD; (e.currentTarget as HTMLElement).style.background = gRgba(GOLD, 0.07); }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = GRAY; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={scrollToForm}
              className="lp-nav-cta"
              style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`, color: "#FFFFFF", border: "none", borderRadius: R_FULL, padding: "10px 22px", fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY, cursor: "pointer", whiteSpace: "nowrap" as const, boxShadow: `0 2px 12px ${gRgba(GOLD, 0.3)}` }}>
              Đặt Hàng Ngay
            </button>
            <button className="lp-hamburger" onClick={() => setMobileMenuOpen(m => !m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "none" }}>
              <div style={{ width: 22, height: 2, background: GRAY, marginBottom: 5, transition: "transform 0.2s", transform: mobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
              <div style={{ width: 22, height: 2, background: GRAY, marginBottom: 5, opacity: mobileMenuOpen ? 0 : 1, transition: "opacity 0.2s" }} />
              <div style={{ width: 22, height: 2, background: GRAY, transition: "transform 0.2s", transform: mobileMenuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ background: "rgba(253,250,245,0.98)", backdropFilter: "blur(16px)", borderTop: `1px solid ${gRgba(GOLD, 0.15)}`, padding: "16px 24px 24px" }}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)} style={{ display: "block", width: "100%", textAlign: "left" as const, background: "none", border: "none", cursor: "pointer", color: GRAY, fontSize: 15, fontFamily: FONT_BODY, padding: "12px 0", borderBottom: `1px solid ${gRgba(GOLD, 0.1)}` }}>
                {item.label}
              </button>
            ))}
            <button onClick={scrollToForm} style={{ marginTop: 16, width: "100%", background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`, color: "#FFFFFF", border: "none", borderRadius: R_MD, padding: "14px", fontSize: 14, fontWeight: 700, fontFamily: FONT_BODY, cursor: "pointer" }}>
              Đặt Hàng Ngay
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: 68, overflow: "hidden" }}>
        {heroImages.length > 0 ? (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            {heroImages.map((img, i) => (
              <div key={i} style={{ position: "absolute", inset: 0, backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", opacity: i === heroImgIdx ? 1 : 0, transition: "opacity 1.2s ease" }} />
            ))}
            <div style={{ position: "absolute", inset: 0, background: `rgba(10,8,2,${heroOverlayOpacity})` }} />
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, #2C1F0E 0%, #1A1200 100%)` }} />
        )}
        <EditableHeroImage
          slug={LP_SLUG}
          imageKeys={["hero_bg_0", "hero_bg_1", "hero_bg_2"]}
          overlayKey="hero_overlay"
          imageUrls={[content["hero_bg_0"] || "", content["hero_bg_1"] || "", content["hero_bg_2"] || ""]}
          overlayOpacity={heroOverlayOpacity}
          editMode={isEditor}
          onImageSaved={(key, url) => setContent(c => ({ ...c, [key]: url }))}
          onOverlaySaved={(key, opacity) => setContent(c => ({ ...c, [key]: String(opacity) }))}
        />
        {heroImages.length > 1 && (
          <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setHeroImgIdx(i)} style={{ width: i === heroImgIdx ? 24 : 8, height: 8, borderRadius: 4, background: i === heroImgIdx ? GOLD : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s" }} />
            ))}
          </div>
        )}
        <div style={{ position: "relative", zIndex: 5, maxWidth: 1200, margin: "0 auto", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,80px)", width: "100%" }}>
          <FadeIn>
            <SectionLabel>Sofa Giường Da PU Cao Cấp</SectionLabel>
            <h1 style={{ fontSize: "clamp(32px,5.5vw,68px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 20, fontFamily: FONT_HEADING, letterSpacing: "-0.02em", maxWidth: 700, color: "#FFFFFF" }}>
              {E({ bk: "hero_title", def: "Sofa Giường Da PU SMF12 — Sang Trọng Từng Đường Nét", as: "span" })}
            </h1>
            <p style={{ fontSize: "clamp(15px,1.8vw,18px)", color: "rgba(255,255,255,0.85)", lineHeight: 1.75, marginBottom: 36, maxWidth: 560, fontFamily: FONT_BODY }}>
              {E({ bk: "hero_desc", def: "Khung thép mạ kẽm, da PU nhập khẩu dày 1.2mm, cơ cấu gập mở 50.000 lần. Bảo hành 3 năm — giao hàng & lắp đặt miễn phí toàn quốc.", as: "span" })}
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const, marginBottom: 40 }}>
              <GoldButton onClick={scrollToForm} style={{ fontSize: 15, padding: "16px 36px" }}>
                Đặt Hàng Ngay →
              </GoldButton>
              <button onClick={() => scrollTo("product")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.4)", color: "#FFFFFF", fontWeight: 600, fontSize: 14, fontFamily: FONT_BODY, padding: "15px 28px", borderRadius: R_FULL, cursor: "pointer", transition: "border-color 0.2s, background 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.8)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                Xem Chi Tiết
              </button>
            </div>
            {/* Trust badges */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" as const }}>
              {[
                { icon: "shield", text: "Bảo hành 3 năm" },
                { icon: "truck", text: "Giao hàng miễn phí" },
                { icon: "star", text: "500+ khách hàng" },
                { icon: "zap", text: "Lắp đặt trong ngày" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <SvgIcon name={b.icon} size={14} color="rgba(255,255,255,0.7)" />
                  <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: FONT_BODY }}>{b.text}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ── */}
      <section id="product" style={{ padding: SECTION_PAD, background: BLACK }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Sản Phẩm</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25, color: WHITE }}>
                {E({ bk: "product_title", def: "Sofa Giường Da PU SMF12", as: "span" })}
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, maxWidth: 600, margin: "20px auto 0", fontFamily: FONT_BODY }}>
                {E({ bk: "product_desc", def: "Thiết kế hiện đại, chất liệu da PU cao cấp, phù hợp mọi không gian phòng ngủ từ nhỏ đến lớn.", as: "span" })}
              </p>
            </div>
          </FadeIn>

          {/* Product images grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 48 }}>
            {[0, 1, 2].map(i => {
              const imgUrl = content[`product_img_${i}`] || "";
              return (
                <FadeIn key={i} delay={i * 80}>
                  <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", background: BLACK_CARD, border: `1px solid ${gRgba(GOLD, 0.15)}`, aspectRatio: "4/3" }}>
                    {imgUrl ? (
                      <img src={imgUrl} alt={`Sofa SMF12 góc ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, minHeight: 200 }}>
                        <div style={{ fontSize: 32, opacity: 0.3 }}>🛋️</div>
                        <p style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY, margin: 0, textAlign: "center" as const }}>
                          {isEditor ? "Bấm để upload ảnh" : "Chưa có ảnh sản phẩm"}
                        </p>
                      </div>
                    )}
                    {isEditor && editMode && (
                      <button
                        onClick={async () => {
                          const url = prompt("Nhập URL ảnh:");
                          if (url) setContent(c => ({ ...c, [`product_img_${i}`]: url }));
                        }}
                        style={{ position: "absolute", bottom: 10, right: 10, background: gRgba(GOLD, 0.9), color: "#fff", border: "none", borderRadius: R_SM, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: FONT_BODY }}>
                        Đổi ảnh
                      </button>
                    )}
                  </div>
                </FadeIn>
              );
            })}
          </div>

          {/* Size selector */}
          <FadeIn>
            <div style={{ background: "#FFFFFF", border: `1px solid ${gRgba(GOLD, 0.2)}`, borderRadius: R_LG, padding: "clamp(24px,4vw,40px)", boxShadow: `0 4px 32px ${gRgba(GOLD, 0.06)}` }}>
              <h3 style={{ color: WHITE, fontSize: 18, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 8 }}>Chọn Kích Thước</h3>
              <p style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY, marginBottom: 24 }}>Chọn size phù hợp với không gian phòng của bạn</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
                {SIZES.map(s => {
                  const isSelected = selectedSize === s.key;
                  return (
                    <button key={s.key} onClick={() => setSelectedSize(s.key)} style={{
                      background: isSelected ? `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)` : "#FDFAF5",
                      border: `2px solid ${isSelected ? GOLD : gRgba(GOLD, 0.2)}`,
                      borderRadius: R_MD, padding: "16px 12px", cursor: "pointer",
                      transition: "all 0.2s", textAlign: "center" as const,
                      boxShadow: isSelected ? `0 4px 16px ${gRgba(GOLD, 0.3)}` : "none",
                    }}>
                      <div style={{ color: isSelected ? "#FFFFFF" : GOLD, fontSize: 15, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ color: isSelected ? "rgba(255,255,255,0.85)" : GRAY, fontSize: 12, fontFamily: FONT_BODY, marginBottom: 8 }}>{s.desc}</div>
                      <div style={{ color: isSelected ? "#FFFFFF" : WHITE, fontSize: 14, fontWeight: 700, fontFamily: FONT_HEADING }}>{fmt(s.price)}</div>
                    </button>
                  );
                })}
              </div>
              {selectedSizeObj && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 16, padding: "20px 24px", background: gRgba(GOLD, 0.06), borderRadius: R_MD, border: `1px solid ${gRgba(GOLD, 0.2)}` }}>
                  <div>
                    <div style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY, marginBottom: 4 }}>Tổng giá (đã bao gồm giao hàng & lắp đặt)</div>
                    <div style={{ color: GOLD, fontSize: 28, fontWeight: 800, fontFamily: FONT_HEADING }}>{fmt(selectedSizeObj.price)}</div>
                  </div>
                  <GoldButton onClick={scrollToForm} style={{ fontSize: 14, padding: "14px 32px" }}>
                    Đặt Hàng Size Này →
                  </GoldButton>
                </div>
              )}
              {!selectedSize && (
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <GoldButton onClick={scrollToForm} style={{ fontSize: 14, padding: "14px 32px" }}>
                    Tư Vấn Chọn Size Miễn Phí →
                  </GoldButton>
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: SECTION_PAD, background: BLACK_SOFT }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Điểm Mạnh</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25, color: WHITE }}>
                {E({ bk: "features_title", def: "Vì Sao Chọn SMF12?", as: "span" })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div style={{ background: "#FFFFFF", border: `1px solid ${gRgba(GOLD, 0.15)}`, borderRadius: R_LG, padding: "28px 24px", transition: "border-color 0.25s, box-shadow 0.25s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = gRgba(GOLD, 0.4); (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${gRgba(GOLD, 0.1)}`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = gRgba(GOLD, 0.15); (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                  <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                  <h3 style={{ color: WHITE, fontSize: 15, fontWeight: 600, marginBottom: 8, fontFamily: FONT_HEADING }}>{f.title}</h3>
                  <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPECS ── */}
      <section id="specs" style={{ padding: SECTION_PAD, background: BLACK }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Thông Số Kỹ Thuật</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25, color: WHITE }}>
                {E({ bk: "specs_title", def: "Chất Lượng Được Kiểm Chứng", as: "span" })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={80}>
            <div style={{ background: "#FFFFFF", border: `1px solid ${gRgba(GOLD, 0.2)}`, borderRadius: R_LG, overflow: "hidden", boxShadow: `0 4px 32px ${gRgba(GOLD, 0.06)}` }}>
              {SPECS.map((row, i) => (
                <div key={i} style={{ display: "flex", borderBottom: i < SPECS.length - 1 ? `1px solid ${gRgba(GOLD, 0.12)}` : "none" }}>
                  <div style={{ width: "40%", padding: "16px 20px", background: gRgba(GOLD, 0.04), borderRight: `1px solid ${gRgba(GOLD, 0.12)}` }}>
                    <span style={{ color: GOLD, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>{row.label}</span>
                  </div>
                  <div style={{ flex: 1, padding: "16px 20px" }}>
                    <span style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY }}>{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="reviews" style={{ padding: SECTION_PAD, background: BLACK_SOFT }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Khách Hàng Nói Gì</SectionLabel>
            <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25, color: WHITE }}>
              {E({ bk: "reviews_title", def: "Hơn 500 Gia Đình Hài Lòng", as: "span" })}
            </h2>
            <GoldDivider />
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 40 }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ background: "#FFFFFF", border: `1px solid ${gRgba(GOLD, 0.15)}`, borderRadius: R_LG, padding: "28px 24px", textAlign: "left" as const, boxShadow: `0 2px 16px ${gRgba(GOLD, 0.05)}` }}>
                  <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <span key={j} style={{ color: GOLD, fontSize: 14 }}>★</span>
                    ))}
                  </div>
                  <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 20, fontStyle: "italic" }}>"{t.text}"</p>
                  <div>
                    <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>{t.name}</div>
                    <div style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY }}>{t.location}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Câu Hỏi Thường Gặp</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25, color: WHITE }}>
                Giải Đáp Thắc Mắc
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <FadeIn key={i} delay={i * 40}>
                  <div style={{ background: "#FFFFFF", border: `1px solid ${isOpen ? gRgba(GOLD, 0.35) : gRgba(GOLD, 0.15)}`, borderRadius: R_MD, overflow: "hidden", transition: "border-color 0.2s", boxShadow: isOpen ? `0 4px 20px ${gRgba(GOLD, 0.08)}` : "none" }}>
                    <button onClick={() => setOpenFaq(isOpen ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, gap: 16 }}>
                      <span style={{ color: WHITE, fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY, lineHeight: 1.4 }}>{item.q}</span>
                      <span style={{ color: GOLD, fontSize: 18, fontWeight: 700, flexShrink: 0, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 20px 18px", color: GRAY, fontSize: 14, lineHeight: 1.7, fontFamily: FONT_BODY }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LEAD FORM ── */}
      <section ref={formRef} id="order-form" style={{ padding: SECTION_PAD, background: BLACK_SOFT }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Đặt Hàng</SectionLabel>
            <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25, color: WHITE }}>
              {E({ bk: "form_title", def: "Nhận Tư Vấn & Báo Giá Miễn Phí", as: "span" })}
            </h2>
            <GoldDivider />
            <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, maxWidth: 560, margin: "20px auto 40px", fontFamily: FONT_BODY }}>
              {E({ bk: "form_desc", def: "Điền thông tin bên dưới, nhân viên tư vấn sẽ liên hệ trong vòng 2 giờ làm việc.", as: "span" })}
            </p>
          </FadeIn>
          <FadeIn delay={80}>
            <LeadForm
              selectedSize={selectedSize || undefined}
              selectedSizeLabel={selectedSizeObj?.label}
              selectedPrice={selectedSizeObj?.price}
              content={content}
            />
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "40px clamp(20px,5vw,80px)", background: BLACK_CARD, borderTop: `1px solid ${gRgba(GOLD, 0.15)}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap" as const, gap: 32, justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 40, objectFit: "contain", marginBottom: 12 }} />
            <p style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY, maxWidth: 280, lineHeight: 1.6, margin: 0 }}>
              Chuyên sản xuất nội thất thông minh cao cấp. Bảo hành 3 năm, giao hàng toàn quốc.
            </p>
          </div>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" as const }}>
            <div>
              <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", fontFamily: FONT_BODY, marginBottom: 12 }}>LIÊN HỆ</div>
              {[
                { label: "Hotline", value: "1800 xxxx" },
                { label: "Zalo", value: "0912 xxx xxx" },
                { label: "Email", value: "info@smartfurni.com.vn" },
              ].map(c => (
                <div key={c.label} style={{ marginBottom: 8 }}>
                  <span style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY }}>{c.label}: </span>
                  <span style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>{c.value}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", fontFamily: FONT_BODY, marginBottom: 12 }}>SẢN PHẨM</div>
              {[
                { label: "Sofa Giường SMF12", href: "/lp/smf12" },
                { label: "Sofa Giường Tuỳ Chỉnh", href: "/lp/sofa-giuong" },
                { label: "Khung Giường GSF150", href: "/lp/gsf150" },
              ].map(l => (
                <div key={l.label} style={{ marginBottom: 8 }}>
                  <a href={l.href} style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY, textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = GOLD}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = GRAY}>
                    {l.label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "32px auto 0", paddingTop: 24, borderTop: `1px solid ${gRgba(GOLD, 0.1)}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 8 }}>
          <p style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY, margin: 0 }}>© 2024 SmartFurni. Bảo lưu mọi quyền.</p>
          <p style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY, margin: 0 }}>Sản xuất tại Việt Nam</p>
        </div>
      </footer>

      {/* ── STICKY CTA MOBILE ── */}
      {scrollY > 400 && (
        <div className="lp-sticky-cta" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90, background: "rgba(253,250,245,0.97)", backdropFilter: "blur(12px)", borderTop: `1px solid ${gRgba(GOLD, 0.2)}`, padding: "12px 20px", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>Sofa Giường Da PU SMF12</div>
            <div style={{ color: GOLD, fontSize: 12, fontFamily: FONT_BODY }}>
              {selectedSizeObj ? fmt(selectedSizeObj.price) : `Từ ${fmt(SIZES[0].price)}`}
            </div>
          </div>
          <button onClick={scrollToForm} style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`, color: "#FFFFFF", border: "none", borderRadius: R_FULL, padding: "12px 24px", fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY, cursor: "pointer", whiteSpace: "nowrap" as const, boxShadow: `0 2px 12px ${gRgba(GOLD, 0.3)}` }}>
            Đặt Hàng Ngay →
          </button>
        </div>
      )}
    </div>
  );
}
