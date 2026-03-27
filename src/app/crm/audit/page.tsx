export const dynamic = "force-dynamic";
import { requireSuperAdminCrm } from "@/lib/admin-auth";
import AuditLogClient from "@/components/crm/audit/AuditLogClient";

export default async function AuditPage() {
  await requireSuperAdminCrm();
  return (
    <div className="p-6" style={{ background: "#f8f9fb", minHeight: "100vh" }}>
      <AuditLogClient />
    </div>
  );
}
