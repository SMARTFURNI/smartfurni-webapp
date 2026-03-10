import type { Metadata } from "next";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import ContactClient from "@/components/landing/ContactClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liên hệ | SmartFurni",
  description: "Liên hệ với đội ngũ tư vấn SmartFurni. Hotline, email, showroom và form liên hệ trực tuyến.",
  keywords: ["liên hệ SmartFurni", "tư vấn giường thông minh", "hotline SmartFurni", "showroom"],
  openGraph: {
    title: "Liên hệ SmartFurni — Tư vấn miễn phí",
    description: "Liên hệ với đội ngũ tư vấn SmartFurni. Hotline 1900 1234, showroom Hà Nội & TP.HCM.",
    type: "website",
    url: "https://smartfurni.vn/contact",
  },
};

export default function ContactPage() {
  const theme = getTheme();
  return (
    <main className="min-h-screen bg-[#0D0B00] text-[#F5EDD6]">
      <Navbar theme={theme} />
      <ContactClient theme={theme} />
    </main>
  );
}
