import type { Metadata } from "next";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import ContactClient from "@/components/landing/ContactClient";
import { absoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liên hệ | SmartFurni",
  description: "Liên hệ với đội ngũ tư vấn SmartFurni. Hotline, email, showroom và form liên hệ trực tuyến.",
  alternates: { canonical: absoluteUrl("/contact") },
  openGraph: {
    title: "Liên hệ SmartFurni — Tư vấn miễn phí",
    description: "Liên hệ với đội ngũ tư vấn SmartFurni. Hotline 1900 1234, showroom Hà Nội & TP.HCM.",
    type: "website",
    url: absoluteUrl("/contact"),
  },
};

export default function ContactPage() {
  const theme = getTheme();
  return (
    <main className="sf-site-gradient-bg min-h-screen bg-[#0D0B00] text-[#F5EDD6]">
      <Navbar theme={theme} />
      <ContactClient theme={theme} />
    </main>
  );
}
