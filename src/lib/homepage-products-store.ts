import { dbGetSetting, dbSaveSetting } from "./db-store";
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

const SETTING_KEY = "homepage_products_config";

// ─── In-memory cache ───────────────────────────────────────────────────────────
let _cache: HomepageProductConfig | null = null;

// ─── Read / Write ──────────────────────────────────────────────────────────────
export async function getHomepageProductConfigAsync(): Promise<HomepageProductConfig> {
  if (_cache) return _cache;
  try {
    const saved = await dbGetSetting<HomepageProductConfig>(SETTING_KEY);
    if (saved) {
      _cache = { ...DEFAULT_CONFIG, ...saved };
      return _cache;
    }
  } catch {
    // fallback to default
  }
  return { ...DEFAULT_CONFIG };
}

export function getHomepageProductConfig(): HomepageProductConfig {
  // Synchronous read from cache (populated on first async call)
  return _cache ?? { ...DEFAULT_CONFIG };
}

export async function saveHomepageProductConfig(
  updates: Partial<HomepageProductConfig>
): Promise<HomepageProductConfig> {
  const current = await getHomepageProductConfigAsync();
  const next: HomepageProductConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  _cache = next;
  await dbSaveSetting(SETTING_KEY, next);
  return next;
}

// ─── Initialize cache from DB on startup ──────────────────────────────────────
export async function initHomepageProductConfig(): Promise<void> {
  _cache = await getHomepageProductConfigAsync();
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

// ─── Register DB loader ───────────────────────────────────────────────────────
import { registerDbLoader } from "./db-init";

registerDbLoader(async () => {
  await initHomepageProductConfig();
  console.log("[homepage-products-store] Config loaded from database");
});
