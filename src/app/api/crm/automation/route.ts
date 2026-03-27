import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getAutomationRules, saveAutomationRules,
  getSlaConfig, saveSlaConfig,
  getAutoAssignConfig, saveAutoAssignConfig,
} from "@/lib/crm-automation-store";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "rules";
  if (type === "sla") return NextResponse.json(await getSlaConfig());
  if (type === "auto_assign") return NextResponse.json(await getAutoAssignConfig());
  return NextResponse.json(await getAutomationRules());
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { type, data } = body;
  if (type === "sla") { await saveSlaConfig(data); return NextResponse.json({ ok: true }); }
  if (type === "auto_assign") { await saveAutoAssignConfig(data); return NextResponse.json({ ok: true }); }
  await saveAutomationRules(data);
  return NextResponse.json({ ok: true });
}
