import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  approveSalesScript,
  generateDraftSalesScripts,
  listSalesScripts,
  publishSalesScriptToKnowledge,
} from "@/lib/conversation-learning-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function actorFromSession(session: Awaited<ReturnType<typeof getCrmSession>>) {
  return session?.staffId || (session?.isAdmin ? "admin" : "unknown");
}

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scripts = await listSalesScripts();
  return NextResponse.json({ scripts });
}

export async function POST() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scripts = await generateDraftSalesScripts(actorFromSession(session));
  return NextResponse.json({ scripts }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Thiếu ID script." }, { status: 400 });

  if (body.action === "approve") {
    const script = await approveSalesScript(String(body.id));
    if (!script) return NextResponse.json({ error: "Không tìm thấy script." }, { status: 404 });
    return NextResponse.json({ script });
  }

  if (body.action === "publish") {
    const document = await publishSalesScriptToKnowledge(String(body.id), actorFromSession(session));
    if (!document) return NextResponse.json({ error: "Không tìm thấy script." }, { status: 404 });
    return NextResponse.json({ document });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
