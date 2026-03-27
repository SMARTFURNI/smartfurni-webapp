/**
 * crm-calendar-store.ts — SmartFurni CRM Calendar & Appointments
 * Quản lý lịch hẹn, cuộc gặp, nhắc nhở
 */

import { query, queryOne } from "./db";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppointmentType = "meeting" | "call" | "site_visit" | "demo" | "followup";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  leadId: string | null;
  leadName: string;
  assignedTo: string;
  startAt: string;       // ISO datetime
  endAt: string;         // ISO datetime
  location: string;
  notes: string;
  reminderMinutes: number; // 15, 30, 60, 1440 (1 ngày)
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  meeting:    "Cuộc họp",
  call:       "Gọi điện",
  site_visit: "Khảo sát thực địa",
  demo:       "Demo sản phẩm",
  followup:   "Follow-up",
};

export const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  meeting:    "#60a5fa",
  call:       "#22c55e",
  site_visit: "#C9A84C",
  demo:       "#a78bfa",
  followup:   "#f97316",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled:  "Đã lên lịch",
  confirmed:  "Đã xác nhận",
  completed:  "Hoàn thành",
  cancelled:  "Đã hủy",
  no_show:    "Không đến",
};

// ─── DB Init ──────────────────────────────────────────────────────────────────

export async function initCalendarTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_appointments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'meeting',
      status TEXT NOT NULL DEFAULT 'scheduled',
      lead_id TEXT,
      lead_name TEXT NOT NULL DEFAULT '',
      assigned_to TEXT NOT NULL DEFAULT '',
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      reminder_minutes INT DEFAULT 30,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function rowToAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: row.id as string,
    title: row.title as string,
    type: row.type as AppointmentType,
    status: row.status as AppointmentStatus,
    leadId: row.lead_id as string | null,
    leadName: row.lead_name as string,
    assignedTo: row.assigned_to as string,
    startAt: (row.start_at as Date).toISOString(),
    endAt: (row.end_at as Date).toISOString(),
    location: row.location as string,
    notes: row.notes as string,
    reminderMinutes: Number(row.reminder_minutes),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export async function getAppointments(params?: {
  month?: number; year?: number; assignedTo?: string;
}): Promise<Appointment[]> {
  await initCalendarTables();
  let sql = "SELECT * FROM crm_appointments WHERE 1=1";
  const values: unknown[] = [];
  let i = 1;
  if (params?.month !== undefined && params?.year !== undefined) {
    sql += ` AND EXTRACT(MONTH FROM start_at)=$${i++} AND EXTRACT(YEAR FROM start_at)=$${i++}`;
    values.push(params.month, params.year);
  }
  if (params?.assignedTo) {
    sql += ` AND assigned_to=$${i++}`;
    values.push(params.assignedTo);
  }
  sql += " ORDER BY start_at ASC";
  const rows = await query(sql, values);
  return rows.map(rowToAppointment);
}

export async function getTodayAppointments(): Promise<Appointment[]> {
  await initCalendarTables();
  const rows = await query(
    `SELECT * FROM crm_appointments
     WHERE DATE(start_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
     ORDER BY start_at ASC`
  );
  return rows.map(rowToAppointment);
}

export async function getUpcomingAppointments(days = 7): Promise<Appointment[]> {
  await initCalendarTables();
  const rows = await query(
    `SELECT * FROM crm_appointments
     WHERE start_at >= NOW() AND start_at <= NOW() + INTERVAL '${days} days'
     AND status IN ('scheduled','confirmed')
     ORDER BY start_at ASC LIMIT 20`
  );
  return rows.map(rowToAppointment);
}

export async function createAppointment(data: Omit<Appointment, "id" | "createdAt" | "updatedAt">): Promise<Appointment> {
  await initCalendarTables();
  const id = randomUUID();
  const row = await queryOne(
    `INSERT INTO crm_appointments
     (id, title, type, status, lead_id, lead_name, assigned_to, start_at, end_at, location, notes, reminder_minutes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [id, data.title, data.type, data.status, data.leadId, data.leadName,
     data.assignedTo, data.startAt, data.endAt, data.location, data.notes, data.reminderMinutes]
  );
  return rowToAppointment(row!);
}

export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const map: Record<string, string> = {
    title: "title", type: "type", status: "status", leadId: "lead_id",
    leadName: "lead_name", assignedTo: "assigned_to", startAt: "start_at",
    endAt: "end_at", location: "location", notes: "notes", reminderMinutes: "reminder_minutes",
  };
  for (const [key, col] of Object.entries(map)) {
    if ((data as Record<string, unknown>)[key] !== undefined) {
      fields.push(`${col}=$${i++}`);
      values.push((data as Record<string, unknown>)[key]);
    }
  }
  if (!fields.length) return null;
  fields.push("updated_at=NOW()");
  values.push(id);
  const row = await queryOne(
    `UPDATE crm_appointments SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`,
    values
  );
  return row ? rowToAppointment(row) : null;
}

export async function deleteAppointment(id: string): Promise<void> {
  await query("DELETE FROM crm_appointments WHERE id=$1", [id]);
}
