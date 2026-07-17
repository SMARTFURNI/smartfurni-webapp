import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getRoleById } from "@/lib/crm-roles-store";
import type { RolePermissions } from "@/lib/crm-roles-store";
import CrmSidebar from "@/components/crm/CrmSidebar";
import DataPoolNotification from "@/components/crm/DataPoolNotification";
import ItySoftphone from "@/components/crm/ItySoftphone";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCrmAccess();
  let staffRole = session.staffRole ?? "sales";
  let staffName = "";
  let rolePermissions: RolePermissions | null = null;
  let roleName: string | undefined;

  // Lấy thông tin nhân viên và permissions từ DB
  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    staffRole = staff?.role ?? staffRole;
    staffName = staff?.fullName ?? "";

    // Load permissions từ bảng crm_custom_roles theo role ID
    if (staffRole) {
      const roleData = await getRoleById(staffRole);
      if (roleData) {
        rolePermissions = roleData.permissions;
        roleName = roleData.name;
      }
    }
  }

  return (
    <>
      {/* Global print CSS — ẩn sidebar, fix layout khi in */}
      <style>{`
        .crm-mobile-bar, .crm-mobile-tabs, .crm-mobile-overlay { display: none; }
        @media (max-width: 900px) {
          .crm-root { height: 100dvh !important; min-height: 100dvh; overflow: hidden; }
          .crm-mobile-bar {
            position: fixed; inset: 0 0 auto 0; z-index: 80;
            height: calc(62px + env(safe-area-inset-top));
            padding: env(safe-area-inset-top) 14px 0;
            display: flex; align-items: center; gap: 12px;
            border-bottom: 1px solid rgba(255,200,100,.16);
            background: linear-gradient(105deg, rgba(10,16,30,.97), rgba(33,22,9,.95));
            box-shadow: 0 12px 34px rgba(0,0,0,.36); backdrop-filter: blur(22px);
          }
          .crm-mobile-icon-button, .crm-mobile-avatar {
            width: 42px; height: 42px; border-radius: 14px; flex: 0 0 auto;
            display: inline-flex; align-items: center; justify-content: center;
            color: #fde68a; border: 1px solid rgba(255,200,100,.18);
            background: linear-gradient(145deg, rgba(245,158,11,.17), rgba(59,76,111,.14));
          }
          .crm-mobile-avatar { font-size: 14px; font-weight: 800; color: #1a1200; background: linear-gradient(135deg,#f6cf62,#d99a1b); }
          .crm-sidebar {
            position: fixed !important; inset: 0 auto 0 0; z-index: 100;
            width: min(88vw, 320px) !important; height: 100dvh !important;
            transform: translateX(-105%); transition: transform .28s cubic-bezier(.22,.8,.22,1) !important;
            box-shadow: 24px 0 70px rgba(0,0,0,.55);
          }
          .crm-sidebar.is-mobile-open { transform: translateX(0); }
          .crm-mobile-overlay {
            display: block; position: fixed; inset: 0; z-index: 90; opacity: 0;
            pointer-events: none; border: 0; background: rgba(2,6,14,.74);
            backdrop-filter: blur(5px); transition: opacity .22s ease;
          }
          .crm-mobile-overlay.is-visible { opacity: 1; pointer-events: auto; }
          .crm-mobile-tabs {
            position: fixed; inset: auto 10px calc(8px + env(safe-area-inset-bottom)) 10px; z-index: 78;
            min-height: 62px; padding: 7px 6px; display: grid;
            grid-template-columns: repeat(4,minmax(0,1fr)); border-radius: 22px;
            border: 1px solid rgba(255,200,100,.18);
            background: linear-gradient(115deg,rgba(15,21,35,.97),rgba(37,24,9,.96));
            box-shadow: 0 18px 45px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035);
            backdrop-filter: blur(22px);
          }
          .crm-mobile-tabs a {
            min-width: 0; min-height: 48px; border-radius: 15px; display: flex;
            flex-direction: column; align-items: center; justify-content: center; gap: 3px;
            color: rgba(245,237,214,.48); font-size: 9px; font-weight: 600;
          }
          .crm-mobile-tabs a.is-active { color: #fde68a; background: linear-gradient(145deg,rgba(245,158,11,.22),rgba(245,158,11,.07)); }
          .crm-mobile-tabs + main {
            width: 100% !important; min-width: 0 !important;
            padding-top: calc(62px + env(safe-area-inset-top));
            padding-bottom: calc(82px + env(safe-area-inset-bottom));
            overflow-x: hidden !important; -webkit-overflow-scrolling: touch;
          }
          .crm-root main table {
            display: block; max-width: calc(100vw - 24px); overflow-x: auto;
            white-space: nowrap; -webkit-overflow-scrolling: touch;
          }
          .crm-root main form .grid-cols-2, .crm-root main form .grid-cols-3,
          .crm-root main form .grid-cols-4 { grid-template-columns: minmax(0,1fr) !important; }
          .crm-root main [class~="p-8"], .crm-root main [class~="p-6"] { padding: 14px !important; }
          .crm-root main button, .crm-root main select, .crm-root main input { min-height: 42px; }
        }
        @media print {
          .no-print, .crm-mobile-bar, .crm-mobile-tabs, .crm-mobile-overlay { display: none !important; }
          .crm-root { display: block !important; height: auto !important; overflow: visible !important; }
          .crm-root > aside { display: none !important; }
          .crm-root > main { width: 100% !important; overflow: visible !important; height: auto !important; }
          body, html { overflow: visible !important; height: auto !important; background: #fff !important; }
        }
      `}</style>
      <div className="crm-root flex h-screen overflow-hidden" style={{ background: "#0D0D0F" }}>
        <CrmSidebar
          isAdmin={session.isAdmin}
          staffRole={staffRole}
          staffName={staffName}
          rolePermissions={rolePermissions}
          roleName={roleName}
        />
        <main className="flex-1 overflow-auto min-w-0" style={{ background: "inherit" }}>
          {children}
        </main>
        {/* Real-time notification khi có lead mới vào Data Pool */}
        <DataPoolNotification />
        {/* ITY Softphone — floating widget gọi điện trực tiếp trên CRM */}
        <ItySoftphone />
      </div>
    </>
  );
}
