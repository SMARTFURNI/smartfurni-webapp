import { Metadata } from "next";
import { SessionsClient } from "@/components/admin/SessionsClient";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Hành trình khách hàng | SmartFurni Admin",
};

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  await requireAdmin();
  return <SessionsClient />;
}
