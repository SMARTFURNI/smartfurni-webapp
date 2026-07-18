import { NextRequest, NextResponse } from "next/server";
import { getSmartBedSession } from "@/lib/smart-bed-auth";
import { getLatestFirmwareRelease, isFirmwareVersionNewer } from "@/lib/pwa-server";

export async function GET(request: NextRequest) {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const profileId = request.nextUrl.searchParams.get("profileId")?.trim() || "";
  const currentVersion = request.nextUrl.searchParams.get("currentVersion")?.trim() || "";
  if (!profileId) return NextResponse.json({ error: "Thiếu model thiết bị" }, { status: 400 });
  const release = await getLatestFirmwareRelease(profileId);
  return NextResponse.json({
    configured: Boolean(release),
    currentVersion,
    updateAvailable: Boolean(release && isFirmwareVersionNewer(release.version, currentVersion)),
    release,
  });
}
