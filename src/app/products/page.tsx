import { getAllProducts } from "@/lib/product-store";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProductsListClient from "@/components/landing/ProductsListClient";
import { initDbOnce } from "@/lib/db-init";
import Link from "next/link";
import type { Metadata } from "next";
import { PRODUCT_FAMILIES } from "@/lib/product-families";
import { absoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giải Pháp Giấc Ngủ Thông Minh | SmartFurni",
  description: "Khám phá giường công thái học, nệm thông minh điều chỉnh điện tích hợp động cơ, sofa giường và phụ kiện SmartFurni.",
  alternates: { canonical: absoluteUrl("/products") },
  openGraph: {
    title: "Giải Pháp Giấc Ngủ Thông Minh SmartFurni",
    description: "Giường công thái học, nệm thông minh điều chỉnh điện, sofa giường và phụ kiện chính hãng SmartFurni.",
    type: "website",
    url: absoluteUrl("/products"),
  },
};

export default async function ProductsPage() {
  await initDbOnce();
  const theme = getTheme();
  const products = getAllProducts().filter((p) => p.status !== "discontinued");

  return (
    <main className="sf-site-gradient-bg min-h-screen bg-[#0D0B00]">
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

      <section aria-labelledby="product-families-heading" className="border-b border-[#2E2800] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto" style={{ maxWidth: theme.layout.maxWidth }}>
          <h2 id="product-families-heading" className="mb-6 text-2xl font-light text-[#F5EDD6] sm:text-3xl">Chọn theo dòng sản phẩm</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {PRODUCT_FAMILIES.map((family) => (
              <Link
                key={family.key}
                href={`/products/${family.slug}`}
                className="rounded-xl border border-[#C9A84C]/20 bg-[#1A1500] p-3.5 transition-colors hover:border-[#C9A84C]/55 sm:rounded-2xl sm:p-5"
              >
                <h3 className="text-sm font-semibold leading-snug text-[#F5EDD6] sm:text-base">{family.shortLabel}</h3>
                <p className="mt-2 line-clamp-4 text-[11px] leading-5 text-[#F5EDD6]/50 sm:line-clamp-3 sm:text-xs sm:leading-6">{family.description}</p>
                <span className="mt-3 inline-block text-[11px] font-semibold text-[#C9A84C] sm:mt-4 sm:text-xs">Xem chi tiết →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Products list with filters */}
      <ProductsListClient products={products} theme={theme} />
      <Footer theme={theme} variant="full" />
    </main>
  );
}
