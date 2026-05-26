import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "So sánh sản phẩm | SmartFurni",
  description: "So sánh chi tiết các dòng giường thông minh SmartFurni — Basic, Pro, Elite.",
};

export default function ComparePage() {
  redirect("/products/compare");
}
