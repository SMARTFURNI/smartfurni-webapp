import { describe, expect, it } from "vitest";
import type { Lead } from "./crm-types";
import {
  B2C_SOFA_BED_JOURNEY,
  DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS,
  b2cSofaBedJourneyDefinitionWithOverrides,
  isEligibleForB2CSofaBedJourney,
} from "./crm-b2c-sofa-bed-journey";

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-sofa", name: "Nguyễn An", company: "", phone: "0909000000", email: "",
    type: "retail", stage: "new", district: "TP. Hồ Chí Minh", expectedValue: 0,
    source: "Facebook Ads", assignedTo: "Ms Khuyên", notes: "", lastContactAt: "",
    createdAt: "2026-08-18T00:00:00.000Z", updatedAt: "2026-08-18T00:00:00.000Z",
    tags: [], projectName: "", projectAddress: "", unitCount: 1,
    interestedProducts: ["sofa_bed"], customerSegment: "retail",
    zaloFriendship: { leadId: "lead-sofa", status: "accepted", attemptCount: 1, autoEnabled: true, updatedAt: "2026-08-18T00:00:00.000Z" },
    ...overrides,
  };
}

describe("B2C Sofa Bed 90-day journey", () => {
  it("has the approved 13-step cadence", () => {
    expect(B2C_SOFA_BED_JOURNEY.steps).toHaveLength(13);
    expect(B2C_SOFA_BED_JOURNEY.steps.map(item => item.day)).toEqual([0, 2, 4, 7, 10, 12, 14, 21, 30, 45, 60, 75, 90]);
  });

  it("uses only personal Zalo without fallback", () => {
    for (const current of B2C_SOFA_BED_JOURNEY.steps) {
      expect(current.primaryChannel).toBe("zalo_personal");
      expect(current.fallbackChannels).toEqual([]);
      expect(current.emailSubject).toBe("");
      expect(current.emailBody).toBe("");
    }
  });

  it("cannot be overridden to OA or email", () => {
    const definition = b2cSofaBedJourneyDefinitionWithOverrides({
      stepOverrides: { D0_SPACE_DISCOVERY: { primaryChannel: "email", fallbackChannels: ["zalo_oa"] } },
    });
    expect(definition.steps[0].primaryChannel).toBe("zalo_personal");
    expect(definition.steps[0].fallbackChannels).toEqual([]);
  });

  it("requires retail Sofa Bed interest and an accepted friendship", () => {
    expect(isEligibleForB2CSofaBedJourney(lead(), DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS)).toEqual({ eligible: true });
    expect(isEligibleForB2CSofaBedJourney(lead({ zaloFriendship: undefined }), DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS).eligible).toBe(false);
    expect(isEligibleForB2CSofaBedJourney(lead({ interestedProducts: ["ergonomic_bed"] }), DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS).eligible).toBe(false);
    expect(isEligibleForB2CSofaBedJourney(lead({ type: "b2b", customerSegment: "b2b" }), DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS).eligible).toBe(false);
    expect(isEligibleForB2CSofaBedJourney(lead({ tags: ["Không liên hệ"] }), DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS).eligible).toBe(false);
  });
});
