"use client";
import { ScrollReveal } from "./ScrollReveal";
import type { SiteTheme, HomepageFeatureItem } from "@/lib/theme-store";

interface Props { theme: SiteTheme; }

const FW_MAP: Record<string, string> = {
  light: "300", normal: "400", medium: "500", semibold: "600", bold: "700",
};

const FEATURES = [
  {
    icon: "🛏️",
    title: "Điều chỉnh góc chính xác",
    desc: "Điều khiển góc đầu (0–70°) và góc chân (0–45°) với độ chính xác từng độ. Motor êm ái, không rung lắc.",
  },
  {
    icon: "✨",
    title: "Preset thông minh",
    desc: "6 chế độ có sẵn: Nằm phẳng, Đọc sách, Xem TV, Ngồi dậy, Chống ngáy, Không trọng lực. Lưu vị trí yêu thích cá nhân.",
  },
  {
    icon: "💡",
    title: "Đèn LED thông minh",
    desc: "Điều chỉnh màu sắc, độ sáng và hẹn giờ tắt đèn. Hỗ trợ 16 triệu màu với color wheel trực quan.",
  },
  {
    icon: "🎵",
    title: "Massage tích hợp",
    desc: "3 mức độ massage: Nhẹ, Vừa, Mạnh. Hẹn giờ massage tự động tắt sau 15–60 phút.",
  },
  {
    icon: "🌙",
    title: "Theo dõi giấc ngủ",
    desc: "Phân tích chu kỳ ngủ, điểm chất lượng giấc ngủ, biểu đồ 7 ngày và lời khuyên cải thiện.",
  },
  {
    icon: "🎙️",
    title: "Điều khiển giọng nói",
    desc: "Ra lệnh bằng tiếng Việt: 'Nâng đầu lên', 'Bật đèn', 'Về vị trí ngủ'. Phản hồi bằng giọng nói tự nhiên.",
  },
  {
    icon: "⏰",
    title: "Hẹn giờ thông minh",
    desc: "Đặt lịch giường tự động điều chỉnh theo giờ. Báo thức nhẹ nhàng bằng cách nâng đầu từ từ.",
  },
  {
    icon: "📱",
    title: "Kết nối Bluetooth 5.0",
    desc: "Kết nối ổn định trong phạm vi 10m. Tự động kết nối lại khi mở app. Hỗ trợ iOS và Android.",
  },
];

export default function FeaturesSection({ theme }: Props) {
  const feat = theme.homepageSections?.features;
  const badge = feat?.badge;
  const title = feat?.title;
  const titleAccent = feat?.titleAccent;
  const subtitle = feat?.subtitle;
  const items: HomepageFeatureItem[] = feat?.items?.length ? feat.items : FEATURES;

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <ScrollReveal variant="fadeUp" delay={0}>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5 mb-4">
              <span style={{ fontSize: badge ? `${badge.fontSize}px` : "12px", color: badge?.color ?? "#C9A84C", fontWeight: badge ? FW_MAP[badge.fontWeight] : "500" }} className="tracking-wider">
                {badge?.text ?? "TÍNH NĂNG NỔI BẬT"}
              </span>
            </div>
            <h2 className="mb-4">
              <span style={{ fontSize: title ? `${title.fontSize}px` : "36px", color: title?.color ?? "#F5EDD6", fontWeight: title ? FW_MAP[title.fontWeight] : "300", display: "block" }}>
                {title?.text ?? "Mọi thứ bạn cần cho"}
              </span>
              <span style={{ fontSize: titleAccent ? `${titleAccent.fontSize}px` : "36px", color: titleAccent?.color ?? "#C9A84C", fontWeight: titleAccent ? FW_MAP[titleAccent.fontWeight] : "300", display: "block" }}>
                {titleAccent?.text ?? "giấc ngủ hoàn hảo"}
              </span>
            </h2>
            <p style={{ fontSize: subtitle ? `${subtitle.fontSize}px` : "14px", color: subtitle?.color ?? "#F5EDD6", fontWeight: subtitle ? FW_MAP[subtitle.fontWeight] : "400", opacity: 0.5 }} className="max-w-xl mx-auto">
              {subtitle?.text ?? "SmartFurni tích hợp công nghệ điều khiển thông minh vào từng chi tiết, mang lại trải nghiệm ngủ được cá nhân hóa hoàn toàn."}
            </p>
          </div>
        </ScrollReveal>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((f, i) => (
            <ScrollReveal key={i} variant="fadeUp" delay={100 + i * 70}>
              <div className="group p-6 rounded-2xl bg-[#1A1600] border border-[#2E2800] hover:border-[#C9A84C]/40 hover:bg-[#221D00] transition-all duration-300 h-full">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-sm font-semibold text-[#F5EDD6] mb-2 group-hover:text-[#C9A84C] transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-[#F5EDD6]/50 leading-relaxed">{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
