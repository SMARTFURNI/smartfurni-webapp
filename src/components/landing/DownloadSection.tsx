"use client";
import { ScrollReveal } from "./ScrollReveal";

export default function DownloadSection() {
  return (
    <section id="download" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal variant="fadeUp" delay={0}>
        <div className="relative rounded-3xl overflow-hidden border border-[#C9A84C]/20 bg-[#1A1600]">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#C9A84C]/10 via-transparent to-transparent" />

          <div className="relative p-12 text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5">
              <span className="text-xs text-[#C9A84C] font-medium tracking-wider">TẢI ỨNG DỤNG</span>
            </div>

            <h2 className="text-4xl font-light text-[#F5EDD6]">
              Bắt đầu trải nghiệm{" "}
              <span className="text-gold-gradient">ngay hôm nay</span>
            </h2>

            <p className="text-[#F5EDD6]/50 max-w-md mx-auto">
              Tải ứng dụng SmartFurni miễn phí. Kết nối giường trong 30 giây
              và bắt đầu tùy chỉnh giấc ngủ của bạn.
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
                  <div className="text-sm font-semibold text-[#F5EDD6] group-hover:text-[#C9A84C] transition-colors">App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#221D00] border border-[#C9A84C]/30 hover:border-[#C9A84C] transition-all duration-200 group"
              >
                <div className="text-3xl">🤖</div>
                <div className="text-left">
                  <div className="text-xs text-[#F5EDD6]/50">Tải trên</div>
                  <div className="text-sm font-semibold text-[#F5EDD6] group-hover:text-[#C9A84C] transition-colors">Google Play</div>
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
