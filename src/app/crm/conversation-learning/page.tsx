import { requireCrmAccess } from "@/lib/admin-auth";
import { ConversationLearningClient } from "@/components/crm/conversation-learning/ConversationLearningClient";

export const metadata = {
  title: "Trung tâm AI chăm sóc Fanpage | SmartFurni CRM",
  description: "Phân tích hội thoại từng Fanpage và lập kế hoạch chăm sóc khách hàng tiềm năng hằng ngày.",
};

export default async function ConversationLearningPage() {
  await requireCrmAccess();

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-3 sm:p-5 lg:p-6">
      <ConversationLearningClient />
    </div>
  );
}
