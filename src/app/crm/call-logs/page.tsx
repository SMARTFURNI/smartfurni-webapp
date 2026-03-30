import { getCallLogs, initCallLogSchema } from "@/lib/crm-store";
import { requireCrmAccess } from "@/lib/admin-auth";
import CrmCallLogClient from "@/components/crm/CrmCallLogClient";

export const dynamic = "force-dynamic";

export default async function CallLogsPage() {
  const session = await requireCrmAccess();

  // Ensure table exists
  try { await initCallLogSchema(); } catch { /* ignore */ }

  // Fetch initial data — admin sees all, staff sees own
  const callLogs = await getCallLogs({
    limit: 100,
    staffId: session.isAdmin ? undefined : session.staffId,
  }).catch(() => []);

  return (
    <CrmCallLogClient
      initialLogs={callLogs}
      isAdmin={session.isAdmin}
      staffId={session.isAdmin ? undefined : session.staffId}
    />
  );
}
