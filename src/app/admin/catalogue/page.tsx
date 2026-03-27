import { requireAdmin } from "@/lib/admin-auth";
import { getCatalogues } from "@/lib/catalogue-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminCatalogueClient from "@/components/admin/AdminCatalogueClient";

export const metadata = { title: "Catalogue B2B — SmartFurni Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCataloguePage() {
  await requireAdmin();
  const catalogues = await getCatalogues(false);
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#080600]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 overflow-auto min-w-0">
        <AdminCatalogueClient initialCatalogues={catalogues} />
      </main>
    </div>
  );
}
