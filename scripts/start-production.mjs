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
const fanpageCareIntervalMs = Math.max(
  5 * 60_000,
  Number(process.env.FANPAGE_AI_CRON_INTERVAL_MS || 15 * 60_000),
);

const nextProcess = spawn(process.execPath, [nextBin, "start", "-p", port], {
  env: { ...process.env, CRON_SECRET: cronSecret },
  stdio: "inherit",
});

let stopping = false;
let cronTimer;
let fanpageCareTimer;

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

function stop(signal) {
  if (stopping) return;
  stopping = true;
  if (cronTimer) clearTimeout(cronTimer);
  if (fanpageCareTimer) clearTimeout(fanpageCareTimer);
  if (!nextProcess.killed) nextProcess.kill(signal);
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));

nextProcess.on("exit", (code, signal) => {
  stopping = true;
  if (cronTimer) clearTimeout(cronTimer);
  if (fanpageCareTimer) clearTimeout(fanpageCareTimer);
  process.exit(code ?? (signal ? 0 : 1));
});
