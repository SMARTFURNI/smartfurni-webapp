import { requireCrmAccess } from "@/lib/admin-auth";
import NpsClient from "@/components/crm/nps/NpsClient";
export const dynamic = "force-dynamic";
export default async function NpsPage() {
  await requireCrmAccess();
  return <NpsClient />;
}
