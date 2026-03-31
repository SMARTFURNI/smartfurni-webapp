import { NextResponse } from "next/server";
import { getCrmSettings } from "@/lib/crm-settings-store";

/**
 * GET /api/crm/lead-types
 * Public endpoint to fetch lead types (no authentication required)
 * Used by client-side components to populate dropdowns
 */
export async function GET() {
  try {
    const settings = await getCrmSettings();
    return NextResponse.json(settings.leadTypes || []);
  } catch (error) {
    console.error("Failed to fetch lead types:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array on error
  }
}
