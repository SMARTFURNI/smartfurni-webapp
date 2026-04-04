import { NextRequest, NextResponse } from "next/server";
import {
  getZaloAutoReplies,
  createZaloAutoReply,
  deleteZaloAutoReply,
} from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getZaloAutoReplies());
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, message, startTime, endTime, replyId } = body;

    switch (action) {
      case "create":
        if (!message) return NextResponse.json({ success: false, error: "message required" }, { status: 400 });
        return NextResponse.json(await createZaloAutoReply({ message, startTime, endTime }));
      case "delete":
        if (replyId == null) return NextResponse.json({ success: false, error: "replyId required" }, { status: 400 });
        return NextResponse.json(await deleteZaloAutoReply(replyId));
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
