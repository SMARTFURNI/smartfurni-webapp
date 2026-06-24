"use client";

import { ScrollReveal } from "./ScrollReveal";
import { SvgIcon } from "@/components/ui/SvgIcon";
import type { HomepageContentCard, HomepageSectionMedia, SiteTheme } from "@/lib/theme-store";

interface Props { theme: SiteTheme; }

const FALLBACK_MOTION_STEPS: HomepageContentCard[] = [
  {
    icon: "book",
    title: "Nâng đầu",
    desc: "Tựa lưng đọc sách, xem phim hoặc làm việc nhẹ trên giường.",
    imageUrl: "/uploads/products/smartfurni-bed-main.webp",
    imageAlt: "Nâng đầu SmartFurni",
  },
  {
    icon: "adjust",
    title: "Nâng chân",
    desc: "Đổi góc chân để thư giãn sau ngày dài, không cần kê nhiều gối.",
    imageUrl: "/gsf150-standalone.jpg",
    imageAlt: "Nâng chân SmartFurni",
  },
  {
    icon: "star",
    title: "Zero Gravity",
    desc: "Tư thế nghỉ ngơi giúp cơ thể được nâng đỡ cân bằng hơn.",
    imageUrl: "/uploads/products/smartfurni-bed-main.webp",
    imageAlt: "Zero Gravity SmartFurni",
  },
  {
    icon: "phone",
    title: "Remote / app",
    desc: "Chọn nhanh tư thế quen thuộc bằng remote hoặc ứng dụng di động.",
    imageUrl: "/gsf150-standalone.jpg",
    imageAlt: "Remote và app SmartFurni",
  },
];

const FALLBACK_DETAIL_SHOTS: HomepageSectionMedia[] = [
  {
    label: "Motor",
    title: "Motor nâng hạ êm",
    desc: "Vận hành mượt, phù hợp không gian phòng ngủ gia đình.",
    type: "image",
    imageUrl: "/gsf150-exploded.jpg",
  },
  {
    label: "Khung",
    title: "Khung chắc chắn",
    desc: "Kết cấu khung gọn, bền và dễ phối với nhiều kiểu phòng.",
    type: "image",
    imageUrl: "/gsf150-wood-frame.jpg",
  },
  {
    label: "Remote",
    title: "Điều khiển dễ dùng",
    desc: "Nút bấm rõ ràng, thao tác nhanh cho cả gia đình.",
    type: "image",
    imageUrl: "/uploads/products/smartfurni-bed-main.webp",
  },
];

const BADGES = ["0-70°", "0-45°", "1 chạm", "Bluetooth"];
const DETAIL_ICONS = ["lightning", "shield", "phone"];

export default function HomeVisualProofSections({ theme }: Props) {
  const section = theme.homepageSections?.visualProof;
  const motionSteps = section?.items?.length ? section.items : FALLBACK_MOTION_STEPS;
  const detailShots = section?.media?.length ? section.media : FALLBACK_DETAIL_SHOTS;

  const primary = theme?.colors.primary ?? "#C9A84C";
  const secondary = theme?.colors.secondary ?? "#9A7A2E";
  const textColor = theme?.colors.text ?? "#F5EDD6";
  const borderColor = theme?.colors.border ?? "#2D2500";
  const surfaceColor = theme?.colors.surface ?? "#1A1500";
  const bgFrom = theme?.hero?.bgGradientFrom ?? "#080600";

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:py-24" style={{ borderTop: `1px solid ${borderColor}40` }}>
      <div className="mx-auto max-w-7xl space-y-14 sm:space-y-16">
        <ScrollReveal variant="fadeUp" delay={0}>
          <div className="mx-auto max-w-2xl text-center">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
              style={{ borderColor: `${primary}30`, backgroundColor: `${primary}08` }}
            >
              <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: primary }}>
                {section?.badge?.text ?? "Chuyển động thực tế"}
              </span>
            </div>
            <h2 className="font-light leading-tight" style={{ fontSize: "clamp(24px, 3vw, 40px)", color: textColor }}>
              {section?.title?.text ?? "Nhìn nhanh cách giường"} <span style={{ color: primary }}>{section?.titleAccent?.text ?? "thay đổi tư thế"}</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed" style={{ color: `${textColor}55` }}>
              {section?.subtitle?.text ?? "Dễ dàng chuyển từ nằm nghỉ sang đọc sách, xem phim hoặc thư giãn chỉ với remote hoặc ứng dụng trên điện thoại."}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {motionSteps.map((item, index) => (
            <ScrollReveal key={item.title} variant="fadeUp" delay={70 + index * 50}>
              <article className="overflow-hidden rounded-3xl h-full" style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={item.imageUrl || FALLBACK_MOTION_STEPS[index % FALLBACK_MOTION_STEPS.length].imageUrl}
                    alt={item.imageAlt || `${item.title} SmartFurni`}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ backgroundColor: `${primary}E6`, color: bgFrom }}>
                    {BADGES[index] || "SmartFurni"}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${bgFrom}CC`, border: `1px solid ${primary}30` }}>
                      <SvgIcon name={item.icon || "star"} size={18} color={primary} />
                    </div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  </div>
                </div>
                <p className="p-5 text-sm leading-relaxed" style={{ color: `${textColor}62` }}>
                  {item.desc}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
          <ScrollReveal variant="fadeRight" delay={0}>
            <div className="flex h-full flex-col justify-between rounded-3xl p-6 sm:p-8" style={{ backgroundColor: bgFrom, border: `1px solid ${borderColor}` }}>
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <SvgIcon name="camera" size={22} color={primary} />
                  <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: primary }}>Cận cảnh sản phẩm</span>
                </div>
                <h2 className="text-2xl font-light sm:text-3xl" style={{ color: textColor }}>
                  Cảm nhận độ chắc chắn từ từng chi tiết
                </h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: `${textColor}55` }}>
                  Từ motor nâng hạ, khung nâng đến bộ điều khiển, SmartFurni được thiết kế để vận hành êm, gọn và dễ dùng trong phòng ngủ hằng ngày.
                </p>
              </div>
              <div className="mt-7 grid grid-cols-3 gap-3">
                {detailShots.slice(0, 3).map((item, index) => (
                  <div key={`${item.label}-${index}`} className="rounded-2xl px-3 py-4 text-center" style={{ backgroundColor: `${primary}10`, border: `1px solid ${primary}20` }}>
                    <div className="text-sm font-semibold" style={{ color: primary }}>{item.label || item.title}</div>
                    <div className="mt-1 text-[11px]" style={{ color: `${textColor}45` }}>thiết kế kỹ</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {detailShots.map((item, index) => (
              <ScrollReveal key={item.title} variant="fadeUp" delay={80 + index * 60}>
                <article className="overflow-hidden rounded-3xl h-full" style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}` }}>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={item.imageUrl || FALLBACK_DETAIL_SHOTS[index % FALLBACK_DETAIL_SHOTS.length].imageUrl} alt={item.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, color: bgFrom }}>
                      <SvgIcon name={DETAIL_ICONS[index] || "camera"} size={18} color={bgFrom} />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-sm font-semibold" style={{ color: textColor }}>{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: `${textColor}55` }}>{item.desc}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
