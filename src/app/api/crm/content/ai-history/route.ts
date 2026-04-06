import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import {
  getAIGenerations,
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

// GET /api/crm/content/ai-history?limit=50
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureLoaded();

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const generations = getAIGenerations(limit);
  return NextResponse.json(generations);
}
