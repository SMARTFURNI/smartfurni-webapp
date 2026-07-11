import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import CheckoutClient from "@/components/landing/CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Đặt hàng | SmartFurni",
  description: "Hoàn tất đơn hàng của bạn tại SmartFurni.",
};

export default function CheckoutPage() {
  const theme = getTheme();
  return (
    <main style={{ minHeight: "100vh", backgroundColor: theme.colors.background }}>
      <Navbar theme={theme} />
      <CheckoutClient theme={theme} />
    </main>
  );
}
