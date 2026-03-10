import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifySessionToken } from "@/lib/admin-auth";
import {
  getTheme,
  updateTheme,
  updateThemeSection,
  applyPreset,
  resetTheme,
  PRESET_THEMES,
  FONT_OPTIONS,
  BORDER_RADIUS_OPTIONS,
  type SiteTheme,
} from "@/lib/theme-store";

// GET /api/admin/theme — lấy theme hiện tại + presets
export async function GET(request: NextRequest) {
  const token = request.cookies.get("sf_admin_session")?.value;
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const theme = getTheme();
  return NextResponse.json({
    theme,
    presets: PRESET_THEMES,
    fontOptions: FONT_OPTIONS,
    borderRadiusOptions: BORDER_RADIUS_OPTIONS,
  });
}

// PATCH /api/admin/theme — cập nhật toàn bộ hoặc một section
export async function PATCH(request: NextRequest) {
  const token = request.cookies.get("sf_admin_session")?.value;
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, section, data } = body;

    let updatedTheme: SiteTheme;

    if (action === "apply_preset") {
      updatedTheme = applyPreset(data.presetId);
    } else if (action === "reset") {
      updatedTheme = resetTheme();
    } else if (action === "update_section" && section) {
      updatedTheme = updateThemeSection(section as keyof SiteTheme, data);
    } else {
      updatedTheme = updateTheme(data);
    }

    // Xóa cache của tất cả các trang frontend để chúng render lại với theme mới
    revalidatePath("/", "layout");
    revalidatePath("/products", "layout");
    revalidatePath("/about", "layout");
    revalidatePath("/contact", "layout");
    revalidatePath("/blog", "layout");
    revalidatePath("/cart", "layout");
    revalidatePath("/checkout", "layout");
    revalidatePath("/warranty", "layout");
    revalidatePath("/returns", "layout");

    return NextResponse.json({ success: true, theme: updatedTheme });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
