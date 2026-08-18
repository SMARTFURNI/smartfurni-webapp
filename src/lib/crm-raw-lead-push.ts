import "server-only";

import { sendPushNotification } from "@/lib/pwa-server";

interface DataPoolLeadPushInput {
  id: string;
  fullName: string;
  source: string;
  campaignName?: string;
  adName?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  facebook_lead: "Facebook Lead",
  tiktok_lead: "TikTok Lead",
  manual: "Nhập tay",
  website: "Website",
  other: "Nguồn khác",
};

function cleanPreview(value: string | undefined, fallback: string) {
  return value?.replace(/\s+/g, " ").trim() || fallback;
}

/** Gửi lead mới tới mọi thiết bị PWA đã đăng ký của CRM và Admin. */
export async function notifyNewDataPoolLead(input: DataPoolLeadPushInput) {
  const leadName = cleanPreview(input.fullName, "Khách hàng chưa có tên");
  const sourceLabel = SOURCE_LABELS[input.source] || cleanPreview(input.source, "Nguồn khác");
  const campaign = cleanPreview(input.campaignName || input.adName, "");
  const body = [leadName, sourceLabel, campaign].filter(Boolean).join(" · ");
  const notification = {
    title: "Data Pool có lead mới",
    body,
    url: "/crm/data-pool",
    tag: `data-pool-lead-${input.id}`,
    renotify: true,
    urgency: "high" as const,
    data: {
      type: "new-data-pool-lead",
      leadId: input.id,
      source: input.source,
    },
  };

  const [crm, admin] = await Promise.allSettled([
    sendPushNotification({ ...notification, ownerScope: "crm" }),
    sendPushNotification({ ...notification, ownerScope: "admin" }),
  ]);

  if (crm.status === "rejected") console.error("[Data Pool Push] CRM:", crm.reason);
  if (admin.status === "rejected") console.error("[Data Pool Push] Admin:", admin.reason);

  return {
    crm: crm.status === "fulfilled" ? crm.value : null,
    admin: admin.status === "fulfilled" ? admin.value : null,
  };
}
