import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSmartBedSession } from "@/lib/smart-bed-auth";

export const metadata: Metadata = {
  title: "Điều khiển giường — SmartFurni",
  description: "Ứng dụng điều khiển giường thông minh SmartFurni.",
  robots: { index: false, follow: false },
  manifest: "/dashboard/manifest.webmanifest",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSmartBedSession();
  if (!session) redirect("/smart-bed/login");
  return children;
}
