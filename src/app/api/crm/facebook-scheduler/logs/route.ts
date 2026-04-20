import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getPostLogs, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

// GET /api/crm/facebook-scheduler/logs?postId=xxx
export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId") ?? undefined;
  return NextResponse.json(getPostLogs(postId));
}
