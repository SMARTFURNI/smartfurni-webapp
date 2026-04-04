import { NextRequest, NextResponse } from "next/server";
import {
  getZaloReminders,
  createZaloReminder,
  removeZaloReminder,
} from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");
  const isGroup = searchParams.get("isGroup") === "true";

  if (!threadId) return NextResponse.json({ success: false, error: "threadId required" }, { status: 400 });

  try {
    return NextResponse.json(await getZaloReminders(threadId, isGroup));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, threadId, title, emoji, startTime, repeat, isGroup, reminderId } = body;

    switch (action) {
      case "create":
        if (!threadId || !title) return NextResponse.json({ success: false, error: "threadId and title required" }, { status: 400 });
        return NextResponse.json(await createZaloReminder({ threadId, title, emoji, startTime, repeat, isGroup }));
      case "delete":
        if (!reminderId || !threadId) return NextResponse.json({ success: false, error: "reminderId and threadId required" }, { status: 400 });
        return NextResponse.json(await removeZaloReminder(reminderId, threadId, isGroup));
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
