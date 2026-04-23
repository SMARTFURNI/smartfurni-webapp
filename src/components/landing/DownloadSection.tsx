"use client";
import { ScrollReveal } from "./ScrollReveal";
import type { SiteTheme } from "@/lib/theme-store";

interface Props { theme: SiteTheme; }

const FW_MAP: Record<string, string> = {
  light: "300", normal: "400", medium: "500", semibold: "600", bold: "700",
};

export default function DownloadSection({ theme }: Props) {
  const dl = theme.homepageSections?.download;

  return (
    <section id="download" className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal variant="fadeUp" delay={0}>
        <div className="relative rounded-3xl overflow-hidden border border-[#C9A84C]/20 bg-[#1A1600]">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#C9A84C]/10 via-transparent to-transparent" />

          <div className="relative p-6 sm:p-10 lg:p-12 text-center space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5">
              <span style={{ fontSize: dl?.badge ? `${dl.badge.fontSize}px` : "12px", color: dl?.badge?.color ?? "#C9A84C", fontWeight: dl?.badge ? FW_MAP[dl.badge.fontWeight] : "500" }} className="tracking-wider">
                {dl?.badge?.text ?? "TẢI ỨNG DỤNG"}
              </span>
            </div>

            <h2 className="mb-0">
              <span style={{ fontSize: dl?.title ? `clamp(22px, 3vw, ${dl.title.fontSize}px)` : "clamp(22px, 3vw, 36px)", color: dl?.title?.color ?? "#F5EDD6", fontWeight: dl?.title ? FW_MAP[dl.title.fontWeight] : "300", display: "block" }}>
                {dl?.title?.text ?? "Bắt đầu trải nghiệm ngay hôm nay"}
              </span>
            </h2>

            <p style={{ fontSize: dl?.subtitle ? `${dl.subtitle.fontSize}px` : "14px", color: dl?.subtitle?.color ?? "#F5EDD6", fontWeight: dl?.subtitle ? FW_MAP[dl.subtitle.fontWeight] : "400", opacity: 0.5 }} className="max-w-md mx-auto">
              {dl?.subtitle?.text ?? "Tải ứng dụng SmartFurni miễn phí. Kết nối giường trong 30 giây và bắt đầu tùy chỉnh giấc ngủ của bạn."}
            </p>

            {/* Download buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="#"
                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#221D00] border border-[#C9A84C]/30 hover:border-[#C9A84C] transition-all duration-200 group"
              >
                <div className="text-3xl">🍎</div>
                <div className="text-left">
                  <div className="text-xs text-[#F5EDD6]/50">Tải trên</div>
                  <div className="text-sm font-semibold text-[#F5EDD6] group-hover:text-[#C9A84C] transition-colors">{dl?.appStoreLabel ?? "App Store"}</div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#221D00] border border-[#C9A84C]/30 hover:border-[#C9A84C] transition-all duration-200 group"
              >
                <div className="text-3xl">🤖</div>
                <div className="text-left">
                  <div className="text-xs text-[#F5EDD6]/50">Tải trên</div>
                  <div className="text-sm font-semibold text-[#F5EDD6] group-hover:text-[#C9A84C] transition-colors">{dl?.googlePlayLabel ?? "Google Play"}</div>
                </div>
              </a>
            </div>

            {/* QR hint */}
            <div className="pt-4 border-t border-[#2E2800]">
              <p className="text-xs text-[#F5EDD6]/30">
                Hoặc quét mã QR trong ứng dụng Expo Go để xem trước ngay trên điện thoại
              </p>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
