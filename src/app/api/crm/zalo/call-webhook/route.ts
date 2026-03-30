/**
 * POST /api/crm/zalo/call-webhook
 * Webhook nhận sự kiện cuộc gọi từ Zalo Cloud Connect
 *
 * Events:
 * - oa_send_call_request: OA gửi yêu cầu gọi đến user
 * - user_reply_call_request: User phản hồi yêu cầu gọi (accept/reject)
 * - call_started: Cuộc gọi bắt đầu
 * - call_ended: Cuộc gọi kết thúc
 *
 * Cấu hình webhook trong Zalo Developers Portal:
 * - URL: https://your-domain.com/api/crm/zalo/call-webhook
 * - Events: "OA event sends call request to user" + "User event responds to call request from OA"
 */
import { NextRequest, NextResponse } from "next/server";
import { getCallLogs, updateCallLog } from "@/lib/crm-store";
import { mapZaloReplyStatus } from "@/lib/zalo-cloud";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const eventName = body.event_name as string;

    console.log("[ZaloCallWebhook] Event:", eventName, JSON.stringify(body).slice(0, 200));

    switch (eventName) {
      case "oa_send_call_request": {
        // OA đã gửi yêu cầu gọi thành công
        const callId = (body.call_id as string) ?? (body.id as string);
        const phone = body.phone as string;
        console.log(`[ZaloCallWebhook] Call request sent to ${phone}, callId: ${callId}`);
        break;
      }

      case "user_reply_call_request": {
        // User phản hồi yêu cầu gọi
        const callId = (body.call_id as string) ?? (body.id as string);
        const replyStatus = body.reply_status as string;
        const phone = body.phone as string;

        const callStatus = mapZaloReplyStatus(replyStatus);

        // Tìm call log theo callId
        try {
          const logs = await getCallLogs({ limit: 50 });
          const matchingLog = logs.find(
            (l) => l.callId === callId || l.receiverNumber === phone
          );

          if (matchingLog) {
            await updateCallLog(matchingLog.id, {
              status: callStatus,
              note: `Khách hàng ${replyStatus === "P" ? "chấp nhận" : "từ chối"} cuộc gọi Zalo`,
              endedAt: new Date().toISOString(),
            });
            console.log(`[ZaloCallWebhook] Updated call log ${matchingLog.id}: ${callStatus}`);
          }
        } catch (dbErr) {
          console.error("[ZaloCallWebhook] DB error:", dbErr);
        }
        break;
      }

      case "call_started": {
        // Cuộc gọi bắt đầu
        const callId = body.call_id as string;
        const phone = body.phone as string;

        try {
          const logs = await getCallLogs({ limit: 50 });
          const matchingLog = logs.find(
            (l) => l.callId === callId || l.receiverNumber === phone
          );

          if (matchingLog) {
            await updateCallLog(matchingLog.id, {
              status: "answered",
              startedAt: new Date().toISOString(),
              note: "Cuộc gọi Zalo đang diễn ra",
            });
          }
        } catch (dbErr) {
          console.error("[ZaloCallWebhook] DB error:", dbErr);
        }
        break;
      }

      case "call_ended": {
        // Cuộc gọi kết thúc
        const callId = body.call_id as string;
        const phone = body.phone as string;
        const duration = (body.duration as number) ?? 0;

        try {
          const logs = await getCallLogs({ limit: 50 });
          const matchingLog = logs.find(
            (l) => l.callId === callId || l.receiverNumber === phone
          );

          if (matchingLog) {
            await updateCallLog(matchingLog.id, {
              status: duration > 0 ? "answered" : "missed",
              duration,
              endedAt: new Date().toISOString(),
              note: `Cuộc gọi Zalo kết thúc. Thời lượng: ${duration}s`,
            });
          }
        } catch (dbErr) {
          console.error("[ZaloCallWebhook] DB error:", dbErr);
        }
        break;
      }

      default:
        console.log(`[ZaloCallWebhook] Unhandled event: ${eventName}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ZaloCallWebhook] Error:", e);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

// Webhook verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");
  const expectedToken = process.env.ZALO_WEBHOOK_SECRET ?? "smartfurni-zalo-webhook";

  if (verifyToken === expectedToken && challenge) {
    return new NextResponse(challenge);
  }
  return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
}
