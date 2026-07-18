import type { Metadata, Viewport } from "next";
import PwaDocumentConfig from "@/components/PwaDocumentConfig";

export const viewport: Viewport = {
  themeColor: "#C9A84C",
  colorScheme: "dark",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "SmartFurni Bed Control",
  title: "Đăng nhập | SmartFurni Bed Control",
  description: "Đăng nhập ứng dụng điều khiển giường công thái học và nệm thông minh SmartFurni.",
  robots: { index: false, follow: false },
  manifest: "/smart-bed-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SmartFurni Bed",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/smartfurni-favicon-v4.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/smartfurni-favicon-v4.png", type: "image/png", sizes: "512x512" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export default function SmartBedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaDocumentConfig manifestHref="/smart-bed-manifest.webmanifest" themeColor="#C9A84C" />
      {children}
    </>
  );
}
