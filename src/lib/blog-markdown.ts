const LABELED_BULLET = /\*\s+\*\*([^*\n]{1,120}):\*\*/g;

function isListItem(line: string): boolean {
  return /^\s*[-+*]\s+\S/.test(line);
}

function isHeading(line: string): boolean {
  return /^#{2,3}\s+\S/.test(line);
}

function isStandaloneMarker(line: string): boolean {
  return /^\[\[SMARTFURNI_(?:PRODUCTS|CTA)\]\]$/.test(line.trim());
}

/**
 * Repair the small set of Markdown defects commonly returned by content LLMs
 * without rewriting editorial wording.
 *
 * The public article renderer intentionally supports H2/H3 and dash lists.
 * Normalizing at the AI boundary keeps generated drafts predictable, while
 * using the same function at render time makes older stored posts readable
 * until their database rows are migrated.
 */
export function normalizeBlogMarkdown(content: string): string {
  const prepared = content
    .replace(/\r\n?/g, "\n")
    // The article title is H1; deeper AI headings are rendered as H3.
    .replace(/^#{4,}\s+/gm, "### ")
    // Gemini sometimes emits multiple "* **Label:**" bullets on one line.
    .replace(LABELED_BULLET, (_match, label: string, offset: number, source: string) => {
      const prefix = source.slice(0, offset);
      const atLineStart = offset === 0 || prefix.endsWith("\n");
      return `${atLineStart ? "" : "\n"}- **${label.trim()}:**`;
    })
    // Standardize remaining line-leading asterisk/plus bullets.
    .replace(/^[ \t]*[+*]\s+(?=\S)/gm, "- ");

  const sourceLines = prepared.split("\n").map((line) => line.trimEnd());
  const lines: string[] = [];

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

  return lines
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
