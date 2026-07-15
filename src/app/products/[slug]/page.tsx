import { notFound } from "next/navigation";
import { getProductBySlugFresh, getRelatedProducts } from "@/lib/product-store";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProductDetailClient from "@/components/landing/ProductDetailClient";
import { initDbOnce } from "@/lib/db-init";
import {
  getHomepageMattressProductBySlug,
  getHomepageMattressRelatedProducts,
} from "@/lib/homepage-mattress-products";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  await initDbOnce();
  const { slug } = await params;
  const product =
    (await getProductBySlugFresh(slug)) ?? getHomepageMattressProductBySlug(slug);
  if (!product) return { title: "Không tìm thấy sản phẩm" };
  return {
    title: `${product.name} | SmartFurni`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  await initDbOnce();
  const { slug } = await params;
  const product =
    (await getProductBySlugFresh(slug)) ?? getHomepageMattressProductBySlug(slug);
  if (!product) notFound();
  const theme = getTheme();
  const related = getHomepageMattressProductBySlug(slug)
    ? getHomepageMattressRelatedProducts(product.id, 4)
    : getRelatedProducts(product, 4);
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
      <Navbar theme={theme} />
      <ProductDetailClient product={product} related={related} theme={theme} />
      <Footer theme={theme} variant="full" />
    </main>
  );
}
