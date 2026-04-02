import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getQuote, updateQuote } from "@/lib/crm-store";
import { logAudit, getClientIp } from "@/lib/audit-helper";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(quote);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const updates = await req.json();
  const quote = await updateQuote(id, updates);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ghi audit log khi gửi báo giá
  const action = updates.status === "sent" ? "quote.sent"
    : updates.status === "approved" ? "quote.approved"
    : "quote.updated";

  await logAudit({
    action,
    entityType: "quote",
    entityId: quote.id,
    entityName: `Báo giá - ${quote.customerName || id}`,
    actorId: session.staffId || null,
    actorName: session.isAdmin ? "Admin" : (session.staffId || "System"),
    ipAddress: getClientIp(req),
    metadata: { status: quote.status, totalAmount: quote.totalAmount },
  });

  return NextResponse.json(quote);
}
