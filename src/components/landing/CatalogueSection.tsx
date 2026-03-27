"use client";

import Link from "next/link";
import type { Catalogue } from "@/lib/catalogue-store";

interface Props {
  catalogues: Catalogue[];
}

export default function CatalogueSection({ catalogues }: Props) {
  if (catalogues.length === 0) return null;

  return (
    <section className="py-20 bg-[#0a0800] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C9A84C]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#C9A84C]/2 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative">
        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full" />
              <span className="text-[#C9A84C] text-xs font-medium tracking-wider uppercase">B2B Catalogue</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Catalogue Sản Phẩm
              <br />
              <span className="text-[#C9A84C]">Dành Cho Đối Tác</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-md leading-relaxed">
              Khám phá bộ sưu tập đầy đủ với giá B2B, thông số kỹ thuật và chính sách phân phối.
            </p>
          </div>
          <Link
            href="/catalogue"
            className="hidden md:flex items-center gap-2 text-[#C9A84C] hover:text-[#E2C97E] transition-colors text-sm font-medium"
          >
            Xem tất cả
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>

        {/* Catalogue cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogues.slice(0, 3).map((cat) => (
            <CatalogueCard key={cat.id} catalogue={cat} />
          ))}
        </div>

        {/* Mobile "see all" */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 border border-[#C9A84C]/30 text-[#C9A84C] px-5 py-2.5 rounded-full hover:bg-[#C9A84C]/10 transition-colors text-sm font-medium"
          >
            Xem tất cả catalogue
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>

        {/* B2B CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#C9A84C]/10 to-[#C9A84C]/5 border border-[#C9A84C]/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
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
      </div>
    </section>
  );
}

function CatalogueCard({ catalogue }: { catalogue: Catalogue }) {
  return (
    <Link
      href={`/catalogue/${catalogue.id}`}
      className="group relative bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-[#C9A84C]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50"
    >
      {/* Cover */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {catalogue.coverImageUrl ? (
          <img
            src={catalogue.coverImageUrl}
            alt={catalogue.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1500] to-[#0d0d0d] flex items-center justify-center">
            {/* Book illustration */}
            <div className="relative">
              <div className="w-20 h-28 bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 rounded-r-lg border border-[#C9A84C]/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-[#C9A84C]/40 text-xs font-bold uppercase tracking-widest leading-tight">
                    Smart<br />Furni
                  </div>
                </div>
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#C9A84C]/30 rounded-l-sm" />
            </div>
          </div>
        )}

        {/* Spine effect */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/60 to-transparent" />

        {/* Page count */}
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-60">
            <rect x="1" y="1" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1"/>
            <line x1="3" y1="3.5" x2="7" y2="3.5" stroke="currentColor" strokeWidth="0.8"/>
            <line x1="3" y1="5" x2="7" y2="5" stroke="currentColor" strokeWidth="0.8"/>
            <line x1="3" y1="6.5" x2="5.5" y2="6.5" stroke="currentColor" strokeWidth="0.8"/>
          </svg>
          {catalogue.pageCount} trang
        </div>

        {/* Hover CTA */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-[#C9A84C] text-black font-bold text-sm px-4 py-2 rounded-full transform translate-y-3 group-hover:translate-y-0 transition-transform duration-200">
            📖 Lật trang xem
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-sm mb-1 group-hover:text-[#C9A84C] transition-colors line-clamp-1">
          {catalogue.title}
        </h3>
        {catalogue.description && (
          <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">
            {catalogue.description}
          </p>
        )}
      </div>
    </Link>
  );
}
