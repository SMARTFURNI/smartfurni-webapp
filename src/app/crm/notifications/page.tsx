import { requireCrmAccess } from "@/lib/admin-auth";
import NotificationsClient from "@/components/crm/notifications/NotificationsClient";
export const dynamic = "force-dynamic";
export default async function NotificationsPage() {
  await requireCrmAccess();
  return <NotificationsClient />;
}
