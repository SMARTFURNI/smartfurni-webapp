import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { getZaloMediaMaxBytes, getZaloNativeUploadFileName } from "./zalo-media-policy";

const execFileAsync = promisify(execFile);
const DEFAULT_VIDEO_TIMEOUT_MS = 180_000;

type ProbeOutput = {
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
  }>;
  format?: { duration?: string | number };
};

export type NormalizedZaloVideo = {
  buffer: Buffer;
  fileName: string;
  mimeType: "video/mp4";
  fileSize: number;
  width: number;
  height: number;
  duration: number;
  thumbnailBuffer: Buffer;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

function videoTimeoutMs(): number {
  const configured = Number.parseInt(process.env.ZALO_VIDEO_TRANSCODE_TIMEOUT_MS || "", 10);
  return Number.isFinite(configured) && configured >= 30_000
    ? configured
    : DEFAULT_VIDEO_TIMEOUT_MS;
}
async function runMediaCommand(binary: "ffmpeg" | "ffprobe", args: string[]): Promise<string> {
  try {
    const result = await execFileAsync(binary, args, {
      timeout: videoTimeoutMs(),
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    });
    return String(result.stdout || "");
  } catch (error) {
    const commandError = error as NodeJS.ErrnoException & { stderr?: string; killed?: boolean };
    if (commandError.code === "ENOENT") {
      throw new Error("Máy chủ chưa có FFmpeg để chuẩn hóa video gửi Zalo.");
    }
    if (commandError.killed) {
      throw new Error("Video mất quá nhiều thời gian xử lý. Vui lòng rút ngắn hoặc giảm dung lượng video.");
    }
    const detail = String(commandError.stderr || commandError.message || "").trim().slice(-500);
    throw new Error(`Không thể chuyển video sang định dạng Zalo hỗ trợ${detail ? `: ${detail}` : "."}`);
  }
}

function parseProbe(raw: string): { width: number; height: number; duration: number } {
  let probe: ProbeOutput;
  try {
    probe = JSON.parse(raw) as ProbeOutput;
  } catch {
    throw new Error("Không đọc được thông số video sau khi chuyển mã.");
  }
  const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
  const width = Math.round(Number(videoStream?.width || 0));
  const height = Math.round(Number(videoStream?.height || 0));
  const duration = Math.round(Number(probe.format?.duration || 0) * 1000);
  if (width <= 0 || height <= 0 || duration <= 0) {
    throw new Error("Video không có hình ảnh hoặc thời lượng hợp lệ.");
  }
  return { width, height, duration };
}

/**
 * Zalo mobile không phát ổn định video HEVC/H.265, WebM hoặc MP4 thiếu faststart.
 * Luôn chuyển mã ở server để URL CDN nhận được là MP4 H.264/AAC tương thích.
 */
export async function normalizeVideoForZalo(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<NormalizedZaloVideo> {
  const workDirectory = await mkdtemp(join(tmpdir(), "smartfurni-zalo-video-"));
  const inputPath = join(workDirectory, "source-video");
  const outputPath = join(workDirectory, "zalo-video.mp4");
  const thumbnailPath = join(workDirectory, "zalo-thumbnail.jpg");

  try {
    await writeFile(inputPath, input.buffer);
    await runMediaCommand("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-y",
      "-i", inputPath,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-vf", "scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
      "-r", "30",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-profile:v", "main",
      "-level:v", "4.0",
      "-pix_fmt", "yuv420p",
      "-tag:v", "avc1",
      "-c:a", "aac",
      "-profile:a", "aac_low",
      "-b:a", "128k",
      "-ac", "2",
      "-ar", "44100",
      "-movflags", "+faststart",
      "-max_muxing_queue_size", "1024",
      outputPath,
    ]);

    const probeRaw = await runMediaCommand("ffprobe", [
      "-v", "error",
      "-show_entries", "stream=codec_type,width,height:format=duration",
      "-of", "json",
      outputPath,
    ]);
    const metadata = parseProbe(probeRaw);

    await runMediaCommand("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-y",
      "-ss", "0.1",
      "-i", outputPath,
      "-frames:v", "1",
      "-vf", "scale=640:640:force_original_aspect_ratio=decrease:force_divisible_by=2",
      "-q:v", "3",
      thumbnailPath,
    ]);

    const [buffer, thumbnailBuffer] = await Promise.all([
      readFile(outputPath),
      readFile(thumbnailPath),
    ]);
    if (buffer.byteLength > getZaloMediaMaxBytes("video")) {
      throw new Error("Video sau khi chuẩn hóa vượt giới hạn dung lượng gửi Zalo. Vui lòng rút ngắn video.");
    }

    const sharp = (await import("sharp")).default;
    const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

    return {
      buffer,
      fileName: getZaloNativeUploadFileName(input.fileName, input.mimeType),
      mimeType: "video/mp4",
      fileSize: buffer.byteLength,
      ...metadata,
      thumbnailBuffer,
      thumbnailWidth: thumbnailMetadata.width || 640,
      thumbnailHeight: thumbnailMetadata.height || 360,
    };
  } finally {
    await rm(workDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}
