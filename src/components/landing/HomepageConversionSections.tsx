import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ScrollReveal } from "./ScrollReveal";
import type { SiteTheme, HomepageGenericSection, HomepageContentCard } from "@/lib/theme-store";

interface Props { theme: SiteTheme; }

type SectionKey = keyof typeof FALLBACKS;
type MediaKind = "image" | "video";

type SectionMediaItem = {
  label: string;
  title: string;
  desc: string;
  type: MediaKind;
  imageUrl: string;
  linkUrl?: string;
  videoUrl?: string;
};

type EditableSection = HomepageGenericSection & {
  media?: SectionMediaItem[];
  mediaLayout?: "split" | "stack" | "rail" | "mosaic";
};

const FW_MAP: Record<string, string> = {
  light: "300", normal: "400", medium: "500", semibold: "600", bold: "700",
};

const GOLD = "#C9A84C";
const CREAM = "#F5EDD6";

const DEFAULT_MEDIA: Record<SectionKey, SectionMediaItem[]> = {
  problems: [
    { label: "Tình huống", title: "Đọc sách, xem TV không cần kê gối", desc: "Một chạm nâng đầu, giữ phòng ngủ gọn và sang.", type: "image", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/products" },
    { label: "Video demo", title: "Chuyển tư thế êm", desc: "Đặt clip nâng đầu, nâng chân hoặc Zero Gravity.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  solutions: [
    { label: "Gợi ý", title: "Chọn nhanh theo nhu cầu", desc: "Gia đình, căn hộ, công nghệ hoặc đại lý đều có lối đi riêng.", type: "image", imageUrl: "/gsf150-wood-frame.jpg", linkUrl: "/products" },
    { label: "Tư vấn", title: "Đặt lịch trải nghiệm", desc: "Dẫn khách đến showroom hoặc nhận video tư vấn mẫu phù hợp.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/contact", videoUrl: "#demo" },
  ],
  technology: [
    { label: "Bóc tách", title: "Motor, khung, cơ cấu nâng", desc: "Ảnh kỹ thuật lớn giúp khách thấy giá trị bên trong.", type: "image", imageUrl: "/gsf150-exploded.jpg", linkUrl: "/products/gsf150" },
    { label: "Demo", title: "Vận hành êm và chính xác", desc: "Ô video cho close-up remote, motor và preset một chạm.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  postures: [
    { label: "Tư thế", title: "Zero Gravity / đọc sách / nâng chân", desc: "Một khung hình lớn giúp hình dung lợi ích nhanh hơn.", type: "image", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/products" },
    { label: "Video", title: "Chuyển động thực tế", desc: "Gắn clip ngắn 15–30s mô tả các tư thế nổi bật.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  comparison: [
    { label: "So sánh", title: "Từ giường thường đến trải nghiệm thông minh", desc: "Một hình ảnh sản phẩm làm nền cho bảng so sánh ít chữ.", type: "image", imageUrl: "/gsf150-standalone.jpg", linkUrl: "/products" },
  ],
  trust: [
    { label: "Showroom", title: "Trải nghiệm trực tiếp", desc: "Không gian thật, sản phẩm thật và quy trình rõ ràng.", type: "image", imageUrl: "/gsf150-standalone.jpg", linkUrl: "/contact" },
    { label: "Review", title: "Video khách hàng tại nhà", desc: "Clip bàn giao và hướng dẫn sử dụng thực tế.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  process: [
    { label: "Quy trình", title: "Tư vấn → giao lắp → bảo hành", desc: "Timeline mua hàng rõ ràng giúp giảm băn khoăn.", type: "image", imageUrl: "/gsf150-wood-frame.jpg", linkUrl: "/contact" },
    { label: "Hướng dẫn", title: "Bàn giao và sử dụng remote", desc: "Ô video cho clip kỹ thuật viên hướng dẫn sau lắp đặt.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  b2b: [
    { label: "Đối tác", title: "Gói trưng bày showroom", desc: "Catalogue, POSM và bộ demo cho đại lý.", type: "image", imageUrl: "/gsf150-exploded.jpg", linkUrl: "/lp/doi-tac-showroom-nem" },
    { label: "Training", title: "Video đào tạo bán hàng", desc: "Nội dung hướng dẫn tư vấn và lắp đặt.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/lp/doi-tac-showroom-nem#dang-ky", videoUrl: "#demo" },
  ],
  faq: [
    { label: "Hỏi nhanh", title: "Giải đáp trước khi đặt lịch", desc: "FAQ ngắn giúp khách tự tin hơn trước khi liên hệ.", type: "image", imageUrl: "/smartfurni-logo-transparent.png", linkUrl: "/contact#faq" },
  ],
};

function textStyle(block: HomepageGenericSection["title"], extra?: CSSProperties): CSSProperties {
  return {
    fontSize: `clamp(${Math.max(20, Math.round(block.fontSize * 0.7))}px, 3.2vw, ${block.fontSize}px)`,
    color: block.color,
    fontWeight: FW_MAP[block.fontWeight],
    ...extra,
  };
}

function itemTextStyle(size = 14): CSSProperties {
  return { color: CREAM, fontSize: `${size}px` };
}

function getSection(section: EditableSection | undefined, fallback: EditableSection): EditableSection {
  return section ?? fallback;
}

function getMedia(key: SectionKey, section?: EditableSection): SectionMediaItem[] {
  const fromTheme = section?.media?.filter((item) => item.imageUrl || item.videoUrl || item.title);
  return fromTheme?.length ? fromTheme : DEFAULT_MEDIA[key];
}

function hrefFor(media: SectionMediaItem) {
  return media.videoUrl || media.linkUrl || "#";
}

function Header({ section, fallback, align = "center" }: { section?: EditableSection; fallback: EditableSection; align?: "left" | "center" }) {
  const cfg = getSection(section, fallback);
  const aligned = align === "center";

  return (
    <ScrollReveal variant="fadeUp" delay={0}>
      <div className={`${aligned ? "text-center mx-auto" : "text-left"} mb-8 sm:mb-10 max-w-3xl`}>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5 mb-4 shadow-[0_0_30px_rgba(201,168,76,0.08)] ${aligned ? "mx-auto" : ""}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-[#C9A84C]" />
          <span style={{ fontSize: `${cfg.badge.fontSize}px`, color: cfg.badge.color, fontWeight: FW_MAP[cfg.badge.fontWeight] }} className="tracking-[0.22em] uppercase">
            {cfg.badge.text}
          </span>
        </div>
        <h2 className="mb-3 leading-[0.95] tracking-[-0.045em]">
          <span style={textStyle(cfg.title, { display: "block" })}>{cfg.title.text}</span>
          <span style={textStyle(cfg.titleAccent, { display: "block" })}>{cfg.titleAccent.text}</span>
        </h2>
        <p style={{ fontSize: `${cfg.subtitle.fontSize}px`, color: cfg.subtitle.color, fontWeight: FW_MAP[cfg.subtitle.fontWeight], opacity: 0.66 }} className={`${aligned ? "mx-auto" : ""} max-w-2xl leading-relaxed`}>
          {cfg.subtitle.text}
        </p>
      </div>
    </ScrollReveal>
  );
}

function LineIcon({ value, index }: { value?: string; index: number }) {
  const isNumber = value && /^[0-9?]+$/.test(value);
  if (isNumber) return <span className="text-sm font-semibold text-[#EAD27A]">{value}</span>;

  const paths = [
    "M4 15.5c2.7-5.4 7.5-8.2 16-8.2-.4 7.5-4.8 12.1-12.7 12.1L4 15.5Z M8.4 16c2.1-2.1 5.3-4.4 9.5-5.8",
    "M5 18h14 M7 18V9.5L12 5l5 4.5V18 M10 18v-5h4v5",
    "M4.5 14.5h15 M6.5 14.5l2.2-6h6.6l2.2 6 M9 8.5V6h6v2.5 M8 18h8",
    "M6 7h12v10H6z M9 10h6 M9 14h3 M18 9.5l2-2 M6 9.5 4-4",
    "M12 4a8 8 0 1 0 8 8 M12 4v8l4.8 2.8",
    "M12 3.8 20 8.4v6.9L12 20 4 15.3V8.4L12 3.8Z M12 8.2v8.9",
    "M7 12.5c1.4-3.4 3.1-5.1 5-5.1s3.6 1.7 5 5.1c-1.4 3.4-3.1 5.1-5 5.1s-3.6-1.7-5-5.1Z M12 14.4a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z",
  ];

  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
      <path d={paths[index % paths.length]} stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PremiumIcon({ value, index, small = false }: { value?: string; index: number; small?: boolean }) {
  return (
    <div className={`${small ? "h-10 w-10 rounded-2xl" : "h-12 w-12 rounded-[1.15rem]"} flex shrink-0 items-center justify-center border border-[#C9A84C]/25 bg-white/[0.035] text-[#C9A84C] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-md`}>
      <LineIcon value={value} index={index} />
    </div>
  );
}

function MediaFrame({ media, priority = false, tall = false, variant = "large" }: { media: SectionMediaItem; priority?: boolean; tall?: boolean; variant?: "large" | "compact" }) {
  const isVideo = media.type === "video" || Boolean(media.videoUrl);
  const content = (
    <div className="group relative overflow-hidden rounded-[1.75rem] border border-[#C9A84C]/18 bg-[#120E00] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
      <div className={`relative overflow-hidden ${tall ? "min-h-[460px]" : variant === "large" ? "min-h-[320px]" : "min-h-[210px]"}`}>
        <img src={media.imageUrl} alt={media.title} className="absolute inset-0 h-full w-full object-cover opacity-82 transition-transform duration-700 group-hover:scale-[1.035]" loading={priority ? "eager" : "lazy"} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <span className="mb-3 inline-flex rounded-full bg-[#C9A84C]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black">{media.label}</span>
          <h3 className={`${variant === "large" ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"} max-w-xl font-semibold leading-tight tracking-[-0.03em] text-[#F5EDD6]`}>{media.title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#F5EDD6]/66">{media.desc}</p>
        </div>
        {isVideo && (
          <div className="absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#F5EDD6]/12 text-[#F5EDD6] shadow-[0_0_60px_rgba(201,168,76,0.32)] backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <a href={hrefFor(media)} className="block" aria-label={media.title}>
      {content}
    </a>
  );
}

function EditorialCard({ item, index, featured = false }: { item: HomepageContentCard; index: number; featured?: boolean }) {
  return (
    <ScrollReveal variant="fadeUp" delay={90 + index * 55}>
      <div className={`${featured ? "min-h-[210px]" : "min-h-[155px]"} group relative overflow-hidden rounded-[1.45rem] border border-[#C9A84C]/14 bg-gradient-to-br from-[#1A1500] via-[#100C00] to-[#080600] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/42 hover:shadow-[0_24px_80px_rgba(0,0,0,0.32)]`}>
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#C9A84C]/10 blur-3xl transition-opacity group-hover:opacity-90" />
        <PremiumIcon value={item.icon} index={index} />
        <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[#F5EDD6] transition-colors group-hover:text-[#E2C97E]">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#F5EDD6]/56">{item.desc}</p>
      </div>
    </ScrollReveal>
  );
}

function MiniCard({ item, index, active = false }: { item: HomepageContentCard; index: number; active?: boolean }) {
  return (
    <ScrollReveal variant="fadeUp" delay={80 + index * 45}>
      <div className={`group h-full rounded-[1.35rem] border p-4 transition-all duration-300 ${active ? "border-[#C9A84C]/45 bg-[#C9A84C]/10" : "border-[#C9A84C]/12 bg-white/[0.025] hover:border-[#C9A84C]/34 hover:bg-white/[0.045]"}`}>
        <PremiumIcon value={item.icon} index={index} small />
        <h3 className="mt-4 text-sm font-semibold text-[#F5EDD6]">{item.title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[#F5EDD6]/55">{item.desc}</p>
      </div>
    </ScrollReveal>
  );
}

function ProblemsSection({ section, fallback }: { section?: EditableSection; fallback: EditableSection }) {
  const cfg = getSection(section, fallback);
  const items = cfg.items?.length ? cfg.items : fallback.items;
  const media = getMedia("problems", cfg);

  return (
    <SectionShell id="problems" className="bg-[radial-gradient(circle_at_20%_0%,rgba(201,168,76,0.12),transparent_34%),#0D0A00]">
      <div className="grid items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
        <div>
          <Header section={cfg} fallback={fallback} align="left" />
          <div className="grid gap-4 sm:grid-cols-2">
            {items.slice(0, 4).map((item, index) => <EditorialCard key={`${item.title}-${index}`} item={item} index={index} featured={index === 0} />)}
          </div>
        </div>
        <ScrollReveal variant="fadeLeft" delay={140}>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.4rem] bg-[#C9A84C]/8 blur-2xl" />
            <MediaFrame media={media[0]} tall priority />
            {media[1] && (
              <div className="mt-4 lg:absolute lg:-bottom-6 lg:-left-8 lg:w-[58%]">
                <MediaFrame media={media[1]} variant="compact" />
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </SectionShell>
  );
}

function SolutionsSection({ section, fallback }: { section?: EditableSection; fallback: EditableSection }) {
  const cfg = getSection(section, fallback);
  const items = cfg.items?.length ? cfg.items : fallback.items;
  const media = getMedia("solutions", cfg);

  return (
    <SectionShell id="solutions" className="bg-[#0B0800]">
      <Header section={cfg} fallback={fallback} />
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <ScrollReveal variant="fadeRight" delay={80}>
          <div className="grid h-full gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {items.slice(0, 5).map((item, index) => <MiniCard key={`${item.title}-${index}`} item={item} index={index} active={index === 1} />)}
          </div>
        </ScrollReveal>
        <div className="grid gap-4 lg:grid-rows-[1fr_auto]">
          <MediaFrame media={media[0]} />
          {media[1] && <MediaFrame media={media[1]} variant="compact" />}
        </div>
      </div>
    </SectionShell>
  );
}

function TechnologySection({ section, fallback }: { section?: EditableSection; fallback: EditableSection }) {
  const cfg = getSection(section, fallback);
  const items = cfg.items?.length ? cfg.items : fallback.items;
  const media = getMedia("technology", cfg);

  return (
    <SectionShell id="technology" className="bg-[linear-gradient(180deg,#0D0A00,#080600)]">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <Header section={cfg} fallback={fallback} align="left" />
          <ScrollReveal variant="fadeRight" delay={120}>
            <div className="relative rounded-[2rem] border border-[#C9A84C]/16 bg-[#120E00] p-3 shadow-[0_35px_110px_rgba(0,0,0,0.34)]">
              <MediaFrame media={media[0]} tall />
              <div className="pointer-events-none absolute inset-6 hidden rounded-[1.5rem] border border-white/10 lg:block" />
            </div>
          </ScrollReveal>
        </div>
        <div className="space-y-4">
          {items.slice(0, 4).map((item, index) => (
            <ScrollReveal key={`${item.title}-${index}`} variant="fadeLeft" delay={120 + index * 70}>
              <div className="flex gap-4 rounded-[1.4rem] border border-[#C9A84C]/12 bg-white/[0.025] p-4 backdrop-blur-md transition-colors hover:border-[#C9A84C]/35 hover:bg-white/[0.045]">
                <PremiumIcon value={item.icon} index={index} small />
                <div>
                  <h3 className="text-base font-semibold text-[#F5EDD6]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#F5EDD6]/56">{item.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
          {media[1] && <MediaFrame media={media[1]} variant="compact" />}
        </div>
      </div>
    </SectionShell>
  );
}

function PosturesSection({ section, fallback }: { section?: EditableSection; fallback: EditableSection }) {
  const cfg = getSection(section, fallback);
  const items = cfg.items?.length ? cfg.items : fallback.items;
  const media = getMedia("postures", cfg);

  return (
    <SectionShell id="postures" className="bg-[#0B0800]">
      <Header section={cfg} fallback={fallback} />
      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
        <MediaFrame media={media[0]} tall />
        <div className="grid gap-4 sm:grid-cols-2">
          {items.slice(0, 5).map((item, index) => <MiniCard key={`${item.title}-${index}`} item={item} index={index} active={index === 0} />)}
          {media[1] && <MediaFrame media={media[1]} variant="compact" />}
        </div>
      </div>
    </SectionShell>
  );
}

function ComparisonSection({ section, fallback }: { section?: EditableSection; fallback: EditableSection }) {
  const cfg = getSection(section, fallback);
  const items = cfg.items?.length ? cfg.items : fallback.items;
  const media = getMedia("comparison", cfg)[0];

  return (
    <SectionShell id="comparison" className="bg-[radial-gradient(circle_at_70%_15%,rgba(201,168,76,0.11),transparent_32%),#0D0A00]">
      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <Header section={cfg} fallback={fallback} align="left" />
        <ScrollReveal variant="fadeLeft" delay={120}>
          <div className="relative overflow-hidden rounded-[2rem] border border-[#C9A84C]/20 bg-[#120E00] shadow-[0_32px_100px_rgba(0,0,0,0.36)]">
            <img src={media.imageUrl} alt={media.title} className="absolute inset-0 h-full w-full object-cover opacity-20" loading="lazy" />
            <div className="relative grid gap-3 p-4 sm:p-6">
              {items.slice(0, 4).map((row, index) => (
                <div key={`${row.title}-${index}`} className="grid gap-3 rounded-[1.25rem] border border-white/10 bg-black/32 p-4 backdrop-blur-md md:grid-cols-[0.9fr_1fr_1fr] md:items-center">
                  <div className="flex items-center gap-3">
                    <PremiumIcon value={row.icon} index={index} small />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">{row.title}</span>
                  </div>
                  <p className="text-sm text-[#F5EDD6]/38 line-through">{row.icon}</p>
                  <p className="text-base font-semibold text-[#F5EDD6]">{row.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </SectionShell>
  );
}

function TrustSection({ section, fallback }: { section?: EditableSection; fallback: EditableSection }) {
  const cfg = getSection(section, fallback);
  const items = cfg.items?.length ? cfg.items : fallback.items;
  const media = getMedia("trust", cfg);

  return (
    <SectionShell id="trust" className="bg-[#0D0A00]">
      <Header section={cfg} fallback={fallback} />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <MediaFrame media={media[0]} tall />
          <div className="grid gap-4">
            {media[1] && <MediaFrame media={media[1]} variant="compact" />}
            {items.slice(0, 3).map((item, index) => <MiniCard key={`${item.title}-${index}`} item={item} index={index} active={index === 0} />)}
          </div>
        </div>
        <ScrollReveal variant="fadeLeft" delay={160}>
          <div className="h-full rounded-[2rem] border border-[#C9A84C]/18 bg-gradient-to-br from-[#1A1500] to-[#090700] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">Proof Board</p>
            <div className="mt-8 grid gap-5">
              {items.slice(0, 3).map((item, index) => (
                <div key={`${item.title}-proof-${index}`} className="border-b border-[#C9A84C]/14 pb-5 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <PremiumIcon value={item.icon} index={index} small />
                    <h3 className="text-lg font-semibold text-[#F5EDD6]">{item.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#F5EDD6]/58">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </SectionShell>
  );
}

function ProcessSection({ section, fallback }: { section?: EditableSection; fallback: EditableSection }) {
  const cfg = getSection(section, fallback);
  const items = cfg.items?.length ? cfg.items : fallback.items;
  const media = getMedia("process", cfg);

  return (
    <SectionShell id="process" className="bg-[#0B0800]">
      <Header section={cfg} fallback={fallback} />
      <div className="relative">
        <div className="absolute left-0 right-0 top-[3.1rem] hidden h-px bg-gradient-to-r from-transparent via-[#C9A84C]/35 to-transparent lg:block" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {items.slice(0, 5).map((item, index) => (
            <ScrollReveal key={`${item.title}-${index}`} variant="fadeUp" delay={80 + index * 65}>
              <div className="relative h-full rounded-[1.4rem] border border-[#C9A84C]/14 bg-[#120E00]/86 p-5 shadow-[0_18px_65px_rgba(0,0,0,0.24)] backdrop-blur-md">
                <PremiumIcon value={item.icon || String(index + 1)} index={index} />
                <h3 className="mt-5 text-base font-semibold text-[#F5EDD6]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#F5EDD6]/55">{item.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <MediaFrame media={media[0]} />
          {media[1] && <MediaFrame media={media[1]} variant="compact" />}
        </div>
      </div>
    </SectionShell>
  );
}

function B2BSection({ section, fallback }: { section?: EditableSection; fallback: EditableSection }) {
  const cfg = getSection(section, fallback);
  const items = cfg.items?.length ? cfg.items : fallback.items;
  const media = getMedia("b2b", cfg);

  return (
    <SectionShell id="b2b" className="bg-[radial-gradient(circle_at_18%_18%,rgba(201,168,76,0.14),transparent_34%),#0D0A00]">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <Header section={cfg} fallback={fallback} align="left" />
          <div className="grid gap-3 sm:grid-cols-2">
            {items.slice(0, 4).map((item, index) => <MiniCard key={`${item.title}-${index}`} item={item} index={index} />)}
          </div>
          <ScrollReveal variant="fadeUp" delay={360}>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/lp/doi-tac-showroom-nem#dang-ky" className="rounded-full bg-[#C9A84C] px-6 py-3 text-center text-sm font-semibold text-black transition-colors hover:bg-[#E2C97E]">Đăng ký đối tác B2B</Link>
              <Link href="/catalogue" className="rounded-full border border-[#C9A84C]/35 px-6 py-3 text-center text-sm font-semibold text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10">Xem catalogue</Link>
            </div>
          </ScrollReveal>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
          <MediaFrame media={media[0]} tall />
          <div className="grid gap-4">
            {media[1] && <MediaFrame media={media[1]} variant="compact" />}
            <ScrollReveal variant="fadeLeft" delay={220}>
              <div className="rounded-[1.5rem] border border-[#C9A84C]/16 bg-white/[0.03] p-5 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#C9A84C]">Partner Kit</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#F5EDD6]">Ảnh, video, catalogue, training.</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function FAQSection({ section, fallback }: { section?: EditableSection; fallback: EditableSection }) {
  const cfg = getSection(section, fallback);
  const items = cfg.items?.length ? cfg.items : fallback.items;
  const media = getMedia("faq", cfg)[0];

  return (
    <SectionShell id="faq" className="bg-[#0B0800]">
      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <Header section={cfg} fallback={fallback} align="left" />
          <MediaFrame media={media} variant="compact" />
        </div>
        <div className="grid gap-3">
          {items.slice(0, 6).map((item, index) => (
            <ScrollReveal key={`${item.title}-${index}`} variant="fadeUp" delay={100 + index * 60}>
              <details className="group rounded-[1.25rem] border border-[#C9A84C]/14 bg-[#120E00] transition-colors open:border-[#C9A84C]/42 open:bg-[#171100]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[#F5EDD6]">
                  <span className="text-base font-semibold">{item.title}</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C9A84C]/22 text-[#C9A84C] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-[#F5EDD6]/60">{item.desc}</p>
              </details>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function SectionShell({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative overflow-hidden px-4 py-14 sm:px-6 sm:py-18 lg:py-24 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/18 to-transparent" />
      <div className="mx-auto max-w-7xl">
        {children}
      </div>
    </section>
  );
}

const FALLBACKS: Record<string, EditableSection> = {
  problems: {
    badge: { text: "NHU CẦU THỰC TẾ", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Vấn đề quen thuộc", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "giải bằng một chạm", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Ít lời hơn, trực quan hơn: khách nhìn thấy ngay tình huống sử dụng và lợi ích chính.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Mỏi cổ khi đọc sách", desc: "Nâng đầu nhẹ, không cần kê nhiều gối." },
      { icon: "", title: "Khó ngồi dậy", desc: "Hỗ trợ chuyển tư thế thuận tiện hơn." },
      { icon: "", title: "Nằm phẳng không thoải mái", desc: "Preset nghỉ ngơi theo nhu cầu." },
      { icon: "", title: "Căn hộ cần đa năng", desc: "Một sản phẩm, nhiều tình huống sử dụng." },
    ],
    media: DEFAULT_MEDIA.problems,
  },
  solutions: {
    badge: { text: "CHỌN THEO NHU CẦU", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Chọn nhanh", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "đúng mục đích", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Mỗi nhóm khách có một lối đi rõ ràng trước khi xem chi tiết từng mẫu.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Cho bố mẹ", desc: "Remote dễ dùng, nâng hạ êm." },
      { icon: "", title: "Cho thư giãn", desc: "Zero Gravity, đọc sách, xem TV." },
      { icon: "", title: "Cho căn hộ", desc: "Gọn, đẹp, đa năng." },
      { icon: "", title: "Cho người mê công nghệ", desc: "App, preset, tiện ích thông minh." },
      { icon: "", title: "Cho đại lý", desc: "Catalogue, demo, training." },
    ],
    media: DEFAULT_MEDIA.solutions,
  },
  technology: {
    badge: { text: "CÔNG NGHỆ BÊN TRONG", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Nhìn rõ", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "giá trị bên trong", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Dùng ảnh cận cảnh, ảnh bóc tách và video vận hành để khách tin nhanh hơn.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Motor êm", desc: "Nâng hạ mượt, ổn định." },
      { icon: "", title: "Khung chắc", desc: "Kết cấu chịu lực rõ ràng." },
      { icon: "", title: "Preset nhanh", desc: "Một chạm cho tư thế yêu thích." },
      { icon: "", title: "Remote/App", desc: "Dễ dùng cho cả gia đình." },
    ],
    media: DEFAULT_MEDIA.technology,
  },
  postures: {
    badge: { text: "TƯ THẾ & THƯ GIÃN", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Mỗi tư thế", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "một trải nghiệm", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Ưu tiên hình ảnh/video mô phỏng thay vì mô tả dài về công dụng.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Zero Gravity", desc: "Thư giãn toàn thân." },
      { icon: "", title: "Đọc sách/xem TV", desc: "Cổ và lưng dễ chịu hơn." },
      { icon: "", title: "Nâng đầu nhẹ", desc: "Nghỉ ngơi thoáng hơn." },
      { icon: "", title: "Nâng chân", desc: "Thư giãn sau ngày dài." },
      { icon: "", title: "Hỗ trợ ngồi dậy", desc: "Thuận tiện cho người lớn tuổi." },
    ],
    media: DEFAULT_MEDIA.postures,
  },
  comparison: {
    badge: { text: "SO SÁNH LỰA CHỌN", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Khác biệt", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "trong 30 giây", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Bảng ngắn, ít chữ để khách nắm ngay lý do nên chọn giường thông minh.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "Phổ thông", title: "Thẩm mỹ", desc: "SmartFurni: cao cấp" },
      { icon: "Hạn chế", title: "Điều chỉnh", desc: "SmartFurni: nhiều tư thế" },
      { icon: "Cần kê gối", title: "Đọc sách/xem TV", desc: "SmartFurni: preset sẵn" },
      { icon: "Ít tiện ích", title: "Công nghệ", desc: "SmartFurni: remote/app" },
    ],
    media: DEFAULT_MEDIA.comparison,
  },
  trust: {
    badge: { text: "BẰNG CHỨNG TIN CẬY", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Tin nhanh hơn", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "khi được nhìn thấy", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Thay mô tả dài bằng ảnh showroom, video giao lắp và thông số nổi bật.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Thông số rõ", desc: "Tải trọng, góc nâng, bảo hành." },
      { icon: "", title: "Showroom thật", desc: "Đặt lịch trải nghiệm trực tiếp." },
      { icon: "", title: "Video tại nhà", desc: "Giao lắp và hướng dẫn thực tế." },
    ],
    media: DEFAULT_MEDIA.trust,
  },
  process: {
    badge: { text: "MUA HÀNG AN TÂM", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "5 bước", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "rõ ràng", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Từ tư vấn đến bảo hành: ngắn gọn, dễ hiểu, giảm băn khoăn khi mua sản phẩm giá trị cao.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "1", title: "Tư vấn", desc: "Hiểu nhu cầu." },
      { icon: "2", title: "Demo", desc: "Xem mẫu thực tế." },
      { icon: "3", title: "Chọn mẫu", desc: "Kích thước, chất liệu." },
      { icon: "4", title: "Giao lắp", desc: "Kiểm tra tại nhà." },
      { icon: "5", title: "Bảo hành", desc: "Hỗ trợ sau mua." },
    ],
    media: DEFAULT_MEDIA.process,
  },
  b2b: {
    badge: { text: "B2B & ĐẠI LÝ", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Gói hợp tác", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "dễ triển khai", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Showroom, đại lý và đơn vị thiết kế có đủ tư liệu để bán hàng nhanh hơn.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Catalogue", desc: "Ảnh, video, thông số." },
      { icon: "", title: "Chính sách", desc: "Chiết khấu và trưng bày." },
      { icon: "", title: "Kỹ thuật", desc: "Training lắp đặt." },
      { icon: "", title: "Marketing", desc: "Landing page và lead." },
    ],
    media: DEFAULT_MEDIA.b2b,
  },
  faq: {
    badge: { text: "FAQ NỔI BẬT", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Hỏi nhanh", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "trước khi đặt lịch", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Chỉ giữ các câu hỏi quan trọng nhất, trả lời ngắn và dẫn khách đến tư vấn.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "?", title: "Giường điện có bền không?", desc: "Có thông số motor, khung, tải trọng và bảo hành rõ ràng." },
      { icon: "?", title: "Mất điện có sao không?", desc: "Được tư vấn theo cơ chế an toàn của từng mẫu." },
      { icon: "?", title: "Dùng với nệm hiện tại được không?", desc: "Cần kiểm tra loại nệm, độ dày và kích thước." },
      { icon: "?", title: "Có giao lắp toàn quốc không?", desc: "Tư vấn thời gian, phí và quy trình theo khu vực." },
    ],
    media: DEFAULT_MEDIA.faq,
  },
};

export default function HomepageConversionSections({ theme }: Props) {
  const sections = theme.homepageSections as Record<SectionKey, EditableSection> | undefined;

  return (
    <>
      <ProblemsSection section={sections?.problems} fallback={FALLBACKS.problems} />
      <SolutionsSection section={sections?.solutions} fallback={FALLBACKS.solutions} />
      <TechnologySection section={sections?.technology} fallback={FALLBACKS.technology} />
      <PosturesSection section={sections?.postures} fallback={FALLBACKS.postures} />
      <ComparisonSection section={sections?.comparison} fallback={FALLBACKS.comparison} />
      <TrustSection section={sections?.trust} fallback={FALLBACKS.trust} />
      <ProcessSection section={sections?.process} fallback={FALLBACKS.process} />
      <B2BSection section={sections?.b2b} fallback={FALLBACKS.b2b} />
      <FAQSection section={sections?.faq} fallback={FALLBACKS.faq} />
    </>
  );
}
