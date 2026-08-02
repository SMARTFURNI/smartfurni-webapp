import { requireCrmAccess } from "@/lib/admin-auth";
import ZaloOAClient from "@/components/crm/zalo/ZaloOAClient";
export const dynamic = "force-dynamic";
export default async function ZaloPage() {
  const session = await requireCrmAccess();
  return <ZaloOAClient isAdmin={session.isAdmin} />;
}
