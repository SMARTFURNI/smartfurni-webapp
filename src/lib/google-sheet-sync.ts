/**
 * google-sheet-sync.ts — Đồng bộ lead từ nhiều Google Sheet vào Data Pool
 *
 * Luồng:
 * 1. Đọc cấu hình: danh sách sheet (Facebook / TikTok / Website)
 * 2. Với mỗi sheet đang bật: đọc dữ liệu qua Sheets API v4
 * 3. Dedup bằng composite key: spreadsheetId + row ID
 * 4. Tạo RawLead với source cố định theo cấu hình sheet
 * 5. Cập nhật lastSyncedAt và totalSynced cho từng sheet
 */

import { google } from "googleapis";
import { getCrmSettings, updateCrmSetting } from "./crm-settings-store";
import type { SheetSourceConfig } from "./crm-settings-store";
import { createRawLead, getRawLeads } from "./crm-raw-lead-store";
import type { RawLeadSource } from "./crm-raw-lead-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SheetSyncResult {
  sheetId: string;
  label: string;
  success: boolean;
  newLeads: number;
  skipped: number;
  errors: string[];
  syncedAt: string;
}

export interface SyncAllResult {
  success: boolean;
  sheets: SheetSyncResult[];
  totalNew: number;
  totalSkipped: number;
  syncedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Làm sạch số điện thoại — bỏ prefix "p:" của Facebook */
function cleanPhone(raw: string): string {
  return raw.replace(/^p:/i, "").trim();
}

/** Tạo dedup key từ spreadsheetId + rowId */
function makeDedupKey(spreadsheetId: string, rowId: string): string {
  return `gsheet:${spreadsheetId}:${rowId}`;
}

/** Kiểm tra có phải test lead không */
function isTestLead(row: Record<string, string>): boolean {
  return Object.values(row).some(v => v.includes("<test lead"));
}

// ─── Sync một sheet ───────────────────────────────────────────────────────────

async function syncOneSheet(
  sheetCfg: SheetSourceConfig,
  globalCfg: {
    idColumn: string;
    nameColumn: string;
    phoneColumn: string;
    emailColumn: string;
    adNameColumn: string;
    campaignNameColumn: string;
    formNameColumn: string;
    messageColumn: string;
  },
  sheetsClient: ReturnType<typeof google.sheets>,
  existingIds: Set<string>
): Promise<SheetSyncResult> {
  const result: SheetSyncResult = {
    sheetId: sheetCfg.id,
    label: sheetCfg.label,
    success: false,
    newLeads: 0,
    skipped: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  };

  // Đọc dữ liệu từ sheet
  let rows: string[][];
  try {
    const range = sheetCfg.sheetName ? `${sheetCfg.sheetName}!A:Z` : "A:Z";
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: sheetCfg.spreadsheetId,
      range,
    });
    rows = (response.data.values as string[][]) || [];
  } catch (e) {
    result.errors.push("Lỗi đọc sheet: " + String(e));
    return result;
  }

  if (rows.length < 2) {
    result.success = true;
    return result; // Sheet trống
  }

  // Parse headers — lowercase + replace space/dash với _
  const headers = rows[0].map(h =>
    h.toLowerCase().trim().replace(/[\s\-]+/g, "_")
  );
  const dataRows = rows.slice(1);

  // Helper lấy giá trị cột
  const getCol = (row: string[], colName: string): string => {
    if (!colName) return "";
    const normalized = colName.toLowerCase().trim().replace(/[\s\-]+/g, "_");
    const idx = headers.indexOf(normalized);
    return idx >= 0 ? (row[idx] || "").trim() : "";
  };

  // Source cố định theo cấu hình sheet
  const source = sheetCfg.source as RawLeadSource;

  // Xử lý từng row
  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    const rowNumber = rowIndex + 2; // +2 vì row 0 là headers, +1 vì 1-indexed
    
    // Bỏ qua row trống
    if (row.every(cell => !cell || !cell.trim())) {
      console.debug(`[gsheet-sync] Skipping empty row ${rowNumber}`);
      continue;
    }

    // Build rowObj để kiểm tra test lead
    const rowObj: Record<string, string> = {};
    headers.forEach((h, i) => { rowObj[h] = (row[i] || "").trim(); });

    // Bỏ qua test leads - chỉ log warning, không skip
    if (isTestLead(rowObj)) {
      console.warn(`[gsheet-sync] Test lead detected in row ${rowNumber}: ${JSON.stringify(rowObj).substring(0, 100)}`);
      // Không skip, vẫn xử lý lead này
    }

    // Lấy ID để dedup — tạo ID tự động nếu không có
    let rowId = getCol(row, globalCfg.idColumn) || rowObj["id"] || "";
    if (!rowId) {
      // Tạo ID từ created_time + row index nếu không có
      const createdTime = getCol(row, "created_time") || rowObj["created_time"] || new Date().toISOString();
      rowId = `auto_${createdTime}_${Math.random().toString(36).substr(2, 9)}`;
      console.debug(`[gsheet-sync] Generated ID for row ${rowNumber}: ${rowId}`);
    }

    const dedupKey = makeDedupKey(sheetCfg.spreadsheetId, rowId);
    if (existingIds.has(dedupKey)) {
      console.debug(`[gsheet-sync] Skipping duplicate row ${rowNumber} (ID: ${rowId})`);
      result.skipped++;
      continue;
    }

    // Lấy thông tin lead - cho phép các trường tùy chọn trống
    const rawName = getCol(row, globalCfg.nameColumn) || rowObj["tên_đầy_đủ"] || rowObj["full_name"] || rowObj["name"] || "";
    const rawPhone = getCol(row, globalCfg.phoneColumn) || rowObj["số_điện_thoại"] || rowObj["phone_number"] || rowObj["phone"] || "";
    const email = getCol(row, globalCfg.emailColumn) || rowObj["email"] || "";
    const adName = getCol(row, globalCfg.adNameColumn) || rowObj["ad_name"] || "";
    const campaignName = getCol(row, globalCfg.campaignNameColumn) || rowObj["campaign_name"] || "";
    const formName = getCol(row, globalCfg.formNameColumn) || rowObj["form_name"] || "";
    const message = globalCfg.messageColumn ? getCol(row, globalCfg.messageColumn) : "";

    // Sử dụng giá trị mặc định cho name nếu trống
    const fullName = rawName || "Khách hàng từ Sheet";
    const phone = cleanPhone(rawPhone);

    console.debug(`[gsheet-sync] Processing row ${rowNumber}: ID=${rowId}, Name=${fullName}, Phone=${phone || "(empty)"}, Email=${email || "(empty)"}`);

    try {
      await createRawLead({
        source,
        fullName,
        phone,
        email: email || undefined,
        adName: adName || undefined,
        campaignName: campaignName || undefined,
        formName: formName || undefined,
        message: message || undefined,
        rawData: {
          ...rowObj,
          sheetRowId: dedupKey,
          syncedFrom: "google_sheet",
          sheetSourceId: sheetCfg.id,
          spreadsheetId: sheetCfg.spreadsheetId,
          originalId: rowId,
        },
      });
      console.info(`[gsheet-sync] ✅ Successfully synced row ${rowNumber} (ID: ${rowId})`);
      result.newLeads++;
      existingIds.add(dedupKey);
    } catch (e) {
      const errorMsg = `Row ${rowNumber} (ID: ${rowId}): ${String(e)}`;
      console.error(`[gsheet-sync] ❌ ${errorMsg}`);
      result.errors.push(errorMsg);
    }
  }

  result.success = true;
  return result;
}

// ─── Sync tất cả sheets ───────────────────────────────────────────────────────

export async function syncAllGoogleSheets(sheetIdFilter?: string): Promise<SyncAllResult> {
  const overall: SyncAllResult = {
    success: false,
    sheets: [],
    totalNew: 0,
    totalSkipped: 0,
    syncedAt: new Date().toISOString(),
  };

  // Lấy settings
  let settings;
  try {
    settings = await getCrmSettings();
  } catch (e) {
    overall.sheets.push({
      sheetId: "global",
      label: "Global",
      success: false,
      newLeads: 0,
      skipped: 0,
      errors: ["Không thể tải CRM settings: " + String(e)],
      syncedAt: overall.syncedAt,
    });
    return overall;
  }

  const cfg = settings.googleSheet;

  if (!cfg.enabled) {
    overall.sheets.push({
      sheetId: "global",
      label: "Global",
      success: false,
      newLeads: 0,
      skipped: 0,
      errors: ["Google Sheet sync chưa được bật"],
      syncedAt: overall.syncedAt,
    });
    return overall;
  }

  if (!cfg.serviceAccountKey) {
    overall.sheets.push({
      sheetId: "global",
      label: "Global",
      success: false,
      newLeads: 0,
      skipped: 0,
      errors: ["Chưa cấu hình Service Account Key"],
      syncedAt: overall.syncedAt,
    });
    return overall;
  }

  // Khởi tạo Google Sheets API
  let sheetsClient: ReturnType<typeof google.sheets>;
  try {
    const credentials = JSON.parse(cfg.serviceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  } catch (e) {
    overall.sheets.push({
      sheetId: "global",
      label: "Global",
      success: false,
      newLeads: 0,
      skipped: 0,
      errors: ["Lỗi khởi tạo Google Sheets API: " + String(e)],
      syncedAt: overall.syncedAt,
    });
    return overall;
  }

  // Lấy set dedup từ DB một lần duy nhất
  let existingIds: Set<string>;
  try {
    const existing = await getRawLeads({ limit: 50000 });
    existingIds = new Set(
      existing.items
        .filter(l => l.rawData && (l.rawData as Record<string, unknown>).sheetRowId)
        .map(l => String((l.rawData as Record<string, unknown>).sheetRowId))
    );
  } catch {
    existingIds = new Set();
  }

  // Lọc các sheet cần sync
  const activeSources = cfg.sources.filter(s =>
    s.enabled &&
    s.spreadsheetId &&
    (!sheetIdFilter || s.id === sheetIdFilter)
  );

  if (activeSources.length === 0) {
    overall.success = true;
    return overall;
  }

  const globalCfg = {
    idColumn: cfg.idColumn,
    nameColumn: cfg.nameColumn,
    phoneColumn: cfg.phoneColumn,
    emailColumn: cfg.emailColumn,
    adNameColumn: cfg.adNameColumn,
    campaignNameColumn: cfg.campaignNameColumn,
    formNameColumn: cfg.formNameColumn,
    messageColumn: cfg.messageColumn,
  };

  // Sync từng sheet tuần tự (tránh rate limit)
  const updatedSources = [...cfg.sources];
  for (const sheetCfg of activeSources) {
    const sheetResult = await syncOneSheet(sheetCfg, globalCfg, sheetsClient, existingIds);
    overall.sheets.push(sheetResult);
    overall.totalNew += sheetResult.newLeads;
    overall.totalSkipped += sheetResult.skipped;

    // Cập nhật lastSyncedAt và totalSynced cho sheet này
    const idx = updatedSources.findIndex(s => s.id === sheetCfg.id);
    if (idx >= 0) {
      updatedSources[idx] = {
        ...updatedSources[idx],
        lastSyncedAt: sheetResult.syncedAt,
        totalSynced: (updatedSources[idx].totalSynced || 0) + sheetResult.newLeads,
      };
    }
  }

  // Lưu lại stats
  try {
    await updateCrmSetting("googleSheet", {
      ...cfg,
      sources: updatedSources,
      totalSynced: (cfg.totalSynced || 0) + overall.totalNew,
    });
  } catch (e) {
    console.error("[gsheet-sync] Failed to update sync stats:", e);
  }

  overall.success = true;
  console.log(`[gsheet-sync] ✅ Sync done: ${overall.totalNew} new, ${overall.totalSkipped} skipped across ${activeSources.length} sheet(s)`);
  return overall;
}
