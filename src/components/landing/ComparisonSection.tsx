"use client";
import { ScrollReveal } from "./ScrollReveal";
import type { SiteTheme } from "@/lib/theme-types";

interface Props { theme: SiteTheme; }

const ROWS = [
  { label: "Tư thế sử dụng", normal: "Nằm phẳng cố định", smart: "Nâng đầu/chân, Zero Gravity" },
  { label: "Đọc sách / xem phim", normal: "Kê gối thủ công", smart: "Tựa lưng theo góc đã lưu" },
  { label: "Thư giãn cuối ngày", normal: "Ít lựa chọn tư thế", smart: "Đổi góc nằm chỉ với một chạm" },
  { label: "Điều khiển", normal: "Không có", smart: "Remote vật lý + app iOS/Android" },
  { label: "Massage/đèn gầm", normal: "Không tích hợp", smart: "Tùy chọn massage rung, LED gầm" },
  { label: "Bảo hành", normal: "Tùy nơi bán", smart: "Bảo hành 5 năm theo chính sách" },
  { label: "Lắp đặt", normal: "Tự xử lý/thuê riêng", smart: "Kỹ thuật viên giao lắp tận nhà" },
];

export default function ComparisonSection({ theme }: Props) {
  const primary = theme?.colors.primary ?? "#C9A84C";
  const textColor = theme?.colors.text ?? "#F5EDD6";
  const borderColor = theme?.colors.border ?? "#2D2500";
  const surfaceColor = theme?.colors.surface ?? "#1A1500";
  const bgFrom = theme?.hero?.bgGradientFrom ?? "#080600";

  return (
    <section className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6" style={{ borderTop: `1px solid ${borderColor}40` }}>
      <div className="max-w-5xl mx-auto">
        <ScrollReveal variant="fadeUp" delay={0}>
          <div className="text-center mb-10 sm:mb-14">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4"
              style={{ borderColor: `${primary}30`, backgroundColor: `${primary}08` }}
            >
              <span style={{ color: primary }} className="text-[11px] font-medium tracking-widest uppercase">So Sánh</span>
            </div>
            <h2 className="leading-tight">
              <span className="block font-light" style={{ fontSize: "clamp(24px, 3vw, 40px)", color: textColor }}>Giường thường</span>
              <span className="block font-light" style={{ fontSize: "clamp(24px, 3vw, 40px)", color: primary }}>khác gì SmartFurni?</span>
            </h2>
            <p className="mt-3 text-sm max-w-lg mx-auto" style={{ color: `${textColor}50` }}>
              Những khác biệt bạn cảm nhận được ngay trong tuần đầu sử dụng.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fadeUp" delay={100}>
          <div className="rounded-3xl overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
            {/* Table header */}
            <div
              className="grid grid-cols-3 text-xs font-semibold tracking-wider uppercase"
              style={{ backgroundColor: surfaceColor, borderBottom: `1px solid ${borderColor}` }}
            >
              <div className="px-4 sm:px-6 py-4" style={{ color: `${textColor}40` }}>Tiêu chí</div>
              <div className="px-4 sm:px-6 py-4 text-center" style={{ color: `${textColor}40` }}>Giường thường</div>
              <div
                className="px-4 sm:px-6 py-4 text-center"
                style={{ color: primary, backgroundColor: `${primary}08` }}
              >
                SmartFurni ✓
              </div>
            </div>

            {/* Rows */}
            {ROWS.map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-3 transition-colors duration-150"
                style={{
                  borderBottom: i < ROWS.length - 1 ? `1px solid ${borderColor}40` : "none",
                  backgroundColor: i % 2 === 0 ? bgFrom : "transparent",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = `${primary}06`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = i % 2 === 0 ? bgFrom : "transparent"; }}
              >
                <div className="px-4 sm:px-6 py-4 text-xs sm:text-sm font-medium" style={{ color: `${textColor}70` }}>
                  {row.label}
                </div>
                <div className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-center" style={{ color: `${textColor}40` }}>
                  <span className="inline-flex items-center justify-center gap-1.5 leading-snug">
                    <span className="text-red-400 text-base">✗</span>
                    <span>{row.normal}</span>
                  </span>
                </div>
                <div
                  className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-center"
                  style={{ color: `${textColor}80`, backgroundColor: `${primary}05` }}
                >
                  <span className="inline-flex items-center justify-center gap-1.5 leading-snug">
                    <span style={{ color: primary }} className="text-base">✓</span>
                    <span>{row.smart}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
