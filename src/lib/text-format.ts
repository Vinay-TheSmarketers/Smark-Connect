const ACRONYMS = ["SEO", "GEO", "ICP", "PESTEL", "SWOT", "ROI", "KPI", "CTR", "CTA", "AI", "API", "URL", "B2B"] as const;
const URL_PATTERN = /(https?:\/\/[^\s)\]>]+)/gi;

export function normalizeAcronyms(value: string): string {
  return value.split(URL_PATTERN).map((part) => /^https?:\/\//i.test(part) ? part : ACRONYMS.reduce((text, acronym) => text.replace(new RegExp(`\\b${acronym}\\b`, "gi"), acronym), part)).join("");
}

function contentFromValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["contentMarkdown", "recommendedResponse", "draftContent", "content", "text", "summary"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key] as string;
  }
  return null;
}

export function unwrapStructuredText(input: unknown): string {
  if (typeof input !== "string") return normalizeAcronyms(contentFromValue(input) ?? "");
  let value = input.trim().replace(/^```(?:json|markdown|md)?\s*/i, "").replace(/\s*```$/, "");
  for (let pass = 0; pass < 3; pass += 1) {
    const firstBrace = value.indexOf("{");
    const candidates = [value, firstBrace > 0 ? value.slice(firstBrace) : ""].filter(Boolean);
    let extracted: string | null = null;
    for (const candidate of candidates) {
      try { extracted = contentFromValue(JSON.parse(candidate)); } catch { /* Try the encoded-field fallback. */ }
      if (extracted) break;
    }
    if (!extracted) {
      const encoded = value.match(/"contentMarkdown"\s*:\s*("(?:\\.|[^"\\])*")/)?.[1];
      if (encoded) {
        try { extracted = JSON.parse(encoded) as string; } catch { /* Keep the original text. */ }
      }
    }
    if (!extracted) {
      const marker = value.match(/"(?:contentMarkdown|recommendedResponse|draftContent|content|text)"\s*:\s*"?/i);
      if (marker?.index !== undefined) {
        extracted = value.slice(marker.index + marker[0].length).replace(/"\s*}\s*$/, "").replace(/\\"/g, "\"").replace(/\\r?\\n/g, "\n").trim();
      }
    }
    if (!extracted || extracted === value) break;
    value = extracted.trim().replace(/^```(?:json|markdown|md)?\s*/i, "").replace(/\s*```$/, "");
  }
  return normalizeAcronyms(value.replace(/\\n/g, "\n").replace(/\\t/g, "\t").trim());
}
