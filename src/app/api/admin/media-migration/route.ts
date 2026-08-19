import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getAdminPortalSession } from "@/lib/admin-auth";
import {
  headMediaObject,
  isRailwayBucketConfigured,
  normalizeMediaKey,
  storeMediaObject,
} from "@/lib/media-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type LegacyFile = {
  absolutePath: string;
  key: string;
  oldUrl: string;
  size: number;
};

const uploadsRoot = path.join(process.cwd(), "public", "uploads");

function contentType(filename: string): string {
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

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

async function legacyFiles(): Promise<LegacyFile[]> {
  const files = await walk(uploadsRoot);
  return Promise.all(files.map(async (absolutePath) => {
    const relativePath = path.relative(uploadsRoot, absolutePath).split(path.sep).join("/");
    return {
      absolutePath,
      oldUrl: `/uploads/${relativePath}`,
      key: normalizeMediaKey(`public/legacy/uploads/${relativePath}`),
      size: (await stat(absolutePath)).size,
    };
  }));
}

async function copyAndVerify(file: LegacyFile): Promise<number> {
  const body = await readFile(file.absolutePath);
  await storeMediaObject({
    body,
    key: file.key,
    contentType: contentType(file.absolutePath),
    visibility: "public",
    cacheControl: "public, max-age=31536000, immutable",
    originalName: path.basename(file.absolutePath),
    entityType: "legacy-upload",
    entityId: file.oldUrl,
  });
  const object = await headMediaObject(file.key);
  const uploadedSize = Number(object.ContentLength || 0);
  if (uploadedSize !== file.size) {
    throw new Error(`${file.oldUrl}: Bucket có ${uploadedSize} bytes, mong đợi ${file.size}`);
  }
  return uploadedSize;
}

export async function GET() {
  if (!(await getAdminPortalSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const files = await legacyFiles();
  return NextResponse.json({
    configured: isRailwayBucketConfigured(),
    totalFiles: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    urlPolicy: "preserve-legacy",
  });
}

export async function POST(request: NextRequest) {
  if (!(await getAdminPortalSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isRailwayBucketConfigured()) {
    return NextResponse.json({ error: "Railway Bucket chưa được cấu hình" }, { status: 503 });
  }
  const payload = await request.json().catch(() => ({})) as { action?: string };
  if (payload.action !== "copy-and-verify-legacy") {
    return NextResponse.json({ error: "Hành động migration không hợp lệ" }, { status: 400 });
  }

  const files = await legacyFiles();
  let uploadedFiles = 0;
  let uploadedBytes = 0;
  const failures: string[] = [];
  const batchSize = 4;

  for (let index = 0; index < files.length; index += batchSize) {
    const batch = files.slice(index, index + batchSize);
    const results = await Promise.allSettled(batch.map(copyAndVerify));
    results.forEach((result, resultIndex) => {
      if (result.status === "fulfilled") {
        uploadedFiles += 1;
        uploadedBytes += result.value;
      } else {
        failures.push(
          `${batch[resultIndex].oldUrl}: ${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          }`,
        );
      }
    });
  }

  return NextResponse.json({
    ok: failures.length === 0,
    uploadedFiles,
    uploadedBytes,
    totalFiles: files.length,
    preservedLegacyUrls: true,
    databaseChanged: false,
    githubFilesDeleted: false,
    failures: failures.slice(0, 20),
  }, { status: failures.length ? 500 : 200 });
}
