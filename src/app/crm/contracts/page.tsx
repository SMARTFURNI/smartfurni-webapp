import { requireCrmAccess } from "@/lib/admin-auth";
import ContractsClient from "@/components/crm/contracts/ContractsClient";
export const dynamic = "force-dynamic";
export default async function ContractsPage() {
  await requireCrmAccess();
  return <ContractsClient />;
}
