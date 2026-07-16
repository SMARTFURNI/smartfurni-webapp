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
  const bedProducts = products.filter((product) => {
    const normalizedName = product.name.toLocaleLowerCase("vi");
    return !normalizedName.includes("nệm") && !normalizedName.includes("nem ");
  });
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

      {/* 3. Dòng nệm điện thông minh */}
      <StaticProductsSection
        theme={theme}
        products={mattressProducts}
        sectionTitle={"Nệm Điện Thông Minh\nSmartFurni"}
        sectionSubtitle="Nâng đỡ linh hoạt theo từng tư thế, cá nhân hóa trải nghiệm nghỉ ngơi cho mỗi thành viên trong gia đình."
      />

      {/* 4. Dòng giường công thái học */}
      <StaticProductsSection
        theme={theme}
        products={bedProducts}
        sectionTitle={homepageConfig.sectionTitle}
        sectionSubtitle={homepageConfig.sectionSubtitle}
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
