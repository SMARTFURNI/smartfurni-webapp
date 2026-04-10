import { requireCrmAccess } from "@/lib/admin-auth";
import { getCrmProducts } from "@/lib/crm-store";
import PriceListClient from "@/components/crm/PriceListClient";

export const dynamic = "force-dynamic";

export default async function PriceListPage() {
  await requireCrmAccess();
  const products = await getCrmProducts();
  return <PriceListClient products={products} />;
}
