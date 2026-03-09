import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartFurni — Giường Điều Khiển Thông Minh",
  description: "Điều khiển giường thông minh SmartFurni với công nghệ Bluetooth, preset tư thế, đèn LED và theo dõi giấc ngủ.",
  keywords: ["giường thông minh", "smart bed", "SmartFurni", "điều khiển giường", "nội thất thông minh"],
  openGraph: {
    title: "SmartFurni — Giường Điều Khiển Thông Minh",
    description: "Trải nghiệm giấc ngủ hoàn hảo với công nghệ điều khiển thông minh",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className="bg-[#0D0B00] text-[#F5EDD6] antialiased">{children}</body>
    </html>
  );
}
