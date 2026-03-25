import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export default async function CrmTasksPage() {
  await requireAdmin();
  // Redirect to leads list which contains task management
  redirect("/crm/leads");
}
