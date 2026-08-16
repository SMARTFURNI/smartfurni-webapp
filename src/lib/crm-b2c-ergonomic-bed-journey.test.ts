import { describe, expect, it } from "vitest";
import type { Lead } from "@/lib/crm-types";
import {
  B2C_ERGONOMIC_BED_JOURNEY,
  DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
  b2cErgonomicJourneyDefinitionWithOverrides,
  buildB2CErgonomicJourneyContext,
  isEligibleForB2CErgonomicBedJourney,
  leadHasErgonomicBedInterest,
} from "@/lib/crm-b2c-ergonomic-bed-journey";
import {
  channelSequence,
  missingRequiredContext,
  renderJourneyTemplate,
  scheduleJourneyStep,
} from "@/lib/crm-b2b-sofa-journey";

function lead(patch: Partial<Lead> = {}): Lead {
  return {
    id: "retail-bed-1",
    name: "Nguyễn Thu Hà",
    company: "",
    phone: "0912345678",
    email: "ha@example.com",
    type: "retail",
    customerSegment: "retail",
    stage: "new",
    district: "TP.HCM",
    expectedValue: 0,
    source: "Google Ads",
    assignedTo: "Lan",
    notes: "Quan tâm khung nâng hạ đặt vào giường đang có",
    lastContactAt: "2026-08-15T01:00:00.000Z",
    createdAt: "2026-08-15T01:00:00.000Z",
    updatedAt: "2026-08-15T01:00:00.000Z",
    tags: ["Khách lẻ", "Giường công thái học"],
    projectName: "",
    projectAddress: "",
    unitCount: 1,
    interestedProducts: ["ergonomic_bed"],
    ...patch,
  };
}

describe("B2C ergonomic bed journey definition", () => {
  it("contains the approved benefit-first sequence with 14 touches in the first 30 days", () => {
    expect(B2C_ERGONOMIC_BED_JOURNEY.steps).toHaveLength(18);
    expect(B2C_ERGONOMIC_BED_JOURNEY.steps.map(item => item.day)).toEqual([
      0, 1, 2, 4, 6, 8, 10, 13, 16, 19, 22, 24, 27, 30, 45, 60, 75, 90,
    ]);
    expect(B2C_ERGONOMIC_BED_JOURNEY.steps.filter(item => item.day <= 30)).toHaveLength(14);
  });

  it("keeps one primary channel and two unique fallbacks for every touchpoint", () => {
    for (const current of B2C_ERGONOMIC_BED_JOURNEY.steps) {
      expect(channelSequence(current)).toHaveLength(3);
      expect(new Set(channelSequence(current)).size).toBe(3);
    }
  });

  it("is disabled by default and uses the approved SmartFurni personal account fallback setting", () => {
    expect(DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS.enabled).toBe(false);
    expect(DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS.autoEnrollExisting).toBe(false);
    expect(DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS.maxMessagesPerSevenDays).toBe(4);
  });

  it("allows copy and media overrides without mutating the default definition", () => {
    const definition = b2cErgonomicJourneyDefinitionWithOverrides({
      stepOverrides: {
        D4_DEMO_MEDIA: { zaloBody: "Video mới", mediaAssetIds: ["video-1", "video-1"] },
      },
    });
    const overridden = definition.steps.find(item => item.id === "D4_DEMO_MEDIA")!;
    expect(overridden.zaloBody).toBe("Video mới");
    expect(overridden.mediaAssetIds).toEqual(["video-1"]);
    expect(B2C_ERGONOMIC_BED_JOURNEY.steps.find(item => item.id === "D4_DEMO_MEDIA")?.zaloBody)
      .not.toBe("Video mới");
  });
});

describe("B2C ergonomic bed eligibility", () => {
  it("accepts a retail lead interested in an ergonomic bed", () => {
    expect(isEligibleForB2CErgonomicBedJourney(
      lead(),
      DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
    )).toEqual({ eligible: true });
  });

  it("detects explicit frame-upgrade wording even without a normalized product field", () => {
    const textOnly = lead({ interestedProducts: [], notes: "Muốn mua khung nâng hạ cho giường có sẵn" });
    expect(leadHasErgonomicBedInterest(textOnly)).toBe(true);
  });

  it("rejects B2B leads, do-not-contact leads and unrelated product interest", () => {
    expect(isEligibleForB2CErgonomicBedJourney(
      lead({ type: "b2b", customerSegment: "b2b" }),
      DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
    ).eligible).toBe(false);
    expect(isEligibleForB2CErgonomicBedJourney(
      lead({ tags: ["Không liên hệ"] }),
      DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
    ).eligible).toBe(false);
    expect(isEligibleForB2CErgonomicBedJourney(
      lead({ interestedProducts: ["sofa_bed"], notes: "Cần sofa giường", tags: ["Khách lẻ"] }),
      DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS,
    ).eligible).toBe(false);
  });
});

describe("B2C ergonomic bed content and scheduling", () => {
  it("renders customer and consultant variables in benefit-first copy", () => {
    const context = buildB2CErgonomicJourneyContext(lead(), DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS);
    const rendered = renderJourneyTemplate(B2C_ERGONOMIC_BED_JOURNEY.steps[1].zaloBody, context);
    expect(rendered).toContain("Nguyễn Thu Hà");
    expect(rendered).toContain("Lan");
    expect(rendered).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
  });

  it("blocks the personalized proposal until benefits and fit data exist", () => {
    const proposal = B2C_ERGONOMIC_BED_JOURNEY.steps.find(item => item.id === "D22_PERSONAL_PROPOSAL")!;
    const context = buildB2CErgonomicJourneyContext(lead(), DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS);
    expect(missingRequiredContext(proposal, context)).toEqual(expect.arrayContaining([
      "primary_benefit", "solution_type", "fit_reason", "recommended_size", "price_range",
    ]));
  });

  it("does not use medical guarantees and does not leave optional variables in generic reminders", () => {
    const allCopy = B2C_ERGONOMIC_BED_JOURNEY.steps
      .flatMap(item => [item.emailSubject, item.emailBody, item.zaloBody])
      .join("\n");
    expect(allCopy).not.toMatch(/chữa|điều trị|cam kết khỏi|100%/i);

    const timing = B2C_ERGONOMIC_BED_JOURNEY.steps.find(item => item.id === "D60_TIMING")!;
    const context = buildB2CErgonomicJourneyContext(lead(), DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS);
    expect(renderJourneyTemplate(timing.zaloBody, context)).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
  });

  it("moves Sunday touchpoints to the next business day", () => {
    const enrolled = new Date("2026-08-15T01:00:00.000Z");
    const dayOne = B2C_ERGONOMIC_BED_JOURNEY.steps.find(item => item.day === 1)!;
    expect(scheduleJourneyStep(enrolled, dayOne).toISOString()).toBe("2026-08-17T02:15:00.000Z");
  });
});
