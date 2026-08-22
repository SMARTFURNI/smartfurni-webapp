import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getNewLeadCallPolicy, saveNewLeadCallPolicy } from "@/lib/crm-new-lead-call-policy";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCrmSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getNewLeadCallPolicy());
}

export async function PUT(request: NextRequest) {
  const session = await getCrmSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Cấu hình không hợp lệ" }, { status: 400 });
  }
  return NextResponse.json(await saveNewLeadCallPolicy(body));
}
