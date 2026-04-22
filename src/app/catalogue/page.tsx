import { Metadata } from "next";
import CataloguePublicViewer from "@/components/catalogue/CataloguePublicViewer";
import { loadCatalogueState } from "@/lib/catalogue-state-store";
import { getCrmProducts } from "@/lib/crm-store";

export const metadata: Metadata = {
  title: "Catalogue Sản Phẩm | SmartFurni",
  description: "Xem catalogue sản phẩm SmartFurni — Giường Công Thái Học & Sofa Giường Đa Năng cao cấp. Đầy đủ thông số kỹ thuật, bảng giá và hình ảnh thực tế.",
};

export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  const [slides, products] = await Promise.all([
    loadCatalogueState().catch(() => null),
    getCrmProducts(true).catch(() => []),
  ]);

  return (
    <CataloguePublicViewer
      initialSlides={slides ?? []}
      initialProducts={products}
    />
  );
}
