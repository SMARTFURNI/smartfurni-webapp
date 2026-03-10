import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAllUsers, getUserDashboardStats, createUser } from "@/lib/user-store";
import type { UserRole, UserStatus, UserSource } from "@/lib/user-store";

export async function GET(request: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode === "dashboard") {
    return NextResponse.json(getUserDashboardStats());
  }

  // Filters
  const search = searchParams.get("search")?.toLowerCase() || "";
  const role = searchParams.get("role") || "all";
  const status = searchParams.get("status") || "all";
  const city = searchParams.get("city") || "all";

  let users = getAllUsers();

  if (search) {
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.phone.includes(search)
    );
  }
  if (role !== "all") users = users.filter((u) => u.role === role);
  if (status !== "all") users = users.filter((u) => u.status === status);
  if (city !== "all") users = users.filter((u) => u.city === city);

  return NextResponse.json({ users, total: users.length });
}

export async function POST(request: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, email, phone, role, status, source, city, notes, tags } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Tên và số điện thoại là bắt buộc" }, { status: 400 });
    }

    const user = createUser({
      name: name.trim(),
      email: email?.trim() || "",
      phone: phone.trim(),
      role: (role as UserRole) || "customer",
      status: (status as UserStatus) || "active",
      source: (source as UserSource) || "direct",
      city: city || "TP. Hồ Chí Minh",
      notes: notes?.trim() || undefined,
      tags: Array.isArray(tags) ? tags : [],
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
}
