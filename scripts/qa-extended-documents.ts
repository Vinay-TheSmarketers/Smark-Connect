import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXTENDED_DOCUMENTS } from "../src/lib/skills/registry";
import { createVisualReport } from "../src/lib/documents/pdf";
import { resolveArtifactManifest } from "../src/lib/artifacts/config";

async function main() {
  const outputDirectory = path.join(process.cwd(), "tmp", "pdfs", "extended-document-qa");
  await mkdir(outputDirectory, { recursive: true });

  const results = [];

  for (const docDef of EXTENDED_DOCUMENTS) {
    const markdown = `
# ${docDef.title}

## Executive Summary
Situation: Comprehensive ${docDef.title.toLowerCase()} strategy formulated to accelerate brand growth, conversion efficiency, and competitive advantage.
Evidence: Synthesized across multi-agent research audits, search signals, customer journeys, and market benchmarks.
Implication: Execution of these structured frameworks unlocks scalable pipeline velocity and cross-channel leadership.
Direction: Prioritize P0 high-impact workstreams in Sprint 1, followed by systematic optimization sprints in Q2.

## Strategic Mandate
> "Transform analytical intelligence into systematic, high-velocity execution across every customer and search touchpoint."

## Core Execution Framework
| Phase | Workstream | Key Deliverable | Target Metric | Timeline |
|---|---|---|---|---|
| **Phase 1** | Foundation & Audit | Baseline Architecture & Schema | 100% Tracking Fidelity | Month 1 |
| **Phase 2** | Channel Activation | High-Intent Asset Production | +45% Organic Velocity | Months 2–3 |
| **Phase 3** | Conversion Scale | Experimentation & Funnel Lift | +28% Pipeline Conversion | Months 4–6 |

## Strategic Priority Action Plan
1. **Immediate P0 Action**: Deploy core tracking and asset templates.
2. **Growth Sprint**: Scale multi-channel distribution.
3. **Continuous Optimization**: Run weekly ICE-scored experimentation.
`;

    const result = await createVisualReport({
      companyName: "Enterprise Brand Alpha",
      companyWebsite: "https://example.com",
      companyCategory: "B2B SaaS / Growth",
      companyBrief: "Enterprise Brand Alpha is an innovative growth platform optimizing conversion, search, and marketing efficiency.",
      title: docDef.title,
      documentType: docDef.type,
      markdown,
      updatedAt: new Date("2026-08-30T00:00:00Z"),
      sourceCount: 24,
      skills: docDef.skills,
      manifest: resolveArtifactManifest({ reportType: docDef.type, markdown, metadata: {} }),
    });

    const filename = `${docDef.type.toLowerCase()}.pdf`;
    await writeFile(path.join(outputDirectory, filename), result.pdf);
    results.push({
      documentType: docDef.type,
      file: filename,
      pageCount: result.qa.final.pageCount,
      issues: result.qa.final.issues,
      visualizationCount: result.qa.final.visualizationCount,
      visualSectionShare: result.qa.final.visualSectionShare,
    });
  }

  console.log(JSON.stringify({ outputDirectory, receipts: results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
