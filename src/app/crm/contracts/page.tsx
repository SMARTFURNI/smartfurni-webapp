import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import ContractsClient from "@/components/crm/contracts/ContractsClient";

export default async function ContractsPage() {
  await requireAdmin();
  return <ContractsClient />;
}
