import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getProductById, updateProduct, deleteProduct } from "@/lib/product-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const product = updateProduct(id, body);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const deleted = deleteProduct(id);
  if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
