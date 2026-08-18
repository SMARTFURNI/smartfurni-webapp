import "server-only";

import {
  B2C_SOFA_BED_JOURNEY,
  b2cSofaBedJourneyDefinitionWithOverrides,
  buildB2CSofaBedJourneyContext,
} from "@/lib/crm-b2c-sofa-bed-journey";
import {
  autoEnrollEligibleB2CSofaBedLeads,
  claimDueB2CSofaBedJourneyActions,
  getB2CSofaBedJourneySettings,
} from "@/lib/crm-b2c-sofa-bed-journey-store";
import { runJourneyRuntime, type B2BSofaJourneyRunResult } from "@/lib/crm-b2b-sofa-journey-engine";

export async function runB2CSofaBedJourney(limit = 20): Promise<B2BSofaJourneyRunResult> {
  return runJourneyRuntime({
    journeyCode: B2C_SOFA_BED_JOURNEY.code,
    journeyName: B2C_SOFA_BED_JOURNEY.name,
    getSettings: getB2CSofaBedJourneySettings,
    definitionWithOverrides: b2cSofaBedJourneyDefinitionWithOverrides,
    buildContext: buildB2CSofaBedJourneyContext,
    autoEnroll: autoEnrollEligibleB2CSofaBedLeads,
    claimDueActions: claimDueB2CSofaBedJourneyActions,
    emailFromName: "SmartFurni",
    requireAcceptedZaloFriendship: true,
    replyChannels: ["zalo_personal"],
  }, limit);
}
