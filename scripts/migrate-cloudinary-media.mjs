#!/usr/bin/env node

/**
 * Migrate website Cloudinary images to public/uploads/migrated as WebP.
 * Run --download, commit/deploy generated files, then run --apply-db.
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import sharp from "sharp";

const { Pool } = pg;
const root = process.cwd();
const outputRoot = path.join(root, "public", "uploads", "migrated");
const manifestPath = path.join(root, "data", "cloudinary-migration-map.json");
const mode = process.argv.includes("--direct")
  ? "direct"
  : process.argv.includes("--apply-db")
    ? "apply"
    : "download";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  max: 2,
});

function collectUrls(value, urls = new Set()) {
  if (typeof value === "string" && value.includes("res.cloudinary.com")) {
    for (const match of value.matchAll(/https:\/\/res\.cloudinary\.com\/[^\s"'<>\\)]+/g)) urls.add(match[0]);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, urls));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectUrls(item, urls));
  }
  return urls;
}

function replaceUrls(value, map) {
  if (typeof value === "string") {
    let result = value;
    for (const [oldUrl, newUrl] of Object.entries(map)) result = result.split(oldUrl).join(newUrl);
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => replaceUrls(item, map));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceUrls(item, map)]));
  }
  return value;
}

function localName(url) {
  const pathname = new URL(url).pathname;
  const sourceName = pathname.split("/").pop()?.replace(/\.[^.]+$/, "") || "image";
  const safeName = sourceName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "image";
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
  return `${safeName}-${hash}.webp`;
}

function githubConfig() {
  const token = process.env.GITHUB_MEDIA_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_MEDIA_TOKEN is required for --direct");
  return {
    token,
    owner: process.env.GITHUB_MEDIA_OWNER?.trim() || "SMARTFURNI",
    repo: process.env.GITHUB_MEDIA_REPO?.trim() || "smartfurni-webapp",
    branch: process.env.GITHUB_MEDIA_BRANCH?.trim() || "main",
  };
}

async function githubRequest(pathname, init = {}) {
  const config = githubConfig();
  return fetch(`https://api.github.com${pathname}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

async function uploadToGitHub(filename, optimized) {
  const config = githubConfig();
  const repositoryPath = `public/uploads/migrated/${filename}`;
  const encodedPath = repositoryPath.split("/").map(encodeURIComponent).join("/");
  const apiPath = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;
  const existing = await githubRequest(`${apiPath}?ref=${encodeURIComponent(config.branch)}`);
  let sha;
  if (existing.ok) {
    const metadata = await existing.json();
    sha = metadata.sha;
  } else if (existing.status !== 404) {
    throw new Error(`Cannot inspect ${repositoryPath}: ${existing.status} ${await existing.text()}`);
  }

  const response = await githubRequest(apiPath, {
    method: "PUT",
    body: JSON.stringify({
      message: `media: migrate ${filename}`,
      content: optimized.toString("base64"),
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`Cannot upload ${repositoryPath}: ${response.status} ${await response.text()}`);
  }
  return `/uploads/migrated/${filename}`;
}

async function loadWebsiteRecords() {
  const records = [];
  const products = await pool.query("SELECT id, data FROM products WHERE data::text LIKE $1", ["%res.cloudinary.com%"]);
  products.rows.forEach((row) => records.push({ table: "products", key: row.id, value: row.data }));

  const settings = await pool.query("SELECT key, value FROM app_settings WHERE value::text LIKE $1", ["%res.cloudinary.com%"]);
  settings.rows.forEach((row) => records.push({ table: "app_settings", key: row.key, value: row.value }));

  const lpTable = await pool.query("SELECT to_regclass('public.lp_content') AS name");
  if (lpTable.rows[0]?.name) {
    const landingContent = await pool.query(
      "SELECT slug, block_key, content FROM lp_content WHERE content LIKE $1",
      ["%res.cloudinary.com%"],
    );
    landingContent.rows.forEach((row) => records.push({
      table: "lp_content",
      key: `${row.slug}::${row.block_key}`,
      slug: row.slug,
      blockKey: row.block_key,
      value: row.content,
    }));
  }
  return records;
}

async function download() {
  const records = await loadWebsiteRecords();
  const urls = new Set();
  records.forEach((record) => collectUrls(record.value, urls));
  await fs.mkdir(outputRoot, { recursive: true });

  const map = {};
  for (const url of urls) {
    const filename = localName(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cannot download ${url}: ${response.status}`);
    const source = Buffer.from(await response.arrayBuffer());
    const optimized = await sharp(source, { animated: true })
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    await fs.writeFile(path.join(outputRoot, filename), optimized);
    map[url] = `/uploads/migrated/${filename}`;
    console.log(`${url} -> ${map[url]} (${Math.round(optimized.length / 1024)} KB)`);
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), map }, null, 2)}\n`);
  console.log(`Downloaded ${urls.size} unique images. Manifest: ${manifestPath}`);
}

async function migrateDirectly() {
  const records = await loadWebsiteRecords();
  const urls = new Set();
  records.forEach((record) => collectUrls(record.value, urls));
  const map = {};

  for (const url of urls) {
    const filename = localName(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cannot download ${url}: ${response.status}`);
    const source = Buffer.from(await response.arrayBuffer());
    const optimized = await sharp(source, { animated: true })
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    map[url] = await uploadToGitHub(filename, optimized);
    console.log(`${url} -> ${map[url]} (${Math.round(optimized.length / 1024)} KB)`);
  }

  await applyMapToDatabase(records, map);
  console.log(`Direct migration completed for ${urls.size} unique images.`);
}

async function applyMapToDatabase(records, map) {
  await pool.query("BEGIN");
  try {
    for (const record of records) {
      const replaced = replaceUrls(record.value, map);
      if (JSON.stringify(replaced) === JSON.stringify(record.value)) continue;
      if (record.table === "products") {
        await pool.query("UPDATE products SET data = $1, updated_at = NOW() WHERE id = $2", [replaced, record.key]);
      } else if (record.table === "app_settings") {
        await pool.query("UPDATE app_settings SET value = $1, updated_at = NOW() WHERE key = $2", [replaced, record.key]);
      } else {
        await pool.query(
          "UPDATE lp_content SET content = $1, updated_at = NOW() WHERE slug = $2 AND block_key = $3",
          [replaced, record.slug, record.blockKey],
        );
      }
      console.log(`Updated ${record.table}:${record.key}`);
    }
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function applyDatabase() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const map = manifest.map || {};
  const records = await loadWebsiteRecords();
  await applyMapToDatabase(records, map);
  console.log("Database migration completed.");
}

try {
  if (mode === "direct") await migrateDirectly();
  else if (mode === "apply") await applyDatabase();
  else await download();
} finally {
  await pool.end();
}
