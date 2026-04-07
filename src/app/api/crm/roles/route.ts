import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { getAllRoles, createRole } from "@/lib/crm-roles-store";
import type { RolePermissions } from "@/lib/crm-roles-store";

export async function GET() {
  const admin = await getAdminSession();
  const staff = await getStaffSession();
  if (!admin && !staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = await getAllRoles();
  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  const staff = await getStaffSession();
  if (!admin && !staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Chỉ super_admin hoặc admin mới được tạo role
  if (!admin && staff?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json() as {
    name: string;
    color: string;
    icon: string;
    description: string;
    permissions: RolePermissions;
  };
  if (!body.name?.trim()) return NextResponse.json({ error: "Tên vai trò không được để trống" }, { status: 400 });
  const role = await createRole(body);
  return NextResponse.json(role);
}
