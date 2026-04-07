export const dynamic = "force-dynamic";
import { requireSuperAdminCrm } from "@/lib/admin-auth";
import RolesManagementClient from "@/components/crm/roles/RolesManagementClient";

export default async function RolesPage() {
  await requireSuperAdminCrm();
  return <RolesManagementClient />;
}
