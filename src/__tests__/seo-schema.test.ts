import { describe, expect, it } from "vitest";
import { HOMEPAGE_MATTRESS_PRODUCTS } from "@/lib/homepage-mattress-products";
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
    expect(schema.name).toBe("Nệm Điện SmartFurni Comfort");
  });

  it("builds matching collection and FAQ entities", () => {
    const family = getProductFamilyBySlug("nem-dien-thong-minh")!;
    const collection = collectionSchema(family, HOMEPAGE_MATTRESS_PRODUCTS);
    const faq = faqSchema(family.faqs);
    expect(collection.mainEntity.numberOfItems).toBe(4);
    expect(faq.mainEntity).toHaveLength(3);
  });
});
