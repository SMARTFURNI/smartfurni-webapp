// ─── Product Data Model ───────────────────────────────────────────────────────

import {
  dbLoadAll,
  dbLoadOne,
  dbSaveOne,
  dbSaveOneAndWait,
  dbDeleteOne,
  dbSaveAll,
  dbGetSetting,
  dbSaveSetting,
} from "./db-store";
import { registerDbLoader } from "./db-init";
import { applyElectricMattressPositioning, HOMEPAGE_MATTRESS_PRODUCTS } from "./homepage-mattress-products";
import { getAllOrders } from "./order-store";

export type ProductStatus = "active" | "discontinued" | "out_of_stock" | "coming_soon";
export type ProductCategory = "standard" | "premium" | "elite" | "accessory";
export type ProductFamily = "ergonomic_bed" | "electric_mattress" | "sofa_bed" | "accessory";

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Trắng", "Đen", "Xám"
  sku: string;
  stock: number;
  reserved: number; // đã đặt nhưng chưa giao
}

export interface ProductPurchaseOption {
  id: string;
  name: string;
  shortName: string;
  description: string;
  skuSuffix: string;
  /** Giá bán của cấu hình. Để trống khi cần khảo sát và báo giá riêng. */
  price?: number;
  originalPrice?: number;
  includes: string[];
}

export interface ProductReview {
  id: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  verified: boolean;
}

export interface MonthlySales {
  month: string; // "2026-01"
  label: string; // "Th 1"
  units: number;
  revenue: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  /** Dòng sản phẩm phục vụ điều hướng và SEO; tách biệt với phân khúc giá. */
  productFamily?: ProductFamily;
  status: ProductStatus;
  description: string;
  detailedDescription?: string; // Mô tả chi tiết dạng HTML/Markdown
  price: number; // VND
  originalPrice: number; // giá gốc trước khuyến mãi
  cost: number; // giá vốn
  coverImage?: string;
  images: string[];
  variants: ProductVariant[];
  /** Cấu hình mua hàng độc lập với màu sắc/kích thước. */
  purchaseOptions?: ProductPurchaseOption[];
  totalStock: number; // tổng tồn kho
  totalSold: number; // tổng đã bán
  totalRevenue: number;
  rating: number; // trung bình 1-5
  reviewCount: number;
  reviews: ProductReview[];
  features: string[];
  specs: Record<string, string>;
  monthlySales: MonthlySales[];
  createdAt: string;
  updatedAt: string;
  isFeatured: boolean;
  viewCount: number;
  imageBadge?: string; // Nhãn hiển thị trên ảnh sản phẩm (có thể chỉnh sửa/xóa từ admin)
}

export interface ProductDashboardStats {
  stats: {
    totalProducts: number;
    activeProducts: number;
    outOfStock: number;
    comingSoon: number;
    discontinued: number;
    totalStock: number;
    totalSold: number;
    totalRevenue: number;
    totalProfit: number;
    avgRating: number;
    lowStockCount: number; // tồn kho < 5
  };
  productsByCategory: { category: string; label: string; count: number; revenue: number; color: string }[];
  revenueByMonth: { month: string; label: string; revenue: number; units: number }[];
  topSellingProducts: { id: string; name: string; totalSold: number; totalRevenue: number; rating: number; category: ProductCategory; status: ProductStatus }[];
  lowStockProducts: { id: string; name: string; totalStock: number; status: ProductStatus }[];
  stockByCategory: { category: string; label: string; stock: number; color: string }[];
  recentActivity: { type: string; message: string; time: string; icon: string }[];
  products: Product[];
}

// ─── Persistence Layer (PostgreSQL) ─────────────────────────────────────────
function saveProduct(product: Product): void {
  dbSaveOne("products", product);
}
function deleteProductFromDb(id: string): void {
  dbDeleteOne("products", id);
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "SmartFurni Basic",
    slug: "smartfurni-basic",
    category: "standard",
    status: "active",
    description: "Giường điều khiển thông minh dòng cơ bản, phù hợp cho gia đình. Điều chỉnh độ cao đầu và chân giường qua remote hoặc app.",
    detailedDescription: `<h2>Giới thiệu SmartFurni Basic</h2>
<p>SmartFurni Basic là giải pháp giường thông minh lý tưởng cho những ai bắt đầu trải nghiệm công nghệ nội thất hiện đại. Với thiết kế tối giản, bền đẹp và dễ sử dụng, đây là lựa chọn được hàng nghìn gia đình Việt Nam tin dùng.</p>

<h3>Công nghệ động cơ tiên tiến</h3>
<p>Trang bị động cơ DC 24V thế hệ mới, SmartFurni Basic vận hành êm ái với tiếng ồn chỉ dưới 45dB — nhẹ hơn cả tiếng thả hơi. Bạn có thể điều chỉnh tư thế giường bất kỳ lúc nào mà không làm phiền người ngủ bên cạnh.</p>

<h3>Thiết kế khung thép cao cấp</h3>
<p>Khung giường được chế tạo từ thép không gỉ độ dày 2mm, chịu tải trọng lên đến 200kg. Bề mặt phủ sơn tĩnh điện chống gỉ, chống xước, giữ màu sắc bền lâu theo thời gian.</p>

<h3>Điều khiển thông minh đa nền tảng</h3>
<ul>
  <li><strong>Remote không dây</strong>: Thiết kế cầm tay tiện lợi, pin sạc USB-C, phạm vi 10m</li>
  <li><strong>Ứng dụng SmartFurni</strong>: Tương thích iOS 14+ và Android 8+, kết nối Bluetooth 5.0</li>
  <li><strong>Hẹn giờ tự động</strong>: Cài đặt lịch điều chỉnh tư thế theo giờ thức/ngủ</li>
  <li><strong>Chế độ cài sẵn</strong>: Lưu 3 tư thế yêu thích, gọi lại bằng 1 nút nhấn</li>
</ul>

<h3>An toàn và bảo hành</h3>
<p>Sản phẩm đạt chứng nhận CE, RoHS và tiêu chuẩn an toàn điện TCVN. Chế độ bảo hành 2 năm toàn diện, hỗ trợ kỹ thuật 24/7 qua hotline và app.</p>`,
    price: 23000000,
    originalPrice: 25000000,
    cost: 12000000,
    variants: [
      { id: "v1", name: "Trắng", sku: "SFB-WHT", stock: 12, reserved: 2 },
      { id: "v2", name: "Xám", sku: "SFB-GRY", stock: 8, reserved: 1 },
      { id: "v3", name: "Đen", sku: "SFB-BLK", stock: 5, reserved: 0 },
    ],
    totalStock: 25,
    totalSold: 48,
    totalRevenue: 1104000000,
    rating: 4.3,
    reviewCount: 24,
    reviews: [
      { id: "r1", userName: "Nguyễn Văn A", rating: 5, comment: "Sản phẩm tốt, giao hàng nhanh!", date: "2026-02-10T00:00:00Z", verified: true },
      { id: "r2", userName: "Trần Thị B", rating: 4, comment: "Chất lượng ổn, app dễ dùng.", date: "2026-01-25T00:00:00Z", verified: true },
    ],
    features: ["Điều chỉnh đầu giường 0-70°", "Điều chỉnh chân giường 0-45°", "Remote không dây", "App điều khiển iOS/Android", "Tải trọng 200kg"],
    specs: { "Kích thước": "1.6m x 2m", "Chất liệu khung": "Thép không gỉ", "Động cơ": "DC 24V", "Tiếng ồn": "< 45dB", "Bảo hành": "2 năm" },
    monthlySales: [
      { month: "2025-10", label: "Th 10", units: 5, revenue: 115000000 },
      { month: "2025-11", label: "Th 11", units: 7, revenue: 161000000 },
      { month: "2025-12", label: "Th 12", units: 9, revenue: 207000000 },
      { month: "2026-01", label: "Th 1", units: 11, revenue: 253000000 },
      { month: "2026-02", label: "Th 2", units: 10, revenue: 230000000 },
      { month: "2026-03", label: "Th 3", units: 6, revenue: 138000000 },
    ],
    createdAt: "2025-09-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
    isFeatured: false,
    viewCount: 3240,
    coverImage: "/uploads/products/smartfurni-bed-main.webp",
    images: ["/uploads/products/smartfurni-bed-main.webp"],
  },
  {
    id: "p2",
    name: "SmartFurni Pro",
    slug: "smartfurni-pro",
    category: "premium",
    status: "active",
    description: "Dòng cao cấp với tính năng massage tích hợp, đèn LED viền giường và kết nối Bluetooth. Lý tưởng cho phòng ngủ hiện đại.",
    detailedDescription: `<h2>SmartFurni Pro — Đỉnh cao của giấc ngủ thông minh</h2>
<p>SmartFurni Pro là sự kết hợp hoàn hảo giữa công nghệ hiện đại và thiết kế sang trọng. Đây là lựa chọn ưu tiên của những ai coi trọng chất lượng giấc ngủ và muốn trải nghiệm không gian nghỉ ngơi đẳng cấp 5 sao ngay tại nhà.</p>

<h3>Hệ thống massage 8 điểm chuyên sâu</h3>
<p>8 đầu massage rung tần số cao được phân bố chiến lược dọc theo lưng, eo và chân. 5 chế độ massage khác nhau từ nhẹ nhàng đến sâu, giúp giảm đau mỏi sau ngày dài làm việc.</p>

<h3>Đèn LED RGB viền giường</h3>
<p>Dải LED RGB 16 triệu màu được tích hợp dưới viền giường, tạo hiệu ứng ánh sáng ambient lung linh. Điều chỉnh màu sắc, độ sáng và hiệu ứng nhấp nháy theo âm nhạc qua app.</p>

<h3>Kết nối thông minh toàn diện</h3>
<ul>
  <li><strong>Bluetooth 5.0</strong>: Kết nối ổn định, phạm vi 15m, độ trễ thấp</li>
  <li><strong>Loa tich hợp 2x5W</strong>: Chơi nhạc, podcast hoặc tiếng ồn trắng giúp ngủ ngon</li>
  <li><strong>Sạc không dây 15W</strong>: 2 đế sạc Qi tích hợp hai bên đầu giường</li>
  <li><strong>Tích hợp Smart Home</strong>: Hỗ trợ Apple HomeKit, Google Home, Amazon Alexa</li>
</ul>

<h3>Khung hợp kim nhôm hàng không</h3>
<p>Khung được ép đùn từ hợp kim nhôm 6061-T6 — loại vật liệu dùng trong hàng không vũ trụ. Nhẹ hơn thép 40% nhưng cứng độ tương đương, chịu tải trọng 250kg.</p>`,
    price: 45000000,
    originalPrice: 48000000,
    cost: 22000000,
    variants: [
      { id: "v4", name: "Trắng Ngà", sku: "SFP-IVR", stock: 8, reserved: 3 },
      { id: "v5", name: "Đen Nhung", sku: "SFP-VLV", stock: 6, reserved: 2 },
      { id: "v6", name: "Xám Bạc", sku: "SFP-SLV", stock: 4, reserved: 1 },
    ],
    totalStock: 18,
    totalSold: 72,
    totalRevenue: 3240000000,
    rating: 4.7,
    reviewCount: 41,
    reviews: [
      { id: "r3", userName: "Phạm Thu H", rating: 5, comment: "Massage rất tốt, ngủ ngon hơn hẳn!", date: "2026-03-01T00:00:00Z", verified: true },
      { id: "r4", userName: "Lê Minh C", rating: 5, comment: "Đáng tiền, thiết kế đẹp.", date: "2026-02-20T00:00:00Z", verified: true },
    ],
    features: ["Tất cả tính năng Basic", "Massage 8 điểm", "Đèn LED RGB viền", "Bluetooth 5.0", "Loa tích hợp", "Sạc không dây USB-C"],
    specs: { "Kích thước": "1.6m x 2m / 1.8m x 2m", "Chất liệu khung": "Hợp kim nhôm", "Động cơ": "DC 24V Quiet", "Tiếng ồn": "< 35dB", "Bảo hành": "3 năm" },
    monthlySales: [
      { month: "2025-10", label: "Th 10", units: 8, revenue: 360000000 },
      { month: "2025-11", label: "Th 11", units: 12, revenue: 540000000 },
      { month: "2025-12", label: "Th 12", units: 15, revenue: 675000000 },
      { month: "2026-01", label: "Th 1", units: 14, revenue: 630000000 },
      { month: "2026-02", label: "Th 2", units: 13, revenue: 585000000 },
      { month: "2026-03", label: "Th 3", units: 10, revenue: 450000000 },
    ],
    createdAt: "2025-09-15T00:00:00Z",
    updatedAt: "2026-03-05T00:00:00Z",
    isFeatured: true,
    viewCount: 8750,
    coverImage: "/uploads/products/smartfurni-bed-main.webp",
    images: ["/uploads/products/smartfurni-bed-main.webp"],
  },
  {
    id: "p3",
    name: "SmartFurni Elite",
    slug: "smartfurni-elite",
    category: "elite",
    status: "active",
    description: "Đỉnh cao công nghệ giường thông minh. Tích hợp AI theo dõi giấc ngủ, điều chỉnh tự động theo tư thế và điều khiển giọng nói tiếng Việt.",
    detailedDescription: `<h2>SmartFurni Elite — Trải nghiệm ngủ đỉnh cao với AI</h2>
<p>SmartFurni Elite là sản phẩm flagship của SmartFurni, được thiết kế cho những ai đòi hỏi sự toàn hảo trong từng chi tiết. Với công nghệ AI tiên tiến, Elite không chỉ là một chiếc giường — đó là trợ lý sức khỏe cá nhân của bạn.</p>

<h3>AI Sleep Intelligence — Trí tuệ nhân tạo theo dõi giấc ngủ</h3>
<p>Cảm biến sinh trắc học tích hợp theo dõi nhịp tim, nhịp thở và chuyển động trong suốt đêm. AI phân tích dữ liệu theo thời gian thực, tự động điều chỉnh tư thế giường để tối ưu hóa chất lượng giấc ngủ.</p>

<h3>Điều khiển giọng nói tiếng Việt</h3>
<p>Trợ lý giọng nói SmartFurni AI hiểu tiếng Việt tự nhiên. Chỉ cần nói <em>"Đầu lên 30 độ"</em> hay <em>"Bật massage lưng"</em> — giường sẽ thực hiện ngay lập tức.</p>

<h3>Báo cáo sức khỏe giấc ngủ chi tiết</h3>
<ul>
  <li><strong>Phân tích chu kỳ ngủ</strong>: Theo dõi REM, ngủ sâu, ngủ nẹ theo từng đêm</li>
  <li><strong>Báo cáo tuần/tháng</strong>: Xu hướng giấc ngủ, điểm số sức khỏe, lời khuyên cá nhân</li>
  <li><strong>Cảnh báo sức khỏe</strong>: Phát hiện ngủ ngáy, ngưng thở khi ngủ (Sleep Apnea)</li>
  <li><strong>Tích hợp Apple Health / Google Fit</strong>: Đồng bộ dữ liệu sức khỏe toàn diện</li>
</ul>

<h3>Khung Titan hợp kim — Bền vững vĩnh cửu</h3>
<p>Khung giường Elite sử dụng hợp kim Titan Grade 5 — loại vật liệu có tỷ lệ độ bền/trọng lượng cao nhất hiện nay. Chịu tải trọng 300kg, bảo hành 5 năm toàn diện.</p>`,
    price: 65000000,
    originalPrice: 70000000,
    cost: 32000000,
    variants: [
      { id: "v7", name: "Trắng Platinum", sku: "SFE-PLT", stock: 4, reserved: 2 },
      { id: "v8", name: "Đen Carbon", sku: "SFE-CBN", stock: 3, reserved: 1 },
    ],
    totalStock: 7,
    totalSold: 35,
    totalRevenue: 2275000000,
    rating: 4.9,
    reviewCount: 18,
    reviews: [
      { id: "r5", userName: "Võ Thành L", rating: 5, comment: "AI theo dõi giấc ngủ rất chính xác, điều chỉnh tự động quá tiện!", date: "2026-02-28T00:00:00Z", verified: true },
    ],
    features: ["Tất cả tính năng Pro", "AI Sleep Tracking", "Điều chỉnh tự động theo tư thế", "Điều khiển giọng nói tiếng Việt", "Tích hợp Google Home / Apple HomeKit", "Báo cáo giấc ngủ hàng tuần"],
    specs: { "Kích thước": "1.8m x 2m", "Chất liệu khung": "Titan hợp kim", "Động cơ": "DC 24V Ultra Quiet", "Tiếng ồn": "< 25dB", "Bảo hành": "5 năm" },
    monthlySales: [
      { month: "2025-10", label: "Th 10", units: 3, revenue: 195000000 },
      { month: "2025-11", label: "Th 11", units: 5, revenue: 325000000 },
      { month: "2025-12", label: "Th 12", units: 7, revenue: 455000000 },
      { month: "2026-01", label: "Th 1", units: 8, revenue: 520000000 },
      { month: "2026-02", label: "Th 2", units: 7, revenue: 455000000 },
      { month: "2026-03", label: "Th 3", units: 5, revenue: 325000000 },
    ],
    createdAt: "2025-10-01T00:00:00Z",
    updatedAt: "2026-03-07T00:00:00Z",
    isFeatured: true,
    viewCount: 5120,
    coverImage: "/uploads/products/smartfurni-bed-main.webp",
    images: ["/uploads/products/smartfurni-bed-main.webp"],
  },
  {
    id: "p4",
    name: "SmartFurni Pro 2026",
    slug: "smartfurni-pro-2026",
    category: "premium",
    status: "coming_soon",
    description: "Phiên bản nâng cấp 2026 với chip xử lý mới, pin dự phòng 8 giờ và màn hình cảm ứng tích hợp trên đầu giường.",
    price: 52000000,
    originalPrice: 52000000,
    cost: 25000000,
    variants: [
      { id: "v9", name: "Trắng", sku: "SFP26-WHT", stock: 0, reserved: 15 },
      { id: "v10", name: "Đen", sku: "SFP26-BLK", stock: 0, reserved: 12 },
    ],
    totalStock: 0,
    totalSold: 0,
    totalRevenue: 0,
    rating: 0,
    reviewCount: 0,
    reviews: [],
    features: ["Chip AI mới thế hệ 3", "Pin dự phòng 8 giờ", "Màn hình cảm ứng 7 inch", "5G connectivity", "Tự động cập nhật firmware OTA"],
    specs: { "Kích thước": "1.6m x 2m / 1.8m x 2m", "Chip": "SmartFurni AI Gen3", "Pin": "Li-Ion 20000mAh", "Bảo hành": "3 năm" },
    monthlySales: [],
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-03-08T00:00:00Z",
    isFeatured: true,
    viewCount: 12400,
    coverImage: "/uploads/products/smartfurni-bed-main.webp",
    images: ["/uploads/products/smartfurni-bed-main.webp"],
  },
  {
    id: "p5",
    name: "Remote SmartFurni",
    slug: "remote-smartfurni",
    category: "accessory",
    status: "active",
    description: "Remote điều khiển không dây thay thế, tương thích tất cả dòng SmartFurni. Pin AA, phạm vi 10m.",
    price: 450000,
    originalPrice: 500000,
    cost: 150000,
    variants: [
      { id: "v11", name: "Trắng", sku: "RMT-WHT", stock: 45, reserved: 3 },
      { id: "v12", name: "Đen", sku: "RMT-BLK", stock: 38, reserved: 2 },
    ],
    totalStock: 83,
    totalSold: 120,
    totalRevenue: 54000000,
    rating: 4.5,
    reviewCount: 32,
    reviews: [],
    features: ["Không dây RF 433MHz", "Phạm vi 10m", "Pin AA x2", "Chống nước IPX4"],
    specs: { "Kích thước": "15 x 4 x 2 cm", "Pin": "AA x2", "Phạm vi": "10m", "Bảo hành": "1 năm" },
    monthlySales: [
      { month: "2025-10", label: "Th 10", units: 15, revenue: 6750000 },
      { month: "2025-11", label: "Th 11", units: 22, revenue: 9900000 },
      { month: "2025-12", label: "Th 12", units: 28, revenue: 12600000 },
      { month: "2026-01", label: "Th 1", units: 25, revenue: 11250000 },
      { month: "2026-02", label: "Th 2", units: 20, revenue: 9000000 },
      { month: "2026-03", label: "Th 3", units: 10, revenue: 4500000 },
    ],
    createdAt: "2025-09-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
    isFeatured: false,
    viewCount: 1850,
    images: [],
  },
  {
    id: "p6",
    name: "Nệm SmartFurni Memory Foam",
    slug: "nem-smartfurni-memory-foam",
    category: "accessory",
    status: "active",
    description: "Nệm memory foam cao cấp thiết kế riêng cho giường SmartFurni, linh hoạt khi điều chỉnh góc độ, không bị nhăn hay xô lệch.",
    price: 8500000,
    originalPrice: 9500000,
    cost: 3500000,
    variants: [
      { id: "v13", name: "1.6m x 2m", sku: "MTR-160", stock: 10, reserved: 1 },
      { id: "v14", name: "1.8m x 2m", sku: "MTR-180", stock: 7, reserved: 2 },
    ],
    totalStock: 17,
    totalSold: 55,
    totalRevenue: 467500000,
    rating: 4.6,
    reviewCount: 28,
    reviews: [],
    features: ["Memory foam 3 lớp", "Chống khuẩn nano silver", "Linh hoạt 180°", "Độ dày 20cm", "Vỏ bọc có thể giặt máy"],
    specs: { "Độ dày": "20cm", "Chất liệu": "Memory foam + Latex", "Mật độ": "40kg/m³", "Bảo hành": "2 năm" },
    monthlySales: [
      { month: "2025-10", label: "Th 10", units: 6, revenue: 51000000 },
      { month: "2025-11", label: "Th 11", units: 9, revenue: 76500000 },
      { month: "2025-12", label: "Th 12", units: 12, revenue: 102000000 },
      { month: "2026-01", label: "Th 1", units: 11, revenue: 93500000 },
      { month: "2026-02", label: "Th 2", units: 10, revenue: 85000000 },
      { month: "2026-03", label: "Th 3", units: 7, revenue: 59500000 },
    ],
    createdAt: "2025-10-15T00:00:00Z",
    updatedAt: "2026-02-15T00:00:00Z",
    isFeatured: false,
    viewCount: 2640,
    images: [],
  },
  {
    id: "p7",
    name: "SmartFurni Basic V1",
    slug: "smartfurni-basic-v1",
    category: "standard",
    status: "discontinued",
    description: "Phiên bản đầu tiên của SmartFurni Basic, đã ngừng sản xuất. Vẫn hỗ trợ bảo hành và phụ tùng thay thế.",
    price: 18000000,
    originalPrice: 20000000,
    cost: 9000000,
    variants: [
      { id: "v15", name: "Trắng", sku: "SFB1-WHT", stock: 2, reserved: 0 },
    ],
    totalStock: 2,
    totalSold: 30,
    totalRevenue: 540000000,
    rating: 4.0,
    reviewCount: 15,
    reviews: [],
    features: ["Điều chỉnh đầu giường 0-60°", "Remote không dây", "Tải trọng 180kg"],
    specs: { "Kích thước": "1.6m x 2m", "Bảo hành": "2 năm (phụ tùng còn)" },
    monthlySales: [
      { month: "2025-10", label: "Th 10", units: 2, revenue: 36000000 },
      { month: "2025-11", label: "Th 11", units: 1, revenue: 18000000 },
      { month: "2025-12", label: "Th 12", units: 0, revenue: 0 },
      { month: "2026-01", label: "Th 1", units: 0, revenue: 0 },
      { month: "2026-02", label: "Th 2", units: 0, revenue: 0 },
      { month: "2026-03", label: "Th 3", units: 0, revenue: 0 },
    ],
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2025-12-01T00:00:00Z",
    isFeatured: false,
    viewCount: 890,
    images: [],
  },
  {
    id: "p8",
    name: "Bộ Phụ Kiện SmartFurni",
    slug: "bo-phu-kien-smartfurni",
    category: "accessory",
    status: "out_of_stock",
    description: "Bộ phụ kiện đầy đủ gồm: túi đựng remote, miếng dán chống trơn, cáp sạc dự phòng và hướng dẫn sử dụng bản in.",
    price: 250000,
    originalPrice: 300000,
    cost: 80000,
    variants: [
      { id: "v16", name: "Tiêu chuẩn", sku: "ACC-STD", stock: 0, reserved: 0 },
    ],
    totalStock: 0,
    totalSold: 85,
    totalRevenue: 21250000,
    rating: 4.2,
    reviewCount: 20,
    reviews: [],
    features: ["Túi đựng remote da PU", "Miếng dán chống trơn x4", "Cáp USB-C dự phòng", "Hướng dẫn sử dụng in màu"],
    specs: { "Số lượng": "4 món", "Bảo hành": "6 tháng" },
    monthlySales: [
      { month: "2025-10", label: "Th 10", units: 12, revenue: 3000000 },
      { month: "2025-11", label: "Th 11", units: 18, revenue: 4500000 },
      { month: "2025-12", label: "Th 12", units: 20, revenue: 5000000 },
      { month: "2026-01", label: "Th 1", units: 15, revenue: 3750000 },
      { month: "2026-02", label: "Th 2", units: 10, revenue: 2500000 },
      { month: "2026-03", label: "Th 3", units: 10, revenue: 2500000 },
    ],
    createdAt: "2025-09-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
    isFeatured: false,
    viewCount: 1120,
    images: [],
  },
];

const ERGONOMIC_BED_POSITIONING: Record<string, { name: string; slug: string; model: string }> = {
  p1: {
    name: "Giường Công Thái Học Điều Chỉnh Điện SmartFurni Basic",
    slug: "giuong-cong-thai-hoc-dieu-chinh-dien-smartfurni-basic",
    model: "Basic",
  },
  p3: {
    name: "Giường Công Thái Học Điều Chỉnh Điện SmartFurni Elite",
    slug: "giuong-cong-thai-hoc-dieu-chinh-dien-smartfurni-elite",
    model: "Elite",
  },
  p4: {
    name: "Giường Công Thái Học Điều Chỉnh Điện SmartFurni Pro 2026",
    slug: "giuong-cong-thai-hoc-dieu-chinh-dien-smartfurni-pro-2026",
    model: "Pro 2026",
  },
};

const LEGACY_ERGONOMIC_BED_SLUGS: Record<string, string> = {
  "smartfurni-basic": ERGONOMIC_BED_POSITIONING.p1.slug,
  "smartfurni-elite": ERGONOMIC_BED_POSITIONING.p3.slug,
  "smartfurni-pro-2026": ERGONOMIC_BED_POSITIONING.p4.slug,
};

export function getCanonicalErgonomicBedSlug(slug: string): string | null {
  return LEGACY_ERGONOMIC_BED_SLUGS[slug] || null;
}

function applyErgonomicBedPositioning(product: Product): Product {
  const positioning = ERGONOMIC_BED_POSITIONING[product.id];
  if (!positioning) return product;

  const purchaseOptions: ProductPurchaseOption[] = [
    {
      id: `${product.id}-frame`,
      name: "Hệ khung nâng hạ",
      shortName: "Hệ khung",
      description: "Gồm hệ khung thép và động cơ điều chỉnh điện; không bao gồm nệm và vỏ giường trang trí.",
      skuSuffix: "FRM",
      price: product.price,
      originalPrice: product.originalPrice,
      includes: ["Khung nâng hạ tích hợp động cơ", "Remote điều khiển", "Bộ nguồn và phụ kiện lắp đặt"],
    },
    {
      id: `${product.id}-complete`,
      name: "Bộ giường trọn bộ",
      shortName: "Trọn bộ",
      description: "Gồm hệ khung nâng hạ, nệm tương thích và vỏ giường hoàn thiện theo kích thước, vật liệu lựa chọn.",
      skuSuffix: "SET",
      includes: ["Khung nâng hạ tích hợp động cơ", "Nệm tương thích", "Vỏ giường hoàn thiện", "Giao hàng và lắp đặt theo xác nhận"],
    },
  ];

  const detailIntro = `<h2>${positioning.name}</h2>
<p>Dòng ${positioning.model} có thể lựa chọn theo hai cấu hình: <strong>Hệ khung nâng hạ</strong> dành cho khách hàng muốn tận dụng nệm và vỏ giường phù hợp, hoặc <strong>Bộ giường trọn bộ</strong> gồm khung nâng hạ, nệm tương thích và phần hoàn thiện theo cấu hình được xác nhận.</p>
<h3>Chọn đúng cấu hình sản phẩm</h3>
<ul>
  <li><strong>Hệ khung nâng hạ:</strong> gồm khung, động cơ, remote, bộ nguồn và phụ kiện lắp đặt; không gồm nệm và vỏ giường trang trí.</li>
  <li><strong>Bộ giường trọn bộ:</strong> gồm hệ khung nâng hạ, nệm tương thích và vỏ giường hoàn thiện. Giá được báo theo kích thước và vật liệu lựa chọn.</li>
</ul>`;
  const existingDetail = product.detailedDescription || "";
  const normalizedDetail = existingDetail.includes("Chọn đúng cấu hình sản phẩm")
    ? existingDetail
    : `${detailIntro}\n${existingDetail.replace(/^<h2>[\s\S]*?<\/h2>/, "")}`;

  return {
    ...product,
    name: positioning.name,
    slug: positioning.slug,
    productFamily: "ergonomic_bed",
    description: `Giường công thái học điều chỉnh điện SmartFurni ${positioning.model} nâng đầu, nâng chân bằng động cơ. Lựa chọn hệ khung nâng hạ hoặc bộ giường trọn bộ theo không gian thực tế.`,
    detailedDescription: normalizedDetail,
    purchaseOptions,
    specs: {
      ...product.specs,
      "Cấu hình mua hàng": "Hệ khung nâng hạ / Bộ giường trọn bộ",
      "Hệ khung gồm": "Khung, động cơ, remote, bộ nguồn và phụ kiện lắp đặt",
      "Trọn bộ gồm": "Hệ khung, nệm tương thích và vỏ giường hoàn thiện",
    },
    updatedAt: new Date().toISOString(),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// In-memory store — populated from PostgreSQL on first request
const INITIAL_PRODUCTS: Product[] = [...DEFAULT_PRODUCTS.map(applyErgonomicBedPositioning), ...HOMEPAGE_MATTRESS_PRODUCTS];
const ELECTRIC_MATTRESS_SEED_KEY = "electric_mattress_products_seeded_v1";
const ELECTRIC_MATTRESS_POSITIONING_KEY = "electric_mattress_positioning_v2";
const ELECTRIC_MATTRESS_NAMING_KEY = "electric_mattress_naming_v3";
const ELECTRIC_MATTRESS_SLUG_KEY = "electric_mattress_slug_v4";
const ERGONOMIC_BED_NAMING_KEY = "ergonomic_bed_naming_v5";

let products: Product[] = [...INITIAL_PRODUCTS];

// Register DB loader: runs once at server startup to hydrate memory from PostgreSQL
registerDbLoader(async () => {
  const rows = await dbLoadAll<Product>("products");
  if (rows && rows.length > 0) {
    const ergonomicBedNamingCompleted = await dbGetSetting<boolean>(ERGONOMIC_BED_NAMING_KEY);
    const slugMigrationCompleted = await dbGetSetting<boolean>(
      ELECTRIC_MATTRESS_SLUG_KEY,
    );
    const mattressNormalizedRows = slugMigrationCompleted
      ? rows
      : rows.map(applyElectricMattressPositioning);
    const normalizedRows = ergonomicBedNamingCompleted
      ? mattressNormalizedRows
      : mattressNormalizedRows.map(applyErgonomicBedPositioning);
    const mattressSeedCompleted = await dbGetSetting<boolean>(
      ELECTRIC_MATTRESS_SEED_KEY,
    );
    const missingMattressProducts = mattressSeedCompleted
      ? []
      : HOMEPAGE_MATTRESS_PRODUCTS.filter(
          (mattress) =>
            !normalizedRows.some(
              (product) =>
                product.id === mattress.id || product.slug === mattress.slug,
            ),
        );
    products = [...normalizedRows, ...missingMattressProducts];
    if (!slugMigrationCompleted) {
      const normalizedMattressProducts = normalizedRows.filter((product) =>
        HOMEPAGE_MATTRESS_PRODUCTS.some((seed) => seed.slug === product.slug),
      );
      await Promise.all(
        normalizedMattressProducts.map((product) =>
          dbSaveOneAndWait("products", product),
        ),
      );
      await dbSaveSetting(ELECTRIC_MATTRESS_POSITIONING_KEY, true);
      await dbSaveSetting(ELECTRIC_MATTRESS_NAMING_KEY, true);
      await dbSaveSetting(ELECTRIC_MATTRESS_SLUG_KEY, true);
      console.log(
        `[product-store] Updated positioning for ${normalizedMattressProducts.length} electric mattress products`,
      );
    }
    if (!ergonomicBedNamingCompleted) {
      const normalizedBedProducts = normalizedRows.filter((product) => Boolean(ERGONOMIC_BED_POSITIONING[product.id]));
      await Promise.all(
        normalizedBedProducts.map((product) => dbSaveOneAndWait("products", product)),
      );
      await dbSaveSetting(ERGONOMIC_BED_NAMING_KEY, true);
      console.log(`[product-store] Updated naming and purchase options for ${normalizedBedProducts.length} ergonomic bed products`);
    }
    if (missingMattressProducts.length > 0) {
      await Promise.all(
        missingMattressProducts.map((product) =>
          dbSaveOneAndWait("products", product),
        ),
      );
      console.log(
        `[product-store] Added ${missingMattressProducts.length} electric mattress products`,
      );
    }
    if (!mattressSeedCompleted) {
      await dbSaveSetting(ELECTRIC_MATTRESS_SEED_KEY, true);
    }
    console.log(`[product-store] Loaded ${products.length} products from database`);
  } else if (rows !== null) {
    // DB is empty — seed with default data
    console.log("[product-store] Seeding database with default products...");
    dbSaveAll("products", INITIAL_PRODUCTS);
    await dbSaveSetting(ELECTRIC_MATTRESS_SEED_KEY, true);
    await dbSaveSetting(ELECTRIC_MATTRESS_POSITIONING_KEY, true);
    await dbSaveSetting(ELECTRIC_MATTRESS_NAMING_KEY, true);
    await dbSaveSetting(ELECTRIC_MATTRESS_SLUG_KEY, true);
    await dbSaveSetting(ERGONOMIC_BED_NAMING_KEY, true);
  }
});

function generateId(): string {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function createProduct(data: {
  name: string;
  category: ProductCategory;
  productFamily?: ProductFamily;
  status: ProductStatus;
  description: string;
  detailedDescription?: string;
  price: number;
  originalPrice: number;
  cost: number;
  coverImage?: string;
  images?: string[];
  imageBadge?: string;
  features: string[];
  specs: Record<string, string>;
  variants: Omit<ProductVariant, "id" | "reserved">[];
  purchaseOptions?: ProductPurchaseOption[];
  isFeatured: boolean;
}): Product {
  const slug = generateSlug(data.name);
  const totalStock = data.variants.reduce((s, v) => s + v.stock, 0);
  const newProduct: Product = {
    id: generateId(),
    name: data.name,
    slug,
    category: data.category,
    productFamily: data.productFamily,
    status: data.status,
    description: data.description,
    detailedDescription: data.detailedDescription,
    price: data.price,
    originalPrice: data.originalPrice,
    cost: data.cost,
    coverImage: data.coverImage,
    images: data.images?.length ? data.images : data.coverImage ? [data.coverImage] : [],
    variants: data.variants.map((v) => ({ ...v, id: generateId(), reserved: 0 })),
    purchaseOptions: data.purchaseOptions,
    totalStock,
    totalSold: 0,
    totalRevenue: 0,
    rating: 0,
    reviewCount: 0,
    reviews: [],
    features: data.features,
    specs: data.specs,
    monthlySales: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isFeatured: data.isFeatured,
    imageBadge: data.imageBadge,
    viewCount: 0,
  };
  products.unshift(newProduct);
  saveProduct(newProduct);
  return newProduct;
}

export function getAllProducts(): Product[] {
  return [...products].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export async function getProductBySlugFresh(slug: string): Promise<Product | undefined> {
  const cached = getProductBySlug(slug);
  if (!cached) return undefined;

  const stored = await dbLoadOne<Product>("products", cached.id);
  if (!stored) return cached;

  const idx = products.findIndex((product) => product.id === stored.id);
  if (idx >= 0) products[idx] = stored;
  return stored;
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const sameCategory = products.filter(
    (p) => p.id !== product.id && p.status !== "discontinued" && p.category === product.category
  );
  const otherCategory = products.filter(
    (p) => p.id !== product.id && p.status !== "discontinued" && p.category !== product.category
  );
  return [...sameCategory, ...otherCategory].slice(0, limit);
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const merged = { ...products[idx], ...updates, updatedAt: new Date().toISOString() };
  // Recalculate totalStock from variants if variants were updated
  if (updates.variants) {
    merged.totalStock = merged.variants.reduce((s: number, v: ProductVariant) => s + v.stock, 0);
  }
  // Regenerate slug if name changed
  if (updates.name && updates.name !== products[idx].name) {
    merged.slug = updates.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
  products[idx] = merged;
  await dbSaveOneAndWait("products", merged);
  return products[idx];
}

export function deleteProduct(id: string): boolean {
  const before = products.length;
  products = products.filter((p) => p.id !== id);
  deleteProductFromDb(id);
  return products.length < before;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export function getProductDashboardStats(): ProductDashboardStats {
  const activeProducts = products.filter((p) => p.status === "active");
  const paidOrders = getAllOrders().filter((order) => order.paymentStatus === "paid" && order.status !== "cancelled" && order.status !== "refunded");
  const salesByProduct = new Map<string, { units: number; revenue: number; profit: number }>();
  for (const order of paidOrders) {
    for (const item of order.items) {
      const product = products.find((candidate) => candidate.id === item.productId);
      const current = salesByProduct.get(item.productId) || { units: 0, revenue: 0, profit: 0 };
      current.units += item.quantity;
      current.revenue += item.totalPrice;
      current.profit += product ? (item.unitPrice - product.cost) * item.quantity : 0;
      salesByProduct.set(item.productId, current);
    }
  }
  const totalRevenue = [...salesByProduct.values()].reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = [...salesByProduct.values()].reduce((sum, item) => sum + item.profit, 0);
  const totalSold = [...salesByProduct.values()].reduce((sum, item) => sum + item.units, 0);
  const totalStock = products.reduce((s, p) => s + p.totalStock, 0);
  const ratedProducts = products.filter((p) => p.reviewCount > 0);
  const avgRating = ratedProducts.length > 0
    ? ratedProducts.reduce((s, p) => s + p.rating, 0) / ratedProducts.length
    : 0;

  // By category
  const catConfig: Record<ProductCategory, { label: string; color: string }> = {
    standard: { label: "Standard", color: "#3B82F6" },
    premium: { label: "Premium", color: "#C9A84C" },
    elite: { label: "Elite", color: "#F472B6" },
    accessory: { label: "Phụ kiện", color: "#22C55E" },
  };
  const catMap: Record<string, { count: number; revenue: number }> = {};
  products.forEach((p) => {
    if (!catMap[p.category]) catMap[p.category] = { count: 0, revenue: 0 };
    catMap[p.category].count++;
    catMap[p.category].revenue += salesByProduct.get(p.id)?.revenue || 0;
  });
  const productsByCategory = Object.entries(catMap).map(([cat, v]) => ({
    category: cat,
    label: catConfig[cat as ProductCategory]?.label || cat,
    count: v.count,
    revenue: v.revenue,
    color: catConfig[cat as ProductCategory]?.color || "#6B7280",
  }));

  // Revenue by month (aggregate all products, last 6 months)
  const monthMap: Record<string, { revenue: number; units: number; label: string }> = {};
  paidOrders.forEach((order) => {
    const date = new Date(order.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[month]) monthMap[month] = { revenue: 0, units: 0, label: `Th ${date.getMonth() + 1}` };
    monthMap[month].revenue += order.total;
    monthMap[month].units += order.items.reduce((sum, item) => sum + item.quantity, 0);
  });
  const revenueByMonth = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, v]) => ({ month, label: v.label, revenue: v.revenue, units: v.units }));

  // Top selling
  const topSellingProducts = [...products]
    .filter((p) => (salesByProduct.get(p.id)?.units || 0) > 0)
    .sort((a, b) => (salesByProduct.get(b.id)?.revenue || 0) - (salesByProduct.get(a.id)?.revenue || 0))
    .slice(0, 5)
    .map((p) => ({
      id: p.id, name: p.name, totalSold: salesByProduct.get(p.id)?.units || 0, totalRevenue: salesByProduct.get(p.id)?.revenue || 0,
      rating: p.rating, category: p.category, status: p.status,
    }));

  // Low stock
  const lowStockProducts = products
    .filter((p) => p.totalStock < 10 && p.status !== "discontinued" && p.status !== "coming_soon")
    .sort((a, b) => a.totalStock - b.totalStock)
    .map((p) => ({ id: p.id, name: p.name, totalStock: p.totalStock, status: p.status }));

  // Stock by category
  const stockCatMap: Record<string, number> = {};
  products.forEach((p) => {
    stockCatMap[p.category] = (stockCatMap[p.category] || 0) + p.totalStock;
  });
  const stockByCategory = Object.entries(stockCatMap).map(([cat, stock]) => ({
    category: cat,
    label: catConfig[cat as ProductCategory]?.label || cat,
    stock,
    color: catConfig[cat as ProductCategory]?.color || "#6B7280",
  }));

  // Recent activity
  const recentActivity = [
    ...paidOrders.slice(0, 5).map((order) => ({ type: "order", message: `${order.orderNumber} đã thanh toán — ${order.items.length} dòng sản phẩm`, time: new Date(order.updatedAt).toLocaleDateString("vi-VN"), icon: "🛒" })),
    ...lowStockProducts.slice(0, 3).map((product) => ({ type: "stock", message: `${product.name} còn ${product.totalStock} sản phẩm`, time: "Cần kiểm tra tồn kho", icon: "⚠️" })),
  ];

  return {
    stats: {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      outOfStock: products.filter((p) => p.status === "out_of_stock").length,
      comingSoon: products.filter((p) => p.status === "coming_soon").length,
      discontinued: products.filter((p) => p.status === "discontinued").length,
      totalStock,
      totalSold,
      totalRevenue,
      totalProfit,
      avgRating: Math.round(avgRating * 10) / 10,
      lowStockCount: lowStockProducts.length,
    },
    productsByCategory,
    revenueByMonth,
    topSellingProducts,
    lowStockProducts,
    stockByCategory,
    recentActivity,
    products: getAllProducts(),
  };
}
