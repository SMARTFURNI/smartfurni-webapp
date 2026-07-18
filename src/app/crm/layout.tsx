import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getRoleById } from "@/lib/crm-roles-store";
import type { RolePermissions } from "@/lib/crm-roles-store";
import CrmSidebar from "@/components/crm/CrmSidebar";
import DataPoolNotification from "@/components/crm/DataPoolNotification";
import ItySoftphone from "@/components/crm/ItySoftphone";
import PwaDocumentConfig from "@/components/PwaDocumentConfig";
import type { Metadata, Viewport } from "next";
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#0B111B",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  applicationName: "SmartFurni CRM",
  title: {
    template: "%s | SmartFurni CRM",
    default: "Tổng quan | SmartFurni CRM",
  },
  description: "Ứng dụng quản lý khách hàng và hoạt động kinh doanh SmartFurni.",
  robots: { index: false, follow: false },
  manifest: "/crm-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SmartFurni CRM",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/smartfurni-favicon-v4.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/smartfurni-favicon-v4.png", type: "image/png", sizes: "512x512" }],
  },
  formatDetection: {
    telephone: false,
  },
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
      <PwaDocumentConfig manifestHref="/crm-manifest.webmanifest" />
      {/* Global print CSS — ẩn sidebar, fix layout khi in */}
      <style>{`
        .crm-mobile-bar, .crm-mobile-tabs, .crm-mobile-overlay, .crm-contracts-back { display: none; }
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
          .crm-mobile-icon-button, .crm-mobile-avatar, .crm-mobile-brand {
            width: 42px; height: 42px; border-radius: 14px; flex: 0 0 auto;
            display: inline-flex; align-items: center; justify-content: center;
            color: #fde68a; border: 1px solid rgba(255,200,100,.18);
            background: linear-gradient(145deg, rgba(245,158,11,.17), rgba(59,76,111,.14));
          }
          .crm-mobile-avatar { font-size: 14px; font-weight: 800; color: #1a1200; background: linear-gradient(135deg,#f6cf62,#d99a1b); }
          .crm-mobile-brand img { width: 34px; height: 34px; object-fit: contain; }
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
          .crm-root main > *, .crm-root main .grid, .crm-root main .flex { max-width: 100%; }
          .crm-root main .grid > *, .crm-root main .flex > * { min-width: 0; }
          .crm-root main [class~="px-6"] { padding-left: 14px !important; padding-right: 14px !important; }
          .crm-root main [class~="gap-6"] { gap: 12px !important; }
          .crm-root main table {
            display: block; max-width: calc(100vw - 24px); overflow-x: auto;
            white-space: nowrap; -webkit-overflow-scrolling: touch;
            border-radius: 16px; scroll-snap-type: x proximity;
          }
          .crm-root main table th:first-child, .crm-root main table td:first-child {
            position: sticky; left: 0; z-index: 2; background: #111827;
          }
          .crm-root main form .grid-cols-2, .crm-root main form .grid-cols-3,
          .crm-root main form .grid-cols-4 { grid-template-columns: minmax(0,1fr) !important; }
          .crm-root main .grid-cols-4:not(form *), .crm-root main .grid-cols-5:not(form *) { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
          .crm-root main .grid-cols-6:not(form *) { grid-template-columns: repeat(3,minmax(0,1fr)) !important; }
          .crm-root main [class~="p-8"], .crm-root main [class~="p-6"] { padding: 14px !important; }
          .crm-root main button, .crm-root main select, .crm-root main input { min-height: 42px; }

          /* Focus hôm nay: một hàng thẻ vuốt ngang như carousel trong ứng dụng. */
          .crm-focus-track {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 1px 1px 5px;
            scroll-snap-type: x mandatory;
            overscroll-behavior-x: contain;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .crm-focus-track::-webkit-scrollbar { display: none; }
          .crm-focus-card {
            flex: 0 0 min(76vw, 280px);
            min-width: 0;
            scroll-snap-align: start;
            scroll-snap-stop: always;
          }

          /* Kanban dạng app: mỗi trạng thái là một màn vuốt ngang có điểm dừng. */
          .crm-kanban { height: auto !important; min-height: 100%; }
          .crm-kanban > :first-child { padding: 14px !important; }
          .crm-kanban > :first-child > div { align-items: stretch; }
          .crm-kanban > :first-child > div > :last-child { width: 100%; }
          .crm-kanban > :first-child input { width: 100% !important; }
          .crm-kanban-scroll { overflow-y: auto !important; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; }
          .crm-kanban-track { gap: 12px !important; padding: 12px 14px 20px !important; height: auto !important; }
          .crm-kanban-column {
            width: calc(100vw - 42px) !important;
            min-width: calc(100vw - 42px) !important;
            max-height: calc(100dvh - 250px);
            scroll-snap-align: center;
            scroll-snap-stop: always;
          }

          /* Danh mục CRM: bộ lọc cuộn ngang, số liệu 2x2, sản phẩm hai cột. */
          .crm-products { height: auto !important; min-height: 100%; }
          .crm-products-header { align-items: flex-start !important; gap: 10px; padding: 14px !important; }
          .crm-products-header h1 { font-size: 19px !important; }
          .crm-products-header > button { padding-inline: 12px !important; white-space: nowrap; }
          .crm-products-stats { grid-template-columns: repeat(2,minmax(0,1fr)) !important; padding: 0 14px !important; gap: 8px !important; }
          .crm-products-stats > div { border: 1px solid rgba(201,168,76,.16) !important; border-top-width: 2px !important; border-radius: 14px; padding: 10px !important; }
          .crm-products-stats > div > div:first-of-type { width: 32px !important; height: 32px !important; }
          .crm-products-filter { overflow-x: auto; padding: 12px 14px !important; gap: 8px !important; scroll-snap-type: x proximity; }
          .crm-products-filter > * { flex: 0 0 auto; }
          .crm-products-filter > :first-child { flex: 0 0 calc(100vw - 92px); max-width: none !important; }
          .crm-products-filter > .ml-auto { margin-left: 0 !important; }
          .crm-products-grid { grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 10px !important; }
          .crm-products-grid > * { min-width: 0; }
          .crm-product-card-actions { opacity: 1 !important; transform: none !important; }
          .crm-product-detail-body { flex-direction: column !important; }
          .crm-product-detail-image { width: 100% !important; height: auto !important; aspect-ratio: 16/10; }
          .crm-products .fixed > div { max-height: calc(100dvh - 24px); overflow-y: auto; border-radius: 20px !important; }

          /* Lịch: tháng phía trên, chương trình ngày đã chọn nằm ngay bên dưới. */
          .crm-calendar { flex-direction: column !important; height: auto !important; min-height: 100%; overflow: visible !important; }
          .crm-calendar-header { align-items: stretch !important; flex-direction: column; gap: 10px; padding: 14px !important; }
          .crm-calendar-header > div { flex-wrap: wrap; gap: 7px !important; }
          .crm-calendar-header > button { width: 100%; justify-content: center; }
          .crm-calendar-grid { overflow-x: auto !important; padding: 10px !important; }
          .crm-calendar-grid > .grid { min-width: 350px; }
          .crm-calendar-grid .min-h-\[80px\] { min-height: 62px !important; padding: 3px !important; }
          .crm-calendar-agenda { width: 100% !important; max-height: none !important; overflow: visible !important; border-left: 0 !important; border-top: 1px solid #e5e7eb; }
          .crm-calendar-agenda > div { padding: 14px !important; }

          /* Hộp thoại và trang nhập liệu hoạt động như bottom sheet. */
          .crm-root main .fixed.inset-0 { align-items: flex-end !important; padding: 8px !important; }
          .crm-root main .fixed.inset-0 > div {
            width: 100% !important; max-width: 100% !important; max-height: calc(100dvh - 78px);
            overflow-y: auto; border-radius: 24px 24px 16px 16px !important;
          }

          /* Hợp đồng: danh sách/chi tiết theo luồng master-detail. */
          .crm-contracts { height: auto !important; min-height: 100%; }
          .crm-contracts-list,
          .crm-contracts-detail { width: 100% !important; min-width: 0 !important; border-right: 0 !important; }
          .crm-contracts.no-selection .crm-contracts-detail,
          .crm-contracts.has-selection .crm-contracts-list { display: none !important; }
          .crm-contracts-back { display: inline-flex; }
          .crm-contracts-detail > :first-child { align-items: flex-start !important; flex-direction: column; gap: 10px; }
          .crm-contracts-detail > :first-child > :last-child { flex-wrap: wrap; }
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
