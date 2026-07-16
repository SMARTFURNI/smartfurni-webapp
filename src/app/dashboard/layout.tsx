import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — SmartFurni",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sf-site-gradient-bg min-h-screen bg-[#0D0B00]">
      {children}
    </div>
  );
}
