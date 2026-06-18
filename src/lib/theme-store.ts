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
      mediaLayout: "split",
      media: [
        { label: "Tình huống", title: "Đọc sách, xem TV thoải mái hơn", desc: "Nâng phần đầu giường đúng góc, hạn chế kê nhiều gối và giữ phòng ngủ gọn gàng.", type: "image", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/products" },
        { label: "Video demo", title: "Thấy rõ chuyển động trước khi mua", desc: "Xem cách giường nâng đầu, nâng chân và trở về tư thế nằm chỉ bằng một thao tác.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
      ],
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
      mediaLayout: "rail",
      media: [
        { label: "Gợi ý chọn", title: "Bắt đầu từ nhu cầu của gia đình", desc: "Chọn theo người dùng, không gian và cách sử dụng để tìm mẫu phù hợp nhanh hơn.", type: "image", imageUrl: "/gsf150-wood-frame.jpg", linkUrl: "/products" },
        { label: "Tư vấn", title: "Cần mẫu nào, hỏi ngay mẫu đó", desc: "Đặt lịch trải nghiệm hoặc nhận tư vấn theo kích thước phòng, loại nệm và ngân sách.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/contact", videoUrl: "#demo" },
      ],
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
      mediaLayout: "split",
      media: [
        { label: "Bên trong", title: "Motor, khung và cơ cấu nâng", desc: "Các chi tiết quan trọng được trình bày rõ để khách hiểu vì sao sản phẩm vận hành ổn định.", type: "image", imageUrl: "/gsf150-exploded.jpg", linkUrl: "/products/gsf150" },
        { label: "Demo", title: "Vận hành êm trong từng chuyển động", desc: "Video cận cảnh remote, motor và các tư thế cài sẵn giúp khách yên tâm hơn.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
      ],
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
      mediaLayout: "mosaic",
      media: [
        { label: "Tư thế", title: "Từ nằm nghỉ đến ngồi thư giãn", desc: "Một khung hình trực quan giúp khách hiểu ngay giường thay đổi tư thế như thế nào.", type: "image", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/products" },
        { label: "Video", title: "Chuyển tư thế thực tế", desc: "Clip ngắn mô tả các tư thế thường dùng: đọc sách, xem TV, nâng chân và nghỉ ngơi.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
      ],
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
      mediaLayout: "split",
      media: [
        { label: "So sánh", title: "Giường thường hay giường thông minh?", desc: "Bảng đối chiếu ngắn giúp khách thấy khác biệt trong thẩm mỹ, tư thế và tiện ích hằng ngày.", type: "image", imageUrl: "/gsf150-standalone.jpg", linkUrl: "/products" },
      ],
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
      mediaLayout: "rail",
      media: [
        { label: "Quy trình", title: "Từ tư vấn đến bảo hành", desc: "Mỗi bước mua hàng được trình bày rõ để khách biết cần chuẩn bị gì và nhận được gì.", type: "image", imageUrl: "/gsf150-wood-frame.jpg", linkUrl: "/contact" },
        { label: "Bàn giao", title: "Hướng dẫn sử dụng sau lắp đặt", desc: "Kỹ thuật viên kiểm tra giường, hướng dẫn remote và các lưu ý sử dụng tại nhà.", type: "video", imageUrl: "/gsf150-standalone.jpg", linkUrl: "#demo", videoUrl: "#demo" },
      ],
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
      mediaLayout: "mosaic",
      media: [
        { label: "Showroom", title: "Trải nghiệm sản phẩm thật", desc: "Khách có thể xem mẫu, thử tư thế và trao đổi trực tiếp trước khi quyết định.", type: "image", imageUrl: "/gsf150-standalone.jpg", linkUrl: "/contact" },
        { label: "Thực tế", title: "Video bàn giao tại nhà", desc: "Quy trình giao lắp, hướng dẫn sử dụng và kiểm tra vận hành được thể hiện rõ ràng.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "#demo", videoUrl: "#demo" },
      ],
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
      mediaLayout: "stack",
      media: [
        { label: "Hỏi nhanh", title: "Giải đáp trước khi đặt lịch", desc: "Các câu hỏi quan trọng được gom lại để khách tự tin hơn trước khi liên hệ tư vấn.", type: "image", imageUrl: "/smartfurni-logo-transparent.png", linkUrl: "/contact#faq" },
      ],
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
      mediaLayout: "split",
      media: [
        { label: "Đối tác", title: "Bộ trưng bày cho showroom", desc: "Đại lý có catalogue, hình ảnh, video và nội dung tư vấn để bắt đầu bán hàng nhanh.", type: "image", imageUrl: "/gsf150-exploded.jpg", linkUrl: "/lp/doi-tac-showroom-nem" },
        { label: "Đào tạo", title: "Training sản phẩm và lắp đặt", desc: "Tài liệu bán hàng, hướng dẫn tư vấn và quy trình kỹ thuật được chuẩn hóa cho đội ngũ.", type: "video", imageUrl: "/uploads/products/smartfurni-bed-main.webp", linkUrl: "/lp/doi-tac-showroom-nem#dang-ky", videoUrl: "#demo" },
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
