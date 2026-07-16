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
import { v2 as cloudinary } from "cloudinary";

const { Pool } = pg;
const root = process.cwd();
const outputRoot = path.join(root, "public", "uploads", "migrated");
const manifestPath = path.join(root, "data", "cloudinary-migration-map.json");
const mode = process.argv.includes("--recover-local")
  ? "recover"
  : process.argv.includes("--direct")
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

function collectMigratedPaths(value, paths = new Set()) {
  if (typeof value === "string" && value.includes("/uploads/migrated/")) {
    for (const match of value.matchAll(/\/uploads\/migrated\/[a-zA-Z0-9_.-]+\.webp/g)) paths.add(match[0]);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectMigratedPaths(item, paths));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectMigratedPaths(item, paths));
  }
  return paths;
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

async function stageGitHubMedia(files) {
  const config = githubConfig();
  const repoPath = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
  const refPath = `${repoPath}/git/ref/heads/${encodeURIComponent(config.branch)}`;
  const updateRefPath = `${repoPath}/git/refs/heads/${encodeURIComponent(config.branch)}`;
  const refResponse = await githubRequest(refPath);
  if (!refResponse.ok) {
    throw new Error(`Cannot inspect branch ${config.branch}: ${refResponse.status} ${await refResponse.text()}`);
  }
  const ref = await refResponse.json();
  const parentSha = ref.object.sha;

  const commitResponse = await githubRequest(`${repoPath}/git/commits/${parentSha}`);
  if (!commitResponse.ok) {
    throw new Error(`Cannot inspect commit ${parentSha}: ${commitResponse.status} ${await commitResponse.text()}`);
  }
  const parentCommit = await commitResponse.json();

  const treeEntries = [];
  for (const file of files) {
    const blobResponse = await githubRequest(`${repoPath}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: file.optimized.toString("base64"), encoding: "base64" }),
    });
    if (!blobResponse.ok) {
      throw new Error(`Cannot create blob for ${file.filename}: ${blobResponse.status} ${await blobResponse.text()}`);
    }
    const blob = await blobResponse.json();
    treeEntries.push({
      path: `public/uploads/migrated/${file.filename}`,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  const treeResponse = await githubRequest(`${repoPath}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: treeEntries,
    }),
  });
  if (!treeResponse.ok) {
    throw new Error(`Cannot create migration tree: ${treeResponse.status} ${await treeResponse.text()}`);
  }
  const tree = await treeResponse.json();

  const newCommitResponse = await githubRequest(`${repoPath}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `media: migrate ${files.length} Cloudinary image${files.length === 1 ? "" : "s"}`,
      tree: tree.sha,
      parents: [parentSha],
    }),
  });
  if (!newCommitResponse.ok) {
    throw new Error(`Cannot create migration commit: ${newCommitResponse.status} ${await newCommitResponse.text()}`);
  }
  const newCommit = await newCommitResponse.json();
  return { updateRefPath, parentSha, commitSha: newCommit.sha };
}

async function publishGitHubMedia(staged) {
  const response = await githubRequest(staged.updateRefPath, {
    method: "PATCH",
    body: JSON.stringify({ sha: staged.commitSha, force: false }),
  });
  if (!response.ok) {
    throw new Error(`Cannot publish migration commit: ${response.status} ${await response.text()}`);
  }
}

async function listPublishedMigratedPaths() {
  const config = githubConfig();
  const repoPath = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
  const response = await githubRequest(`${repoPath}/git/trees/${encodeURIComponent(config.branch)}?recursive=1`);
  if (!response.ok) {
    throw new Error(`Cannot inspect published media tree: ${response.status} ${await response.text()}`);
  }
  const tree = await response.json();
  return new Set(
    (tree.tree || [])
      .filter((entry) => entry.type === "blob" && entry.path?.startsWith("public/uploads/migrated/"))
      .map((entry) => `/${entry.path.replace(/^public\//, "")}`),
  );
}

async function loadWebsiteRecords(search = "%res.cloudinary.com%") {
  const records = [];
  const products = await pool.query("SELECT id, data FROM products WHERE data::text LIKE $1", [search]);
  products.rows.forEach((row) => records.push({ table: "products", key: row.id, value: row.data }));

  const settings = await pool.query("SELECT key, value FROM app_settings WHERE value::text LIKE $1", [search]);
  settings.rows.forEach((row) => records.push({ table: "app_settings", key: row.key, value: row.value }));

  const lpTable = await pool.query("SELECT to_regclass('public.lp_content') AS name");
  if (lpTable.rows[0]?.name) {
    const landingContent = await pool.query(
      "SELECT slug, block_key, content FROM lp_content WHERE content LIKE $1",
      [search],
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
  const files = [];

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
    map[url] = `/uploads/migrated/${filename}`;
    files.push({ filename, optimized });
    console.log(`${url} -> ${map[url]} (${Math.round(optimized.length / 1024)} KB)`);
  }

  if (files.length === 0) {
    console.log("Direct migration completed for 0 unique images.");
    return;
  }

  // Blob/tree/commit objects do not move the branch, so Railway is not redeployed
  // while the database transaction is still running. Publish the ref only after
  // every record has been updated successfully.
  const staged = await stageGitHubMedia(files);
  await applyMapToDatabase(records, map);
  await publishGitHubMedia(staged);
  console.log(`Direct migration completed for ${urls.size} unique images.`);
}

async function listCloudinaryImages() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are required for --recover-local");
  }

  const resources = [];
  let nextCursor;
  do {
    const page = await cloudinary.api.resources({
      resource_type: "image",
      type: "upload",
      max_results: 500,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    });
    resources.push(...(page.resources || []));
    nextCursor = page.next_cursor;
  } while (nextCursor);
  return resources;
}

async function recoverMigratedMedia() {
  const records = await loadWebsiteRecords("%/uploads/migrated/%");
  const requiredPaths = new Set();
  records.forEach((record) => collectMigratedPaths(record.value, requiredPaths));
  const resources = await listCloudinaryImages();
  const sourceByPath = new Map();
  for (const resource of resources) {
    if (!resource.secure_url) continue;
    sourceByPath.set(`/uploads/migrated/${localName(resource.secure_url)}`, resource.secure_url);
  }

  const missing = [...requiredPaths].filter((requiredPath) => !sourceByPath.has(requiredPath));
  const publishedPaths = await listPublishedMigratedPaths();
  const unavailable = missing.filter((requiredPath) => !publishedPaths.has(requiredPath));
  if (unavailable.length > 0) {
    throw new Error(`Cannot recover ${unavailable.length} migrated file(s): ${unavailable.slice(0, 10).join(", ")}`);
  }
  if (missing.length > 0) {
    console.log(`Skipping ${missing.length} file(s) already published in GitHub.`);
  }

  const files = [];
  for (const requiredPath of [...requiredPaths].filter((item) => sourceByPath.has(item))) {
    const sourceUrl = sourceByPath.get(requiredPath);
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Cannot download ${sourceUrl}: ${response.status}`);
    const source = Buffer.from(await response.arrayBuffer());
    const optimized = await sharp(source, { animated: true })
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    files.push({ filename: requiredPath.split("/").pop(), optimized });
    console.log(`${sourceUrl} -> ${requiredPath} (${Math.round(optimized.length / 1024)} KB)`);
  }

  if (files.length === 0) {
    console.log("No migrated media paths need recovery.");
    return;
  }
  const staged = await stageGitHubMedia(files);
  await publishGitHubMedia(staged);
  console.log(`Recovered and published ${files.length} migrated images.`);
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
  if (mode === "recover") await recoverMigratedMedia();
  else if (mode === "direct") await migrateDirectly();
  else if (mode === "apply") await applyDatabase();
  else await download();
} finally {
  await pool.end();
}
