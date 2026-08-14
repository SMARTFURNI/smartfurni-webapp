export const dynamic = "force-dynamic";
import { requireSuperAdminCrm } from "@/lib/admin-auth";
import AutomationSettingsClient from "@/components/crm/automation/AutomationSettingsClient";

export default async function AutomationPage() {
  await requireSuperAdminCrm();
  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8" style={{ background: "#f3f6fa", minHeight: "100%" }}>
      <AutomationSettingsClient />
    </div>
  );
}
