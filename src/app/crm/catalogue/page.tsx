import { requireCrmAccess } from "@/lib/admin-auth";
import { getCrmProducts } from "@/lib/crm-store";
import { loadCatalogueState } from "@/lib/catalogue-state-store";
import CatalogueClient from "@/components/crm/CatalogueClient";
export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  await requireCrmAccess();
  const [products, savedSlides] = await Promise.all([
    getCrmProducts(),
    loadCatalogueState(),
  ]);
  return <CatalogueClient products={products} initialSlides={savedSlides} />;
}
