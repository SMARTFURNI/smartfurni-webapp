import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import CheckoutClient from "@/components/landing/CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Đặt hàng | SmartFurni",
  description: "Hoàn tất đơn hàng của bạn tại SmartFurni.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  const theme = getTheme();
  return (
    <main className="sf-site-gradient-bg" style={{ minHeight: "100vh", backgroundColor: theme.colors.background }}>
      <Navbar theme={theme} />
      <CheckoutClient theme={theme} />
    </main>
  );
}
