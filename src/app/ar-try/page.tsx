import { getAllProducts } from "@/lib/product-store";
import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ARTryAtHomeClient from "@/components/landing/ARTryAtHomeClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AR Thử tại nhà | SmartFurni",
  description: "Thử giường SmartFurni trong phòng ngủ của bạn bằng camera điện thoại. Xem kích thước và màu sắc thực tế trước khi đặt hàng.",
  openGraph: {
    title: "AR Thử giường tại nhà — SmartFurni",
    description: "Công nghệ AR giúp bạn xem trước giường SmartFurni trong không gian thực tế.",
    type: "website",
  },
};

export default function ARTryPage() {
  const theme = getTheme();
  const products = getAllProducts().filter((p) => p.category !== "accessory");
  return (
    <main className="min-h-screen bg-[#0D0B00]">
      <Navbar theme={theme} />
      <ARTryAtHomeClient products={products} theme={theme} />
      <Footer theme={theme} variant="minimal" />
    </main>
  );
}
