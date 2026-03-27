"use client";

import Link from "next/link";
import type { Catalogue } from "@/lib/catalogue-store";

interface Props {
  catalogues: Catalogue[];
}

export default function CatalogueListClient({ catalogues }: Props) {
  return (
    <div className="min-h-screen" style={{ background: "#080806" }}>
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)" }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 mb-8">
            <div className="h-px w-8" style={{ background: "linear-gradient(to right, transparent, #C9A84C)" }} />
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: "#C9A84C" }}>
              B2B Catalogue
            </span>
            <div className="h-px w-8" style={{ background: "linear-gradient(to left, transparent, #C9A84C)" }} />
          </div>

          <h1 className="font-black text-white leading-tight mb-5"
            style={{ fontSize: "clamp(32px, 5vw, 56px)", letterSpacing: "-0.02em" }}>
            Catalogue Sản Phẩm
            <br />
            <span style={{ color: "#C9A84C" }}>SmartFurni</span>
          </h1>

          <p className="max-w-lg mx-auto leading-relaxed font-light"
            style={{ fontSize: "clamp(14px, 1.5vw, 16px)", color: "rgba(255,255,255,0.45)" }}>
            Khám phá bộ sưu tập giường công thái học cao cấp dành cho đối tác B2B.
            Lật từng trang để xem chi tiết sản phẩm và bảng giá.
          </p>

          {/* Stats row */}
          {catalogues.length > 0 && (
            <div className="flex items-center justify-center gap-8 mt-10">
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>{catalogues.length}</div>
                <div className="text-[11px] uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Catalogue</div>
              </div>
              <div className="w-px h-8" style={{ background: "rgba(201,168,76,0.2)" }} />
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>
                  {catalogues.reduce((sum, c) => sum + c.pageCount, 0)}
                </div>
                <div className="text-[11px] uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Trang</div>
              </div>
              <div className="w-px h-8" style={{ background: "rgba(201,168,76,0.2)" }} />
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>
                  {catalogues.reduce((sum, c) => sum + c.viewCount, 0).toLocaleString()}
                </div>
                <div className="text-[11px] uppercase tracking-widest mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>Lượt xem</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px" style={{ background: "linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)" }} />
      </div>

      {/* Catalogue grid */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        {catalogues.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full"
              style={{ border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.04)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="#C9A84C" strokeWidth="1"/>
                <path d="M8 12h8M12 8v8" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Chưa có catalogue</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Catalogue sẽ được cập nhật sớm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {catalogues.map((cat, idx) => (
              <CatalogueCard key={cat.id} catalogue={cat} index={idx} />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden" style={{ borderTop: "1px solid rgba(201,168,76,0.1)", background: "#050503" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 50% 100% at 50% 100%, rgba(201,168,76,0.04) 0%, transparent 70%)" }} />
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="w-6 h-px mx-auto mb-6" style={{ background: "#C9A84C" }} />
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Cần tư vấn thêm?</h2>
          <p className="mb-8 font-light" style={{ color: "rgba(255,255,255,0.4)", fontSize: "15px" }}>
            Liên hệ với chúng tôi để nhận báo giá B2B và tư vấn giải pháp phù hợp.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/contact"
              className="font-bold px-7 py-3 rounded-sm transition-all hover:opacity-90"
              style={{ background: "#C9A84C", color: "#000", fontSize: "14px", letterSpacing: "0.04em" }}>
              Liên hệ ngay
            </Link>
            <Link href="/products"
              className="font-medium px-7 py-3 rounded-sm transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
              Xem sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CatalogueCard({ catalogue, index }: { catalogue: Catalogue; index: number }) {
  const formattedDate = new Date(catalogue.updatedAt).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  return (
    <Link href={`/catalogue/${catalogue.id}`}
      className="group relative flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-2"
      style={{
        background: "#0f0f0c",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "4px",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.25)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}>

      {/* Cover */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "3/4", background: "#1a1a14" }}>
        {catalogue.coverImageUrl ? (
          <img src={catalogue.coverImageUrl} alt={catalogue.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center"
            style={{ background: "linear-gradient(160deg, #1a1a10 0%, #0d0d08 100%)" }}>
            {/* Decorative frame */}
            <div className="absolute inset-6" style={{ border: "1px solid rgba(201,168,76,0.1)", borderRadius: "2px" }} />
            <div className="absolute inset-8" style={{ border: "1px solid rgba(201,168,76,0.05)", borderRadius: "1px" }} />
            <div className="text-center z-10">
              <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full"
                style={{ border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.04)" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="16" rx="2" stroke="#C9A84C" strokeWidth="0.8"/>
                  <path d="M6 10h8M10 6v8" stroke="#C9A84C" strokeWidth="0.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(201,168,76,0.4)" }}>
                SmartFurni
              </div>
            </div>
          </div>
        )}

        {/* Book spine */}
        <div className="absolute left-0 top-0 bottom-0 w-4 pointer-events-none"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 100%)" }} />

        {/* Page count */}
        <div className="absolute bottom-3 right-3"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "2px", padding: "3px 8px" }}>
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
            {catalogue.pageCount} trang
          </span>
        </div>

        {/* Number badge */}
        <div className="absolute top-3 left-3 w-6 h-6 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "2px" }}>
          <span className="text-[10px] font-bold" style={{ color: "#C9A84C" }}>
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Hover CTA */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}>
          <div className="flex items-center gap-2 font-bold text-sm px-5 py-2.5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
            style={{ background: "#C9A84C", color: "#000", borderRadius: "2px", letterSpacing: "0.04em" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Xem catalogue
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-white text-sm leading-snug mb-2 group-hover:text-[#C9A84C] transition-colors line-clamp-2"
          style={{ letterSpacing: "0.01em" }}>
          {catalogue.title}
        </h3>
        {catalogue.description && (
          <p className="text-xs line-clamp-2 mb-4 leading-relaxed font-light flex-1"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            {catalogue.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.25)" }}>
            {formattedDate}
          </span>
          {catalogue.viewCount > 0 && (
            <span className="text-[10px] font-light" style={{ color: "rgba(201,168,76,0.5)" }}>
              {catalogue.viewCount.toLocaleString()} lượt xem
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
