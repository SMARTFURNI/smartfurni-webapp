import type { AutomationRule, AutomationTrigger } from "@/lib/crm-automation-store";
import type { Lead } from "@/lib/crm-types";

export function isAutomationTriggerStageAllowed(
  trigger: AutomationTrigger,
  stage: string,
): boolean {
  return !trigger.stages?.length || trigger.stages.includes(stage);
}

export function automationTriggerKey(rule: AutomationRule, lead: Lead): string {
  const trigger = rule.trigger;
  if (trigger.type === "no_activity_days") {
    return `inactive:${trigger.days ?? 3}:${lead.stage}:${lead.lastContactAt || lead.createdAt || "never"}`;
  }
  if (trigger.type === "stage_duration") {
    return `stage-duration:${lead.stage}:${trigger.hours ?? 24}:${lead.updatedAt || "unknown"}`;
  }
  if (trigger.type === "lead_created") return `created:${lead.createdAt || lead.id}`;
  if (trigger.type === "value_threshold") return `value:${trigger.minValue ?? 0}`;
  if (trigger.type === "lead_type_match") return `type:${lead.type}`;
  return `stage:${trigger.fromStage || "*"}->${trigger.toStage || lead.stage}:${lead.updatedAt || "unknown"}`;
}
