import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAllOrders, getOrderDashboardStats, createOrder } from "@/lib/order-store";

export async function GET(request: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode === "dashboard") {
    return NextResponse.json(getOrderDashboardStats());
  }

  const search = searchParams.get("search")?.toLowerCase() || "";
  const status = searchParams.get("status") || "all";
  const payment = searchParams.get("payment") || "all";

  let orders = getAllOrders();
  if (search) {
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        o.customerPhone.includes(search)
    );
  }
  if (status !== "all") orders = orders.filter((o) => o.status === status);
  if (payment !== "all") orders = orders.filter((o) => o.paymentMethod === payment);

  return NextResponse.json({ orders, total: orders.length });
}

export async function POST(request: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { customerName, customerEmail, customerPhone, shippingAddress, city,
      items, shippingFee, discount, status, paymentMethod, paymentStatus,
      notes, trackingCode, shippingPartner } = body;

    if (!customerName || !customerPhone || !shippingAddress || !city || !items?.length) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const order = createOrder({
      customerName, customerEmail: customerEmail || "",
      customerPhone, shippingAddress, city,
      items, shippingFee: shippingFee || 0, discount: discount || 0,
      status: status || "pending",
      paymentMethod: paymentMethod || "cod",
      paymentStatus: paymentStatus || "unpaid",
      notes, trackingCode, shippingPartner,
    });
    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
}
