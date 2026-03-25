import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getNpsSurveys, createNpsSurvey, getNpsStats, getNpsConfig, saveNpsConfig } from "@/lib/crm-nps-store";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  if (searchParams.get("stats") === "1") {
    const stats = await getNpsStats();
    return NextResponse.json(stats);
  }
  if (searchParams.get("config") === "1") {
    const config = await getNpsConfig();
    return NextResponse.json(config);
  }
  const leadId = searchParams.get("leadId") ?? undefined;
  const surveys = await getNpsSurveys({ leadId });
  return NextResponse.json(surveys);
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("config") === "1") {
    const session = await getCrmSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    await saveNpsConfig(body);
    return NextResponse.json({ ok: true });
  }
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const survey = await createNpsSurvey(body);
  return NextResponse.json(survey, { status: 201 });
}
