import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  getFanpageCareOverview,
  listFanpageCarePlans,
  listFanpageCareRuns,
  listFanpageCareStaff,
  runDailyFanpageCareCenter,
  updateFanpageCarePlan,
} from "@/lib/fanpage-care-center";
import type { FanpageCarePlanStatus } from "@/types/fanpage-care-center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set<FanpageCarePlanStatus>([
  "pending",
  "approved",
  "in_progress",
  "completed",
  "dismissed",
]);

function actorId(session: Awaited<ReturnType<typeof getCrmSession>>) {
  return session?.staffId || (session?.isAdmin ? "admin" : "unknown");
}

function canManage(session: Awaited<ReturnType<typeof getCrmSession>>) {
  return Boolean(
    session?.isAdmin ||
    session?.staffRole === "super_admin" ||
    session?.staffRole === "manager",
  );
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const statusValue = url.searchParams.get("status");
  const status = statusValue && STATUSES.has(statusValue as FanpageCarePlanStatus)
    ? statusValue as FanpageCarePlanStatus
    : undefined;
  const assignedStaffId = canManage(session)
    ? url.searchParams.get("assignedStaffId") || undefined
    : session.staffId;
  const [overview, plans, runs, staff] = await Promise.all([
    getFanpageCareOverview(),
    listFanpageCarePlans({
      status,
      assignedStaffId,
      pageInternalId: url.searchParams.get("pageInternalId") || undefined,
      limit: Number(url.searchParams.get("limit") || 150),
    }),
    listFanpageCareRuns(20),
    canManage(session) ? listFanpageCareStaff() : Promise.resolve([]),
  ]);
  return NextResponse.json({
    overview,
    plans,
    runs,
    staff,
    permissions: {
      canRun: canManage(session),
      canAssign: canManage(session),
      canReview: true,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) {
    return NextResponse.json({ error: "Chỉ quản lý được chạy phân tích toàn bộ Fanpage." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({})) as { force?: boolean };
  const result = await runDailyFanpageCareCenter({
    force: body.force !== false,
    actorId: actorId(session),
    runType: "manual",
  });
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({})) as {
    id?: string;
    status?: FanpageCarePlanStatus;
    assignedStaffId?: string | null;
  };
  if (!body.id) return NextResponse.json({ error: "Thiếu ID kế hoạch." }, { status: 400 });
  if (body.status && !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  }
  if (body.assignedStaffId !== undefined && !canManage(session)) {
    return NextResponse.json({ error: "Bạn không có quyền phân công nhân viên." }, { status: 403 });
  }
  if (!canManage(session) && session.staffId) {
    const ownPlans = await listFanpageCarePlans({ assignedStaffId: session.staffId, limit: 500 });
    if (!ownPlans.some(plan => plan.id === body.id)) {
      return NextResponse.json({ error: "Bạn không được cập nhật kế hoạch của nhân viên khác." }, { status: 403 });
    }
  }
  const plan = await updateFanpageCarePlan({
    id: body.id,
    status: body.status,
    assignedStaffId: body.assignedStaffId,
    actorId: actorId(session),
  });
  if (!plan) return NextResponse.json({ error: "Không tìm thấy kế hoạch." }, { status: 404 });
  return NextResponse.json({ plan });
}
