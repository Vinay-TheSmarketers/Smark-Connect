import { ALL_DOCUMENTS, AGENT_DEFINITIONS } from "../skills/registry";

// Internal provenance remains in metadata; it is never report content.
const identifiers = Array.from(new Set([
  "claude-main", "claude-seo-main", "claude-seo", "openclaw-marketing-skills-main",
  "openclaw-marketing-skills", "social-media-skills", "skills-main", "SKILL.md",
  ...[...ALL_DOCUMENTS, ...AGENT_DEFINITIONS].flatMap((item) => item.skills.flatMap((ref) => [
    `${ref.repository}/${ref.skill}`, ...(ref.skill.includes("-") ? [ref.skill] : []),
  ])),
])).sort((a, b) => b.length - a.length);
const internalName = new RegExp(`(?<![\\w-])(?:${identifiers.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w-])`, "gi");
const provenanceLabel = /^(?:(?:used|applied|embedded(?:\s+local)?|local|source)\s+skills?(?:\s+files?)?|skills?\s+(?:used|applied|provenance|sources?|guidance)|methodology\s*(?:\/|and|&)\s*skills?)(?:\s*[:—-]|\s*$)/i;

export function unwrapMarkdown(value: string): string {
  const text = value.trim();
  // Only unwrap a complete outer Markdown envelope. A report ending in a
  // diagram fence must keep that closing fence.
  const wrapper = text.match(/^(`{3,}|~{3,})(?:markdown|md)\s*\n([\s\S]*)\n\1\s*$/i);
  return wrapper ? wrapper[2].trim() : text;
}

export function documentMarkdown(value: string): string {
  let hiddenLevel = 0;
  const lines = unwrapMarkdown(value).split(/\r?\n/).filter((line) => {
    if (/^\s*(?:SKILL|EMBEDDED LOCAL SKILL FILES?)\s*:/i.test(line)) return false;
    if (/^\s*SOURCE\s*:\s*(?:[^\s]+\/)?(?:skills?|references?)\//i.test(line) || /\.codex|SKILL\.md/i.test(line)) return false;
    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*$/);
    const label = (heading?.[2] ?? line).replace(/[*_`]/g, "").replace(/^\s*[-+]\s+/, "").trim();
    if (heading && hiddenLevel && heading[1].length <= hiddenLevel) hiddenLevel = 0;
    if (hiddenLevel) return false;
    if (provenanceLabel.test(label)) {
      if (heading) hiddenLevel = heading[1].length;
      return false;
    }
    return true;
  });
  return lines.join("\n").replace(internalName, "analysis methodology").replace(/\n{3,}/g, "\n\n").trim();
}

export const DOCUMENT_OUTPUT_RULES = "Keep internal skill names, repository names, file paths, and skill provenance out of all report content. Cite external evidence, never the internal instruction files. Present frameworks under explicit headings (SWOT, PESTEL, TOWS, Funnel, Customer Journey, or 30/60/90-day Roadmap). For SWOT, PESTEL, and TOWS use a Markdown table with a first column identifying the category, followed by evidence, implications, and actions, or use category subheadings with bullets. For funnels, journeys, and roadmaps use a Markdown table whose first column is Stage, Phase, or Period and subsequent columns contain objectives, evidence, actions, and measures. The application converts these structures into framework visuals. Preserve source URLs and uncertainty. Never invent numerical values. Do not use ASCII art, Mermaid, raw SVG, or HTML for these frameworks.";
