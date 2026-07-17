import type { Metadata } from "next";
import "./admin-theme.css";

export const metadata: Metadata = {
  title: {
    template: "%s | SmartFurni Admin",
    default: "Dashboard | SmartFurni Admin",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sf-admin-shell min-h-screen text-white">
      <div className="sf-admin-ambient" aria-hidden="true" />
      <div className="relative z-[1] min-h-screen">{children}</div>
    </div>
  );
}
