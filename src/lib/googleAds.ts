import { GoogleAdsApi, enums } from "google-ads-api";
import type { AdData } from "@/types/ads";

const DEFAULT_LANDING_PAGE =
  process.env.GOOGLE_ADS_DEFAULT_FINAL_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.smartfurni.com.vn";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Thiếu biến môi trường ${name}`);
  }
  return value;
}

function normalizeCustomerId(customerId: string): string {
  return customerId.replace(/-/g, "").trim();
}

function toMicros(amount: number): number {
  return Math.round(amount * 1_000_000);
}

function toTextAsset(text: string) {
  return { text };
}

function getResourceName(response: unknown): string {
  const result = Array.isArray(response) ? response[0] : response;
  const resourceName =
    (result as { resource_name?: string })?.resource_name ||
    (result as { resourceName?: string })?.resourceName;

  if (!resourceName) {
    throw new Error("Google Ads API không trả về resource_name");
  }

  return resourceName;
}

export interface DraftCampaignResult {
  campaignResourceName: string;
  adGroupResourceName: string;
  budgetResourceName: string;
  status: "PAUSED";
}

export function getGoogleAdsCustomer() {
  const client = new GoogleAdsApi({
    client_id: requiredEnv("GOOGLE_ADS_CLIENT_ID"),
    client_secret: requiredEnv("GOOGLE_ADS_CLIENT_SECRET"),
    developer_token: requiredEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
  });

  return client.Customer({
    customer_id: normalizeCustomerId(requiredEnv("GOOGLE_ADS_CUSTOMER_ID")),
    refresh_token: requiredEnv("GOOGLE_ADS_REFRESH_TOKEN"),
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
      ? normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)
      : undefined,
  });
}

/**
 * Tạo một Search Campaign ở trạng thái PAUSED.
 * Đây là hàng rào an toàn quan trọng: agent chỉ tạo bản nháp/tạm dừng,
 * không tự tiêu tiền quảng cáo nếu chưa có người kiểm tra và bật thủ công.
 */
export async function createDraftCampaign(adData: AdData): Promise<DraftCampaignResult> {
  const customer = getGoogleAdsCustomer();
  const now = Date.now();

  try {
    const budgetResponse = await customer.campaignBudgets.create([
      {
        name: `${adData.campaignName} Budget ${now}`,
        amount_micros: toMicros(adData.budget),
        delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        explicitly_shared: false,
      },
    ]);
    const budgetResourceName = getResourceName(budgetResponse);

    const campaignResponse = await customer.campaigns.create([
      {
        name: `${adData.campaignName} ${now}`,
        status: enums.CampaignStatus.PAUSED,
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        campaign_budget: budgetResourceName,
        manual_cpc: {},
        network_settings: {
          target_google_search: true,
          target_search_network: true,
          target_content_network: false,
          target_partner_search_network: false,
        },
      },
    ]);
    const campaignResourceName = getResourceName(campaignResponse);

    const adGroupResponse = await customer.adGroups.create([
      {
        name: `${adData.campaignName} - Nhóm chính`,
        campaign: campaignResourceName,
        status: enums.AdGroupStatus.ENABLED,
        type: enums.AdGroupType.SEARCH_STANDARD,
        cpc_bid_micros: toMicros(Math.max(1_000, Math.round(adData.budget * 0.08))),
      },
    ]);
    const adGroupResourceName = getResourceName(adGroupResponse);

    if (adData.keywords.length > 0) {
      await customer.adGroupCriteria.create(
        adData.keywords.map((keyword) => ({
          ad_group: adGroupResourceName,
          status: enums.AdGroupCriterionStatus.ENABLED,
          keyword: {
            text: keyword,
            match_type: enums.KeywordMatchType.PHRASE,
          },
        }))
      );
    }

    if (adData.negativeKeywords.length > 0) {
      await customer.adGroupCriteria.create(
        adData.negativeKeywords.map((keyword) => ({
          ad_group: adGroupResourceName,
          negative: true,
          keyword: {
            text: keyword,
            match_type: enums.KeywordMatchType.PHRASE,
          },
        }))
      );
    }

    await customer.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        status: enums.AdGroupAdStatus.PAUSED,
        ad: {
          final_urls: [DEFAULT_LANDING_PAGE],
          responsive_search_ad: {
            headlines: adData.headlines.map(toTextAsset),
            descriptions: adData.descriptions.map(toTextAsset),
          },
        },
      },
    ]);

    return {
      budgetResourceName,
      campaignResourceName,
      adGroupResourceName,
      status: "PAUSED",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định từ Google Ads API";
    throw new Error(`Không tạo được campaign Google Ads: ${message}`);
  }
}
