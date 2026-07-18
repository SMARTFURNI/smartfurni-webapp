import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createFirmwareRelease, listFirmwareReleases, sendPushNotification } from "@/lib/pwa-server";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  return NextResponse.json({ releases: await listFirmwareReleases() });
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  const body = await request.json() as {
    profileId?: string;
    version?: string;
    packageUrl?: string;
    sha256?: string;
    notes?: string;
    mandatory?: boolean;
  };
  try {
    await createFirmwareRelease({
      profileId: body.profileId || "",
      version: body.version || "",
      packageUrl: body.packageUrl || "",
      sha256: body.sha256,
      notes: body.notes,
      mandatory: body.mandatory,
    });
    const notification = await sendPushNotification({
      ownerScope: "smart-bed",
      title: "Có firmware SmartFurni mới",
      body: `Phiên bản ${body.version || "mới"} đã sẵn sàng tải nền.`,
      url: "/dashboard?firmware=1",
      tag: `firmware-${body.profileId}-${body.version}`,
      data: { type: "firmware-available", profileId: body.profileId || "*" },
    });
    return NextResponse.json({ success: true, notification });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo bản firmware" }, { status: 400 });
  }
}
