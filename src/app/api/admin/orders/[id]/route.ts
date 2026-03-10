import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getOrderById, updateOrderStatus, updateOrder, deleteOrder } from "@/lib/order-store";
import type { OrderStatus } from "@/lib/order-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  if (body.status) {
    const order = updateOrderStatus(id, body.status as OrderStatus, body.note);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  }

  const order = updateOrder(id, body);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const deleted = deleteOrder(id);
  if (!deleted) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
