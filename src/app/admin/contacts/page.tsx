import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Khách hàng tiềm năng" };

export default async function LegacyContactsPage() {
  await requireAdmin();
  redirect("/crm/data-pool");
}
