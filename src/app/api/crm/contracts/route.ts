import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getContracts, createContract, getContractTemplates } from "@/lib/crm-contracts-store";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  if (searchParams.get("templates") === "1") {
    const templates = await getContractTemplates();
    return NextResponse.json(templates);
  }
  const leadId = searchParams.get("leadId") ?? undefined;
  const status = searchParams.get("status") as "draft" | "sent" | "signed" | "cancelled" | "expired" | undefined;
  const contracts = await getContracts({ leadId, status });
  return NextResponse.json(contracts);
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const contract = await createContract({ ...body, createdBy: "Admin" });
  return NextResponse.json(contract, { status: 201 });
}
