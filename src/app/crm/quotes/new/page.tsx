import { getCrmProducts, getLeads } from "@/lib/crm-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import QuoteEditorClient from "@/components/crm/QuoteEditorClient";
export const dynamic = "force-dynamic";
export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;
  const [products, leads, settings] = await Promise.all([
    getCrmProducts(true),
    getLeads(),
    getCrmSettings(),
  ]);
  const lead = leadId ? leads.find(l => l.id === leadId) : undefined;
  return <QuoteEditorClient products={products} leads={leads} defaultLead={lead} defaultTiers={settings.discountTiers} />;
}
