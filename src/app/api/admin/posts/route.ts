import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAllPosts, createPost } from "@/lib/admin-store";
import { initDbOnce } from "@/lib/db-init";

export async function GET() {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  return NextResponse.json(getAllPosts());
}

export async function POST(req: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  const body = await req.json();
  const post = createPost(body);
  return NextResponse.json(post, { status: 201 });
}
