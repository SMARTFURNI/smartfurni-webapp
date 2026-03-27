import { getAllProducts } from "@/lib/product-store";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProductsListClient from "@/components/landing/ProductsListClient";
import { initDbOnce } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sản phẩm | SmartFurni",
  description: "Khám phá dòng giường thông minh SmartFurni — từ Standard đến Elite, tích hợp công nghệ AI tiên tiến.",
  keywords: ["giường thông minh", "smart bed", "SmartFurni", "giường điều khiển"],
  openGraph: {
    title: "Sản phẩm SmartFurni — Giường Điều Khiển Thông Minh",
    description: "Khám phá dòng giường thông minh SmartFurni — từ Standard đến Elite.",
    type: "website",
    url: "https://smartfurni.vn/products",
  },
};

export default function ProductsPage() {
  const theme = getTheme();
  const products = getAllProducts().filter((p) => p.status !== "discontinued");

  return (
    <main className="min-h-screen bg-[#0D0B00]">
      <Navbar theme={theme} />

      {/* Hero banner — font-light + text-gold-gradient giống trang chủ */}
      <section className="pt-28 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6 text-center border-b border-[#2E2800]">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">{theme.pageProducts.heroBadge}</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-light text-[#F5EDD6] mb-4 leading-tight"
            dangerouslySetInnerHTML={{ __html: theme.pageProducts.heroTitle }}
          />
          <p className="text-[#F5EDD6]/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {theme.pageProducts.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Products list with filters */}
      <ProductsListClient products={products} theme={theme} />
      <Footer theme={theme} variant="full" />
    </main>
  );
}
