import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DownloadSection from "@/components/landing/DownloadSection";
import Footer from "@/components/landing/Footer";
import { getThemeAsync } from "@/lib/theme-store";
import StaticProductsSection from "@/components/landing/StaticProductsSection";
import VideoSection from "@/components/landing/VideoSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CatalogueSection from "@/components/landing/CatalogueSection";
import { initHomepageProductConfig, getHomepageProducts, getHomepageProductConfigAsync } from "@/lib/homepage-products-store";

export const dynamic = "force-dynamic";
// Video config is now managed via theme.videoSection (Admin → Cài đặt giao diện → Video)

export default async function HomePage() {
  // Init DB để load sản phẩm từ CRM
  await initHomepageProductConfig();
  const theme = await getThemeAsync();
  const homepageConfig = await getHomepageProductConfigAsync();
  // Lấy sản phẩm từ CRM (đã lọc theo config homepage)
  const products = getHomepageProducts();
  const { banner } = theme;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: theme.colors.background }}>
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

      <Navbar theme={theme} />
      <HeroSection theme={theme} />

      {/* Video section — quản lý qua Admin → Cài đặt giao diện → Video */}
      <VideoSection theme={theme} />

      {/* Sản phẩm — đồng bộ từ CRM, giao diện giống landing page */}
      <StaticProductsSection
        theme={theme}
        products={products}
        sectionTitle={homepageConfig.sectionTitle}
        sectionSubtitle={homepageConfig.sectionSubtitle}
      />

      <CatalogueSection />
      <FeaturesSection theme={theme} />
      <TestimonialsSection theme={theme} />
      <DownloadSection theme={theme} />
      <Footer theme={theme} variant="full" />
    </main>
  );
}
