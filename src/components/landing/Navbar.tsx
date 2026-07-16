"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SiteTheme } from "@/lib/theme-types";
import { useCart } from "@/lib/cart-context";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { VIETNAM_PROVINCES } from "@/lib/crm-locations";
import { B2B_POPUP_EVENT } from "@/lib/b2b-popup";

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
      { label: "Tất cả sản phẩm", href: "/products", icon: "bed", desc: "Xem toàn bộ dòng sản phẩm" },
      { label: "Giường công thái học", href: "/products/giuong-cong-thai-hoc-dieu-chinh-dien", icon: "bed", desc: "Giường nâng hạ và điều chỉnh điện" },
      { label: "Nệm điện thông minh", href: "/products/nem-dien-thong-minh", icon: "bed", desc: "Nệm nâng đỡ linh hoạt theo tư thế" },
      { label: "Sofa giường", href: "/products/sofa-giuong-thong-minh", icon: "sofa", desc: "Tối ưu không gian đa năng" },
      { label: "Phụ kiện", href: "/products/phu-kien-giuong-thong-minh", icon: "settings", desc: "Remote, nệm và phụ kiện chính hãng" },
      { label: "So sánh sản phẩm", href: "/products/compare", icon: "scale", desc: "So sánh chi tiết các model" },
      { label: "Cấu hình 3D", href: "/products/configure/smartfurni-pro", icon: "palette", desc: "Tùy chỉnh màu sắc & vật liệu" },
    ],
  },
  {
    label: "Trải nghiệm",
    children: [
      { label: "AR Thử tại nhà", href: "/ar-try", icon: "camera", desc: "Đặt giường vào phòng thực tế" },
      { label: "Room Planner", href: "/room-planner", icon: "floor-plan", desc: "Thiết kế phòng ngủ 2D" },
      { label: "AI Sleep Advisor", href: "/sleep-advisor", icon: "ai", desc: "Tư vấn giường theo sức khỏe" },
    ],
  },
  {
    label: "Khám phá",
    children: [
      { label: "Catalogue B2B", href: "/catalogue", icon: "book", desc: "Bộ sưu tập sản phẩm dành cho đối tác" },
      { label: "Video Reviews", href: "/reviews", icon: "play", desc: "Đánh giá thực tế từ khách hàng" },
      { label: "Blog & Tin tức", href: "/blog", icon: "article", desc: "Kiến thức giấc ngủ & sức khỏe" },
      { label: "Tính năng nổi bật", href: "/#features", isAnchor: true, icon: "star", desc: "Công nghệ SmartFurni" },
    ],
  },
  {
    label: "Hỗ trợ",
    children: [
      { label: "Theo dõi đơn hàng", href: "/warranty/track", icon: "package", desc: "Tra cứu trạng thái & bảo hành" },
      { label: "Chính sách bảo hành", href: "/warranty", icon: "shield", desc: "Bảo hành 5–7 năm toàn diện" },
      { label: "Liên hệ", href: "/contact", icon: "chat", desc: "Tư vấn & hỗ trợ trực tiếp" },
    ],
  },
];

const B2B_PARTNERS = [
  { icon: "bed", title: "Showroom Nệm & Nội thất", desc: "Phân phối sỉ, chiết khấu cao, hỗ trợ trưng bày", badge: "Phổ biến nhất" },
  { icon: "hotel", title: "Khách sạn & Resort", desc: "Giải pháp giường thông minh cho phòng VIP, spa", badge: null },
  { icon: "hospital", title: "Bệnh viện & Phòng khám", desc: "Giường điều chỉnh y tế, hỗ trợ phục hồi chức năng", badge: null },
  { icon: "building", title: "Nhà phân phối nội thất", desc: "Đại lý chính thức, hỗ trợ marketing & bảo hành", badge: null },
  { icon: "construction", title: "Chủ đầu tư & Developer", desc: "Tích hợp giường thông minh vào dự án bất động sản", badge: null },
  { icon: "plane", title: "Xuất khẩu & Đối tác quốc tế", desc: "Hợp tác OEM/ODM, xuất khẩu sang thị trường nước ngoài", badge: null },
] as const;

type B2BPartner = (typeof B2B_PARTNERS)[number];
type B2BStep = "partner" | "form" | "success";

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
                  <span className="flex-shrink-0 mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg" style={{ backgroundColor: `${primary}12` }}>
                    <SvgIcon name={item.icon ?? "star"} size={14} color={primary} strokeWidth={1.5} />
                  </span>
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
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [b2bOpen, setB2bOpen] = useState(false);
  const [b2bStep, setB2bStep] = useState<B2BStep>("partner");
  const [selectedPartner, setSelectedPartner] = useState<B2BPartner | null>(null);
  const [b2bForm, setB2bForm] = useState({ fullName: "", phone: "", province: "" });
  const [b2bError, setB2bError] = useState("");
  const [b2bSubmitting, setB2bSubmitting] = useState(false);

  const resetB2bFlow = useCallback(() => {
    setB2bStep("partner");
    setSelectedPartner(null);
    setB2bForm({ fullName: "", phone: "", province: "" });
    setB2bError("");
    setB2bSubmitting(false);
  }, []);
  const openB2b = useCallback(() => {
    resetB2bFlow();
    setMobileOpen(false);
    setB2bOpen(true);
  }, [resetB2bFlow]);
  const closeB2b = useCallback(() => setB2bOpen(false), []);
  const { totalItems } = useCart();
  const pathname = usePathname();

  const primary = theme?.colors.primary ?? "#C9A84C";
  const secondary = theme?.colors.secondary ?? "#9A7A2E";
  const bgColor = theme?.navbar.bgColor ?? "#080600";
  const textColor = theme?.navbar.textColor ?? "#F5EDD6";
  const surfaceColor = theme?.colors.surface ?? "#1A1500";
  const height = theme?.navbar.height ?? 64;
  const companyName = theme?.footer.companyName ?? "SmartFurni";
  const logoTextColor = theme?.logo.textColor ?? primary;
  const maxWidth = theme?.layout.maxWidth ?? 1280;

  useEffect(() => {
    setMounted(true);
    // Set initial scroll state immediately to avoid CLS on first render
    setScrolled(window.scrollY > 40);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setMobileExpanded(null); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen || b2bOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen, b2bOpen]);

  useEffect(() => {
    window.addEventListener(B2B_POPUP_EVENT, openB2b);
    return () => window.removeEventListener(B2B_POPUP_EVENT, openB2b);
  }, [openB2b]);

  useEffect(() => {
    if (!b2bOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && b2bStep !== "success") closeB2b();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [b2bOpen, b2bStep, closeB2b]);

  useEffect(() => {
    if (b2bStep !== "success") return;
    const redirectTimer = window.setTimeout(() => window.location.assign("/"), 2200);
    return () => window.clearTimeout(redirectTimer);
  }, [b2bStep]);

  const selectB2bPartner = (partner: B2BPartner) => {
    setSelectedPartner(partner);
    setB2bError("");
    setB2bStep("form");
  };

  const submitB2bLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPartner || b2bSubmitting) return;

    const fullName = b2bForm.fullName.trim();
    const compactPhone = b2bForm.phone.replace(/[\s.()-]/g, "");
    const normalizedPhone = compactPhone.startsWith("+84")
      ? `0${compactPhone.slice(3)}`
      : compactPhone.startsWith("84")
        ? `0${compactPhone.slice(2)}`
        : compactPhone;

    if (fullName.length < 2) {
      setB2bError("Vui lòng nhập đầy đủ họ tên.");
      return;
    }
    if (!/^0\d{9}$/.test(normalizedPhone)) {
      setB2bError("Số điện thoại chưa đúng. Vui lòng nhập số gồm 10 chữ số.");
      return;
    }
    if (!b2bForm.province) {
      setB2bError("Vui lòng chọn tỉnh hoặc thành phố.");
      return;
    }

    setB2bSubmitting(true);
    setB2bError("");

    const searchParams = new URLSearchParams(window.location.search);
    try {
      const response = await fetch("/api/lp/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landingPageSlug: "homepage-b2b",
          fullName,
          phone: normalizedPhone,
          email: "",
          businessType: selectedPartner.title,
          province: b2bForm.province,
          note: `Đăng ký đối tác B2B từ website chính | Đối tượng: ${selectedPartner.title}`,
          utmSource: searchParams.get("utm_source") || "website",
          utmMedium: searchParams.get("utm_medium") || "b2b-popup",
          utmCampaign: searchParams.get("utm_campaign") || "homepage-b2b",
          utmContent: searchParams.get("utm_content") || selectedPartner.title,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || "Chưa gửi được thông tin đăng ký.");
      }
      setB2bStep("success");
    } catch (error) {
      setB2bSubmitting(false);
      setB2bError(error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.");
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.replace("/#", "/").split("#")[0]);
  };

  // Before mount: always show solid bg to avoid CLS flash (transparent → solid)
  const navBg = (!mounted || scrolled || mobileOpen)
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
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/smartfurni-logo-transparent.png"
                alt={companyName}
                width={92}
                height={52}
                style={{ height: 52, width: 92, objectFit: "contain", display: "block" }}
                fetchPriority="high"
              />
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

            {/* Right: Cart + B2B CTA + Demo + Hamburger */}
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

              {/* B2B Button — Desktop */}
              <button
                onClick={openB2b}
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  color: bgColor,
                  boxShadow: `0 0 18px ${primary}55, 0 4px 12px rgba(0,0,0,0.3)`,
                }}
                className="hidden md:flex items-center gap-2 px-4 lg:px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap hover:scale-105 hover:brightness-110"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 28px ${primary}88, 0 6px 18px rgba(0,0,0,0.4)`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 18px ${primary}55, 0 4px 12px rgba(0,0,0,0.3)`; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Trở thành đối tác B2B
              </button>

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
                              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md" style={{ backgroundColor: `${primary}12` }}>
                                <SvgIcon name={item.icon ?? "star"} size={13} color={primary} strokeWidth={1.5} />
                              </span>
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

      {/* B2B Popup */}
      {b2bOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-3 sm:p-4"
          style={{ backgroundColor: "rgba(3, 3, 2, 0.62)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && b2bStep !== "success") closeB2b(); }}
        >
          <div
            className="relative my-auto max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-3xl shadow-2xl"
            style={{
              background: `radial-gradient(circle at 12% 0%, ${primary}2e 0%, transparent 44%), linear-gradient(145deg, color-mix(in srgb, ${surfaceColor} 82%, white 18%), color-mix(in srgb, ${bgColor === "transparent" ? "#0a0800" : bgColor} 78%, ${primary} 22%))`,
              border: `1px solid ${primary}55`,
              boxShadow: "0 28px 90px rgba(0, 0, 0, 0.48)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="b2b-popup-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pb-4 pt-5 sm:px-6 sm:pt-6" style={{ borderBottom: `1px solid ${primary}35` }}>
              <div>
                {b2bStep !== "success" && (
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: `${textColor}8f` }}>
                    <span style={{ color: b2bStep === "partner" ? primary : `${textColor}8f` }}>01 Chọn đối tượng</span>
                    <span aria-hidden="true">→</span>
                    <span style={{ color: b2bStep === "form" ? primary : `${textColor}8f` }}>02 Thông tin</span>
                  </div>
                )}
                <h2 id="b2b-popup-title" className="text-xl font-semibold" style={{ color: textColor }}>
                  {b2bStep === "partner" && "Trở thành Đối tác B2B"}
                  {b2bStep === "form" && "Thông tin đăng ký hợp tác"}
                  {b2bStep === "success" && "Đăng ký thành công"}
                </h2>
                <p className="mt-1 text-sm" style={{ color: `${textColor}b5` }}>
                  {b2bStep === "partner" && "Chọn lĩnh vực phù hợp để nhận tư vấn chuyên biệt"}
                  {b2bStep === "form" && `SmartFurni sẽ tư vấn riêng cho nhóm ${selectedPartner?.title || "đối tác"}`}
                  {b2bStep === "success" && "Thông tin của bạn đã được chuyển đến đội ngũ SmartFurni"}
                </p>
              </div>
              {b2bStep !== "success" && (
                <button
                  onClick={closeB2b}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200"
                  style={{ color: `${textColor}a8`, backgroundColor: `${textColor}12` }}
                  aria-label="Đóng popup"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {b2bStep === "partner" && (
              <>
                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6">
                  {B2B_PARTNERS.map((partner) => (
                    <button
                      key={partner.title}
                      type="button"
                      onClick={() => selectB2bPartner(partner)}
                      className="group relative flex cursor-pointer items-start gap-4 rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        background: `linear-gradient(135deg, color-mix(in srgb, ${surfaceColor} 80%, white 20%), color-mix(in srgb, ${bgColor === "transparent" ? "#0a0800" : bgColor} 72%, ${primary} 28%))`,
                        border: `1px solid ${primary}38`,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                      }}
                    >
                      <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${primary}1f`, border: `1px solid ${primary}38` }}>
                        <SvgIcon name={partner.icon} size={18} color={primary} strokeWidth={1.4} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: textColor }}>{partner.title}</span>
                          {partner.badge && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `linear-gradient(to right, ${primary}, ${secondary})`, color: bgColor === "transparent" ? "#0a0800" : bgColor }}>
                              {partner.badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed" style={{ color: `${textColor}a8` }}>{partner.desc}</span>
                      </span>
                      <svg className="mt-1 flex-shrink-0 opacity-60 transition-opacity duration-200 group-hover:opacity-100" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: primary }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
                <div className="px-6 pb-5 text-center">
                  <p className="text-xs" style={{ color: `${textColor}90` }}>
                    Chưa tìm thấy lĩnh vực phù hợp?{" "}
                    <a href="/contact" onClick={closeB2b} className="underline" style={{ color: primary }}>Liên hệ trực tiếp với chúng tôi</a>
                  </p>
                </div>
              </>
            )}

            {b2bStep === "form" && selectedPartner && (
              <form onSubmit={submitB2bLead} className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: `${primary}17`, border: `1px solid ${primary}38` }}>
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${primary}20` }}>
                    <SvgIcon name={selectedPartner.icon} size={18} color={primary} strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="text-xs" style={{ color: `${textColor}a0` }}>Đối tượng đã chọn</p>
                    <p className="text-sm font-semibold" style={{ color: textColor }}>{selectedPartner.title}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold" style={{ color: `${textColor}c0` }}>Họ và tên *</span>
                    <input
                      type="text"
                      value={b2bForm.fullName}
                      onChange={(event) => setB2bForm((current) => ({ ...current, fullName: event.target.value }))}
                      autoComplete="name"
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-shadow focus:ring-2"
                      style={{ color: textColor, backgroundColor: "rgba(255,255,255,0.09)", border: `1px solid ${primary}45`, boxShadow: `0 0 0 0 ${primary}00` }}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold" style={{ color: `${textColor}c0` }}>Số điện thoại *</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={b2bForm.phone}
                      onChange={(event) => setB2bForm((current) => ({ ...current, phone: event.target.value }))}
                      autoComplete="tel"
                      placeholder="0901 234 567"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-shadow focus:ring-2"
                      style={{ color: textColor, backgroundColor: "rgba(255,255,255,0.09)", border: `1px solid ${primary}45` }}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold" style={{ color: `${textColor}c0` }}>Tỉnh / Thành phố *</span>
                    <select
                      value={b2bForm.province}
                      onChange={(event) => setB2bForm((current) => ({ ...current, province: event.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-shadow focus:ring-2"
                      style={{ color: b2bForm.province ? textColor : `${textColor}a0`, backgroundColor: "color-mix(in srgb, #302d20 88%, white 12%)", border: `1px solid ${primary}45` }}
                    >
                      <option value="">Chọn tỉnh/thành phố</option>
                      {VIETNAM_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
                    </select>
                  </label>
                </div>

                {b2bError && (
                  <p className="rounded-xl px-3 py-2 text-sm" role="alert" style={{ color: "#ffd4cc", backgroundColor: "rgba(153, 27, 27, 0.28)", border: "1px solid rgba(248, 113, 113, 0.34)" }}>
                    {b2bError}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => { setB2bStep("partner"); setB2bError(""); }}
                    className="rounded-full border px-5 py-3 text-sm font-semibold sm:w-1/3"
                    style={{ color: primary, borderColor: `${primary}70` }}
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={b2bSubmitting}
                    className="rounded-full px-5 py-3 text-sm font-bold transition-opacity disabled:cursor-wait disabled:opacity-65 sm:flex-1"
                    style={{ color: bgColor === "transparent" ? "#0a0800" : bgColor, background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
                  >
                    {b2bSubmitting ? "Đang gửi thông tin..." : "Đăng ký tư vấn"}
                  </button>
                </div>
                <p className="text-center text-[11px] leading-relaxed" style={{ color: `${textColor}8f` }}>
                  Thông tin được chuyển trực tiếp đến CRM SmartFurni và chỉ dùng để tư vấn hợp tác.
                </p>
              </form>
            )}

            {b2bStep === "success" && (
              <div className="px-6 py-12 text-center" aria-live="polite">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ color: primary, backgroundColor: `${primary}20`, border: `1px solid ${primary}65`, boxShadow: `0 0 38px ${primary}2f` }}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold" style={{ color: textColor }}>Cảm ơn bạn đã đăng ký!</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: `${textColor}b8` }}>
                  Đội ngũ SmartFurni sẽ liên hệ qua điện thoại trong thời gian sớm nhất để tư vấn chương trình phù hợp.
                </p>
                <p className="mt-5 text-xs" style={{ color: primary }}>Đang chuyển bạn về trang chủ...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
