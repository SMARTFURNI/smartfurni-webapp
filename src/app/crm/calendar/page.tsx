import { requireAdmin } from "@/lib/admin-auth";
import { getAppointments, getUpcomingAppointments } from "@/lib/crm-calendar-store";
import { getLeads } from "@/lib/crm-store";
import CalendarClient from "@/components/crm/calendar/CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await requireAdmin();

  const now = new Date();
  const [appointments, upcoming, leads] = await Promise.all([
    getAppointments({ month: now.getMonth() + 1, year: now.getFullYear() }),
    getUpcomingAppointments(7),
    getLeads(),
  ]);

  return (
    <CalendarClient
      initialAppointments={appointments}
      upcomingAppointments={upcoming}
      leads={leads.map(l => ({ id: l.id, name: l.name, company: l.company }))}
    />
  );
}
