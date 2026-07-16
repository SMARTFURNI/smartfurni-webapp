import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import StaticProductsSection from "./StaticProductsSection";
import type { Product } from "@/lib/product-store";
import type { ProductFamilyDefinition } from "@/lib/product-families";
import type { SiteTheme } from "@/lib/theme-types";

export default function ProductFamilyPage({
  family,
  products,
  theme,
}: {
  family: ProductFamilyDefinition;
  products: Product[];
  theme: SiteTheme;
}) {
  return (
    <main className="sf-site-gradient-bg min-h-screen bg-[#0D0B00]">
      <Navbar theme={theme} />
      <section className="border-b border-[#C9A84C]/15 px-4 pb-14 pt-28 sm:px-6 sm:pb-16 sm:pt-32">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#F5EDD6]/45">
            <Link href="/" className="hover:text-[#C9A84C]">Trang chủ</Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-[#C9A84C]">Sản phẩm</Link>
            <span className="mx-2">/</span>
            <span className="text-[#C9A84C]">{family.shortLabel}</span>
          </nav>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">Dòng sản phẩm SmartFurni</p>
          <h1 className="max-w-4xl text-3xl font-light leading-tight text-[#F5EDD6] sm:text-4xl md:text-5xl">
            {family.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#F5EDD6]/65 sm:text-base">
            {family.intro}
          </p>
        </div>
      </section>

      {products.length > 0 ? (
        <StaticProductsSection
          theme={theme}
          products={products}
          sectionTitle={`Sản phẩm ${family.shortLabel}`}
          sectionSubtitle={family.description}
          sectionHref={`/products/${family.slug}`}
        />
      ) : (
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-3xl border border-[#C9A84C]/25 bg-[#1A1500] p-8 text-center sm:p-12">
            <h2 className="text-2xl font-light text-[#F5EDD6]">Thiết kế theo nhu cầu của bạn</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#F5EDD6]/55">
              Dòng sản phẩm này được cấu hình theo kích thước, chất liệu và không gian sử dụng thực tế.
            </p>
            <Link href="/lp/sofa-giuong" className="mt-6 inline-flex rounded-full border border-[#C9A84C] px-6 py-3 text-sm font-semibold text-[#C9A84C]">
              Khám phá sofa giường →
            </Link>
          </div>
        </section>
      )}

      <Footer theme={theme} variant="full" />
    </main>
  );
}
