import { requireCrmAccess } from "@/lib/admin-auth";
import { ConversationLearningClient } from "@/components/crm/conversation-learning/ConversationLearningClient";

export const metadata = {
  title: "AI học hội thoại | SmartFurni CRM",
  description: "Phân tích hội thoại khách hàng và tạo kịch bản sale nháp cho SmartFurni.",
};

export default async function ConversationLearningPage() {
  await requireCrmAccess();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_34%),linear-gradient(135deg,#08050d_0%,#120a07_45%,#1d1402_100%)] p-6">
      <ConversationLearningClient />
    </div>
  );
}
