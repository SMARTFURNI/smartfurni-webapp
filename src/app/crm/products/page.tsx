import { getCrmProducts } from "@/lib/crm-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import CrmProductsClient from "@/components/crm/CrmProductsClient";

export const dynamic = "force-dynamic";

export default async function CrmProductsPage() {
  const [products, settings] = await Promise.all([getCrmProducts(), getCrmSettings()]);
  return <CrmProductsClient initialProducts={products} defaultTiers={settings.discountTiers} />;
}
