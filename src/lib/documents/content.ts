export type DocumentBlock = { type: "h1" | "h2" | "h3" | "paragraph" | "bullet" | "number" | "quote"; text: string } | { type: "table"; rows: string[][] };

export function cleanInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .trim();
}

export function parseMarkdown(markdown: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: cleanInlineMarkdown(paragraph.join(" ")) });
    paragraph = [];
  };
  const lines = markdown.replace(/\r/g, "").split("\n");
  const tableRow = (value: string) => value.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cleanInlineMarkdown(cell.replace(/\\\|/g, "|")));
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) { flush(); continue; }
    if (line.includes("|") && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? "")) {
      flush();
      const rows = [tableRow(line)];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) { rows.push(tableRow(lines[index])); index += 1; }
      index -= 1;
      blocks.push({ type: "table", rows });
      continue;
    }
    if (/^###\s+/.test(line)) { flush(); blocks.push({ type: "h3", text: cleanInlineMarkdown(line.replace(/^###\s+/, "")) }); continue; }
    if (/^##\s+/.test(line)) { flush(); blocks.push({ type: "h2", text: cleanInlineMarkdown(line.replace(/^##\s+/, "")) }); continue; }
    if (/^#\s+/.test(line)) { flush(); blocks.push({ type: "h1", text: cleanInlineMarkdown(line.replace(/^#\s+/, "")) }); continue; }
    if (/^[-*+]\s+/.test(line)) { flush(); blocks.push({ type: "bullet", text: cleanInlineMarkdown(line.replace(/^[-*+]\s+/, "")) }); continue; }
    if (/^\d+[.)]\s+/.test(line)) { flush(); blocks.push({ type: "number", text: cleanInlineMarkdown(line.replace(/^\d+[.)]\s+/, "")) }); continue; }
    if (/^>\s?/.test(line)) { flush(); blocks.push({ type: "quote", text: cleanInlineMarkdown(line.replace(/^>\s?/, "")) }); continue; }
    paragraph.push(line);
  }
  flush();
  return blocks.filter((block) => block.type === "table" ? block.rows.length > 0 : Boolean(block.text));
}

export function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "smark-connect-report";
}
