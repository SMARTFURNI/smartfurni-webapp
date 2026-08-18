const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

export interface RecordingFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
  sourceUrl: URL;
}

function recordingNetworkError(error: unknown) {
  const root = error && typeof error === "object" && "cause" in error
    ? (error as { cause?: unknown }).cause
    : undefined;
  const code = root && typeof root === "object" && "code" in root
    ? String((root as { code?: unknown }).code || "")
    : "";
  if (code === "UND_ERR_CONNECT_TIMEOUT" || code === "ETIMEDOUT") {
    return "Máy chủ ghi âm ITY không phản hồi từ Railway. Hãy tải file bằng nút Nghe lại rồi chọn file để AI phân tích.";
  }
  return "Không thể kết nối máy chủ ghi âm ITY. Hãy tải file bằng nút Nghe lại rồi chọn file để AI phân tích.";
}

export function validateCrmRecordingUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const extraHosts = (process.env.CALL_AI_RECORDING_HOSTS || "")
    .split(",")
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
  const allowed = host === "ity.vn" || host.endsWith(".ity.vn") || extraHosts.includes(host);
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !allowed) {
    throw new Error("Nguồn bản ghi âm không nằm trong danh sách an toàn");
  }
  return url;
}

function recordingRequestHeaders(url: URL) {
  return {
    Accept: "audio/*,video/mp4,application/octet-stream,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: `${url.protocol}//${url.host}/`,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36 SmartFurniCRM/1.0",
  };
}

function sniffAudio(buffer: Buffer, declaredType: string | null) {
  const head = buffer.subarray(0, 16);
  const ascii = head.toString("ascii");
  const declared = (declaredType || "").split(";")[0].trim().toLowerCase();

  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE") {
    return { contentType: "audio/wav", extension: "wav" };
  }
  if (ascii.startsWith("ID3") || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)) {
    return { contentType: "audio/mpeg", extension: "mp3" };
  }
  if (ascii.startsWith("OggS")) return { contentType: "audio/ogg", extension: "ogg" };
  if (ascii.includes("ftyp")) return { contentType: declared.startsWith("video/") ? declared : "audio/mp4", extension: "m4a" };
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    return { contentType: "audio/webm", extension: "webm" };
  }

  if (declared.startsWith("audio/")) {
    const extension = declared.includes("wav") ? "wav"
      : declared.includes("ogg") ? "ogg"
        : declared.includes("webm") ? "webm"
          : declared.includes("mp4") || declared.includes("m4a") ? "m4a"
            : "mp3";
    return { contentType: declared, extension };
  }
  if (declared === "video/mp4") return { contentType: declared, extension: "mp4" };
  return null;
}

function filenameFromHeaders(url: URL, disposition: string | null, extension: string) {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const regular = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
  const raw = encoded ? decodeURIComponent(encoded) : regular || url.pathname.split("/").pop();
  const safe = (raw || `call-recording.${extension}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.includes(".") ? safe : `${safe}.${extension}`;
}

export async function downloadCrmRecording(value: string, maxBytes = DEFAULT_MAX_BYTES): Promise<RecordingFile> {
  const url = validateCrmRecordingUrl(value);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: recordingRequestHeaders(url),
      signal: AbortSignal.timeout(60_000),
      redirect: "follow",
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(recordingNetworkError(error));
  }
  if (!response.ok) throw new Error(`Không tải được bản ghi âm (${response.status})`);
  const finalUrl = validateCrmRecordingUrl(response.url || url.toString());
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > maxBytes) throw new Error(`Bản ghi âm vượt quá giới hạn ${Math.round(maxBytes / 1024 / 1024)} MB`);

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Bản ghi âm rỗng");
  if (buffer.length > maxBytes) throw new Error(`Bản ghi âm vượt quá giới hạn ${Math.round(maxBytes / 1024 / 1024)} MB`);

  const format = sniffAudio(buffer, response.headers.get("content-type"));
  if (!format) {
    const preview = buffer.subarray(0, 80).toString("utf8").replace(/\s+/g, " ");
    if (/<!doctype|<html|<form/i.test(preview)) {
      throw new Error("Tổng đài trả về trang đăng nhập thay vì file ghi âm");
    }
    throw new Error(`Tổng đài trả về định dạng không hỗ trợ (${response.headers.get("content-type") || "không rõ"})`);
  }

  return {
    buffer,
    contentType: format.contentType,
    filename: filenameFromHeaders(finalUrl, response.headers.get("content-disposition"), format.extension),
    sourceUrl: finalUrl,
  };
}
