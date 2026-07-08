import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { listConversationAnalyses } from "@/lib/conversation-learning-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Number(new URL(req.url).searchParams.get("limit") || 100);
  const analyses = await listConversationAnalyses(Number.isFinite(limit) ? limit : 100);
  return NextResponse.json({ analyses });
}
