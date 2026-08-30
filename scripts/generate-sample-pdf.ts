import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createVisualReport } from "../src/lib/documents/pdf";
import { resolveArtifactManifest } from "../src/lib/artifacts/config";

async function run() {
  const outputDir = path.join(process.cwd(), "output", "pdf");
  await mkdir(outputDir, { recursive: true });

  const sampleMarkdown = `
# Strategic Intelligence Report

## Executive Summary

Situation: Smark Connect operates in a high-velocity B2B market with expanding search & AI discovery demand, but fragmented competitor offerings.
Evidence: Crawl analysis of 48 public domains confirms rising enterprise demand for skill-governed autonomous agents and automated SEO/GEO audit workflows.
Implication: Early mover advantage exists in packaging multi-channel intelligence with deterministic execution receipts.
Direction: Consolidate core diagnostic agents, prioritize high-retention CRO audit loops, and launch comparison landing architectures.

## Strategic Decision Directive

> "The clearest growth vector lies in embedding verified agent skills into executive client deliverables, replacing unstructured LLM chats with deterministic, audit-grade artifacts."

## SWOT Analysis

### Strengths
- Proprietary multi-agent orchestration engine with local skill graph integration.
- Automated crawl-to-report pipeline generating verifiable execution receipts.
- Deep B2B marketing domain specialization across SEO, GEO, X, and LinkedIn channels.

### Weaknesses
- Dependency on external search APIs for real-time rank tracking.
- Brand awareness currently concentrated in boutique B2B agency sectors.

### Opportunities
- Rapid enterprise shift towards Generative Engine Optimization (GEO) and Perplexity citability.
- Programmatic comparison and alternative landing page architectures.

### Threats
- Large legacy SEO suites launching generic AI chat sidebars.
- Search engine algorithm volatility affecting unverified content networks.

## PESTEL Macro Drivers

### Political & Regulatory
- Emerging global AI transparency directives requiring verifiable provenance and source citations.

### Economic Factors
- Marketing leadership demanding provable ROI and CAC efficiency before expanding software budgets.

### Social & Buyer Behavior
- B2B buyers increasingly consulting answer engines (ChatGPT, Perplexity, Claude) before visiting vendor websites.

### Technological Advancements
- Multi-agent autonomous workflows replacing manual content production and single-prompt scripts.

### Environmental Considerations
- Efficient token architectures reducing compute waste through focused document diff editing.

### Legal & Compliance
- Strict copyright and data privacy requirements mandating zero fabrication of private competitor metrics.

## Strategic Prioritization Matrix

| Initiative | Strategic Impact | Execution Effort | Time Horizon | Decision Gate |
|---|---|---|---|---|
| GEO & Citability Engine | High | Medium | 30 Days | >= 80% Entity Citability Score |
| P0 Preemption Queue | High | Low | Immediate | Active Dashboard Telemetry |
| Competitor Matrix Atlas | Medium | Low | 14 Days | 6 Verified Public Competitors |
| Programmatic SEO Blueprint | High | High | 60 Days | >= 40% Template Uniqueness Gate |

## Recommendations & Next Actions

1. Deploy the Master Orchestration Engine to automate pre-dashboard competitor mapping.
2. Activate continuous opportunity hunter feeds across Reddit, X, and Instagram.
3. Deliver high-resolution A4 Smarketers Executive PDF reports for all senior client deliverables.
`;

  const competitors = [
    {
      companyName: "Semrush",
      officialWebsite: "https://semrush.com",
      positioning: "Legacy all-in-one digital marketing suite with extensive search database.",
      competitiveAttributes: ["Keyword Database", "Backlink Index", "Rank Tracking"],
    },
    {
      companyName: "Ahrefs",
      officialWebsite: "https://ahrefs.com",
      positioning: "Search optimization toolkit focused on crawl depth and link analysis.",
      competitiveAttributes: ["Site Explorer", "Content Gaps", "Keyword Difficulty"],
    },
    {
      companyName: "Surfer SEO",
      officialWebsite: "https://surferseo.com",
      positioning: "Content intelligence platform with real-time on-page scoring.",
      competitiveAttributes: ["Content Editor", "SERP Analyzer", "NLP Keywords"],
    },
    {
      companyName: "Clearscope",
      officialWebsite: "https://clearscope.io",
      positioning: "Enterprise content optimization platform built around search intent.",
      competitiveAttributes: ["Content Inventory", "Term Relevance", "Google Docs Add-on"],
    },
  ];

  console.log("Generating sample Smarketers A4 PDF report...");

  const result = await createVisualReport({
    companyName: "Acme Cloud Technologies",
    companyWebsite: "https://acmecloud.io",
    companyCategory: "Enterprise B2B SaaS",
    companyBrief: "Acme Cloud Technologies is a next-generation enterprise infrastructure platform delivering intelligent cloud observability and automated cost governance.",
    title: "Strategic Intelligence & Competitor Landscape Report",
    documentType: "MARKETING_STRATEGY",
    markdown: sampleMarkdown,
    updatedAt: new Date(),
    sourceCount: 24,
    skills: [
      { repository: "social-media-skills", skill: "brand-profile", phase: "foundation", reason: "Define visual and verbal brand consistency." },
      { repository: "openclaw-marketing-skills", skill: "product-marketing-context", phase: "research", reason: "Extract commercial message and positioning." },
      { repository: "claude-seo", skill: "seo-geo", phase: "analysis", reason: "Map AI-search readiness and entity clarity." },
    ],
    manifest: resolveArtifactManifest({ reportType: "MARKETING_STRATEGY", markdown: sampleMarkdown, metadata: {} }),
  });

  const pdfPath = path.join(outputDir, "smark-connect-sample-executive-report.pdf");
  const htmlPath = path.join(outputDir, "smark-connect-sample-executive-report.html");

  await writeFile(pdfPath, result.pdf);
  await writeFile(htmlPath, result.html);

  console.log(`Successfully generated:\n- PDF: ${pdfPath} (${result.pdf.length} bytes)\n- HTML: ${htmlPath} (${result.html.length} bytes)`);
  console.log(`QA Result: Page Count: ${result.qa.final.pageCount}, Issues: ${result.qa.final.issues.length}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
