import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

// In-memory email settings (resets on restart; use env vars for persistence)
let emailSettings = {
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: process.env.SMTP_PORT || "587",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS ? "••••••••" : "",
  adminEmail: process.env.ADMIN_EMAIL || process.env.SMTP_USER || "",
  enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
};

export async function GET() {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Don't expose password
  return NextResponse.json({ ...emailSettings, smtpPass: emailSettings.smtpPass ? "••••••••" : "" });
}

export async function POST(req: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Test connection if requested
  if (body.action === "test") {
    try {
      const nodemailer = await import("nodemailer").catch(() => null);
      if (!nodemailer) {
        return NextResponse.json({ error: "nodemailer not installed" }, { status: 500 });
      }
      const transporter = nodemailer.default.createTransport({
        host: body.smtpHost || emailSettings.smtpHost,
        port: parseInt(body.smtpPort || emailSettings.smtpPort),
        secure: parseInt(body.smtpPort || emailSettings.smtpPort) === 465,
        auth: {
          user: body.smtpUser || emailSettings.smtpUser,
          pass: body.smtpPass && body.smtpPass !== "••••••••" ? body.smtpPass : process.env.SMTP_PASS || "",
        },
      });
      await transporter.verify();
      return NextResponse.json({ success: true, message: "Kết nối SMTP thành công!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: `Kết nối thất bại: ${message}` }, { status: 400 });
    }
  }

  // Save settings
  emailSettings = {
    smtpHost: body.smtpHost ?? emailSettings.smtpHost,
    smtpPort: body.smtpPort ?? emailSettings.smtpPort,
    smtpUser: body.smtpUser ?? emailSettings.smtpUser,
    smtpPass: body.smtpPass && body.smtpPass !== "••••••••" ? body.smtpPass : emailSettings.smtpPass,
    adminEmail: body.adminEmail ?? emailSettings.adminEmail,
    enabled: body.enabled ?? emailSettings.enabled,
  };

  return NextResponse.json({ success: true });
}
