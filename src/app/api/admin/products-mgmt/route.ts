import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAllProducts, getProductDashboardStats, createProduct } from "@/lib/product-store";

export async function POST(request: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const product = createProduct(body);
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode === "dashboard") {
    return NextResponse.json(getProductDashboardStats());
  }

  const search = searchParams.get("search")?.toLowerCase() || "";
  const category = searchParams.get("category") || "all";
  const status = searchParams.get("status") || "all";

  let products = getAllProducts();
  if (search) products = products.filter((p) => p.name.toLowerCase().includes(search) || p.slug.includes(search));
  if (category !== "all") products = products.filter((p) => p.category === category);
  if (status !== "all") products = products.filter((p) => p.status === status);

  return NextResponse.json({ products, total: products.length });
}
