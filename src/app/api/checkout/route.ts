import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/order-store";
import type { PaymentMethod } from "@/lib/order-store";
import { initDbOnce } from "@/lib/db-init";

export async function POST(req: NextRequest) {
  await initDbOnce();
  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      city,
      items,
      shippingFee,
      discount,
      paymentMethod,
      notes,
    } = body;

    // Validate required fields
    if (!customerName || !customerPhone || !shippingAddress || !city || !items?.length) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const order = createOrder({
      customerName,
      customerEmail: customerEmail || "",
      customerPhone,
      shippingAddress,
      city,
      items: items.map((item: {
        productId: string;
        productName: string;
        variant: string;
        sku: string;
        quantity: number;
        unitPrice: number;
      }) => ({
        productId: item.productId,
        productName: item.productName,
        variant: item.variant,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      shippingFee: shippingFee ?? 0,
      discount: discount ?? 0,
      status: "pending",
      paymentMethod: (paymentMethod as PaymentMethod) ?? "cod",
      paymentStatus: paymentMethod === "cod" ? "unpaid" : "unpaid",
      notes,
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống, vui lòng thử lại" }, { status: 500 });
  }
}
