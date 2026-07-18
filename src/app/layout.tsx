import type { Metadata } from "next";
import "./globals.css";
import { getTheme, generateCSSVariables } from "@/lib/theme-store";
import { CartProvider } from "@/lib/cart-context";
import FloatingSupport from "@/components/landing/FloatingSupport";
import ScrollToTop from "@/components/landing/ScrollToTop";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { initDbOnce } from "@/lib/db-init";
import { Suspense } from "react";
import NavigationProgress from "@/components/NavigationProgress";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema, productCategoryNavigationSchema, websiteSchema } from "@/lib/seo-schema";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import { PRODUCT_FAMILIES } from "@/lib/product-families";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const dynamic = "force-dynamic";
const SMARTFURNI_GOOGLE_ADS_ID = "AW-16742362454";

export async function generateMetadata(): Promise<Metadata> {
  await initDbOnce();
  const theme = getTheme();
  const defaultSeoImage = absoluteUrl("/uploads/products/smartfurni-bed-main.webp");
  const seoImage = theme.seo.ogImage || defaultSeoImage;
  return {
    metadataBase: new URL(SITE_URL),
    title: theme.seo.siteTitle || "SmartFurni — Giường Điều Khiển Thông Minh",
    description: theme.seo.defaultDescription || "Điều khiển giường thông minh SmartFurni với công nghệ Bluetooth, preset tư thế, đèn LED và theo dõi giấc ngủ.",
    openGraph: {
      title: theme.seo.siteTitle || "SmartFurni — Giường Điều Khiển Thông Minh",
      description: theme.seo.defaultDescription || "Trải nghiệm giấc ngủ hoàn hảo với công nghệ điều khiển thông minh",
      type: "website",
      url: SITE_URL,
      siteName: "SmartFurni",
      images: [{ url: seoImage, width: 1252, height: 835, alt: "Giải pháp giấc ngủ thông minh SmartFurni" }],
    },
    twitter: {
      card: "summary_large_image",
      title: theme.seo.siteTitle || "SmartFurni — Giường Điều Khiển Thông Minh",
      description: theme.seo.defaultDescription || "Trải nghiệm giấc ngủ hoàn hảo với công nghệ điều khiển thông minh",
      images: [seoImage],
    },
    alternates: { canonical: SITE_URL },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/smartfurni-favicon-v4-32.png", type: "image/png", sizes: "32x32" },
        { url: "/smartfurni-favicon-v4.png", type: "image/png", sizes: "512x512" },
      ],
      shortcut: "/smartfurni-favicon-v4-32.png",
      apple: [{ url: "/smartfurni-favicon-v4.png", type: "image/png", sizes: "512x512" }],
    },
    verification: {
      google: theme.seo.googleSiteVerification?.trim() || process.env.GOOGLE_SITE_VERIFICATION || undefined,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await initDbOnce();
  const theme = getTheme();
  const cssVars = generateCSSVariables(theme);
  const configuredAnalyticsId = theme.seo.googleAnalyticsId?.trim();
  const shouldRenderConfiguredAnalytics =
    configuredAnalyticsId && configuredAnalyticsId !== SMARTFURNI_GOOGLE_ADS_ID;

  return (
    <html lang="vi" className="scroll-smooth">
      <head>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <JsonLd data={productCategoryNavigationSchema(PRODUCT_FAMILIES)} />
        <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
        {/* Google Ads tag SmartFurni 02: gắn toàn site để phủ trang chủ và các landing page. */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${SMARTFURNI_GOOGLE_ADS_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${SMARTFURNI_GOOGLE_ADS_ID}');`,
          }}
        />
        {shouldRenderConfiguredAnalytics && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${configuredAnalyticsId}`} />
            <script dangerouslySetInnerHTML={{ __html: `gtag('config','${configuredAnalyticsId}');` }} />
          </>
        )}
      </head>
      <body
        style={{
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          fontFamily: `${theme.typography.fontFamily}, sans-serif`,
        }}
        className="antialiased"
      >
        <CartProvider>
          <ServiceWorkerRegistration />
          <Suspense fallback={null}><NavigationProgress /></Suspense>
          {children}
          <FloatingSupport />
          <ScrollToTop />
          <AnalyticsTracker />
          {configuredAnalyticsId?.startsWith("G-") && <WebVitalsReporter analyticsId={configuredAnalyticsId} />}
        </CartProvider>
      </body>
    </html>
  );
}
