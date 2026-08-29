import { describe, expect, it } from "vitest";
import { COMPANY_BRIEF_FALLBACK, createCompanyBrief } from "./company-brief";

describe("createCompanyBrief", () => {
  it("uses only supplied company facts and keeps the result concise", () => {
    const brief = createCompanyBrief({ name: "Acme", websiteUrl: "https://acme.example", category: "analytics", description: "Acme provides operational dashboards for finance teams." });
    expect(brief).toContain("Acme");
    expect(brief).toContain("analytics");
    expect(brief).toContain("acme.example");
    expect(brief.split(/(?<=[.!?])\s+/)).toHaveLength(4);
  });

  it("uses the neutral fallback when no company facts exist", () => {
    expect(createCompanyBrief({})).toBe(COMPANY_BRIEF_FALLBACK);
  });
});
