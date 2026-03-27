import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getApiKeys, createApiKey, revokeApiKey, deleteApiKey, type ApiKeyPermission } from "@/lib/crm-audit-store";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getApiKeys());
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, permissions, expiresAt } = await req.json();
  const result = await createApiKey(name, permissions as ApiKeyPermission[], expiresAt ?? null, "admin");
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, action } = await req.json();
  if (action === "revoke") await revokeApiKey(id);
  else if (action === "delete") await deleteApiKey(id);
  return NextResponse.json({ ok: true });
}
