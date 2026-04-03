import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { disconnectZalo } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireCrmAccess();
    await disconnectZalo();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /zalo-inbox/disconnect]", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
