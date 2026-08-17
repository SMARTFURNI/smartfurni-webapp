import type { Activity, ActivityAttachment } from "@/lib/crm-types";
import type { JourneyChannel } from "@/lib/crm-b2b-sofa-journey";

export interface JourneyActivityMedia {
  name: string;
  url: string;
  contentType: string;
  sizeBytes: number;
}

export interface JourneySentActivityInput {
  leadId: string;
  channel: JourneyChannel;
  stepTitle: string;
  emailSubject?: string;
  emailBody?: string;
  zaloBody?: string;
  media?: JourneyActivityMedia[];
}

const CHANNEL_LABELS: Record<JourneyChannel, string> = {
  zalo_personal: "Zalo cá nhân",
  zalo_oa: "Zalo OA",
  email: "Email",
};

export function journeySentActivityId(actionId: string): string {
  return `journey-sent:${actionId}`;
}

export function buildJourneySentActivity(
  input: JourneySentActivityInput,
): Omit<Activity, "id" | "createdAt"> {
  const channelLabel = CHANNEL_LABELS[input.channel];
  const emailContent = [
    input.emailSubject?.trim() ? `Chủ đề: ${input.emailSubject.trim()}` : "",
    input.emailBody?.trim() || "",
  ].filter(Boolean).join("\n\n");
  const content = input.channel === "email"
    ? emailContent
    : input.zaloBody?.trim() || "";
  const attachments: ActivityAttachment[] = (input.media || []).map(item => ({
    name: item.name,
    url: item.url,
    type: item.contentType,
    size: item.sizeBytes,
  }));

  return {
    leadId: input.leadId,
    type: input.channel === "email" ? "email" : "note",
    title: `[Workflow] Đã gửi qua ${channelLabel} · ${input.stepTitle}`,
    content,
    createdBy: "CRM Automation",
    scheduledAt: undefined,
    attachments,
  };
}
