import { describe, expect, it } from "vitest";
import type { Lead } from "@/lib/crm-types";
import {
  B2B_SOFA_JOURNEY,
  DEFAULT_B2B_SOFA_JOURNEY_SETTINGS,
  buildJourneyContext,
  channelSequence,
  isEligibleForB2BSofaJourney,
  journeyDefinitionWithOverrides,
  missingRequiredContext,
  nextJourneyBusinessWindow,
  renderJourneyTemplate,
  scheduleJourneyStep,
  stageStopsJourney,
} from "@/lib/crm-b2b-sofa-journey";

function lead(patch: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    name: "Nguyễn Văn An",
    company: "An Nhiên Homestay",
    phone: "0912345678",
    email: "an@example.com",
    type: "investor",
    stage: "new",
    district: "Đà Lạt",
    expectedValue: 0,
    source: "Facebook Ads",
    assignedTo: "Minh",
    notes: "Cần sofa giường cho homestay",
    lastContactAt: "2026-08-14T01:00:00.000Z",
    createdAt: "2026-08-14T01:00:00.000Z",
    updatedAt: "2026-08-14T01:00:00.000Z",
    tags: ["B2B lưu trú"],
    projectName: "An Nhiên",
    projectAddress: "Đà Lạt",
    unitCount: 12,
    interestedProducts: ["sofa_bed"],
    ...patch,
  };
}

describe("B2B sofa journey definition", () => {
  it("contains the approved 14-step 90-day sequence", () => {
    expect(B2B_SOFA_JOURNEY.steps).toHaveLength(14);
    expect(B2B_SOFA_JOURNEY.steps.map(step => step.day)).toEqual([
      0, 1, 3, 5, 8, 12, 16, 21, 27, 30, 45, 60, 75, 90,
    ]);
    expect(new Set(B2B_SOFA_JOURNEY.steps.map(step => step.id)).size).toBe(14);
  });

  it("gives each step one primary and two unique fallbacks", () => {
    for (const step of B2B_SOFA_JOURNEY.steps) {
      expect(channelSequence(step)).toHaveLength(3);
      expect(new Set(channelSequence(step)).size).toBe(3);
    }
  });

  it("uses the canonical SmartFurni contact details", () => {
    expect(B2B_SOFA_JOURNEY.officialContact.hotline).toBe("028.7122.0818");
    expect(B2B_SOFA_JOURNEY.officialContact.zalo).toBe("0918.326.552");
    expect(B2B_SOFA_JOURNEY.officialContact.email).toBe("b2b@smartfurni.com.vn");
    expect(B2B_SOFA_JOURNEY.steps[0].zaloBody).toContain("028.7122.0818");
  });

  it("applies editable copy and shared media to an individual step", () => {
    const definition = journeyDefinitionWithOverrides({
      stepOverrides: {
        D0_QUALIFY: {
          zaloBody: "Nội dung Zalo đã sửa",
          emailSubject: "Tiêu đề đã sửa",
          mediaAssetIds: ["image-1", "video-1", "image-1"],
        },
      },
    });
    const step = definition.steps.find(item => item.id === "D0_QUALIFY")!;
    expect(step.zaloBody).toBe("Nội dung Zalo đã sửa");
    expect(step.emailSubject).toBe("Tiêu đề đã sửa");
    expect(step.mediaAssetIds).toEqual(["image-1", "video-1"]);
    expect(step.emailBody).toBe(B2B_SOFA_JOURNEY.steps[0].emailBody);
  });
});

describe("B2B sofa journey eligibility", () => {
  it("accepts a hospitality investor interested in sofa beds", () => {
    expect(isEligibleForB2BSofaJourney(lead(), DEFAULT_B2B_SOFA_JOURNEY_SETTINGS)).toEqual({ eligible: true });
  });

  it("rejects retail leads and leads with do-not-contact tags", () => {
    expect(isEligibleForB2BSofaJourney(lead({ type: "retail" }), DEFAULT_B2B_SOFA_JOURNEY_SETTINGS).eligible).toBe(false);
    expect(isEligibleForB2BSofaJourney(lead({ tags: ["Không liên hệ"] }), DEFAULT_B2B_SOFA_JOURNEY_SETTINGS).eligible).toBe(false);
  });

  it("requires an explicit hospitality signal by default", () => {
    const generic = lead({ company: "Công ty ABC", projectName: "Dự án ABC", notes: "Cần sofa giường", tags: [] });
    expect(isEligibleForB2BSofaJourney(generic, DEFAULT_B2B_SOFA_JOURNEY_SETTINGS).eligible).toBe(false);
  });
});

describe("B2B sofa journey content", () => {
  it("renders known lead and asset variables", () => {
    const settings = { ...DEFAULT_B2B_SOFA_JOURNEY_SETTINGS, surveyFormUrl: "https://example.com/checklist" };
    const context = buildJourneyContext(lead(), settings);
    const step = B2B_SOFA_JOURNEY.steps.find(item => item.id === "D1_SURVEY_CHECKLIST")!;
    const rendered = renderJourneyTemplate(step.emailBody, context);
    expect(rendered).toContain("Nguyễn Văn An");
    expect(rendered).toContain("https://example.com/checklist");
    expect(rendered).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
  });

  it("blocks personalized proposal steps when decision data is missing", () => {
    const step = B2B_SOFA_JOURNEY.steps.find(item => item.id === "D8_TWO_OPTIONS")!;
    const context = buildJourneyContext(lead(), DEFAULT_B2B_SOFA_JOURNEY_SETTINGS);
    const missing = missingRequiredContext(step, context);
    expect(missing).toContain("available_dimensions");
    expect(missing).toContain("option_a_model");
    expect(missing).not.toContain("quantity");
  });
});

describe("B2B sofa journey scheduling", () => {
  it("schedules future steps in Vietnam time", () => {
    const enrolled = new Date("2026-08-14T01:00:00.000Z"); // 08:00 ICT
    const dayOne = B2B_SOFA_JOURNEY.steps.find(item => item.day === 1)!;
    expect(scheduleJourneyStep(enrolled, dayOne).toISOString()).toBe("2026-08-15T01:45:00.000Z");
  });

  it("moves Sunday sends to Monday", () => {
    const enrolled = new Date("2026-08-15T01:00:00.000Z"); // Saturday 08:00 ICT
    const dayOne = B2B_SOFA_JOURNEY.steps.find(item => item.day === 1)!;
    expect(scheduleJourneyStep(enrolled, dayOne).toISOString()).toBe("2026-08-17T01:45:00.000Z");
  });

  it("moves a late day-zero enrollment to the next business morning", () => {
    const enrolled = new Date("2026-08-14T12:30:00.000Z"); // Friday 19:30 ICT
    const dayZero = B2B_SOFA_JOURNEY.steps[0];
    expect(scheduleJourneyStep(enrolled, dayZero).toISOString()).toBe("2026-08-15T02:15:00.000Z");
  });

  it("allows execution inside the configured Vietnam business window", () => {
    const now = new Date("2026-08-14T03:00:00.000Z"); // Friday 10:00 ICT
    expect(nextJourneyBusinessWindow(now, DEFAULT_B2B_SOFA_JOURNEY_SETTINGS)).toBeNull();
  });

  it("defers an after-hours execution to the next opening time", () => {
    const now = new Date("2026-08-14T12:00:00.000Z"); // Friday 19:00 ICT
    expect(nextJourneyBusinessWindow(now, DEFAULT_B2B_SOFA_JOURNEY_SETTINGS)?.toISOString())
      .toBe("2026-08-15T01:30:00.000Z");
  });

  it("never opens a sending window on Sunday", () => {
    const now = new Date("2026-08-15T12:00:00.000Z"); // Saturday 19:00 ICT
    expect(nextJourneyBusinessWindow(now, DEFAULT_B2B_SOFA_JOURNEY_SETTINGS)?.toISOString())
      .toBe("2026-08-17T01:30:00.000Z");
  });
});

describe("Kanban stage impact on nurture journeys", () => {
  it.each(["new", "profile_sent", "surveyed", "quoted", "negotiating"] as const)(
    "keeps the journey running in the %s stage",
    stage => {
      expect(stageStopsJourney(stage)).toBe(false);
    },
  );

  it.each(["won", "lost"] as const)("stops the journey in the %s stage", stage => {
    expect(stageStopsJourney(stage)).toBe(true);
  });
});
