import type { Metadata } from "next";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import AboutClient from "@/components/landing/AboutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giới thiệu | SmartFurni",
  description: "Tìm hiểu về SmartFurni — thương hiệu nội thất thông minh hàng đầu Việt Nam với sứ mệnh tái định nghĩa giấc ngủ.",
  keywords: ["SmartFurni", "về chúng tôi", "nội thất thông minh Việt Nam", "giường thông minh"],
  openGraph: {
    title: "Giới thiệu SmartFurni — Tái định nghĩa giấc ngủ Việt Nam",
    description: "Tìm hiểu về SmartFurni — thương hiệu nội thất thông minh hàng đầu Việt Nam.",
    type: "website",
    url: "https://smartfurni.vn/about",
  },
};

export default function AboutPage() {
  const theme = getTheme();
  return (
    <main className="min-h-screen bg-[#0D0B00] text-[#F5EDD6]">
      <Navbar theme={theme} />
      <AboutClient theme={theme} />
    </main>
  );
}
