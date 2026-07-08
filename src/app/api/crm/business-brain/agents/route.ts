import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { listAgentActions, listAgents, listWorkflows, updateAgent } from "@/lib/business-brain-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [agents, workflows, actions] = await Promise.all([listAgents(), listWorkflows(), listAgentActions()]);
  return NextResponse.json({ agents, workflows, actions });
}

export async function PATCH(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Thiếu ID agent." }, { status: 400 });

  const agent = await updateAgent(String(body.id), {
    name: body.name,
    role: body.role,
    allowedActions: Array.isArray(body.allowedActions) ? body.allowedActions.map(String) : undefined,
    systemPrompt: body.systemPrompt,
    tools: Array.isArray(body.tools) ? body.tools.map(String) : undefined,
    status: body.status,
  });

  if (!agent) return NextResponse.json({ error: "Không tìm thấy agent." }, { status: 404 });
  return NextResponse.json({ agent });
}
