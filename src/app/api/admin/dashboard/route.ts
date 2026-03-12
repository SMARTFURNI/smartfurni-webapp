import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getDashboardStats } from "@/lib/admin-store";
import { initDbOnce } from "@/lib/db-init";

export async function GET() {
  await initDbOnce();
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getDashboardStats());
}
