import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DownloadSection from "@/components/landing/DownloadSection";
import Footer from "@/components/landing/Footer";
import { getTheme } from "@/lib/theme-store";
import ProductsSection from "@/components/landing/ProductsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import { getHomepageProducts, getHomepageProductConfig } from "@/lib/homepage-products-store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const theme = getTheme();
  const products = getHomepageProducts();
  const homepageConfig = getHomepageProductConfig();
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
      <ProductsSection products={products} theme={theme} config={homepageConfig} />
      <FeaturesSection />
      <TestimonialsSection theme={theme} />
      <DownloadSection />
      <Footer theme={theme} variant="full" />
    </main>
  );
}
