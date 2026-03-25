import { NextRequest, NextResponse } from "next/server";
import { deleteActivity } from "@/lib/crm-store";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteActivity(id);
  return NextResponse.json({ ok: true });
}
