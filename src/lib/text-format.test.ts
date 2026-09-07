import { describe, expect, it } from "vitest";
import { cleanRawJsonArtifacts, fixMarkdownTables, normalizeAcronyms, unwrapStructuredText } from "./text-format";

describe("structured agent text", () => {
  it("extracts contentMarkdown instead of exposing a JSON wrapper", () => {
    expect(unwrapStructuredText('{"contentMarkdown":"## Seo finding\\nUse ai for b2b content."}')).toBe("## SEO finding\nUse AI for B2B content.");
  });

  it("recovers prefixed structured output", () => {
    expect(unwrapStructuredText('Agent result: {"contentMarkdown":"Improve geo and icp alignment."}')).toBe("Improve GEO and ICP alignment.");
  });

  it("recovers useful content from a truncated JSON wrapper", () => {
    expect(unwrapStructuredText('{ "contentMarkdown": "# Reddit customer research\\nTarget b2b buyers')).toBe("# Reddit customer research\nTarget B2B buyers");
  });

  it("capitalizes required terminology without changing a URL", () => {
    expect(normalizeAcronyms("Seo via https://example.com/seo-guide improves ctr and roi")).toBe("SEO via https://example.com/seo-guide improves CTR and ROI");
  });

  it("repairs collapsed single-line markdown tables into clean GFM multi-line tables", () => {
    const collapsed = "in seo audit agent | Category | Weight | Score | Weighted | |----------|--------|-------|----------| | Technical SEO | 22% | 42 | 9.2 | | Total | 100% | | 49.3 | Adjusted for context.";
    const result = fixMarkdownTables(collapsed);
    expect(result).toContain("| Category | Weight | Score | Weighted |");
    expect(result).toContain("|----------|--------|-------|----------|");
    expect(result).toContain("| Technical SEO | 22% | 42 | 9.2 |");
    expect(result).toContain("| Total | 100% | | 49.3 |");
    expect(result).toMatch(/\| Category \| Weight \| Score \| Weighted \|\n\|----------\|--------\|-------\|----------\|\n\| Technical SEO \| 22% \| 42 \| 9.2 \|\n\| Total \| 100% \| \| 49.3 \|/);
    expect(result).toContain("Adjusted for context.");
  });

  it("strips raw JSON syntax and trailing properties from unescaped agent finding outputs", () => {
    const rawJsonWithLeak = 'Primary customer segment identified: Botanical extraction facility operators looking for high-yield systems.","tags":[],"competitiveAttributes":[],"companyName":"Buffalo Extraction Systems","officialWebsite":"https://www.buffaloextracts.com/","logoUrl":"","sourceRegister":[{"title":"Buffalo Extracts Homepage"}]';
    const cleaned = cleanRawJsonArtifacts(rawJsonWithLeak);
    expect(cleaned).toBe("Primary customer segment identified: Botanical extraction facility operators looking for high-yield systems.");
    expect(cleaned).not.toContain('tags":[]');
    expect(cleaned).not.toContain('companyName');
  });

  it("extracts evidence and description fields directly without falling back to raw JSON markers", () => {
    const jsonStr = '{"title":"Audience ICP Segment","evidence":"High-yield extraction equipment buyers in Africa.","tags":[],"companyName":"Buffalo Extraction Systems"}';
    const unwrapped = unwrapStructuredText(jsonStr);
    expect(unwrapped).toBe("High-yield extraction equipment buyers in Africa.");
    expect(unwrapped).not.toContain("companyName");
  });
});
