import { google } from "googleapis";
import type { AdCampaignDraft } from "@/lib/google-ads-agent/types";
import { encryptSecret, saveGoogleAdsAccount } from "@/lib/google-ads-agent/store";

export class GoogleAdsService {
  getOAuthUrl(state = "smartfurni-google-ads") {
    const client = this.oauthClient();
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/adwords"],
      state,
    });
  }

  async connectWithCode(code: string, customerId: string, actor: string) {
    const client = this.oauthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token && !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
      throw new Error("Google khong tra refresh_token. Hay ket noi lai voi prompt consent.");
    }
    return saveGoogleAdsAccount({
      customerId,
      encryptedRefreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined,
      status: "connected",
      connectedBy: actor,
    });
  }

  async readCampaignPerformance() {
    return {
      source: "local-mvp",
      note: "Google Ads reporting API se duoc kich hoat khi co developer token va customer_id.",
    };
  }

  async pushApprovedDraftAsPausedCampaign(draft: AdCampaignDraft, actor: string) {
    if (draft.status !== "human_approved") {
      throw new Error("Chi duoc day len Google Ads sau khi user bam Duyet.");
    }
    if (!this.hasGoogleAdsEnv()) {
      return {
        dryRun: true,
        campaignId: `paused-local-${draft.id.slice(0, 8)}`,
        pushedBy: actor,
        message: "Thieu ENV Google Ads nen chua goi API that. Draft da duoc validate va san sang tao paused campaign.",
      };
    }
    return {
      dryRun: true,
      campaignId: `paused-ready-${draft.id.slice(0, 8)}`,
      pushedBy: actor,
      message: "MVP da chan auto-run. Can bo sung Google Ads mutate endpoint chinh thuc truoc khi chay live.",
    };
  }

  private oauthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_ADS_CLIENT_ID,
      process.env.GOOGLE_ADS_CLIENT_SECRET,
      process.env.GOOGLE_ADS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || process.env.FRONTEND_URL || "http://localhost:3001"}/api/google-ads-agent/connect`
    );
  }

  private hasGoogleAdsEnv() {
    return Boolean(
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      (process.env.GOOGLE_ADS_REFRESH_TOKEN || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)
    );
  }
}
