import { NextResponse } from "next/server";
import { initDbOnce } from "@/lib/db-init";
import { getAllOrders } from "@/lib/order-store";
import { getRawLeadStats } from "@/lib/crm-raw-lead-store";
import { getAdminPortalSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await getAdminPortalSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await initDbOnce();
    const orders = getAllOrders();
    const leads = await getRawLeadStats();
    return NextResponse.json({
      orders: orders.length,
      contacts: leads.total,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
      unreadContacts: leads.pending,
    });
  } catch {
    return NextResponse.json({ orders: 0, contacts: 0, pendingOrders: 0, unreadContacts: 0 });
  }
}
