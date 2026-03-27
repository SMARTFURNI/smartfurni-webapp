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
      {/* Footer */}
      <footer
        style={{ backgroundColor: theme.footer.bgColor, borderTopColor: theme.colors.border }}
        className="border-t py-8 px-6 mt-16"
      >
        <div style={{ maxWidth: theme.layout.maxWidth }} className="mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
              className="w-6 h-6 rounded flex items-center justify-center"
            >
              <span style={{ color: theme.colors.background }} className="font-bold text-xs">
                {theme.footer.companyName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span style={{ color: theme.colors.primary }} className="font-bold text-sm tracking-widest">
              {theme.footer.companyName.toUpperCase()}
            </span>
          </div>
          <p style={{ color: theme.footer.textColor }} className="text-xs opacity-40">
            {theme.footer.copyrightText}
          </p>
        </div>
      </footer>
    </main>
  );
}
