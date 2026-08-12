import { NextResponse } from "next/server";
import { authorizeBusinessBrain } from "@/lib/business-brain-auth";
import { getKnowledgeGovernanceReport } from "@/lib/business-brain-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await authorizeBusinessBrain("business_brain_view");
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ governance: await getKnowledgeGovernanceReport() });
}
