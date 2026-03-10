"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SiteTheme } from "@/lib/theme-types";
import { useCart } from "@/lib/cart-context";

interface NavbarProps {
  theme?: SiteTheme;
}

interface NavItem {
  label: string;
  href: string;
  isAnchor?: boolean;
  icon?: string;
  desc?: string;
}

interface NavGroup {
  label: string;
  href?: string;           // if set, clicking label navigates directly (no dropdown)
  isAnchor?: boolean;
  children?: NavItem[];    // if set, show dropdown
}

// ─── Menu structure ───────────────────────────────────────────────
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Sản phẩm",
    children: [
      { label: "Tất cả sản phẩm", href: "/products", icon: "🛏️", desc: "Xem toàn bộ dòng sản phẩm" },
      { label: "So sánh sản phẩm", href: "/products/compare", icon: "⚖️", desc: "So sánh chi tiết các model" },
      { label: "Cấu hình 3D", href: "/products/configure/smartfurni-pro", icon: "🎨", desc: "Tùy chỉnh màu sắc & vật liệu" },
    ],
  },
  {
    label: "Trải nghiệm",
    children: [
      { label: "AR Thử tại nhà", href: "/ar-try", icon: "📷", desc: "Đặt giường vào phòng thực tế" },
      { label: "Room Planner", href: "/room-planner", icon: "🏠", desc: "Thiết kế phòng ngủ 2D" },
      { label: "AI Sleep Advisor", href: "/sleep-advisor", icon: "🤖", desc: "Tư vấn giường theo sức khỏe" },
    ],
  },
  {
    label: "Khám phá",
    children: [
      { label: "Video Reviews", href: "/reviews", icon: "🎬", desc: "Đánh giá thực tế từ khách hàng" },
      { label: "Blog & Tin tức", href: "/blog", icon: "📖", desc: "Kiến thức giấc ngủ & sức khỏe" },
      { label: "Tính năng nổi bật", href: "/#features", isAnchor: true, icon: "✨", desc: "Công nghệ SmartFurni" },
    ],
  },
  {
    label: "Hỗ trợ",
    children: [
      { label: "Theo dõi đơn hàng", href: "/warranty/track", icon: "📦", desc: "Tra cứu trạng thái & bảo hành" },
      { label: "Chính sách bảo hành", href: "/warranty", icon: "🛡️", desc: "Bảo hành 5–7 năm toàn diện" },
      { label: "Liên hệ", href: "/contact", icon: "💬", desc: "Tư vấn & hỗ trợ trực tiếp" },
    ],
  },
];

// ─── Dropdown component ───────────────────────────────────────────
function DropdownMenu({
  group,
  primary,
  bgColor,
  textColor,
  isActive,
}: {
  group: NavGroup;
  primary: string;
  bgColor: string;
  textColor: string;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const groupActive = group.children?.some((c) => isActive(c.href));

  return (
    <div
      ref={ref}
      className="relative flex-shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="relative flex items-center gap-1 text-sm pb-1 group transition-colors duration-200"
        style={{ color: groupActive ? primary : `${textColor}90` }}
        onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
        onMouseLeave={(e) => (e.currentTarget.style.color = groupActive ? primary : `${textColor}90`)}
        aria-expanded={open}
      >
        {group.label}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={cn("transition-transform duration-200 mt-0.5", open ? "rotate-180" : "")}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {/* Active underline */}
        <span
          style={{ backgroundColor: primary, opacity: groupActive ? 1 : 0, transform: groupActive ? "scaleX(1)" : "scaleX(0)" }}
          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-all duration-300 group-hover:opacity-100 group-hover:scale-x-100"
        />
      </button>

      {/* Dropdown panel */}
      {open && group.children && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 rounded-2xl shadow-2xl border overflow-hidden z-50"
          style={{
            backgroundColor: bgColor === "transparent" ? "#0a0800" : bgColor,
            borderColor: `${primary}25`,
          }}
        >
          {/* Arrow */}
          <div
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-l border-t"
            style={{ backgroundColor: bgColor === "transparent" ? "#0a0800" : bgColor, borderColor: `${primary}25` }}
          />
          <div className="py-2">
            {group.children.map((item) => {
              const active = isActive(item.href);
              const content = (
                <div
                  className="flex items-start gap-3 px-4 py-2.5 transition-colors duration-150 cursor-pointer"
                  style={{
                    backgroundColor: active ? `${primary}12` : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = `${primary}08`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = active ? `${primary}12` : "transparent"; }}
                >
                  <span className="text-base leading-none mt-0.5 flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium leading-tight"
                      style={{ color: active ? primary : `${textColor}` }}
                    >
                      {item.label}
                    </p>
                    {item.desc && (
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: `${textColor}45` }}>
                        {item.desc}
                      </p>
                    )}
                  </div>
                </div>
              );

              return item.isAnchor ? (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  {content}
                </a>
              ) : (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────
export default function Navbar({ theme }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
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

  useEffect(() => { setMobileOpen(false); setMobileExpanded(null); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
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
      <div className="fixed top-0 left-0 right-0 z-50">

        {/* ── Topbar ── */}
        <div
          style={{ height, ...navBg }}
          className={cn("w-full transition-all duration-300", (scrolled || mobileOpen) ? "border-b" : "")}
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

            {/* Desktop nav — dropdown groups */}
            <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8 flex-1 min-w-0 px-4">
              {NAV_GROUPS.map((group) =>
                group.children ? (
                  <DropdownMenu
                    key={group.label}
                    group={group}
                    primary={primary}
                    bgColor={bgColor}
                    textColor={textColor}
                    isActive={isActive}
                  />
                ) : group.isAnchor ? (
                  <a
                    key={group.href}
                    href={group.href}
                    style={{ color: isActive(group.href!) ? primary : `${textColor}90` }}
                    className="relative text-sm transition-colors duration-200 whitespace-nowrap pb-1 group flex-shrink-0"
                    onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = isActive(group.href!) ? primary : `${textColor}90`)}
                  >
                    {group.label}
                    <span
                      style={{ backgroundColor: primary, opacity: isActive(group.href!) ? 1 : 0 }}
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-all duration-300 group-hover:opacity-100"
                    />
                  </a>
                ) : (
                  <Link
                    key={group.href}
                    href={group.href!}
                    style={{ color: isActive(group.href!) ? primary : `${textColor}90` }}
                    className="relative text-sm transition-colors duration-200 whitespace-nowrap pb-1 group flex-shrink-0"
                    onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = isActive(group.href!) ? primary : `${textColor}90`)}
                  >
                    {group.label}
                    <span
                      style={{ backgroundColor: primary, opacity: isActive(group.href!) ? 1 : 0 }}
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-all duration-300 group-hover:opacity-100"
                    />
                  </Link>
                )
              )}
            </nav>

            {/* Right: Cart + CTA + Hamburger */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Cart */}
              <Link
                href="/cart"
                className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-200"
                style={{ color: textColor }}
                onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = textColor)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
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

              {/* Hamburger (mobile) */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg transition-all duration-200"
                style={{ color: textColor }}
                aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
              >
                <span style={{ backgroundColor: mobileOpen ? primary : textColor }} className={cn("block w-5 h-0.5 rounded-full transition-all duration-300 origin-center", mobileOpen ? "rotate-45 translate-y-2" : "")} />
                <span style={{ backgroundColor: mobileOpen ? primary : textColor }} className={cn("block w-5 h-0.5 rounded-full transition-all duration-300", mobileOpen ? "opacity-0 scale-x-0" : "")} />
                <span style={{ backgroundColor: mobileOpen ? primary : textColor }} className={cn("block w-5 h-0.5 rounded-full transition-all duration-300 origin-center", mobileOpen ? "-rotate-45 -translate-y-2" : "")} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        <div
          style={{
            backgroundColor: `${bgColor}fc`,
            borderTopColor: `${primary}20`,
            maxHeight: mobileOpen ? "100vh" : "0",
            overflow: "hidden",
          }}
          className="md:hidden transition-all duration-300 ease-in-out border-t"
        >
          <div className="px-4 py-3 flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 64px)" }}>
            {NAV_GROUPS.map((group) => {
              const isGroupExpanded = mobileExpanded === group.label;
              const groupActive = group.children?.some((c) => isActive(c.href)) || (group.href && isActive(group.href));

              if (group.children) {
                return (
                  <div key={group.label}>
                    {/* Group header */}
                    <button
                      onClick={() => setMobileExpanded(isGroupExpanded ? null : group.label)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                      style={{
                        color: groupActive ? primary : `${textColor}90`,
                        backgroundColor: groupActive ? `${primary}10` : "transparent",
                      }}
                    >
                      <span>{group.label}</span>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={cn("transition-transform duration-200", isGroupExpanded ? "rotate-180" : "")}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* Children */}
                    {isGroupExpanded && (
                      <div className="ml-3 mt-1 mb-1 flex flex-col gap-0.5 border-l pl-3" style={{ borderColor: `${primary}20` }}>
                        {group.children.map((item) => {
                          const active = isActive(item.href);
                          const content = (
                            <div
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
                              style={{
                                color: active ? primary : `${textColor}80`,
                                backgroundColor: active ? `${primary}10` : "transparent",
                              }}
                            >
                              <span className="text-base">{item.icon}</span>
                              <span>{item.label}</span>
                            </div>
                          );
                          return item.isAnchor ? (
                            <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>{content}</a>
                          ) : (
                            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>{content}</Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Direct link (no children)
              return group.isAnchor ? (
                <a
                  key={group.href}
                  href={group.href}
                  onClick={() => setMobileOpen(false)}
                  style={{ color: groupActive ? primary : `${textColor}90`, backgroundColor: groupActive ? `${primary}10` : "transparent" }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                >
                  {group.label}
                </a>
              ) : (
                <Link
                  key={group.href}
                  href={group.href!}
                  onClick={() => setMobileOpen(false)}
                  style={{ color: groupActive ? primary : `${textColor}90`, backgroundColor: groupActive ? `${primary}10` : "transparent" }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                >
                  {group.label}
                </Link>
              );
            })}

            {/* Divider */}
            <div style={{ borderColor: `${primary}15` }} className="border-t my-2" />

            {/* Mobile CTA */}
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, color: bgColor }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Thử Demo miễn phí
            </Link>

            {/* Cart mobile */}
            <Link
              href="/cart"
              onClick={() => setMobileOpen(false)}
              style={{ color: `${textColor}70`, borderColor: `${primary}20` }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm border mt-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Giỏ hàng {totalItems > 0 && `(${totalItems})`}
            </Link>
          </div>
        </div>

      </div>

      {/* Mobile overlay */}
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
