import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — SmartFurni",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D0B00]">
      {children}
    </div>
  );
}
