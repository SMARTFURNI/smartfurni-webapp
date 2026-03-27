import { getCrmSettings } from "@/lib/crm-settings-store";
import FacebookIntegrationClient from "./FacebookIntegrationClient";

export const dynamic = "force-dynamic";

export default async function FacebookIntegrationPage() {
  const settings = await getCrmSettings();
  return <FacebookIntegrationClient initialSettings={settings} />;
}
