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

export const dynamic = "force-dynamic";
const SMARTFURNI_GOOGLE_ADS_ID = "AW-16742362454";

export async function generateMetadata(): Promise<Metadata> {
  await initDbOnce();
  const theme = getTheme();
  return {
    title: theme.seo.siteTitle || "SmartFurni — Giường Điều Khiển Thông Minh",
    description: theme.seo.defaultDescription || "Điều khiển giường thông minh SmartFurni với công nghệ Bluetooth, preset tư thế, đèn LED và theo dõi giấc ngủ.",
    keywords: ["giường thông minh", "smart bed", "SmartFurni", "điều khiển giường", "nội thất thông minh"],
    openGraph: {
      title: theme.seo.siteTitle || "SmartFurni — Giường Điều Khiển Thông Minh",
      description: theme.seo.defaultDescription || "Trải nghiệm giấc ngủ hoàn hảo với công nghệ điều khiển thông minh",
      type: "website",
      images: theme.seo.ogImage ? [theme.seo.ogImage] : [],
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
          <Suspense fallback={null}><NavigationProgress /></Suspense>
          {children}
          <FloatingSupport />
          <ScrollToTop />
          <AnalyticsTracker />
        </CartProvider>
      </body>
    </html>
  );
}
