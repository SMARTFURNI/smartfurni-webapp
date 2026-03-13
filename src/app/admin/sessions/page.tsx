import { Metadata } from "next";
import { SessionsClient } from "@/components/admin/SessionsClient";

export const metadata: Metadata = {
  title: "Hành trình khách hàng | SmartFurni Admin",
};

export const dynamic = "force-dynamic";

export default function SessionsPage() {
  return <SessionsClient />;
}
