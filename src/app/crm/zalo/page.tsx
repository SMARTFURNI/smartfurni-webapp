import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import ZaloOAClient from "@/components/crm/zalo/ZaloOAClient";

export default async function ZaloPage() {
  await requireAdmin();
  return <ZaloOAClient />;
}
