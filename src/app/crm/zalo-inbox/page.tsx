export const dynamic = "force-dynamic";
import { requireCrmAccess } from "@/lib/admin-auth";
import ZaloInboxClient from "@/components/crm/zalo-inbox/ZaloInboxClient";

export default async function ZaloInboxPage() {
  await requireCrmAccess();
  return <ZaloInboxClient />;
}
