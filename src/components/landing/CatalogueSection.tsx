"use client";

import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

export default function CatalogueSection() {
  return (
    <section className="py-20 bg-[#0a0800] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C9A84C]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#C9A84C]/2 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative">
        {/* Section header */}
        <ScrollReveal variant="fadeUp" delay={0}>
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full" />
                <span className="text-[#C9A84C] text-xs font-medium tracking-wider uppercase">Catalogue Sản Phẩm</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                Catalogue Đầy Đủ
                <br />
                <span className="text-[#C9A84C]">Thông Số & Bảng Giá</span>
              </h2>
              <p className="text-gray-400 mt-3 max-w-md leading-relaxed">
                Xem trực tiếp catalogue sản phẩm với đầy đủ thông số kỹ thuật, hình ảnh thực tế và bảng giá cập nhật.
              </p>
            </div>
            <Link
              href="/catalogue"
              className="hidden md:flex items-center gap-2 text-[#C9A84C] hover:text-[#E2C97E] transition-colors text-sm font-medium"
            >
              Xem catalogue
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round"/>
              </svg>
            </Link>
          </div>
        </ScrollReveal>

        {/* Preview cards */}
        <ScrollReveal variant="fadeUp" delay={100}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {[
              { icon: "🛏️", title: "Giường Công Thái Học", desc: "Điều khiển điện, nâng đầu/chân, massage tích hợp", count: "6+ mẫu" },
              { icon: "🛋️", title: "Sofa Giường Đa Năng", desc: "Gấp mở 30 giây, tiết kiệm không gian, đệm cao cấp", count: "4+ mẫu" },
              { icon: "📋", title: "Bảng Giá & Chiết Khấu", desc: "Giá niêm yết, chiết khấu theo số lượng, chính sách B2B", count: "Cập nhật mới nhất" },
            ].map((item, i) => (
              <Link
                key={i}
                href="/catalogue"
                className="group bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-[#C9A84C]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-white text-sm mb-2 group-hover:text-[#C9A84C] transition-colors">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed mb-3">{item.desc}</p>
                <div className="inline-flex items-center gap-1 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full px-2 py-0.5">
                  <span className="text-[#C9A84C] text-[10px] font-medium">{item.count}</span>
                </div>
              </Link>
            ))}
          </div>
        </ScrollReveal>

        {/* Mobile "see all" */}
        <div className="mt-4 text-center md:hidden">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 border border-[#C9A84C]/30 text-[#C9A84C] px-5 py-2.5 rounded-full hover:bg-[#C9A84C]/10 transition-colors text-sm font-medium"
          >
            Xem catalogue đầy đủ
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>

        <ScrollReveal variant="fadeUp" delay={150}>
          {/* B2B CTA */}
          <div className="mt-8 bg-gradient-to-r from-[#C9A84C]/10 to-[#C9A84C]/5 border border-[#C9A84C]/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Trở thành đối tác B2B</h3>
              <p className="text-gray-400 text-sm">
                Nhận giá ưu đãi, hỗ trợ kỹ thuật và chính sách bảo hành đặc biệt cho đại lý.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href="/contact"
                className="bg-[#C9A84C] text-black font-bold px-5 py-2.5 rounded-lg hover:bg-[#E2C97E] transition-colors text-sm whitespace-nowrap"
              >
                Đăng ký đối tác
              </Link>
              <Link
                href="/catalogue"
                className="border border-white/20 text-white px-5 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm whitespace-nowrap"
              >
                Xem catalogue
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
