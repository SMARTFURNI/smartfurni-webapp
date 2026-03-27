import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  getAppointments, createAppointment, updateAppointment, deleteAppointment,
  getTodayAppointments, getUpcomingAppointments,
} from "@/lib/crm-calendar-store";

async function checkAuth() {
  const session = await getCrmSession();
  return session !== null;
}

export async function GET(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");

  if (view === "today") {
    const appointments = await getTodayAppointments();
    return NextResponse.json(appointments);
  }
  if (view === "upcoming") {
    const days = parseInt(searchParams.get("days") || "7");
    const appointments = await getUpcomingAppointments(days);
    return NextResponse.json(appointments);
  }

  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const assignedTo = searchParams.get("assignedTo") || undefined;

  const appointments = await getAppointments({ month, year, assignedTo });
  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const appointment = await createAppointment({
    title: body.title,
    type: body.type || "meeting",
    status: body.status || "scheduled",
    leadId: body.leadId || null,
    leadName: body.leadName || "",
    assignedTo: body.assignedTo || "Admin",
    startAt: body.startAt,
    endAt: body.endAt,
    location: body.location || "",
    notes: body.notes || "",
    reminderMinutes: body.reminderMinutes || 30,
  });
  return NextResponse.json(appointment);
}

export async function PATCH(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...data } = body;
  const updated = await updateAppointment(id, data);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await deleteAppointment(id);
  return NextResponse.json({ ok: true });
}
