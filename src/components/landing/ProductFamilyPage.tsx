import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import StaticProductsSection from "./StaticProductsSection";
import type { Product } from "@/lib/product-store";
import type { ProductFamilyDefinition } from "@/lib/product-families";
import type { SiteTheme } from "@/lib/theme-types";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, collectionSchema, faqSchema } from "@/lib/seo-schema";

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
      <JsonLd data={collectionSchema(family, products)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Trang chủ", path: "/" },
        { name: "Sản phẩm", path: "/products" },
        { name: family.shortLabel, path: `/products/${family.slug}` },
      ])} />
      <JsonLd data={faqSchema(family.faqs)} />
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

      <section aria-labelledby="family-guide-heading" className="border-t border-[#C9A84C]/15 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-14">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A84C]">Hướng dẫn lựa chọn</p>
            <h2 id="family-guide-heading" className="text-2xl font-light leading-tight text-[#F5EDD6] sm:text-3xl">
              Chọn {family.shortLabel.toLocaleLowerCase("vi")} phù hợp
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#F5EDD6]/65 sm:text-base">{family.selectionGuide}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-full bg-[#C9A84C] px-5 py-2.5 text-sm font-semibold text-[#0D0B00]">Nhận tư vấn</Link>
              <Link href="/products/compare" className="rounded-full border border-[#C9A84C]/55 px-5 py-2.5 text-sm font-semibold text-[#C9A84C]">So sánh sản phẩm</Link>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {family.benefits.map((benefit) => (
              <li key={benefit} className="rounded-2xl border border-[#C9A84C]/15 bg-[#1A1500]/75 px-5 py-4 text-sm text-[#F5EDD6]/75">
                <span className="mr-2 text-[#C9A84C]">✓</span>{benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="family-faq-heading" className="border-t border-[#C9A84C]/15 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A84C]">Câu hỏi thường gặp</p>
          <h2 id="family-faq-heading" className="text-2xl font-light text-[#F5EDD6] sm:text-3xl">Thông tin cần biết trước khi lựa chọn</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {family.faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-[#C9A84C]/15 bg-[#1A1500]/70 p-5">
                <h3 className="text-base font-semibold leading-6 text-[#F5EDD6]">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-[#F5EDD6]/58">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer theme={theme} variant="full" />
    </main>
  );
}
