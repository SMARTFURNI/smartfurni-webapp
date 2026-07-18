import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getCrmSession } from "@/lib/admin-auth";
import { getSmartBedSession } from "@/lib/smart-bed-auth";
import {
  deletePushSubscription,
  getWebPushPublicKey,
  savePushSubscription,
  type PwaOwnerScope,
} from "@/lib/pwa-server";

async function resolveActor(): Promise<{ ownerScope: PwaOwnerScope; ownerId: string } | null> {
  const bed = await getSmartBedSession();
  if (bed) return { ownerScope: "smart-bed", ownerId: bed.id };
  if (await getAdminSession()) return { ownerScope: "admin", ownerId: "admin" };
  const crm = await getCrmSession();
  if (crm) return { ownerScope: "crm", ownerId: crm.staffId || "admin" };
  return null;
}

export async function GET() {
  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  return NextResponse.json({ publicKey: await getWebPushPublicKey(), ownerScope: actor.ownerScope });
}

export async function POST(request: NextRequest) {
  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const body = await request.json() as { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } };
  if (!body.subscription?.endpoint || !body.subscription.keys?.p256dh || !body.subscription.keys.auth) {
    return NextResponse.json({ error: "Subscription chưa hợp lệ" }, { status: 400 });
  }
  await savePushSubscription({
    ...actor,
    subscription: body.subscription as Parameters<typeof savePushSubscription>[0]["subscription"],
    userAgent: request.headers.get("user-agent") || "",
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const actor = await resolveActor();
  if (!actor) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { endpoint?: string };
  if (body.endpoint) await deletePushSubscription(body.endpoint);
  return NextResponse.json({ success: true });
}
