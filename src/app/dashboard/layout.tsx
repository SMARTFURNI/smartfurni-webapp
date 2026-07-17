import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Điều khiển giường — SmartFurni",
  description: "Ứng dụng điều khiển giường thông minh SmartFurni.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
