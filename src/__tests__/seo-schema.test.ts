import { describe, expect, it } from "vitest";
import { getCanonicalElectricMattressSlug, HOMEPAGE_MATTRESS_PRODUCTS } from "@/lib/homepage-mattress-products";
import { getProductFamilyBySlug } from "@/lib/product-families";
import { breadcrumbSchema, collectionSchema, faqSchema, productSchema } from "@/lib/seo-schema";

describe("SEO structured data", () => {
  it("builds canonical breadcrumb URLs", () => {
    const schema = breadcrumbSchema([
      { name: "Trang chủ", path: "/" },
      { name: "Sản phẩm", path: "/products" },
    ]);
    expect(schema.itemListElement[1].item).toBe("https://www.smartfurni.com.vn/products");
  });

  it("does not publish a zero-price offer", () => {
    const schema = productSchema(HOMEPAGE_MATTRESS_PRODUCTS[0]);
    expect(schema.offers).toBeUndefined();
    expect(schema.name).toBe("Nệm Thông Minh Điều Chỉnh Điện SmartFurni Comfort");
    expect(schema.description).toContain("động cơ nâng hạ");
    expect(schema.description).toContain("không cần");
  });

  it("builds matching collection and FAQ entities", () => {
    const family = getProductFamilyBySlug("nem-thong-minh-dieu-chinh-dien")!;
    const collection = collectionSchema(family, HOMEPAGE_MATTRESS_PRODUCTS);
    const faq = faqSchema(family.faqs);
    expect(collection.mainEntity.numberOfItems).toBe(4);
    expect(faq.mainEntity).toHaveLength(3);
  });

  it("maps every legacy English mattress slug to its Vietnamese canonical slug", () => {
    expect(getCanonicalElectricMattressSlug("electric-mattress-premium")).toBe(
      "nem-thong-minh-dieu-chinh-dien-smartfurni-premium",
    );
    expect(HOMEPAGE_MATTRESS_PRODUCTS.every((product) => product.slug.startsWith("nem-thong-minh-dieu-chinh-dien-smartfurni-"))).toBe(true);
  });
});
