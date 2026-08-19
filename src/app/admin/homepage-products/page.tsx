import { requireAdmin } from "@/lib/admin-auth";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import HomepageProductsClient from "@/components/admin/HomepageProductsClient";
import { getHomepageProductConfigAsync } from "@/lib/homepage-products-store";
import { getAllProducts } from "@/lib/product-store";
import { initDbOnce } from "@/lib/db-init";

export const metadata = { title: "Cài đặt trang chủ | SmartFurni Admin" };

export default async function HomepageProductsPage() {
  await initDbOnce();
  await requireAdmin();

  const sidebarStats = getSidebarStats();
  const config = await getHomepageProductConfigAsync();
  const allProducts = getAllProducts().filter((p) => p.status !== "discontinued");

  return (
    <div style={{ backgroundColor: "#151718", minHeight: "100vh" }} className="flex">
      <AdminSidebar stats={sidebarStats} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title="Cài đặt trang chủ"
          subtitle={`${Object.values(config.sectionVisibility).filter(Boolean).length}/10 khối đang hiển thị · ${config.displayedProductIds.length === 0 ? "Hiển thị tất cả sản phẩm" : `${config.displayedProductIds.length} sản phẩm đã chọn`}`}
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
