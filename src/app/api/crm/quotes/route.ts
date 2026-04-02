import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getQuotes, createQuote } from "@/lib/crm-store";
import { logAudit, getClientIp, resolveActorName } from "@/lib/audit-helper";

export async function GET(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId") || undefined;
  return NextResponse.json(await getQuotes(leadId));
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const quote = await createQuote(body);
  const { actorId, actorName } = await resolveActorName(session);
  await logAudit({
    action: "quote.created",
    entityType: "quote",
    entityId: quote.id,
    entityName: `Báo giá - ${quote.customerName || "Khách hàng"}`,
    actorId,
    actorName,
    ipAddress: getClientIp(req),
    metadata: { leadId: quote.leadId, totalAmount: quote.totalAmount, status: quote.status },
  });
  return NextResponse.json(quote, { status: 201 });
}
