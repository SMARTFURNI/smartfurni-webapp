import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  getCustomer,
  listAgentActions,
  listConversations,
  listCustomers,
  listSalesTasks,
  upsertCustomer,
} from "@/lib/business-brain-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const customer = await getCustomer(id);
    if (!customer) return NextResponse.json({ error: "Không tìm thấy khách hàng." }, { status: 404 });
    const [conversations, agentActions, tasks] = await Promise.all([
      listConversations(id),
      listAgentActions(id),
      listSalesTasks(id),
    ]);
    return NextResponse.json({ customer, conversations, agentActions, tasks });
  }

  const customers = await listCustomers(searchParams.get("search") || undefined);
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.phone) return NextResponse.json({ error: "Thiếu số điện thoại khách hàng." }, { status: 400 });

  const customer = await upsertCustomer({
    id: body.id,
    phone: String(body.phone),
    name: body.name ? String(body.name) : "",
    leadSource: body.leadSource,
    interestedProducts: Array.isArray(body.interestedProducts) ? body.interestedProducts.map(String) : [],
    preferredSize: body.preferredSize,
    preferredColor: body.preferredColor,
    budget: body.budget ? Number(body.budget) : undefined,
    location: body.location,
    conversationSummary: body.conversationSummary,
    temperature: body.temperature,
    leadScore: body.leadScore,
    mainPainPoint: body.mainPainPoint,
    aiNextStep: body.aiNextStep,
    ownerId: body.ownerId,
    ownerName: body.ownerName,
    metadata: body.metadata || {},
  });

  return NextResponse.json({ customer }, { status: 201 });
}
