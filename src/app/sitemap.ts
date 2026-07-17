import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/admin-store";
import { initDbOnce } from "@/lib/db-init";
import { getAllProducts } from "@/lib/product-store";
import { PRODUCT_FAMILIES } from "@/lib/product-families";
import { absoluteUrl } from "@/lib/site-url";

const STATIC_PAGES = [
  ["/", "weekly", 1],
  ["/products", "weekly", 0.95],
  ["/products/compare", "monthly", 0.65],
  ["/about", "monthly", 0.75],
  ["/blog", "weekly", 0.8],
  ["/contact", "monthly", 0.7],
  ["/reviews", "weekly", 0.7],
  ["/ar-try", "monthly", 0.65],
  ["/sleep-advisor", "monthly", 0.65],
  ["/warranty", "monthly", 0.6],
  ["/returns", "monthly", 0.5],
  ["/privacy", "yearly", 0.3],
  ["/terms", "yearly", 0.3],
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await initDbOnce();
  const products = getAllProducts().filter((product) => product.status !== "discontinued");

  const staticPages: MetadataRoute.Sitemap = STATIC_PAGES.map(([path, changeFrequency, priority]) => ({
    url: absoluteUrl(path),
    changeFrequency,
    priority,
  }));

  const categoryPages: MetadataRoute.Sitemap = PRODUCT_FAMILIES.map((family) => ({
    url: absoluteUrl(`/products/${family.slug}`),
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    lastModified: new Date(product.updatedAt),
    changeFrequency: "weekly",
    priority: product.isFeatured ? 0.9 : 0.8,
  }));

  const blogPages: MetadataRoute.Sitemap = getAllPosts().filter((post) => !post.status || post.status === "published").map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: post.featured ? 0.75 : 0.65,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...blogPages];
}
