import { google } from "googleapis";
import type { AdCampaignDraft } from "@/lib/google-ads-agent/types";
import { encryptSecret, saveGoogleAdsAccount } from "@/lib/google-ads-agent/store";

export class GoogleAdsService {
  getOAuthUrl(state = "smartfurni-google-ads") {
    if (!this.hasOAuthEnv()) {
      throw new Error("Thiếu GOOGLE_ADS_CLIENT_ID hoặc GOOGLE_ADS_CLIENT_SECRET.");
    }
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
      throw new Error("Google không trả refresh_token. Hãy kết nối lại với prompt consent.");
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
      throw new Error("Chỉ được đẩy lên Google Ads sau khi người dùng bấm Duyệt.");
    }
    if (!this.hasGoogleAdsEnv()) {
      return {
        dryRun: true,
        campaignId: `paused-local-${draft.id.slice(0, 8)}`,
        pushedBy: actor,
        message: "Thiếu ENV Google Ads nên chưa gọi API thật. Bản nháp đã được kiểm tra và sẵn sàng tạo campaign tạm dừng.",
      };
    }
    return {
      dryRun: true,
      campaignId: `paused-ready-${draft.id.slice(0, 8)}`,
      pushedBy: actor,
      message: "MVP đã chặn tự chạy. Cần bổ sung Google Ads mutate endpoint chính thức trước khi chạy live.",
    };
  }

  private oauthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_ADS_CLIENT_ID,
      process.env.GOOGLE_ADS_CLIENT_SECRET,
      this.getRedirectUri()
    );
  }

  getRedirectUri() {
    return process.env.GOOGLE_ADS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || process.env.FRONTEND_URL || "http://localhost:3001"}/api/google-ads-agent/connect`;
  }

  getEnvStatus() {
    const required = [
      "GOOGLE_ADS_CLIENT_ID",
      "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
      "GOOGLE_ADS_ENCRYPTION_KEY",
    ] as const;

    const missing = required.filter((name) => !process.env[name]);

    return {
      envReady: missing.length === 0,
      oauthReady: this.hasOAuthEnv(),
      missing,
      redirectUri: this.getRedirectUri(),
    };
  }

  private hasOAuthEnv() {
    return Boolean(process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_CLIENT_SECRET);
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
