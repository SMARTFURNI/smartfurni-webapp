import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Temporary endpoint to reset install step images to default
// DELETE THIS FILE after use
export async function GET() {
  const keys = ["install_step_1_img", "install_step_3_img", "install_step_4_img"];
  const results: Record<string, string> = {};
  for (const bk of keys) {
    try {
      await query(`DELETE FROM lp_content WHERE slug = $1 AND block_key = $2`, ["gsf150", bk]);
      results[bk] = "deleted";
    } catch (e) {
      results[bk] = "error: " + String(e);
    }
  }
  return NextResponse.json({ ok: true, results });
}
