/**
 * cleanup-old-leads.ts - Xóa leads cũ để sync lại với dữ liệu mới
 */

import { query } from "./db";

export async function deleteLeadsBySource(source: string): Promise<number> {
  const result = await query<{ count: string }>(
    "DELETE FROM crm_raw_leads WHERE source = $1 RETURNING COUNT(*) as count",
    [source]
  );
  return parseInt(result[0]?.count || "0", 10);
}

export async function deleteAllLeads(): Promise<number> {
  const result = await query<{ count: string }>(
    "DELETE FROM crm_raw_leads RETURNING COUNT(*) as count"
  );
  return parseInt(result[0]?.count || "0", 10);
}
