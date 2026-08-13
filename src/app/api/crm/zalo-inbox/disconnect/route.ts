import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { disconnectZalo, getGatewayStatus } from "@/lib/zalo-gateway";
import { updateZaloAccountMetadata } from "@/lib/zalo-account-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ quản trị viên được ngắt kết nối Zalo" }, { status: session ? 403 : 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const requestedAccountId = typeof body.accountId === "string" ? body.accountId : undefined;
    const accountId = requestedAccountId || getGatewayStatus().accountId || undefined;
    await disconnectZalo(accountId, false);
    if (accountId) await updateZaloAccountMetadata(accountId, { isActive: false });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /zalo-inbox/disconnect]", err);
    return NextResponse.json({ error: "Không thể ngắt kết nối Zalo" }, { status: 500 });
  }
}
