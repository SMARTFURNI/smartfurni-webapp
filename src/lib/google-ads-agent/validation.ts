import type { AIAdDraftOutput, CampaignInput, GoogleAdsProduct } from "./types";

const BLOCKED_CLAIMS = [
  "chua khoi",
  "chữa khỏi",
  "tri khoi",
  "trị khỏi",
  "tot nhat viet nam",
  "tốt nhất việt nam",
  "gia re nhat",
  "giá rẻ nhất",
  "cam ket khoi benh",
  "cam kết khỏi bệnh",
];

export function canAccessGoogleAdsAgent(session: { isAdmin: boolean; staffRole?: string } | null): boolean {
  if (!session) return false;
  if (session.isAdmin) return true;
  return ["super_admin", "manager", "leader", "marketing", "marketing_manager"].includes(session.staffRole ?? "");
}

export function validateHeadline(text: string): string | null {
  return text.length <= 30 ? null : `Headline qua 30 ky tu: "${text}" (${text.length})`;
}

export function validateDescription(text: string): string | null {
  return text.length <= 90 ? null : `Description qua 90 ky tu: "${text}" (${text.length})`;
}

export function validateProductLandingPage(product: GoogleAdsProduct): string | null {
  if (!product.landingPageUrl?.startsWith("https://")) return "Thieu landing page HTTPS hop le";
  return null;
}

export function validateCampaignInput(input: CampaignInput): string[] {
  const errors: string[] = [];
  if (!input.productSku) errors.push("Chua chon san pham");
  if (input.dailyBudget <= 0) errors.push("Ngan sach/ngay phai lon hon 0");
  if (input.targetCpa <= 0) errors.push("CPA muc tieu phai lon hon 0");
  return errors;
}

export function validateAIOutput(output: AIAdDraftOutput, product: GoogleAdsProduct): string[] {
  const errors: string[] = [];
  const landingError = validateProductLandingPage(product);
  if (landingError) errors.push(landingError);
  if (output.landingPageUrl !== product.landingPageUrl) errors.push("Landing page AI khong khop san pham");
  if (output.keywords.length < 20 || output.keywords.length > 50) errors.push("Can 20-50 keywords");
  if (output.negativeKeywords.length < 10 || output.negativeKeywords.length > 15) errors.push("Can 10-15 negative keywords");
  if (output.headlines.length !== 15) errors.push("Can dung 15 headlines");
  if (output.descriptions.length !== 4) errors.push("Can dung 4 descriptions");
  if (output.sitelinks.length !== 4) errors.push("Can dung 4 sitelinks");
  if (output.callouts.length !== 10) errors.push("Can dung 10 callouts");
  output.headlines.forEach((headline) => {
    const err = validateHeadline(headline);
    if (err) errors.push(err);
  });
  output.descriptions.forEach((description) => {
    const err = validateDescription(description);
    if (err) errors.push(err);
  });
  const allText = [
    output.campaignName,
    output.adGroupName,
    ...output.headlines,
    ...output.descriptions,
    ...output.callouts,
    output.strategyReason,
  ].join(" ").toLowerCase();
  for (const claim of BLOCKED_CLAIMS) {
    if (allText.includes(claim)) errors.push(`Noi dung bi chan theo chinh sach: ${claim}`);
  }
  return errors;
}
