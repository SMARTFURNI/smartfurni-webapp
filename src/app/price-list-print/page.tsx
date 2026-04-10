import { requireCrmAccess } from "@/lib/admin-auth";
import { getCrmProducts } from "@/lib/crm-store";
import PriceListPrintPage from "@/components/crm/PriceListPrintPage";

export const dynamic = "force-dynamic";

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireCrmAccess();
  const products = await getCrmProducts();
  const { category } = await searchParams;
  return <PriceListPrintPage products={products} category={category ?? "all"} />;
}
