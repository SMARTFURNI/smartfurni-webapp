import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllStaff, createStaff } from "@/lib/crm-staff-store";
import type { StaffRole } from "@/lib/crm-staff-store";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const staff = await getAllStaff();
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.username || !body.password || !body.fullName || !body.role) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }
  const staff = await createStaff({
    username: body.username,
    password: body.password,
    fullName: body.fullName,
    email: body.email || "",
    phone: body.phone || "",
    role: body.role as StaffRole,
    assignedDistricts: body.assignedDistricts || [],
    targetRevenue: body.targetRevenue || 0,
  });
  return NextResponse.json(staff, { status: 201 });
}
