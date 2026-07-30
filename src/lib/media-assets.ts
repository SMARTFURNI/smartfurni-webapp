import "server-only";

import sharp from "sharp";
import {
  deleteImageFromGitHub,
  storeImageOnGitHub,
  storeImagesOnGitHubBatch,
  type BatchImageInput,
} from "@/lib/github-media";
import {
  deleteMediaObject,
  isRailwayBucketConfigured,
  mediaKeyFromUrl,
  sanitizeMediaSegment,
  storeMediaObject,
  type MediaVisibility,
} from "@/lib/media-storage";

export type MediaFolder =
  | "content"
  | "products"
  | "blog"
  | "landing-pages"
  | "catalogues"
  | "site-theme"
  | "contracts"
  | "quotes"
  | "crm-attachments"
  | "social-scheduler";

export interface StoreImageAssetOptions {
  buffer: Buffer;
  originalName: string;
  folder: MediaFolder;
  subfolder?: string;
  maxWidth?: number;
  quality?: number;
  visibility?: MediaVisibility;
  entityType?: string;
  entityId?: string;
  createdBy?: string;
}

export interface StoredImageAsset {
  url: string;
  storageId: string;
  repositoryPath: string;
  filename: string;
  size: number;
  provider: "railway" | "github";
}

function uniqueFilename(originalName: string): string {
  const basename = originalName.replace(/\.[^.]+$/, "");
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${sanitizeMediaSegment(basename, "image")}-${stamp}-${crypto.randomUUID().slice(0, 8)}.webp`;
}

function visibilityForFolder(folder: MediaFolder): MediaVisibility {
  return ["contracts", "quotes", "crm-attachments", "social-scheduler"].includes(folder)
    ? "private"
    : "public";
}

function railwayFolder(folder: MediaFolder, visibility: MediaVisibility): string {
  const root = visibility === "public" ? "public" : visibility === "temporary" ? "temporary" : "private";
  return `${root}/${sanitizeMediaSegment(folder)}`;
}

export async function storeImageAsset(options: StoreImageAssetOptions): Promise<StoredImageAsset> {
  if (!isRailwayBucketConfigured()) {
    const requestedVisibility = options.visibility || visibilityForFolder(options.folder);
    if (requestedVisibility !== "public") {
      throw new Error("Railway Bucket phải được cấu hình trước khi lưu tệp riêng tư");
    }
    const githubFolder = (
      ["content", "products", "blog", "landing-pages"].includes(options.folder)
        ? options.folder
        : "content"
    ) as "content" | "products" | "blog" | "landing-pages";
    const stored = await storeImageOnGitHub({
      buffer: options.buffer,
      originalName: options.originalName,
      folder: githubFolder,
      subfolder: options.folder === githubFolder
        ? options.subfolder
        : [options.folder, options.subfolder].filter(Boolean).join("-"),
      maxWidth: options.maxWidth,
      quality: options.quality,
    });
    return {
      ...stored,
      storageId: stored.repositoryPath,
      provider: "github",
    };
  }

  const optimized = await sharp(options.buffer, { animated: true })
    .rotate()
    .resize({
      width: Math.min(Math.max(options.maxWidth || 1600, 480), 2400),
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: Math.min(Math.max(options.quality || 82, 65), 90), effort: 5 })
    .toBuffer();
  const filename = uniqueFilename(options.originalName);
  const visibility = options.visibility || visibilityForFolder(options.folder);
  const subfolder = options.subfolder ? `/${sanitizeMediaSegment(options.subfolder, "general")}` : "";
  const key = `${railwayFolder(options.folder, visibility)}${subfolder}/${filename}`;
  const stored = await storeMediaObject({
    body: optimized,
    key,
    contentType: "image/webp",
    visibility,
    originalName: options.originalName,
    entityType: options.entityType,
    entityId: options.entityId,
    createdBy: options.createdBy,
  });
  return {
    url: stored.url,
    storageId: stored.key,
    repositoryPath: stored.key,
    filename,
    size: stored.size,
    provider: "railway",
  };
}

export async function storeImageAssetsBatch(inputs: BatchImageInput[]): Promise<StoredImageAsset[]> {
  if (!isRailwayBucketConfigured()) {
    const stored = await storeImagesOnGitHubBatch(inputs);
    return stored.map((item) => ({
      ...item,
      storageId: item.repositoryPath,
      provider: "github" as const,
    }));
  }
  return Promise.all(inputs.map(async (input) => {
    const optimized = await sharp(input.buffer, { animated: false })
      .rotate()
      .resize(input.width, input.height, { fit: "cover", position: "attention" })
      .webp({ quality: input.quality ?? 84, effort: 5 })
      .toBuffer();
    const filename = uniqueFilename(input.originalName);
    const subfolder = input.subfolder ? `/${sanitizeMediaSegment(input.subfolder, "general")}` : "";
    const key = `public/${sanitizeMediaSegment(input.folder)}${subfolder}/${filename}`;
    const stored = await storeMediaObject({
      body: optimized,
      key,
      contentType: "image/webp",
      visibility: "public",
      originalName: input.originalName,
      entityType: "blog-post",
      entityId: input.subfolder,
    });
    return {
      url: stored.url,
      storageId: stored.key,
      repositoryPath: stored.key,
      filename,
      size: stored.size,
      provider: "railway" as const,
    };
  }));
}

export async function deleteImageAsset(imageUrl: string): Promise<boolean> {
  const railwayKey = mediaKeyFromUrl(imageUrl);
  if (railwayKey && isRailwayBucketConfigured()) {
    await deleteMediaObject(railwayKey);
    return true;
  }
  if (imageUrl.startsWith("/uploads/")) {
    return deleteImageFromGitHub(imageUrl);
  }
  return false;
}
