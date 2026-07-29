import { requireCrmAccess } from "@/lib/admin-auth";
import { ConversationLearningClient } from "@/components/crm/conversation-learning/ConversationLearningClient";

export const metadata = {
  title: "Trung tâm AI chăm sóc Fanpage | SmartFurni CRM",
  description: "Phân tích hội thoại từng Fanpage và lập kế hoạch chăm sóc khách hàng tiềm năng hằng ngày.",
};

export default async function ConversationLearningPage() {
  await requireCrmAccess();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_4%,rgba(50,76,124,0.22),transparent_30rem),radial-gradient(circle_at_86%_12%,rgba(164,112,24,0.18),transparent_34rem),linear-gradient(135deg,#0c1321_0%,#17160f_47%,#1a1105_100%)] p-3 sm:p-5 lg:p-6">
      <ConversationLearningClient />
    </div>
  );
}
