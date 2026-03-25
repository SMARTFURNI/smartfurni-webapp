import { requireCrmAccess } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export default async function CrmTasksPage() {
  await requireCrmAccess();
  // Redirect to leads list which contains task management
  redirect("/crm/leads");
}
