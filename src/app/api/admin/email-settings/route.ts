import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { dbGetSetting, dbSaveSetting } from "@/lib/db-store";

type EmailSettings = {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  adminEmail: string;
  enabled: boolean;
};

const defaultEmailSettings: EmailSettings = {
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: process.env.SMTP_PORT || "587",
  smtpUser: process.env.SMTP_USER || "",
  adminEmail: process.env.ADMIN_EMAIL || process.env.SMTP_USER || "",
  enabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)),
};

async function getSettings(): Promise<EmailSettings> {
  return { ...defaultEmailSettings, ...(await dbGetSetting<Partial<EmailSettings>>("admin_email_settings")) };
}

export async function GET() {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getSettings();
  return NextResponse.json({ ...settings, smtpPass: (process.env.SMTP_PASS || process.env.SMTP_PASSWORD) ? "••••••••" : "" });
}

export async function POST(req: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const emailSettings = await getSettings();

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
          pass: body.smtpPass && body.smtpPass !== "••••••••" ? body.smtpPass : process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "",
        },
      });
      await transporter.verify();
      return NextResponse.json({ success: true, message: "Kết nối SMTP thành công!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: `Kết nối thất bại: ${message}` }, { status: 400 });
    }
  }

  const next: EmailSettings = {
    smtpHost: body.smtpHost ?? emailSettings.smtpHost,
    smtpPort: body.smtpPort ?? emailSettings.smtpPort,
    smtpUser: body.smtpUser ?? emailSettings.smtpUser,
    adminEmail: body.adminEmail ?? emailSettings.adminEmail,
    enabled: body.enabled ?? emailSettings.enabled,
  };
  await dbSaveSetting("admin_email_settings", next);

  return NextResponse.json({ success: true, passwordManagedByEnvironment: true });
}
