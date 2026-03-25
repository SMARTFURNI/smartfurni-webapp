import { requireAdmin } from "@/lib/admin-auth";
import AuditLogClient from "@/components/crm/audit/AuditLogClient";

export default async function AuditPage() {
  await requireAdmin();
  return (
    <div className="p-6" style={{ background: "#080806", minHeight: "100vh" }}>
      <AuditLogClient />
    </div>
  );
}
