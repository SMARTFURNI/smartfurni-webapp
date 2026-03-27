import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogueById } from "@/lib/catalogue-store";
import CatalogueViewClient from "@/components/catalogue/CatalogueViewClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const catalogue = await getCatalogueById(id);
  if (!catalogue || catalogue.status !== "published") {
    return { title: "Catalogue | SmartFurni" };
  }
  return {
    title: `${catalogue.title} | SmartFurni Catalogue`,
    description: catalogue.description || "Catalogue sản phẩm SmartFurni B2B",
  };
}

export const dynamic = "force-dynamic";

export default async function CatalogueViewPage({ params }: Props) {
  const { id } = await params;
  const catalogue = await getCatalogueById(id);
  if (!catalogue || catalogue.status !== "published") {
    notFound();
  }
  return <CatalogueViewClient catalogue={catalogue} />;
}
