import type { Metadata } from "next";
import "./globals.css";
import { getTheme, generateCSSVariables } from "@/lib/theme-store";
import { CartProvider } from "@/lib/cart-context";
import FloatingSupport from "@/components/landing/FloatingSupport";
import ScrollToTop from "@/components/landing/ScrollToTop";
import AnalyticsTracker from "@/components/AnalyticsTracker";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = getTheme();
  const cssVars = generateCSSVariables(theme);

  return (
    <html lang="vi" className="scroll-smooth">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
        {theme.seo.googleAnalyticsId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${theme.seo.googleAnalyticsId}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${theme.seo.googleAnalyticsId}');` }} />
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
          {children}
          <FloatingSupport />
          <ScrollToTop />
          <AnalyticsTracker />
        </CartProvider>
      </body>
    </html>
  );
}
