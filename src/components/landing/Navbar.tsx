"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SiteTheme } from "@/lib/theme-types";
import { useCart } from "@/lib/cart-context";

interface NavbarProps {
  theme?: SiteTheme;
}

const NAV_LINKS = [
  { label: "Tính năng", href: "/#features", isAnchor: true },
  { label: "Demo", href: "/#demo", isAnchor: true },
  { label: "Tải app", href: "/#download", isAnchor: true },
  { label: "Sản phẩm", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "Liên hệ", href: "/contact" },
];

export default function Navbar({ theme }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const pathname = usePathname();

  const primary = theme?.colors.primary ?? "#C9A84C";
  const secondary = theme?.colors.secondary ?? "#9A7A2E";
  const bgColor = theme?.navbar.bgColor ?? "#080600";
  const textColor = theme?.navbar.textColor ?? "#F5EDD6";
  const height = theme?.navbar.height ?? 64;
  const companyName = theme?.footer.companyName ?? "SmartFurni";
  const logoTextColor = theme?.logo.textColor ?? primary;
  const maxWidth = theme?.layout.maxWidth ?? 1280;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.replace("/#", "/").split("#")[0]);
  };

  const navBg = scrolled || mobileOpen
    ? { backgroundColor: `${bgColor}f8`, backdropFilter: "blur(16px)", borderBottomColor: `${primary}30` }
    : { backgroundColor: "transparent" };

  return (
    <>
      {/* Fixed wrapper — contains topbar + mobile dropdown */}
      <div className="fixed top-0 left-0 right-0 z-50">

        {/* ── Topbar ── fixed height, single row, no wrap */}
        <div
          style={{ height, ...navBg }}
          className={cn(
            "w-full transition-all duration-300",
            (scrolled || mobileOpen) ? "border-b" : ""
          )}
        >
          <div
            style={{ maxWidth }}
            className="w-full h-full mx-auto px-4 sm:px-6 flex flex-nowrap items-center justify-between"
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              >
                <span style={{ color: bgColor }} className="font-bold text-sm leading-none">
                  {companyName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              {theme?.logo.showText !== false && (
                <span
                  style={{ color: logoTextColor }}
                  className="font-bold text-base sm:text-lg tracking-widest font-brand"
                >
                  {companyName.toUpperCase()}
                </span>
              )}
            </Link>

            {/* Desktop Nav links — flex-1 to fill remaining space, centered */}
            <div className="hidden md:flex items-center justify-center gap-5 lg:gap-7 flex-1 min-w-0 px-4">
              {NAV_LINKS.map((item) => {
                const active = isActive(item.href);
                return item.isAnchor ? (
                  <a
                    key={item.href}
                    href={item.href}
                    style={{ color: active ? primary : `${textColor}90` }}
                    className="relative text-sm transition-colors duration-200 whitespace-nowrap pb-1 group flex-shrink-0"
                    onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = active ? primary : `${textColor}90`)}
                  >
                    {item.label}
                    <span
                      style={{ backgroundColor: primary, opacity: active ? 1 : 0, transform: active ? "scaleX(1)" : "scaleX(0)" }}
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-all duration-300 group-hover:opacity-100 group-hover:scale-x-100"
                    />
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{ color: active ? primary : `${textColor}90` }}
                    className="relative text-sm transition-colors duration-200 whitespace-nowrap pb-1 group flex-shrink-0"
                    onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = active ? primary : `${textColor}90`)}
                  >
                    {item.label}
                    <span
                      style={{ backgroundColor: primary, opacity: active ? 1 : 0, transform: active ? "scaleX(1)" : "scaleX(0)" }}
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-all duration-300 group-hover:opacity-100 group-hover:scale-x-100"
                    />
                  </Link>
                );
              })}
            </div>

            {/* Right: Cart + CTA + Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Cart Icon */}
              <Link
                href="/cart"
                className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-200"
                style={{ color: textColor }}
                onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = textColor)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {totalItems > 0 && (
                  <span
                    style={{ backgroundColor: primary, color: bgColor }}
                    className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full text-[10px] font-bold flex items-center justify-center px-0.5"
                  >
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Link>

              {/* Desktop CTA */}
              <Link
                href="/dashboard"
                style={{ borderColor: primary, color: primary }}
                className="hidden md:flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 whitespace-nowrap"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = primary;
                  (e.currentTarget as HTMLElement).style.color = bgColor;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = primary;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Thử Demo
              </Link>

              {/* Hamburger button (mobile only) */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg transition-all duration-200"
                style={{ color: textColor }}
                aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
              >
                <span
                  style={{ backgroundColor: mobileOpen ? primary : textColor }}
                  className={cn(
                    "block w-5 h-0.5 rounded-full transition-all duration-300 origin-center",
                    mobileOpen ? "rotate-45 translate-y-2" : ""
                  )}
                />
                <span
                  style={{ backgroundColor: mobileOpen ? primary : textColor }}
                  className={cn(
                    "block w-5 h-0.5 rounded-full transition-all duration-300",
                    mobileOpen ? "opacity-0 scale-x-0" : ""
                  )}
                />
                <span
                  style={{ backgroundColor: mobileOpen ? primary : textColor }}
                  className={cn(
                    "block w-5 h-0.5 rounded-full transition-all duration-300 origin-center",
                    mobileOpen ? "-rotate-45 -translate-y-2" : ""
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu dropdown — outside topbar so it's not clipped ── */}
        <div
          style={{
            backgroundColor: `${bgColor}fc`,
            borderTopColor: `${primary}20`,
            maxHeight: mobileOpen ? "100vh" : "0",
            overflow: "hidden",
          }}
          className="md:hidden transition-all duration-300 ease-in-out border-t"
        >
          <div className="px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((item) => {
              const active = isActive(item.href);
              return item.isAnchor ? (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    color: active ? primary : `${textColor}90`,
                    backgroundColor: active ? `${primary}10` : "transparent",
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    color: active ? primary : `${textColor}90`,
                    backgroundColor: active ? `${primary}10` : "transparent",
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Divider */}
            <div style={{ borderColor: `${primary}15` }} className="border-t my-2" />

            {/* Mobile CTA */}
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              style={{
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                color: bgColor,
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Thử Demo miễn phí
            </Link>

            {/* Cart link in mobile */}
            <Link
              href="/cart"
              onClick={() => setMobileOpen(false)}
              style={{ color: `${textColor}70`, borderColor: `${primary}20` }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm border mt-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Giỏ hàng {totalItems > 0 && `(${totalItems})`}
            </Link>
          </div>
        </div>

      </div>{/* end fixed wrapper */}

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
