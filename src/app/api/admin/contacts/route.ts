import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getAllContacts, markContactRead, deleteContact, addContact } from "@/lib/admin-store";
import { sendContactNotification } from "@/lib/email-notify";

export async function GET() {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getAllContacts());
}

export async function POST(req: NextRequest) {
  // Public endpoint for contact form submissions
  const body = await req.json();
  const msg = addContact(body);

  // Send email notification to admin (non-blocking)
  sendContactNotification(msg).catch((err) => {
    console.warn("[Email] Failed to send contact notification:", err.message);
  });

  return NextResponse.json(msg, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Support both query params (from client) and JSON body
  const url = new URL(req.url);
  const idFromQuery = url.searchParams.get("id");
  const actionFromQuery = url.searchParams.get("action");

  let id = idFromQuery;
  let action = actionFromQuery;

  if (!id || !action) {
    try {
      const body = await req.json();
      id = id || body.id;
      action = action || body.action;
    } catch {
      // ignore parse error
    }
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (action === "read") markContactRead(id);
  if (action === "delete") deleteContact(id);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  deleteContact(id);
  return NextResponse.json({ success: true });
}
