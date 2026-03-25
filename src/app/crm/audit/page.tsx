import { requireSuperAdminCrm } from "@/lib/admin-auth";
import AuditLogClient from "@/components/crm/audit/AuditLogClient";

export default async function AuditPage() {
  await requireSuperAdminCrm();
  return (
    <div className="p-6" style={{ background: "#080806", minHeight: "100vh" }}>
      <AuditLogClient />
    </div>
  );
}
