"use client";

import Link from "next/link";
import type { Catalogue } from "@/lib/catalogue-store";

interface Props {
  catalogues: Catalogue[];
}

export default function CatalogueListClient({ catalogues }: Props) {
  return (
    <div className="min-h-screen bg-[#0a0800]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A84C]/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full" />
            <span className="text-[#C9A84C] text-xs font-medium tracking-wider uppercase">B2B Catalogue</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Catalogue Sản Phẩm
            <br />
            <span className="text-[#C9A84C]">SmartFurni</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Khám phá bộ sưu tập giường công thái học cao cấp dành cho đối tác B2B.
            Lật từng trang để xem chi tiết sản phẩm và bảng giá.
          </p>
        </div>
      </div>

      {/* Catalogue grid */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        {catalogues.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-white mb-2">Chưa có catalogue</h2>
            <p className="text-gray-500">Catalogue sẽ được cập nhật sớm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogues.map((cat) => (
              <CatalogueCard key={cat.id} catalogue={cat} />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="border-t border-[#C9A84C]/10 bg-[#0d0b00]">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Cần tư vấn thêm?</h2>
          <p className="text-gray-400 mb-6">
            Liên hệ với chúng tôi để nhận báo giá B2B và tư vấn giải pháp phù hợp.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/contact"
              className="bg-[#C9A84C] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#E2C97E] transition-colors"
            >
              Liên hệ ngay
            </Link>
            <Link
              href="/products"
              className="border border-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              Xem sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CatalogueCard({ catalogue }: { catalogue: Catalogue }) {
  const formattedDate = new Date(catalogue.updatedAt).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  return (
    <Link
      href={`/catalogue/${catalogue.id}`}
      className="group relative bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-[#C9A84C]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#C9A84C]/5"
    >
      {/* Cover image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#1a1a1a]">
        {catalogue.coverImageUrl ? (
          <img
            src={catalogue.coverImageUrl}
            alt={catalogue.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d]">
            <div className="text-center">
              <div className="text-5xl mb-3 opacity-20">📋</div>
              <div className="text-[#C9A84C]/40 text-xs font-bold uppercase tracking-widest">
                SmartFurni
              </div>
            </div>
          </div>
        )}

        {/* Book spine effect */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/60 to-transparent" />

        {/* Page count badge */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
          {catalogue.pageCount} trang
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[#C9A84C]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-[#C9A84C] text-black font-bold text-sm px-4 py-2 rounded-full transform translate-y-2 group-hover:translate-y-0 transition-transform">
            Xem catalogue →
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-base mb-1 group-hover:text-[#C9A84C] transition-colors line-clamp-1">
          {catalogue.title}
        </h3>
        {catalogue.description && (
          <p className="text-gray-500 text-xs line-clamp-2 mb-3 leading-relaxed">
            {catalogue.description}
          </p>
        )}
        <div className="flex items-center justify-between text-[11px] text-gray-600">
          <span>Cập nhật {formattedDate}</span>
          {catalogue.viewCount > 0 && (
            <span>{catalogue.viewCount.toLocaleString()} lượt xem</span>
          )}
        </div>
      </div>
    </Link>
  );
}
