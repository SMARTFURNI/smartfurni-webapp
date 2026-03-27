import { NextResponse } from "next/server";
import { initDbOnce } from "@/lib/db-init";
import { getAllOrders } from "@/lib/order-store";
import { getAllContacts } from "@/lib/admin-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await initDbOnce();
    const orders = getAllOrders();
    const contacts = getAllContacts();
    return NextResponse.json({
      orders: orders.length,
      contacts: contacts.length,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
      unreadContacts: contacts.filter((c) => !c.read).length,
    });
  } catch {
    return NextResponse.json({ orders: 0, contacts: 0, pendingOrders: 0, unreadContacts: 0 });
  }
}
