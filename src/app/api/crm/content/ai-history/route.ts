import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
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
  const session = await getCrmSession();
  if (!session) return null;
  return {
    id: session.isAdmin ? "admin" : (session.staffId || "staff"),
    name: session.isAdmin ? "Admin" : (session.staffId || "Staff"),
    isAdmin: session.isAdmin,
  };
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
