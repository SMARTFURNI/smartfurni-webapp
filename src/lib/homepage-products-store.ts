import fs from "fs";
import path from "path";
import { getAllProducts, type Product } from "./product-store";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HomepageProductConfig {
  /** Danh sách ID sản phẩm được hiển thị, theo thứ tự */
  displayedProductIds: string[];
  /** Tiêu đề section */
  sectionTitle: string;
  /** Mô tả section */
  sectionSubtitle: string;
  /** Số sản phẩm tối đa hiển thị (0 = tất cả đã chọn) */
  maxDisplay: number;
  /** Hiển thị bộ lọc danh mục */
  showCategoryFilter: boolean;
  /** Hiển thị nút CTA cuối section */
  showCta: boolean;
  /** Text nút CTA */
  ctaText: string;
  /** Link nút CTA */
  ctaLink: string;
  /** Cập nhật lần cuối */
  updatedAt: string;
}

// ─── Default config ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: HomepageProductConfig = {
  displayedProductIds: [], // rỗng = hiển thị tất cả sản phẩm active
  sectionTitle: "Dòng Giường Thông Minh",
  sectionSubtitle:
    "Từ dòng phổ thông đến cao cấp, SmartFurni mang đến giải pháp giấc ngủ hoàn hảo cho mọi nhu cầu.",
  maxDisplay: 0,
  showCategoryFilter: true,
  showCta: true,
  ctaText: "Trải nghiệm Dashboard điều khiển",
  ctaLink: "/dashboard",
  updatedAt: new Date().toISOString(),
};

// ─── File path ─────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "homepage-products.json");

// ─── Read / Write ──────────────────────────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getHomepageProductConfig(): HomepageProductConfig {
  try {
    ensureDataDir();
    if (!fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG };
    }
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveHomepageProductConfig(
  updates: Partial<HomepageProductConfig>
): HomepageProductConfig {
  ensureDataDir();
  const current = getHomepageProductConfig();
  const next: HomepageProductConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

// ─── Helper: lấy danh sách sản phẩm theo cấu hình ─────────────────────────────
export function getHomepageProducts(): Product[] {
  const config = getHomepageProductConfig();
  const allProducts = getAllProducts().filter(
    (p) => p.status !== "discontinued"
  );

  if (config.displayedProductIds.length === 0) {
    // Chưa cấu hình → hiển thị tất cả active
    const result =
      config.maxDisplay > 0
        ? allProducts.slice(0, config.maxDisplay)
        : allProducts;
    return result;
  }

  // Sắp xếp theo thứ tự đã cấu hình
  const ordered: Product[] = [];
  for (const id of config.displayedProductIds) {
    const p = allProducts.find((x) => x.id === id);
    if (p) ordered.push(p);
  }

  return config.maxDisplay > 0 ? ordered.slice(0, config.maxDisplay) : ordered;
}
