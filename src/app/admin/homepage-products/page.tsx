import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/admin-auth";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import HomepageProductsClient from "@/components/admin/HomepageProductsClient";
import { getHomepageProductConfig } from "@/lib/homepage-products-store";
import { getAllProducts } from "@/lib/product-store";

export const metadata = { title: "Sản phẩm trang chủ | SmartFurni Admin" };

export default async function HomepageProductsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sf_admin_session")?.value;
  if (!token || !verifySessionToken(token)) redirect("/admin/login");

  const sidebarStats = getSidebarStats();
  const config = getHomepageProductConfig();
  const allProducts = getAllProducts().filter((p) => p.status !== "discontinued");

  return (
    <div style={{ backgroundColor: "#151718", minHeight: "100vh" }} className="flex">
      <AdminSidebar stats={sidebarStats} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Sản phẩm trang chủ"
          subtitle={`${config.displayedProductIds.length === 0 ? "Hiển thị tất cả" : `${config.displayedProductIds.length} sản phẩm đã chọn`} · ${allProducts.length} sản phẩm khả dụng`}
        />
        <main className="flex-1 p-6 overflow-auto">
          <HomepageProductsClient
            initialConfig={config}
            allProducts={allProducts}
          />
        </main>
      </div>
    </div>
  );
}
