import { getAiCommandAccess } from "@/lib/ai-command/access";
import AiCommandClient from "@/components/ai-command/AiCommandClient";

export const metadata = { title: "Trợ lý Điều hành AI — SmartFurni CRM" };
export const dynamic = "force-dynamic";

export default async function AiCommandPage() {
  const access = await getAiCommandAccess();
  if (!access?.canView) {
    return <div className="p-8 text-center text-[#f5edd6]"><h1 className="text-2xl font-bold">Chưa có quyền truy cập</h1><p className="mt-2 text-white/55">Vui lòng liên hệ quản trị viên để bật quyền Trợ lý Điều hành AI.</p></div>;
  }
  return <AiCommandClient surface="crm" initialAccess={{ canApprove: access.canApprove, actor: access.actor }} />;
}
