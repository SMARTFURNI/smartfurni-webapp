import type { Metadata } from "next";
import ProductFamilyPage from "@/components/landing/ProductFamilyPage";
import { initDbOnce } from "@/lib/db-init";
import { getAllProducts } from "@/lib/product-store";
import { getProductFamilyBySlug, getProductsByFamily } from "@/lib/product-families";
import { getTheme } from "@/lib/theme-store";
import { absoluteUrl } from "@/lib/site-url";

const family = getProductFamilyBySlug("giuong-cong-thai-hoc-dieu-chinh-dien")!;

export const metadata: Metadata = {
  title: `${family.title} | SmartFurni`,
  description: family.description,
  alternates: { canonical: absoluteUrl(`/products/${family.slug}`) },
  openGraph: { title: family.title, description: family.description, url: absoluteUrl(`/products/${family.slug}`), type: "website" },
};

export default async function ErgonomicBedCategoryPage() {
  await initDbOnce();
  return <ProductFamilyPage family={family} products={getProductsByFamily(getAllProducts(), family.key)} theme={getTheme()} />;
}

