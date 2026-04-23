import { requireAdmin } from "@/lib/admin-auth";
import { getCatalogueById } from "@/lib/catalogue-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminCatalogueEditorClient from "@/components/admin/AdminCatalogueEditorClient";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const cat = await getCatalogueById(id);
  return { title: `${cat?.title || "Catalogue"} — Chỉnh sửa | SmartFurni Admin` };
}

export default async function AdminCatalogueEditorPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const catalogue = await getCatalogueById(id);
  if (!catalogue) notFound();
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 overflow-auto min-w-0">
        <AdminCatalogueEditorClient catalogue={catalogue} />
      </main>
    </div>
  );
}
