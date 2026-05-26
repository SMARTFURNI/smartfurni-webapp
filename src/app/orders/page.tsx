import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Theo dõi đơn hàng | SmartFurni",
  description: "Tra cứu trạng thái đơn hàng SmartFurni. Nhập mã đơn hàng để xem trạng thái giao hàng.",
};

export default function OrdersPage() {
  redirect("/warranty/track");
}
