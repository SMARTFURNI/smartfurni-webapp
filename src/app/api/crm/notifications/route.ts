import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  getNotificationRules, saveNotificationRule, deleteNotificationRule,
  getNotificationLogs, getZaloConfig, saveZaloConfig, getSmsConfig, saveSmsConfig,
  getAssignmentRules, saveAssignmentRule, deleteAssignmentRule,
  sendZaloMessage, sendSms,
} from "@/lib/crm-notifications-store";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (type === "rules") return NextResponse.json(await getNotificationRules());
  if (type === "logs") return NextResponse.json(await getNotificationLogs(100));
  if (type === "zalo") return NextResponse.json(await getZaloConfig());
  if (type === "sms") return NextResponse.json(await getSmsConfig());
  if (type === "assignment") return NextResponse.json(await getAssignmentRules());
  return NextResponse.json({ rules: await getNotificationRules(), logs: await getNotificationLogs(20) });
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const body = await req.json();

  if (type === "rule") {
    const rule = await saveNotificationRule(body);
    return NextResponse.json(rule);
  }
  if (type === "zalo") {
    await saveZaloConfig(body);
    return NextResponse.json({ ok: true });
  }
  if (type === "sms") {
    await saveSmsConfig(body);
    return NextResponse.json({ ok: true });
  }
  if (type === "assignment") {
    const rule = await saveAssignmentRule(body);
    return NextResponse.json(rule);
  }
  if (type === "send_zalo") {
    const result = await sendZaloMessage(body.phone, body.message, body.zaloUid);
    return NextResponse.json(result);
  }
  if (type === "send_sms") {
    const result = await sendSms(body.phone, body.message);
    return NextResponse.json(result);
  }
  if (type === "delete_rule") {
    await deleteNotificationRule(body.id);
    return NextResponse.json({ ok: true });
  }
  if (type === "delete_assignment") {
    await deleteAssignmentRule(body.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
