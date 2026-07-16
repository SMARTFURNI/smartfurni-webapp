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
    description: "Nệm điện điều chỉnh linh hoạt theo tư thế nghỉ ngơi, phù hợp cho phòng ngủ gia đình hiện đại.",
    features: ["Điều chỉnh độc lập hai bên", "Bề mặt nâng đỡ êm ái", "Thiết kế linh hoạt theo góc nâng"],
    size: "1,6m x 2m",
    sku: "SF-MC-160",
  },
  {
    id: "electric-mattress-plus",
    name: "Nệm Điện SmartFurni Plus",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-plus.webp",
    category: "premium",
    badge: "Phổ biến nhất",
    description: "Giải pháp nệm điện đôi cân bằng giữa sự thoải mái, độ bền và khả năng điều chỉnh hằng ngày.",
    features: ["Hai vùng điều chỉnh riêng", "Tương thích khung giường điện", "Vật liệu thoáng khí"],
    size: "1,8m x 2m",
    sku: "SF-MP-180",
  },
  {
    id: "electric-mattress-premium",
    name: "Nệm Điện SmartFurni Premium",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-premium.webp",
    category: "premium",
    description: "Dòng nệm điện cao cấp cho phép nâng đầu từng bên, tối ưu trải nghiệm đọc sách và thư giãn.",
    features: ["Nâng đầu độc lập", "Nâng đỡ đa vùng", "Bề mặt chần êm cao cấp"],
    size: "1,8m x 2m",
    sku: "SF-MPR-180",
  },
  {
    id: "electric-mattress-dual",
    name: "Nệm Điện SmartFurni Dual",
    image: "/uploads/products/electric-mattress/smartfurni-electric-mattress-dual.webp",
    category: "elite",
    badge: "Trải nghiệm đôi",
    description: "Phiên bản đôi dành cho hai người với khả năng cá nhân hóa tư thế nghỉ ngơi trên từng vùng nệm.",
    features: ["Cá nhân hóa hai bên", "Tư thế thư giãn linh hoạt", "Thiết kế dành cho cặp đôi"],
    size: "2m x 2m",
    sku: "SF-MD-200",
  },
];

export const HOMEPAGE_MATTRESS_PRODUCTS: Product[] = MATTRESS_SEEDS.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  slug: seed.id,
  category: seed.category,
  status: "active",
  description: seed.description,
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
    "Kiểu điều chỉnh": "Điều chỉnh điện độc lập",
    "Bề mặt": "Vải dệt thoáng khí, chần êm",
    "Khả năng tương thích": "Khung giường điều chỉnh điện SmartFurni",
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

export function getHomepageMattressRelatedProducts(productId: string, limit = 4): Product[] {
  return HOMEPAGE_MATTRESS_PRODUCTS.filter((product) => product.id !== productId).slice(0, limit);
}
