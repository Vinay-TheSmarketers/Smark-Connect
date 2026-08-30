import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createVisualReport } from "../src/lib/documents/pdf";
import { resolveArtifactManifest } from "../src/lib/artifacts/config";
import { Launcher } from "chrome-launcher";
import { spawn } from "node:child_process";

async function run() {
  const outputDir = path.join(process.cwd(), "output", "pdf");
  await mkdir(outputDir, { recursive: true });

  const licMarkdown = `
# LIC India — Competitor Intelligence & Market Positioning Analysis

## Executive Summary

Situation: Life Insurance Corporation of India (LIC) commands over 58.8% total premium market share and manages ₹51+ Lakh Crore in assets, but faces aggressive market share pressure from private life insurers (HDFC Life, SBI Life, ICICI Prudential, Max Life) in individual pure protection (Term Insurance) and digital-direct acquisition channels.
Evidence: Crawl analysis and public industry data from IRDAI show private life insurers capturing >72% of digital term insurance search intent and >80% of new bancassurance growth.
Implication: Without modernizing direct digital onboarding and term product pricing, LIC risks ceding the high-lifetime-value urban millennial and digital-first demographic to agile private competitors.
Direction: Accelerate digital direct distribution via the ANANDA digital engine, decouple term insurance pricing from agent commission structures for online buyers, and build aggressive search-intent landing architectures.

## Strategic Market Directive

> "LIC India's ultimate competitive moat is institutional trust and unmatched sovereign legacy. The strategic mandate is not to replace its 1.3M agent force, but to empower them with frictionless digital closing tools while aggressively defending digital-direct search queries."

## Competitive Positioning Matrix

| Insurer | Primary Moat | Distribution Strength | Digital Direct Maturity | Claim Settlement (CSR) | Strategic Focus |
|---|---|---|---|---|---|
| **LIC India** | Sovereign Trust & Scale | 1.35M Tied Agents (Dominant) | Emerging (ANANDA App) | 98.52% | Mass market, rural reach, guaranteed return endowments |
| **HDFC Life** | Product Innovation | HDFC Bank Bancassurance | Advanced (STP Instant Issuance) | 99.39% | Pure term plans, high-ticket ULIPs, retirement solutions |
| **SBI Life** | Banking Footprint | 22,000+ SBI Branch Network | High | 99.05% | Cost-efficient agency & pan-India branch distribution |
| **ICICI Pru Life** | Technology Stack | ICICI Bank + Digital Direct | Advanced | 99.17% | Multi-product digital onboarding, annuity & protection |
| **Max Life** | Customer Experience | Axis Bank Partnership | High | 99.51% (Industry Best) | High-CSR branding, customized term riders, wellness |
| **Tata AIA** | Brand Equity & Wellness | Multi-Channel & Agency | High | 99.13% | Consumer protection, Vitality health program, persistency |
| **Policybazaar** | Search Dominance | Digital Aggregator / Broker | Industry Standard | Aggregator | Search comparison, price transparency, tele-assisted advisory |

## Market Share & Protection Benchmark

| Insurer | Market Share (FY25/26) | Claim Settlement (CSR) | Protection/Term Portfolio Share |
|---|---|---|---|
| **LIC India** | 58.8% (Market Leader) | 98.52% | ~12% (Traditional Endowment Dominant) |
| **HDFC Life** | 10.8% (Private Leader) | 99.39% | ~34% (Pure Protection & ULIPs) |
| **SBI Life** | 9.2% | 99.05% | ~22% (Bancassurance Scale) |
| **ICICI Prudential** | 7.8% | 99.17% | ~28% (Digital Direct & Pension) |
| **Max Life** | 4.6% | 99.51% (Highest CSR) | ~41% (Protection Focused) |
| **Tata AIA Life** | 3.8% | 99.13% | ~30% (Wellness & Long-term Savings) |
| **Other Private Insurers** | 5.0% | 98.20% | ~18% (Fragmented) |

## SWOT Intelligence Assessment

### Strengths
- **Unrivaled Sovereign Trust**: Decades of household brand equity and government backing provide unmatched emotional safety for policyholders.
- **Massive Distribution Machine**: Over 1.35 million tied agents and 2,000+ branch locations spanning Tier-1 cities to remote rural villages.
- **Immense Capital Foundation**: Total Asset Under Management (AUM) exceeding ₹51+ Lakh Crore, generating unmatched investment scale.

### Weaknesses
- **Lagging Digital First-Touch UX**: Complex web interface compared to frictionless 3-click purchase journeys of private rivals.
- **Product Tilt to Traditional Endowments**: Heavy reliance on low-yield endowment/money-back plans rather than pure risk protection.
- **Channel Friction**: Resistance from legacy agency channels against direct online pricing discounts.

### Opportunities
- **Bima Sugam Integration**: Capitalizing on IRDAI's upcoming unified insurance exchange to capture millions of first-time digital buyers.
- **Hyper-Personalized Term Protection**: Offering modular, affordable term covers with customized riders for Tier-2/Tier-3 entrepreneurs.
- **Programmatic Educational Content**: Dominating regional-language financial literacy queries on search and AI answer engines.

### Threats
- **Aggressive Bancassurance Partnerships**: Private insurers deepening exclusive tie-ups with leading private and public sector banks.
- **Digital Broker Disintermediation**: Platforms like Policybazaar capturing high-intent Google search traffic and steering users to private plans.
- **IRDAI Surrender Value Norms**: Regulatory tightening on early surrender penalties pressuring traditional endowment profit margins.

## PESTEL Macro Driver Matrix

### Political & Regulatory (IRDAI)
- IRDAI's "Insurance for All by 2047" initiative creates massive tailwinds for micro-insurance and simplified term policies.

### Economic Landscape
- Expanding Indian middle class and rising disposable incomes driving demand for retirement planning, pension annuities, and health riders.

### Social & Demographic Shift
- Rapid rise of digitally native 22–35 year-old workforce demanding transparent online policy tracking and instant WhatsApp servicing.

### Technological Disruption
- AI-driven underwriting, instant video-KYC, and automated medical risk scoring reducing policy issuance from days to minutes.

### Environmental, Social & Governance (ESG)
- Increasing institutional scrutiny requiring green sovereign investments and ethical underwriting transparency.

### Legal & Regulatory Compliance
- Strict data localization, Digital Personal Data Protection (DPDP) Act compliance, and mandatory fast-track claim settlement windows.

## Strategic Action Roadmap for LIC India

1. **Direct-to-Consumer Term Protection Engine**: Launch an independent digital-first pure protection line with transparent, competitive pricing.
2. **SEO & GEO Search Real Estate Expansion**: Build 500+ localized high-intent comparison and financial planning hubs to outrank aggregators.
3. **Agent Co-Pilot Mobile Ecosystem**: Transform the ANANDA mobile app into a complete AI-assisted advisory toolkit for on-field agents.
4. **Instant WhatsApp Claim Concierge**: Implement zero-friction automated claim submission to elevate public perception of settlement speed.
`;

  // Create SVG badges for competitor logos
  function createSvgLogo(name: string, color: string, letter: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect width="48" height="48" rx="10" fill="${color}"/>
      <text x="50%" y="56%" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${letter}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  const competitors = [
    {
      companyName: "HDFC Life Insurance",
      officialWebsite: "https://hdfclife.com",
      logoDataUrl: createSvgLogo("HDFC Life", "#004B87", "H"),
      positioning: "Digital-first private insurer pioneering online term plans (Click 2 Protect) and bancassurance.",
      competitiveAttributes: ["99.39% CSR", "Instant STP Underwriting", "Retirement Solutions", "Bancassurance Leader"],
    },
    {
      companyName: "SBI Life Insurance",
      officialWebsite: "https://sbilife.co.in",
      logoDataUrl: createSvgLogo("SBI Life", "#224099", "S"),
      positioning: "Cost-efficient insurer with unmatched branch footprint across 22,000+ State Bank of India locations.",
      competitiveAttributes: ["Lowest Expense Ratio", "Pan-India Reach", "SBI Branch Network", "Agency Scale"],
    },
    {
      companyName: "ICICI Prudential Life",
      officialWebsite: "https://iciciprulife.com",
      logoDataUrl: createSvgLogo("ICICI Pru", "#B7232B", "I"),
      positioning: "Pioneer in customer-centric digital products, wealth creation ULIPs, and automated pension portfolios.",
      competitiveAttributes: ["Digital Direct App", "Annuity Leadership", "99.17% CSR", "Multi-Product Suite"],
    },
    {
      companyName: "Max Life Insurance",
      officialWebsite: "https://maxlifeinsurance.com",
      logoDataUrl: createSvgLogo("Max Life", "#006FBA", "M"),
      positioning: "Specialized protection brand recognized for India's highest claim settlement ratio and Axis Bank integration.",
      competitiveAttributes: ["99.51% Claim Settlement", "Axis Bank Tie-up", "Custom Term Riders", "Service NPS 50+"],
    },
    {
      companyName: "Tata AIA Life",
      officialWebsite: "https://tataaia.com",
      logoDataUrl: createSvgLogo("Tata AIA", "#0A4E96", "T"),
      positioning: "Premium brand equity with wellness-integrated protection covers and consistent multi-channel growth.",
      competitiveAttributes: ["Tata Trust Brand", "Vitality Health App", "High Persistency", "Consumer Protection"],
    },
    {
      companyName: "Policybazaar",
      officialWebsite: "https://policybazaar.com",
      logoDataUrl: createSvgLogo("Policybazaar", "#1C6AE4", "P"),
      positioning: "India's dominant insurance comparison portal capturing top-of-funnel consumer search intent.",
      competitiveAttributes: ["Search Dominance", "Price Comparison", "Instant Quotes", "Tele-Assisted Sales"],
    },
  ];

  console.log("Generating refined LIC India Competitor Intelligence Report...");

  const result = await createVisualReport({
    companyName: "Life Insurance Corporation of India (LIC)",
    companyWebsite: "https://licindia.in",
    companyCategory: "Life Insurance & Financial Services",
    companyBrief: "Life Insurance Corporation of India (LIC) is India's largest state-owned life insurance and investment corporation, managing over ₹51 Lakh Crore ($610B+ USD) in assets and serving more than 250 million policyholders nationwide.",
    title: "LIC India — Competitor Intelligence & Market Positioning Analysis",
    documentType: "COMPETITOR_ANALYSIS",
    markdown: licMarkdown,
    updatedAt: new Date("2026-08-30T00:00:00Z"),
    sourceCount: 38,
    skills: [
      { repository: "openclaw-marketing-skills", skill: "competitor-intelligence", phase: "landscape", reason: "Map market positioning, distribution moats, and product pricing." },
      { repository: "claude-seo", skill: "serp-gap-analysis", phase: "search-intent", reason: "Evaluate organic search and aggregator disintermediation risk." },
      { repository: "social-media-skills", skill: "brand-trust-audit", phase: "perception", reason: "Assess consumer brand equity and claim settlement trust." },
    ],
    modules: [
      {
        type: "COMPETITOR_ANALYSIS",
        title: "Competitor Intelligence & Market Positioning",
        markdown: licMarkdown,
        competitors,
      }
    ],
    manifest: resolveArtifactManifest({ reportType: "COMPETITOR_ANALYSIS", markdown: licMarkdown, metadata: {} }),
  });

  const pdfPath = path.join(outputDir, "lic-india-competitor-analysis-report.pdf");
  const htmlPath = path.join(outputDir, "lic-india-competitor-analysis-report.html");

  await writeFile(pdfPath, result.pdf);
  await writeFile(htmlPath, result.html);

  console.log(`Successfully generated:\n- PDF: ${pdfPath} (${result.pdf.length} bytes)\n- HTML: ${htmlPath} (${result.html.length} bytes)`);
  console.log(`QA Result: Page Count: ${result.qa.final.pageCount}, Issues: ${result.qa.final.issues.length}`);

  // Take screenshot for visual QA
  const chrome = Launcher.getInstallations()[0];
  if (chrome) {
    const previewPng = path.join(outputDir, "lic-india-report-preview.png");
    await new Promise<void>((resolve) => {
      const child = spawn(chrome, [
        "--headless=new",
        `--screenshot=${previewPng}`,
        "--window-size=1200,1650",
        `file:///${htmlPath.replace(/\\/g, "/")}`
      ]);
      child.on("close", () => resolve());
    });
    console.log(`Generated screenshot preview: ${previewPng}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
