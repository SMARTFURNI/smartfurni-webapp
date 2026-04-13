"use client";
import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

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

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Lên đầu trang"
      style={{
        background: "linear-gradient(135deg, #C9A84C, #8B6914)",
        boxShadow: "0 4px 20px rgba(201,168,76,0.3)",
      }}
      className="fixed bottom-24 right-4 sm:right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200 no-print"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 11 9 6 14 11"/>
      </svg>
    </button>
  );
}
