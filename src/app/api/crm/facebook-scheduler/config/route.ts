import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getSchedulerConfig, updateSchedulerConfig,
  loadFacebookSchedulerFromDb,
} from "@/lib/crm-facebook-scheduler-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

// GET /api/crm/facebook-scheduler/config
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  return NextResponse.json(getSchedulerConfig());
}

// PUT /api/crm/facebook-scheduler/config
export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const body = await req.json();
  const updated = await updateSchedulerConfig(body);
  return NextResponse.json(updated);
}
