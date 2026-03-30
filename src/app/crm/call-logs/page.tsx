import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCallLogs, initCallLogSchema } from "@/lib/crm-store";
import CrmCallLogClient from "@/components/crm/CrmCallLogClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CallLogsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const isAdmin = (session.user as { role?: string }).role === "admin";
  const staffId = (session.user as { id?: string }).id;

  // Ensure table exists
  try { await initCallLogSchema(); } catch { /* ignore */ }

  // Fetch initial data — admin sees all, staff sees own
  const callLogs = await getCallLogs({
    limit: 100,
    staffId: isAdmin ? undefined : staffId,
  });

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    }>
      <CrmCallLogClient
        initialLogs={callLogs}
        isAdmin={isAdmin}
        staffId={isAdmin ? undefined : staffId}
      />
    </Suspense>
  );
}
