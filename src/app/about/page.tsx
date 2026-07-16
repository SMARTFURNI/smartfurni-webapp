import type { Metadata } from "next";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import AboutClient from "@/components/landing/AboutClient";
import { absoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giới thiệu | SmartFurni",
  description: "Tìm hiểu về SmartFurni — thương hiệu nội thất thông minh hàng đầu Việt Nam với sứ mệnh tái định nghĩa giấc ngủ.",
  alternates: { canonical: absoluteUrl("/about") },
  openGraph: {
    title: "Giới thiệu SmartFurni — Tái định nghĩa giấc ngủ Việt Nam",
    description: "Tìm hiểu về SmartFurni — thương hiệu nội thất thông minh hàng đầu Việt Nam.",
    type: "website",
    url: absoluteUrl("/about"),
  },
};

export default function AboutPage() {
  const theme = getTheme();
  return (
    <main className="sf-site-gradient-bg min-h-screen bg-[#0D0B00] text-[#F5EDD6]">
      <Navbar theme={theme} />
      <AboutClient theme={theme} />
    </main>
  );
}
