import type { GoogleSheetQuestionMapping } from "./crm-settings-store";

/** Các cột kỹ thuật của Facebook/Google Sheet, không phải câu trả lời của khách. */
const GOOGLE_SHEET_METADATA_COLUMNS = [
  "id",
  "created_time",
  "timestamp",
  "dấu thời gian",
  "ad_id",
  "ad_name",
  "adset_id",
  "adset_name",
  "campaign_id",
  "campaign_name",
  "form_id",
  "form_name",
  "is_organic",
  "platform",
  "inbox_url",
  "lead_status",
];

export function normalizeSheetHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function uniqueLabel(target: Record<string, string>, requestedLabel: string): string {
  const label = requestedLabel.trim() || "Câu trả lời";
  if (!(label in target)) return label;
  let suffix = 2;
  while (`${label} (${suffix})` in target) suffix += 1;
  return `${label} (${suffix})`;
}

/**
 * Giữ toàn bộ câu trả lời của Google Form. Cột đã cấu hình tùy chỉnh dùng nhãn
 * thân thiện; các cột còn lại dùng nguyên tiêu đề trên Sheet để không mất dữ liệu.
 */
export function collectGoogleFormAnswers(input: {
  headers: string[];
  row: string[];
  excludedColumns?: string[];
  customMappings?: GoogleSheetQuestionMapping[];
}): Record<string, string> {
  const { headers, row } = input;
  const excluded = new Set(
    [...GOOGLE_SHEET_METADATA_COLUMNS, ...(input.excludedColumns ?? [])]
      .map(normalizeSheetHeader)
      .filter(Boolean),
  );
  const consumed = new Set<string>();
  const answers: Record<string, string> = {};

  for (const mapping of input.customMappings ?? []) {
    const normalizedColumn = normalizeSheetHeader(mapping.column);
    if (!normalizedColumn) continue;
    const index = headers.findIndex(header => normalizeSheetHeader(header) === normalizedColumn);
    if (index < 0) continue;
    consumed.add(normalizedColumn);
    const value = String(row[index] ?? "").trim();
    if (!value) continue;
    answers[uniqueLabel(answers, mapping.label || headers[index])] = value;
  }

  headers.forEach((header, index) => {
    const normalizedHeader = normalizeSheetHeader(header);
    const value = String(row[index] ?? "").trim();
    if (!normalizedHeader || !value || excluded.has(normalizedHeader) || consumed.has(normalizedHeader)) return;
    answers[uniqueLabel(answers, header)] = value;
  });

  return answers;
}

export function getGoogleFormAnswers(rawData: Record<string, unknown> | null | undefined): Record<string, string> {
  const value = rawData?.formAnswers;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([label, answer]) => [label.trim(), String(answer ?? "").trim()] as const)
      .filter(([label, answer]) => Boolean(label && answer)),
  );
}

export function formatGoogleFormAnswers(rawData: Record<string, unknown> | null | undefined): string {
  const entries = Object.entries(getGoogleFormAnswers(rawData));
  if (entries.length === 0) return "";
  return entries.map(([label, answer]) => `- ${label}: ${answer}`).join("\n");
}
