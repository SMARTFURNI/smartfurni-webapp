/**
 * ITY Call Answered Webhook - Alias Route
 * POST /wsapi/{customer}/call_answered?secret={secret}
 *
 * ITY uses this public URL shape. Keep all persistence and reconciliation in
 * the canonical call-completed handler so the recording enriches the original
 * browser/click-to-call record instead of creating a second call.
 */
import { NextRequest, NextResponse } from "next/server";
import { POST as handleCallCompleted } from "@/app/api/crm/ity/call-completed/route";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ customer: string }> },
) {
  const { customer } = await params;
  const expectedCustomer = process.env.ITY_CUSTOMER || "89866001";
  if (customer !== expectedCustomer) {
    return NextResponse.json({ error: "Invalid customer" }, { status: 403 });
  }
  return handleCallCompleted(req);
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/wsapi/{customer}/call_answered",
    description: "ITY Call Answered Webhook - nhận và gộp call log từ tổng đài ITY",
    method: "POST",
  });
}
