import { NextResponse } from "next/server";
import { getZaloLabels } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getZaloLabels());
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
