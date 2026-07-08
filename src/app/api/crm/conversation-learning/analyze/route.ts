import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { analyzeLatestConversations } from "@/lib/conversation-learning-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actorFromSession(session: Awaited<ReturnType<typeof getCrmSession>>) {
  return session?.staffId || (session?.isAdmin ? "admin" : "unknown");
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const limit = Number(body.limit || 50);
  const result = await analyzeLatestConversations(Number.isFinite(limit) ? limit : 50, actorFromSession(session));
  return NextResponse.json(result);
}
