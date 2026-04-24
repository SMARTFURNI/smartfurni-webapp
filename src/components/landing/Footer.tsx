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

const NAV_LINKS = [
  { label: "Trang chủ", href: "/" },
  { label: "Sản phẩm", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "Giới thiệu", href: "/about" },
  { label: "Liên hệ", href: "/contact" },
];

const SHOWROOM_ITEMS = [
  { icon: "📍", label: "TP. HCM", val: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức" },
  { icon: "📍", label: "Hà Nội", val: "B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông" },
  { icon: "🏭", label: "Xưởng SX", val: "202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn" },
];

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

export default function Footer({ theme, variant = "full" }: FooterProps) {
  const { footer, layout } = theme;

  // ── Minimal variant ──────────────────────────────────────────────────────────
  if (variant === "minimal") {
    return (
      <footer style={{ background: BLACK_BG, borderTop: `1px solid ${BLACK_BORDER}` }}>
        {/* Top gold accent line */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, opacity: 0.4 }} />
        <div style={{ maxWidth: layout.maxWidth, margin: "0 auto", padding: "20px 24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {/* Logo */}
            <Link href="/" style={{ display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/smartfurni-logo-transparent.png"
                alt={footer.companyName}
                style={{ height: 36, objectFit: "contain" }}
              />
            </Link>

            <p style={{ color: GRAY, fontSize: 11, fontFamily: FONT, margin: 0 }}>
              {footer.copyrightText}
            </p>

            {/* Quick links */}
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Trang chủ", href: "/" },
                { label: "Sản phẩm", href: "/products" },
                { label: "Liên hệ", href: "/contact" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ color: GRAY, fontSize: 11, fontFamily: FONT, textDecoration: "none" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // ── Full footer ──────────────────────────────────────────────────────────────
  const phone = (footer as unknown as Record<string, string>).phone ?? "028.7122.0818";
  const email = (footer as unknown as Record<string, string>).email ?? "info@smartfurni.vn";

  return (
    <footer style={{ background: BLACK_BG, borderTop: `1px solid ${BLACK_BORDER}` }}>
      {/* Top gold accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, opacity: 0.5 }} />

      <div style={{ maxWidth: layout.maxWidth, margin: "0 auto", padding: "56px 24px 0" }}>
        {/* ── Main grid: 4 cột ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1.2fr 1.2fr 1fr",
          gap: "48px 40px",
          marginBottom: 52,
        }}
          className="footer-main-grid"
        >
          {/* Cột 1: Brand */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <Link href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/smartfurni-logo-transparent.png"
                  alt={footer.companyName}
                  style={{ height: 48, objectFit: "contain", filter: "brightness(1.05)" }}
                />
              </Link>
            </div>
            <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.85, fontFamily: FONT, marginBottom: 24, maxWidth: 280 }}>
              {footer.tagline || "Nâng tầm giấc ngủ của bạn"}
            </p>
            {/* Social links */}
            <div style={{ display: "flex", gap: 10 }}>
              {footer.showSocialLinks && footer.socialLinks.facebook && (
                <a
                  href={footer.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "rgba(201,168,76,0.08)",
                    border: `1px solid rgba(201,168,76,0.25)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT,
                    textDecoration: "none",
                  }}
                >
                  f
                </a>
              )}
              {footer.showSocialLinks && footer.socialLinks.youtube && (
                <a
                  href={footer.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube"
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "rgba(201,168,76,0.08)",
                    border: `1px solid rgba(201,168,76,0.25)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT,
                    textDecoration: "none",
                  }}
                >
                  ▶
                </a>
              )}
              {footer.showSocialLinks && footer.socialLinks.tiktok && (
                <a
                  href={footer.socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="TikTok"
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "rgba(201,168,76,0.08)",
                    border: `1px solid rgba(201,168,76,0.25)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT,
                    textDecoration: "none",
                  }}
                >
                  Z
                </a>
              )}
            </div>
          </div>

          {/* Cột 2: Showroom (thay thế Sản phẩm) */}
          <div>
            <ColHeader label="Showroom" />
            {SHOWROOM_ITEMS.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                <div>
                  <div style={{ color: GOLD_LIGHT, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: FONT, marginBottom: 2 }}>
                    {a.label}
                  </div>
                  <div style={{ color: GRAY, fontSize: 12, lineHeight: 1.65, fontFamily: FONT }}>
                    {a.val}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cột 3: Liên hệ (giữ nguyên từ Hỗ trợ, đổi tên) */}
          <div>
            <ColHeader label="Liên hệ" />
            {[
              { icon: "📞", label: "Hotline", val: phone, href: `tel:${phone.replace(/[\s.]/g, "")}` },
              { icon: "💬", label: "Zalo tư vấn", val: "0918.326.552", href: "https://zalo.me/0918326552" },
              { icon: "✉️", label: "Email", val: email, href: `mailto:${email}` },
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
                  <div style={{ color: GRAY, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: FONT, marginBottom: 1 }}>
                    {c.label}
                  </div>
                  <div style={{ color: GOLD_LIGHT, fontSize: 13, fontFamily: FONT, fontWeight: 700 }}>
                    {c.val}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Cột 4: Đăng ký ngay (mới) */}
          <div>
            <ColHeader label="Đăng ký ngay" />
            <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.75, fontFamily: FONT, marginBottom: 20 }}>
              Nhận chính sách đại lý &amp; bảng giá sỉ trong vòng <strong style={{ color: GOLD_LIGHT }}>2 giờ làm việc</strong>.
            </p>
            <a
              href="/lp/doi-tac-showroom-nem#dang-ky"
              style={{
                display: "block", textAlign: "center",
                background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, #9A7A2E 100%)`,
                color: "#0A0800", fontWeight: 700, fontSize: 11,
                letterSpacing: "0.1em", textTransform: "uppercase",
                padding: "13px 20px", borderRadius: 8,
                textDecoration: "none",
                fontFamily: FONT,
                boxShadow: "0 6px 24px rgba(201,168,76,0.25)",
                marginBottom: 12,
              }}
            >
              Đăng ký đối tác →
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
                padding: "12px 20px", borderRadius: 8,
                textDecoration: "none",
                fontFamily: FONT,
                border: `1px solid rgba(212,196,160,0.2)`,
              }}
            >
              💬 Chat Zalo ngay
            </a>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${BLACK_BORDER} 20%, ${BLACK_BORDER} 80%, transparent)`, marginBottom: 24 }} />

        {/* ── Bottom bar ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12,
          paddingBottom: 28,
        }}>
          <p style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT, margin: 0 }}>
            {footer.copyrightText}
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "Chính sách bảo mật", href: "/privacy" },
              { label: "Điều khoản sử dụng", href: "/terms" },
              { label: "Chính sách đại lý", href: "/lp/doi-tac-showroom-nem" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT, textDecoration: "none" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        .footer-main-grid {
          grid-template-columns: 1.6fr 1.2fr 1.2fr 1fr;
        }
        @media (max-width: 900px) {
          .footer-main-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 36px 24px !important;
          }
        }
        @media (max-width: 560px) {
          .footer-main-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </footer>
  );
}
