import { getTheme } from "@/lib/theme-store";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import RoomPlannerClient from "@/components/landing/RoomPlannerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Room Planner — Thiết kế phòng ngủ | SmartFurni",
  description: "Công cụ thiết kế phòng ngủ trực tuyến miễn phí. Kéo thả nội thất, thử nghiệm bố cục và tìm ra cách sắp xếp hoàn hảo trước khi đặt hàng.",
  openGraph: {
    title: "Room Planner SmartFurni — Thiết kế phòng ngủ trực tuyến",
    description: "Kéo thả nội thất, thử nghiệm bố cục phòng ngủ miễn phí.",
    type: "website",
  },
};

export default function RoomPlannerPage() {
  const theme = getTheme();
  return (
    <main className="min-h-screen bg-[#0D0B00]">
      <Navbar theme={theme} />
      <RoomPlannerClient theme={theme} />
      <Footer theme={theme} variant="full" />
    </main>
  );
}
