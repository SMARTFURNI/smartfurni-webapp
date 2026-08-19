import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminLandingPagesLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
