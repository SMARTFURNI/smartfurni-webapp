import { Metadata } from "next";
import { getCatalogues } from "@/lib/catalogue-store";
import CatalogueListClient from "@/components/catalogue/CatalogueListClient";

export const metadata: Metadata = {
  title: "Catalogue B2B | SmartFurni",
  description: "Xem catalogue sản phẩm SmartFurni dành cho đối tác B2B. Khám phá bộ sưu tập giường công thái học cao cấp.",
};

export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  const catalogues = await getCatalogues(true);
  return <CatalogueListClient catalogues={catalogues} />;
}
