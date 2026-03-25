import { NextRequest, NextResponse } from "next/server";
import { getQuotes, createQuote } from "@/lib/crm-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId") || undefined;
  return NextResponse.json(await getQuotes(leadId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const quote = await createQuote(body);
  return NextResponse.json(quote, { status: 201 });
}
