import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getNpsSurvey, submitNpsResponse, updateNpsSurveyStatus } from "@/lib/crm-nps-store";

// Public endpoint - customers submit NPS responses via survey link
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const survey = await getNpsSurvey(id);
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (survey.status === "expired") return NextResponse.json({ error: "Survey expired" }, { status: 410 });
  // Return limited public data
  return NextResponse.json({
    id: survey.id,
    leadName: survey.leadName,
    status: survey.status,
    expiresAt: survey.expiresAt,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const survey = await getNpsSurvey(id);
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (survey.status === "completed") return NextResponse.json({ error: "Already completed" }, { status: 400 });
  if (survey.status === "expired") return NextResponse.json({ error: "Survey expired" }, { status: 410 });
  const body = await req.json();
  if (body.score === undefined || body.score < 0 || body.score > 10) {
    return NextResponse.json({ error: "Score must be 0-10" }, { status: 400 });
  }
  const updated = await submitNpsResponse(id, body);
  return NextResponse.json(updated);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  if (body.status) await updateNpsSurveyStatus(id, body.status);
  return NextResponse.json({ ok: true });
}
