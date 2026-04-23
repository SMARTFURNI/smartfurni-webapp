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
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(160deg, #0d0b1a 0%, #0e0900 60%, #0d0b00 100%)' }}>
      {children}
    </div>
  );
}
