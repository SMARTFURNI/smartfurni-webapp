import { notFound } from "next/navigation";
import { getQuote, getLead } from "@/lib/crm-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import QuoteDetailClient from "@/components/crm/QuoteDetailClient";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quote, settings] = await Promise.all([getQuote(id), getCrmSettings()]);
  if (!quote) notFound();
  const lead = await getLead(quote.leadId);
  return <QuoteDetailClient quote={quote} lead={lead} company={settings.company} />;
}
