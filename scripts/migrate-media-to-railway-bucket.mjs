import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadsRoot = path.join(root, "public", "uploads");
const manifestPath = path.join(root, ".media-migration-manifest.json");
const args = new Set(process.argv.slice(2));
const shouldUpload = args.has("--upload");
const shouldApplyDb = args.has("--apply-db");
const shouldExternalizeBase64 = args.has("--externalize-base64") || shouldApplyDb;

function env(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function bucketConfig() {
  const config = {
    bucket: env("RAILWAY_MEDIA_BUCKET", "BUCKET"),
    endpoint: env("RAILWAY_MEDIA_ENDPOINT", "ENDPOINT"),
    region: env("RAILWAY_MEDIA_REGION", "REGION") || "auto",
    accessKeyId: env("RAILWAY_MEDIA_ACCESS_KEY_ID", "ACCESS_KEY_ID"),
    secretAccessKey: env("RAILWAY_MEDIA_SECRET_ACCESS_KEY", "SECRET_ACCESS_KEY"),
    forcePathStyle: env("RAILWAY_MEDIA_FORCE_PATH_STYLE").toLowerCase() === "true",
  };
  if (!config.bucket || !config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error("Thiếu biến Railway Bucket: BUCKET, ENDPOINT, REGION, ACCESS_KEY_ID, SECRET_ACCESS_KEY");
  }
  return config;
}

function mediaUrl(key) {
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function contentType(filename) {
  const extension = path.extname(filename).toLowerCase();
  return {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
  }[extension] || "application/octet-stream";
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function putObject(s3, config, key, body, type, visibility = "public") {
  await s3.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: type,
    CacheControl: visibility === "public"
      ? "public, max-age=31536000, immutable"
      : "private, no-store",
    Metadata: { visibility, migrated: "true" },
  }));
}

async function createLegacyManifest(s3, config) {
  const files = await walk(uploadsRoot);
  const manifest = [];
  let totalBytes = 0;
  for (const [index, filename] of files.entries()) {
    const relative = path.relative(path.join(root, "public"), filename).split(path.sep).join("/");
    const oldUrl = `/${relative}`;
    const key = `public/legacy/${relative}`;
    const size = (await stat(filename)).size;
    totalBytes += size;
    if (shouldUpload) {
      await putObject(s3, config, key, await readFile(filename), contentType(filename));
      console.log(`[${index + 1}/${files.length}] Uploaded ${oldUrl}`);
    }
    manifest.push({ oldUrl, key, newUrl: mediaUrl(key), size });
  }
  await writeFile(manifestPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    uploaded: shouldUpload,
    totalFiles: manifest.length,
    totalBytes,
    files: manifest,
  }, null, 2));
  console.log(`${shouldUpload ? "Đã upload" : "Kế hoạch"}: ${manifest.length} file, ${(totalBytes / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Manifest: ${manifestPath}`);
  return manifest;
}

async function tableHasColumn(client, table, column) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return result.rowCount > 0;
}

async function replaceDatabaseUrls(client, manifest) {
  const targets = [
    ["products", "data", "jsonb"],
    ["posts", "data", "jsonb"],
    ["settings", "data", "jsonb"],
    ["crm_products", "data", "jsonb"],
    ["crm_settings", "value", "jsonb"],
    ["lp_content", "content", "text"],
    ["catalogue_pages", "image_url", "text"],
    ["catalogues", "cover_image_url", "text"],
    ["facebook_group_content_assets", "url", "text"],
  ];
  await client.query("BEGIN");
  try {
    for (const [table, column, kind] of targets) {
      if (!(await tableHasColumn(client, table, column))) continue;
      let changed = 0;
      for (const item of manifest) {
        const sql = kind === "jsonb"
          ? `UPDATE ${table}
             SET ${column} = replace(${column}::text, $1, $2)::jsonb
             WHERE ${column}::text LIKE '%' || $1 || '%'`
          : `UPDATE ${table}
             SET ${column} = replace(${column}, $1, $2)
             WHERE ${column} LIKE '%' || $1 || '%'`;
        const result = await client.query(sql, [item.oldUrl, item.newUrl]);
        changed += result.rowCount || 0;
      }
      console.log(`[DB] ${table}.${column}: ${changed} dòng cập nhật`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function externalizeDataUrls(value, context, s3, config, visibility) {
  if (Array.isArray(value)) {
    return Promise.all(value.map((item, index) =>
      externalizeDataUrls(item, `${context}-${index + 1}`, s3, config, visibility)));
  }
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    const isDataImage = typeof child === "string" && child.startsWith("data:image/");
    const isSupportedField = key.toLowerCase().endsWith("dataurl") || key === "signatureData";
    if (isDataImage && isSupportedField) {
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(child);
      if (!match) throw new Error(`Data URL không hợp lệ tại ${context}.${key}`);
      const body = Buffer.from(match[2], "base64");
      const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
      const folder = key === "signatureData" ? "contracts" : "catalogues";
      const extension = match[1].includes("png") ? "png" : match[1].includes("webp") ? "webp" : "jpg";
      const objectKey = `${visibility}/${folder}/migrated/${hash}.${extension}`;
      await putObject(s3, config, objectKey, body, match[1], visibility);
      output[key] = mediaUrl(objectKey);
    } else {
      output[key] = await externalizeDataUrls(child, `${context}.${key}`, s3, config, visibility);
    }
  }
  return output;
}

async function migrateDatabaseBase64(client, s3, config) {
  if (await tableHasColumn(client, "crm_settings", "value")) {
    const rows = await client.query(
      "SELECT key, value FROM crm_settings WHERE value::text LIKE '%data:image/%'",
    );
    for (const row of rows.rows) {
      const value = await externalizeDataUrls(row.value, `crm-settings-${row.key}`, s3, config, "public");
      await client.query(
        "UPDATE crm_settings SET value = $2::jsonb, updated_at = NOW() WHERE key = $1",
        [row.key, JSON.stringify(value)],
      );
    }
    console.log(`[DB] Đã xử lý base64 trong ${rows.rowCount} cấu hình Catalogue`);
  }
  if (await tableHasColumn(client, "crm_contracts", "signatures")) {
    const rows = await client.query(
      "SELECT id, signatures FROM crm_contracts WHERE signatures::text LIKE '%data:image/%'",
    );
    for (const row of rows.rows) {
      const signatures = await externalizeDataUrls(
        row.signatures,
        `contract-${row.id}`,
        s3,
        config,
        "private",
      );
      await client.query(
        "UPDATE crm_contracts SET signatures = $2::jsonb, updated_at = NOW() WHERE id = $1",
        [row.id, JSON.stringify(signatures)],
      );
    }
    console.log(`[DB] Đã xử lý base64 trong ${rows.rowCount} hợp đồng`);
  }
}

const requiresBucket = shouldUpload || shouldApplyDb || shouldExternalizeBase64;
const config = requiresBucket ? bucketConfig() : null;
const s3 = config ? new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  forcePathStyle: config.forcePathStyle,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
}) : null;

try {
  let resolvedManifest;
  if (shouldUpload || !shouldApplyDb) {
    resolvedManifest = await createLegacyManifest(s3, config);
  } else {
    const document = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!document.uploaded) {
      throw new Error("Manifest mới chỉ là kế hoạch. Hãy chạy media:railway:upload trước.");
    }
    resolvedManifest = document.files;
  }
  if (shouldApplyDb || shouldExternalizeBase64) {
    const databaseUrl = env("POSTGRESQL_URL", "DATABASE_URL");
    if (!databaseUrl) throw new Error("Thiếu DATABASE_URL để cập nhật dữ liệu");
    const client = new pg.Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
      if (shouldApplyDb) await replaceDatabaseUrls(client, resolvedManifest);
      if (shouldExternalizeBase64) await migrateDatabaseBase64(client, s3, config);
    } finally {
      await client.end();
    }
  }
} catch (error) {
  console.error("[Media migration]", error);
  process.exitCode = 1;
}
