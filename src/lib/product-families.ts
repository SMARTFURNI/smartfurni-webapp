import type { Product, ProductFamily } from "./product-store";

export interface ProductFamilyDefinition {
  key: ProductFamily;
  slug: string;
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  intro: string;
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

