import { requireSuperAdminCrm } from "@/lib/admin-auth";
import { getEmailCampaigns, getEmailTemplates } from "@/lib/crm-email-store";
import EmailMarketingClient from "@/components/crm/email/EmailMarketingClient";

export const dynamic = "force-dynamic";

export default async function EmailMarketingPage() {
  await requireSuperAdminCrm();

  const [campaigns, templates] = await Promise.all([
    getEmailCampaigns(),
    getEmailTemplates(),
  ]);

  return <EmailMarketingClient initialCampaigns={campaigns} initialTemplates={templates} />;
}
