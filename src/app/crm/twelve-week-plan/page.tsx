import { requireCrmAccess } from "@/lib/admin-auth";
import TwelveWeekPlanClient from "@/components/crm/TwelveWeekPlanClient";

export const dynamic = "force-dynamic";

export default async function TwelveWeekPlanPage() {
  await requireCrmAccess();
  return <TwelveWeekPlanClient />;
}
