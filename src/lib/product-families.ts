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
      "Dòng giường nâng hạ điện SmartFurni giúp chuyển đổi linh hoạt giữa tư thế ngủ, đọc sách, xem phim và thư giãn. Sản phẩm được thiết kế cho gia đình hiện đại, người lớn tuổi và những ai cần nâng đỡ cơ thể tốt hơn.",
    selectionGuide:
      "Khi chọn giường công thái học, hãy đối chiếu kích thước lòng giường, loại nệm đang sử dụng, số người nằm và nhu cầu nâng đầu hoặc nâng chân. SmartFurni có thể tư vấn cấu hình theo không gian thực tế trước khi lắp đặt.",
    benefits: ["Điều chỉnh tư thế bằng remote", "Linh hoạt khi đọc sách và nghỉ ngơi", "Có nhiều kích thước và phân khúc", "Hỗ trợ tư vấn lắp đặt tận nơi"],
    faqs: [
      { question: "Giường công thái học điều chỉnh điện hoạt động như thế nào?", answer: "Hệ thống motor điện nâng hoặc hạ từng phần của khung giường theo thao tác trên remote, giúp người dùng lựa chọn tư thế phù hợp cho nghỉ ngơi, đọc sách hoặc xem phim." },
      { question: "Có thể dùng lại nệm và khung giường hiện tại không?", answer: "Khả năng sử dụng lại phụ thuộc vào độ linh hoạt của nệm và kích thước lòng giường. SmartFurni sẽ kiểm tra thông tin trước khi đề xuất phương án lắp đặt." },
      { question: "Nên chọn kích thước giường nào?", answer: "Kích thước nên dựa trên số người sử dụng, diện tích phòng và lòng giường thực tế. Bạn có thể gửi kích thước để được tư vấn cấu hình phù hợp." },
    ],
  },
  {
    key: "electric_mattress",
    slug: "nem-dien-thong-minh",
    label: "Nệm Điện Thông Minh",
    shortLabel: "Nệm điện thông minh",
    title: "Nệm Điện Thông Minh SmartFurni",
    description:
      "Nệm điện thông minh SmartFurni nâng đỡ linh hoạt theo từng tư thế, phù hợp với giường điều chỉnh điện và nhu cầu nghỉ ngơi cá nhân.",
    intro:
      "Nệm điện thông minh SmartFurni kết hợp bề mặt êm ái với khả năng điều chỉnh linh hoạt, hỗ trợ cá nhân hóa tư thế cho từng người dùng và từng không gian phòng ngủ.",
    selectionGuide:
      "Nệm dùng với hệ điều chỉnh điện cần đủ linh hoạt để thay đổi theo góc nâng nhưng vẫn duy trì khả năng nâng đỡ. Hãy ưu tiên đúng kích thước khung, cấu trúc nệm tương thích và nhu cầu điều chỉnh độc lập của từng bên.",
    benefits: ["Tương thích khung giường điều chỉnh điện", "Nâng đỡ linh hoạt theo góc nâng", "Có phiên bản dành cho một hoặc hai người", "Bề mặt chần êm, thoáng khí"],
    faqs: [
      { question: "Nệm điện thông minh khác nệm thông thường ở điểm nào?", answer: "Dòng nệm này được thiết kế để thích ứng với chuyển động của khung nâng hạ, giúp bề mặt nệm thay đổi theo tư thế mà không làm mất sự ổn định khi nằm." },
      { question: "Nệm điện có dùng được với mọi loại khung giường không?", answer: "Nệm cần đúng kích thước và tương thích với kết cấu nâng hạ. Nên kiểm tra thông số khung hoặc trao đổi với SmartFurni trước khi lựa chọn." },
      { question: "Hai người có thể điều chỉnh tư thế riêng không?", answer: "Các phiên bản đôi độc lập cho phép mỗi bên lựa chọn tư thế riêng. Khả năng này tùy thuộc cấu hình nệm và khung giường đi kèm." },
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
