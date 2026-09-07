import { describe, expect, it } from "vitest";
import { resolveArtifactManifest } from "./config";
import { buildReportDataModel } from "./model";

describe("report data model", () => {
  it("assigns stable source, finding, and recommendation identifiers", () => {
    const markdown = "# SEO Audit\n\n## Executive summary\n\nTechnical health is 72%. Source: https://example.com/a\n\n## Recommendations\n\n- High priority: repair canonical tags.\n- Assign an owner and validation date.";
    const manifest = resolveArtifactManifest({ reportType: "SEO_AUDIT", markdown });
    const model = buildReportDataModel({ reportType: "SEO_AUDIT", companyName: "Acme", title: "SEO Audit", markdown, updatedAt: new Date("2026-08-29T00:00:00Z"), sourceCount: 1, manifest });
    expect(model.sources[0].id).toBe("SRC-001");
    expect(model.findings[0].id).toMatch(/^SEO-F\d{3}$/);
    expect(model.recommendations.map((item) => item.id)).toEqual(["SEO-001", "SEO-002"]);
    expect(model.lineage[0].artifactReferences.xlsx).toContain("SEO-001");
  });
});

