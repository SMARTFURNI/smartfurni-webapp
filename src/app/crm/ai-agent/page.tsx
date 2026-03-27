import { requireCrmAccess } from "@/lib/admin-auth";
import { AIAgentDashboard } from "@/components/crm/AIAgentDashboard";

export const metadata = {
  title: "AI Agent Dashboard — SmartFurni CRM",
  description: "Tự động hoá chăm sóc khách hàng B2B với Gemini 2.5 Flash AI",
};

export default async function AIAgentPage() {
  // Chỉ admin mới có thể truy cập
  const session = await requireCrmAccess();
  if (!session.isAdmin) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600">Không có quyền truy cập</h1>
        <p className="text-gray-600 mt-2">Chỉ quản trị viên mới có thể sử dụng AI Agent</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AIAgentDashboard />
    </div>
  );
}
