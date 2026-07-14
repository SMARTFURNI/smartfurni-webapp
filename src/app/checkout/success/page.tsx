import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import CheckoutSuccessClient from "@/components/landing/CheckoutSuccessClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Đặt hàng thành công | SmartFurni",
  description: "Cảm ơn bạn đã đặt hàng tại SmartFurni.",
};

export default function CheckoutSuccessPage() {
  const theme = getTheme();
  return (
    <main className="sf-site-gradient-bg" style={{ minHeight: "100vh", backgroundColor: theme.colors.background }}>
      <Navbar theme={theme} />
      <CheckoutSuccessClient theme={theme} />
    </main>
  );
}
