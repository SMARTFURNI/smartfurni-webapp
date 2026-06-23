import { describe, expect, it } from "vitest";
import { validateAIOutput, validateDescription, validateHeadline, validateProductLandingPage, canAccessGoogleAdsAgent } from "@/lib/google-ads-agent/validation";
import { SMARTFURNI_AD_PRODUCTS } from "@/lib/google-ads-agent/seed";
import { GoogleAdsService } from "@/services/google-ads/GoogleAdsService";
import type { AdCampaignDraft, AIAdDraftOutput } from "@/lib/google-ads-agent/types";

const product = SMARTFURNI_AD_PRODUCTS.find((item) => item.sku === "SMF23")!;

describe("AI Google Ads Agent", () => {
  it("validates headline 30 characters", () => {
    expect(validateHeadline("123456789012345678901234567890")).toBeNull();
    expect(validateHeadline("1234567890123456789012345678901")).toMatch(/Headline/);
  });

  it("validates description 90 characters", () => {
    expect(validateDescription("a".repeat(90))).toBeNull();
    expect(validateDescription("a".repeat(91))).toMatch(/Description/);
  });

  it("validates AI output JSON shape and policy", () => {
    const output: AIAdDraftOutput = {
      campaignName: "SF Sofa Giuong HCM",
      adGroupName: "SMF23 Tin Nhan",
      keywords: Array.from({ length: 20 }, (_, i) => ({ keyword: `keyword ${i}`, matchType: "phrase", intent: "high", negative: false })),
      negativeKeywords: Array.from({ length: 10 }, (_, i) => ({ keyword: `negative ${i}`, matchType: "phrase", intent: "low", negative: true })),
      headlines: Array.from({ length: 15 }, (_, i) => `Headline ${i}`),
      descriptions: Array.from({ length: 4 }, (_, i) => `Description ${i}`),
      sitelinks: Array.from({ length: 4 }, (_, i) => ({ text: `Link ${i}`, url: product.landingPageUrl })),
      callouts: Array.from({ length: 10 }, (_, i) => `Callout ${i}`),
      structuredSnippet: { header: "Dich vu", values: ["Dat size", "Giao lap"] },
      landingPageUrl: product.landingPageUrl,
      suggestedDailyBudget: 350000,
      strategyReason: "Tap trung keyword co y dinh mua cao.",
    };
    expect(validateAIOutput(output, product)).toEqual([]);
  });

  it("does not push Google Ads when draft is not approved", async () => {
    const service = new GoogleAdsService();
    const draft = {
      id: "draft-1",
      status: "ai_created",
      product,
      input: { productLine: "sofa_giuong", productSku: "SMF23", objective: "messages", location: "HCM", dailyBudget: 350000, targetCpa: 180000 },
      output: {} as AIAdDraftOutput,
      validationErrors: [],
      aiModel: "test",
      createdBy: "test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as AdCampaignDraft;
    await expect(service.pushApprovedDraftAsPausedCampaign(draft, "tester")).rejects.toThrow(/sau khi user bam Duyet/);
  });

  it("maps product to landing page", () => {
    expect(validateProductLandingPage(product)).toBeNull();
    expect(product.landingPageUrl).toBe("https://smartfurni.vn/sofa-giuong-thong-minh/smf23");
  });

  it("allows admin and marketing roles", () => {
    expect(canAccessGoogleAdsAgent({ isAdmin: true })).toBe(true);
    expect(canAccessGoogleAdsAgent({ isAdmin: false, staffRole: "marketing" })).toBe(true);
    expect(canAccessGoogleAdsAgent({ isAdmin: false, staffRole: "sales" })).toBe(false);
  });
});
