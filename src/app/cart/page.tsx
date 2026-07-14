import { getTheme } from "@/lib/theme-store";
import { getAllProducts } from "@/lib/product-store";
import Navbar from "@/components/landing/Navbar";
import CartClient from "@/components/landing/CartClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Giỏ hàng | SmartFurni",
  description: "Xem và quản lý giỏ hàng của bạn tại SmartFurni.",
  openGraph: {
    title: "Giỏ hàng | SmartFurni",
    description: "Xem và hoàn tất đơn hàng giường thông minh SmartFurni của bạn.",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function CartPage() {
  const theme = getTheme();
  const upsellProducts = getAllProducts()
    .filter((p) => p.status === "active")
    .slice(0, 6);
  return (
    <main className="sf-site-gradient-bg" style={{ minHeight: "100vh", backgroundColor: theme.colors.background }}>
      <Navbar theme={theme} />
      <CartClient theme={theme} upsellProducts={upsellProducts} />
    </main>
  );
}
