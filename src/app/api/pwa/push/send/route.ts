import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { sendPushNotification, type PwaOwnerScope } from "@/lib/pwa-server";

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
