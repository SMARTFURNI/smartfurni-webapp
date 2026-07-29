import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  countPushSubscriptions,
  sendPushNotification,
  type PwaOwnerScope,
} from "@/lib/pwa-server";

function isOwnerScope(value: string | null): value is PwaOwnerScope {
  return value === "smart-bed" || value === "admin" || value === "crm";
}

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const ownerScope = params.get("ownerScope");
  const ownerId = params.get("ownerId")?.trim();
  if (!isOwnerScope(ownerScope) || !ownerId) {
    return NextResponse.json({ error: "Thiếu tài khoản cần kiểm tra" }, { status: 400 });
  }
  return NextResponse.json({
    ownerScope,
    ownerId,
    subscriptions: await countPushSubscriptions(ownerScope, ownerId),
  });
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  const body = await request.json() as {
    ownerScope?: PwaOwnerScope;
    ownerId?: string;
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  };
  if (!body.title || !body.body) return NextResponse.json({ error: "Thiếu tiêu đề hoặc nội dung" }, { status: 400 });
  const result = await sendPushNotification({
    ownerScope: body.ownerScope,
    ownerId: body.ownerId,
    title: body.title,
    body: body.body,
    url: body.url,
    tag: body.tag,
  });
  return NextResponse.json({ success: true, ...result });
}
