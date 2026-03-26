export const dynamic = "force-dynamic";
import { requireSuperAdminCrm } from "@/lib/admin-auth";
import PermissionsClient from "@/components/crm/audit/PermissionsClient";

export default async function PermissionsPage() {
  await requireSuperAdminCrm();
  return (
    <div className="p-6" style={{ background: "#f8f9fb", minHeight: "100vh" }}>
      <PermissionsClient />
    </div>
  );
}
