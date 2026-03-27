import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireCrmAccess();
    const { leadId, phoneNumber } = await request.json();

    if (!leadId || !phoneNumber) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Integrate with VoIP service (Twilio example)
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER || "",
          To: phoneNumber,
          Url: `${process.env.BASE_URL || ""}/api/crm/interactions/twilio-callback`,
        }).toString(),
      }
    );

    if (!twilioResponse.ok) {
      throw new Error("Failed to initiate call with Twilio");
    }

    const callData = await twilioResponse.json();

    console.log(`[Call Initiated] Lead ${leadId} to ${phoneNumber} by ${session.staffId || "admin"}`);

    return NextResponse.json({
      success: true,
      callSid: callData.sid,
      leadId,
      phoneNumber,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("[Initiate Call Error]:", err);
    return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
  }
}
