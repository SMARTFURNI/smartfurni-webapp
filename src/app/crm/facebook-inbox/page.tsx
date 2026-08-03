export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Facebook Inbox — SmartFurni CRM",
  description: "Xem và trả lời tin nhắn từ các fanpage Facebook đã kết nối",
};

export default async function FacebookInboxPage() {
  redirect("/crm/conversation-learning?tab=conversations");
}
