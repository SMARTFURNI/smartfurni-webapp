import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/product-store";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import ProductDetailClient from "@/components/landing/ProductDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Không tìm thấy sản phẩm" };
  return {
    title: `${product.name} | SmartFurni`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const theme = getTheme();
  const related = getRelatedProducts(product, 4);
  return (
    <main style={{ minHeight: "100vh", backgroundColor: theme.colors.background }}>
      <Navbar theme={theme} />
      <ProductDetailClient product={product} related={related} theme={theme} />
      {/* Footer */}
      <footer
        style={{ backgroundColor: theme.footer.bgColor, borderTopColor: theme.colors.border }}
        className="border-t py-8 px-6 mt-20"
      >
        <div style={{ maxWidth: theme.layout.maxWidth }} className="mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
              className="w-6 h-6 rounded flex items-center justify-center"
            >
              <span style={{ color: theme.colors.background }} className="font-bold text-xs">
                {theme.footer.companyName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span style={{ color: theme.colors.primary }} className="font-bold text-sm tracking-widest">
              {theme.footer.companyName.toUpperCase()}
            </span>
          </div>
          <p style={{ color: theme.footer.textColor }} className="text-xs opacity-40">
            {theme.footer.copyrightText}
          </p>
        </div>
      </footer>
    </main>
  );
}
