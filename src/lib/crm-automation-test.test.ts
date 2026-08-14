import { describe, expect, it } from "vitest";
import type { Lead } from "./crm-types";
import {
  buildAutomationTestContext,
  isDoNotContactLead,
  missingAutomationTestVariables,
  renderAutomationTestTemplate,
} from "./crm-automation-test";

const lead: Lead = {
  id: "lead-1",
  name: "Nguyễn Minh",
  company: "An Nhiên Hospitality",
  phone: "0901234567",
  zaloPhone: "0911222333",
  email: "minh@example.com",
  type: "b2b",
  stage: "quoted",
  district: "Đà Lạt",
  expectedValue: 180_000_000,
  source: "Facebook Ads",
  assignedTo: "Nguyễn Lan",
  notes: "",
  lastContactAt: "2026-08-14T00:00:00.000Z",
  createdAt: "2026-08-14T00:00:00.000Z",
  updatedAt: "2026-08-14T00:00:00.000Z",
  tags: [],
  projectName: "An Nhiên Homestay",
  projectAddress: "Đà Lạt",
  unitCount: 12,
};

describe("CRM automation real test helpers", () => {
  it("renders workflow and journey variables from the selected CRM lead", () => {
    const context = buildAutomationTestContext(lead, {
      surveyFormUrl: "https://smartfurni.com.vn/khao-sat",
    });
    const rendered = renderAutomationTestTemplate(
      "Chào {{ name }} từ {{company}} · {{quantity}} bộ · {{survey_form_url}}",
      context,
    );

    expect(rendered).toBe(
      "Chào Nguyễn Minh từ An Nhiên Hospitality · 12 bộ · https://smartfurni.com.vn/khao-sat",
    );
    expect(context.phone).toBe("0911222333");
    expect(context.stage).toBe("Đã báo giá");
  });

  it("detects do-not-contact tags case-insensitively", () => {
    expect(isDoNotContactLead({ tags: ["Không liên hệ"] })).toBe(true);
    expect(isDoNotContactLead({ tags: ["UNSUBSCRIBE"] })).toBe(true);
    expect(isDoNotContactLead({ tags: ["Khách B2B"] })).toBe(false);
  });

  it("reports missing CRM variables before a real send", () => {
    const context = buildAutomationTestContext({ ...lead, company: "" });
    expect(missingAutomationTestVariables([
      "Chào {{name}} từ {{company}}",
      "Phương án: {{option_a_model}}",
    ], context)).toEqual(["company", "option_a_model"]);
  });
});
