import sharp from "sharp";

const DEFAULT_OWNER = "SMARTFURNI";
const DEFAULT_REPO = "smartfurni-webapp";
const DEFAULT_BRANCH = "main";

type MediaFolder = "content" | "products" | "blog" | "landing-pages";

interface StoreImageOptions {
  buffer: Buffer;
  originalName: string;
  folder: MediaFolder;
  subfolder?: string;
  maxWidth?: number;
  quality?: number;
}

interface StoredImage {
  url: string;
  repositoryPath: string;
  filename: string;
  size: number;
}

function githubConfig() {
  const token = process.env.GITHUB_MEDIA_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_MEDIA_TOKEN chưa được cấu hình trên Railway");

  return {
    token,
    owner: process.env.GITHUB_MEDIA_OWNER?.trim() || DEFAULT_OWNER,
    repo: process.env.GITHUB_MEDIA_REPO?.trim() || DEFAULT_REPO,
    branch: process.env.GITHUB_MEDIA_BRANCH?.trim() || DEFAULT_BRANCH,
  };
}

function safeSegment(value: string, fallback: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

function uniqueFilename(originalName: string): string {
  const basename = originalName.replace(/\.[^.]+$/, "");
  const name = safeSegment(basename, "image");
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${name}-${stamp}-${crypto.randomUUID().slice(0, 8)}.webp`;
}

async function optimizeImage(buffer: Buffer, maxWidth = 1600, quality = 82): Promise<Buffer> {
  return sharp(buffer, { animated: true })
    .rotate()
    .resize({
      width: Math.min(Math.max(maxWidth, 480), 2400),
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: Math.min(Math.max(quality, 65), 90), effort: 5 })
    .toBuffer();
}

async function githubRequest(path: string, init: RequestInit = {}) {
  const { token } = githubConfig();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub media request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response;
}

export async function storeImageOnGitHub(options: StoreImageOptions): Promise<StoredImage> {
  const config = githubConfig();
  const optimized = await optimizeImage(options.buffer, options.maxWidth, options.quality);
  const filename = uniqueFilename(options.originalName);
  const subfolder = options.subfolder ? `/${safeSegment(options.subfolder, "general")}` : "";
  const relativePath = `uploads/${options.folder}${subfolder}/${filename}`;
  const repositoryPath = `public/${relativePath}`;
  const encodedPath = repositoryPath.split("/").map(encodeURIComponent).join("/");

  await githubRequest(
    `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: `media: upload ${filename}`,
        content: optimized.toString("base64"),
        branch: config.branch,
      }),
    },
  );

  return { url: `/${relativePath}`, repositoryPath, filename, size: optimized.length };
}

export async function deleteImageFromGitHub(imageUrl: string): Promise<boolean> {
  if (!imageUrl.startsWith("/uploads/")) return false;

  const config = githubConfig();
  const repositoryPath = `public${imageUrl}`;
  const encodedPath = repositoryPath.split("/").map(encodeURIComponent).join("/");
  const basePath = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;
  const metadataResponse = await githubRequest(`${basePath}?ref=${encodeURIComponent(config.branch)}`);
  const metadata = (await metadataResponse.json()) as { sha?: string };
  if (!metadata.sha) return false;

  await githubRequest(basePath, {
    method: "DELETE",
    body: JSON.stringify({
      message: `media: delete ${repositoryPath.split("/").pop()}`,
      sha: metadata.sha,
      branch: config.branch,
    }),
  });
  return true;
}
