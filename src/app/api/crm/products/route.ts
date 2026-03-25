import { NextRequest, NextResponse } from "next/server";
import { getCrmProducts, upsertCrmProduct } from "@/lib/crm-store";

export async function GET() {
  return NextResponse.json(await getCrmProducts());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const product = await upsertCrmProduct(body);
  return NextResponse.json(product, { status: 201 });
}
