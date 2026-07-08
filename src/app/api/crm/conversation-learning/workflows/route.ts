import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { generateDraftSalesWorkflows, listSalesWorkflows } from "@/lib/conversation-learning-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actorFromSession(session: Awaited<ReturnType<typeof getCrmSession>>) {
  return session?.staffId || (session?.isAdmin ? "admin" : "unknown");
}

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await listSalesWorkflows();
  return NextResponse.json({ workflows });
}

export async function POST() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await generateDraftSalesWorkflows(actorFromSession(session));
  return NextResponse.json({ workflows }, { status: 201 });
}
