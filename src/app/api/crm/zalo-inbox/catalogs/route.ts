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
import { getAuthorizedZaloInboxSession } from "@/lib/zalo-inbox-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await getAuthorizedZaloInboxSession()) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const catalogId = searchParams.get("catalogId");
  const accountId = searchParams.get("accountId") || undefined;

  try {
    if (catalogId) {
      // Lấy sản phẩm trong catalog
      return NextResponse.json(await getZaloProducts(catalogId, accountId));
    }
    // Lấy danh sách catalog
    return NextResponse.json(await getZaloCatalogs(accountId));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await getAuthorizedZaloInboxSession()) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  try {
    const body = await request.json();
    const { action, catalogId, productId, title, price, description, accountId } = body;

    switch (action) {
      case "create-catalog":
        if (!title) return NextResponse.json({ success: false, error: "title required" }, { status: 400 });
        return NextResponse.json(await createZaloCatalog(title, accountId));
      case "update-catalog":
        if (!catalogId || !title) return NextResponse.json({ success: false, error: "catalogId and title required" }, { status: 400 });
        return NextResponse.json(await updateZaloCatalog(catalogId, title, accountId));
      case "delete-catalog":
        if (!catalogId) return NextResponse.json({ success: false, error: "catalogId required" }, { status: 400 });
        return NextResponse.json(await deleteZaloCatalog(catalogId, accountId));
      case "create-product":
        if (!catalogId || !title || price == null) return NextResponse.json({ success: false, error: "catalogId, title, price required" }, { status: 400 });
        return NextResponse.json(await createZaloProduct({ catalogId, title, price, description, accountId }));
      case "update-product":
        if (!catalogId || !productId || !title || price == null) return NextResponse.json({ success: false, error: "catalogId, productId, title, price required" }, { status: 400 });
        return NextResponse.json(await updateZaloProduct({ catalogId, productId, title, price, description, accountId }));
      case "delete-product":
        if (!catalogId || !productId) return NextResponse.json({ success: false, error: "catalogId and productId required" }, { status: 400 });
        return NextResponse.json(await deleteZaloProduct(catalogId, productId, accountId));
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
