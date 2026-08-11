"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const HIDDEN_ROUTE_PREFIXES = ["/lp/", "/admin", "/crm", "/dashboard", "/smart-bed", "/zalo-group/", "/zalo/quan-tam/"];

export default function ScrollToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const isHidden = HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  const hasFloatingContactButtons = !HIDDEN_ROUTE_PREFIXES.some((prefix) =>
    pathname?.startsWith(prefix)
  );

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible || isHidden) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Lên đầu trang"
      style={{
        background: "linear-gradient(135deg, #C9A84C, #8B6914)",
        boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
      }}
      className={`fixed right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95 sm:right-6 no-print ${
        hasFloatingContactButtons ? "bottom-[120px]" : "bottom-24"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 11 9 6 14 11"/>
      </svg>
    </button>
  );
}
