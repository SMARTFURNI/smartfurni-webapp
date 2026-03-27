import { requireCrmAccess } from "@/lib/admin-auth";
import ZaloOAClient from "@/components/crm/zalo/ZaloOAClient";
export const dynamic = "force-dynamic";
export default async function ZaloPage() {
  await requireCrmAccess();
  return <ZaloOAClient />;
}
