import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import {
  getCalendarVideos,
  loadContentMarketingFromDb,
} from "@/lib/crm-content-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) {
    await loadContentMarketingFromDb();
    loaded = true;
  }
}

async function getSession() {
  const admin = await getAdminSession();
  if (admin) {
    return {
      id: "admin",
      name: (admin as unknown as { username?: string }).username || "Admin",
      isAdmin: true,
    };
  }
  const staff = await getStaffSession();
  if (staff) {
    return { id: staff.staffId, name: staff.staffId, isAdmin: false };
  }
  return null;
}

// GET /api/crm/content/calendar?start=2026-04-01&end=2026-04-30
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureLoaded();

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") || new Date(Date.now() - 7 * 86400000).toISOString();
  const end = searchParams.get("end") || new Date(Date.now() + 30 * 86400000).toISOString();

  const videos = getCalendarVideos(start, end);
  return NextResponse.json(videos);
}
