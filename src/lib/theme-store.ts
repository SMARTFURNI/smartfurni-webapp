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
  TextBlock,
  HomepageSectionHeader,
  HomepageFeatureItem,
  HomepageContentCard,
  HomepageSectionMedia,
  HomepageGenericSection,
  HomepageFeaturesSection,
  HomepageTestimonialsSection,
  HomepageDownloadSection,
  HomepageSections,
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
    title: "Giường Công Thái Học\nĐiều Chỉnh Điện SmartFurni",
    subtitle: "Sự tiện nghi giấc ngủ hoàn hảo với công nghệ điều khiển thông minh, theo dõi sức khỏe và kết nối ứng dụng di động.",
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
    phone: "028.7122.0818",
    email: "hello@smartfurni.vn",
    showSocialLinks: true,
    socialLinks: {
      facebook: "https://facebook.com/smartfurni",
      instagram: "https://instagram.com/smartfurni",
      youtube: "https://youtube.com/@smartfurni",
      tiktok: "https://tiktok.com/@smartfurni",
      zalo: "https://zalo.me/0918326552",
    },
    copyrightText: "© 2026 SmartFurni. Tất cả quyền được bảo lưu.",
    aboutText: "Tiên phong trong lĩnh vực giường công thái học điều chỉnh điện tại Việt Nam. Chất lượng vượt trội — Dịch vụ hậu mãi chuyên nghiệp.",
    showrooms: [
      { icon: "📍", label: "TP. Hồ Chí Minh", address: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức", phone: "028.7122.0818", hours: "8:00 – 21:00 (Thứ 2 – Chủ nhật)", mapUrl: "https://maps.google.com/?q=74+Nguyen+Thi+Nhung+Thu+Duc", badge: "Flagship" },
      { icon: "📍", label: "Hà Nội", address: "B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông", phone: "024.7109.0818", hours: "8:00 – 21:00 (Thứ 2 – Chủ nhật)", mapUrl: "https://maps.google.com/?q=Geleximco+B+Le+Trong+Tan+Ha+Dong", badge: "Showroom" },
      { icon: "🏭", label: "Xưởng SX", address: "202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn", phone: "028.7122.0818", hours: "8:00 – 17:00 (Thứ 2 – Thứ 7)", mapUrl: "https://maps.google.com/?q=202+Nguyen+Thi+Sang+Dong+Thanh+Hoc+Mon", badge: "Xưởng" },
    ],
    contacts: [
      { icon: "📞", label: "Hotline", value: "028.7122.0818", href: "tel:02871220818" },
      { icon: "💬", label: "Zalo tư vấn", value: "0918.326.552", href: "https://zalo.me/0918326552" },
      { icon: "✉️", label: "Email", value: "info@smartfurni.vn", href: "mailto:info@smartfurni.vn" },
      { icon: "🌐", label: "Website", value: "smartfurni.vn", href: "https://smartfurni.vn" },
    ],
    policyLinks: [
      { label: "Chính sách bảo hành", href: "/warranty" },
      { label: "Chính sách đổi trả", href: "/returns" },
      { label: "Chính sách bảo mật", href: "/privacy" },
      { label: "Điều khoản sử dụng", href: "/terms" },
      { label: "Chính sách đại lý", href: "/lp/doi-tac-showroom-nem" },
      { label: "Hướng dẫn sử dụng", href: "/blog?category=Hướng Dẫn Sử Dụng" },
      { label: "Câu hỏi thường gặp", href: "/contact#faq" },
    ],
    ctaText: "Đăng ký đối tác →",
    ctaHref: "/lp/doi-tac-showroom-nem#dang-ky",
    ctaZaloText: "💬 Chat Zalo ngay",
    ctaZaloHref: "https://zalo.me/0918326552",
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
    phone: "028.7122.0818",
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
    hotline: "028.7122.0818",
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
    hotline: "028.7122.0818",
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
  homepageSections: {
    features: {
      badge: { text: "TÍNH NĂNG NỔI BẬT", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Mọi thứ bạn cần cho", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "giấc ngủ hoàn hảo", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "SmartFurni tích hợp công nghệ điều khiển thông minh vào từng chi tiết, mang lại trải nghiệm ngủ được cá nhân hóa hoàn toàn.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "📌", title: "Điều chỉnh góc chính xác", desc: "Điều chỉnh đầu và chân giường 0–70° với độ chính xác 1°" },
        { icon: "🧠", title: "Preset thông minh", desc: "Lưu lại tư thế yêu thích, một chạm khôi phục" },
        { icon: "💡", title: "Đèn LED thông minh", desc: "Dải đèn LED điều chỉnh được nhiệt độ màu và độ sáng" },
        { icon: "💆", title: "Massage tích hợp", desc: "Hệ thống rung massage 5 chế độ giúp thư giãn cơ thể" },
        { icon: "📊", title: "Theo dõi giấc ngủ", desc: "Cảm biến phân tích chất lượng giấc ngủ mỗi đêm" },
        { icon: "🎤", title: "Điều khiển giọng nói", desc: "Tương thích Alexa, Google Assistant và Siri" },
        { icon: "⏰", title: "Hẹn giờ thông minh", desc: "Tự động điều chỉnh tư thế theo lịch ngủ của bạn" },
        { icon: "📡", title: "Kết nối Bluetooth 5.0", desc: "Kết nối ổn định với smartphone từ khoảng cách xa" },
      ],
    },
    testimonials: {
      badge: { text: "KHÁCH HÀNG NÓI GÌ", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Hơn 10.000 khách hàng", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "tin tưởng SmartFurni", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "Những đánh giá thực tế từ khách hàng đã trải nghiệm sản phẩm SmartFurni.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      ratingLabel: "Dựa trên 10.247 đánh giá",
      trustedByLabel: "Được tin dùng bởi",
    },
    download: {
      badge: { text: "TẢI ỨNG DỤNG", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Kiểm soát giấc ngủ từ điện thoại", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      subtitle: { text: "Tải ứng dụng SmartFurni để điều khiển giường, theo dõi giấc ngủ và cài đặt lịch tự động.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      appStoreLabel: "App Store",
      googlePlayLabel: "Google Play",
      ratingText: "4.9 ★ trên App Store và Google Play",
    },
    problems: {
      badge: { text: "GIƯỜNG THÔNG MINH PHÙ HỢP KHI NÀO", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Thoải mái hơn", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "trong từng sinh hoạt", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "Nếu bạn thường đọc sách, xem TV, nghỉ ngơi hoặc chăm sóc người thân ngay trên giường, khả năng nâng hạ linh hoạt sẽ giúp sinh hoạt mỗi ngày nhẹ nhàng và dễ chịu hơn.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "", title: "Đọc sách, xem phim thoải mái", desc: "Nâng phần đầu đến góc dễ chịu để tựa lưng chắc hơn, hạn chế phải kê chồng nhiều gối." },
        { icon: "", title: "Ngồi dậy nhẹ nhàng hơn", desc: "Chỉ cần điều chỉnh phần đầu giường, bạn có thể chuyển từ nằm sang ngồi chủ động và đỡ mất sức hơn." },
        { icon: "", title: "Thả lỏng sau một ngày dài", desc: "Nâng chân thư giãn hoặc chọn tư thế nghỉ yêu thích để cơ thể được nâng đỡ và thư giãn tốt hơn." },
        { icon: "", title: "Phòng ngủ gọn mà đa năng", desc: "Một chiếc giường dùng được cho nghỉ ngơi, giải trí nhẹ nhàng và chăm sóc người thân trong cùng một không gian." },
      ],
      mediaLayout: "split",
      media: [
        { label: "Tình huống", title: "Đọc sách, xem TV thoải mái hơn", desc: "Nâng phần đầu giường đúng góc, hạn chế kê nhiều gối và giữ phòng ngủ gọn gàng.", type: "image", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/products" },
        { label: "Video demo", title: "Thấy rõ chuyển động trước khi mua", desc: "Xem cách giường nâng đầu, nâng chân và trở về tư thế nằm chỉ bằng một thao tác.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
      ],
    },
    solutions: {
      badge: { text: "CHỌN THEO NGƯỜI SỬ DỤNG", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Bạn đang mua", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "cho ai?", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "Mỗi gia đình có một lý do khác nhau khi chọn giường thông minh. Hãy bắt đầu từ người sẽ sử dụng nhiều nhất để chọn đúng tính năng, kích thước và cách tư vấn phù hợp.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "", title: "Cho bố mẹ hoặc người lớn tuổi", desc: "Ưu tiên thao tác đơn giản, nâng đầu nhẹ nhàng và hỗ trợ ngồi dậy thuận tiện hơn." },
        { icon: "", title: "Cho phòng ngủ cá nhân", desc: "Phù hợp nếu bạn thích đọc sách, xem phim, nghỉ ngơi và lưu tư thế yêu thích chỉ bằng một chạm." },
        { icon: "", title: "Cho căn hộ hiện đại", desc: "Giúp phòng ngủ gọn gàng, sang hơn và linh hoạt cho nhiều thói quen sinh hoạt." },
        { icon: "", title: "Cho người thích tiện nghi thông minh", desc: "Dễ điều khiển bằng remote hoặc ứng dụng, có thể lưu tư thế thường dùng để sử dụng nhanh mỗi ngày." },
        { icon: "", title: "Cho khách sạn, homestay hoặc dự án", desc: "Tạo điểm nhấn cao cấp cho không gian lưu trú, phòng mẫu hoặc các dự án nội thất cần trải nghiệm khác biệt." },
      ],
      mediaLayout: "rail",
      media: [
        { label: "Gợi ý chọn", title: "Chọn mẫu hợp với gia đình", desc: "Bắt đầu từ người sử dụng, diện tích phòng và thói quen sinh hoạt để tìm mẫu phù hợp nhanh hơn.", type: "image", imageUrl: "/gsf150-wood-frame.jpg", linkUrl: "/products" },
        { label: "Tư vấn", title: "Cần mẫu nào, hỏi ngay mẫu đó", desc: "Đặt lịch trải nghiệm hoặc nhận tư vấn theo kích thước phòng, loại nệm và ngân sách.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/contact", videoUrl: "#demo" },
      ],
    },
    technology: {
      badge: { text: "VẬN HÀNH ÊM VÀ AN TÂM", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Êm ái từ", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "bên trong", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "Bạn không cần hiểu quá nhiều thuật ngữ kỹ thuật. Điều quan trọng là giường nâng hạ êm, giữ form chắc, dễ điều khiển và được tư vấn rõ trước khi chọn mua.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "", title: "Motor nâng hạ êm", desc: "Giúp chuyển từ nằm sang ngồi hoặc nâng chân mượt hơn, hạn chế làm phiền người nằm cạnh." },
        { icon: "", title: "Khung giường chắc chắn", desc: "Giữ giường ổn định khi thay đổi tư thế, tạo cảm giác an tâm khi sử dụng lâu dài." },
        { icon: "", title: "Lưu tư thế yêu thích", desc: "Đặt sẵn góc nằm quen thuộc để mỗi lần sử dụng chỉ cần bấm một lần là trở lại đúng tư thế." },
        { icon: "", title: "Điều khiển dễ dùng", desc: "Nút bấm rõ ràng, dễ làm quen để cả gia đình có thể sử dụng hằng ngày." },
      ],
      mediaLayout: "split",
      media: [
        { label: "Bên trong", title: "Motor, khung và cơ cấu nâng", desc: "Các chi tiết quan trọng được trình bày rõ để bạn yên tâm hơn về độ ổn định khi sử dụng lâu dài.", type: "image", imageUrl: "/gsf150-exploded.jpg", linkUrl: "/products/gsf150" },
        { label: "Demo", title: "Vận hành êm trong từng chuyển động", desc: "Xem cận cảnh remote, motor và các tư thế cài sẵn để dễ hình dung trải nghiệm thực tế.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
      ],
    },
    postures: {
      badge: { text: "CÁC TƯ THẾ THƯ GIÃN", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Một chiếc giường", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "cho nhiều cách nghỉ", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "Từ đọc sách, xem phim đến nghỉ ngơi sau ngày dài, bạn có thể điều chỉnh giường theo tư thế phù hợp thay vì cố nằm theo một mặt phẳng cố định.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "", title: "Zero Gravity", desc: "Tư thế nâng đỡ toàn thân, tạo cảm giác nhẹ người và thư giãn sâu hơn." },
        { icon: "", title: "Đọc sách, xem phim", desc: "Nâng phần đầu để tầm nhìn vừa mắt hơn, lưng được tựa ổn định hơn khi giải trí." },
        { icon: "", title: "Nghỉ ngơi trong ngày", desc: "Chọn góc nâng vừa phải để chợp mắt, nghe nhạc hoặc thư giãn mà chưa cần nằm ngủ hẳn." },
        { icon: "", title: "Nâng chân thư giãn", desc: "Phù hợp sau khi đi lại nhiều, giúp đôi chân được nâng đỡ và dễ chịu hơn." },
        { icon: "", title: "Hỗ trợ ngồi dậy", desc: "Nâng phần đầu để bạn chuyển sang tư thế ngồi thuận tiện hơn trước khi bước xuống giường." },
      ],
      mediaLayout: "mosaic",
      media: [
        { label: "Tư thế", title: "Từ nằm nghỉ đến ngồi thư giãn", desc: "Một khung hình trực quan giúp bạn thấy ngay giường có thể thay đổi tư thế như thế nào.", type: "image", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/products" },
        { label: "Video", title: "Chuyển tư thế thực tế", desc: "Clip ngắn mô tả các tư thế thường dùng: đọc sách, xem TV, nâng chân và nghỉ ngơi.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
      ],
    },
    comparison: {
      badge: { text: "SO SÁNH NHANH", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Giường thường", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "khác gì SmartFurni?", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "Nếu bạn đang phân vân giữa giường thường và giường thông minh, hãy nhìn vào những khác biệt dễ cảm nhận nhất trong quá trình sử dụng mỗi ngày.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "Cố định, ít thay đổi", title: "Tư thế sử dụng", desc: "Có thể nâng đầu hoặc nâng chân theo từng hoạt động." },
        { icon: "Phải kê gối thủ công", title: "Đọc sách, xem phim", desc: "Tựa lưng thoải mái hơn bằng remote hoặc tư thế đã lưu." },
        { icon: "Ít tiện ích", title: "Sự tiện nghi", desc: "Dễ điều chỉnh tư thế, dễ ghi nhớ góc nằm quen thuộc và sử dụng hằng ngày." },
        { icon: "Khó hình dung trước", title: "Trước và sau khi mua", desc: "Được tư vấn kích thước, trải nghiệm mẫu, giao lắp và hướng dẫn sử dụng rõ ràng." },
      ],
      mediaLayout: "split",
      media: [
        { label: "So sánh", title: "Giường thường hay giường thông minh?", desc: "Bảng đối chiếu ngắn giúp bạn thấy khác biệt trong thẩm mỹ, tư thế và tiện ích hằng ngày.", type: "image", imageUrl: "/gsf150-standalone.jpg", linkUrl: "/products" },
      ],
    },
    process: {
      badge: { text: "MUA GIƯỜNG THÔNG MINH NHƯ THẾ NÀO", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Từ lúc chọn mẫu", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "đến khi sử dụng", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "SmartFurni giúp bạn đi từng bước rõ ràng: hiểu nhu cầu, chọn mẫu phù hợp, chốt cấu hình, giao lắp tại nhà và tiếp tục hỗ trợ trong quá trình sử dụng.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "1", title: "Chia sẻ nhu cầu", desc: "Cho SmartFurni biết ai sẽ dùng giường, thói quen sinh hoạt, kích thước phòng và loại nệm bạn đang có." },
        { icon: "2", title: "Xem mẫu hoặc video tư vấn", desc: "Bạn có thể trải nghiệm tại showroom hoặc xem video minh họa để dễ hình dung cách giường vận hành." },
        { icon: "3", title: "Chọn cấu hình phù hợp", desc: "Cùng tư vấn viên chọn kích thước, chất liệu, tính năng, nệm đi kèm và phương án giao lắp." },
        { icon: "4", title: "Lắp đặt tại nhà", desc: "Kỹ thuật viên lắp đặt, kiểm tra nâng hạ và hướng dẫn bạn thao tác cơ bản." },
        { icon: "5", title: "Hỗ trợ khi cần", desc: "Khi cần hỏi thêm về sử dụng, bảo hành hoặc bảo trì, bạn có kênh liên hệ rõ ràng để được hỗ trợ." },
      ],
      mediaLayout: "rail",
      media: [
        { label: "Quy trình", title: "Từ lúc chọn mẫu đến khi sử dụng", desc: "Mỗi bước mua hàng được trình bày rõ để bạn biết cần chuẩn bị gì và sẽ nhận được gì.", type: "image", imageUrl: "/gsf150-wood-frame.jpg", linkUrl: "/contact" },
        { label: "Bàn giao", title: "Hướng dẫn sử dụng sau lắp đặt", desc: "Kỹ thuật viên kiểm tra giường, hướng dẫn remote và các lưu ý sử dụng tại nhà.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
      ],
    },
    trust: {
      badge: { text: "YÊN TÂM KHI CHỌN SMARTFURNI", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Mua giường mới", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "cần sự rõ ràng", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "Với một sản phẩm sử dụng lâu dài trong phòng ngủ, bạn cần được xem rõ thông số, thử trải nghiệm nếu cần và biết chắc ai sẽ hỗ trợ sau khi bàn giao.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "", title: "Tư vấn thông số rõ ràng", desc: "Bạn được tư vấn kích thước, tải trọng, góc nâng, chất liệu, nệm phù hợp và chính sách bảo hành trước khi đặt mua." },
        { icon: "", title: "Có thể xem và trải nghiệm", desc: "Bạn có thể đặt lịch xem mẫu, thử tư thế và trao đổi trực tiếp để chọn cấu hình phù hợp." },
        { icon: "", title: "Giao lắp có hướng dẫn", desc: "Khi lắp đặt tại nhà, kỹ thuật viên kiểm tra vận hành và hướng dẫn bạn cách dùng cơ bản." },
      ],
      mediaLayout: "mosaic",
      media: [
        { label: "Showroom", title: "Trải nghiệm sản phẩm thật", desc: "Bạn có thể xem mẫu, thử tư thế và trao đổi trực tiếp trước khi quyết định.", type: "image", imageUrl: "/gsf150-standalone.jpg", linkUrl: "/contact" },
        { label: "Thực tế", title: "Video bàn giao tại nhà", desc: "Quy trình giao lắp, hướng dẫn sử dụng và kiểm tra vận hành được thể hiện rõ ràng.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "#demo", videoUrl: "#demo" },
      ],
    },
    faq: {
      badge: { text: "CÂU HỎI THƯỜNG GẶP", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Trước khi", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "đặt lịch tư vấn", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "Trước khi để lại thông tin tư vấn, bạn có thể xem nhanh những băn khoăn thường gặp về độ bền, nệm phù hợp, giao lắp và hỗ trợ sau mua.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "?", title: "Giường điều chỉnh điện có bền không?", desc: "SmartFurni sẽ tư vấn rõ motor, khung, tải trọng phù hợp và chính sách bảo hành của từng mẫu để bạn yên tâm hơn trước khi chọn mua." },
        { icon: "?", title: "Mất điện thì giường có dùng được không?", desc: "Tùy từng cấu hình, tư vấn viên sẽ giải thích cơ chế an toàn và cách xử lý để bạn biết trước khi sử dụng." },
        { icon: "?", title: "Có dùng với nệm hiện tại được không?", desc: "SmartFurni sẽ kiểm tra loại nệm, độ dày, độ đàn hồi và kích thước hiện tại. Nếu chưa phù hợp, bạn sẽ được gợi ý phương án thay thế." },
        { icon: "?", title: "Có giao lắp tại nhà không?", desc: "Có. Thời gian, chi phí và phạm vi giao lắp sẽ được thông báo theo khu vực và cấu hình sản phẩm bạn chọn." },
        { icon: "?", title: "Sau khi mua cần hỗ trợ thì liên hệ ai?", desc: "Sau khi bàn giao, bạn sẽ được hướng dẫn kênh liên hệ để được hỗ trợ sử dụng, bảo hành hoặc bảo trì khi cần." },
      ],
      mediaLayout: "stack",
      media: [
        { label: "Hỏi nhanh", title: "Giải đáp trước khi đặt lịch", desc: "Các câu hỏi quan trọng được gom lại để bạn tự tin hơn trước khi liên hệ tư vấn.", type: "image", imageUrl: "/smartfurni-logo-transparent.png", linkUrl: "/contact#faq" },
      ],
    },
    b2b: {
      badge: { text: "GIẢI PHÁP CHO KHÔNG GIAN CAO CẤP", fontSize: 12, color: "#C9A84C", fontWeight: "medium" },
      title: { text: "Nâng tầm", fontSize: 36, color: "#F5EDD6", fontWeight: "light" },
      titleAccent: { text: "phòng ngủ và lưu trú", fontSize: 36, color: "#C9A84C", fontWeight: "light" },
      subtitle: { text: "Nếu bạn đang hoàn thiện biệt thự, căn hộ mẫu, khách sạn, homestay hoặc showroom nội thất, giường thông minh giúp tạo trải nghiệm nghỉ ngơi khác biệt và cao cấp hơn.", fontSize: 14, color: "#F5EDD6", fontWeight: "normal" },
      items: [
        { icon: "", title: "Cho biệt thự và căn hộ cao cấp", desc: "Tạo điểm nhấn tiện nghi trong phòng ngủ master, phòng ngủ phụ hoặc không gian nghỉ dưỡng riêng tư." },
        { icon: "", title: "Cho khách sạn và homestay", desc: "Mang lại trải nghiệm lưu trú khác biệt cho khách, đặc biệt ở các phòng cao cấp hoặc phòng suite." },
        { icon: "", title: "Cho showroom nội thất", desc: "Dễ kết hợp với nệm, sofa, tủ đầu giường và các giải pháp phòng ngủ thông minh." },
        { icon: "", title: "Cho dự án cần tư vấn riêng", desc: "SmartFurni có thể tư vấn theo số lượng, không gian lắp đặt, phong cách nội thất và yêu cầu vận hành thực tế." },
      ],
      mediaLayout: "split",
      media: [
        { label: "Không gian cao cấp", title: "Cho biệt thự, căn hộ và phòng mẫu", desc: "Tạo trải nghiệm phòng ngủ khác biệt cho những không gian cần sự tiện nghi và điểm nhấn hiện đại.", type: "image", imageUrl: "/gsf150-exploded.jpg", linkUrl: "/contact" },
        { label: "Dự án", title: "Tư vấn theo từng không gian", desc: "SmartFurni có thể trao đổi theo số lượng, phong cách nội thất và yêu cầu lắp đặt thực tế.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/contact", videoUrl: "#demo" },
      ],
    },
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
    homepageSections: saved.homepageSections
      ? {
          features: { ...defaultTheme.homepageSections.features, ...saved.homepageSections.features,
            items: saved.homepageSections.features?.items ?? defaultTheme.homepageSections.features.items },
          testimonials: { ...defaultTheme.homepageSections.testimonials, ...saved.homepageSections.testimonials },
          download: { ...defaultTheme.homepageSections.download, ...saved.homepageSections.download },
          problems: { ...defaultTheme.homepageSections.problems, ...saved.homepageSections.problems, items: saved.homepageSections.problems?.items ?? defaultTheme.homepageSections.problems.items },
          solutions: { ...defaultTheme.homepageSections.solutions, ...saved.homepageSections.solutions, items: saved.homepageSections.solutions?.items ?? defaultTheme.homepageSections.solutions.items },
          technology: { ...defaultTheme.homepageSections.technology, ...saved.homepageSections.technology, items: saved.homepageSections.technology?.items ?? defaultTheme.homepageSections.technology.items },
          postures: { ...defaultTheme.homepageSections.postures, ...saved.homepageSections.postures, items: saved.homepageSections.postures?.items ?? defaultTheme.homepageSections.postures.items },
          comparison: { ...defaultTheme.homepageSections.comparison, ...saved.homepageSections.comparison, items: saved.homepageSections.comparison?.items ?? defaultTheme.homepageSections.comparison.items },
          trust: { ...defaultTheme.homepageSections.trust, ...saved.homepageSections.trust, items: saved.homepageSections.trust?.items ?? defaultTheme.homepageSections.trust.items },
          process: { ...defaultTheme.homepageSections.process, ...saved.homepageSections.process, items: saved.homepageSections.process?.items ?? defaultTheme.homepageSections.process.items },
          b2b: { ...defaultTheme.homepageSections.b2b, ...saved.homepageSections.b2b, items: saved.homepageSections.b2b?.items ?? defaultTheme.homepageSections.b2b.items },
          faq: { ...defaultTheme.homepageSections.faq, ...saved.homepageSections.faq, items: saved.homepageSections.faq?.items ?? defaultTheme.homepageSections.faq.items },
        }
      : defaultTheme.homepageSections,
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
