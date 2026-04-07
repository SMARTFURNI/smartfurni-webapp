import { requireCrmAccess } from "@/lib/admin-auth";
import TwelveWeekPlanClient from "@/components/crm/TwelveWeekPlanClient";

export const dynamic = "force-dynamic";

export default async function TwelveWeekPlanPage() {
  await requireCrmAccess();
  return (
    <div
      className="min-h-full"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1a0e 50%, #1a1200 100%)",
      }}
    >
      <TwelveWeekPlanClient />
    </div>
  );
}
