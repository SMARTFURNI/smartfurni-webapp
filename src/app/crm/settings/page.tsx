import { Suspense } from "react";
import { requireSuperAdminCrm } from "@/lib/admin-auth";
import { getCrmSettings } from "@/lib/crm-settings-store";
import CrmSettingsClient from "@/components/crm/settings/CrmSettingsClient";

export const dynamic = "force-dynamic";

export default async function CrmSettingsPage() {
  await requireSuperAdminCrm();
  const settings = await getCrmSettings();
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
      </div>
    }>
      <CrmSettingsClient initialSettings={settings} />
    </Suspense>
  );
}
