import type { B2BSofaJourneySettings } from "./crm-b2b-sofa-journey";
import type { Lead } from "./crm-types";
import { STAGE_LABELS } from "./crm-types";

const DO_NOT_CONTACT_TAGS = [
  "dnc",
  "do not contact",
  "không liên hệ",
  "không làm phiền",
  "dừng chăm sóc",
  "unsubscribe",
];

export function isDoNotContactLead(lead: Pick<Lead, "tags">): boolean {
  const tags = new Set((lead.tags || []).map(tag => tag.trim().toLocaleLowerCase("vi")));
  return DO_NOT_CONTACT_TAGS.some(tag => tags.has(tag));
}

export function buildAutomationTestContext(
  lead: Lead,
  journeySettings?: Partial<B2BSofaJourneySettings>,
): Record<string, string> {
  const name = lead.name || "Anh/Chị";
  const company = lead.company || "";
  const propertyName = lead.projectName || company || "dự án của anh/chị";
  const value = lead.expectedValue
    ? `${Number(lead.expectedValue).toLocaleString("vi-VN")} đ`
    : "";
  const quantity = lead.unitCount > 0 ? String(lead.unitCount) : "";
  const surveyFormUrl = journeySettings?.surveyFormUrl || "";

  return {
    name,
    customer_name: name,
    contact_name: name,
    company,
    company_name: company,
    property_name: propertyName,
    property_type: lead.customerSegment === "project" ? "dự án lưu trú" : "dự án",
    city: lead.district || lead.projectAddress || "",
    phone: lead.zaloPhone || lead.phone || "",
    email: lead.email || "",
    stage: STAGE_LABELS[lead.stage] || lead.stage,
    assignedTo: lead.assignedTo || "Bộ phận dự án",
    sales_name: lead.assignedTo || "Bộ phận dự án",
    value,
    quantity,
    lead_source: lead.source || "",
    installation_address: lead.projectAddress || "",
    survey_form_url: surveyFormUrl,
    survey_form_line: surveyFormUrl ? `Điền nhanh tại: ${surveyFormUrl}` : "",
    approved_demo_video_url: journeySettings?.approvedDemoVideoUrl || "",
    project_brief_url: journeySettings?.projectBriefUrl || "",
    comparison_pack_url: journeySettings?.comparisonPackUrl || "",
  };
}

export function renderAutomationTestTemplate(
  template: string,
  context: Record<string, string>,
): string {
  return template
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => context[key]?.trim() || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function missingAutomationTestVariables(
  templates: string[],
  context: Record<string, string>,
): string[] {
  const keys = templates.flatMap(template =>
    [...template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map(match => match[1]),
  );
  return [...new Set(keys)].filter(key => !context[key]?.trim());
}

export function missingRequiredAutomationTestVariables(
  requiredVariables: string[],
  context: Record<string, string>,
): string[] {
  return [...new Set(requiredVariables)]
    .filter(key => /^[a-zA-Z0-9_]+$/.test(key))
    .filter(key => !context[key]?.trim());
}
