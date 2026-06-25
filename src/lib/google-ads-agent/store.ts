import { randomUUID, createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { dbLoadAll, dbSaveOne } from "@/lib/db-store";
import { SMARTFURNI_AD_PRODUCTS, SMARTFURNI_AD_PRODUCTS_SEED_VERSION } from "./seed";
import type {
  AdCampaignDraft,
  AdPerformanceDaily,
  ApprovalLog,
  ApprovalStatus,
  GoogleAdsAccount,
  GoogleAdsProduct,
} from "./types";

const TABLE_PRODUCTS = "google_ads_products";
const TABLE_DRAFTS = "ad_campaign_drafts";
const TABLE_ACCOUNTS = "google_ads_accounts";
const TABLE_PERFORMANCE = "ad_performance_daily";
const TABLE_APPROVAL_LOGS = "approval_logs";

let productsCache: GoogleAdsProduct[] = SMARTFURNI_AD_PRODUCTS;
let draftsCache: AdCampaignDraft[] = [];
let accountsCache: GoogleAdsAccount[] = [];
let performanceCache: AdPerformanceDaily[] = seedPerformance();
let approvalLogsCache: ApprovalLog[] = [];
let loaded = false;

async function loadOnce() {
  if (loaded) return;
  const [products, drafts, accounts, performance, logs] = await Promise.all([
    dbLoadAll<GoogleAdsProduct>(TABLE_PRODUCTS),
    dbLoadAll<AdCampaignDraft>(TABLE_DRAFTS),
    dbLoadAll<GoogleAdsAccount>(TABLE_ACCOUNTS),
    dbLoadAll<AdPerformanceDaily>(TABLE_PERFORMANCE),
    dbLoadAll<ApprovalLog>(TABLE_APPROVAL_LOGS),
  ]);
  productsCache = products?.length ? migrateSeedProducts(products) : SMARTFURNI_AD_PRODUCTS;
  draftsCache = drafts ?? [];
  accountsCache = accounts ?? [];
  performanceCache = performance?.length ? performance : seedPerformance();
  approvalLogsCache = logs ?? [];
  for (const product of productsCache) dbSaveOne(TABLE_PRODUCTS, product);
  for (const row of performanceCache) dbSaveOne(TABLE_PERFORMANCE, row);
  loaded = true;
}

export async function getAdProducts() {
  await loadOnce();
  return productsCache;
}

export async function getAdProductBySku(sku: string) {
  await loadOnce();
  return productsCache.find((product) => product.sku === sku) ?? null;
}

export async function saveAdProduct(input: GoogleAdsProduct) {
  await loadOnce();
  const now = new Date().toISOString();
  const product: GoogleAdsProduct = {
    ...input,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  const idx = productsCache.findIndex((item) => item.id === product.id || item.sku === product.sku);
  if (idx >= 0) productsCache[idx] = product;
  else productsCache.push(product);
  dbSaveOne(TABLE_PRODUCTS, product);
  return product;
}

export async function listDrafts() {
  await loadOnce();
  return [...draftsCache].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDraftById(id: string) {
  await loadOnce();
  return draftsCache.find((draft) => draft.id === id) ?? null;
}

export async function saveDraft(draft: AdCampaignDraft) {
  await loadOnce();
  const idx = draftsCache.findIndex((item) => item.id === draft.id);
  if (idx >= 0) draftsCache[idx] = draft;
  else draftsCache.push(draft);
  dbSaveOne(TABLE_DRAFTS, draft);
  return draft;
}

export async function setDraftStatus(id: string, status: ApprovalStatus, actor: string, reason?: string) {
  const draft = await getDraftById(id);
  if (!draft) return null;
  const updated: AdCampaignDraft = {
    ...draft,
    status,
    approvedBy: status === "human_approved" ? actor : draft.approvedBy,
    rejectedReason: status === "rejected" ? reason : draft.rejectedReason,
    updatedAt: new Date().toISOString(),
  };
  await saveDraft(updated);
  await addApprovalLog({ draftId: id, status, actor, reason });
  return updated;
}

export async function saveGoogleAdsAccount(input: Omit<GoogleAdsAccount, "id" | "createdAt" | "updatedAt">) {
  await loadOnce();
  const now = new Date().toISOString();
  const existing = accountsCache.find((account) => account.customerId === input.customerId);
  const account: GoogleAdsAccount = {
    ...input,
    id: existing?.id ?? randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const idx = accountsCache.findIndex((item) => item.id === account.id);
  if (idx >= 0) accountsCache[idx] = account;
  else accountsCache.push(account);
  dbSaveOne(TABLE_ACCOUNTS, account);
  return account;
}

export async function getGoogleAdsAccounts() {
  await loadOnce();
  return accountsCache;
}

export async function listPerformance() {
  await loadOnce();
  return performanceCache;
}

export async function addApprovalLog(input: Omit<ApprovalLog, "id" | "createdAt">) {
  await loadOnce();
  const log: ApprovalLog = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  approvalLogsCache.push(log);
  dbSaveOne(TABLE_APPROVAL_LOGS, log);
  return log;
}

export function encryptSecret(secret: string): string {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

function encryptionKey() {
  return createHash("sha256")
    .update(process.env.GOOGLE_ADS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || "smartfurni-google-ads")
    .digest();
}

function migrateSeedProducts(products: GoogleAdsProduct[]) {
  const seedBySku = new Map(SMARTFURNI_AD_PRODUCTS.map((product) => [product.sku, product]));
  return products.map((product) => {
    const seed = seedBySku.get(product.sku);
    if (!seed) return product;
    const isLegacySeed =
      product.updatedAt === "2026-06-23T00:00:00.000Z" ||
      product.name.includes("giuong") ||
      product.landingPageUrl.includes("smartfurni.vn/");
    if (!isLegacySeed) return product;
    return {
      ...seed,
      id: product.id || seed.id,
      createdAt: product.createdAt || seed.createdAt,
      updatedAt: SMARTFURNI_AD_PRODUCTS_SEED_VERSION,
    };
  });
}

function seedPerformance(): AdPerformanceDaily[] {
  return [
    {
      id: "perf-smf23-2026-06-21",
      date: "2026-06-21",
      campaignName: "SF Sofa Giường HCM",
      adGroupName: "SMF23 Căn Hộ Nhỏ",
      productSku: "SMF23",
      cost: 820000,
      clicks: 96,
      impressions: 5420,
      conversions: 6,
      ctr: 1.77,
      cpc: 8542,
      cpa: 136667,
      roas: 4.2,
    },
    {
      id: "perf-gyt300-2026-06-21",
      date: "2026-06-21",
      campaignName: "SF Giường Y Tế Toàn Quốc",
      adGroupName: "GYT300 Chăm Sóc Tại Nhà",
      productSku: "GYT300",
      cost: 640000,
      clicks: 51,
      impressions: 2880,
      conversions: 1,
      ctr: 1.77,
      cpc: 12549,
      cpa: 640000,
      roas: 1.4,
    },
  ];
}
