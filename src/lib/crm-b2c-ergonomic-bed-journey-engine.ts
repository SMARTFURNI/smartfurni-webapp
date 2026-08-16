import "server-only";

import {
  B2C_ERGONOMIC_BED_JOURNEY,
  b2cErgonomicJourneyDefinitionWithOverrides,
  buildB2CErgonomicJourneyContext,
} from "@/lib/crm-b2c-ergonomic-bed-journey";
import {
  autoEnrollEligibleB2CErgonomicBedLeads,
  claimDueB2CErgonomicBedJourneyActions,
  getB2CErgonomicBedJourneySettings,
} from "@/lib/crm-b2c-ergonomic-bed-journey-store";
import {
  runJourneyRuntime,
  type B2BSofaJourneyRunResult,
} from "@/lib/crm-b2b-sofa-journey-engine";

export async function runB2CErgonomicBedJourney(
  limit = 20,
): Promise<B2BSofaJourneyRunResult> {
  return runJourneyRuntime({
    journeyName: B2C_ERGONOMIC_BED_JOURNEY.name,
    getSettings: getB2CErgonomicBedJourneySettings,
    definitionWithOverrides: b2cErgonomicJourneyDefinitionWithOverrides,
    buildContext: buildB2CErgonomicJourneyContext,
    autoEnroll: autoEnrollEligibleB2CErgonomicBedLeads,
    claimDueActions: claimDueB2CErgonomicBedJourneyActions,
    emailFromName: "SmartFurni",
  }, limit);
}
