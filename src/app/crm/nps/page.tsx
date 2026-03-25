import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import NpsClient from "@/components/crm/nps/NpsClient";

export default async function NpsPage() {
  await requireAdmin();
  return <NpsClient />;
}
