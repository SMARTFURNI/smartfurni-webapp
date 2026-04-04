import { NextRequest, NextResponse } from "next/server";
import {
  getZaloCatalogs,
  createZaloCatalog,
  updateZaloCatalog,
  deleteZaloCatalog,
  getZaloProducts,
  createZaloProduct,
  updateZaloProduct,
  deleteZaloProduct,
} from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const catalogId = searchParams.get("catalogId");

  try {
    if (catalogId) {
      // Lấy sản phẩm trong catalog
      return NextResponse.json(await getZaloProducts(catalogId));
    }
    // Lấy danh sách catalog
    return NextResponse.json(await getZaloCatalogs());
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, catalogId, productId, title, price, description } = body;

    switch (action) {
      case "create-catalog":
        if (!title) return NextResponse.json({ success: false, error: "title required" }, { status: 400 });
        return NextResponse.json(await createZaloCatalog(title));
      case "update-catalog":
        if (!catalogId || !title) return NextResponse.json({ success: false, error: "catalogId and title required" }, { status: 400 });
        return NextResponse.json(await updateZaloCatalog(catalogId, title));
      case "delete-catalog":
        if (!catalogId) return NextResponse.json({ success: false, error: "catalogId required" }, { status: 400 });
        return NextResponse.json(await deleteZaloCatalog(catalogId));
      case "create-product":
        if (!catalogId || !title || price == null) return NextResponse.json({ success: false, error: "catalogId, title, price required" }, { status: 400 });
        return NextResponse.json(await createZaloProduct({ catalogId, title, price, description }));
      case "update-product":
        if (!catalogId || !productId || !title || price == null) return NextResponse.json({ success: false, error: "catalogId, productId, title, price required" }, { status: 400 });
        return NextResponse.json(await updateZaloProduct({ catalogId, productId, title, price, description }));
      case "delete-product":
        if (!catalogId || !productId) return NextResponse.json({ success: false, error: "catalogId and productId required" }, { status: 400 });
        return NextResponse.json(await deleteZaloProduct(catalogId, productId));
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
