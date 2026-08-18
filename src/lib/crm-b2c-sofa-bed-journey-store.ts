import "server-only";

import type { Lead } from "@/lib/crm-types";
import { query } from "@/lib/db";
import {
  B2C_SOFA_BED_JOURNEY,
  B2C_SOFA_BED_JOURNEY_CODE,
  DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS,
  b2cSofaBedJourneyDefinitionWithOverrides,
  buildB2CSofaBedJourneyContext,
  isEligibleForB2CSofaBedJourney,
  type B2CSofaBedJourneySettings,
} from "@/lib/crm-b2c-sofa-bed-journey";
import {
  autoEnrollEligibleJourney,
  claimDueJourneyActionsForCode,
  enrollLeadInJourney,
  getJourneyDashboard,
  getJourneyEnrollmentForCode,
  getJourneySettings,
  saveJourneySettings,
  syncPendingJourneyActions,
  type JourneyActionRecord,
  type JourneyEnrollmentRecord,
} from "@/lib/crm-b2b-sofa-journey-store";

export async function getB2CSofaBedJourneySettings(): Promise<B2CSofaBedJourneySettings> {
  return getJourneySettings(B2C_SOFA_BED_JOURNEY_CODE, DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS);
}

export async function saveB2CSofaBedJourneySettings(input: Partial<B2CSofaBedJourneySettings>): Promise<B2CSofaBedJourneySettings> {
  const settings = await saveJourneySettings(B2C_SOFA_BED_JOURNEY_CODE, DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS, input);
  await syncPendingJourneyActions(B2C_SOFA_BED_JOURNEY_CODE, b2cSofaBedJourneyDefinitionWithOverrides(settings));
  return settings;
}

export async function getB2CSofaBedJourneyEnrollment(leadId: string): Promise<JourneyEnrollmentRecord | null> {
  return getJourneyEnrollmentForCode(B2C_SOFA_BED_JOURNEY_CODE, leadId);
}

export async function enrollLeadInB2CSofaBedJourney(
  lead: Lead,
  settings: B2CSofaBedJourneySettings,
  input?: { context?: Record<string, string>; automationAccountId?: string; force?: boolean },
): Promise<{ enrollment: JourneyEnrollmentRecord; created: boolean }> {
  // Không cho force bỏ qua cổng kết bạn: workflow này tuyệt đối chỉ chạy trên Zalo cá nhân đã kết bạn.
  if (settings.requireAcceptedZaloFriendship && lead.zaloFriendship?.status !== "accepted") {
    throw new Error("Khách chưa kết bạn Zalo cá nhân; workflow sẽ chờ đến khi kết bạn thành công.");
  }
  const result = await enrollLeadInJourney(
    lead,
    settings,
    b2cSofaBedJourneyDefinitionWithOverrides(settings),
    isEligibleForB2CSofaBedJourney,
    buildB2CSofaBedJourneyContext,
    input,
  );
  if (result.created) {
    const acceptedAt = new Date(lead.zaloFriendship?.acceptedAt || Date.now());
    const dayZeroAt = new Date(acceptedAt.getTime() + 30 * 60 * 1000);
    await query(
      `UPDATE crm_journey_actions SET scheduled_at=$2,next_attempt_at=NULL,updated_at=NOW()
       WHERE enrollment_id=$1 AND step_id='D0_SPACE_DISCOVERY' AND status='pending'`,
      [result.enrollment.id, dayZeroAt.toISOString()],
    );
  }
  return result;
}

export async function autoEnrollEligibleB2CSofaBedLeads(settings: B2CSofaBedJourneySettings): Promise<{ checked: number; enrolled: number; skipped: number }> {
  return autoEnrollEligibleJourney(
    settings,
    B2C_SOFA_BED_JOURNEY,
    isEligibleForB2CSofaBedJourney,
    (lead, currentSettings) => enrollLeadInB2CSofaBedJourney(lead, currentSettings),
  );
}

export async function claimDueB2CSofaBedJourneyActions(limit = 20, allowedLeadIds: string[] | null = null): Promise<JourneyActionRecord[]> {
  return claimDueJourneyActionsForCode(B2C_SOFA_BED_JOURNEY_CODE, limit, allowedLeadIds);
}

export async function getB2CSofaBedJourneyDashboard(): Promise<{
  settings: B2CSofaBedJourneySettings;
  stats: Record<string, number>;
  recentEnrollments: Array<JourneyEnrollmentRecord & { leadName: string }>;
  recentActions: JourneyActionRecord[];
}> {
  return getJourneyDashboard(B2C_SOFA_BED_JOURNEY_CODE, DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS);
}
