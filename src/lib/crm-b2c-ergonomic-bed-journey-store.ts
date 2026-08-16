import "server-only";

import type { Lead } from "@/lib/crm-types";
import {
  B2C_ERGONOMIC_BED_JOURNEY,
  B2C_ERGONOMIC_BED_JOURNEY_CODE,
  DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
  buildB2CErgonomicJourneyContext,
  isEligibleForB2CErgonomicBedJourney,
  type B2CErgonomicBedJourneySettings,
} from "@/lib/crm-b2c-ergonomic-bed-journey";
import {
  autoEnrollEligibleJourney,
  claimDueJourneyActionsForCode,
  enrollLeadInJourney,
  getJourneyDashboard,
  getJourneyEnrollmentForCode,
  getJourneySettings,
  saveJourneySettings,
  type JourneyActionRecord,
  type JourneyEnrollmentRecord,
} from "@/lib/crm-b2b-sofa-journey-store";

export async function getB2CErgonomicBedJourneySettings(): Promise<B2CErgonomicBedJourneySettings> {
  return getJourneySettings(
    B2C_ERGONOMIC_BED_JOURNEY_CODE,
    DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
  );
}

export async function saveB2CErgonomicBedJourneySettings(
  input: Partial<B2CErgonomicBedJourneySettings>,
): Promise<B2CErgonomicBedJourneySettings> {
  return saveJourneySettings(
    B2C_ERGONOMIC_BED_JOURNEY_CODE,
    DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
    input,
  );
}

export async function getB2CErgonomicBedJourneyEnrollment(
  leadId: string,
): Promise<JourneyEnrollmentRecord | null> {
  return getJourneyEnrollmentForCode(B2C_ERGONOMIC_BED_JOURNEY_CODE, leadId);
}

export async function enrollLeadInB2CErgonomicBedJourney(
  lead: Lead,
  settings: B2CErgonomicBedJourneySettings,
  input?: { context?: Record<string, string>; automationAccountId?: string; force?: boolean },
): Promise<{ enrollment: JourneyEnrollmentRecord; created: boolean }> {
  return enrollLeadInJourney(
    lead,
    settings,
    B2C_ERGONOMIC_BED_JOURNEY,
    isEligibleForB2CErgonomicBedJourney,
    buildB2CErgonomicJourneyContext,
    input,
  );
}

export async function autoEnrollEligibleB2CErgonomicBedLeads(
  settings: B2CErgonomicBedJourneySettings,
): Promise<{ checked: number; enrolled: number; skipped: number }> {
  return autoEnrollEligibleJourney(
    settings,
    B2C_ERGONOMIC_BED_JOURNEY,
    isEligibleForB2CErgonomicBedJourney,
    (lead, currentSettings) => enrollLeadInB2CErgonomicBedJourney(lead, currentSettings),
  );
}

export async function claimDueB2CErgonomicBedJourneyActions(
  limit = 20,
): Promise<JourneyActionRecord[]> {
  return claimDueJourneyActionsForCode(B2C_ERGONOMIC_BED_JOURNEY_CODE, limit);
}

export async function getB2CErgonomicBedJourneyDashboard(): Promise<{
  settings: B2CErgonomicBedJourneySettings;
  stats: Record<string, number>;
  recentEnrollments: Array<JourneyEnrollmentRecord & { leadName: string }>;
  recentActions: JourneyActionRecord[];
}> {
  return getJourneyDashboard(
    B2C_ERGONOMIC_BED_JOURNEY_CODE,
    DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
  );
}
