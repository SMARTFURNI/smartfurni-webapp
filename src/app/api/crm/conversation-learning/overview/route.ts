import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getConversationLearningOverview } from "@/lib/conversation-learning-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const overview = await getConversationLearningOverview();
  return NextResponse.json({ overview });
}
