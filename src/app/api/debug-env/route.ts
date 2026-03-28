import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 8) || "NOT_SET",
    fromEmail: process.env.RESEND_FROM_EMAIL || "NOT_SET",
    nodeEnv: process.env.NODE_ENV,
  });
}
