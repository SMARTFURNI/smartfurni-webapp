import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const shouldApply = process.argv.includes("--apply");
const confirmedProduction = process.argv.includes("--confirm-production");
const connectionString =
  process.env.DATABASE_PUBLIC_URL ||
  process.env.POSTGRESQL_URL ||
  process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình.");
if (shouldApply && !confirmedProduction) {
  throw new Error("Thiếu --confirm-production. Mặc định script chỉ kiểm tra, không ghi dữ liệu.");
}

function isListItem(line) {
  return /^\s*[-+*]\s+\S/.test(line);
}

function isHeading(line) {
  return /^#{2,3}\s+\S/.test(line);
}

function isStandaloneMarker(line) {
  return /^\[\[SMARTFURNI_(?:PRODUCTS|CTA)\]\]$/.test(line.trim());
}

function normalizeBlogMarkdown(content) {
  const prepared = content
    .replace(/\r\n?/g, "\n")
    .replace(/^#{4,}\s+/gm, "### ")
    .replace(/\*\s+\*\*([^*\n]{1,120}):\*\*/g, (match, label, offset, source) => {
      const prefix = source.slice(0, offset);
      const atLineStart = offset === 0 || prefix.endsWith("\n");
      return `${atLineStart ? "" : "\n"}- **${label.trim()}:**`;
    })
    .replace(/^[ \t]*[+*]\s+(?=\S)/gm, "- ");

  const sourceLines = prepared.split("\n").map((line) => line.trimEnd());
  const lines = [];
  const pushBlank = () => {
    if (lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");
  };

  for (const rawLine of sourceLines) {
    const line = rawLine.trimStart();
    if (!line) {
      pushBlank();
      continue;
    }
    const currentIsList = isListItem(line);
    const currentIsHeading = isHeading(line);
    const currentIsMarker = isStandaloneMarker(line);
    const previous = lines[lines.length - 1] || "";
    const previousIsList = isListItem(previous);
    const previousIsHeading = isHeading(previous);
    const previousIsMarker = isStandaloneMarker(previous);

    if (
      (currentIsList && previous && !previousIsList) ||
      (!currentIsList && previousIsList) ||
      ((currentIsHeading || currentIsMarker) && previous) ||
      ((previousIsHeading || previousIsMarker) && previous)
    ) {
      pushBlank();
    }
    lines.push(currentIsList ? line.replace(/^[+*]\s+/, "- ") : line);
  }

  return lines.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
  max: 2,
  connectionTimeoutMillis: 10000,
});

try {
  const result = await pool.query("SELECT id, data, updated_at FROM posts ORDER BY updated_at ASC");
  const changes = result.rows.flatMap((row) => {
    const content = typeof row.data?.content === "string" ? row.data.content : "";
    const normalized = normalizeBlogMarkdown(content);
    if (!content || normalized === content) return [];
    return [{
      id: row.id,
      title: row.data?.title || row.id,
      aiGenerated: row.data?.aiGenerated === true,
      before: content,
      after: normalized,
      updatedAt: row.updated_at,
    }];
  });

  console.log(`[blog-markdown] Đã kiểm tra ${result.rowCount} bài; cần sửa ${changes.length} bài.`);
  for (const change of changes) {
    const deepHeadings = (change.before.match(/^#{4,}\s+/gm) || []).length;
    const joinedBullets = (change.before.match(/\S\s+\*\s+\*\*[^*\n]{1,120}:\*\*/g) || []).length;
    console.log(`- ${change.id} | AI=${change.aiGenerated ? "yes" : "no"} | heading sâu=${deepHeadings} | mục dính=${joinedBullets}`);
  }

  if (!shouldApply || changes.length === 0) {
    console.log(shouldApply ? "[blog-markdown] Không có dữ liệu cần cập nhật." : "[blog-markdown] Dry-run; chưa ghi dữ liệu.");
    process.exitCode = 0;
  } else {
    const backupPath = join(tmpdir(), `smartfurni-blog-markdown-backup-${Date.now()}.json`);
    await writeFile(backupPath, JSON.stringify(changes, null, 2), "utf8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const change of changes) {
        await client.query(
          "UPDATE posts SET data = jsonb_set(data, '{content}', to_jsonb($2::text), true), updated_at = NOW() WHERE id = $1",
          [change.id, change.after],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    console.log(`[blog-markdown] Đã cập nhật ${changes.length} bài. Backup: ${backupPath}`);
  }
} finally {
  await pool.end();
}
