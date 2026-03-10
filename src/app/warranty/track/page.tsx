import { getTheme } from "@/lib/theme-store";
import WarrantyTrackerClient from "@/components/landing/WarrantyTrackerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Theo dõi đơn hàng & Bảo hành | SmartFurni",
  description: "Tra cứu trạng thái đơn hàng và thông tin bảo hành sản phẩm SmartFurni. Theo dõi giao hàng real-time.",
  openGraph: {
    title: "Theo dõi đơn hàng & Bảo hành — SmartFurni",
    description: "Nhập mã đơn hàng để xem trạng thái giao hàng và thông tin bảo hành.",
    type: "website",
  },
};

export default function WarrantyTrackPage() {
  const theme = getTheme();
  return <WarrantyTrackerClient theme={theme} />;
}
