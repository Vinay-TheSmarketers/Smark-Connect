import { describe, expect, it } from "vitest";
import { normalizeAcronyms, unwrapStructuredText } from "./text-format";

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
});
