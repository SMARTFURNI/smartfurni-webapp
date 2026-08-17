import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getCallLog } from "@/lib/crm-store";
import { approveCallAiNextAction, enqueueCallAiAnalysis, processCallAiJob } from "@/lib/crm-call-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function reviewerName(session: Awaited<ReturnType<typeof getCrmSession>>) {
  if (!session) return "Hệ thống";
  if (session.isAdmin) return "Admin";
  if (session.staffId) {
    const staff = await getStaffById(session.staffId).catch(() => null);
    return staff?.fullName || session.staffId;
  }
  return "Hệ thống";
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const call = await getCallLog(id);
  if (!call) return NextResponse.json({ error: "Không tìm thấy cuộc gọi" }, { status: 404 });
  return NextResponse.json({ status: call.aiStatus, error: call.aiError, analysis: call.aiAnalysis });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const queued = await enqueueCallAiAnalysis(id, body.force === true);
  if (!queued) return NextResponse.json({ error: "Cuộc gọi cần thành công, có bản ghi âm và đủ thời lượng để phân tích" }, { status: 422 });
  const result = await processCallAiJob(id);
  const call = await getCallLog(id);
  const status = result.status === "failed" ? 502 : 200;
  return NextResponse.json({ ...result, call }, { status });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== "approve_next_action") {
    return NextResponse.json({ error: "Thao tác không hợp lệ" }, { status: 400 });
  }
  try {
    const result = await approveCallAiNextAction(id, await reviewerName(session));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể duyệt đề xuất" }, { status: 422 });
  }
}
