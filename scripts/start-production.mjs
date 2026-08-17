import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applyFacebookGroupMigrations } from "./apply-facebook-group-migrations.mjs";

const port = String(process.env.PORT || "3000");
const cronSecret = process.env.CRON_SECRET || randomBytes(32).toString("hex");
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const databaseUrl = process.env.POSTGRESQL_URL || process.env.DATABASE_URL;
const migrationResult = await applyFacebookGroupMigrations({
  connectionString: databaseUrl,
  migrationNames: [
    "007_add_facebook_group_ai_operations.sql",
    "008_add_fanpage_ai_care_center.sql",
    "009_add_ai_group_growth_foundation.sql",
    "010_add_media_assets.sql",
    "011_add_zalo_gmf_workspace.sql",
  ],
});
if (migrationResult.applied.length) {
  console.log("[Production Migration] Applied:", migrationResult.applied.join(", "));
}
const intervalMs = Math.max(
  15_000,
  Number(process.env.FACEBOOK_GROUP_CRON_INTERVAL_MS || 30_000),
);
const cronUrl = `http://127.0.0.1:${port}/api/crm/facebook-group-marketing/cron`;
const fanpageCareCronUrl = `http://127.0.0.1:${port}/api/crm/conversation-learning/cron`;
const mediaCleanupUrl = `http://127.0.0.1:${port}/api/internal/media-cleanup`;
const zaloGmfCronUrl = `http://127.0.0.1:${port}/api/crm/zalo/gmf/cron`;
const crmAutomationCronUrl = `http://127.0.0.1:${port}/api/crm/automation/cron`;
const callAiCronUrl = `http://127.0.0.1:${port}/api/crm/call-ai/cron`;
const fanpageCareIntervalMs = Math.max(
  5 * 60_000,
  Number(process.env.FANPAGE_AI_CRON_INTERVAL_MS || 15 * 60_000),
);
const crmAutomationIntervalMs = Math.max(
  5 * 60_000,
  Number(process.env.CRM_AUTOMATION_CRON_INTERVAL_MS || 30 * 60_000),
);
const callAiIntervalMs = Math.max(30_000, Number(process.env.CALL_AI_CRON_INTERVAL_MS || 60_000));

if (!process.env.CRON_SECRET) {
  console.warn("[Production Scheduler] CRON_SECRET chưa cấu hình; đang dùng secret tạm cho scheduler nội bộ của tiến trình này.");
}

const nextProcess = spawn(process.execPath, [nextBin, "start", "-p", port], {
  env: { ...process.env, CRON_SECRET: cronSecret },
  stdio: "inherit",
});

let stopping = false;
let cronTimer;
let fanpageCareTimer;
let mediaCleanupTimer;
let zaloGmfTimer;
let crmAutomationTimer;
let callAiTimer;

async function runFacebookGroupCron() {
  if (stopping) return;
  try {
    const response = await fetch(cronUrl, {
      headers: { authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[Production Scheduler] Facebook Group cron lỗi:", response.status, result);
    } else if (result.sent > 0 || result.publishingTasks > 0 || result.commentChecks > 0 || result.rejectedPosts > 0) {
      console.log("[Production Scheduler] Facebook Group cron:", result);
    }
  } catch (error) {
    console.error(
      "[Production Scheduler] Chưa gọi được Facebook Group cron:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    if (!stopping) cronTimer = setTimeout(runFacebookGroupCron, intervalMs);
  }
}

cronTimer = setTimeout(runFacebookGroupCron, 8_000);

async function runFanpageCareCron() {
  if (stopping) return;
  try {
    const response = await fetch(fanpageCareCronUrl, {
      headers: { authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(150_000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[Production Scheduler] Fanpage AI Care cron lỗi:", response.status, result);
    } else if (!result.skipped) {
      console.log("[Production Scheduler] Fanpage AI Care cron:", result);
    }
  } catch (error) {
    console.error(
      "[Production Scheduler] Chưa gọi được Fanpage AI Care cron:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    if (!stopping) fanpageCareTimer = setTimeout(runFanpageCareCron, fanpageCareIntervalMs);
  }
}

fanpageCareTimer = setTimeout(runFanpageCareCron, 20_000);

async function runMediaCleanup() {
  if (stopping) return;
  try {
    const response = await fetch(mediaCleanupUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(280_000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[Production Scheduler] Media cleanup lỗi:", response.status, result);
    } else if (result.deleted > 0 || result.failed > 0) {
      console.log("[Production Scheduler] Media cleanup:", result);
    }
  } catch (error) {
    console.error(
      "[Production Scheduler] Chưa gọi được media cleanup:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    if (!stopping) mediaCleanupTimer = setTimeout(runMediaCleanup, 24 * 60 * 60_000);
  }
}

mediaCleanupTimer = setTimeout(runMediaCleanup, 60_000);

async function runZaloGmfCron() {
  if (stopping) return;
  try {
    const response = await fetch(zaloGmfCronUrl, {
      headers: { authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(115_000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[Production Scheduler] Zalo GMF cron lỗi:", response.status, result);
    } else if (result.sent > 0 || result.failed > 0 || result.deferred > 0 || result.reconciliation) {
      console.log("[Production Scheduler] Zalo GMF cron:", result);
    }
  } catch (error) {
    console.error("[Production Scheduler] Chưa gọi được Zalo GMF cron:", error instanceof Error ? error.message : error);
  } finally {
    if (!stopping) zaloGmfTimer = setTimeout(runZaloGmfCron, 60_000);
  }
}

zaloGmfTimer = setTimeout(runZaloGmfCron, 35_000);

async function runCrmAutomationCron() {
  if (stopping) return;
  try {
    const response = await fetch(crmAutomationCronUrl, {
      headers: { authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(5 * 60_000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[Production Scheduler] CRM Automation cron lỗi:", response.status, result);
    } else if (
      result.totalTriggered > 0 ||
      result.b2bSofaJourney?.claimed > 0 ||
      result.b2cErgonomicBedJourney?.claimed > 0
    ) {
      console.log("[Production Scheduler] CRM Automation cron:", {
        totalTriggered: result.totalTriggered,
        totalLeads: result.totalLeads,
        journeyClaimed: result.b2bSofaJourney?.claimed || 0,
        journeySent: result.b2bSofaJourney?.sent || 0,
        b2cJourneyClaimed: result.b2cErgonomicBedJourney?.claimed || 0,
        b2cJourneySent: result.b2cErgonomicBedJourney?.sent || 0,
      });
    }
  } catch (error) {
    console.error("[Production Scheduler] Chưa gọi được CRM Automation cron:", error instanceof Error ? error.message : error);
  } finally {
    if (!stopping) crmAutomationTimer = setTimeout(runCrmAutomationCron, crmAutomationIntervalMs);
  }
}

crmAutomationTimer = setTimeout(runCrmAutomationCron, 75_000);

async function runCallAiCron() {
  if (stopping) return;
  try {
    const response = await fetch(callAiCronUrl, {
      headers: { authorization: `Bearer ${cronSecret}` },
      signal: AbortSignal.timeout(5 * 60_000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[Production Scheduler] Call AI cron lỗi:", response.status, result);
    } else if (result.processed > 0) {
      console.log("[Production Scheduler] Call AI cron:", result);
    }
  } catch (error) {
    console.error("[Production Scheduler] Chưa gọi được Call AI cron:", error instanceof Error ? error.message : error);
  } finally {
    if (!stopping) callAiTimer = setTimeout(runCallAiCron, callAiIntervalMs);
  }
}

callAiTimer = setTimeout(runCallAiCron, 45_000);

function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (cronTimer) clearTimeout(cronTimer);
  if (fanpageCareTimer) clearTimeout(fanpageCareTimer);
  if (mediaCleanupTimer) clearTimeout(mediaCleanupTimer);
  if (zaloGmfTimer) clearTimeout(zaloGmfTimer);
  if (crmAutomationTimer) clearTimeout(crmAutomationTimer);
  if (callAiTimer) clearTimeout(callAiTimer);
  if (!nextProcess.killed) nextProcess.kill(signal);
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));

nextProcess.on("exit", (code, signal) => {
  stopping = true;
  if (cronTimer) clearTimeout(cronTimer);
  if (fanpageCareTimer) clearTimeout(fanpageCareTimer);
  if (mediaCleanupTimer) clearTimeout(mediaCleanupTimer);
  if (zaloGmfTimer) clearTimeout(zaloGmfTimer);
  if (crmAutomationTimer) clearTimeout(crmAutomationTimer);
  if (callAiTimer) clearTimeout(callAiTimer);
  process.exit(code ?? (signal ? 0 : 1));
});
