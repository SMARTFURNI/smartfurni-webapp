import { requireCrmAccess } from "@/lib/admin-auth";
import { getCrmProducts } from "@/lib/crm-store";
import CatalogueClient from "@/components/crm/CatalogueClient";
export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  await requireCrmAccess();
  const products = await getCrmProducts();
  return <CatalogueClient products={products} />;
}
