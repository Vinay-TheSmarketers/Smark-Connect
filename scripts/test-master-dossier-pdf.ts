import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CORE_DOCUMENTS } from "../src/lib/skills/registry";
import { createVisualReport } from "../src/lib/documents/pdf";
import { resolveArtifactManifest } from "../src/lib/artifacts/config";

async function main() {
  const outputDirectory = path.join(process.cwd(), "tmp", "pdfs", "master-dossier");
  await mkdir(outputDirectory, { recursive: true });

  console.log("Compiling comprehensive 19-page Strategic Intelligence Master Dossier...");

  // Generate 10 comprehensive, deep-dive modules
  const modules = CORE_DOCUMENTS.map((docDef, index) => {
    return {
      type: docDef.type,
      title: `${index + 1}.0 ${docDef.title}`,
      markdown: `
## Strategic Executive Thesis & Market Context
Situation: Deep evaluation of ${docDef.title.toLowerCase()} indicates key enterprise growth levers, market positioning dynamics, and conversion opportunities across digital channels.
Evidence: Multi-agent telemetry, 64 verified crawl data endpoints, and cross-channel benchmark datasets validate primary findings across search, positioning, and technical infrastructure.
Implication: Addressing foundational friction unlocks scalable organic search real estate, elevates brand equity, and accelerates pipeline velocity.
Direction: Execute prioritized Phase 1 sprints across technical remediation, content engine scaling, and multi-touch attribution.

## Strategic Market Directive
> "Enterprise acceleration is governed by clarity of market positioning and systematic elimination of friction across high-intent search and conversion touchpoints."

## Strategic Analysis & Evidence Matrix
| Focus Area | Current Baseline | Industry Benchmark | Gap Severity | Recommended Intervention | Target Impact |
|---|---|---|---|---|---|
| **Core Architecture** | Legacy structure with multi-step friction | 3-click instant flow | Medium | Modular micro-landing architecture | +35% Completion |
| **Search Entity Authority** | Partial LLM citation coverage | Top 3 in key prompts | High | Structured schema & Knowledge Graph nodes | >85% AI Citability |
| **Content Velocity** | Sporadic publishing rhythm | 8–12 monthly high-intent assets | Medium | Topic pillar cluster production | 2.4x Organic Reach |
| **Conversion Mechanics** | Generic CTAs & high form load | Progressive profiling | High | Dynamic intent-matching landing pages | +28% Pipeline CRO |
| **Multi-Touch Tracking** | Last-click only attribution | Algorithmic W-shaped attribution | Critical | CDP & server-side event schema | 100% Data Fidelity |

## Detailed Diagnostic Findings & Evidence
- **Finding 1: Channel Concentration Risk**: Over-dependence on traditional outbound and legacy referral channels leaves digital search whitespace vulnerable to agile challengers.
- **Finding 2: Search Intent Misalignment**: Informational blog queries fail to guide prospects toward commercial comparison hubs and high-intent product modules.
- **Finding 3: Friction in First-Touch Activation**: Cognitive load above the fold reduces initial engagement rate by 22% compared to category leaders.

## Phased Implementation Roadmap & 90-Day Milestones
1. **Sprint 1 (Weeks 1–4): Foundation & Quick Wins**: Deploy core tracking, resolve technical schema gaps, and launch comparison landing pages.
2. **Sprint 2 (Weeks 5–8): Multi-Channel Activation**: Scale pillar-cluster content engine, activate high-intent search campaigns, and deploy automated nurture flows.
3. **Sprint 3 (Weeks 9–12): Systematic Optimization**: Conduct weekly ICE-scored A/B testing and refine attribution models based on live pipeline conversion signals.

## Operating Governance & Risk Register
| Risk Factor | Probability | Impact | Mitigation Protocol | Owner |
|---|---|---|---|---|
| **Indexation Lag** | Low | Medium | Automated XML Sitemap ping and Google Search Console API sync | Technical SEO Lead |
| **Channel Cannibalization** | Medium | Low | Distinct UTM parameter tagging and dedicated landing paths | Demand Gen Lead |
| **Data Privacy (DPDP/GDPR)** | Low | High | Automated consent banner and cookie-less server-side CDP | Security & Compliance |
      `,
      competitors: docDef.type === "COMPETITOR_ANALYSIS" ? [
        { companyName: "Market Leader Inc", officialWebsite: "https://leader.com", positioning: "Established incumbent commanding high market share.", competitiveAttributes: ["High Market Share", "Enterprise Sales", "Broad Suite"] },
        { companyName: "Digital Challenger Corp", officialWebsite: "https://challenger.io", positioning: "Agile digital-native challenger with high NPS.", competitiveAttributes: ["Fast Onboarding", "Product-Led Growth", "Modern UX"] },
      ] : undefined,
    };
  });

  const fullMarkdown = modules.map((m) => `# ${m.title}\n\n${m.markdown}`).join("\n\n");

  const result = await createVisualReport({
    companyName: "Acme Global Enterprise",
    companyWebsite: "https://acmeglobal.com",
    companyCategory: "B2B Enterprise Software & Solutions",
    companyBrief: "Acme Global Enterprise is a multinational enterprise software leader serving over 1,200 Global 2000 organizations with cloud, analytics, and operational automation infrastructure.",
    title: "Master Strategic Intelligence & Growth Dossier",
    documentType: "STRATEGIC_INTELLIGENCE",
    markdown: fullMarkdown,
    modules,
    updatedAt: new Date("2026-08-30T00:00:00Z"),
    sourceCount: 64,
    skills: [
      { repository: "claude-seo", skill: "seo-technical", phase: "foundation", reason: "Technical search infrastructure" },
      { repository: "openclaw-marketing-skills", skill: "competitor-intelligence", phase: "landscape", reason: "Market positioning moats" },
      { repository: "social-media-skills", skill: "brand-trust-audit", phase: "reputation", reason: "Brand equity and customer sentiment" },
    ],
    manifest: resolveArtifactManifest({ reportType: "STRATEGIC_INTELLIGENCE", markdown: fullMarkdown, metadata: {} }),
  });

  const pdfPath = path.join(outputDirectory, "master-strategic-intelligence-dossier.pdf");
  const htmlPath = path.join(outputDirectory, "master-strategic-intelligence-dossier.html");

  await writeFile(pdfPath, result.pdf);
  await writeFile(htmlPath, result.html);

  console.log(`Generated Master Strategic Intelligence Dossier:\n- PDF: ${pdfPath} (${result.pdf.length} bytes)\n- HTML: ${htmlPath} (${result.html.length} bytes)`);
  console.log(`QA Result: Page Count: ${result.qa.final.pageCount}, Issues: ${result.qa.final.issues.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
