import { NextRequest, NextResponse } from "next/server";
import { getGoogleAdsAgentSession } from "@/lib/google-ads-agent/auth";
import { setDraftStatus } from "@/lib/google-ads-agent/store";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getGoogleAdsAgentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const status = body.status === "rejected" ? "rejected" : "human_approved";
  const draft = await setDraftStatus(id, status, session.actor, body.reason);
  if (!draft) return NextResponse.json({ error: "Không tìm thấy bản nháp" }, { status: 404 });
  return NextResponse.json(draft);
}
