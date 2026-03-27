export const dynamic = "force-dynamic";
import { requireSuperAdminCrm } from "@/lib/admin-auth";
import AutomationSettingsClient from "@/components/crm/automation/AutomationSettingsClient";

export default async function AutomationPage() {
  await requireSuperAdminCrm();
  return (
    <div className="p-6" style={{ background: "#f8f9fb", minHeight: "100vh" }}>
      <AutomationSettingsClient />
    </div>
  );
}
