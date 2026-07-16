import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DownloadSection from "@/components/landing/DownloadSection";
import Footer from "@/components/landing/Footer";
import { getThemeAsync } from "@/lib/theme-store";
import StaticProductsSection from "@/components/landing/StaticProductsSection";
import VideoSection from "@/components/landing/VideoSection";
import HomeVisualProofSections from "@/components/landing/HomeVisualProofSections";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import HomeDecisionSections from "@/components/landing/HomeDecisionSections";
import { initHomepageProductConfig, getHomepageProducts, getHomepageProductConfigAsync } from "@/lib/homepage-products-store";
import { HOMEPAGE_MATTRESS_PRODUCTS } from "@/lib/homepage-mattress-products";
import { getAllProducts } from "@/lib/product-store";
import { inferProductFamily } from "@/lib/product-families";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "SmartFurni — Giường Công Thái Học Điều Chỉnh Điện",
  description: "Giường công thái học và nệm thông minh điều chỉnh điện tích hợp động cơ nâng hạ SmartFurni cho gia đình Việt.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: { url: absoluteUrl("/"), type: "website" },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await initHomepageProductConfig();
  const theme = await getThemeAsync();
  const homepageConfig = await getHomepageProductConfigAsync();
  const products = getHomepageProducts();
  const allProducts = getAllProducts();
  const mattressProducts = HOMEPAGE_MATTRESS_PRODUCTS.map((seed) => {
    const savedProduct = allProducts.find(
      (product) => product.id === seed.id || product.slug === seed.slug,
    );

    // Luôn dùng media tĩnh đã được đóng gói cùng bản deploy. Dữ liệu sản phẩm
    // trong DB có thể vẫn giữ URL ảnh cũ và khiến cả dòng nệm trống sau deploy.
    return savedProduct
      ? { ...savedProduct, coverImage: seed.coverImage, images: seed.images }
      : seed;
  });
  const isBedProduct = (product: (typeof allProducts)[number]) => {
    return (
      product.status !== "discontinued" &&
      inferProductFamily(product) === "ergonomic_bed"
    );
  };
  const configuredBedProducts = products.filter(isBedProduct);
  // Cấu hình trang chủ cũ có thể chỉ còn ID của dòng nệm. Khi đó không được
  // ẩn toàn bộ dòng giường mà phải quay về danh sách sản phẩm đang bán.
  const bedProducts =
    configuredBedProducts.length > 0
      ? configuredBedProducts
      : allProducts.filter(isBedProduct);
  const { banner } = theme;

  return (
    <main className="sf-site-gradient-bg" style={{ minHeight: "100vh", backgroundColor: theme.colors.background }}>
      {/* Banner thông báo */}
      {banner.enabled && (
        <div
          style={{ backgroundColor: banner.bgColor, color: banner.textColor }}
          className="text-center py-2 px-4 text-sm font-medium"
        >
          {banner.text}{" "}
          {banner.link && (
            <Link href={banner.link} style={{ color: banner.textColor, textDecoration: "underline" }}>
              {banner.linkText}
            </Link>
          )}
        </div>
      )}

      {/* 1. Nav */}
      <Navbar theme={theme} />

      {/* 2. Hero — ảnh sản phẩm + tiêu đề ngắn + 2 CTA */}
      <HeroSection theme={theme} />

      {/* 3. Dòng nệm thông minh điều chỉnh điện */}
      <StaticProductsSection
        theme={theme}
        products={mattressProducts}
        sectionTitle={"Nệm Thông Minh\nĐiều Chỉnh Điện SmartFurni"}
        sectionSubtitle="Động cơ nâng hạ được tích hợp sẵn trong nệm, điều chỉnh tư thế trực tiếp mà không cần lắp thêm khung nâng bên ngoài."
        sectionHref="/products/nem-thong-minh-dieu-chinh-dien"
      />

      {/* 4. Dòng giường công thái học */}
      <StaticProductsSection
        theme={theme}
        products={bedProducts}
        sectionTitle={homepageConfig.sectionTitle}
        sectionSubtitle={homepageConfig.sectionSubtitle}
        sectionHref="/products/giuong-cong-thai-hoc-dieu-chinh-dien"
      />

      {/* 5. Video thực tế — tăng tin cậy sau khi khách đã thấy dòng sản phẩm */}
      <VideoSection theme={theme} />

      {/* 5. Chuyển động & cận cảnh — giảm chữ, tăng hình ảnh mô tả */}
      <HomeVisualProofSections theme={theme} />

      {/* 6. Lợi ích — 3 lợi ích cốt lõi + 8 tính năng */}
      <FeaturesSection theme={theme} />

      {/* 7. So sánh — giường thường vs SmartFurni */}
      <ComparisonSection theme={theme} />

      {/* 8. Các thông tin giúp khách quyết định mua */}
      <HomeDecisionSections theme={theme} />

      {/* 9. Đánh giá khách hàng — social proof */}
      <TestimonialsSection theme={theme} />

      {/* 10. CTA cuối — form tư vấn miễn phí */}
      <DownloadSection theme={theme} />

      <Footer theme={theme} variant="full" />
    </main>
  );
}
