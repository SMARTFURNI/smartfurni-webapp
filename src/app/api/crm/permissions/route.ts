import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getPermissionMatrix, savePermissionMatrix } from "@/lib/crm-audit-store";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getPermissionMatrix());
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const matrix = await req.json();
  await savePermissionMatrix(matrix);
  return NextResponse.json({ ok: true });
}
