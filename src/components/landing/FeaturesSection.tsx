"use client";
import { ScrollReveal } from "./ScrollReveal";
import type { SiteTheme, HomepageFeatureItem } from "@/lib/theme-store";
import { SvgIcon } from "@/components/ui/SvgIcon";

interface Props { theme: SiteTheme; }

const FW_MAP: Record<string, string> = {
  light: "300", normal: "400", medium: "500", semibold: "600", bold: "700",
};

// 3 lợi ích cốt lõi — ngắn gọn, benefit-focused
const CORE_BENEFITS = [
  {
    icon: "adjust",
    title: "Đổi tư thế nghỉ ngơi dễ hơn",
    desc: "Nâng đầu và chân theo góc mong muốn. Phù hợp đọc sách, xem TV hoặc thư giãn trước khi ngủ.",
    highlight: "Tư thế linh hoạt",
  },
  {
    icon: "star",
    title: "Điều khiển đơn giản",
    desc: "Remote vật lý và ứng dụng di động. Lưu tư thế quen thuộc, bấm một nút là quay lại góc đã chọn.",
    highlight: "Remote + app",
  },
  {
    icon: "shield",
    title: "Bền bỉ, bảo hành 5 năm toàn diện",
    desc: "Khung chắc, motor vận hành êm. Kỹ thuật viên giao lắp, cân chỉnh và hướng dẫn sử dụng tại nhà.",
    highlight: "Bảo hành 5 năm",
  },
];

const FEATURE_GRID = [
  { icon: "adjust", title: "Nâng đầu/chân", desc: "Đầu 0-70°, chân 0-45°." },
  { icon: "star", title: "Zero Gravity", desc: "Tư thế thư giãn, nâng đỡ cơ thể cân bằng hơn." },
  { icon: "light", title: "Đèn LED gầm", desc: "Ánh sáng dịu, tiện dùng ban đêm." },
  { icon: "wave", title: "Massage rung", desc: "Tùy chọn nhiều mức thư giãn." },
  { icon: "moon", title: "Lưu tư thế", desc: "Một chạm về góc nằm quen thuộc." },
  { icon: "mic", title: "Remote dễ bấm", desc: "Nút rõ, thao tác nhanh." },
  { icon: "clock", title: "Hẹn giờ", desc: "Cài thời gian nghỉ và tự tắt." },
  { icon: "phone", title: "App Bluetooth", desc: "Điều khiển trên điện thoại." },
];

export default function FeaturesSection({ theme }: Props) {
  const feat = theme.homepageSections?.features;
  const badge = feat?.badge;
  const title = feat?.title;
  const titleAccent = feat?.titleAccent;
  const subtitle = feat?.subtitle;
  const items: HomepageFeatureItem[] = feat?.items?.length ? feat.items : FEATURE_GRID;
  const backgroundImageUrl = feat?.backgroundImageUrl || "/uploads/products/smartfurni-bed-main.webp";
  const backgroundImageAlt = feat?.backgroundImageAlt || "Điều khiển giường SmartFurni qua ứng dụng di động";

  const primary = theme?.colors.primary ?? "#C9A84C";
  const textColor = theme?.colors.text ?? "#F5EDD6";
  const borderColor = theme?.colors.border ?? "#2D2500";
  const surfaceColor = theme?.colors.surface ?? "#1A1500";
  const bgFrom = theme?.hero?.bgGradientFrom ?? "#080600";

  return (
    <section id="features" className="relative isolate min-h-screen overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      {backgroundImageUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div
            role="img"
            aria-label={backgroundImageAlt}
            className="absolute inset-0 h-full w-full"
            style={{
              backgroundImage: `url("${backgroundImageUrl}")`,
              backgroundAttachment: "fixed",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              transform: "scale(1.04)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${bgFrom} 0%, rgba(8,6,0,0.78) 24%, rgba(8,6,0,0.82) 56%, ${bgFrom} 100%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 36%, ${primary}22 0%, transparent 42%)`,
            }}
          />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto space-y-16 sm:space-y-20">

        {/* ── 3 Core Benefits ── */}
        <div>
          <ScrollReveal variant="fadeUp" delay={0}>
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4"
                style={{ borderColor: `${primary}30`, backgroundColor: `${primary}08` }}>
                <span style={{ fontSize: badge ? `${badge.fontSize}px` : "11px", color: badge?.color ?? primary, fontWeight: badge ? FW_MAP[badge.fontWeight] : "500" }} className="tracking-widest uppercase">
                  {badge?.text ?? "Tại Sao Chọn SmartFurni"}
                </span>
              </div>
              <h2 className="mb-3">
                <span style={{ fontSize: title ? `clamp(24px, 3vw, ${title.fontSize}px)` : "clamp(24px, 3vw, 40px)", color: title?.color ?? textColor, fontWeight: title ? FW_MAP[title.fontWeight] : "300", display: "block" }}>
                  {title?.text ?? "Lợi ích thực sự"}
                </span>
                <span style={{ fontSize: titleAccent ? `clamp(24px, 3vw, ${titleAccent.fontSize}px)` : "clamp(24px, 3vw, 40px)", color: titleAccent?.color ?? primary, fontWeight: titleAccent ? FW_MAP[titleAccent.fontWeight] : "300", display: "block" }}>
                  {titleAccent?.text ?? "bạn cảm nhận được mỗi ngày"}
                </span>
              </h2>
              <p style={{ fontSize: subtitle ? `${subtitle.fontSize}px` : "15px", color: subtitle?.color ?? textColor, fontWeight: subtitle ? FW_MAP[subtitle.fontWeight] : "400", opacity: 0.5 }} className="max-w-xl mx-auto">
                {subtitle?.text ?? "Tận hưởng cảm giác nghỉ ngơi linh hoạt hơn mỗi ngày, từ đổi tư thế đến điều khiển nhanh và lắp đặt tận nơi."}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {CORE_BENEFITS.map((b, i) => (
              <ScrollReveal key={i} variant="fadeUp" delay={80 + i * 80}>
                <div
                  className="relative p-6 sm:p-7 rounded-3xl h-full flex flex-col gap-4 group"
                  style={{ backgroundColor: `${surfaceColor}E6`, border: `1px solid ${borderColor}`, backdropFilter: "blur(14px)" }}
                >
                  {/* Icon */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl"
                    style={{ backgroundColor: `${primary}12`, border: `1px solid ${primary}25` }}>
                    <SvgIcon name={b.icon} size={22} color={primary} strokeWidth={1.5} />
                  </div>

                  {/* Highlight badge */}
                  <span className="inline-block self-start text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${primary}18`, color: primary }}>
                    {b.highlight}
                  </span>

                  <div>
                    <h3 className="text-base font-semibold mb-2" style={{ color: textColor }}>{b.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: `${textColor}60` }}>{b.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* ── Feature grid (8 items) ── */}
        <div>
          <ScrollReveal variant="fadeUp" delay={0}>
            <div className="text-center mb-10">
              <h3 className="text-xl sm:text-2xl font-light mb-2" style={{ color: textColor }}>
                Tính năng chính <span style={{ color: primary }}>nhìn là hiểu</span>
              </h3>
              <p className="text-sm" style={{ color: `${textColor}45` }}>Những tiện ích thường dùng nhất khi nghỉ ngơi, đọc sách hoặc xem phim trên giường.</p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((f, i) => (
              <ScrollReveal key={i} variant="fadeUp" delay={60 + i * 50}>
                <div
                  className="group p-5 rounded-2xl transition-all duration-300 h-full"
                  style={{ backgroundColor: `${bgFrom}D9`, border: `1px solid ${borderColor}`, backdropFilter: "blur(12px)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${primary}40`;
                    (e.currentTarget as HTMLElement).style.backgroundColor = surfaceColor;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = borderColor;
                    (e.currentTarget as HTMLElement).style.backgroundColor = bgFrom;
                  }}
                >
                  <div className="mb-3 flex items-center justify-center w-9 h-9 rounded-xl"
                    style={{ backgroundColor: `${primary}10`, border: `1px solid ${primary}20` }}>
                    <SvgIcon name={f.icon} size={18} color={primary} strokeWidth={1.5} />
                  </div>
                  <h4 className="text-sm font-semibold mb-1.5" style={{ color: textColor }}>{f.title}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: `${textColor}50` }}>{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
