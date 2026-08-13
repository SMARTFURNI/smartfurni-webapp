import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { getAllGatewayStatuses, initZaloGateway, disconnectZalo, connectAccount } from "@/lib/zalo-gateway";
import { updateZaloAccountMetadata } from "@/lib/zalo-account-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  }
  await initZaloGateway().catch(() => undefined);
  return NextResponse.json({ accounts: await getAllGatewayStatuses(), maxAccounts: 10 });
}

export async function PATCH(req: NextRequest) {
  const session = await getCrmSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Chỉ quản trị viên được sửa tài khoản Zalo" }, { status: 403 });
  const body = await req.json();
  const accountId = String(body.accountId || "").trim();
  if (!accountId) return NextResponse.json({ error: "Thiếu accountId" }, { status: 400 });
  await updateZaloAccountMetadata(accountId, {
    label: typeof body.label === "string" ? body.label.trim() : undefined,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
  });
  if (body.isActive === false) await disconnectZalo(accountId, false);
  if (body.isActive === true) {
    try {
      await connectAccount(accountId);
    } catch (error) {
      await updateZaloAccountMetadata(accountId, { isActive: false });
      return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể kết nối tài khoản Zalo" }, { status: 400 });
    }
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getCrmSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Chỉ quản trị viên được xóa tài khoản Zalo" }, { status: 403 });
  const accountId = new URL(req.url).searchParams.get("accountId") || "";
  if (!accountId) return NextResponse.json({ error: "Thiếu accountId" }, { status: 400 });
  await disconnectZalo(accountId, true);
  return NextResponse.json({ success: true });
}
