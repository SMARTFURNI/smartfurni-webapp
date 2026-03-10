import { getAllProducts } from "@/lib/product-store";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CompareClient from "@/components/landing/CompareClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "So sánh sản phẩm | SmartFurni",
  description: "So sánh chi tiết các dòng giường thông minh SmartFurni — Basic, Pro, Elite. Tìm sản phẩm phù hợp nhất với nhu cầu và ngân sách của bạn.",
  openGraph: {
    title: "So sánh sản phẩm SmartFurni",
    description: "So sánh chi tiết Basic vs Pro vs Elite — tính năng, thông số, giá cả.",
    type: "website",
  },
};

export default function ComparePage() {
  const theme = getTheme();
  const allProducts = getAllProducts().filter(
    (p) => p.category !== "accessory" && p.status !== "discontinued"
  );
  return (
    <main className="min-h-screen bg-[#0D0B00]">
      <Navbar theme={theme} />
      <CompareClient products={allProducts} theme={theme} />
      <Footer theme={theme} variant="full" />
    </main>
  );
}
