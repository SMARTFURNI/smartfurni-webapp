"use client";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";

// ─── Design tokens (giống landing page) ──────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E2C97E";
const BLACK_BG = "#060500";
const BLACK_BORDER = "#2E2800";
const GRAY = "#A89070";
const GRAY_LIGHT = "#D4C4A0";
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

interface FooterProps {
  theme: SiteTheme;
  variant?: "full" | "minimal";
}

// ─── Column header với accent bar vàng (giống landing page) ──────────────────
function ColHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
      <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
      <h4 style={{
        color: GOLD, fontSize: 10, fontWeight: 700,
        letterSpacing: "0.2em", textTransform: "uppercase",
        fontFamily: FONT, margin: 0,
      }}>
        {label}
      </h4>
    </div>
  );
}

// ─── Default data (fallback khi theme chưa có dữ liệu) ───────────────────────
const DEFAULT_SHOWROOMS = [
  { icon: "📍", label: "TP. Hồ Chí Minh", address: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức", phone: "028.7122.0818", hours: "8:00 – 21:00 (Thứ 2 – Chủ nhật)", mapUrl: "https://maps.google.com/?q=74+Nguyen+Thi+Nhung+Thu+Duc", badge: "Flagship" },
  { icon: "📍", label: "Hà Nội", address: "B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông", phone: "024.7109.0818", hours: "8:00 – 21:00 (Thứ 2 – Chủ nhật)", mapUrl: "https://maps.google.com/?q=Geleximco+B+Le+Trong+Tan+Ha+Dong", badge: "Showroom" },
  { icon: "🏭", label: "Xưởng SX", address: "202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn", phone: "028.7122.0818", hours: "8:00 – 17:00 (Thứ 2 – Thứ 7)", mapUrl: "https://maps.google.com/?q=202+Nguyen+Thi+Sang+Dong+Thanh+Hoc+Mon", badge: "Xưởng" },
];

const DEFAULT_CONTACTS = [
  { icon: "📞", label: "Hotline", value: "028.7122.0818", href: "tel:02871220818" },
  { icon: "💬", label: "Zalo tư vấn", value: "0918.326.552", href: "https://zalo.me/0918326552" },
  { icon: "✉️", label: "Email", value: "info@smartfurni.vn", href: "mailto:info@smartfurni.vn" },
  { icon: "🌐", label: "Website", value: "smartfurni.vn", href: "https://smartfurni.vn" },
];

const DEFAULT_POLICY_LINKS = [
  { label: "Chính sách bảo hành", href: "/warranty" },
  { label: "Chính sách đổi trả", href: "/returns" },
  { label: "Chính sách bảo mật", href: "/privacy" },
  { label: "Điều khoản sử dụng", href: "/terms" },
  { label: "Chính sách đại lý", href: "/lp/doi-tac-showroom-nem" },
  { label: "Hướng dẫn sử dụng", href: "/blog?category=Hướng Dẫn Sử Dụng" },
  { label: "Câu hỏi thường gặp", href: "/contact#faq" },
];

export default function Footer({ theme, variant = "full" }: FooterProps) {
  const { footer, layout } = theme;

  // ── Đọc dữ liệu động từ theme (fallback về default nếu chưa có) ──────────────────────────────────────────────
  const showrooms = (footer.showrooms?.length ? footer.showrooms : DEFAULT_SHOWROOMS) as typeof DEFAULT_SHOWROOMS;
  const contacts = (footer.contacts?.length ? footer.contacts : DEFAULT_CONTACTS) as typeof DEFAULT_CONTACTS;
  const policyLinks = (footer.policyLinks?.length ? footer.policyLinks : DEFAULT_POLICY_LINKS) as typeof DEFAULT_POLICY_LINKS;
  const aboutText = footer.aboutText || footer.tagline || "Nâng tầm giấc ngủ của bạn";
  const ctaText = footer.ctaText || "Đăng ký đối tác →";
  const ctaHref = footer.ctaHref || "/lp/doi-tac-showroom-nem#dang-ky";
  const ctaZaloText = footer.ctaZaloText || "💬 Chat Zalo ngay";
  const ctaZaloHref = footer.ctaZaloHref || "https://zalo.me/0918326552";
  const zaloSocial = footer.socialLinks.zalo || "";

  // ── Minimal variant ──────────────────────────────────────────────────────────────────
  if (variant === "minimal") {
    return (
      <footer style={{ background: BLACK_BG, borderTop: `1px solid ${BLACK_BORDER}` }}>
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, opacity: 0.4 }} />
        <div style={{ maxWidth: layout.maxWidth, margin: "0 auto", padding: "20px 24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/smartfurni-logo-transparent.png" alt={footer.companyName} style={{ height: 36, objectFit: "contain" }} />
            </Link>
            <p style={{ color: GRAY, fontSize: 11, fontFamily: FONT, margin: 0 }}>{footer.copyrightText}</p>
            <div style={{ display: "flex", gap: 20 }}>
              {[{ label: "Trang chủ", href: "/" }, { label: "Sản phẩm", href: "/products" }, { label: "Liên hệ", href: "/contact" }].map((link) => (
                <Link key={link.href} href={link.href} style={{ color: GRAY, fontSize: 11, fontFamily: FONT, textDecoration: "none" }}>{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // ── Full footer ──────────────────────────────────────────────────────────────
  return (
    <footer style={{ background: BLACK_BG, borderTop: `1px solid ${BLACK_BORDER}` }}>
      {/* Top gold accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, opacity: 0.5 }} />

      <div style={{ maxWidth: layout.maxWidth, margin: "0 auto", padding: "56px 24px 0" }}>
        {/* ── Main grid: 5 cột ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr", gap: "48px 32px", marginBottom: 52 }} className="footer-main-grid">

          {/* Cột 1: Brand */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <Link href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/smartfurni-logo-transparent.png" alt={footer.companyName} style={{ height: 48, objectFit: "contain", filter: "brightness(1.05)" }} />
              </Link>
            </div>
            <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.85, fontFamily: FONT, marginBottom: 24, maxWidth: 280 }}>
              {aboutText}
            </p>
            {/* Social links */}
            <div style={{ display: "flex", gap: 10 }}>
              {footer.showSocialLinks && footer.socialLinks.facebook && (
                <a href={footer.socialLinks.facebook} target="_blank" rel="noopener noreferrer" title="Facebook"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: "none" }}>
                  f
                </a>
              )}
              {footer.showSocialLinks && footer.socialLinks.youtube && (
                <a href={footer.socialLinks.youtube} target="_blank" rel="noopener noreferrer" title="YouTube"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: "none" }}>
                  ▶
                </a>
              )}
              {footer.showSocialLinks && zaloSocial && (
                <a href={zaloSocial} target="_blank" rel="noopener noreferrer" title="Zalo"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT, textDecoration: "none" }}>
                  Z
                </a>
              )}
              {footer.showSocialLinks && footer.socialLinks.tiktok && (
                <a href={footer.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" title="TikTok"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 11, fontWeight: 700, fontFamily: FONT, textDecoration: "none" }}>
                  TK
                </a>
              )}
            </div>
          </div>

          {/* Cột 2: Showroom — đọc từ theme */}
          <div>
            <ColHeader label="Showroom" />
            {showrooms.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                <div>
                  <div style={{ color: GOLD_LIGHT, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: FONT, marginBottom: 2 }}>
                    {a.label}
                  </div>
                  <div style={{ color: GRAY, fontSize: 12, lineHeight: 1.65, fontFamily: FONT }}>
                    {a.address}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cột 3: Liên hệ — đọc từ theme */}
          <div>
            <ColHeader label="Liên hệ" />
            {contacts.map((c, i) => (
              <a key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start", textDecoration: "none" }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
                <div>
                  <div style={{ color: GRAY, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: FONT, marginBottom: 1 }}>
                    {c.label}
                  </div>
                  <div style={{ color: GOLD_LIGHT, fontSize: 13, fontFamily: FONT, fontWeight: 700 }}>
                    {c.value}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Cột 4: Chính sách — đọc từ theme */}
          <div>
            <ColHeader label="Chính sách" />
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {policyLinks.map((link, i) => (
                <li key={i}>
                  <Link href={link.href} style={{ color: GRAY, fontSize: 12, fontFamily: FONT, textDecoration: "none", lineHeight: 1.5 }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 5: Đăng ký ngay — đọc từ theme */}
          <div>
            <ColHeader label="Đăng ký ngay" />
            <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.75, fontFamily: FONT, marginBottom: 20 }}>
              Nhận chính sách đại lý &amp; bảng giá sỉ trong vòng <strong style={{ color: GOLD_LIGHT }}>2 giờ làm việc</strong>.
            </p>
            <a href={ctaHref}
              style={{
                display: "block", textAlign: "center",
                background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, #9A7A2E 100%)`,
                color: "#0A0800", fontWeight: 700, fontSize: 11,
                letterSpacing: "0.1em", textTransform: "uppercase",
                padding: "13px 20px", borderRadius: 8,
                textDecoration: "none", fontFamily: FONT,
                boxShadow: "0 6px 24px rgba(201,168,76,0.25)",
                marginBottom: 12,
              }}>
              {ctaText}
            </a>
            <a href={ctaZaloHref} target="_blank" rel="noopener noreferrer"
              style={{
                display: "block", textAlign: "center",
                background: "transparent",
                color: GRAY_LIGHT, fontWeight: 500, fontSize: 11,
                letterSpacing: "0.06em",
                padding: "12px 20px", borderRadius: 8,
                textDecoration: "none", fontFamily: FONT,
                border: `1px solid rgba(212,196,160,0.2)`,
              }}>
              {ctaZaloText}
            </a>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${BLACK_BORDER} 20%, ${BLACK_BORDER} 80%, transparent)`, marginBottom: 24 }} />

        {/* ── Bottom bar ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, paddingBottom: 28 }}>
          <p style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT, margin: 0 }}>
            {footer.copyrightText}
          </p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {policyLinks.slice(0, 3).map((link, i) => (
              <Link key={i} href={link.href} style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT, textDecoration: "none" }}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        .footer-main-grid {
          grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr;
        }
        @media (max-width: 1100px) {
          .footer-main-grid {
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 36px 24px !important;
          }
        }
        @media (max-width: 700px) {
          .footer-main-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px 20px !important;
          }
        }
        @media (max-width: 480px) {
          .footer-main-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
        }
      `}</style>
    </footer>
  );
}
