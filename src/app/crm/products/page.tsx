import { getCrmProducts } from "@/lib/crm-store";
import CrmProductsClient from "@/components/crm/CrmProductsClient";

export const dynamic = "force-dynamic";

export default async function CrmProductsPage() {
  const products = await getCrmProducts();
  return <CrmProductsClient initialProducts={products} />;
}
