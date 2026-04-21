import type { Metadata } from "next";
import { getCrmProducts } from "@/lib/crm-store";
import type { CrmProduct } from "@/lib/crm-types";
import LpShowroomNemClient from "./LpShowroomNemClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hợp tác B2B Showroom Nệm | SmartFurni — Giường Công Thái Học Điều Chỉnh Điện",
  description:
    "Trở thành đối tác phân phối độc quyền Giường Công Thái Học Điều Chỉnh Điện SmartFurni. Biên lợi nhuận cao, hỗ trợ trưng bày, đào tạo bán hàng. Đăng ký ngay.",
  keywords: [
    "đối tác showroom nệm",
    "giường công thái học điều chỉnh điện",
    "hợp tác B2B SmartFurni",
    "phân phối giường thông minh",
    "kinh doanh nội thất thông minh",
  ],
  openGraph: {
    title: "Hợp tác B2B Showroom Nệm | SmartFurni",
    description:
      "Mở rộng danh mục sản phẩm với Giường Công Thái Học Điều Chỉnh Điện SmartFurni. Biên lợi nhuận cao, hỗ trợ trưng bày toàn diện.",
    type: "website",
    url: "https://smartfurni.vn/lp/doi-tac-showroom-nem",
    images: [{ url: "https://smartfurni.vn/og-b2b.jpg", width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export default async function LpShowroomNemPage() {
  // Lấy sản phẩm giường công thái học từ CRM
  const allProducts = await getCrmProducts(true);
  const ergonomicBeds = allProducts.filter(
    (p: CrmProduct) => p.category === "ergonomic_bed" && p.isActive
  );

  return <LpShowroomNemClient products={ergonomicBeds} />;
}
