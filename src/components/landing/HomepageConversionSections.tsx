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
    { label: "Tình huống", title: "Đọc sách, xem TV thoải mái hơn", desc: "Nâng phần đầu giường đúng góc, hạn chế kê nhiều gối và giữ phòng ngủ gọn gàng.", type: "image", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/products" },
    { label: "Video demo", title: "Thấy rõ chuyển động trước khi mua", desc: "Xem cách giường nâng đầu, nâng chân và trở về tư thế nằm chỉ bằng một thao tác.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  solutions: [
    { label: "Gợi ý chọn", title: "Bắt đầu từ nhu cầu của gia đình", desc: "Chọn theo người dùng, không gian và cách sử dụng để tìm mẫu phù hợp nhanh hơn.", type: "image", imageUrl: "/gsf150-wood-frame.jpg", linkUrl: "/products" },
    { label: "Tư vấn", title: "Cần mẫu nào, hỏi ngay mẫu đó", desc: "Đặt lịch trải nghiệm hoặc nhận tư vấn theo kích thước phòng, loại nệm và ngân sách.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/contact", videoUrl: "#demo" },
  ],
  technology: [
    { label: "Bên trong", title: "Motor, khung và cơ cấu nâng", desc: "Các chi tiết quan trọng được trình bày rõ để khách hiểu vì sao sản phẩm vận hành ổn định.", type: "image", imageUrl: "/gsf150-exploded.jpg", linkUrl: "/products/gsf150" },
    { label: "Demo", title: "Vận hành êm trong từng chuyển động", desc: "Video cận cảnh remote, motor và các tư thế cài sẵn giúp khách yên tâm hơn.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  postures: [
    { label: "Tư thế", title: "Từ nằm nghỉ đến ngồi thư giãn", desc: "Một khung hình trực quan giúp khách hiểu ngay giường thay đổi tư thế như thế nào.", type: "image", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/products" },
    { label: "Video", title: "Chuyển tư thế thực tế", desc: "Clip ngắn mô tả các tư thế thường dùng: đọc sách, xem TV, nâng chân và nghỉ ngơi.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  comparison: [
    { label: "So sánh", title: "Giường thường hay giường thông minh?", desc: "Bảng đối chiếu ngắn giúp khách thấy khác biệt trong thẩm mỹ, tư thế và tiện ích hằng ngày.", type: "image", imageUrl: "/gsf150-standalone.jpg", linkUrl: "/products" },
  ],
  trust: [
    { label: "Showroom", title: "Trải nghiệm sản phẩm thật", desc: "Khách có thể xem mẫu, thử tư thế và trao đổi trực tiếp trước khi quyết định.", type: "image", imageUrl: "/gsf150-standalone.jpg", linkUrl: "/contact" },
    { label: "Thực tế", title: "Video bàn giao tại nhà", desc: "Quy trình giao lắp, hướng dẫn sử dụng và kiểm tra vận hành được thể hiện rõ ràng.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  process: [
    { label: "Quy trình", title: "Từ tư vấn đến bảo hành", desc: "Mỗi bước mua hàng được trình bày rõ để khách biết cần chuẩn bị gì và nhận được gì.", type: "image", imageUrl: "/gsf150-wood-frame.jpg", linkUrl: "/contact" },
    { label: "Bàn giao", title: "Hướng dẫn sử dụng sau lắp đặt", desc: "Kỹ thuật viên kiểm tra giường, hướng dẫn remote và các lưu ý sử dụng tại nhà.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
  ],
  b2b: [
    { label: "Đối tác", title: "Bộ trưng bày cho showroom", desc: "Đại lý có catalogue, hình ảnh, video và nội dung tư vấn để bắt đầu bán hàng nhanh.", type: "image", imageUrl: "/gsf150-exploded.jpg", linkUrl: "/lp/doi-tac-showroom-nem" },
    { label: "Đào tạo", title: "Training sản phẩm và lắp đặt", desc: "Tài liệu bán hàng, hướng dẫn tư vấn và quy trình kỹ thuật được chuẩn hóa cho đội ngũ.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/lp/doi-tac-showroom-nem#dang-ky", videoUrl: "#demo" },
  ],
  faq: [
    { label: "Hỏi nhanh", title: "Giải đáp trước khi đặt lịch", desc: "Các câu hỏi quan trọng được gom lại để khách tự tin hơn trước khi liên hệ tư vấn.", type: "image", imageUrl: "/smartfurni-logo-transparent.png", linkUrl: "/contact#faq" },
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
              <div className="hidden grid-cols-[0.9fr_1fr_1fr] gap-3 px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C]/80 md:grid">
                <span>Tiêu chí</span>
                <span>Giường thường</span>
                <span>SmartFurni</span>
              </div>
              {items.slice(0, 4).map((row, index) => (
                <div key={`${row.title}-${index}`} className="grid gap-3 rounded-[1.25rem] border border-white/10 bg-black/32 p-4 backdrop-blur-md md:grid-cols-[0.9fr_1fr_1fr] md:items-center">
                  <div className="flex items-center gap-3">
                    <PremiumIcon value={row.icon} index={index} small />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">{row.title}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#F5EDD6]/48">{row.icon}</p>
                  <p className="text-base font-semibold leading-relaxed text-[#F5EDD6]">{row.desc}</p>
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
    badge: { text: "KHI NÀO CẦN GIƯỜNG THÔNG MINH", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Bắt đầu từ", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "nhu cầu mỗi ngày", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Thay vì nói nhiều về công nghệ, phần này giúp khách nhận ra ngay những tình huống quen thuộc mà giường điều chỉnh điện có thể giải quyết.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Đọc sách, xem TV trên giường", desc: "Nâng phần đầu vừa đủ để lưng và cổ dễ chịu hơn, không phải kê nhiều gối." },
      { icon: "", title: "Muốn ngồi dậy nhẹ nhàng", desc: "Hỗ trợ chuyển từ nằm sang ngồi thuận tiện hơn, đặc biệt với người lớn tuổi." },
      { icon: "", title: "Cần thư giãn sau ngày dài", desc: "Nâng chân hoặc chọn tư thế nghỉ giúp cơ thể thả lỏng nhanh hơn." },
      { icon: "", title: "Phòng ngủ cần gọn và đa năng", desc: "Một chiếc giường có thể phục vụ nghỉ ngơi, đọc sách, xem phim và chăm sóc sức khỏe." },
    ],
    media: DEFAULT_MEDIA.problems,
  },
  solutions: {
    badge: { text: "CHỌN THEO NHU CẦU", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Bạn thuộc", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "nhóm nào?", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Mỗi nhóm khách có một lý do mua khác nhau. Chọn đúng nhu cầu trước sẽ giúp xem sản phẩm nhanh hơn và tránh bị rối bởi quá nhiều thông số.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Cho bố mẹ", desc: "Ưu tiên remote dễ dùng, chuyển tư thế êm và hỗ trợ ngồi dậy." },
      { icon: "", title: "Cho thư giãn cá nhân", desc: "Phù hợp người thích đọc sách, xem TV, nghỉ ngơi và dùng preset một chạm." },
      { icon: "", title: "Cho căn hộ hiện đại", desc: "Thiết kế gọn, sang và dùng được cho nhiều hoạt động trong cùng một không gian." },
      { icon: "", title: "Cho người thích công nghệ", desc: "Quan tâm remote, app, chế độ nhớ tư thế và trải nghiệm điều khiển thông minh." },
      { icon: "", title: "Cho showroom/đại lý", desc: "Cần bộ demo, catalogue, chính sách trưng bày và tài liệu bán hàng rõ ràng." },
    ],
    media: DEFAULT_MEDIA.solutions,
  },
  technology: {
    badge: { text: "BÊN TRONG VẬN HÀNH THẾ NÀO", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Hiểu nhanh", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "phần kỹ thuật", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Phần công nghệ được viết lại theo cách dễ hiểu: khách chỉ cần biết bộ phận nào quan trọng, nó giúp gì và vì sao nên yên tâm khi sử dụng lâu dài.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Motor nâng hạ", desc: "Giúp giường chuyển tư thế mượt, ổn định và hạn chế tiếng ồn khi sử dụng." },
      { icon: "", title: "Khung chịu lực", desc: "Kết cấu chắc chắn giữ form giường ổn định trong quá trình nâng đầu hoặc nâng chân." },
      { icon: "", title: "Preset một chạm", desc: "Lưu tư thế thường dùng để quay lại nhanh khi đọc sách, xem TV hoặc nghỉ ngơi." },
      { icon: "", title: "Remote và ứng dụng", desc: "Điều khiển đơn giản cho cả gia đình, dễ hướng dẫn khi bàn giao tại nhà." },
    ],
    media: DEFAULT_MEDIA.technology,
  },
  postures: {
    badge: { text: "TƯ THẾ THƯỜNG DÙNG", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Một chiếc giường", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "nhiều cách nghỉ", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Khách không cần đọc mô tả dài. Mỗi card tương ứng một tình huống sử dụng thực tế, nhìn là hiểu giường giúp gì trong sinh hoạt hằng ngày.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Zero Gravity", desc: "Tư thế thư giãn giúp cơ thể được nâng đỡ đồng đều hơn." },
      { icon: "", title: "Đọc sách/xem TV", desc: "Nâng phần đầu để tầm nhìn thoải mái, hạn chế gập cổ." },
      { icon: "", title: "Nghỉ ngơi nhẹ", desc: "Chọn góc nâng vừa phải khi cần thư giãn nhưng chưa muốn ngủ." },
      { icon: "", title: "Nâng chân", desc: "Phù hợp lúc cần thả lỏng chân sau khi đứng hoặc di chuyển nhiều." },
      { icon: "", title: "Hỗ trợ ngồi dậy", desc: "Giúp việc ra khỏi giường chủ động và nhẹ nhàng hơn." },
    ],
    media: DEFAULT_MEDIA.postures,
  },
  comparison: {
    badge: { text: "SO SÁNH NHANH", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Giường thường", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "khác gì SmartFurni?", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Bảng so sánh được rút gọn để khách nắm khác biệt chính trong vài giây: tư thế, sự tiện lợi, thẩm mỹ và khả năng chăm sóc sau mua.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "Cố định, ít thay đổi", title: "Tư thế nằm", desc: "Điều chỉnh đầu/chân theo nhu cầu sử dụng." },
      { icon: "Phải kê gối thủ công", title: "Đọc sách/xem TV", desc: "Nâng phần đầu bằng remote hoặc preset một chạm." },
      { icon: "Ít tiện ích", title: "Trải nghiệm", desc: "Có remote/app, chế độ nhớ tư thế và video hướng dẫn." },
      { icon: "Khó hình dung trước", title: "Tư vấn & bàn giao", desc: "Có showroom, demo, quy trình giao lắp và bảo hành rõ ràng." },
    ],
    media: DEFAULT_MEDIA.comparison,
  },
  trust: {
    badge: { text: "VÌ SAO YÊN TÂM", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Không chỉ đẹp", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "mà còn rõ ràng", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Sau khi hiểu sản phẩm và quy trình, khách cần bằng chứng cụ thể: showroom thật, video bàn giao, thông số minh bạch và hỗ trợ sau mua.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Thông số minh bạch", desc: "Tư vấn rõ kích thước, tải trọng, góc nâng, cấu hình và chính sách bảo hành." },
      { icon: "", title: "Có nơi để trải nghiệm", desc: "Khách có thể đặt lịch xem mẫu, thử tư thế và hỏi kỹ trước khi chốt đơn." },
      { icon: "", title: "Bàn giao có hướng dẫn", desc: "Kỹ thuật viên kiểm tra vận hành và hướng dẫn sử dụng remote tại nhà." },
    ],
    media: DEFAULT_MEDIA.trust,
  },
  process: {
    badge: { text: "QUY TRÌNH MUA HÀNG", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Từ tư vấn", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "đến bảo hành", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Khách biết trước từng bước sẽ dễ ra quyết định hơn, đặc biệt với sản phẩm cần chọn kích thước, chất liệu, nệm và phương án giao lắp phù hợp.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "1", title: "Hiểu nhu cầu", desc: "Trao đổi người dùng chính, thói quen nằm, kích thước phòng và loại nệm hiện có." },
      { icon: "2", title: "Xem mẫu/demo", desc: "Trải nghiệm tại showroom hoặc xem video tư vấn theo mẫu phù hợp." },
      { icon: "3", title: "Chốt cấu hình", desc: "Chọn kích thước, chất liệu, tính năng và phương án giao lắp." },
      { icon: "4", title: "Giao lắp tại nhà", desc: "Kỹ thuật viên lắp đặt, kiểm tra vận hành và hướng dẫn sử dụng." },
      { icon: "5", title: "Hỗ trợ sau mua", desc: "Tiếp nhận bảo hành, bảo trì và các câu hỏi trong quá trình sử dụng." },
    ],
    media: DEFAULT_MEDIA.process,
  },
  b2b: {
    badge: { text: "DÀNH CHO ĐỐI TÁC", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Bán hàng dễ hơn", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "khi có đủ bộ công cụ", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Phần này tách riêng cho showroom, đại lý và đơn vị thiết kế nội thất: tập trung vào cách trưng bày, tư vấn, đào tạo và tạo lead bán hàng.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "", title: "Bộ trưng bày", desc: "Gợi ý mẫu demo, hình ảnh, video và catalogue để tư vấn tại showroom." },
      { icon: "", title: "Chính sách hợp tác", desc: "Trao đổi chiết khấu, khu vực bán hàng, POSM và điều kiện trưng bày." },
      { icon: "", title: "Đào tạo đội ngũ", desc: "Hướng dẫn tư vấn tính năng, cách demo sản phẩm và quy trình lắp đặt." },
      { icon: "", title: "Hỗ trợ marketing", desc: "Landing page, nội dung quảng cáo, tư liệu sản phẩm và luồng nhận lead." },
    ],
    media: DEFAULT_MEDIA.b2b,
  },
  faq: {
    badge: { text: "CÂU HỎI THƯỜNG GẶP", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
    title: { text: "Trước khi", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
    titleAccent: { text: "đặt lịch tư vấn", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
    subtitle: { text: "Các câu hỏi được viết lại ngắn, trực tiếp và theo đúng băn khoăn thường gặp trước khi khách để lại thông tin tư vấn.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
    items: [
      { icon: "?", title: "Giường điều chỉnh điện có bền không?", desc: "Độ bền phụ thuộc vào motor, khung, tải trọng sử dụng và chính sách bảo hành của từng mẫu. SmartFurni tư vấn rõ các thông số này trước khi khách chọn sản phẩm." },
      { icon: "?", title: "Mất điện thì giường có dùng được không?", desc: "Tùy cấu hình từng mẫu, đội ngũ tư vấn sẽ giải thích cơ chế an toàn và cách đưa giường về tư thế phù hợp khi cần." },
      { icon: "?", title: "Có dùng với nệm hiện tại được không?", desc: "Cần kiểm tra loại nệm, độ dày, độ đàn hồi và kích thước. Nếu nệm không phù hợp, SmartFurni sẽ gợi ý phương án thay thế." },
      { icon: "?", title: "Có giao lắp tại nhà không?", desc: "Có. Thời gian, chi phí và phạm vi giao lắp sẽ được tư vấn theo khu vực và cấu hình sản phẩm." },
      { icon: "?", title: "Sau khi mua cần hỗ trợ thì liên hệ ai?", desc: "Khách được hướng dẫn kênh liên hệ bảo hành, bảo trì và hỗ trợ sử dụng sau khi bàn giao." },
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
      <PosturesSection section={sections?.postures} fallback={FALLBACKS.postures} />
      <TechnologySection section={sections?.technology} fallback={FALLBACKS.technology} />
      <ComparisonSection section={sections?.comparison} fallback={FALLBACKS.comparison} />
      <ProcessSection section={sections?.process} fallback={FALLBACKS.process} />
      <TrustSection section={sections?.trust} fallback={FALLBACKS.trust} />
      <FAQSection section={sections?.faq} fallback={FALLBACKS.faq} />
      <B2BSection section={sections?.b2b} fallback={FALLBACKS.b2b} />
    </>
  );
}
