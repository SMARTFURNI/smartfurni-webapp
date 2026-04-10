import { NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { dbSaveSetting } from "@/lib/db-store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Xóa token bằng cách lưu null
  await dbSaveSetting("tiktok_connection", null);

  return NextResponse.json({ ok: true });
}
