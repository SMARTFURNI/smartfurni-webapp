import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAutomationQueueOverview, getAutomationSchedulerHealth, retryFailedAutomationJobs } from "@/lib/crm-automation-execution-store";
import { getNotificationLogs } from "@/lib/crm-notifications-store";
import { getAutomationContactPolicy } from "@/lib/crm-automation-store";
import { logAudit, getClientIp } from "@/lib/audit-helper";
import { getAutomationCircuitHealth } from "@/lib/crm-automation-policy";
import { listZaloAccounts } from "@/lib/zalo-account-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [scheduler, queues, recent, policy, emailCircuit, zaloCircuit, zaloAccounts] = await Promise.all([
    getAutomationSchedulerHealth(), getAutomationQueueOverview(), getNotificationLogs(40), getAutomationContactPolicy(),
    getAutomationCircuitHealth("email"), getAutomationCircuitHealth("zalo_personal"),
    listZaloAccounts().catch(() => []),
  ]);
  const lastRunAgeMinutes = scheduler.lastRunAt ? Math.max(0, Math.round((Date.now() - new Date(scheduler.lastRunAt).getTime()) / 60_000)) : null;
  const failed = queues.reduce((sum, row) => sum + row.failed, 0);
  const stale = lastRunAgeMinutes === null || lastRunAgeMinutes > 60;
  return NextResponse.json({
    ready: !stale && failed === 0 && !emailCircuit.open && !zaloCircuit.open && Boolean(process.env.CRON_SECRET),
    scheduler: { ...scheduler, lastRunAgeMinutes, configured: Boolean(process.env.CRON_SECRET), stale },
    queues,
    recent,
    policy,
    circuits: [emailCircuit, zaloCircuit],
    zaloAccounts: zaloAccounts.map(account => ({ id: account.id, displayName: account.displayName, label: account.label, isActive: account.isActive, lastConnected: account.lastConnected })),
    alerts: [
      ...(!process.env.CRON_SECRET ? [{ severity: "critical", code: "cron_secret", message: "CRON_SECRET chưa được cấu hình; production cron sẽ từ chối chạy." }] : []),
      ...(stale ? [{ severity: "critical", code: "scheduler_stale", message: "Scheduler chưa chạy trong 60 phút gần nhất." }] : []),
      ...(failed ? [{ severity: "warning", code: "failed_jobs", message: `Có ${failed} công việc gửi lỗi cần xử lý.` }] : []),
      ...([emailCircuit, zaloCircuit].filter(item => item.open).map(item => ({ severity: "critical", code: `circuit_${item.channel}`, message: `${item.channel} đang tự tạm dừng do tỷ lệ lỗi ${item.failureRate}% trong 30 phút.` }))),
    ],
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (body.action !== "retry_failed" || !["email", "zalo_personal"].includes(body.channel)) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
  const retried = await retryFailedAutomationJobs(body.channel);
  await logAudit({ action: "automation.jobs_retried", entityType: "automation_queue", entityId: body.channel,
    entityName: body.channel, actorId: "admin", actorName: "Admin", ipAddress: getClientIp(req), metadata: { retried } });
  return NextResponse.json({ ok: true, retried });
}
