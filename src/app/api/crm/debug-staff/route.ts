import { NextResponse } from "next/server";
import { getAllStaff, initStaffSchema } from "@/lib/crm-staff-store";

// Temporary debug endpoint - remove after testing
export async function GET() {
  try {
    await initStaffSchema();
    const staff = await getAllStaff();
    return NextResponse.json({
      count: staff.length,
      staff: staff.map(s => ({
        id: s.id,
        username: s.username,
        fullName: s.fullName,
        role: s.role,
        status: s.status,
        lastLoginAt: s.lastLoginAt,
        createdAt: s.createdAt,
      }))
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
