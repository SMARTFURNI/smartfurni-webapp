import type { Product, ProductFamily } from "./product-store";

export interface ProductFamilyDefinition {
  key: ProductFamily;
  slug: string;
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  intro: string;
  selectionGuide: string;
  seoImage: string;
  benefits: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export const PRODUCT_FAMILIES: ProductFamilyDefinition[] = [
  {
    key: "ergonomic_bed",
    slug: "giuong-cong-thai-hoc-dieu-chinh-dien",
    label: "Giường Công Thái Học Điều Chỉnh Điện",
    shortLabel: "Giường công thái học",
    title: "Giường Công Thái Học Điều Chỉnh Điện SmartFurni",
    description:
      "Khám phá giường công thái học điều chỉnh điện SmartFurni với khả năng nâng đầu, nâng chân và cá nhân hóa tư thế nghỉ ngơi.",
    intro:
      "Dòng giường công thái học điều chỉnh điện SmartFurni giúp chuyển đổi linh hoạt giữa tư thế ngủ, đọc sách, xem phim và thư giãn. Mỗi model có hai cấu hình: hệ khung nâng hạ để kết hợp với nệm và vỏ giường phù hợp, hoặc bộ giường trọn bộ được hoàn thiện theo không gian thực tế.",
    selectionGuide:
      "Khi chọn giường công thái học, hãy xác định nhu cầu mua riêng hệ khung hay bộ giường trọn bộ, sau đó đối chiếu kích thước lòng giường, loại nệm, số người nằm và nhu cầu nâng đầu hoặc nâng chân. SmartFurni sẽ kiểm tra không gian trước khi xác nhận cấu hình lắp đặt.",
    seoImage: "/uploads/products/smartfurni-bed-main.webp",
    benefits: ["Điều chỉnh tư thế bằng remote", "Chọn hệ khung hoặc bộ giường trọn bộ", "Có nhiều kích thước và phân khúc", "Hỗ trợ tư vấn lắp đặt tận nơi"],
    faqs: [
      { question: "Giường công thái học điều chỉnh điện hoạt động như thế nào?", answer: "Hệ thống motor điện nâng hoặc hạ từng phần của khung giường theo thao tác trên remote, giúp người dùng lựa chọn tư thế phù hợp cho nghỉ ngơi, đọc sách hoặc xem phim." },
      { question: "Có thể dùng lại nệm và khung giường hiện tại không?", answer: "Khả năng sử dụng lại phụ thuộc vào độ linh hoạt của nệm và kích thước lòng giường. SmartFurni sẽ kiểm tra thông tin trước khi đề xuất phương án lắp đặt." },
      { question: "Nên chọn kích thước giường nào?", answer: "Kích thước nên dựa trên số người sử dụng, diện tích phòng và lòng giường thực tế. Bạn có thể gửi kích thước để được tư vấn cấu hình phù hợp." },
      { question: "Hệ khung nâng hạ và bộ giường trọn bộ khác nhau thế nào?", answer: "Hệ khung gồm khung nâng hạ, động cơ, remote, bộ nguồn và phụ kiện lắp đặt; không gồm nệm và vỏ giường trang trí. Bộ giường trọn bộ bổ sung nệm tương thích và phần vỏ giường hoàn thiện theo kích thước, vật liệu được xác nhận." },
    ],
  },
  {
    key: "electric_mattress",
    slug: "nem-thong-minh-dieu-chinh-dien",
    label: "Nệm Thông Minh Điều Chỉnh Điện",
    shortLabel: "Nệm thông minh điều chỉnh điện",
    title: "Nệm Thông Minh Điều Chỉnh Điện SmartFurni",
    description:
      "Nệm thông minh điều chỉnh điện SmartFurni tích hợp sẵn động cơ nâng hạ, điều chỉnh tư thế trực tiếp mà không cần khung nâng bên ngoài.",
    intro:
      "Nệm thông minh điều chỉnh điện SmartFurni là giải pháp nệm hoàn chỉnh đã tích hợp cơ cấu và động cơ nâng hạ bên trong. Dòng sản phẩm này còn được khách hàng tìm kiếm với tên nệm điện thông minh hoặc nệm nâng hạ chỉnh điện. Người dùng có thể điều chỉnh tư thế ngay trên nệm mà không cần mua thêm khung nâng rời.",
    selectionGuide:
      "Khi lựa chọn, hãy xác định kích thước giường hiện có, số người sử dụng và nhu cầu điều chỉnh chung hay độc lập từng bên. Vì động cơ đã được tích hợp trong nệm, bạn không cần tính thêm không gian cho một bộ khung nâng hạ bên ngoài.",
    seoImage: "/uploads/products/electric-mattress/smartfurni-electric-mattress-plus.webp",
    benefits: ["Động cơ nâng hạ tích hợp sẵn trong nệm", "Không cần mua thêm khung nâng rời", "Có phiên bản dành cho một hoặc hai người", "Điều chỉnh tư thế trực tiếp bằng bộ điều khiển"],
    faqs: [
      { question: "Nệm thông minh điều chỉnh điện khác nệm thông thường ở điểm nào?", answer: "Nệm SmartFurni đã tích hợp sẵn động cơ và cơ cấu nâng hạ bên trong, cho phép thay đổi tư thế trực tiếp. Nệm thông thường không có hệ thống điều chỉnh chủ động này." },
      { question: "Có cần mua thêm khung nâng hạ bên ngoài không?", answer: "Không. Cơ cấu nâng hạ đã nằm trong chính chiếc nệm. Bạn chỉ cần lựa chọn đúng kích thước và kiểm tra bề mặt giường đặt nệm theo hướng dẫn của SmartFurni." },
      { question: "Hai người có thể điều chỉnh tư thế riêng không?", answer: "Các phiên bản đôi độc lập cho phép mỗi người điều chỉnh bên nệm của mình. Khả năng này phụ thuộc cấu hình cụ thể của từng phiên bản." },
    ],
  },
  {
    key: "sofa_bed",
    slug: "sofa-giuong-thong-minh",
    label: "Sofa Giường Thông Minh",
    shortLabel: "Sofa giường",
    title: "Sofa Giường Thông Minh SmartFurni",
    description:
      "Giải pháp sofa giường thông minh SmartFurni giúp tối ưu diện tích và chuyển đổi linh hoạt giữa tiếp khách và nghỉ ngơi.",
    intro:
      "Sofa giường SmartFurni được thiết kế cho căn hộ, studio, homestay và không gian đa năng. Khách hàng có thể lựa chọn kích thước, chất liệu và cấu hình theo nhu cầu thực tế.",
    selectionGuide:
      "Để chọn sofa giường phù hợp, hãy đo cả diện tích khi đóng và khi mở thành giường, xác định tần suất sử dụng để ngủ, số người dùng và chất liệu phù hợp với phong cách nội thất.",
    seoImage: "/uploads/migrated/THAO_TA-CC-81C_SMF12_DA_PU_a880rv-2f2905c3e0.webp",
    benefits: ["Tối ưu diện tích sử dụng", "Chuyển đổi giữa sofa và giường", "Tùy chọn kích thước và chất liệu", "Phù hợp căn hộ, homestay và phòng đa năng"],
    faqs: [
      { question: "Sofa giường phù hợp với không gian nào?", answer: "Sản phẩm phù hợp căn hộ nhỏ, studio, phòng khách, phòng làm việc, homestay và những không gian cần chuyển đổi linh hoạt giữa tiếp khách và nghỉ ngơi." },
      { question: "Cần chừa bao nhiêu diện tích để mở sofa thành giường?", answer: "Khoảng trống cần thiết phụ thuộc từng mẫu và kích thước. Bạn nên đo chiều rộng, chiều sâu khi mở và lối đi xung quanh trước khi đặt hàng." },
      { question: "Có thể lựa chọn màu sắc và chất liệu không?", answer: "Nhiều mẫu hỗ trợ lựa chọn màu, loại vải hoặc da và kích thước. Tùy chọn cụ thể sẽ được xác nhận khi tư vấn sản phẩm." },
    ],
  },
  {
    key: "accessory",
    slug: "phu-kien-giuong-thong-minh",
    label: "Phụ Kiện Giường Thông Minh",
    shortLabel: "Phụ kiện",
    title: "Phụ Kiện Giường Thông Minh SmartFurni",
    description:
      "Remote, nệm tương thích và phụ kiện chính hãng dành cho giường thông minh SmartFurni.",
    intro:
      "Các phụ kiện chính hãng giúp hoàn thiện trải nghiệm sử dụng, thay thế thuận tiện và duy trì độ ổn định cho hệ thống giường điều chỉnh điện SmartFurni.",
    selectionGuide:
      "Khi mua phụ kiện, hãy kiểm tra đúng model, kích thước, điện áp và chuẩn kết nối của sản phẩm đang sử dụng. Thông tin mã sản phẩm giúp SmartFurni xác định phụ kiện tương thích nhanh hơn.",
    seoImage: "/uploads/products/smartfurni-bed-main.webp",
    benefits: ["Tương thích theo model SmartFurni", "Thuận tiện thay thế và bổ sung", "Có hỗ trợ kiểm tra trước khi đặt", "Đa dạng remote, nguồn và phụ kiện lắp đặt"],
    faqs: [
      { question: "Làm sao xác định phụ kiện tương thích?", answer: "Bạn nên cung cấp tên model, mã sản phẩm hoặc ảnh tem thông số. SmartFurni sẽ đối chiếu trước khi xác nhận phụ kiện phù hợp." },
      { question: "Có thể mua riêng remote hoặc bộ nguồn không?", answer: "Tùy model, remote và bộ nguồn có thể được cung cấp riêng. Cần kiểm tra chuẩn kết nối và điện áp trước khi thay thế." },
      { question: "Phụ kiện có được hỗ trợ lắp đặt không?", answer: "SmartFurni có thể hướng dẫn từ xa hoặc sắp xếp hỗ trợ kỹ thuật tùy loại phụ kiện và khu vực của khách hàng." },
    ],
  },
];

export function inferProductFamily(product: Pick<Product, "productFamily" | "name" | "slug" | "category">): ProductFamily {
  if (product.productFamily) return product.productFamily;
  const value = `${product.name} ${product.slug}`.toLocaleLowerCase("vi");
  if (value.includes("sofa")) return "sofa_bed";
  if (value.includes("nệm điện") || value.includes("nem-dien") || value.includes("electric-mattress")) {
    return "electric_mattress";
  }
  if (product.category === "accessory") return "accessory";
  return "ergonomic_bed";
}

export function getProductFamilyBySlug(slug: string): ProductFamilyDefinition | undefined {
  return PRODUCT_FAMILIES.find((family) => family.slug === slug);
}

export function getProductsByFamily(products: Product[], family: ProductFamily): Product[] {
  return products.filter(
    (product) => product.status !== "discontinued" && inferProductFamily(product) === family,
  );
}
