import { requireCrmAccess } from "@/lib/admin-auth";
import HotlineInboundClient from "@/components/crm/HotlineInboundClient";
export const dynamic = "force-dynamic";

export default async function HotlineInboundPage() {
  await requireCrmAccess();
  return <HotlineInboundClient />;
}
