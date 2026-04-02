import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getCrmProducts, upsertCrmProduct, deleteCrmProduct } from "@/lib/crm-store";
import { logAudit, getClientIp, resolveActorName } from "@/lib/audit-helper";

export async function GET() {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getCrmProducts());
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const existing = (await getCrmProducts()).find((p: { id: string }) => p.id === body.id);
  const product = await upsertCrmProduct(body);
  const { actorId, actorName } = await resolveActorName(session);
  await logAudit({
    action: existing ? "lead.updated" as any : "lead.created" as any,
    entityType: "product",
    entityId: product.id,
    entityName: product.name || product.sku,
    actorId,
    actorName,
    ipAddress: getClientIp(req),
    metadata: { sku: product.sku, category: product.category, basePrice: product.basePrice },
  });
  return NextResponse.json(product, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const existing = (await getCrmProducts()).find((p: { id: string }) => p.id === id);
  await deleteCrmProduct(id);
  const { actorId, actorName } = await resolveActorName(session);
  await logAudit({
    action: "lead.deleted" as any,
    entityType: "product",
    entityId: id,
    entityName: existing?.name || existing?.sku || id,
    actorId,
    actorName,
    ipAddress: getClientIp(req),
  });
  return NextResponse.json({ success: true });
}
