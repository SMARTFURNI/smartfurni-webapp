import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/crm-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId") || undefined;
  const dueToday = searchParams.get("dueToday") === "true";
  return NextResponse.json(await getTasks({ leadId, dueToday }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const task = await createTask(body);
  return NextResponse.json(task, { status: 201 });
}
