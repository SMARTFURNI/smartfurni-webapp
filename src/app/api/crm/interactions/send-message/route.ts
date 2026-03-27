import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getLeads } from "@/lib/crm-store";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCrmAccess();
    const { leadId, type, content } = await request.json();

    if (!leadId || !type || !content) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get lead info
    const leads = await getLeads();
    const lead = leads.find(l => l.id === leadId);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    let messageResult = null;

    if (type === "sms") {
      // Send SMS via Twilio
      const smsResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: process.env.TWILIO_PHONE_NUMBER || "",
            To: lead.phone,
            Body: content,
          }).toString(),
        }
      );

      if (smsResponse.ok) {
        const smsData = await smsResponse.json();
        messageResult = {
          id: smsData.sid,
          type: "sms",
          status: "sent",
        };
      }
    } else if (type === "zalo") {
      // Send Zalo message
      const zaloResponse = await fetch("https://openapi.zalo.me/v2.0/oa/message/cs/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ZALO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          recipient: {
            user_id: lead.zaloId,
          },
          message: {
            text: content,
          },
        }),
      });

      if (zaloResponse.ok) {
        const zaloData = await zaloResponse.json();
        messageResult = {
          id: zaloData.data?.message_id,
          type: "zalo",
          status: "sent",
        };
      }
    }

    if (!messageResult) {
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    // Save message record
    const messageRecord = {
      id: messageResult.id,
      leadId,
      type,
      content,
      direction: "sent",
      timestamp: new Date(),
      staffId: session.staffId || "admin",
    };

    console.log(`[Message Sent] ${type.toUpperCase()} sent to lead ${leadId}`);

    return NextResponse.json({
      success: true,
      messageRecord,
    });
  } catch (err) {
    console.error("[Send Message Error]:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
