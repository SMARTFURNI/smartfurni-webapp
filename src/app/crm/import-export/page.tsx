export const dynamic = "force-dynamic";
import { requireSuperAdminCrm } from "@/lib/admin-auth";
import ImportExportClient from "@/components/crm/import/ImportExportClient";

export default async function ImportExportPage() {
  await requireSuperAdminCrm();
  return (
    <div className="p-6" style={{ background: "#080806", minHeight: "100vh" }}>
      <ImportExportClient />
    </div>
  );
}
