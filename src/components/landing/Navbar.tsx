"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled ? "bg-[#0D0B00]/95 backdrop-blur-md border-b border-[#2E2800]" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center">
            <span className="text-[#0D0B00] font-bold text-sm">SF</span>
          </div>
          <span className="font-brand text-lg font-medium tracking-[0.15em] text-[#E2C97E]">SMARTFURNI</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Tính năng", href: "#features" },
            { label: "Demo", href: "#demo" },
            { label: "Tải app", href: "#download" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-[#F5EDD6]/70 hover:text-[#C9A84C] transition-colors duration-200"
            >
              {item.label}
            </a>
          ))}
          <Link href="/about" className="text-sm text-[#F5EDD6]/70 hover:text-[#C9A84C] transition-colors duration-200">
            Giới thiệu
          </Link>
          <Link href="/contact" className="text-sm text-[#F5EDD6]/70 hover:text-[#C9A84C] transition-colors duration-200">
            Liên hệ
          </Link>
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-[#C9A84C] text-[#C9A84C] text-sm font-medium hover:bg-[#C9A84C] hover:text-[#0D0B00] transition-all duration-200"
        >
          Mở Dashboard
        </Link>
      </div>
    </nav>
  );
}
