/**
 * Reset Facebook Leads - Xóa tất cả leads từ Facebook để sync lại
 * Usage: node scripts/reset-facebook-leads.js
 */

const { query } = require("../src/lib/db");

async function resetFacebookLeads() {
  try {
    console.log("🔄 Đang xóa tất cả leads từ Facebook...");
    
    const result = await query(
      "DELETE FROM crm_raw_leads WHERE source = $1",
      ["facebook_lead"]
    );
    
    console.log("✅ Đã xóa tất cả leads từ Facebook");
    console.log("📝 Tiếp theo: Hãy vào CRM Settings → Google Sheet Sync → Nhấp 'Sync tất cả'");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
}

resetFacebookLeads();
