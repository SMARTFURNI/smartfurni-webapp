/**
 * Aggregates stats from all modules for the admin sidebar badges.
 * Import this in server components that render AdminSidebar.
 */
import { getAdminStats } from "@/lib/admin-store";
import { getOrderDashboardStats } from "@/lib/order-store";
import { getProductDashboardStats } from "@/lib/product-store";

export interface SidebarStats {
  unreadContacts: number;
  pendingOrders: number;
  lowStockProducts: number;
  draftPosts: number;
}

export function getSidebarStats(): SidebarStats {
  const adminStats = getAdminStats();
  const orderStats = getOrderDashboardStats();
  const productStats = getProductDashboardStats();

  const pendingOrders = orderStats.ordersByStatus.find((s) => s.status === "pending")?.count || 0;
  const lowStockProducts = productStats.lowStockProducts?.length || 0;

  return {
    unreadContacts: adminStats.unreadContacts,
    pendingOrders,
    lowStockProducts,
    draftPosts: adminStats.draftPosts,
  };
}
