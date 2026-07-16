"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { EditableText } from "@/components/lp/EditableText";
import { LpEditBar } from "@/components/lp/LpEditBar";

const GOLD = "#8B6914";
const GOLD_LIGHT = "#B8922A";
const GOLD_PALE = "#C9A84C";
const CREAM = "#FDFAF5";
const CREAM_SOFT = "#F4F7FA";
const CARD = "#FFFFFF";
const BORDER = "rgba(139,105,20,0.15)";
const TEXT = "#1A1200";
const TEXT_MUTED = "#4A3F2F";
const TEXT_SOFT = "#7A6A55";
const DARK = "#0D0B08";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const R_SM = 8;
const R_MD = 12;
const R_LG = 18;
const THANK_YOU_SLUG = "thank-you";
const DEFAULT_CONTACT_PHONE_NUMBER = "0918326552";

type EditableTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "li";

type EditableArgs = {
  bk: string;
  def: string;
  as?: EditableTag;
  style?: React.CSSProperties;
  multiline?: boolean;
};

type Props = {
  isEditor?: boolean;
  initialContent?: Record<string, string>;
  sourceSlug?: string;
  sourcePath?: string;
};

function normalizePhoneNumber(value: string) {
  return (value || "").replace(/[^0-9+]/g, "");
}

function formatPhoneDisplay(value: string) {
  const digits = normalizePhoneNumber(value);
  if (!digits) return "0918.326.552";
  if (/^0\d{9}$/.test(digits)) return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
  return value || digits;
}

function makePhoneHref(value: string) {
  const digits = normalizePhoneNumber(value) || DEFAULT_CONTACT_PHONE_NUMBER;
  return `tel:${digits}`;
}

function makeZaloHref(value: string) {
  const digits = normalizePhoneNumber(value) || DEFAULT_CONTACT_PHONE_NUMBER;
  return `https://zalo.me/${digits.replace(/^\+?84/, "0")}`;
}

function FooterSvgIcon({ name, size = 16, color = "currentColor", style }: { name: string; size?: number; color?: string; style?: React.CSSProperties }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactElement> = {
    map_pin: <svg {...common}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    factory: <svg {...common}><path d="M2 20V9l6-4v4l6-4v4l6-4v15H2z" /><line x1="2" y1="20" x2="22" y2="20" /><rect x="9" y="14" width="2" height="6" /><rect x="13" y="14" width="2" height="6" /></svg>,
    phone: <svg {...common}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.16a16 16 0 006.93 6.93l1.52-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>,
    message_circle: <svg {...common}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
    mail: <svg {...common}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    globe: <svg {...common}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
  };

  return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, color, flexShrink: 0, ...style }}>{paths[name] || null}</span>;
}

export default function ThankYouClient({ isEditor = false, initialContent = {}, sourceSlug = "", sourcePath = "/lp/smf12" }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [editedCount, setEditedCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSaved = useCallback((key: string, val: string) => {
    setContent(prev => ({ ...prev, [key]: val }));
    setEditedCount(c => c + 1);
  }, []);

  const handleDeleted = useCallback((key: string) => {
    setContent(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setEditedCount(c => c + 1);
  }, []);

  const E = useCallback(({ bk, def, as, style, multiline }: EditableArgs) => (
    <EditableText
      slug={THANK_YOU_SLUG}
      blockKey={bk}
      defaultValue={def}
      editMode={editMode}
      as={as}
      style={style}
      multiline={multiline}
      savedValue={content[bk]}
      onSaved={handleSaved}
      onDeleted={handleDeleted}
    />
  ), [content, editMode, handleSaved, handleDeleted]);

  const contactPhone = content.tracking_contact_hotline || DEFAULT_CONTACT_PHONE_NUMBER;
  const contactPhoneDisplay = formatPhoneDisplay(contactPhone);
  const contactPhoneHref = makePhoneHref(contactPhone);
  const contactZalo = content.tracking_contact_zalo || contactPhone;
  const contactZaloDisplay = formatPhoneDisplay(contactZalo);
  const contactZaloHref = makeZaloHref(contactZalo);

  const menuItems = useMemo(() => ([
    { href: "/lp/smf12#product-detail", label: "Tính năng" },
    { href: "/lp/smf12#products", label: "Sản phẩm" },
    { href: "/lp/smf12#benefits", label: "Lợi ích" },
    { href: "/lp/smf12#testimonials", label: "Đánh giá" },
    { href: "/lp/smf12#register-form", label: "Đặt hàng" },
  ]), []);

  const sourceLabel = sourceSlug ? `Nguồn đặt hàng: ${sourceSlug}` : "Trang cảm ơn đặt hàng SmartFurni";

  return (
    <div style={{ fontFamily: FONT_BODY, background: CREAM, color: TEXT, minHeight: "100vh" }}>
      {isEditor && (
        <LpEditBar isEditor={isEditor} editMode={editMode} onToggleEditMode={() => setEditMode(v => !v)} editedCount={editedCount} slug={THANK_YOU_SLUG} />
      )}

      <nav style={{ position: "sticky", top: isEditor ? 48 : 0, left: 0, right: 0, zIndex: 100, background: "rgba(18,14,4,0.97)", borderBottom: "1px solid rgba(139,105,20,0.25)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link href="/lp/smf12" style={{ flexShrink: 0, textDecoration: "none" }}>
            <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 44, objectFit: "contain", filter: "brightness(1.05)" }} />
          </Link>

          <div className="lp-thankyou-nav-menu" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
            {menuItems.map(item => (
              <Link key={item.href} href={item.href} style={{ color: "rgba(253,250,245,0.82)", fontSize: 13, fontWeight: 500, padding: "8px 14px", borderRadius: R_SM, letterSpacing: "0.01em", whiteSpace: "nowrap", textDecoration: "none" }}>
                {item.label}
              </Link>
            ))}
          </div>

          <Link className="lp-thankyou-nav-cta" href="/lp/smf12#register-form" style={{ flexShrink: 0, background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`, color: CREAM, border: "none", padding: "9px 20px", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: R_MD, textDecoration: "none", whiteSpace: "nowrap" }}>
            Đặt hàng ngay
          </Link>

          <button className="lp-thankyou-hamburger" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu" style={{ background: "none", border: "1px solid rgba(201,168,76,0.45)", borderRadius: R_SM, padding: "8px 10px", cursor: "pointer", display: "none", flexDirection: "column", gap: 5, flexShrink: 0 }}>
            {[0, 1, 2].map(i => <span key={i} style={{ display: "block", width: 20, height: 1.5, background: GOLD_PALE, borderRadius: 1 }} />)}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div style={{ position: "fixed", top: isEditor ? 116 : 68, left: 0, right: 0, zIndex: 99, background: "rgba(253,250,245,0.98)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${BORDER}`, padding: "16px 24px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {menuItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} style={{ color: TEXT_MUTED, fontSize: 15, fontWeight: 500, padding: "14px 16px", borderRadius: R_SM, letterSpacing: "0.02em", textDecoration: "none" }}>
                {item.label}
              </Link>
            ))}
            <Link href="/lp/smf12#register-form" onClick={() => setMobileMenuOpen(false)} style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`, color: CREAM, padding: "14px 20px", fontWeight: 700, fontSize: 13, textTransform: "uppercase", borderRadius: R_MD, letterSpacing: "0.08em", textDecoration: "none", textAlign: "center", marginTop: 8 }}>
              Đặt hàng ngay
            </Link>
          </div>
        </div>
      )}

      <main style={{ background: `radial-gradient(circle at 50% 0%, rgba(201,168,76,0.16), transparent 38%), ${CREAM}`, padding: "56px 16px 70px" }}>
        <section style={{ maxWidth: 920, margin: "0 auto", minHeight: "calc(100vh - 260px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", overflow: "hidden", borderRadius: 32, border: `1px solid ${BORDER}`, background: CARD, boxShadow: "0 24px 80px rgba(76,58,35,0.16)" }}>
            <div style={{ background: "linear-gradient(135deg, #FFF8EB 0%, #FFFFFF 48%, #F1E5D0 100%)", padding: "56px 28px 60px", textAlign: "center" }}>
              <div style={{ margin: "0 auto 26px", display: "flex", height: 88, width: 88, alignItems: "center", justifyContent: "center", borderRadius: "50%", border: `1px solid ${GOLD_PALE}`, background: "#FFF8E6", boxShadow: "inset 0 0 24px rgba(201,168,76,0.18)" }}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" stroke="#172026" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div style={{ marginBottom: 14, color: GOLD, fontSize: 13, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase" }}>
                {E({ bk: "thank_you_eyebrow", def: "SmartFurni đã nhận đơn hàng", as: "span" })}
              </div>

              <h1 style={{ margin: "0 auto", maxWidth: 760, color: "#172026", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.04em" }}>
                {E({ bk: "thank_you_title", def: "Cảm ơn Quý Khách đã đặt hàng thành công!", as: "span" })}
              </h1>

              <p style={{ margin: "24px auto 0", maxWidth: 720, color: "#52616B", fontSize: "clamp(16px, 2vw, 20px)", lineHeight: 1.9 }}>
                {E({ bk: "thank_you_description", def: "Đội ngũ SmartFurni sẽ kiểm tra đơn hàng và liên hệ qua Zalo hoặc điện thoại trong thời gian sớm nhất để xác nhận thông tin, thời gian giao hàng và ưu đãi phù hợp.", as: "span", multiline: true })}
              </p>

              <div style={{ margin: "30px auto 0", display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                <Link href={contactZaloHref} target="_blank" rel="noopener noreferrer" style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`, color: CREAM, borderRadius: 999, padding: "14px 24px", fontSize: 14, fontWeight: 800, letterSpacing: "0.05em", textDecoration: "none", textTransform: "uppercase" }}>
                  {E({ bk: "thank_you_primary_cta", def: "Chat Zalo với SmartFurni", as: "span" })}
                </Link>
                <Link href={sourcePath || "/lp/smf12"} style={{ background: "rgba(255,255,255,0.7)", color: GOLD, border: `1px solid ${GOLD_PALE}`, borderRadius: 999, padding: "14px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                  {E({ bk: "thank_you_secondary_cta", def: "Quay lại trang sản phẩm", as: "span" })}
                </Link>
              </div>

              {isEditor && (
                <p style={{ margin: "22px 0 0", color: TEXT_SOFT, fontSize: 12 }}>{sourceLabel}</p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer style={{ background: DARK, borderTop: "1px solid rgba(201,168,76,0.12)", paddingTop: 64 }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, opacity: 0.5 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 32px 0" }}>
          <div className="lp-thankyou-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1.2fr 1.2fr 1fr", gap: "48px 40px", marginBottom: 52 }}>
            <div>
              <div style={{ marginBottom: 20 }}><img src="/smartfurni-logo-transparent.png" alt="SmartFurni" loading="lazy" style={{ height: 48, objectFit: "contain", filter: "brightness(1.05)" }} /></div>
              <p style={{ color: "#B7A98E", fontSize: 13, lineHeight: 1.85, marginBottom: 24, maxWidth: 280 }}>{E({ bk: "footer_brand_desc", def: "Tiên phong trong lĩnh vực nội thất cá nhân hoá tại Việt Nam. Sofa giường thiết kế theo ý bạn — sản xuất tại Việt Nam.", as: "span", multiline: true })}</p>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ label: "Facebook", icon: "f", href: "https://facebook.com/smartfurni" }, { label: "YouTube", icon: "▶", href: "https://youtube.com/@smartfurni" }, { label: "Zalo", icon: "Z", href: contactZaloHref }].map(s => (
                  <Link key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD_PALE, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{s.icon}</Link>
                ))}
              </div>
            </div>

            <div>
              <FooterTitle>{E({ bk: "footer_showroom_title", def: "Showroom", as: "span" })}</FooterTitle>
              {[
                { icon: "map_pin", labelKey: "footer_showroom_1_label", label: "TP. HCM", valKey: "footer_showroom_1_value", val: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức" },
                { icon: "map_pin", labelKey: "footer_showroom_2_label", label: "Hà Nội", valKey: "footer_showroom_2_value", val: "B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông" },
                { icon: "factory", labelKey: "footer_showroom_3_label", label: "Xưởng SX", valKey: "footer_showroom_3_value", val: "202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
                  <FooterSvgIcon name={a.icon} size={16} color={GOLD_PALE} style={{ marginTop: 2 }} />
                  <div><div style={{ color: "#E4C56F", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{E({ bk: a.labelKey, def: a.label, as: "span" })}</div><div style={{ color: "#B7A98E", fontSize: 12, lineHeight: 1.65 }}>{E({ bk: a.valKey, def: a.val, as: "span", multiline: true })}</div></div>
                </div>
              ))}
            </div>

            <div>
              <FooterTitle>{E({ bk: "footer_contact_title", def: "Liên hệ", as: "span" })}</FooterTitle>
              {[
                { icon: "phone", labelKey: "footer_contact_1_label", label: "Hotline", valKey: "footer_contact_1_value", val: contactPhoneDisplay, href: contactPhoneHref },
                { icon: "message_circle", labelKey: "footer_contact_2_label", label: "Zalo tư vấn", valKey: "footer_contact_2_value", val: contactZaloDisplay, href: contactZaloHref },
                { icon: "mail", labelKey: "footer_contact_3_label", label: "Email", valKey: "footer_contact_3_value", val: "info@smartfurni.vn", href: "mailto:info@smartfurni.vn" },
                { icon: "globe", labelKey: "footer_contact_4_label", label: "Website", valKey: "footer_contact_4_value", val: "smartfurni.com.vn", href: "https://www.smartfurni.com.vn" },
              ].map((c, i) => (
                <Link key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start", textDecoration: "none" }}>
                  <FooterSvgIcon name={c.icon} size={16} color={GOLD_PALE} style={{ marginTop: 2 }} />
                  <div><div style={{ color: "#B7A98E", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 1 }}>{E({ bk: c.labelKey, def: c.label, as: "span" })}</div><div style={{ color: "#E4C56F", fontSize: 13, fontWeight: 700 }}>{E({ bk: c.valKey, def: c.val, as: "span" })}</div></div>
                </Link>
              ))}
            </div>

            <div>
              <FooterTitle>{E({ bk: "footer_order_title", def: "Đặt hàng ngay", as: "span" })}</FooterTitle>
              <p style={{ color: "#B7A98E", fontSize: 12, lineHeight: 1.75, marginBottom: 20 }}>{E({ bk: "footer_order_desc", def: "Nhận tư vấn miễn phí & xác nhận đơn hàng trong vòng 2 giờ làm việc.", as: "span", multiline: true })}</p>
              <Link href="/lp/smf12#register-form" style={{ display: "block", width: "100%", textAlign: "center", background: `linear-gradient(135deg, ${GOLD_PALE} 0%, ${GOLD} 100%)`, color: DARK, fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", padding: "13px 20px", borderRadius: R_MD, textDecoration: "none", boxShadow: "0 6px 24px rgba(201,168,76,0.25)", marginBottom: 12 }}>{E({ bk: "footer_order_cta", def: "Đặt hàng ngay →", as: "span" })}</Link>
              <Link href={contactZaloHref} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", background: "transparent", color: "#D9CBAE", fontWeight: 500, fontSize: 11, letterSpacing: "0.06em", padding: "12px 20px", borderRadius: R_MD, textDecoration: "none", border: "1px solid rgba(212,196,160,0.2)" }}>{E({ bk: "footer_zalo_cta", def: "Chat Zalo ngay", as: "span" })}</Link>
            </div>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.12) 20%, rgba(201,168,76,0.12) 80%, transparent)", marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, paddingBottom: 28 }}>
            <p style={{ color: "#3A3020", fontSize: 11, margin: 0 }}>{E({ bk: "footer_copyright", def: "© 2025 Công ty Cổ phần SmartFurni. Tất cả quyền được bảo lưu.", as: "span" })}</p>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { labelKey: "footer_policy_privacy", label: "Chính sách bảo mật", href: "/privacy" },
                { labelKey: "footer_policy_terms", label: "Điều khoản sử dụng", href: "/terms" },
                { labelKey: "footer_policy_warranty", label: "Chính sách bảo hành", href: "/bao-hanh" },
              ].map(l => <Link key={l.label} href={l.href} style={{ color: "#3A3020", fontSize: 11, textDecoration: "none" }}>{E({ bk: l.labelKey, def: l.label, as: "span" })}</Link>)}
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @media (max-width: 900px) {
          .lp-thankyou-nav-menu, .lp-thankyou-nav-cta { display: none !important; }
          .lp-thankyou-hamburger { display: flex !important; }
          .lp-thankyou-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .lp-thankyou-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function FooterTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
      <div style={{ width: 3, height: 16, background: GOLD_PALE, borderRadius: 2 }} />
      <h4 style={{ color: GOLD_PALE, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>{children}</h4>
    </div>
  );
}
