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
    title: "Ngủ đúng tư thế, giảm đau lưng",
    desc: "Điều chỉnh góc đầu & chân chính xác từng độ. Tư thế Zero Gravity giảm áp lực cột sống, cải thiện tuần hoàn máu trong khi ngủ.",
    highlight: "Giảm đau lưng rõ rệt",
  },
  {
    icon: "star",
    title: "Điều khiển đơn giản, cả nhà dùng được",
    desc: "Remote vật lý + ứng dụng di động. Lưu 6 tư thế yêu thích, bấm 1 nút là về đúng vị trí. Phù hợp từ người cao tuổi đến trẻ em.",
    highlight: "Dễ dùng cho mọi lứa tuổi",
  },
  {
    icon: "wave",
    title: "Bền bỉ, bảo hành 5 năm toàn diện",
    desc: "Motor nhập khẩu, kiểm định 50.000 lần nâng hạ. Bảo hành 5 năm linh kiện điện, lắp đặt tận nhà trong 2 giờ, hỗ trợ kỹ thuật 24/7.",
    highlight: "Bảo hành 5 năm",
  },
];

const FEATURE_GRID = [
  { icon: "adjust", title: "Điều chỉnh góc chính xác", desc: "Đầu 0–70°, chân 0–45°. Motor êm ái, không rung lắc." },
  { icon: "star", title: "6 Preset thông minh", desc: "Nằm phẳng, Đọc sách, Xem TV, Zero Gravity và nhiều hơn." },
  { icon: "light", title: "Đèn LED thông minh", desc: "16 triệu màu, hẹn giờ tắt, điều chỉnh qua app." },
  { icon: "wave", title: "Massage tích hợp", desc: "3 mức độ, hẹn giờ tự động tắt sau 15–60 phút." },
  { icon: "moon", title: "Theo dõi giấc ngủ", desc: "Phân tích chu kỳ ngủ, điểm chất lượng, biểu đồ 7 ngày." },
  { icon: "mic", title: "Điều khiển giọng nói", desc: "Ra lệnh tiếng Việt: 'Nâng đầu lên', 'Bật đèn'." },
  { icon: "clock", title: "Hẹn giờ thông minh", desc: "Báo thức nhẹ nhàng bằng cách nâng đầu từ từ." },
  { icon: "phone", title: "Bluetooth 5.0", desc: "Kết nối ổn định 10m, tự động kết nối lại khi mở app." },
];

export default function FeaturesSection({ theme }: Props) {
  const feat = theme.homepageSections?.features;
  const badge = feat?.badge;
  const title = feat?.title;
  const titleAccent = feat?.titleAccent;
  const subtitle = feat?.subtitle;
  const items: HomepageFeatureItem[] = feat?.items?.length ? feat.items : FEATURE_GRID;

  const primary = theme?.colors.primary ?? "#C9A84C";
  const textColor = theme?.colors.text ?? "#F5EDD6";
  const borderColor = theme?.colors.border ?? "#2D2500";
  const surfaceColor = theme?.colors.surface ?? "#1A1500";
  const bgFrom = theme?.hero?.bgGradientFrom ?? "#080600";

  return (
    <section id="features" className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-16 sm:space-y-20">

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
                {subtitle?.text ?? "Không chỉ là tính năng — SmartFurni thay đổi cách bạn ngủ, nghỉ ngơi và bắt đầu mỗi ngày mới."}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {CORE_BENEFITS.map((b, i) => (
              <ScrollReveal key={i} variant="fadeUp" delay={80 + i * 80}>
                <div
                  className="relative p-6 sm:p-7 rounded-3xl h-full flex flex-col gap-4 group"
                  style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}
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
                Đầy đủ tính năng <span style={{ color: primary }}>trong một chiếc giường</span>
              </h3>
              <p className="text-sm" style={{ color: `${textColor}45` }}>Tất cả tính năng được điều khiển qua remote hoặc ứng dụng SmartFurni</p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((f, i) => (
              <ScrollReveal key={i} variant="fadeUp" delay={60 + i * 50}>
                <div
                  className="group p-5 rounded-2xl transition-all duration-300 h-full"
                  style={{ backgroundColor: `${bgFrom}`, border: `1px solid ${borderColor}` }}
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
