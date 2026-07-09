export const dynamic = "force-dynamic";
import { requireCrmAccess } from "@/lib/admin-auth";
import FacebookInboxClient from "@/components/crm/facebook-inbox/FacebookInboxClient";

export const metadata = {
  title: "Facebook Inbox — SmartFurni CRM",
  description: "Xem và trả lời tin nhắn từ các fanpage Facebook đã kết nối",
};

export default async function FacebookInboxPage() {
  await requireCrmAccess();
  return <FacebookInboxClient />;
}
