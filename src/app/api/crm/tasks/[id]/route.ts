import { getCrmSession } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/lib/crm-store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const updates = await req.json();
  const task = await updateTask(id, updates);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteTask(id);
  return NextResponse.json({ ok: true });
}
