export const dynamic = "force-dynamic";
import { requireCrmAccess } from "@/lib/admin-auth";
import { canAccessZaloInbox, canSendZaloInboxMessages } from "@/lib/zalo-inbox-access";
import ZaloInboxClient from "@/components/crm/zalo-inbox/ZaloInboxClient";
import { redirect } from "next/navigation";

export default async function ZaloInboxPage() {
  const session = await requireCrmAccess();
  if (!await canAccessZaloInbox(session)) redirect("/crm");
  const canSendMessages = await canSendZaloInboxMessages(session);
  return <ZaloInboxClient canSendMessages={canSendMessages} isAdmin={session.isAdmin} />;
}
