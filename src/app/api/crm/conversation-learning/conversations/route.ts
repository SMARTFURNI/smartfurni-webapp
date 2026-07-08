import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { loadConversationSources } from "@/lib/conversation-learning-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Number(new URL(req.url).searchParams.get("limit") || 50);
  const sources = await loadConversationSources(Number.isFinite(limit) ? limit : 50);
  return NextResponse.json({ sources });
}
