import type { Metadata, Viewport } from "next";
import PwaDocumentConfig from "@/components/PwaDocumentConfig";

export const viewport: Viewport = {
  themeColor: "#0B111B",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  applicationName: "SmartFurni CRM",
  title: "Đăng nhập | SmartFurni CRM",
  description: "Đăng nhập ứng dụng quản lý khách hàng SmartFurni.",
  robots: { index: false, follow: false },
  manifest: "/crm-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SmartFurni CRM",
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

export default function CrmLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaDocumentConfig manifestHref="/crm-manifest.webmanifest" />
      {children}
    </>
  );
}
