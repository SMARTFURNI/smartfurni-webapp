import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DownloadSection from "@/components/landing/DownloadSection";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0D0B00]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <DownloadSection />

      {/* Footer */}
      <footer className="border-t border-[#2E2800] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#E2C97E] to-[#9A7A2E] flex items-center justify-center">
              <span className="text-[#0D0B00] font-bold text-xs">SF</span>
            </div>
            <span className="font-brand text-sm tracking-[0.15em] text-[#E2C97E]">SMARTFURNI</span>
          </div>
          <p className="text-xs text-[#F5EDD6]/30">
            © 2026 SmartFurni. Nội thất thông minh Việt Nam.
          </p>
          <div className="flex gap-6">
            <Link href="/about" className="text-xs text-[#F5EDD6]/40 hover:text-[#C9A84C] transition-colors">Giới thiệu</Link>
            <Link href="/contact" className="text-xs text-[#F5EDD6]/40 hover:text-[#C9A84C] transition-colors">Liên hệ</Link>
            <Link href="/dashboard" className="text-xs text-[#F5EDD6]/40 hover:text-[#C9A84C] transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
