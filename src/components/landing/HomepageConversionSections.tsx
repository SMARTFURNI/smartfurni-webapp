"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ScrollReveal } from "./ScrollReveal";
import type { SiteTheme, HomepageGenericSection, HomepageContentCard } from "@/lib/theme-store";

interface Props { theme: SiteTheme; }

type SectionKey = keyof typeof FALLBACKS;

const FW_MAP: Record<string, string> = {
  light: "300", normal: "400", medium: "500", semibold: "600", bold: "700",
};

const MEDIA: Record<string, { label: string; title: string; desc: string; type: "image" | "video"; image: string; href?: string }[]> = {
  problems: [
    { label: "Tình huống", title: "Đọc sách, xem TV không cần kê gối", desc: "Minh họa tư thế nâng đầu nhẹ trên giường thông minh.", type: "image", image: "/uploads/products/smartfurni-bed-main.webp", href: "/products" },
    { label: "Video demo", title: "Một chạm đổi tư thế", desc: "Ô video ngắn để đặt clip nâng đầu, nâng chân, Zero Gravity.", type: "video", image: "/gsf150-standalone.jpg", href: "#demo" },
  ],
  solutions: [
    { label: "Gợi ý", title: "Chọn nhanh theo nhu cầu", desc: "Gia đình, căn hộ, công nghệ hoặc đại lý đều có lối đi riêng.", type: "image", image: "/gsf150-wood-frame.jpg", href: "/products" },
    { label: "Tư vấn", title: "Đặt lịch trải nghiệm", desc: "Dẫn khách đến showroom hoặc nhận video tư vấn mẫu phù hợp.", type: "video", image: "/uploads/products/smartfurni-bed-main.webp", href: "/contact" },
  ],
  technology: [
    { label: "Bóc tách", title: "Motor, khung, cơ cấu nâng", desc: "Khu vực phù hợp để thay bằng ảnh cắt lớp hoặc hotspot kỹ thuật.", type: "image", image: "/gsf150-exploded.jpg", href: "/products/gsf150" },
    { label: "Demo", title: "Vận hành êm và chính xác", desc: "Ô video cho clip close-up remote, motor và preset một chạm.", type: "video", image: "/gsf150-standalone.jpg", href: "#demo" },
  ],
  postures: [
    { label: "Tư thế", title: "Zero Gravity / đọc sách / nâng chân", desc: "Một khu vực hình ảnh lớn giúp khách hình dung lợi ích nhanh hơn.", type: "image", image: "/uploads/products/smartfurni-bed-main.webp", href: "/products" },
    { label: "Video", title: "Chuyển động thực tế", desc: "Gắn clip ngắn 15–30s mô tả các tư thế nổi bật.", type: "video", image: "/gsf150-standalone.jpg", href: "#demo" },
  ],
  trust: [
    { label: "Showroom", title: "Trải nghiệm trực tiếp", desc: "Ảnh/video giao lắp, khách hàng thật hoặc không gian showroom.", type: "image", image: "/gsf150-standalone.jpg", href: "/contact" },
    { label: "Review", title: "Video khách hàng tại nhà", desc: "Tăng niềm tin bằng clip bàn giao và hướng dẫn sử dụng thực tế.", type: "video", image: "/uploads/products/smartfurni-bed-main.webp", href: "#demo" },
  ],
  process: [
    { label: "Quy trình", title: "Tư vấn → giao lắp → bảo hành", desc: "Một hình timeline hoặc clip lắp đặt giúp giảm lo ngại trước khi mua.", type: "image", image: "/gsf150-wood-frame.jpg", href: "/contact" },
    { label: "Hướng dẫn", title: "Bàn giao và sử dụng remote", desc: "Ô video cho clip kỹ thuật viên hướng dẫn sau lắp đặt.", type: "video", image: "/gsf150-standalone.jpg", href: "#demo" },
  ],
  b2b: [
    { label: "Đối tác", title: "Gói trưng bày showroom", desc: "Hình ảnh catalogue, POSM và bộ demo cho đại lý.", type: "image", image: "/gsf150-exploded.jpg", href: "/lp/doi-tac-showroom-nem" },
    { label: "Training", title: "Video đào tạo bán hàng", desc: "Ô video cho nội dung hướng dẫn tư vấn và lắp đặt.", type: "video", image: "/uploads/products/smartfurni-bed-main.webp", href: "/lp/doi-tac-showroom-nem#dang-ky" },
  ],
  faq: [
    { label: "Hỏi nhanh", title: "Giải đáp trước khi đặt lịch", desc: "FAQ ngắn giúp khách tự tin hơn trước khi liên hệ.", type: "image", image: "/smartfurni-logo-transparent.png", href: "/contact#faq" },
  ],
};

function Header({ section, fallback }: { section?: HomepageGenericSection; fallback: HomepageGenericSection }) {
  const cfg = section ?? fallback;
  const badge = cfg.badge;
  const title = cfg.title;
  const titleAccent = cfg.titleAccent;
  const subtitle = cfg.subtitle;

  return (
    <ScrollReveal variant="fadeUp" delay={0}>
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5 mb-4 shadow-[0_0_30px_rgba(201,168,76,0.08)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C9A84C]" />
          <span style={{ fontSize: `${badge.fontSize}px`, color: badge.color, fontWeight: FW_MAP[badge.fontWeight] }} className="tracking-[0.22em] uppercase">
            {badge.text}
          </span>
        </div>
        <h2 className="mb-3 leading-tight">
          <span style={{ fontSize: `clamp(25px, 3vw, ${title.fontSize}px)`, color: title.color, fontWeight: FW_MAP[title.fontWeight], display: "block" }}>
            {title.text}
          </span>
          <span style={{ fontSize: `clamp(25px, 3vw, ${titleAccent.fontSize}px)`, color: titleAccent.color, fontWeight: FW_MAP[titleAccent.fontWeight], display: "block" }}>
            {titleAccent.text}
          </span>
        </h2>
        <p style={{ fontSize: `${subtitle.fontSize}px`, color: subtitle.color, fontWeight: FW_MAP[subtitle.fontWeight], opacity: 0.6 }} className="max-w-2xl mx-auto leading-relaxed">
          {subtitle.text}
        </p>
      </div>
    </ScrollReveal>
  );
}

function IconMark({ value, index }: { value?: string; index: number }) {
  const isNumber = value && /^[0-9?]+$/.test(value);
  if (isNumber) {
    return <span className="text-sm font-semibold text-[#EAD27A]">{value}</span>;
  }

  const paths = [
    "M12 3.5 20.5 8.5v7L12 20.5 3.5 15.5v-7L12 3.5Z M12 8v9",
    "M4 15c3-6 7-9 16-9-1 8-4 13-13 14l-3-5Z M8 16c2-2 5-4 9-6",
    "M5 18h14 M7 18V9l5-4 5 4v9 M10 18v-5h4v5",
    "M6 7h12v10H6z M9 10h6 M9 14h3 M18 9l2-2 M6 9 4-4",
    "M12 4a8 8 0 1 0 8 8 M12 4v8l5 3",
  ];

  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
      <path d={paths[index % paths.length]} stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardsGrid({ items, columns = "lg:grid-cols-4", compact = false }: { items: HomepageContentCard[]; columns?: string; compact?: boolean }) {
  return (
    <div className={`grid sm:grid-cols-2 ${columns} gap-4`}>
      {items.map((item, i) => (
        <ScrollReveal key={`${item.title}-${i}`} variant="fadeUp" delay={80 + i * 55}>
          <div className="group h-full p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#191300] to-[#0C0900] border border-[#2E2800] hover:border-[#C9A84C]/50 transition-all duration-300 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <div className="mb-4 flex items-center justify-center w-11 h-11 rounded-2xl bg-[#C9A84C]/8 border border-[#C9A84C]/25 text-[#C9A84C] group-hover:bg-[#C9A84C]/14 group-hover:scale-105 transition-all">
              <IconMark value={item.icon} index={i} />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-[#F5EDD6] mb-1.5 group-hover:text-[#E2C97E] transition-colors">{item.title}</h3>
            {!compact && <p className="text-xs sm:text-sm text-[#F5EDD6]/52 leading-relaxed line-clamp-2">{item.desc}</p>}
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

function MediaShowcase({ sectionKey, reverse = false }: { sectionKey: string; reverse?: boolean }) {
  const media = MEDIA[sectionKey] ?? MEDIA.problems;
  return (
    <div className={`grid lg:grid-cols-[1.05fr_0.95fr] gap-4 lg:gap-6 items-stretch ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <ScrollReveal variant={reverse ? "fadeRight" : "fadeLeft"} delay={80}>
        <a href={media[0].href ?? "#"} className="group block h-full rounded-[1.75rem] overflow-hidden border border-[#C9A84C]/20 bg-[#120E00] shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
          <div className="relative aspect-[16/10] min-h-[260px] overflow-hidden">
            <img src={media[0].image} alt={media[0].title} className="h-full w-full object-cover opacity-80 group-hover:scale-[1.03] transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute left-5 right-5 bottom-5">
              <span className="inline-flex mb-3 px-3 py-1 rounded-full bg-[#C9A84C]/90 text-black text-[11px] font-semibold tracking-[0.16em] uppercase">{media[0].label}</span>
              <h3 className="text-xl sm:text-2xl text-[#F5EDD6] font-semibold mb-1.5">{media[0].title}</h3>
              <p className="text-sm text-[#F5EDD6]/70 max-w-xl leading-relaxed">{media[0].desc}</p>
            </div>
          </div>
        </a>
      </ScrollReveal>

      <div className="grid gap-4">
        {media.slice(1).map((item, i) => (
          <ScrollReveal key={item.title} variant="fadeUp" delay={140 + i * 80}>
            <a href={item.href ?? "#"} className="group relative block rounded-[1.5rem] overflow-hidden border border-[#2E2800] bg-[#1A1600] hover:border-[#C9A84C]/45 transition-colors">
              <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] min-h-[150px]">
                <div className="relative overflow-hidden">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-700" />
                  {item.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C9A84C] text-black shadow-[0_0_40px_rgba(201,168,76,0.45)]">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-5 flex flex-col justify-center">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#C9A84C] mb-2">{item.label}</span>
                  <h4 className="text-[#F5EDD6] font-semibold mb-1.5">{item.title}</h4>
                  <p className="text-xs sm:text-sm text-[#F5EDD6]/55 leading-relaxed line-clamp-2">{item.desc}</p>
                </div>
              </div>
            </a>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}

function SectionShell({ id, section, fallback, children, className = "" }: { id: string; section?: HomepageGenericSection; fallback: HomepageGenericSection; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`py-12 sm:py-16 lg:py-20 px-4 sm:px-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <Header section={section} fallback={fallback} />
        {children}
      </div>
    </section>
  );
}

const FALLBACKS: Record<string, HomepageGenericSection> = {
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
  },
};

export default function HomepageConversionSections({ theme }: Props) {
  const sections = theme.homepageSections;
  const getItems = (key: SectionKey) => sections?.[key]?.items?.length ? sections[key].items : FALLBACKS[key].items;

  return (
    <>
      <SectionShell id="problems" section={sections?.problems} fallback={FALLBACKS.problems}>
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-start">
          <CardsGrid items={getItems("problems")} columns="lg:grid-cols-2" />
          <MediaShowcase sectionKey="problems" />
        </div>
      </SectionShell>

      <SectionShell id="solutions" section={sections?.solutions} fallback={FALLBACKS.solutions} className="bg-[#0B0800]">
        <div className="space-y-6">
          <MediaShowcase sectionKey="solutions" reverse />
          <CardsGrid items={getItems("solutions")} columns="lg:grid-cols-5" compact />
        </div>
      </SectionShell>

      <SectionShell id="technology" section={sections?.technology} fallback={FALLBACKS.technology}>
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 lg:gap-8 items-start">
          <MediaShowcase sectionKey="technology" />
          <CardsGrid items={getItems("technology")} columns="lg:grid-cols-2" />
        </div>
      </SectionShell>

      <SectionShell id="postures" section={sections?.postures} fallback={FALLBACKS.postures} className="bg-[#0B0800]">
        <div className="space-y-6">
          <MediaShowcase sectionKey="postures" />
          <CardsGrid items={getItems("postures")} columns="lg:grid-cols-5" compact />
        </div>
      </SectionShell>

      <SectionShell id="comparison" section={sections?.comparison} fallback={FALLBACKS.comparison}>
        <ScrollReveal variant="fadeUp" delay={120}>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getItems("comparison").map((row, index) => (
              <div key={row.title} className="rounded-2xl border border-[#2E2800] bg-[#1A1600] p-5 hover:border-[#C9A84C]/45 transition-colors">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C]"><IconMark index={index} /></div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#C9A84C] mb-2">{row.title}</p>
                <p className="text-sm text-[#F5EDD6]/48 line-through mb-1">{row.icon}</p>
                <p className="text-base font-semibold text-[#F5EDD6]">{row.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </SectionShell>

      <SectionShell id="trust" section={sections?.trust} fallback={FALLBACKS.trust}>
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 items-start">
          <CardsGrid items={getItems("trust")} columns="lg:grid-cols-1" />
          <MediaShowcase sectionKey="trust" reverse />
        </div>
      </SectionShell>

      <SectionShell id="process" section={sections?.process} fallback={FALLBACKS.process} className="bg-[#0B0800]">
        <div className="space-y-6">
          <CardsGrid items={getItems("process")} columns="lg:grid-cols-5" compact />
          <MediaShowcase sectionKey="process" />
        </div>
      </SectionShell>

      <SectionShell id="b2b" section={sections?.b2b} fallback={FALLBACKS.b2b}>
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-start">
          <div>
            <CardsGrid items={getItems("b2b")} columns="lg:grid-cols-2" />
            <ScrollReveal variant="fadeUp" delay={360}>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/lp/doi-tac-showroom-nem#dang-ky" className="px-6 py-3 rounded-full bg-[#C9A84C] text-black text-sm font-semibold text-center hover:bg-[#E2C97E] transition-colors">Đăng ký đối tác B2B</Link>
                <Link href="/catalogue" className="px-6 py-3 rounded-full border border-[#C9A84C]/35 text-[#C9A84C] text-sm font-semibold text-center hover:bg-[#C9A84C]/10 transition-colors">Xem catalogue</Link>
              </div>
            </ScrollReveal>
          </div>
          <MediaShowcase sectionKey="b2b" />
        </div>
      </SectionShell>

      <SectionShell id="faq" section={sections?.faq} fallback={FALLBACKS.faq} className="bg-[#0B0800]">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-6 lg:gap-8 items-start">
          <MediaShowcase sectionKey="faq" />
          <div className="grid gap-4">
            {getItems("faq").map((item, i) => (
              <ScrollReveal key={`${item.title}-${i}`} variant="fadeUp" delay={100 + i * 60}>
                <details className="group rounded-2xl bg-[#1A1600] border border-[#2E2800] open:border-[#C9A84C]/45 transition-colors">
                  <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-4 text-[#F5EDD6] font-semibold">
                    <span>{item.title}</span><span className="text-[#C9A84C] group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-[#F5EDD6]/58 leading-relaxed">{item.desc}</p>
                </details>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </SectionShell>
    </>
  );
}
