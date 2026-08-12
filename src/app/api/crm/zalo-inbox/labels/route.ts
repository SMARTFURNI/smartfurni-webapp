import { NextResponse } from "next/server";
import { getZaloLabels } from "@/lib/zalo-gateway";
import { getAuthorizedZaloInboxSession } from "@/lib/zalo-inbox-access";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await getAuthorizedZaloInboxSession()) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  try {
    return NextResponse.json(await getZaloLabels());
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
