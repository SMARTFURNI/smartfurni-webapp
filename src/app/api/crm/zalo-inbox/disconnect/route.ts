import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { disconnectZalo } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getCrmSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ quản trị viên được ngắt kết nối Zalo" }, { status: session ? 403 : 401 });
  }
  try {
    await disconnectZalo();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /zalo-inbox/disconnect]", err);
    return NextResponse.json({ error: "Không thể ngắt kết nối Zalo" }, { status: 500 });
  }
}
