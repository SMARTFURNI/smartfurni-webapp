import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/admin-auth";
import {
  getHomepageProductConfigAsync,
  saveHomepageProductConfig,
} from "@/lib/homepage-products-store";
import { getAllProducts } from "@/lib/product-store";

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sf_admin_session")?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return !!session;
}

// GET — lấy config + danh sách tất cả sản phẩm để admin chọn
export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getHomepageProductConfigAsync();
  const allProducts = getAllProducts().filter((p) => p.status !== "discontinued");

  return NextResponse.json({ config, allProducts });
}

// PATCH — cập nhật config
export async function PATCH(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updated = await saveHomepageProductConfig(body);
    return NextResponse.json({ success: true, config: updated });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request", detail: String(err) },
      { status: 400 }
    );
  }
}
