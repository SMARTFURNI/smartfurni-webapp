import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getCallLog } from "@/lib/crm-store";
import { ensureHotlineInboundCallLog } from "@/lib/crm-hotline-inbound";
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
  try {
    const { id } = await context.params;
    const call = await ensureHotlineInboundCallLog(id);
    return NextResponse.json({ call });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không tìm thấy cuộc gọi" }, { status: 404 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const synced = await ensureHotlineInboundCallLog(id);
    const queued = await enqueueCallAiAnalysis(synced.id, body.force === true);
    if (!queued) {
      return NextResponse.json({ error: "Cuộc gọi cần nghe máy, có bản ghi âm và đủ thời lượng để phân tích", call: synced }, { status: 422 });
    }
    const result = await processCallAiJob(synced.id);
    const call = await getCallLog(synced.id);
    return NextResponse.json({ ...result, call }, { status: result.status === "failed" ? 502 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể phân tích cuộc gọi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action !== "approve_next_action") {
    return NextResponse.json({ error: "Thao tác không hợp lệ" }, { status: 400 });
  }
  try {
    const { id } = await context.params;
    const synced = await ensureHotlineInboundCallLog(id);
    const result = await approveCallAiNextAction(synced.id, await reviewerName(session));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể duyệt đề xuất" }, { status: 422 });
  }
}
