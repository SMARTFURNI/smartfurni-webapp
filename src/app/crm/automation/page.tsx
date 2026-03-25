import { requireAdmin } from "@/lib/admin-auth";
import AutomationSettingsClient from "@/components/crm/automation/AutomationSettingsClient";

export default async function AutomationPage() {
  await requireAdmin();
  return (
    <div className="p-6" style={{ background: "#080806", minHeight: "100vh" }}>
      <AutomationSettingsClient />
    </div>
  );
}
