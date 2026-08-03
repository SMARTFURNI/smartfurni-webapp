"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function AiCommandLauncher({ surface, enabled = true }: { surface: "crm" | "admin"; enabled?: boolean }) {
  const pathname = usePathname() || "";
  const href = surface === "admin" ? "/admin/ai-command" : "/crm/ai-command";
  if (!enabled || pathname === href || pathname.endsWith("/login") || pathname.includes("choose-module")) return null;

  return (
    <Link
      href={href}
      className="no-print fixed bottom-24 right-5 z-[72] flex items-center gap-2 rounded-full border border-[#d7b957]/35 px-4 py-3 text-sm font-bold text-[#201704] shadow-[0_16px_42px_rgba(107,72,10,.28)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(107,72,10,.36)] lg:bottom-6"
      style={{ background: "linear-gradient(135deg,#fff6cf 0%,#eac85f 48%,#c99523 100%)" }}
      aria-label="Mở Trợ lý Điều hành AI"
    >
      <Sparkles size={18} />
      <span className="hidden sm:inline">Trợ lý AI</span>
    </Link>
  );
}
