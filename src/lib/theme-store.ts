// Theme Store — lưu cài đặt giao diện website SmartFurni
// Lưu trữ vào PostgreSQL để persist qua các deploy
// NOTE: Chỉ import file này từ Server Components. Client components dùng import type từ theme-types.ts

import { dbGetSetting, dbSaveSetting } from "./db-store";

const THEME_SETTING_KEY = "site_theme";

// In-memory cache
let _themeCache: SiteTheme | null = null;

// Re-export all types from theme-types.ts (no fs dependency)
export type {
  ThemeColors,
  ThemeTypography,
  ThemeLogo,
  ThemeBanner,
  ThemeHero,
  ThemeNavbar,
  ThemeFooter,
  ThemeLayout,
  ThemeSEO,
  PageProducts,
  PageAbout,
  PageContact,
  PageBlog,
  PageCart,
  PageCheckout,
  PageWarranty,
  PageReturns,
  ThemeVideoSection,
  ThemeVideoItem,
  SiteTheme,
} from "./theme-types";

import type {
  ThemeColors,
  SiteTheme,
} from "./theme-types";

// ─── Default Theme ───────────────────────────────────────────────────────────
export const defaultTheme: SiteTheme = {
  id: "default",
  name: "SmartFurni Default",
  colors: {
    primary: "#C9A84C",
    secondary: "#9A7A2E",
    accent: "#E2C97E",
    background: "#080600",
    surface: "#1A1500",
    text: "#F5EDD6",
    textMuted: "#9CA3AF",
    border: "#2D2500",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  typography: {
    fontFamily: "Inter",
    headingFont: "Inter",
    baseFontSize: 16,
    headingScale: 1.25,
    lineHeight: 1.6,
    letterSpacing: "normal",
  },
  logo: {
    url: "",
    width: 140,
    altText: "SmartFurni",
    showText: true,
    textColor: "#C9A84C",
  },
  banner: {
    enabled: true,
    text: "🎉 Ưu đãi đặc biệt: Giảm 15% cho đơn hàng đầu tiên",
    bgColor: "#C9A84C",
    textColor: "#000000",
    link: "/products",
    linkText: "Mua ngay →",
    closeable: true,
  },
  hero: {
    title: "Giường Điều Khiển Thông Minh SmartFurni",
    subtitle: "Trải nghiệm giấc ngủ hoàn hảo với công nghệ điều khiển thông minh, theo dõi sức khỏe và kết nối ứng dụng di động.",
    ctaText: "Khám phá ngay",
    ctaLink: "/dashboard",
    ctaSecondaryText: "Xem demo",
    ctaSecondaryLink: "#demo",
    bgGradientFrom: "#080600",
    bgGradientTo: "#1A1500",
    overlayOpacity: 60,
  },
  navbar: {
    bgColor: "#080600",
    textColor: "#F5EDD6",
    sticky: true,
    showShadow: true,
    height: 64,
    borderBottom: true,
  },
  footer: {
    bgColor: "#0D0B00",
    textColor: "#9CA3AF",
    companyName: "SmartFurni",
    tagline: "Nâng tầm giấc ngủ của bạn",
    phone: "1800 1234 56",
    email: "hello@smartfurni.vn",
    showSocialLinks: true,
    socialLinks: {
      facebook: "https://facebook.com/smartfurni",
      instagram: "https://instagram.com/smartfurni",
      youtube: "https://youtube.com/@smartfurni",
      tiktok: "https://tiktok.com/@smartfurni",
    },
    copyrightText: "© 2026 SmartFurni. Tất cả quyền được bảo lưu.",
  },
  layout: {
    maxWidth: 1280,
    sectionSpacing: 5,
    borderRadius: "lg",
    buttonStyle: "rounded",
    cardShadow: "md",
    animationsEnabled: true,
  },
  seo: {
    siteTitle: "SmartFurni — Giường Điều Khiển Thông Minh",
    titleSeparator: " | ",
    defaultDescription: "SmartFurni cung cấp giường điều khiển thông minh với công nghệ IoT, theo dõi giấc ngủ và điều chỉnh tư thế tối ưu.",
    ogImage: "",
    favicon: "",
    googleAnalyticsId: "",
    facebookPixelId: "",
  },
  pageProducts: {
    heroTitle: "Bộ sưu tập Giường Thông Minh",
    heroSubtitle: "Khám phá dòng sản phẩm giường điều khiển thông minh SmartFurni — từ phân khúc phổ thông đến cao cấp.",
    heroBadge: "Sản Phẩm",
    filterLabel: "Lọc theo danh mục",
    emptyTitle: "Không tìm thấy sản phẩm",
    emptySubtitle: "Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác.",
    compareLabel: "So sánh sản phẩm",
  },
  pageAbout: {
    heroTitle: "Tái định nghĩa giấc ngủ Việt Nam",
    heroSubtitle: "SmartFurni được thành lập với sứ mệnh mang lại giấc ngủ chất lượng cao cho mọi gia đình Việt thông qua công nghệ thông minh.",
    heroBadge: "Về Chúng Tôi",
    missionTitle: "Sứ mệnh",
    missionText: "Cung cấp giải pháp giấc ngủ thông minh, giúp mỗi người Việt có được giấc ngủ sâu và phục hồi sức khỏe tối ưu.",
    visionTitle: "Tầm nhìn",
    visionText: "Trở thành thương hiệu giường thông minh số 1 Đông Nam Á vào năm 2030.",
    stat1Number: "10.000+",
    stat1Label: "Khách hàng hài lòng",
    stat2Number: "5 năm",
    stat2Label: "Kinh nghiệm R&D",
    stat3Number: "98%",
    stat3Label: "Tỷ lệ hài lòng",
    stat4Number: "50+",
    stat4Label: "Đại lý toàn quốc",
    teamTitle: "Đội ngũ sáng lập",
    teamSubtitle: "Những con người đam mê công nghệ và chất lượng giấc ngủ",
    ctaTitle: "Sẵn sàng trải nghiệm?",
    ctaSubtitle: "Hãy để SmartFurni đồng hành cùng giấc ngủ của bạn.",
    ctaButton: "Xem sản phẩm",
  },
  pageContact: {
    heroTitle: "Liên hệ với chúng tôi",
    heroSubtitle: "Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7. Hãy liên hệ qua bất kỳ kênh nào phù hợp.",
    heroBadge: "Liên Hệ",
    formTitle: "Gửi tin nhắn",
    formSubtitle: "Điền form bên dưới, chúng tôi sẽ phản hồi trong vòng 2 giờ.",
    phone: "1800 1234 56",
    email: "hello@smartfurni.vn",
    address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    workingHours: "Thứ 2 – Thứ 7: 8:00 – 20:00 | Chủ nhật: 9:00 – 17:00",
    mapEmbedUrl: "",
  },
  pageBlog: {
    heroTitle: "Kiến thức về Giấc Ngủ Thông Minh",
    heroSubtitle: "Tips giấc ngủ, hướng dẫn sử dụng và cập nhật sản phẩm từ đội ngũ chuyên gia SmartFurni.",
    heroBadge: "Blog & Tin Tức",
    searchPlaceholder: "Tìm kiếm bài viết, chủ đề, tác giả...",
    featuredTitle: "Bài viết nổi bật",
    allPostsTitle: "Tất cả bài viết",
    newsletterTitle: "Nhận bài viết mới nhất",
    newsletterSubtitle: "Đăng ký nhận newsletter hàng tuần về giấc ngủ và sức khỏe.",
  },
  pageCart: {
    title: "Giỏ hàng của bạn",
    emptyTitle: "Giỏ hàng trống",
    emptySubtitle: "Hãy khám phá các sản phẩm giường thông minh của chúng tôi.",
    upsellTitle: "Khách hàng cũng mua",
    summaryTitle: "Tóm tắt đơn hàng",
    checkoutButton: "Tiến hành đặt hàng",
    trustBadge1: "Bảo hành 5 năm",
    trustBadge2: "Đổi trả 30 ngày",
    trustBadge3: "Giao hàng miễn phí",
  },
  pageCheckout: {
    title: "Đặt hàng",
    step1Title: "Thông tin khách hàng",
    step2Title: "Địa chỉ giao hàng",
    step3Title: "Phương thức thanh toán",
    summaryTitle: "Đơn hàng của bạn",
    submitButton: "Xác nhận đặt hàng",
    bankName: "Vietcombank",
    bankAccount: "1234567890",
    bankHolder: "CONG TY SMARTFURNI",
    momoPhone: "0901234567",
    momoName: "SmartFurni",
  },
  pageWarranty: {
    heroTitle: "Chính sách bảo hành",
    heroSubtitle: "SmartFurni cam kết bảo hành dài hạn cho tất cả sản phẩm, đảm bảo trải nghiệm tốt nhất.",
    heroBadge: "Bảo Hành",
    basicWarrantyYears: "3 năm",
    proWarrantyYears: "5 năm",
    eliteWarrantyYears: "7 năm",
    warrantyScope: "Bảo hành toàn bộ linh kiện điện tử, cơ cấu điều chỉnh và khung giường.",
    processTitle: "Quy trình bảo hành",
    hotline: "1800 1234 56",
    email: "warranty@smartfurni.vn",
  },
  pageReturns: {
    heroTitle: "Chính sách đổi trả",
    heroSubtitle: "30 ngày dùng thử — không hài lòng hoàn tiền 100%. Chúng tôi cam kết sự hài lòng của bạn.",
    heroBadge: "Đổi Trả",
    returnDays: "30",
    trialDays: "30",
    condition1: "Sản phẩm còn nguyên vẹn, chưa qua sử dụng quá 30 ngày",
    condition2: "Còn đầy đủ phụ kiện và hộp đựng ban đầu",
    condition3: "Có hóa đơn mua hàng hợp lệ",
    processTitle: "Quy trình đổi trả",
    hotline: "1800 1234 56",
    email: "returns@smartfurni.vn",
  },
  videoSection: {
    enabled: true,
    sectionLabel: "Xem sản phẩm hoạt động thực tế",
    sectionTitle: "Giường Điều Khiển Thông Minh SmartFurni — Xem Thực Tế",
    videos: [
      {
        id: "v1",
        youtubeId: "YuZ81jo6_fQ",
        title: "Giường Điều Khiển Thông Minh SmartFurni — Xem Thực Tế",
        label: "Video giới thiệu",
      },
    ],
  },
  updatedAt: new Date().toISOString(),
};

// ─── DB helpers ───────────────────────────────────────────────────────────────
function mergeTheme(saved: SiteTheme): SiteTheme {
  return {
    ...defaultTheme,
    ...saved,
    colors: { ...defaultTheme.colors, ...saved.colors },
    typography: { ...defaultTheme.typography, ...saved.typography },
    logo: { ...defaultTheme.logo, ...saved.logo },
    banner: { ...defaultTheme.banner, ...saved.banner },
    hero: { ...defaultTheme.hero, ...saved.hero },
    navbar: { ...defaultTheme.navbar, ...saved.navbar },
    footer: { ...defaultTheme.footer, ...saved.footer },
    layout: { ...defaultTheme.layout, ...saved.layout },
    seo: { ...defaultTheme.seo, ...saved.seo },
    pageProducts: { ...defaultTheme.pageProducts, ...(saved.pageProducts || {}) },
    pageAbout: { ...defaultTheme.pageAbout, ...(saved.pageAbout || {}) },
    pageContact: { ...defaultTheme.pageContact, ...(saved.pageContact || {}) },
    pageBlog: { ...defaultTheme.pageBlog, ...(saved.pageBlog || {}) },
    pageCart: { ...defaultTheme.pageCart, ...(saved.pageCart || {}) },
    pageCheckout: { ...defaultTheme.pageCheckout, ...(saved.pageCheckout || {}) },
    pageWarranty: { ...defaultTheme.pageWarranty, ...(saved.pageWarranty || {}) },
    pageReturns: { ...defaultTheme.pageReturns, ...(saved.pageReturns || {}) },
    videoSection: saved.videoSection
      ? { ...defaultTheme.videoSection, ...saved.videoSection, videos: saved.videoSection.videos ?? defaultTheme.videoSection.videos }
      : defaultTheme.videoSection,
  };
}

/** Async version — reads from DB, populates cache */
export async function getThemeAsync(): Promise<SiteTheme> {
  if (_themeCache) return _themeCache;
  try {
    const saved = await dbGetSetting<SiteTheme>(THEME_SETTING_KEY);
    if (saved) {
      _themeCache = mergeTheme(saved);
      return _themeCache;
    }
  } catch {
    // fallback to default
  }
  return { ...defaultTheme };
}

/** Sync version — returns cache (populated by getThemeAsync or initTheme) */
export function getTheme(): SiteTheme {
  return _themeCache ?? { ...defaultTheme };
}

/** Initialize theme cache from DB on startup */
export async function initTheme(): Promise<void> {
  _themeCache = await getThemeAsync();
}

async function saveTheme(theme: SiteTheme): Promise<void> {
  _themeCache = theme;
  await dbSaveSetting(THEME_SETTING_KEY, theme);
}

export async function updateTheme(updates: Partial<SiteTheme>): Promise<SiteTheme> {
  const current = await getThemeAsync();
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveTheme(updated);
  return updated;
}

export async function updateThemeSection<K extends keyof SiteTheme>(
  section: K,
  updates: Partial<SiteTheme[K]>
): Promise<SiteTheme> {
  const current = await getThemeAsync();
  const updated = {
    ...current,
    [section]: {
      ...(current[section] as object),
      ...(updates as object),
    },
    updatedAt: new Date().toISOString(),
  };
  await saveTheme(updated);
  return updated;
}

export async function applyPreset(presetId: string): Promise<SiteTheme> {
  const preset = PRESET_THEMES.find((p) => p.id === presetId);
  if (!preset) return getThemeAsync();
  const current = await getThemeAsync();
  const updated = {
    ...current,
    colors: { ...preset.colors },
    updatedAt: new Date().toISOString(),
  };
  await saveTheme(updated);
  return updated;
}

export async function resetTheme(): Promise<SiteTheme> {
  const reset = { ...defaultTheme, updatedAt: new Date().toISOString() };
  await saveTheme(reset);
  return reset;
}

// ─── Preset themes ────────────────────────────────────────────────────────────
export const PRESET_THEMES: { id: string; name: string; colors: ThemeColors; preview: string }[] = [
  {
    id: "gold-dark",
    name: "Gold Dark (Mặc định)",
    preview: "#C9A84C",
    colors: {
      primary: "#C9A84C", secondary: "#9A7A2E", accent: "#E2C97E",
      background: "#080600", surface: "#1A1500", text: "#F5EDD6",
      textMuted: "#9CA3AF", border: "#2D2500",
      success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
    },
  },
  {
    id: "blue-modern",
    name: "Blue Modern",
    preview: "#3B82F6",
    colors: {
      primary: "#3B82F6", secondary: "#1D4ED8", accent: "#60A5FA",
      background: "#0F172A", surface: "#1E293B", text: "#F8FAFC",
      textMuted: "#94A3B8", border: "#334155",
      success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
    },
  },
  {
    id: "green-nature",
    name: "Green Nature",
    preview: "#10B981",
    colors: {
      primary: "#10B981", secondary: "#059669", accent: "#34D399",
      background: "#022C22", surface: "#064E3B", text: "#ECFDF5",
      textMuted: "#6EE7B7", border: "#065F46",
      success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
    },
  },
  {
    id: "purple-luxury",
    name: "Purple Luxury",
    preview: "#8B5CF6",
    colors: {
      primary: "#8B5CF6", secondary: "#7C3AED", accent: "#A78BFA",
      background: "#0F0A1A", surface: "#1E1033", text: "#FAF5FF",
      textMuted: "#C4B5FD", border: "#2E1065",
      success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
    },
  },
  {
    id: "rose-elegant",
    name: "Rose Elegant",
    preview: "#F43F5E",
    colors: {
      primary: "#F43F5E", secondary: "#E11D48", accent: "#FB7185",
      background: "#1A0008", surface: "#2D0010", text: "#FFF1F2",
      textMuted: "#FDA4AF", border: "#4C0519",
      success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
    },
  },
  {
    id: "white-minimal",
    name: "White Minimal",
    preview: "#111827",
    colors: {
      primary: "#111827", secondary: "#374151", accent: "#6B7280",
      background: "#FFFFFF", surface: "#F9FAFB", text: "#111827",
      textMuted: "#6B7280", border: "#E5E7EB",
      success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
    },
  },
];

export const FONT_OPTIONS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat",
  "Poppins", "Nunito", "Raleway", "Playfair Display", "Merriweather",
];

export const BORDER_RADIUS_OPTIONS = [
  { value: "none", label: "Vuông (0px)" },
  { value: "sm", label: "Bo nhẹ (4px)" },
  { value: "md", label: "Bo vừa (8px)" },
  { value: "lg", label: "Bo nhiều (12px)" },
  { value: "xl", label: "Bo mạnh (16px)" },
  { value: "full", label: "Tròn hoàn toàn" },
];

// ─── CSS Variables helper ─────────────────────────────────────────────────────
export function generateCSSVariables(theme: SiteTheme): string {
  const { colors, typography, layout } = theme;
  const borderRadiusMap: Record<string, string> = {
    none: "0px", sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px",
  };
  return `
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-accent: ${colors.accent};
    --color-background: ${colors.background};
    --color-surface: ${colors.surface};
    --color-text: ${colors.text};
    --color-text-muted: ${colors.textMuted};
    --color-border: ${colors.border};
    --color-success: ${colors.success};
    --color-warning: ${colors.warning};
    --color-error: ${colors.error};
    --font-family: ${typography.fontFamily}, sans-serif;
    --font-heading: ${typography.headingFont}, sans-serif;
    --font-size-base: ${typography.baseFontSize}px;
    --line-height: ${typography.lineHeight};
    --border-radius: ${borderRadiusMap[layout.borderRadius] || "12px"};
    --max-width: ${layout.maxWidth}px;
  `.trim();
}

// ─── Register DB loader ───────────────────────────────────────────────────────
import { registerDbLoader } from "./db-init";

registerDbLoader(async () => {
  await initTheme();
  console.log("[theme-store] Theme loaded from database");
});
