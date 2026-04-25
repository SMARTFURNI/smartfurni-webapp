"use client";
import "./lp-retail.css";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { EditableText } from "@/components/lp/EditableText";
import { LpEditBar } from "@/components/lp/LpEditBar";
import { BedDemoSection } from "../doi-tac-showroom-nem/BedDemoSection";
import { InstallGuideSection } from "./InstallGuideSection";

// ─── Design tokens — đồng bộ với website chính ────────────────────────────────
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
const LP_SLUG = "gsf150";

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

// ─── YouTube helper ─────────────────────────────────────────────────────────
function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))?([\w-]{11})/);
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

// ─── Image upload helper ─────────────────────────────────────────────────────
function ImageUploadOverlay({ blockKey, currentUrl, onUploaded }: {
  blockKey: string;
  currentUrl?: string;
  onUploaded: (bk: string, url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  void currentUrl;
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Upload thất bại"); }
      const { url } = await res.json();
      await fetch("/api/admin/lp-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: LP_SLUG, blockKey, content: url }),
      });
      onUploaded(blockKey, url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          zIndex: 10, background: "rgba(13,11,0,0.85)", color: GOLD,
          border: `1px solid ${GOLD}`, borderRadius: R_FULL,
          fontSize: 11, fontWeight: 700, padding: "6px 16px",
          cursor: uploading ? "not-allowed" : "pointer",
          fontFamily: FONT_BODY, whiteSpace: "nowrap" as const,
          backdropFilter: "blur(8px)",
          opacity: uploading ? 0.7 : 1,
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        {uploading ? (
          <><span style={{ display: "inline-block", width: 10, height: 10, border: `2px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Đang tải...</>
        ) : (
          <>📷 Thay ảnh</>
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}


// ─── UrgencyBanner ────────────────────────────────────────────────────────────
function UrgencyBanner({ E }: { E: (p: { bk: string; def: string; as: string; style?: React.CSSProperties }) => React.ReactNode }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [stock, setStock] = useState(7);

  useEffect(() => {
    // Tính thời gian còn lại đến 23:59 hôm nay
    const calcTime = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 0);
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      return { h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 };
    };
    setTimeLeft(calcTime());
    const t = setInterval(() => setTimeLeft(calcTime()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const GOLD = "#C9A84C";
  const BLACK = "#0A0A08";
  const WHITE = "#F5F0E8";
  const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <div style={{
      background: "linear-gradient(135deg, #1A1000 0%, #0D0800 100%)",
      border: `1px solid rgba(201,168,76,0.35)`,
      borderRadius: 16,
      padding: "clamp(24px, 3vw, 40px) clamp(20px, 4vw, 48px)",
      maxWidth: 860,
      margin: "0 auto 0",
      textAlign: "center",
    }}>
      <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", fontFamily: FONT_BODY, marginBottom: 12 }}>
        {E({ bk: "urgency_label", def: "⚡ ƯU ĐÃI CÓ THỜI HẠN", as: "span" })}
      </div>
      <h3 style={{ color: WHITE, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 8, lineHeight: 1.3 }}>
        {E({ bk: "urgency_title", def: "Giảm 500.000 ₫ Cho Đơn Đặt Hàng Hôm Nay", as: "span" })}
      </h3>
      <p style={{ color: "#A8A090", fontSize: 13, fontFamily: FONT_BODY, marginBottom: 24 }}>
        {E({ bk: "urgency_subtitle", def: "Ưu đãi kết thúc lúc 23:59 hôm nay — Đặt hàng ngay để không bỏ lỡ", as: "span" })}
      </p>
      {/* Countdown */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
        {[
          { val: pad(timeLeft.h), label: "GIỜ" },
          { val: pad(timeLeft.m), label: "PHÚT" },
          { val: pad(timeLeft.s), label: "GIÂY" },
        ].map((unit, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ background: BLACK, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 10, padding: "10px 18px", minWidth: 60 }}>
              <span style={{ color: GOLD, fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1 }}>{unit.val}</span>
            </div>
            <span style={{ color: "#7A7468", fontSize: 10, letterSpacing: "0.15em", fontFamily: FONT_BODY }}>{unit.label}</span>
          </div>
        ))}
      </div>
      {/* Stock indicator */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 100, padding: "6px 16px", marginBottom: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "pulse 1.5s infinite" }} />
        <span style={{ color: "#FCA5A5", fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY }}>
          {E({ bk: "urgency_stock", def: `Chỉ còn ${stock} sản phẩm giá ưu đãi`, as: "span" })}
        </span>
      </div>
    </div>
  );
}

// ─── StickyCta ─────────────────────────────────────────────────────────────
function StickyCta({ scrollToForm, E }: { scrollToForm: () => void; E: (p: { bk: string; def: string; as: string }) => React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const GOLD = "#C9A84C";
  const BLACK = "#0A0A08";
  const WHITE = "#F5F0E8";
  const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  if (!visible) return null;
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 900,
      background: "rgba(10,10,8,0.97)",
      borderTop: `1px solid rgba(201,168,76,0.25)`,
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backdropFilter: "blur(12px)",
    }} className="sticky-cta-bar">
      <div>
        <div style={{ color: GOLD, fontSize: 16, fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1 }}>9.790.000 ₫</div>
        <div style={{ color: "#7A7468", fontSize: 11, fontFamily: FONT_BODY, marginTop: 2 }}>Miễn phí giao hàng + lắp đặt</div>
      </div>
      <button
        onClick={scrollToForm}
        style={{
          background: `linear-gradient(135deg, ${GOLD} 0%, #E2C97E 100%)`,
          color: BLACK,
          border: "none",
          borderRadius: 100,
          padding: "12px 28px",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: FONT_HEADING,
          cursor: "pointer",
          whiteSpace: "nowrap",
          letterSpacing: "0.02em",
        }}
      >
        {E({ bk: "sticky_cta_btn", def: "Đặt Hàng Ngay →", as: "span" })}
      </button>
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

// ─── FAQ data (bán lẻ) ────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { bkQ: "faq_1_q", defQ: "Giường cũ của tôi kích thước lẻ có dùng được không?", bkA: "faq_1_a", defA: "GSF150 có đầy đủ kích thước chuẩn (1m6, 1m8). Vui lòng để lại số điện thoại để kỹ thuật viên tư vấn kích thước lọt lòng chính xác nhất cho bạn." },
  { bkQ: "faq_2_q", defQ: "Nệm lò xo có dùng được khung này không?", bkA: "faq_2_a", defA: "Hoàn toàn được. Các dòng lò xo túi hiện đại có độ đàn hồi rất tốt, khớp hoàn hảo với chuyển động của khung nâng." },
  { bkQ: "faq_3_q", defQ: "Lắp đặt có phức tạp không?", bkA: "faq_3_a", defA: "Sản phẩm được thiết kế theo dạng Plug & Play. Chỉ cần đặt lên giường, cắm điện là sử dụng ngay. SmartFurni cung cấp video hướng dẫn chi tiết — chỉ 15 phút là thao tác thuần thục." },
  { bkQ: "faq_4_q", defQ: "Nếu động cơ (motor) gặp sự cố thì bảo hành thế nào?", bkA: "faq_4_a", defA: "SmartFurni sử dụng dòng motor lõi đồng tiêu chuẩn xuất khẩu Đức với độ bền trên 10 năm. Chúng tôi áp dụng chính sách Đổi mới động cơ ngay lập tức nếu có lỗi nhà sản xuất. Đội kỹ thuật hỗ trợ tận nơi." },
  { bkQ: "faq_5_q", defQ: "Tôi có thể đặt khung lên giường gỗ hiện tại không?", bkA: "faq_5_a", defA: "Đây chính là điểm độc đáo của GSF150. Bạn chỉ cần tháo chân khung giường và đặt trực tiếp vào lòng giường gỗ hiện có — không cần bỏ giường cũ, không cần lắp đặt phức tạp." },
  { bkQ: "faq_6_q", defQ: "Trả góp có được không?", bkA: "faq_6_a", defA: "Có. SmartFurni hỗ trợ trả góp 0% lãi suất qua các đối tác tài chính. Liên hệ hotline để được tư vấn phương thức phù hợp nhất." },
];

// ─── FAQ Accordion component ────────────────────────────────────────────────
type EFn = (props: { bk: string; def: string; as?: "h1"|"h2"|"h3"|"h4"|"h5"|"h6"|"p"|"span"|"div"|"li"; style?: React.CSSProperties; multiline?: boolean }) => React.ReactNode;
function FaqAccordion({ E: EditFn }: { E: EFn }) {
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
                  {EditFn({ bk: item.bkQ, def: item.defQ, as: "span" })}
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
                    {EditFn({ bk: item.bkA, def: item.defA, as: "span", multiline: true })}
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

// ─── Lead Form (bán lẻ) ───────────────────────────────────────────────────────
function LeadForm({ submitLabel }: { submitLabel?: string }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", mattressType: "", note: "" });
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
    if (!form.name.trim() || !form.phone.trim()) { setError("Vui lòng điền đầy đủ Họ tên và Số điện thoại (*)"); return; }
    if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone.replace(/\s/g, ""))) { setError("Số điện thoại không hợp lệ"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/lp/submit-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingPageSlug: LP_SLUG, name: form.name, phone: form.phone, email: "", note: `Địa chỉ: ${form.address} | Loại nệm: ${form.mattressType} | Ghi chú: ${form.note}`, ...utms }) });
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
      <h3 style={{ fontSize: 24, fontWeight: 600, color: GOLD, marginBottom: 12, fontFamily: FONT_HEADING, letterSpacing: "0.06em" }}>Đặt hàng thành công!</h3>
      <p style={{ color: GRAY_LIGHT, fontSize: 15, lineHeight: 1.75, fontFamily: FONT_BODY }}>Cảm ơn bạn đã tin tưởng SmartFurni.<br />Đội ngũ tư vấn sẽ liên hệ qua <strong style={{ color: GOLD }}>Zalo / điện thoại</strong> trong vòng 2 giờ làm việc để xác nhận đơn hàng.</p>
    </div>
  );
  return (
    <form onSubmit={handleSubmit} style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, padding: "clamp(24px,4vw,44px)", borderRadius: R_LG }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
        {[
          { k: "name", label: "Họ và tên *", ph: "Nguyễn Văn A" },
          { k: "phone", label: "Số điện thoại (Zalo) *", ph: "0912 345 678" },
          { k: "mattressType", label: "Loại nệm hiện tại", ph: "VD: Cao su, Lò xo, Foam…" },
        ].map(f => (
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
        <textarea placeholder="Kích thước giường, yêu cầu đặc biệt…" rows={3} value={form.note} onChange={set("note")}
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
        {loading ? "Đang gửi…" : (submitLabel || "Tư Vấn & Đặt Hàng Ngay →")}
      </button>
      <p style={{ color: GRAY, fontSize: 12, textAlign: "center", marginTop: 14, fontFamily: FONT_BODY }}>🔒 Thông tin được bảo mật tuyệt đối. Không spam.</p>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LpGsf150Client({ isEditor = false, initialContent = {} }: Props) {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [editedCount, setEditedCount] = useState(0);

  useEffect(() => {
    setScrollY(window.scrollY);
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const scrollToForm = () => scrollTo("register-form");

  const NAV_ITEMS = [
    { label: "Tính năng", id: "tinh-nang" },
    { label: "Sản phẩm", id: "san-pham" },
    { label: "Lợi ích", id: "loi-ich" },
    { label: "Đánh giá", id: "danh-gia" },
    { label: "Đặt hàng", id: "register-form" },
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
        transition: "background 0.3s ease, border-color 0.3s ease",
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

          {/* Main menu — ẩn trên mobile */}
          <div className="lp-nav-menu" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
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
          <button onClick={scrollToForm} className="lp-nav-cta" style={{
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
            {E({ bk: "nav_cta", def: "ĐẶT HÀNG NGAY", as: "span" })}
          </button>
          {/* Hamburger */}
          <button
            className="lp-nav-hamburger"
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{
              background: "none", border: `1px solid rgba(201,168,76,0.35)`,
              borderRadius: R_SM, padding: "8px 10px", cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 5, flexShrink: 0,
            }}
            aria-label="Menu"
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: "block", width: 20, height: 1.5, background: GOLD_LIGHT, borderRadius: 1 }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div style={{
          position: "fixed", top: 68, left: 0, right: 0, zIndex: 99,
          background: "rgba(13,11,0,0.98)", backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${BLACK_BORDER}`,
          padding: "16px 24px 24px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => { scrollTo(item.id); setMobileMenuOpen(false); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: GRAY_LIGHT, fontSize: 15, fontWeight: 500,
                  fontFamily: FONT_BODY, padding: "14px 16px",
                  textAlign: "left" as const, borderRadius: R_SM,
                  letterSpacing: "0.02em",
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => { scrollToForm(); setMobileMenuOpen(false); }}
              style={{
                background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
                color: BLACK, border: "none", padding: "14px 20px",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                textTransform: "uppercase" as const, borderRadius: R_MD,
                fontFamily: FONT_BODY, marginTop: 8, letterSpacing: "0.08em",
              }}
            >
              Đặt Hàng Ngay →
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "120px 24px 80px", background: `linear-gradient(160deg, ${BLACK} 0%, #110E00 60%, ${BLACK} 100%)` }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: `linear-gradient(${GOLD} 1px, transparent 1px), linear-gradient(90deg, ${GOLD} 1px, transparent 1px)`, backgroundSize: "64px 64px" }} />
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 65%)`, pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>{E({ bk: "hero_section_label", def: "Ưu đãi đặc biệt tháng này", as: "span" })}</SectionLabel>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h1 style={{ fontSize: "clamp(30px, 5.5vw, 62px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.01em", fontFamily: FONT_HEADING }}>
              {E({ bk: "hero_title_1", def: "SMARTFURNI GSF150 —", as: "span", style: { color: WHITE, display: "block", fontWeight: 200, letterSpacing: "0.04em", fontFamily: FONT_BRAND } })}
              {E({ bk: "hero_title_2", def: "Nâng Cấp Giường Thường", as: "span", style: { color: GOLD, display: "block", fontWeight: 300 } })}
              {E({ bk: "hero_title_3", def: "Thành Giường Thông Minh Trong 5 Phút", as: "span", style: { color: WHITE, display: "block", fontWeight: 300 } })}
            </h1>
          </FadeIn>
          <FadeIn delay={200}>
            <p style={{ fontSize: "clamp(15px, 2vw, 19px)", color: GRAY_LIGHT, lineHeight: 1.8, maxWidth: 680, margin: "0 auto 48px", fontWeight: 300, fontFamily: FONT_BODY }}>
              {E({ bk: "hero_subtitle", def: "Không cần bỏ giường cũ. Không cần lắp đặt phức tạp. Chỉ đặt lên — cắm điện — tận hưởng công nghệ ngủ không trọng lực.", as: "span", multiline: true })}
            </p>
          </FadeIn>
          <FadeIn delay={300}>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <GoldButton onClick={scrollToForm}>
                {E({ bk: "hero_cta", def: "Nhận Tư Vấn & Ưu Đãi Ngay", as: "span" })}
              </GoldButton>
              <OutlineButton onClick={() => document.getElementById("san-pham")?.scrollIntoView({ behavior: "smooth" })}>
                {E({ bk: "hero_cta_outline", def: "Xem sản phẩm ↓", as: "span" })}
              </OutlineButton>
            </div>
          </FadeIn>
          {/* Stats row */}
          <FadeIn delay={400}>
            <div className="lp-stats-row" style={{ display: "flex", justifyContent: "center", marginTop: 72, flexWrap: "wrap", borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 40 }}>
              {[
                { bkNum: "stat_1_num", defNum: "5 năm", bkLabel: "stat_1_label", defLabel: "Bảo hành motor" },
                { bkNum: "stat_2_num", defNum: "300kg", bkLabel: "stat_2_label", defLabel: "Tải trọng tối đa" },
                { bkNum: "stat_3_num", defNum: "5 phút", bkLabel: "stat_3_label", defLabel: "Lắp đặt nhanh" },
                { bkNum: "stat_4_num", defNum: "100%", bkLabel: "stat_4_label", defLabel: "Tương thích nệm" },
              ].map((s, i) => (
                <div key={i} className="lp-stat-item" style={{ padding: "20px 32px", borderLeft: i > 0 ? `1px solid ${BLACK_BORDER}` : "none", textAlign: "center", minWidth: 110 }}>
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
              <SectionLabel>{E({ bk: "problem_section_label", def: "Thực trạng giấc ngủ", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "problem_title_1", def: "Bạn Có Đang Chịu Đựng", as: "span", style: { display: "block" } })}
                {E({ bk: "problem_title_2", def: "Những Điều Này Mỗi Đêm?", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <FadeIn delay={100}>
              <div style={{ background: BLACK_SOFT, padding: "36px 28px", borderTop: `3px solid rgba(255,107,107,0.4)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG }}>
                <div style={{ fontSize: 28, marginBottom: 18 }}>😰</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 18, color: RED_SOFT, fontFamily: FONT_HEADING, letterSpacing: "normal" }}>
                  {E({ bk: "problem_col1_title", def: "Vấn đề thường gặp", as: "span" })}
                </h3>
                {[
                  { bk: "problem_item_1", def: "Đau mỏi vai gáy, lưng mỗi sáng thức dậy" },
                  { bk: "problem_item_2", def: "Ngủ ngáy, trào ngược axit dạ dày ban đêm" },
                  { bk: "problem_item_3", def: "Mỏi lưng khi đọc sách, xem phim trên giường" },
                  { bk: "problem_item_4", def: "Tiếc chiếc giường gỗ đắt tiền nhưng muốn nâng cấp" },
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
                  {E({ bk: "solution_col2_title", def: "Giải pháp SmartFurni GSF150", as: "span" })}
                </h3>
                {[
                  { bk: "solution_item_1", def: "Chế độ Zero Gravity — giải tỏa áp lực cột sống hoàn toàn" },
                  { bk: "solution_item_2", def: "Nâng đầu nhẹ — chống ngáy và trào ngược hiệu quả" },
                  { bk: "solution_item_3", def: "Điều chỉnh góc đọc sách, xem phim thoải mái tuyệt đối" },
                  { bk: "solution_item_4", def: "Lắp vào giường gỗ cũ — không cần bỏ nội thất đắt tiền" },
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

      {/* ── PRODUCT IMAGES ── */}
      <section style={{ background: BLACK, padding: "0 0 80px" }}>
        <div style={{ textAlign: "center", padding: "0 24px 36px" }}>
          <p style={{ color: GRAY_LIGHT, fontSize: 15, fontFamily: FONT_BODY, lineHeight: 1.7, maxWidth: 680, margin: "0 auto" }}>
            {E({ bk: "comp_caption_top", def: "Cùng một chiếc giường — nhưng trải nghiệm hoàn toàn khác nhau", as: "span" })}
          </p>
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          <FadeIn delay={100}>
            <div style={{ borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}`, position: "relative" }}>
              <Image src="/gsf150-standalone.jpg" alt="SmartFurni GSF150 khung độc lập" width={600} height={450} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(13,11,0,0.85) 0%, transparent 60%)", padding: "24px 20px 20px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: GOLD, color: BLACK, fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: R_FULL, letterSpacing: "0.1em", marginBottom: 8 }}>PHONG CÁCH TỐI GIẢN</div>
                <p style={{ color: WHITE, fontSize: 14, fontWeight: 500, fontFamily: FONT_HEADING, margin: 0 }}>Lắp chân thép — dùng độc lập</p>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={200}>
            <div style={{ borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}`, position: "relative" }}>
              <Image src="/gsf150-wood-frame.jpg" alt="SmartFurni GSF150 lắp vào giường gỗ" width={600} height={450} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(13,11,0,0.85) 0%, transparent 60%)", padding: "24px 20px 20px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: GOLD, color: BLACK, fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: R_FULL, letterSpacing: "0.1em", marginBottom: 8 }}>GIỮ NGUYÊN GIƯỜNG CŨ</div>
                <p style={{ color: WHITE, fontSize: 14, fontWeight: 500, fontFamily: FONT_HEADING, margin: 0 }}>Đặt vào lòng giường gỗ hiện có</p>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={300}>
            <div style={{ borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
              <Image src="/gsf150-exploded.jpg" alt="Cấu tạo SmartFurni GSF150" width={600} height={450} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── BED DEMO INTERACTIVE ── */}
      <BedDemoSection />

      {/* ── HERO VIDEO ── */}
      <section style={{ background: BLACK }}>
        <div style={{ textAlign: "center", padding: "56px 24px 24px" }}>
          <FadeIn>
            <SectionLabel>
              {E({ bk: "hero_video_label", def: "Xem sản phẩm hoạt động thực tế", as: "span" })}
            </SectionLabel>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, color: WHITE, fontFamily: FONT_HEADING, marginTop: 12, marginBottom: 0, letterSpacing: "-0.01em" }}>
              {E({ bk: "hero_video_title", def: "Giường Công Thái Học Điều Chỉnh Điện SmartFurni GSF150", as: "span" })}
            </h2>
          </FadeIn>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 12px" }}>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, border: "1px solid #2E2800", boxShadow: "0 0 60px rgba(201,168,76,0.08)" }}>
            <YoutubeAutoplay
              videoId={extractYoutubeId(content["hero_video_url"] || "") || "_placeholder_"}
              title={content["hero_video_title"] || "SmartFurni GSF150 Demo"}
            />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
          </div>
        </div>
        {editMode && (
          <div style={{ padding: "16px 24px", background: BLACK_SOFT, borderTop: `1px solid ${BLACK_BORDER}` }}>
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" as const }}>
              <span style={{ color: GOLD, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const, paddingTop: 4 }}>🎥 Link YouTube:</span>
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
      <section id="san-pham" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>{E({ bk: "products_section_label", def: "Dòng sản phẩm", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "products_title_1", def: "Khung Giường Công Thái Học", as: "span", style: { display: "block" } })}
                {E({ bk: "products_title_2", def: "SmartFurni GSF150", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 14, maxWidth: 520, margin: "0 auto", fontFamily: FONT_BODY, lineHeight: 1.7 }}>
                {E({ bk: "products_subtitle", def: "Khung thép cường lực, motor Đức siêu êm — bảo hành 5 năm chính hãng", as: "span", multiline: true })}
              </p>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {[
              { bkName: "product_1_name", defName: "SmartFurni GSF150 — Size 1m6", bkDesc: "product_1_desc", defDesc: "Điều chỉnh đầu 0–70°, chân 0–45°. Tải trọng 300kg. Phù hợp giường 1 người hoặc đôi nhỏ.", img: "/gsf150-standalone.jpg", sku: "GSF150-160", bkCta: "product_1_cta", defCta: "9.790.000 ₫ — Đặt hàng ngay →" },
              { bkName: "product_2_name", defName: "SmartFurni GSF150 — Size 1m8", bkDesc: "product_2_desc", defDesc: "Điều chỉnh đầu 0–70°, chân 0–45°. Tải trọng 300kg. Phù hợp giường đôi tiêu chuẩn.", img: "/gsf150-wood-frame.jpg", sku: "GSF150-180", bkCta: "product_2_cta", defCta: "10.990.000 ₫ — Đặt hàng ngay →" },
              { bkName: "product_3_name", defName: "SmartFurni GSF150 Double", bkDesc: "product_3_desc", defDesc: "Hai động cơ độc lập — điều chỉnh riêng từng bên. Lý tưởng cho cặp đôi có thói quen ngủ khác nhau.", img: "/gsf150-exploded.jpg", sku: "GSF150-DBL", bkCta: "product_3_cta", defCta: "Liên hệ nhận báo giá →" },
            ].map((p, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, overflow: "hidden", borderRadius: R_LG, transition: "all 0.3s ease", display: "flex", flexDirection: "column" }}
                  onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "rgba(201,168,76,0.45)"; d.style.transform = "translateY(-6px)"; d.style.boxShadow = "0 20px 48px rgba(0,0,0,0.5)"; }}
                  onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = BLACK_BORDER; d.style.transform = "translateY(0)"; d.style.boxShadow = "none"; }}>
                  <div style={{ position: "relative", width: "100%", paddingBottom: "75%", borderRadius: `${R_LG}px ${R_LG}px 0 0`, overflow: "hidden", flexShrink: 0 }}>
                    <div style={{ position: "absolute", inset: 0 }}>
                      <img src={content[`product_image_${i}`] || p.img} alt={content[p.bkName] || p.defName} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,11,0,0.65) 0%, transparent 55%)" }} />
                    </div>
                    {editMode && (
                      <ImageUploadOverlay
                        blockKey={`product_image_${i}`}
                        currentUrl={content[`product_image_${i}`] || p.img}
                        onUploaded={handleSaved}
                      />
                    )}
                    <div style={{ position: "absolute", top: 14, right: 14, background: i === 1 ? GOLD : "rgba(13,11,0,0.8)", color: i === 1 ? BLACK : GRAY_LIGHT, border: i !== 1 ? `1px solid rgba(212,196,160,0.3)` : "none", fontSize: 10, fontWeight: 700, padding: "5px 12px", letterSpacing: "0.08em", borderRadius: R_FULL, fontFamily: FONT_BODY }}>
                      {["Phổ thông", "Bán chạy nhất ★", "Double cao cấp"][i]}
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
                    <button onClick={scrollToForm} style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`, color: BLACK, border: "none", padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", borderRadius: R_SM, fontFamily: FONT_BODY, letterSpacing: "0.04em", textAlign: "left" as const }}>
                      {E({ bk: p.bkCta, def: p.defCta, as: "span" })}
                    </button>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>


      {/* ── SO SÁNH: GSF150 vs Mua giường mới ── */}
      <section style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "compare_section_label", def: "Tại sao chọn GSF150?", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "compare_title_1", def: "GSF150 Tiết Kiệm Hơn", as: "span", style: { display: "block" } })}
                {E({ bk: "compare_title_2", def: "Mua Giường Điện Mới Đến 70%", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: FONT_BODY }}>
                <thead>
                  <tr>
                    <th style={{ padding: "14px 20px", textAlign: "left", color: GRAY, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, borderBottom: `1px solid ${BLACK_BORDER}` }}>Tiêu chí</th>
                    <th style={{ padding: "14px 20px", textAlign: "center", color: GOLD, fontSize: 13, fontWeight: 700, background: "rgba(201,168,76,0.07)", borderBottom: `2px solid ${GOLD}`, borderRadius: "12px 12px 0 0" }}>
                      SmartFurni GSF150
                    </th>
                    <th style={{ padding: "14px 20px", textAlign: "center", color: GRAY, fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${BLACK_BORDER}` }}>Mua giường điện mới</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { criteria: "Chi phí", gsf: "9.790.000 ₫", rival: "30–80 triệu ₫", highlight: true },
                    { criteria: "Giữ giường cũ", gsf: "✓ Giữ nguyên 100%", rival: "✗ Phải bỏ giường cũ", highlight: false },
                    { criteria: "Thời gian lắp đặt", gsf: "5–15 phút", rival: "Nửa ngày + thợ", highlight: false },
                    { criteria: "Tương thích nệm cũ", gsf: "✓ Mọi loại nệm", rival: "Thường cần nệm riêng", highlight: false },
                    { criteria: "Bảo hành motor", gsf: "5 năm CE/TÜV", rival: "1–2 năm", highlight: true },
                    { criteria: "Điều khiển app", gsf: "✓ iOS & Android", rival: "Tuỳ model", highlight: false },
                    { criteria: "Tải trọng", gsf: "300kg", rival: "150–200kg", highlight: false },
                  ] as const).map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                      <td style={{ padding: "14px 20px", color: GRAY_LIGHT, fontSize: 13, borderBottom: `1px solid rgba(201,168,76,0.06)` }}>{row.criteria}</td>
                      <td style={{ padding: "14px 20px", textAlign: "center", color: row.highlight ? GOLD : WHITE, fontSize: 13, fontWeight: row.highlight ? 700 : 500, background: "rgba(201,168,76,0.04)", borderBottom: `1px solid rgba(201,168,76,0.06)`, borderLeft: `1px solid rgba(201,168,76,0.1)`, borderRight: `1px solid rgba(201,168,76,0.1)` }}>{row.gsf}</td>
                      <td style={{ padding: "14px 20px", textAlign: "center", color: GRAY, fontSize: 13, borderBottom: `1px solid rgba(201,168,76,0.06)` }}>{row.rival}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ textAlign: "center", color: GRAY, fontSize: 12, marginTop: 16, fontFamily: FONT_BODY, fontStyle: "italic" }}>
              * Giá giường điện nhập khẩu tham khảo thị trường 2024–2025
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── THÔNG SỐ KỸ THUẬT ── */}
      <section style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>{E({ bk: "spec_section_label", def: "Thông số kỹ thuật", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "spec_title_1", def: "Thông Số Kỹ Thuật", as: "span", style: { display: "block" } })}
                {E({ bk: "spec_title_2", def: "SmartFurni GSF150", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 2, background: BLACK_BORDER, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden" }}>
              {([
                { label: "Kích thước lọt lòng", value: "1.600 × 2.000mm / 1.800 × 2.000mm" },
                { label: "Tải trọng tối đa", value: "300 kg" },
                { label: "Góc nâng đầu giường", value: "0° – 70°" },
                { label: "Góc nâng chân giường", value: "0° – 45°" },
                { label: "Công suất motor", value: "2 × 150W (motor Đức)" },
                { label: "Điện áp vận hành", value: "24V DC (an toàn tuyệt đối)" },
                { label: "Tiếng ồn vận hành", value: "< 45 dB" },
                { label: "Tốc độ nâng hạ", value: "~25mm/giây" },
                { label: "Trọng lượng khung", value: "~28 kg (1m6) / ~32 kg (1m8)" },
                { label: "Chất liệu khung", value: "Thép cường lực mạ kẽm" },
                { label: "Điều khiển", value: "Remote không dây + App iOS/Android" },
                { label: "Vị trí nhớ", value: "4 tư thế yêu thích" },
                { label: "Chế độ massage", value: "Có (đầu + chân)" },
                { label: "Bảo hành motor", value: "5 năm chính hãng (CE/TÜV)" },
                { label: "Bảo hành khung", value: "2 năm" },
                { label: "Kiểm định", value: "50.000 lần nâng hạ" },
              ] as const).map((spec, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 20px", background: i % 2 === 0 ? BLACK_CARD : "rgba(22,20,14,0.5)", gap: 16 }}>
                  <span style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY, flex: "0 0 180px", lineHeight: 1.4 }}>{spec.label}</span>
                  <span style={{ color: WHITE, fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY, lineHeight: 1.4 }}>{spec.value}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>
      {/* ── 6 BENEFITS (thay cho đặc quyền đại lý) ── */}
      <section id="loi-ich" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>{E({ bk: "privilege_section_label", def: "Lý do chọn SmartFurni", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "benefits_title_1", def: "6 Lý Do Hàng Nghìn Gia Đình", as: "span", style: { display: "block" } })}
                {E({ bk: "benefits_title_2", def: "Tin Tưởng SmartFurni", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {[
              { icon: "◈", bkTitle: "benefit_1_title", defTitle: "Tương Thích 100% Mọi Loại Nệm", bkDesc: "benefit_1_desc", defDesc: "Cao su, lò xo túi, foam, hybrid — GSF150 hoạt động hoàn hảo với tất cả. Không cần mua nệm mới.", bkBadge: "benefit_1_badge", defBadge: "Không cần đổi nệm" },
              { icon: "◇", bkTitle: "benefit_2_title", defTitle: "Giữ Nguyên Giường Cũ", bkDesc: "benefit_2_desc", defDesc: "Tháo chân khung, đặt trực tiếp vào lòng giường gỗ hiện có. Tiết kiệm hoàn toàn chi phí mua giường mới.", bkBadge: "benefit_2_badge", defBadge: "Tiết kiệm tối đa" },
              { icon: "◉", bkTitle: "benefit_3_title", defTitle: "Motor Đức Siêu Êm", bkDesc: "benefit_3_desc", defDesc: "Vận hành êm ái, không tiếng ồn. Thay đổi tư thế lúc nửa đêm mà không làm phiền người bên cạnh.", bkBadge: "benefit_3_badge", defBadge: "Vận hành êm tuyệt đối" },
              { icon: "◆", bkTitle: "benefit_4_title", defTitle: "Điều Khiển Không Dây Thông Minh", bkDesc: "benefit_4_desc", defDesc: "Remote không dây + App điện thoại. Lưu 4 tư thế yêu thích. Một chạm về tư thế thoải mái nhất.", bkBadge: "benefit_4_badge", defBadge: "Điều khiển dễ dàng" },
              { icon: "◐", bkTitle: "benefit_5_title", defTitle: "Bảo Hành 5 Năm Chính Hãng", bkDesc: "benefit_5_desc", defDesc: "Motor tiêu chuẩn CE/TÜV, bảo hành 5 năm. Đổi mới ngay lập tức nếu có lỗi nhà sản xuất. Kỹ thuật viên hỗ trợ tận nơi.", bkBadge: "benefit_5_badge", defBadge: "Bảo hành dài nhất ngành" },
              { icon: "◎", bkTitle: "benefit_6_title", defTitle: "Lắp Đặt Toàn Quốc", bkDesc: "benefit_6_desc", defDesc: "Đội kỹ thuật SmartFurni lắp đặt và hướng dẫn sử dụng tận nơi trên toàn quốc. Miễn phí giao hàng.", bkBadge: "benefit_6_badge", defBadge: "Miễn phí lắp đặt" },
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


      {/* ── LỢI ÍCH SỨC KHỎE CHI TIẾT ── */}
      <section style={{ background: `linear-gradient(180deg, ${BLACK_SOFT} 0%, ${BLACK} 100%)`, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>{E({ bk: "health_section_label", def: "Khoa học giấc ngủ", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 42px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "health_title_1", def: "Tư Thế Ngủ Đúng Cách", as: "span", style: { display: "block" } })}
                {E({ bk: "health_title_2", def: "Thay Đổi Sức Khỏe Của Bạn", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY_LIGHT, fontSize: 15, maxWidth: 600, margin: "0 auto", lineHeight: 1.75, fontFamily: FONT_BODY }}>
                {E({ bk: "health_subtitle", def: "Nghiên cứu từ Đại học Harvard và Mayo Clinic chứng minh: tư thế ngủ ảnh hưởng trực tiếp đến cột sống, tim mạch và chất lượng giấc ngủ.", as: "span", multiline: true })}
              </p>
            </div>
          </FadeIn>

          {/* Infographic tư thế ngủ */}
          <FadeIn delay={80}>
            <div style={{ marginBottom: 64 }}>
              <h3 style={{ textAlign: "center", color: GOLD, fontSize: 13, fontWeight: 600, letterSpacing: "0.15em", fontFamily: FONT_BODY, marginBottom: 28, textTransform: "uppercase" as const }}>
                {E({ bk: "health_posture_title", def: "Giường phẳng vs Giường điều chỉnh góc", as: "span" })}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Giường phẳng — vấn đề */}
                <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: R_LG, padding: "28px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <span style={{ fontSize: 18 }}>😰</span>
                    <span style={{ color: "#FCA5A5", fontSize: 13, fontWeight: 700, fontFamily: FONT_HEADING, letterSpacing: "0.05em" }}>
                      {E({ bk: "health_flat_label", def: "GIƯỜNG PHẲNG THÔNG THƯỜNG", as: "span" })}
                    </span>
                  </div>
                  {/* SVG minh họa người nằm phẳng */}
                  <svg viewBox="0 0 320 100" style={{ width: "100%", marginBottom: 20 }}>
                    {/* Giường */}
                    <rect x="10" y="70" width="300" height="12" rx="4" fill="#2A1A1A" stroke="rgba(239,68,68,0.3)" strokeWidth="1"/>
                    {/* Người nằm phẳng */}
                    <ellipse cx="60" cy="62" rx="18" ry="18" fill="#1E1A1A" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5"/>
                    <circle cx="60" cy="52" r="9" fill="#2A2020" stroke="rgba(239,68,68,0.4)" strokeWidth="1"/>
                    <rect x="78" y="58" width="160" height="10" rx="5" fill="#1E1A1A" stroke="rgba(239,68,68,0.3)" strokeWidth="1"/>
                    <rect x="230" y="60" width="60" height="8" rx="4" fill="#1E1A1A" stroke="rgba(239,68,68,0.3)" strokeWidth="1"/>
                    {/* Mũi tên chỉ áp lực */}
                    <line x1="158" y1="40" x2="158" y2="58" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3,2"/>
                    <polygon points="154,56 162,56 158,62" fill="#EF4444"/>
                    <text x="165" y="48" fill="#FCA5A5" fontSize="9" fontFamily="Inter, sans-serif">Áp lực</text>
                    <text x="162" y="58" fill="#FCA5A5" fontSize="9" fontFamily="Inter, sans-serif">cột sống</text>
                    {/* Đường cột sống cong bất thường */}
                    <path d="M 90 63 Q 130 55 158 63 Q 186 71 230 63" stroke="#EF4444" strokeWidth="1.5" fill="none" strokeDasharray="4,2" opacity="0.7"/>
                  </svg>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {([
                      { icon: "✕", text: "Cột sống không được đỡ đúng cách, cong vẹo theo trọng lực" },
                      { icon: "✕", text: "Dạ dày cao hơn thực quản — trào ngược axit ban đêm" },
                      { icon: "✕", text: "Đường thở hẹp khi nằm phẳng — gây ngáy và ngưng thở" },
                      { icon: "✕", text: "Máu dồn về tim nhiều hơn — tim làm việc nặng hơn" },
                    ] as const).map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ color: "#EF4444", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                        <span style={{ color: GRAY, fontSize: 12, lineHeight: 1.6, fontFamily: FONT_BODY }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Giường điều chỉnh — giải pháp */}
                <div style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: R_LG, padding: "28px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <span style={{ fontSize: 18 }}>😴</span>
                    <span style={{ color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT_HEADING, letterSpacing: "0.05em" }}>
                      {E({ bk: "health_smart_label", def: "SMARTFURNI GSF150 — ZERO GRAVITY", as: "span" })}
                    </span>
                  </div>
                  {/* SVG minh họa người nằm tư thế Zero Gravity */}
                  <svg viewBox="0 0 320 100" style={{ width: "100%", marginBottom: 20 }}>
                    {/* Giường điều chỉnh góc */}
                    <path d="M 10 82 L 10 70 Q 10 68 12 68 L 180 68 Q 160 55 155 42 L 290 42 Q 295 42 295 47 L 295 70 L 300 82 Z" fill="#1A1400" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
                    {/* Người nằm tư thế nâng đầu + chân */}
                    <circle cx="165" cy="34" r="9" fill="#2A2010" stroke={`rgba(201,168,76,0.5)`} strokeWidth="1.5"/>
                    <path d="M 165 43 L 155 60 L 240 60 L 235 43 Z" rx="4" fill="#1E1A0E" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
                    <path d="M 240 60 Q 265 60 275 55 L 290 55" stroke="rgba(201,168,76,0.4)" strokeWidth="8" strokeLinecap="round" fill="none"/>
                    {/* Đường cột sống thẳng */}
                    <path d="M 165 43 Q 200 52 240 60" stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.6"/>
                    {/* Check marks */}
                    <circle cx="100" cy="35" r="8" fill="rgba(201,168,76,0.15)" stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>
                    <path d="M 96 35 L 99 38 L 104 31" stroke={GOLD} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    <text x="112" y="38" fill={GOLD} fontSize="8" fontFamily="Inter, sans-serif">Cột sống thẳng</text>
                  </svg>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {([
                      { icon: "✓", text: "Cột sống được đỡ theo đường cong tự nhiên — giảm áp lực đĩa đệm" },
                      { icon: "✓", text: "Đầu nâng nhẹ 15–30° — ngăn trào ngược axit hiệu quả" },
                      { icon: "✓", text: "Đường thở mở rộng — giảm ngáy và ngưng thở khi ngủ" },
                      { icon: "✓", text: "Chân nâng nhẹ — cải thiện tuần hoàn máu, giảm phù nề" },
                    ] as const).map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ color: GOLD, fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                        <span style={{ color: GRAY_LIGHT, fontSize: 12, lineHeight: 1.6, fontFamily: FONT_BODY }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* 4 lợi ích sức khỏe chính với giải thích khoa học */}
          <FadeIn delay={120}>
            <h3 style={{ textAlign: "center", color: GOLD, fontSize: 13, fontWeight: 600, letterSpacing: "0.15em", fontFamily: FONT_BODY, marginBottom: 28, textTransform: "uppercase" as const }}>
              {E({ bk: "health_benefits_title", def: "4 lợi ích sức khỏe được chứng minh khoa học", as: "span" })}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {([
                {
                  icon: "🦴",
                  bkTitle: "health_1_title", defTitle: "Giảm Đau Cột Sống",
                  bkSci: "health_1_sci", defSci: "Nghiên cứu từ Sleep Medicine Reviews",
                  bkDesc: "health_1_desc", defDesc: "Tư thế Zero Gravity phân bổ đều trọng lượng cơ thể, giảm 50% áp lực lên đĩa đệm L4-L5 so với nằm phẳng. Hiệu quả đặc biệt với người thoái hóa cột sống, đau thắt lưng mãn tính.",
                  bkStat: "health_1_stat", defStat: "Giảm 50% áp lực đĩa đệm",
                },
                {
                  icon: "😮‍💨",
                  bkTitle: "health_2_title", defTitle: "Chống Ngáy & Ngưng Thở",
                  bkSci: "health_2_sci", defSci: "Theo American Academy of Sleep Medicine",
                  bkDesc: "health_2_desc", defDesc: "Nâng đầu 15–30° mở rộng đường thở, giảm rung động mô mềm vùng họng. Hiệu quả với 78% người ngáy nhẹ đến trung bình. Bác sĩ khuyến nghị cho bệnh nhân ngưng thở khi ngủ nhẹ.",
                  bkStat: "health_2_stat", defStat: "78% giảm ngáy hiệu quả",
                },
                {
                  icon: "🫀",
                  bkTitle: "health_3_title", defTitle: "Cải Thiện Tuần Hoàn",
                  bkSci: "health_3_sci", defSci: "Theo Journal of Cardiovascular Medicine",
                  bkDesc: "health_3_desc", defDesc: "Nâng chân nhẹ 15–20° giúp máu tĩnh mạch trở về tim dễ dàng hơn, giảm phù nề chân sau ngày dài đứng hoặc ngồi. Đặc biệt có lợi cho người suy giãn tĩnh mạch.",
                  bkStat: "health_3_stat", defStat: "Giảm phù nề chân 60%",
                },
                {
                  icon: "🍽️",
                  bkTitle: "health_4_title", defTitle: "Ngăn Trào Ngược Axit",
                  bkSci: "health_4_sci", defSci: "Theo New England Journal of Medicine",
                  bkDesc: "health_4_desc", defDesc: "Nâng đầu giường 20–30° tận dụng trọng lực để giữ axit dạ dày không trào ngược thực quản. Nghiên cứu lâm sàng cho thấy giảm 67% triệu chứng GERD ban đêm so với nằm phẳng.",
                  bkStat: "health_4_stat", defStat: "Giảm 67% triệu chứng GERD",
                },
              ] as const).map((h, i) => (
                <FadeIn key={i} delay={i * 80}>
                  <div style={{ padding: "28px 22px", background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 32 }}>{h.icon}</div>
                    <div>
                      <h3 style={{ color: WHITE, fontSize: 15, fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 4, lineHeight: 1.3 }}>
                        {E({ bk: h.bkTitle, def: h.defTitle, as: "span" })}
                      </h3>
                      <div style={{ color: GOLD, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", fontFamily: FONT_BODY, opacity: 0.8 }}>
                        {E({ bk: h.bkSci, def: h.defSci, as: "span" })}
                      </div>
                    </div>
                    <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.75, fontFamily: FONT_BODY, flex: 1, margin: 0 }}>
                      {E({ bk: h.bkDesc, def: h.defDesc, as: "span", multiline: true })}
                    </p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: R_FULL, padding: "5px 12px", alignSelf: "flex-start" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, display: "inline-block", flexShrink: 0 }} />
                      <span style={{ color: GOLD, fontSize: 10, fontWeight: 700, fontFamily: FONT_BODY, letterSpacing: "0.05em" }}>
                        {E({ bk: h.bkStat, def: h.defStat, as: "span" })}
                      </span>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>

          {/* Disclaimer khoa học */}
          <FadeIn delay={200}>
            <p style={{ textAlign: "center", color: GRAY, fontSize: 11, marginTop: 28, fontFamily: FONT_BODY, fontStyle: "italic", lineHeight: 1.6 }}>
              * Các số liệu trích dẫn từ nghiên cứu khoa học quốc tế. GSF150 không phải thiết bị y tế. Tham khảo bác sĩ nếu có bệnh lý nghiêm trọng.
            </p>
          </FadeIn>
        </div>
      </section>
      {/* ── MARKETING / HOW IT WORKS ── */}
      <section style={{ background: `linear-gradient(135deg, #0D0B00 0%, #1A1200 40%, #0D0B00 100%)`, padding: "96px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1060, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.12)", border: `2px solid rgba(201,168,76,0.5)`, borderRadius: R_FULL, padding: "8px 20px", marginBottom: 20 }}>
                <span style={{ fontSize: 14 }}>🚀</span>
                <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Đơn giản đến không ngờ</span>
              </div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 16, fontFamily: FONT_HEADING, letterSpacing: "-0.02em", color: WHITE }}>
                {E({ bk: "howitworks_title", def: "Chỉ 3 Bước", as: "span" })}
              </h2>
              <div style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 700, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", marginBottom: 20, background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {E({ bk: "howitworks_subtitle", def: "Để Có Giường Thông Minh", as: "span" })}
              </div>
              <p style={{ color: GRAY_LIGHT, fontSize: "clamp(15px, 1.8vw, 18px)", lineHeight: 1.75, maxWidth: 680, margin: "0 auto 48px", fontFamily: FONT_BODY }}>
                {E({ bk: "howitworks_desc", def: "Không cần thợ lắp đặt. Không cần bỏ giường cũ. Không cần kiến thức kỹ thuật.", as: "span", multiline: true })}
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={200}>
            <div style={{ background: `linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%)`, border: `1px solid rgba(201,168,76,0.25)`, borderRadius: R_LG, padding: "40px 36px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24, alignItems: "start" }}>
                {[
                  { step: "01", icon: "📦", bkTitle: "step_1_title", defTitle: "Mở hộp", bkDesc: "step_1_desc", defDesc: "Sản phẩm được đóng gói gọn gàng. Kiểm tra đầy đủ phụ kiện: khung, remote, dây nguồn, chân rời.", bkImg: "howit_step_1_img" },
                  { step: "02", icon: "🛏️", bkTitle: "step_2_title", defTitle: "Đặt lên giường", bkDesc: "step_2_desc", defDesc: "Tháo chân khung, đặt trực tiếp vào lòng giường gỗ. Hoặc lắp chân nếu muốn dùng độc lập.", bkImg: "howit_step_2_img" },
                  { step: "03", icon: "⚡", bkTitle: "step_3_title", defTitle: "Cắm điện & Tận hưởng", bkDesc: "step_3_desc", defDesc: "Kết nối nguồn, nhấn remote — trải nghiệm ngay lập tức. Không cần kỹ thuật viên.", bkImg: "howit_step_3_img" },
                ].map((s, i) => {
                  const imgSrc = content[s.bkImg] || "";
                  return (
                  <div key={i} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 20, fontWeight: 700, color: "#1a1200", fontFamily: FONT_HEADING }}>{s.step}</div>
                    <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 6, fontFamily: FONT_BODY }}>BƯỚC {s.step}</div>
                    <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: FONT_HEADING }}>{E({ bk: s.bkTitle, def: s.defTitle, as: "span" })}</div>
                    <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.7, fontFamily: FONT_BODY, margin: "0 0 12px" }}>{E({ bk: s.bkDesc, def: s.defDesc, as: "span", multiline: true })}</p>
                    {(imgSrc || editMode) && (
                      <div style={{ position: "relative", width: "100%", paddingBottom: "100%", background: imgSrc ? "#fff" : "rgba(255,255,255,0.04)", overflow: "hidden", borderRadius: R_MD, border: `1px solid ${BLACK_BORDER}` }}>
                        {imgSrc ? (
                          <Image src={imgSrc} alt={s.defTitle} fill style={{ objectFit: "cover", objectPosition: "center" }} sizes="(max-width: 768px) 50vw, 25vw" loading="lazy" />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>Chưa có ảnh</div>
                        )}
                        {editMode && (
                          <>
                            <ImageUploadOverlay blockKey={s.bkImg} currentUrl={imgSrc} onUploaded={handleSaved} />
                            {imgSrc && (
                              <button
                                onClick={async (e) => { e.stopPropagation(); await fetch(`/api/admin/lp-content?slug=${LP_SLUG}&blockKey=${s.bkImg}`, { method: "DELETE" }); handleDeleted(s.bkImg); }}
                                style={{ position: "absolute", top: 8, right: 8, zIndex: 20, background: "rgba(239,68,68,0.9)", color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                              >×</button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={300}>
            <div style={{ textAlign: "center", marginTop: 52 }}>
              <p style={{ color: GRAY_LIGHT, fontSize: 15, marginBottom: 24, fontFamily: FONT_BODY }}>
                {E({ bk: "howitworks_cta_desc", def: "Đặt hàng ngay hôm nay — SmartFurni giao hàng và lắp đặt tận nơi trong vòng 3–5 ngày làm việc.", as: "span", multiline: true })}
              </p>
              <GoldButton onClick={scrollToForm} style={{ fontSize: 14, padding: "16px 40px", borderRadius: R_MD }}>
                {E({ bk: "cta_bottom_gold", def: "Đặt Hàng Ngay — Giao Hàng Toàn Quốc", as: "span" })}
              </GoldButton>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── INSTALL GUIDE ── */}
      <InstallGuideSection editMode={editMode} content={content} onSaved={handleSaved} onDeleted={handleDeleted} />


      {/* ── VIDEO UNBOXING / REVIEW KOL ── */}
      <section style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "video_review_label", def: "Video thực tế từ khách hàng", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 42px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "video_review_title_1", def: "Khách Hàng Nói Gì", as: "span", style: { display: "block" } })}
                {E({ bk: "video_review_title_2", def: "Về SmartFurni GSF150?", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 14, maxWidth: 520, margin: "0 auto", lineHeight: 1.7, fontFamily: FONT_BODY }}>
                {E({ bk: "video_review_subtitle", def: "Video thực tế từ khách hàng và KOL — không dàn dựng, không kịch bản.", as: "span", multiline: true })}
              </p>
            </div>
          </FadeIn>

          {/* Video chính — featured */}
          <FadeIn delay={80}>
            <div style={{ marginBottom: 32 }}>
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid rgba(201,168,76,0.2)`, boxShadow: "0 0 40px rgba(201,168,76,0.06)" }}>
                <YoutubeAutoplay
                  videoId={extractYoutubeId(content["vr_featured_url"] || "") || "_placeholder_"}
                  title={content["vr_featured_title"] || "SmartFurni GSF150 — Review thực tế"}
                />
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
                {/* Featured badge */}
                <div style={{ position: "absolute", top: 16, left: 16, background: `linear-gradient(135deg, ${GOLD}, #E2C97E)`, color: "#1A1000", fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: R_FULL, letterSpacing: "0.12em", fontFamily: FONT_BODY }}>
                  ★ NỔI BẬT
                </div>
              </div>
              {/* Caption video chính */}
              <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const }}>
                <div>
                  <div style={{ color: WHITE, fontSize: 15, fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 4 }}>
                    {E({ bk: "vr_featured_title", def: "Unboxing & Review GSF150 — Lắp đặt thực tế tại nhà", as: "span" })}
                  </div>
                  <div style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>
                    {E({ bk: "vr_featured_author", def: "Khách hàng thực tế · TP. Hồ Chí Minh", as: "span" })}
                  </div>
                </div>
                {editMode && (
                  <div style={{ background: "rgba(201,168,76,0.06)", border: `1px dashed ${GOLD}`, borderRadius: R_MD, padding: "10px 14px", minWidth: 260 }}>
                    <span style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>🎥 LINK VIDEO NỔI BẬT:</span>
                    {E({ bk: "vr_featured_url", def: "https://www.youtube.com/watch?v=PASTE_VIDEO_ID", as: "span", style: { fontSize: 12, color: GRAY_LIGHT, wordBreak: "break-all" as const } })}
                  </div>
                )}
              </div>
            </div>
          </FadeIn>

          {/* Grid 3 video phụ */}
          <FadeIn delay={120}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {([
                { urlKey: "vr_video_1_url", titleKey: "vr_video_1_title", defTitle: "Review sau 1 tháng sử dụng — Chị Minh Thư", authorKey: "vr_video_1_author", defAuthor: "Khách hàng · Quận 7, TP. HCM", tag: "Review 1 tháng" },
                { urlKey: "vr_video_2_url", titleKey: "vr_video_2_title", defTitle: "Lắp đặt GSF150 vào giường gỗ teak — Anh Hoàng", authorKey: "vr_video_2_author", defAuthor: "Khách hàng · Hà Nội", tag: "Hướng dẫn lắp" },
                { urlKey: "vr_video_3_url", titleKey: "vr_video_3_title", defTitle: "So sánh ngủ trước và sau khi dùng GSF150", authorKey: "vr_video_3_author", defAuthor: "KOL Sức khoẻ · YouTube", tag: "So sánh" },
              ] as const).map((v, i) => {
                const vidId = extractYoutubeId(content[v.urlKey] || "") || "_placeholder_";
                return (
                  <FadeIn key={i} delay={i * 80}>
                    <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden" }}>
                      {/* Thumbnail / embed */}
                      <div style={{ position: "relative" }}>
                        <YoutubeAutoplay videoId={vidId} title={content[v.titleKey] || v.defTitle} />
                        {/* Tag badge */}
                        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(10,10,8,0.85)", border: `1px solid rgba(201,168,76,0.3)`, color: GOLD, fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: R_FULL, letterSpacing: "0.1em", fontFamily: FONT_BODY, backdropFilter: "blur(4px)" }}>
                          {v.tag}
                        </div>
                      </div>
                      {/* Caption */}
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 4, lineHeight: 1.4 }}>
                          {E({ bk: v.titleKey, def: v.defTitle, as: "span" })}
                        </div>
                        <div style={{ color: GRAY, fontSize: 11, fontFamily: FONT_BODY }}>
                          {E({ bk: v.authorKey, def: v.defAuthor, as: "span" })}
                        </div>
                        {editMode && (
                          <div style={{ marginTop: 10, background: "rgba(201,168,76,0.04)", border: `1px dashed rgba(201,168,76,0.3)`, borderRadius: R_SM, padding: "8px 10px" }}>
                            <span style={{ color: GOLD, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", display: "block", marginBottom: 3 }}>🎥 LINK VIDEO {i + 1}:</span>
                            {E({ bk: v.urlKey, def: "https://www.youtube.com/watch?v=PASTE_VIDEO_ID", as: "span", style: { fontSize: 11, color: GRAY_LIGHT, wordBreak: "break-all" as const } })}
                          </div>
                        )}
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </FadeIn>

          {/* CTA xem thêm */}
          <FadeIn delay={200}>
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <a
                href={content["vr_channel_url"] || "https://www.youtube.com/@smartfurni"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, color: GOLD, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, textDecoration: "none", border: `1px solid rgba(201,168,76,0.3)`, borderRadius: R_FULL, padding: "10px 24px", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
              >
                <span>▶</span>
                {E({ bk: "vr_channel_cta", def: "Xem thêm video trên kênh YouTube SmartFurni →", as: "span" })}
              </a>
              {editMode && (
                <div style={{ marginTop: 10, color: GRAY, fontSize: 11, fontFamily: FONT_BODY }}>
                  Link kênh YouTube: {E({ bk: "vr_channel_url", def: "https://www.youtube.com/@smartfurni", as: "span", style: { color: GOLD } })}
                </div>
              )}
            </div>
          </FadeIn>
        </div>
      </section>
      {/* ── TRUST / SOCIAL PROOF ── */}
      <section id="danh-gia" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>{E({ bk: "trust_section_label", def: "Chứng nhận & Đánh giá", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "trust_title_1", def: "Được Tin Tưởng Bởi", as: "span", style: { display: "block" } })}
                {E({ bk: "trust_title_2", def: "Hàng Nghìn Gia Đình Việt", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          {/* Social proof numbers */}
          <FadeIn delay={50}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 48 }}>
              {([
                { num: "2.000+", label: "Gia đình đã sử dụng", icon: "🏠" },
                { num: "4.9/5", label: "Đánh giá trung bình", icon: "⭐" },
                { num: "98%", label: "Khách hàng hài lòng", icon: "💚" },
                { num: "63/63", label: "Tỉnh thành giao hàng", icon: "🚚" },
              ] as const).map((stat, i) => (
                <FadeIn key={i} delay={i * 60}>
                  <div style={{ padding: "24px 16px", textAlign: "center", background: "rgba(201,168,76,0.05)", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: R_LG }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon}</div>
                    <div style={{ color: GOLD, fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1 }}>{stat.num}</div>
                    <div style={{ color: GRAY, fontSize: 11, marginTop: 6, fontFamily: FONT_BODY, lineHeight: 1.4 }}>{stat.label}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
          {/* Chứng nhận */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 48 }}>
            {[
              { icon: "🏆", bkTitle: "cert_1_title", defTitle: "Motor Đức CE/TÜV", bkDesc: "cert_1_desc", defDesc: "Tiêu chuẩn xuất khẩu châu Âu, bảo hành 5 năm chính hãng" },
              { icon: "🔬", bkTitle: "cert_2_title", defTitle: "Công Thái Học ISO", bkDesc: "cert_2_desc", defDesc: "Chứng nhận ergonomic quốc tế ISO 9241 — thiết kế bảo vệ cột sống" },
              { icon: "⚡", bkTitle: "cert_3_title", defTitle: "Tải Trọng 300kg", bkDesc: "cert_3_desc", defDesc: "Khung thép cường lực, kiểm định 50.000 lần nâng hạ" },
              { icon: "🛡️", bkTitle: "cert_4_title", defTitle: "An Toàn Điện", bkDesc: "cert_4_desc", defDesc: "Điện áp thấp 24V DC, chứng nhận TCVN an toàn tuyệt đối" },
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
          {/* Reviews — 6 reviews */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {[
              { bkName: "testimonial_1_name", defName: "Chị Minh Thư", bkLoc: "testimonial_1_loc", defLoc: "Quận 7, TP. HCM", bkQuote: "testimonial_1_quote", defQuote: "Chồng tôi ngủ ngáy rất to, từ khi có GSF150 nâng nhẹ đầu giường lên, anh ấy gần như không ngáy nữa. Cả hai vợ chồng đều ngủ ngon hơn hẳn.", stars: 5 },
              { bkName: "testimonial_2_name", defName: "Anh Hoàng Minh", bkLoc: "testimonial_2_loc", defLoc: "Cầu Giấy, Hà Nội", bkQuote: "testimonial_2_quote", defQuote: "Tôi bị thoái hóa đốt sống cổ, bác sĩ khuyên nên ngủ tư thế nâng đầu. GSF150 giải quyết đúng vấn đề đó. Sau 2 tuần, cơn đau giảm rõ rệt.", stars: 5 },
              { bkName: "testimonial_3_name", defName: "Chị Lan Anh", bkLoc: "testimonial_3_loc", defLoc: "Bình Dương", bkQuote: "testimonial_3_quote", defQuote: "Tôi không muốn bỏ chiếc giường gỗ teak đắt tiền. GSF150 đặt vừa khít vào lòng giường, trông rất đẹp và sang. Đúng là giải pháp hoàn hảo!", stars: 5 },
              { bkName: "testimonial_4_name", defName: "Anh Tuấn Anh", bkLoc: "testimonial_4_loc", defLoc: "Quận 1, TP. HCM", bkQuote: "testimonial_4_quote", defQuote: "Làm việc văn phòng cả ngày, tối về lưng đau kinh khủng. Từ khi dùng chế độ Zero Gravity của GSF150, sáng dậy thoải mái hẳn. Đáng đồng tiền bát gạo!", stars: 5 },
              { bkName: "testimonial_5_name", defName: "Chị Thu Hà", bkLoc: "testimonial_5_loc", defLoc: "Đống Đa, Hà Nội", bkQuote: "testimonial_5_quote", defQuote: "Ban đầu tôi lo lắng lắp không vừa giường gỗ nhà mình. Nhưng đội kỹ thuật SmartFurni đến đo và lắp rất chuyên nghiệp, chỉ 20 phút là xong.", stars: 5 },
              { bkName: "testimonial_6_name", defName: "Anh Minh Khoa", bkLoc: "testimonial_6_loc", defLoc: "Thủ Đức, TP. HCM", bkQuote: "testimonial_6_quote", defQuote: "Mua cho bố mẹ 70 tuổi. Bố hay đau lưng, giờ tự điều chỉnh tư thế bằng remote rất dễ. Mẹ thích nhất chế độ nâng đầu khi xem TV buổi tối.", stars: 5 },
            ].map((t, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div style={{ padding: "28px 24px", background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>{Array.from({ length: t.stars }).map((_, j) => <span key={j} style={{ color: GOLD, fontSize: 14 }}>★</span>)}</div>
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


      {/* ── CAM KẾT & CHÍNH SÁCH ── */}
      <section style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>{E({ bk: "guarantee_section_label", def: "Mua hàng an tâm", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "guarantee_title_1", def: "SmartFurni Cam Kết", as: "span", style: { display: "block" } })}
                {E({ bk: "guarantee_title_2", def: "Mua Hàng Không Rủi Ro", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
              {([
                { icon: "🔄", bkTitle: "guarantee_1_title", defTitle: "Đổi trả 30 ngày", bkDesc: "guarantee_1_desc", defDesc: "Không hài lòng trong 30 ngày đầu — SmartFurni thu hồi và hoàn tiền 100%, không hỏi lý do." },
                { icon: "🛡️", bkTitle: "guarantee_2_title", defTitle: "Bảo hành 5 năm", bkDesc: "guarantee_2_desc", defDesc: "Motor bảo hành 5 năm chính hãng. Đổi mới ngay lập tức nếu có lỗi nhà sản xuất." },
                { icon: "🚚", bkTitle: "guarantee_3_title", defTitle: "Giao hàng kiểm tra", bkDesc: "guarantee_3_desc", defDesc: "Kiểm tra hàng trước khi nhận. Không ưng — không cần nhận, không mất phí." },
                { icon: "🔧", bkTitle: "guarantee_4_title", defTitle: "Lắp đặt miễn phí", bkDesc: "guarantee_4_desc", defDesc: "Đội kỹ thuật SmartFurni lắp đặt tận nơi toàn quốc. Hướng dẫn sử dụng chi tiết." },
                { icon: "💳", bkTitle: "guarantee_5_title", defTitle: "Trả góp 0%", bkDesc: "guarantee_5_desc", defDesc: "Hỗ trợ trả góp 0% lãi suất qua các đối tác tài chính uy tín. Duyệt nhanh trong ngày." },
                { icon: "📞", bkTitle: "guarantee_6_title", defTitle: "Hỗ trợ 7/7", bkDesc: "guarantee_6_desc", defDesc: "Hotline & Zalo hỗ trợ 7 ngày/tuần. Kỹ thuật viên phản hồi trong vòng 2 giờ làm việc." },
              ] as const).map((g, i) => (
                <FadeIn key={i} delay={i * 60}>
                  <div style={{ padding: "28px 20px", background: "rgba(201,168,76,0.04)", border: `1px solid rgba(201,168,76,0.18)`, borderRadius: R_LG, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 32 }}>{g.icon}</div>
                    <div style={{ color: GOLD, fontSize: 14, fontWeight: 700, fontFamily: FONT_HEADING }}>
                      {E({ bk: g.bkTitle, def: g.defTitle, as: "span" })}
                    </div>
                    <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>
                      {E({ bk: g.bkDesc, def: g.defDesc, as: "span", multiline: true })}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>
      {/* ── FAQ ── */}
      <section id="faq" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "faq_section_label", def: "Câu hỏi thường gặp", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "faq_title_1", def: "Giải Đáp Thắc Mắc", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 8 }}>
                {E({ bk: "faq_title_2", def: "Của Khách Hàng", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <FaqAccordion E={E} />
        </div>
      </section>


      {/* ── URGENCY TRIGGER ── */}
      <UrgencyBanner E={E} />
      {/* ── FORM ── */}
      <section id="register-form" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <SectionLabel>{E({ bk: "form_section_label", def: "Đặt hàng ngay", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 14, fontFamily: FONT_HEADING, letterSpacing: "-0.01em" }}>
                {E({ bk: "form_title_1", def: "Đừng Để Cơn Đau Lưng", as: "span", style: { display: "block" } })}
                {E({ bk: "form_title_2", def: "Làm Phiền Giấc Ngủ Của Bạn", as: "span", style: { color: GOLD, display: "block" } })}
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.75, fontFamily: FONT_BODY }}>
                {E({ bk: "form_subtitle", def: "Điền thông tin bên dưới — đội ngũ tư vấn sẽ liên hệ trong vòng 2 giờ làm việc", as: "span", multiline: true })}
              </p>
            </div>
          </FadeIn>
          {editMode && (
            <div style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "rgba(201,168,76,0.06)",
              border: `1px dashed ${GOLD}`,
              borderRadius: R_MD,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, whiteSpace: "nowrap" as const, flexShrink: 0 }}>NÚT ĐẶT HÀNG:</span>
              <div style={{ flex: 1 }}>
                {E({ bk: "form_submit", def: "Tư Vấn & Đặt Hàng Ngay →", as: "span", style: { fontSize: 13, fontWeight: 600, color: WHITE, fontFamily: FONT_BODY } })}
              </div>
            </div>
          )}
          <FadeIn delay={100}><LeadForm submitLabel={content["form_submit"] || undefined} /></FadeIn>
        </div>
      </section>


      {/* ── STICKY CTA MOBILE ── */}
      <StickyCta scrollToForm={scrollToForm} E={E} />
      {/* ── FOOTER ── */}
      <footer style={{ background: "#060500", borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 64 }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, opacity: 0.5 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 32px 0" }}>
          <div
            className="lp-footer-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1.2fr 1.2fr 1fr",
              gap: "48px 40px",
              marginBottom: 52,
            }}>
            <div>
              <div style={{ marginBottom: 20 }}>
                <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" loading="lazy" style={{ height: 48, objectFit: "contain", filter: "brightness(1.05)" }} />
              </div>
              <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.85, fontFamily: FONT_BODY, marginBottom: 24, maxWidth: 280 }}>
                {E({ bk: "footer_about", def: "Tiên phong trong lĩnh vực giường công thái học điều chỉnh điện tại Việt Nam. Chất lượng Đức — Thiết kế Việt.", as: "span", multiline: true })}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Facebook", icon: "f", href: "https://facebook.com/smartfurni" },
                  { label: "YouTube", icon: "▶", href: "https://youtube.com/@smartfurni" },
                  { label: "Zalo", icon: "Z", href: "https://zalo.me/0918326552" },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY, textDecoration: "none", transition: "background 0.2s, border-color 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.18)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = GOLD; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.08)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(201,168,76,0.25)"; }}
                  >{s.icon}</a>
                ))}
              </div>
            </div>
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
              <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.75, fontFamily: FONT_BODY, marginBottom: 20 }}>
                {E({ bk: "footer_cta_desc", def: "Nhận tư vấn miễn phí & xác nhận đơn hàng trong vòng 2 giờ làm việc.", as: "span", multiline: true })}
              </p>
              <a href="#register-form"
                style={{ display: "block", textAlign: "center", background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, #9A7A2E 100%)`, color: BLACK, fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "13px 20px", borderRadius: R_MD, textDecoration: "none", fontFamily: FONT_BODY, boxShadow: "0 6px 24px rgba(201,168,76,0.25)", marginBottom: 12 }}>
                {E({ bk: "footer_cta_primary", def: "Đặt hàng ngay →", as: "span" })}
              </a>
              <a href="https://zalo.me/0918326552" target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", background: "transparent", color: GRAY_LIGHT, fontWeight: 500, fontSize: 11, letterSpacing: "0.06em", padding: "12px 20px", borderRadius: R_MD, textDecoration: "none", fontFamily: FONT_BODY, border: `1px solid rgba(212,196,160,0.2)` }}>
                {E({ bk: "footer_cta_zalo", def: "💬 Chat Zalo ngay", as: "span" })}
              </a>
            </div>
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${BLACK_BORDER} 20%, ${BLACK_BORDER} 80%, transparent)`, marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12, paddingBottom: 28 }}>
            <p style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT_BODY, margin: 0 }}>
              {E({ bk: "footer_copyright", def: "© 2025 Công ty Cổ phần SmartFurni. Tất cả quyền được bảo lưu.", as: "span" })}
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Chính sách bảo mật", href: "/privacy" },
                { label: "Điều khoản sử dụng", href: "/terms" },
                { label: "Chính sách bảo hành", href: "/bao-hanh" },
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
