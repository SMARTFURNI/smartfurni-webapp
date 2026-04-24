// Theme Types — chỉ chứa TypeScript interfaces, không import fs/path
// Client components phải import type từ file này, KHÔNG từ theme-store.ts

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}
export interface ThemeTypography {
  fontFamily: string;
  headingFont: string;
  baseFontSize: number;
  headingScale: number;
  lineHeight: number;
  letterSpacing: string;
}
export interface ThemeLogo {
  url: string;
  width: number;
  altText: string;
  showText: boolean;
  textColor: string;
}
export interface ThemeBanner {
  enabled: boolean;
  text: string;
  bgColor: string;
  textColor: string;
  link: string;
  linkText: string;
  closeable: boolean;
}
export interface ThemeHero {
  title: string;
  subtitle: string;
  /** Cỡ chữ tiêu đề (px). Mặc định 60 */
  titleFontSize?: number;
  /** Màu dòng 1 tiêu đề */
  titleColor?: string;
  /** Màu dòng 2 tiêu đề (accent/vàng) */
  titleAccentColor?: string;
  ctaText: string;
  ctaLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
  bgGradientFrom: string;
  bgGradientTo: string;
  overlayOpacity: number;
}
export interface ThemeNavbar {
  bgColor: string;
  textColor: string;
  sticky: boolean;
  showShadow: boolean;
  height: number;
  borderBottom: boolean;
}
export interface FooterShowroom {
  icon: string;
  label: string;
  address: string;
}
export interface FooterContact {
  icon: string;
  label: string;
  value: string;
  href: string;
}
export interface FooterPolicyLink {
  label: string;
  href: string;
}
export interface ThemeFooter {
  bgColor: string;
  textColor: string;
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  showSocialLinks: boolean;
  socialLinks: {
    facebook: string;
    instagram: string;
    youtube: string;
    tiktok: string;
  };
  copyrightText: string;
  // Extended editable footer content
  aboutText: string;
  showrooms: FooterShowroom[];
  contacts: FooterContact[];
  policyLinks: FooterPolicyLink[];
  ctaText: string;
  ctaHref: string;
  ctaZaloText: string;
  ctaZaloHref: string;
}
export interface ThemeLayout {
  maxWidth: number;
  sectionSpacing: number;
  borderRadius: string;
  buttonStyle: string;
  cardShadow: string;
  animationsEnabled: boolean;
}
export interface ThemeSEO {
  siteTitle: string;
  titleSeparator: string;
  defaultDescription: string;
  ogImage: string;
  favicon: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
}
export interface PageProducts {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  filterLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
  compareLabel: string;
}
export interface PageAbout {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  missionTitle: string;
  missionText: string;
  visionTitle: string;
  visionText: string;
  stat1Number: string;
  stat1Label: string;
  stat2Number: string;
  stat2Label: string;
  stat3Number: string;
  stat3Label: string;
  stat4Number: string;
  stat4Label: string;
  teamTitle: string;
  teamSubtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
}
export interface PageContact {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  formTitle: string;
  formSubtitle: string;
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  mapEmbedUrl: string;
}
export interface PageBlog {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  searchPlaceholder: string;
  featuredTitle: string;
  allPostsTitle: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
}
export interface PageCart {
  title: string;
  emptyTitle: string;
  emptySubtitle: string;
  upsellTitle: string;
  summaryTitle: string;
  checkoutButton: string;
  trustBadge1: string;
  trustBadge2: string;
  trustBadge3: string;
}
export interface PageCheckout {
  title: string;
  step1Title: string;
  step2Title: string;
  step3Title: string;
  summaryTitle: string;
  submitButton: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  momoPhone: string;
  momoName: string;
}
export interface PageWarranty {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  basicWarrantyYears: string;
  proWarrantyYears: string;
  eliteWarrantyYears: string;
  warrantyScope: string;
  processTitle: string;
  hotline: string;
  email: string;
}
export interface PageReturns {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  returnDays: string;
  trialDays: string;
  condition1: string;
  condition2: string;
  condition3: string;
  processTitle: string;
  hotline: string;
  email: string;
}
export interface ThemeVideoItem {
  id: string;
  youtubeId: string;
  title: string;
  label?: string;
}

export interface ThemeVideoSection {
  enabled: boolean;
  sectionLabel: string;
  sectionTitle: string;
  videos: ThemeVideoItem[];
}

// ─── Homepage Section Text Styles ───────────────────────────────────────────
export interface TextBlock {
  text: string;
  fontSize: number;   // px
  color: string;      // hex
  fontWeight: "light" | "normal" | "medium" | "semibold" | "bold";
}

export interface HomepageSectionHeader {
  badge: TextBlock;
  title: TextBlock;
  titleAccent: TextBlock;  // phần chữ nhấn màu khác trong tiêu đề
  subtitle: TextBlock;
}

export interface HomepageFeatureItem {
  icon: string;
  title: string;
  desc: string;
}

export interface HomepageFeaturesSection extends HomepageSectionHeader {
  items: HomepageFeatureItem[];
}

export interface HomepageTestimonialsSection extends HomepageSectionHeader {
  ratingLabel: string;
  trustedByLabel: string;
}

export interface HomepageDownloadSection {
  badge: TextBlock;
  title: TextBlock;
  subtitle: TextBlock;
  appStoreLabel: string;
  googlePlayLabel: string;
  ratingText: string;
}

export interface HomepageSections {
  features: HomepageFeaturesSection;
  testimonials: HomepageTestimonialsSection;
  download: HomepageDownloadSection;
}

export interface SiteTheme {
  id: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  logo: ThemeLogo;
  banner: ThemeBanner;
  hero: ThemeHero;
  navbar: ThemeNavbar;
  footer: ThemeFooter;
  layout: ThemeLayout;
  seo: ThemeSEO;
  pageProducts: PageProducts;
  pageAbout: PageAbout;
  pageContact: PageContact;
  pageBlog: PageBlog;
  pageCart: PageCart;
  pageCheckout: PageCheckout;
  pageWarranty: PageWarranty;
  pageReturns: PageReturns;
  videoSection: ThemeVideoSection;
  homepageSections: HomepageSections;
  updatedAt: string;
}
