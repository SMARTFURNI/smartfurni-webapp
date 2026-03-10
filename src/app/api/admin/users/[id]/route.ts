import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getUserById, updateUser, deleteUser, blockUser, unblockUser } from "@/lib/user-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const user = getUserById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  if (body.action === "block") {
    const user = blockUser(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  }
  if (body.action === "unblock") {
    const user = unblockUser(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  }

  const user = updateUser(id, body);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const deleted = deleteUser(id);
  if (!deleted) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
