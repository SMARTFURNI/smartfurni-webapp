import { requireAdmin } from "@/lib/admin-auth";
import CrmSidebar from "@/components/crm/CrmSidebar";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8f9fb" }}>
      <CrmSidebar />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
