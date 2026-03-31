export const dynamic = "force-dynamic";
import { requireSuperAdminCrm } from "@/lib/admin-auth";
import FacebookSchedulerClient from "@/components/crm/facebook-scheduler/FacebookSchedulerClient";

export default async function FacebookSchedulerPage() {
  await requireSuperAdminCrm();
  return (
    <div className="p-6" style={{ background: "#f8f9fb", minHeight: "100vh" }}>
      <FacebookSchedulerClient />
    </div>
  );
}
