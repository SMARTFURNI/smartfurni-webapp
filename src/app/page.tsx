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
import { getCatalogues } from "@/lib/catalogue-store";
import { initHomepageProductConfig, getHomepageProducts, getHomepageProductConfigAsync } from "@/lib/homepage-products-store";

export const dynamic = "force-dynamic";

// ─── Video config ─────────────────────────────────────────────────────────────
// Thay VIDEO_ID bằng YouTube ID thực tế (phần sau v= trong link YouTube)
// Ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ → VIDEO_ID = "dQw4w9WgXcQ"
const HOMEPAGE_VIDEO_ID = ""; // TODO: điền YouTube ID vào đây
const HOMEPAGE_VIDEO_TITLE = "Giường Điều Khiển Thông Minh SmartFurni — Xem Thực Tế";

export default async function HomePage() {
  // Init DB để load sản phẩm từ CRM
  await initHomepageProductConfig();
  const theme = await getThemeAsync();
  const homepageConfig = await getHomepageProductConfigAsync();
  // Lấy sản phẩm từ CRM (đã lọc theo config homepage)
  const products = getHomepageProducts();
  const { banner } = theme;
  const publishedCatalogues = await getCatalogues(true);

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

      {/* Video section — hiển thị khi có HOMEPAGE_VIDEO_ID */}
      <VideoSection
        theme={theme}
        videoId={HOMEPAGE_VIDEO_ID}
        videoTitle={HOMEPAGE_VIDEO_TITLE}
      />

      {/* Sản phẩm — đồng bộ từ CRM, giao diện giống landing page */}
      <StaticProductsSection
        theme={theme}
        products={products}
        sectionTitle={homepageConfig.sectionTitle}
        sectionSubtitle={homepageConfig.sectionSubtitle}
      />

      <CatalogueSection catalogues={publishedCatalogues} />
      <FeaturesSection />
      <TestimonialsSection theme={theme} />
      <DownloadSection />
      <Footer theme={theme} variant="full" />
    </main>
  );
}
