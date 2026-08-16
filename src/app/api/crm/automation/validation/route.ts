import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getLead } from "@/lib/crm-store";
import { getAutomationEmailProviderStatus } from "@/lib/crm-automation-email";
import { getAutomationSchedulerHealth } from "@/lib/crm-automation-execution-store";
import {
  B2B_SOFA_JOURNEY_CODE,
  buildJourneyContext,
  isEligibleForB2BSofaJourney,
  journeyDefinitionWithOverrides,
  type B2BSofaJourneySettings,
  type JourneyChannel,
} from "@/lib/crm-b2b-sofa-journey";
import {
  enrollLeadInB2BSofaJourney,
  getB2BSofaJourneyDashboard,
  makeCanaryDayZeroActionsDue,
  saveB2BSofaJourneySettings,
} from "@/lib/crm-b2b-sofa-journey-store";
import { runB2BSofaJourney } from "@/lib/crm-b2b-sofa-journey-engine";
import {
  B2C_ERGONOMIC_BED_JOURNEY_CODE,
  buildB2CErgonomicJourneyContext,
  isEligibleForB2CErgonomicBedJourney,
  b2cErgonomicJourneyDefinitionWithOverrides,
  type B2CErgonomicBedJourneySettings,
} from "@/lib/crm-b2c-ergonomic-bed-journey";
import {
  enrollLeadInB2CErgonomicBedJourney,
  getB2CErgonomicBedJourneyDashboard,
  saveB2CErgonomicBedJourneySettings,
} from "@/lib/crm-b2c-ergonomic-bed-journey-store";
import { runB2CErgonomicBedJourney } from "@/lib/crm-b2c-ergonomic-bed-journey-engine";
import { getZaloMediaAssets } from "@/lib/zalo-media-library-store";
import { getAllGatewayStatuses, initZaloGateway } from "@/lib/zalo-gateway";
import { getZaloOAConfig } from "@/lib/zalo-oa-store";
import { buildWorkflowValidation } from "@/lib/crm-workflow-validation";

export const dynamic = "force-dynamic";

type WorkflowKey = "b2b_sofa" | "b2c_ergonomic";

async function requireAdmin() {
  if (!(await getAdminSession())) throw new Error("UNAUTHORIZED");
}

function workflowKey(value: unknown): WorkflowKey {
  return value === "b2c_ergonomic" ? "b2c_ergonomic" : "b2b_sofa";
}

async function loadWorkflow(key: WorkflowKey) {
  if (key === "b2c_ergonomic") {
    const dashboard = await getB2CErgonomicBedJourneyDashboard();
    return {
      key,
      code: B2C_ERGONOMIC_BED_JOURNEY_CODE,
      settings: dashboard.settings,
      definition: b2cErgonomicJourneyDefinitionWithOverrides(dashboard.settings),
      stats: dashboard.stats,
      recentEnrollments: dashboard.recentEnrollments,
      recentActions: dashboard.recentActions,
    };
  }
  const dashboard = await getB2BSofaJourneyDashboard();
  return {
    key,
    code: B2B_SOFA_JOURNEY_CODE,
    settings: dashboard.settings,
    definition: journeyDefinitionWithOverrides(dashboard.settings),
    stats: dashboard.stats,
    recentEnrollments: dashboard.recentEnrollments,
    recentActions: dashboard.recentActions,
  };
}

async function validationPayload(key: WorkflowKey, leadId?: string, enrolledAtValue?: string) {
  const workflow = await loadWorkflow(key);
  const lead = leadId ? await getLead(leadId) : null;
  await initZaloGateway().catch(() => undefined);
  const [accounts, email, oa, scheduler] = await Promise.all([
    getAllGatewayStatuses().catch(() => []),
    Promise.resolve(getAutomationEmailProviderStatus()),
    getZaloOAConfig().catch(() => null),
    getAutomationSchedulerHealth().catch(() => ({ lastRunAt: null, lockedUntil: null, isRunning: false })),
  ]);
  const requestedAccount = workflow.settings.automationAccountId;
  const personalAccount = accounts.find(account => account.accountId === requestedAccount)
    || accounts.find(account => `${account.label} ${account.displayName}`.toLocaleLowerCase("vi").includes("smartfurni"))
    || accounts.find(account => account.isConnected);
  const providerReady: Record<JourneyChannel, boolean> = {
    zalo_personal: Boolean(personalAccount?.isConnected),
    zalo_oa: Boolean(oa?.isActive && oa.accessToken),
    email: Boolean(email.configured),
  };
  const recipientReady: Record<JourneyChannel, boolean> = {
    zalo_personal: Boolean(lead?.zaloId || lead?.zaloPhone || lead?.phone),
    zalo_oa: Boolean(lead?.zaloId || lead?.zaloPhone || lead?.phone),
    email: Boolean(lead?.email && /^\S+@\S+\.\S+$/.test(lead.email.trim())),
  };
  const context = lead
    ? key === "b2c_ergonomic"
      ? buildB2CErgonomicJourneyContext(lead, workflow.settings as B2CErgonomicBedJourneySettings)
      : buildJourneyContext(lead, workflow.settings as B2BSofaJourneySettings)
    : undefined;
  const eligibility = lead
    ? key === "b2c_ergonomic"
      ? isEligibleForB2CErgonomicBedJourney(lead, workflow.settings as B2CErgonomicBedJourneySettings)
      : isEligibleForB2BSofaJourney(lead, workflow.settings as B2BSofaJourneySettings)
    : null;
  const mediaIds = [...new Set(workflow.definition.steps.flatMap(step => step.mediaAssetIds || []))];
  const availableMedia = await getZaloMediaAssets(mediaIds).catch(() => []);
  const enrolledAt = enrolledAtValue && Number.isFinite(new Date(enrolledAtValue).getTime())
    ? new Date(enrolledAtValue)
    : new Date();
  const validation = buildWorkflowValidation({
    definition: workflow.definition,
    settings: workflow.settings,
    enrolledAt,
    context,
    leadSelected: Boolean(lead),
    eligibility,
    providerReady,
    recipientReady,
    availableMediaIds: availableMedia.map(item => item.id),
    scheduler,
    recentProblems: {
      failed: Number(workflow.stats.failed || 0),
      deliveryUnknown: Number(workflow.stats.delivery_unknown || 0),
      waitingContent: Number(workflow.stats.waiting_content || 0),
    },
  });
  const latestEnrollment = [...workflow.recentEnrollments].sort((a, b) =>
    new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime(),
  )[0];
  const latestSent = workflow.recentActions.find(item => item.status === "sent" && item.sentAt);
  const latestProblem = workflow.recentActions.find(item =>
    ["failed", "delivery_unknown", "waiting_content"].includes(item.status),
  );
  return {
    workflow: {
      key,
      code: workflow.code,
      name: workflow.definition.name,
      enabled: workflow.settings.enabled,
      autoEnroll: workflow.settings.autoEnroll,
      canaryMode: workflow.settings.canaryMode,
      canaryLeadIds: workflow.settings.canaryLeadIds,
    },
    lead: lead ? {
      id: lead.id,
      name: lead.name,
      company: lead.company,
      phone: lead.zaloPhone || lead.phone,
      email: lead.email,
      stage: lead.stage,
    } : null,
    providers: {
      zaloPersonal: {
        ready: providerReady.zalo_personal,
        accountId: personalAccount?.accountId || null,
        name: personalAccount?.displayName || personalAccount?.label || "",
      },
      zaloOa: { ready: providerReady.zalo_oa, name: oa?.oaId || "Zalo OA" },
      email: { ready: providerReady.email, name: email.fromEmail || email.user || "" },
    },
    scheduler,
    operations: {
      latestEnrollment: latestEnrollment ? {
        leadId: latestEnrollment.leadId,
        leadName: latestEnrollment.leadName,
        at: latestEnrollment.enrolledAt,
      } : null,
      latestSent: latestSent ? {
        leadId: latestSent.leadId,
        stepId: latestSent.stepId,
        channel: latestSent.sentChannel,
        at: latestSent.sentAt,
      } : null,
      latestProblem: latestProblem ? {
        leadId: latestProblem.leadId,
        stepId: latestProblem.stepId,
        status: latestProblem.status,
        error: latestProblem.error,
        at: latestProblem.updatedAt,
      } : null,
    },
    ...validation,
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const params = new URL(req.url).searchParams;
    return NextResponse.json(await validationPayload(
      workflowKey(params.get("workflow")),
      params.get("leadId") || undefined,
      params.get("enrolledAt") || undefined,
    ));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không kiểm định được workflow." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json() as {
      action?: "save_canary" | "run_canary";
      workflow?: WorkflowKey;
      leadIds?: string[];
      enabled?: boolean;
      confirmed?: boolean;
    };
    const key = workflowKey(body.workflow);
    const leadIds = [...new Set((body.leadIds || []).map(String).filter(Boolean))].slice(0, 3);
    if (body.action === "save_canary") {
      if (body.enabled && leadIds.length === 0) {
        return NextResponse.json({ error: "Hãy chọn từ 1 đến 3 lead trước khi bật canary." }, { status: 400 });
      }
      for (const leadId of leadIds) {
        if (!(await getLead(leadId))) {
          return NextResponse.json({ error: `Không tìm thấy lead canary ${leadId}.` }, { status: 404 });
        }
      }
      if (!body.enabled) {
        const current = await loadWorkflow(key);
        if (current.settings.enabled) {
          const fullRolloutGate = await validationPayload(key);
          const blockers = fullRolloutGate.checks.filter(item => item.blocking && item.status === "fail" && item.id !== "lead_eligible");
          if (blockers.length) {
            return NextResponse.json({
              error: `Chưa thể mở toàn bộ workflow: ${blockers.map(item => item.detail).join(" ")}`,
              validation: fullRolloutGate,
            }, { status: 422 });
          }
        }
      }
      const settings = key === "b2c_ergonomic"
        ? await saveB2CErgonomicBedJourneySettings({ canaryMode: Boolean(body.enabled), canaryLeadIds: leadIds })
        : await saveB2BSofaJourneySettings({ canaryMode: Boolean(body.enabled), canaryLeadIds: leadIds });
      return NextResponse.json({ ok: true, settings, validation: await validationPayload(key, leadIds[0]) });
    }
    if (body.action === "run_canary") {
      if (body.confirmed !== true) {
        return NextResponse.json({ error: "Bạn chưa xác nhận chạy canary có thể gửi tin thật." }, { status: 400 });
      }
      if (leadIds.length === 0) {
        return NextResponse.json({ error: "Hãy chọn từ 1 đến 3 lead kiểm thử." }, { status: 400 });
      }
      const workflow = await loadWorkflow(key);
      if (!workflow.settings.enabled) {
        return NextResponse.json({ error: "Workflow đang tắt. Hãy bật và lưu workflow trước khi chạy canary." }, { status: 409 });
      }
      const preflight = await Promise.all(leadIds.map(leadId => validationPayload(key, leadId)));
      const blocked = preflight.find(item => !item.ready);
      if (blocked) {
        const reasons = blocked.checks.filter(item => item.blocking && item.status === "fail").map(item => item.detail);
        return NextResponse.json({
          error: `Canary bị chặn cho ${blocked.lead?.name || blocked.lead?.id || "lead"}: ${reasons.join(" ")}`,
          validation: blocked,
        }, { status: 422 });
      }
      if (key === "b2c_ergonomic") {
        const settings = await saveB2CErgonomicBedJourneySettings({ canaryMode: true, canaryLeadIds: leadIds });
        const enrollmentResults = [];
        for (const leadId of leadIds) {
          const lead = await getLead(leadId);
          if (!lead) { enrollmentResults.push({ leadId, enrolled: false, error: "Không tìm thấy lead." }); continue; }
          try {
            const result = await enrollLeadInB2CErgonomicBedJourney(lead, settings);
            enrollmentResults.push({ leadId, enrolled: result.created, existing: !result.created });
          } catch (error) {
            enrollmentResults.push({ leadId, enrolled: false, error: error instanceof Error ? error.message : "Lead không đủ điều kiện." });
          }
        }
        await makeCanaryDayZeroActionsDue(B2C_ERGONOMIC_BED_JOURNEY_CODE, leadIds);
        const result = await runB2CErgonomicBedJourney(Math.max(3, leadIds.length * 3));
        return NextResponse.json({ ok: true, enrollmentResults, result, validation: await validationPayload(key, leadIds[0]) });
      }
      const settings = await saveB2BSofaJourneySettings({ canaryMode: true, canaryLeadIds: leadIds });
      const enrollmentResults = [];
      for (const leadId of leadIds) {
        const lead = await getLead(leadId);
        if (!lead) { enrollmentResults.push({ leadId, enrolled: false, error: "Không tìm thấy lead." }); continue; }
        try {
          const result = await enrollLeadInB2BSofaJourney(lead, settings);
          enrollmentResults.push({ leadId, enrolled: result.created, existing: !result.created });
        } catch (error) {
          enrollmentResults.push({ leadId, enrolled: false, error: error instanceof Error ? error.message : "Lead không đủ điều kiện." });
        }
      }
      await makeCanaryDayZeroActionsDue(B2B_SOFA_JOURNEY_CODE, leadIds);
      const result = await runB2BSofaJourney(Math.max(3, leadIds.length * 3));
      return NextResponse.json({ ok: true, enrollmentResults, result, validation: await validationPayload(key, leadIds[0]) });
    }
    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không cập nhật được kiểm định workflow." }, { status: 500 });
  }
}
