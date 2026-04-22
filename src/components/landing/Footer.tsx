"use client";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";

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

export default function Footer({ theme, variant = "full" }: FooterProps) {
  const { colors, footer, layout } = theme;
  const primary = colors.primary;
  const secondary = colors.secondary;

  if (variant === "minimal") {
    return (
      <footer
        style={{ backgroundColor: footer.bgColor, borderTopColor: `${colors.border}60` }}
        className="border-t py-5 px-4 sm:px-6"
      >
        <div
          style={{ maxWidth: layout.maxWidth }}
          className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/smartfurni-logo-transparent.png"
              alt={footer.companyName}
              width={64}
              height={36}
              style={{ height: 36, width: 64, objectFit: "contain", display: "block" }}
            />
          </Link>

          <p style={{ color: footer.textColor }} className="text-xs opacity-40 text-center">
            {footer.copyrightText}
          </p>

          {/* Quick links */}
          <div className="flex items-center gap-4">
            {[
              { label: "Trang chủ", href: "/" },
              { label: "Sản phẩm", href: "/products" },
              { label: "Liên hệ", href: "/contact" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ color: footer.textColor }}
                className="text-xs opacity-50 hover:opacity-80 transition-opacity"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  // Full footer
  return (
    <footer
      style={{ backgroundColor: footer.bgColor, borderTopColor: `${colors.border}60` }}
      className="border-t"
    >
      {/* Main footer content */}
      <div
        style={{ maxWidth: layout.maxWidth }}
        className="mx-auto px-4 sm:px-6 py-10 sm:py-14"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
              src="/smartfurni-logo-transparent.png"
              alt={footer.companyName}
              width={85}
              height={48}
              style={{ height: 48, width: 85, objectFit: "contain", display: "block" }}
              />
            </Link>
            {footer.tagline && (
              <p style={{ color: footer.textColor }} className="text-sm opacity-50 leading-relaxed mb-5 max-w-xs">
                {footer.tagline}
              </p>
            )}
            {/* Social links */}
            {footer.showSocialLinks && (
              <div className="flex items-center gap-4">
                {footer.socialLinks.facebook && (
                  <a
                    href={footer.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: footer.textColor, borderColor: `${colors.border}60` }}
                    className="w-8 h-8 rounded-full border flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                    aria-label="Facebook"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </a>
                )}
                {footer.socialLinks.instagram && (
                  <a
                    href={footer.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: footer.textColor, borderColor: `${colors.border}60` }}
                    className="w-8 h-8 rounded-full border flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                    aria-label="Instagram"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>
                )}
                {footer.socialLinks.youtube && (
                  <a
                    href={footer.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: footer.textColor, borderColor: `${colors.border}60` }}
                    className="w-8 h-8 rounded-full border flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                    aria-label="YouTube"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill={colors.background} />
                    </svg>
                  </a>
                )}
                {footer.socialLinks.tiktok && (
                  <a
                    href={footer.socialLinks.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: footer.textColor, borderColor: `${colors.border}60` }}
                    className="w-8 h-8 rounded-full border flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                    aria-label="TikTok"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: primary }}>
              Điều hướng
            </h4>
            <ul className="flex flex-col gap-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    style={{ color: footer.textColor }}
                    className="text-sm opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: primary }}>
              Sản phẩm
            </h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: "SmartFurni Basic", href: "/products/smartfurni-basic" },
                { label: "SmartFurni Pro", href: "/products/smartfurni-pro" },
                { label: "SmartFurni Elite", href: "/products/smartfurni-elite" },
                { label: "Phụ kiện", href: "/products?category=Phụ kiện" },
                { label: "So sánh sản phẩm", href: "/products/compare" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    style={{ color: footer.textColor }}
                    className="text-sm opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: primary }}>
              Hỗ trợ
            </h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: `Hotline: ${footer.phone ?? "1800 1234 56"}`, href: `tel:${(footer.phone ?? "18001234").replace(/\s/g, "")}` },
                { label: `Email: ${footer.email ?? "hello@smartfurni.vn"}`, href: `mailto:${footer.email ?? "hello@smartfurni.vn"}` },
                { label: "Chính sách bảo hành", href: "/warranty" },
                { label: "Chính sách đổi trả", href: "/returns" },
                { label: "Hướng dẫn sử dụng", href: "/blog?category=Hướng Dẫn Sử Dụng" },
                { label: "Câu hỏi thường gặp", href: "/contact#faq" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    style={{ color: footer.textColor }}
                    className="text-sm opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{ borderTopColor: `${colors.border}40` }}
        className="border-t py-4 px-4 sm:px-6"
      >
        <div
          style={{ maxWidth: layout.maxWidth }}
          className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-2"
        >
          <p style={{ color: footer.textColor }} className="text-xs opacity-30 text-center sm:text-left">
            {footer.copyrightText}
          </p>
          <div className="flex items-center gap-4">
            {[
              { label: "Chính sách bảo mật", href: "/privacy" },
              { label: "Điều khoản sử dụng", href: "/terms" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ color: footer.textColor }}
                className="text-xs opacity-30 hover:opacity-60 transition-opacity"
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
