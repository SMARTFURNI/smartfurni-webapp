import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import NotificationsClient from "@/components/crm/notifications/NotificationsClient";

export default async function NotificationsPage() {
  await requireAdmin();
  return <NotificationsClient />;
}
