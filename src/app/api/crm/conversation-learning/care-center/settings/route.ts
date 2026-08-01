import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  DEFAULT_FANPAGE_CARE_SETTINGS,
  getFanpageCareSettings,
  resetFanpageCareSettings,
  saveFanpageCareSettings,
} from "@/lib/fanpage-care-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdministrator(session: Awaited<ReturnType<typeof getCrmSession>>) {
  return Boolean(session?.isAdmin || session?.staffRole === "super_admin");
}

function actorId(session: Awaited<ReturnType<typeof getCrmSession>>) {
  return session?.staffId || (session?.isAdmin ? "admin" : "unknown");
}

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdministrator(session)) {
    return NextResponse.json({ error: "Chỉ admin được xem cấu hình AI." }, { status: 403 });
  }
  const stored = await getFanpageCareSettings();
  return NextResponse.json({ ...stored, defaults: DEFAULT_FANPAGE_CARE_SETTINGS });
}

export async function PUT(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdministrator(session)) {
    return NextResponse.json({ error: "Chỉ admin được sửa cấu hình AI." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({})) as { settings?: unknown };
  if (!body.settings) return NextResponse.json({ error: "Thiếu cấu hình cần lưu." }, { status: 400 });
  const stored = await saveFanpageCareSettings(body.settings, actorId(session));
  return NextResponse.json(stored);
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdministrator(session)) {
    return NextResponse.json({ error: "Chỉ admin được khôi phục cấu hình AI." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({})) as { action?: string };
  if (body.action !== "reset") return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });
  const stored = await resetFanpageCareSettings(actorId(session));
  return NextResponse.json(stored);
}
