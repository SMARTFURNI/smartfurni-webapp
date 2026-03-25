import { getQuotes } from "@/lib/crm-store";
import QuotesListClient from "@/components/crm/QuotesListClient";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const quotes = await getQuotes();
  return <QuotesListClient initialQuotes={quotes} />;
}
