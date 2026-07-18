import type { Metadata, Viewport } from "next";
import PwaDocumentConfig from "@/components/PwaDocumentConfig";
import "./admin-theme.css";

export const viewport: Viewport = {
  themeColor: "#0B111B",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  applicationName: "SmartFurni Admin",
  title: {
    template: "%s | SmartFurni Admin",
    default: "Dashboard | SmartFurni Admin",
  },
  description: "Ứng dụng quản trị website và vận hành SmartFurni.",
  robots: { index: false, follow: false },
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SmartFurni Admin",
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sf-admin-shell min-h-screen text-white">
      <PwaDocumentConfig manifestHref="/admin-manifest.webmanifest" />
      <div className="sf-admin-ambient" aria-hidden="true" />
      <div className="relative z-[1] min-h-screen">{children}</div>
    </div>
  );
}
