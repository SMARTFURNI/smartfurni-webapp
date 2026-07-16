import { notFound, permanentRedirect } from "next/navigation";
import { getProductBySlugFresh, getRelatedProducts } from "@/lib/product-store";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProductDetailClient from "@/components/landing/ProductDetailClient";
import { initDbOnce } from "@/lib/db-init";
import {
  getHomepageMattressProductBySlug,
  getHomepageMattressRelatedProducts,
  getCanonicalElectricMattressSlug,
} from "@/lib/homepage-mattress-products";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, productSchema } from "@/lib/seo-schema";
import { PRODUCT_FAMILIES, inferProductFamily } from "@/lib/product-families";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await initDbOnce();
  const { slug } = await params;
  const resolvedSlug = getCanonicalElectricMattressSlug(slug) || slug;
  const product =
    (await getProductBySlugFresh(resolvedSlug)) ?? getHomepageMattressProductBySlug(resolvedSlug);
  if (!product) return { title: "Không tìm thấy sản phẩm", robots: { index: false, follow: false } };
  const url = absoluteUrl(`/products/${product.slug}`);
  const image = product.coverImage ? absoluteUrl(product.coverImage) : undefined;
  return {
    title: `${product.name} | SmartFurni`,
    description: product.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.name} | SmartFurni`,
      description: product.description,
      url,
      type: "website",
      images: image ? [{ url: image, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | SmartFurni`,
      description: product.description,
      images: image ? [image] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  await initDbOnce();
  const { slug } = await params;
  const canonicalMattressSlug = getCanonicalElectricMattressSlug(slug);
  if (canonicalMattressSlug) {
    permanentRedirect(`/products/${canonicalMattressSlug}`);
  }
  const product =
    (await getProductBySlugFresh(slug)) ?? getHomepageMattressProductBySlug(slug);
  if (!product) notFound();
  const theme = getTheme();
  const related = getHomepageMattressProductBySlug(slug)
    ? getHomepageMattressRelatedProducts(product.id, 4)
    : getRelatedProducts(product, 4);
  const family = PRODUCT_FAMILIES.find((item) => item.key === inferProductFamily(product));
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: theme.colors.background,
        backgroundImage: `
          radial-gradient(circle at top left, color-mix(in srgb, ${theme.colors.primary} 12%, transparent), transparent 34rem),
          linear-gradient(135deg, color-mix(in srgb, ${theme.colors.surface} 92%, transparent), color-mix(in srgb, ${theme.colors.background} 96%, transparent))
        `,
      }}
    >
      <JsonLd data={productSchema(product)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Trang chủ", path: "/" },
        { name: "Sản phẩm", path: "/products" },
        ...(family ? [{ name: family.shortLabel, path: `/products/${family.slug}` }] : []),
        { name: product.name, path: `/products/${product.slug}` },
      ])} />
      <Navbar theme={theme} />
      <ProductDetailClient product={product} related={related} theme={theme} />
      <Footer theme={theme} variant="full" />
    </main>
  );
}
