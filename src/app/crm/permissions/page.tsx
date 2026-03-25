import { requireAdmin } from "@/lib/admin-auth";
import PermissionsClient from "@/components/crm/audit/PermissionsClient";

export default async function PermissionsPage() {
  await requireAdmin();
  return (
    <div className="p-6" style={{ background: "#080806", minHeight: "100vh" }}>
      <PermissionsClient />
    </div>
  );
}
