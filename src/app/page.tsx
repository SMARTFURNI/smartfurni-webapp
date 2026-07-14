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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await initHomepageProductConfig();
  const theme = await getThemeAsync();
  const homepageConfig = await getHomepageProductConfigAsync();
  const products = getHomepageProducts();
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

      {/* 3. Dòng sản phẩm — đưa lên trước video thực tế */}
      <StaticProductsSection
        theme={theme}
        products={products}
        sectionTitle={homepageConfig.sectionTitle}
        sectionSubtitle={homepageConfig.sectionSubtitle}
      />

      {/* 4. Video thực tế — tăng tin cậy sau khi khách đã thấy dòng sản phẩm */}
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
