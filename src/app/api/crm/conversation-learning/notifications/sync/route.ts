import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { syncCarePlanNotificationsForActor } from "@/lib/fanpage-care-center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await syncCarePlanNotificationsForActor(
    session.staffId
      ? { ownerScope: "crm", ownerId: session.staffId }
      : { ownerScope: "admin", ownerId: "admin" },
  );
  return NextResponse.json({ success: true, ...result });
}
