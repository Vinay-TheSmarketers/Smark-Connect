import { AgentType, DocumentType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { buildResearchQueries } from "../research/live-discovery";
import { AGENT_DEFINITIONS, ALL_DOCUMENTS, INTERNAL_OPERATIONS } from "./registry";

vi.mock("server-only", () => ({}));

describe("skill operation registry", () => {
  it("maps every document, agent, and internal operation to ordered real skill steps", () => {
    expect(ALL_DOCUMENTS.map((item) => item.type).sort()).toEqual(Object.values(DocumentType).sort());
    expect(AGENT_DEFINITIONS.map((item) => item.type).sort()).toEqual(Object.values(AgentType).sort());
    const operations = [...ALL_DOCUMENTS, ...AGENT_DEFINITIONS, ...Object.values(INTERNAL_OPERATIONS)];
    for (const operation of operations) {
      expect(operation.skills.length).toBeGreaterThan(0);
      for (const step of operation.skills) {
        expect(["claude-seo", "openclaw-marketing-skills", "social-media-skills"]).toContain(step.repository);
        expect(step.phase.length).toBeGreaterThan(0);
        expect(step.reason.length).toBeGreaterThan(10);
      }
    }
  });

  it("uses the main SEO audit first and a reporting skill last for competitor analysis", () => {
    const seo = ALL_DOCUMENTS.find((item) => item.type === "SEO_AUDIT")!;
    const competitor = ALL_DOCUMENTS.find((item) => item.type === "COMPETITOR_ANALYSIS")!;
    expect(seo.skills[0]).toMatchObject({ repository: "claude-seo", skill: "seo-audit", phase: "foundation" });
    expect(competitor.skills.at(-1)).toMatchObject({ repository: "social-media-skills", skill: "analytics-and-reporting", phase: "reporting" });
  });
});

describe("Reddit target-customer discovery", () => {
  it("builds multiple pain, recommendation, and alternative queries from website topics", () => {
    const queries = buildResearchQueries("REDDIT", "Acme", "acme.example", ["revenue operations", "account based marketing"]);
    expect(queries).toHaveLength(6);
    expect(queries.join(" ")).toContain("help recommend");
    expect(queries.join(" ")).toContain("problem struggling");
    expect(queries.join(" ")).toContain("alternative looking for");
    expect(queries.every((query) => query.includes("revenue operations") || query.includes("account based marketing"))).toBe(true);
  });
});
