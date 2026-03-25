import { requireAdmin } from "@/lib/admin-auth";
import { getCrmSettings } from "@/lib/crm-settings-store";
import CrmSettingsClient from "@/components/crm/settings/CrmSettingsClient";

export const dynamic = "force-dynamic";

export default async function CrmSettingsPage() {
  await requireAdmin();
  const settings = await getCrmSettings();
  return <CrmSettingsClient initialSettings={settings} />;
}
