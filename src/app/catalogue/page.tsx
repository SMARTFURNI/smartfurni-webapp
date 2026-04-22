import { Metadata } from "next";
import CataloguePublicViewer from "@/components/catalogue/CataloguePublicViewer";

export const metadata: Metadata = {
  title: "Catalogue Sản Phẩm | SmartFurni",
  description: "Xem catalogue sản phẩm SmartFurni — Giường Công Thái Học & Sofa Giường Đa Năng cao cấp. Đầy đủ thông số kỹ thuật, bảng giá và hình ảnh thực tế.",
};

export const dynamic = "force-dynamic";

async function getCatalogueData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/public/catalogue`, { cache: "no-store" });
    if (!res.ok) return { slides: [], products: [] };
    const data = await res.json();
    return { slides: data.slides ?? [], products: data.products ?? [] };
  } catch {
    return { slides: [], products: [] };
  }
}

export default async function CataloguePage() {
  const { slides, products } = await getCatalogueData();
  return <CataloguePublicViewer initialSlides={slides} initialProducts={products} />;
}
