import type { Product, ProductCategory } from "./product-store";

interface MattressSeed {
  id: string;
  name: string;
  image: string;
  category: ProductCategory;
  badge?: string;
  description: string;
  features: string[];
  size: string;
  sku: string;
}

const MATTRESS_SEEDS: MattressSeed[] = [
  {
    id: "electric-mattress-comfort",
    name: "Nệm Điện SmartFurni Comfort",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-comfort.webp",
    category: "standard",
    description: "Nệm điện tích hợp sẵn động cơ nâng hạ, điều chỉnh tư thế trực tiếp mà không cần lắp thêm khung nâng bên ngoài.",
    features: ["Động cơ nâng hạ tích hợp trong nệm", "Điều chỉnh độc lập hai bên", "Bề mặt nâng đỡ êm ái"],
    size: "1,6m x 2m",
    sku: "SF-MC-160",
  },
  {
    id: "electric-mattress-plus",
    name: "Nệm Điện SmartFurni Plus",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-plus.webp",
    category: "premium",
    badge: "Phổ biến nhất",
    description: "Nệm điện đôi tích hợp cơ cấu nâng hạ, cân bằng giữa sự thoải mái, độ bền và khả năng điều chỉnh hằng ngày.",
    features: ["Cơ cấu nâng hạ tích hợp", "Hai vùng điều chỉnh riêng", "Vật liệu thoáng khí"],
    size: "1,8m x 2m",
    sku: "SF-MP-180",
  },
  {
    id: "electric-mattress-premium",
    name: "Nệm Điện SmartFurni Premium",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-premium.webp",
    category: "premium",
    description: "Dòng nệm điện cao cấp có động cơ tích hợp, cho phép nâng đầu từng bên để đọc sách và thư giãn thuận tiện.",
    features: ["Động cơ tích hợp gọn trong nệm", "Nâng đầu độc lập", "Bề mặt chần êm cao cấp"],
    size: "1,8m x 2m",
    sku: "SF-MPR-180",
  },
  {
    id: "electric-mattress-dual",
    name: "Nệm Điện SmartFurni Dual",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-dual.webp",
    category: "elite",
    badge: "Trải nghiệm đôi",
    description: "Phiên bản nệm điện đôi tích hợp hệ nâng hạ dành cho hai người, cho phép cá nhân hóa tư thế trên từng bên.",
    features: ["Hệ nâng hạ tích hợp trong nệm", "Cá nhân hóa hai bên", "Thiết kế dành cho cặp đôi"],
    size: "2m x 2m",
    sku: "SF-MD-200",
  },
];

export const HOMEPAGE_MATTRESS_PRODUCTS: Product[] = MATTRESS_SEEDS.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  slug: seed.id,
  category: seed.category,
  productFamily: "electric_mattress",
  status: "active",
  description: seed.description,
  detailedDescription: `<h2>${seed.name} — nệm điện tích hợp động cơ nâng hạ</h2>
<p>${seed.description}</p>
<p>Toàn bộ cơ cấu điều chỉnh đã được tích hợp trong chính chiếc nệm. Sản phẩm hoạt động độc lập, không yêu cầu lắp thêm khung nâng hạ rời bên dưới.</p>
<h3>Điểm nổi bật</h3>
<ul>${seed.features.map((feature) => `<li>${feature}</li>`).join("")}</ul>
<h3>Lựa chọn và lắp đặt</h3>
<p>Hãy đối chiếu kích thước giường hiện có, số người sử dụng và nhu cầu điều chỉnh từng bên. SmartFurni sẽ kiểm tra bề mặt đặt nệm và tư vấn phiên bản phù hợp trước khi giao lắp.</p>`,
  price: 0,
  originalPrice: 0,
  cost: 0,
  coverImage: seed.image,
  images: [seed.image],
  variants: [
    {
      id: `${seed.id}-standard`,
      name: seed.size,
      sku: seed.sku,
      stock: 20,
      reserved: 0,
    },
  ],
  totalStock: 20,
  totalSold: 0,
  totalRevenue: 0,
  rating: 0,
  reviewCount: 0,
  reviews: [],
  features: seed.features,
  specs: {
    "Kích thước": seed.size,
    "Cơ cấu nâng hạ": "Động cơ điện tích hợp sẵn trong nệm",
    "Kiểu điều chỉnh": "Điều chỉnh điện trực tiếp, không cần khung nâng rời",
    "Bề mặt": "Vải dệt thoáng khí, chần êm",
    "Lắp đặt": "Đặt trực tiếp lên giường phù hợp, không cần khung nâng hạ bên ngoài",
    "Bảo hành": "Liên hệ tư vấn",
  },
  monthlySales: [],
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: `2026-07-15T00:00:0${index}.000Z`,
  isFeatured: index === 1,
  viewCount: 0,
  imageBadge: seed.badge,
}));

export function getHomepageMattressProductBySlug(slug: string): Product | undefined {
  return HOMEPAGE_MATTRESS_PRODUCTS.find((product) => product.slug === slug);
}

/** Giữ giá/tồn kho do admin quản lý nhưng luôn áp dụng đúng định vị và thông số cốt lõi của dòng nệm điện. */
export function applyElectricMattressPositioning(product: Product): Product {
  const canonical = getHomepageMattressProductBySlug(product.slug);
  if (!canonical) return product;
  const retainedSpecs = { ...product.specs };
  delete retainedSpecs["Khả năng tương thích"];
  return {
    ...product,
    name: canonical.name,
    productFamily: "electric_mattress",
    description: canonical.description,
    detailedDescription: canonical.detailedDescription,
    features: canonical.features,
    specs: { ...retainedSpecs, ...canonical.specs },
    coverImage: canonical.coverImage,
    images: canonical.images,
  };
}

export function getHomepageMattressRelatedProducts(productId: string, limit = 4): Product[] {
  return HOMEPAGE_MATTRESS_PRODUCTS.filter((product) => product.id !== productId).slice(0, limit);
}
