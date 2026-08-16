import { describe, expect, it } from "vitest";
import {
  B2B_SOFA_JOURNEY,
  DEFAULT_B2B_SOFA_JOURNEY_SETTINGS,
} from "@/lib/crm-b2b-sofa-journey";
import { buildWorkflowValidation } from "@/lib/crm-workflow-validation";

function input() {
  const required = [...new Set(B2B_SOFA_JOURNEY.steps.flatMap(step => step.requiredContext || []))];
  const media = [...new Set(B2B_SOFA_JOURNEY.steps.flatMap(step => step.mediaAssetIds || []))];
  return {
    definition: B2B_SOFA_JOURNEY,
    settings: {
      ...DEFAULT_B2B_SOFA_JOURNEY_SETTINGS,
      enabled: true,
      canaryMode: true,
      canaryLeadIds: ["lead-test"],
    },
    enrolledAt: new Date("2026-08-17T02:00:00.000Z"),
    context: Object.fromEntries(required.map(key => [key, `${key}-value`])),
    leadSelected: true,
    eligibility: { eligible: true },
    providerReady: { zalo_personal: true, zalo_oa: true, email: true },
    recipientReady: { zalo_personal: true, zalo_oa: true, email: true },
    availableMediaIds: media,
    scheduler: { lastRunAt: new Date().toISOString(), isRunning: false },
    recentProblems: { failed: 0, deliveryUnknown: 0, waitingContent: 0 },
  };
}

describe("workflow validation", () => {
  it("passes a fully configured canary workflow", () => {
    const result = buildWorkflowValidation(input());
    expect(result.ready).toBe(true);
    expect(result.timeline.every(step => step.status === "ready")).toBe(true);
  });

  it("blocks when a step has no usable channel", () => {
    const value = input();
    value.providerReady = { zalo_personal: false, zalo_oa: false, email: false };
    const result = buildWorkflowValidation(value);
    expect(result.ready).toBe(false);
    expect(result.checks.find(item => item.id === "channel_coverage")?.status).toBe("fail");
  });

  it("blocks canary mode without a selected canary lead", () => {
    const value = input();
    value.settings.canaryLeadIds = [];
    const result = buildWorkflowValidation(value);
    expect(result.ready).toBe(false);
    expect(result.checks.find(item => item.id === "canary")?.status).toBe("fail");
  });

  it("shows missing lead context as waiting content", () => {
    const value = input();
    value.definition = {
      ...value.definition,
      steps: value.definition.steps.map((step, index) => index === 0
        ? { ...step, requiredContext: ["customer_name"] }
        : step),
    };
    value.context = { ...value.context, customer_name: "" };
    const result = buildWorkflowValidation(value);
    expect(result.ready).toBe(false);
    expect(result.timeline.some(step => step.status === "waiting_content")).toBe(true);
  });
});
