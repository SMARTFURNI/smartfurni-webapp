import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | SmartFurni Admin",
    default: "Dashboard | SmartFurni Admin",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080600] text-white">
      {children}
    </div>
  );
}
