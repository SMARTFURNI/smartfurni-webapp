import { getZaloFollowLeadOptions, getZaloFollowQualifiers } from "@/lib/zalo-follow-lead";

export interface ZaloFollowTrustStat {
  value: string;
  label: string;
}

export interface ZaloFollowReasonCard {
  title: string;
  description: string;
}

export interface ZaloFollowTestimonial {
  name: string;
  location: string;
  quote: string;
}

export interface ZaloFollowLeadChoice {
  id: string;
  label: string;
  description: string;
  badge: string;
  price: string;
  image: string;
}

export interface ZaloFollowLandingConfig {
  authorityLabel: string;
  trustStats: ZaloFollowTrustStat[];
  reasonTitle: string;
  reasonCards: ZaloFollowReasonCard[];
  testimonialTitle: string;
  testimonials: ZaloFollowTestimonial[];
  finalCtaTitle: string;
  finalCtaDescription: string;
  finalCtaLabel: string;
  popupTitle: string;
  popupDescription: string;
  leadOptions: ZaloFollowLeadChoice[];
  qualifierLabel: string;
  qualifierValues: string[];
}

function text(value: unknown, max: number): string {
  return String(value || "").trim().slice(0, max);
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === "object").map(item => item as Record<string, unknown>)
    : [];
}

export function defaultZaloFollowLandingConfig(productKey: string, benefits: string[] = []): ZaloFollowLandingConfig {
  const qualifiers = getZaloFollowQualifiers(productKey);
  const leadOptions = getZaloFollowLeadOptions(productKey).map(option => ({
    ...option,
    badge: "",
    price: "",
    image: "",
  }));
  const reasonFallbacks = [
    { title: benefits[0] || "Tư vấn đúng nhu cầu", description: "Chọn sản phẩm theo diện tích, công năng và ngân sách thực tế." },
    { title: benefits[1] || "Báo giá rõ ràng", description: "Nhận thông tin mẫu, kích thước và phương án phù hợp trước khi quyết định." },
    { title: benefits[2] || "Hình ảnh sản phẩm thực tế", description: "Xem gallery và trao đổi trực tiếp với đội ngũ SmartFurni qua Zalo." },
    { title: "Chăm sóc thuận tiện", description: "Lưu hội thoại trên Zalo để được hỗ trợ khi cần, không phải điền lại thông tin." },
  ];
  return {
    authorityLabel: "Tư vấn chính hãng",
    trustStats: [
      { value: "Chính hãng", label: "Zalo OA" },
      { value: "Theo nhu cầu", label: "Báo giá" },
      { value: "Miễn phí", label: "Tư vấn" },
      { value: "Trực tiếp", label: "SmartFurni" },
    ],
    reasonTitle: "Vì sao nên chọn SmartFurni?",
    reasonCards: reasonFallbacks,
    testimonialTitle: "Khách hàng nói gì?",
    testimonials: [],
    finalCtaTitle: "Để lại thông tin để nhận tư vấn phù hợp",
    finalCtaDescription: "SmartFurni sẽ liên hệ, gửi mẫu và báo giá theo nhu cầu của Anh/Chị.",
    finalCtaLabel: "Nhận báo giá ngay",
    popupTitle: "Nhận tư vấn và báo giá nhanh",
    popupDescription: "Chọn nhu cầu trong 30 giây. SmartFurni sẽ gửi mẫu, kích thước và báo giá phù hợp với Anh/Chị.",
    leadOptions,
    qualifierLabel: qualifiers.label,
    qualifierValues: qualifiers.values,
  };
}

export function normalizeZaloFollowLandingConfig(
  value: unknown,
  productKey: string,
  benefits: string[] = [],
): ZaloFollowLandingConfig {
  const defaults = defaultZaloFollowLandingConfig(productKey, benefits);
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};

  const trustStats = rows(input.trustStats).slice(0, 4).map(row => ({
    value: text(row.value, 40),
    label: text(row.label, 60),
  })).filter(row => row.value || row.label);
  const reasonCards = rows(input.reasonCards).slice(0, 6).map(row => ({
    title: text(row.title, 100),
    description: text(row.description, 260),
  })).filter(row => row.title || row.description);
  const testimonials = rows(input.testimonials).slice(0, 6).map(row => ({
    name: text(row.name, 80),
    location: text(row.location, 80),
    quote: text(row.quote, 420),
  })).filter(row => row.quote);
  const leadOptions = rows(input.leadOptions).slice(0, 6).map((row, index) => ({
    id: text(row.id, 80) || `lua-chon-${index + 1}`,
    label: text(row.label, 100),
    description: text(row.description, 220),
    badge: text(row.badge, 50),
    price: text(row.price, 80),
    image: text(row.image, 1000),
  })).filter(row => row.label);
  const qualifierValues = Array.isArray(input.qualifierValues)
    ? input.qualifierValues.map(item => text(item, 60)).filter(Boolean).slice(0, 12)
    : [];

  return {
    authorityLabel: text(input.authorityLabel, 80) || defaults.authorityLabel,
    trustStats: trustStats.length ? trustStats : defaults.trustStats,
    reasonTitle: text(input.reasonTitle, 140) || defaults.reasonTitle,
    reasonCards: reasonCards.length ? reasonCards : defaults.reasonCards,
    testimonialTitle: text(input.testimonialTitle, 140) || defaults.testimonialTitle,
    testimonials,
    finalCtaTitle: text(input.finalCtaTitle, 180) || defaults.finalCtaTitle,
    finalCtaDescription: text(input.finalCtaDescription, 360) || defaults.finalCtaDescription,
    finalCtaLabel: text(input.finalCtaLabel, 80) || defaults.finalCtaLabel,
    popupTitle: text(input.popupTitle, 160) || defaults.popupTitle,
    popupDescription: text(input.popupDescription, 360) || defaults.popupDescription,
    leadOptions: leadOptions.length ? leadOptions : defaults.leadOptions,
    qualifierLabel: text(input.qualifierLabel, 120) || defaults.qualifierLabel,
    qualifierValues: qualifierValues.length ? qualifierValues : defaults.qualifierValues,
  };
}
