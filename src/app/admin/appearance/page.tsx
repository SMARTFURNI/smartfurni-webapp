import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/admin-auth";
import { getThemeAsync, PRESET_THEMES, FONT_OPTIONS, BORDER_RADIUS_OPTIONS } from "@/lib/theme-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import ThemeEditorClient from "@/components/admin/ThemeEditorClient";
import { initDbOnce } from "@/lib/db-init";

export const metadata = { title: "Chỉnh sửa giao diện | SmartFurni Admin" };

export default async function AppearancePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sf_admin_session")?.value;
  if (!token || !verifySessionToken(token)) {
    redirect("/admin/login");
  }

  await initDbOnce();
  const [theme, sidebarStats] = await Promise.all([
    getThemeAsync(),
    getSidebarStats(),
  ]);

  return (
    <div className="min-h-screen bg-[#130e00] flex">
      <AdminSidebar stats={sidebarStats} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Chỉnh sửa giao diện"
          subtitle="Tùy chỉnh màu sắc, font chữ, bố cục và nội dung website"
        />
        <main className="flex-1 px-6 pb-6 overflow-hidden">
          <ThemeEditorClient
            initialTheme={theme}
            presets={PRESET_THEMES}
            fontOptions={FONT_OPTIONS}
            borderRadiusOptions={BORDER_RADIUS_OPTIONS}
          />
        </main>
      </div>
    </div>
  );
}
