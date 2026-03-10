import { notFound } from "next/navigation";
import { getAllProducts } from "@/lib/product-store";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProductConfiguratorClient from "@/components/landing/ProductConfiguratorClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = getAllProducts().find((p) => p.slug === slug);
  if (!product) return {};
  return {
    title: `Cấu hình ${product.name} | SmartFurni`,
    description: `Tùy chỉnh màu sắc, vật liệu và kích thước cho ${product.name}. Xem preview trực tiếp trước khi đặt hàng.`,
  };
}

export default async function ProductConfiguratorPage({ params }: Props) {
  const { slug } = await params;
  const theme = getTheme();
  const product = getAllProducts().find((p) => p.slug === slug && p.category !== "accessory");
  if (!product) notFound();

  return (
    <main style={{ backgroundColor: theme.colors.background }} className="min-h-screen">
      <Navbar theme={theme} />
      <div style={{ paddingTop: (theme.navbar.height ?? 64) + 16 }}>
        <ProductConfiguratorClient product={product} theme={theme} />
      </div>
      <Footer theme={theme} variant="minimal" />
    </main>
  );
}
