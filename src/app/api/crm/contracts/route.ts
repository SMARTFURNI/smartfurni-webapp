import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getContracts, createContract, getContractTemplates } from "@/lib/crm-contracts-store";
import { externalizeContractSignatures } from "@/lib/contract-media";

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
  const mediaId = `contract-${crypto.randomUUID()}`;
  const signatures = await externalizeContractSignatures(body.signatures, mediaId);
  const contract = await createContract({ ...body, signatures, createdBy: "Admin" });
  return NextResponse.json(contract, { status: 201 });
}
