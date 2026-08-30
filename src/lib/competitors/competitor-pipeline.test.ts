import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../company-logo", () => ({ discoverCompanyLogo: async () => null }));

import { analyzeCompetitorLandscape } from "./analyzer";
import { synthesizeSkillsAndFindings } from "./skills-synthesizer";
import type { CompanyStrategicProfile } from "./types";

const mockProfile: CompanyStrategicProfile = {
  companyName: "The Smarketers",
  websiteUrl: "https://thesmarketers.com",
  category: "B2B Marketing & Demand Generation",
  tagline: "High-growth B2B demand generation",
  description: "A B2B marketing agency that handles account-based marketing (ABM) and automated SEO client reporting.",
  coreOfferStack: [
    "Full-Funnel Demand Generation",
    "Account-Based Marketing (ABM)",
    "Automated Technical Audits & SEO Reporting",
  ],
  productServiceCategories: [
    "Full-Funnel Demand Generation (B2B Marketing)",
    "Automated Technical Audits & SEO Reporting (B2B Marketing)",
  ],
  icpsAndPersonas: [
    {
      title: "B2B Marketing Agency Owner",
      role: "Agency Founder / CEO",
      description: "Runs an agency looking to scale client reporting and audits.",
      painPoints: ["Spending 5+ hours per client compiling SEO reports manually"],
      buyingTriggers: ["Scaling client base beyond current capacity"],
    },
  ],
  painPoints: [
    "Manual client SEO reporting takes 5+ hours per client every month",
    "Legacy SEO tools are too expensive and lack white-label features",
  ],
  useCases: ["Automating agency client SEO reporting"],
  positioning: "The Smarketers is an automated agency client reporting and technical audit platform.",
  differentiators: [
    "Evidence-led architecture that never hallucinates metrics",
    "Built specifically for agencies with white-label outputs",
  ],
  proofPoints: [
    "Verified 65% reduction in client report generation time",
  ],
  commercialModel: {
    pricingStructure: "Tiered monthly subscription",
    monetizationType: "B2B SaaS / Agency Retainer",
    tierHighlights: ["Core Tier: $99/mo", "Agency Pro: $299/mo"],
  },
  brandProfile: {
    pillars: ["Operational Precision", "Evidence-Led Transparency"],
    messagingThemes: ["Automate manual reporting toil"],
  },
  voice: {
    tone: "Authoritative, practical, concise, transparent.",
    principles: ["Lead with direct answers", "Disclose facts clearly"],
    forbiddenPhrases: ["#1 in the world", "Guaranteed 10x ROI"],
  },
  contentThemes: ["Agency scaling frameworks", "Automated client reporting benchmarks"],
  goalsAndKpis: [
    {
      goal: "Accelerate customer acquisition and demo conversion",
      targetKpi: "Increase qualified demo conversion rate by 25%",
      strategicWeight: "high",
    },
  ],
};

describe("Competitor Intelligence Pipeline & Skills Synthesizer", () => {
  it("generates 5–6 distinct Competitor Profiles with all 12 dimensions and 'How we differ' contrast", async () => {
    const liveItems = [
      {
        url: "https://semrush.com",
        title: "Semrush All-in-One Marketing Suite",
        excerpt: "Enterprise search marketing and competitor analytics platform.",
        discoverySource: "Search Engine",
        query: "competitor alternatives",
        publishedAt: new Date().toISOString(),
      },
      {
        url: "https://ahrefs.com",
        title: "Ahrefs SEO Tools & Resources",
        excerpt: "Backlink index and site audit crawler.",
        discoverySource: "Search Engine",
        query: "competitor alternatives",
        publishedAt: new Date().toISOString(),
      },
    ];

    const competitors = await analyzeCompetitorLandscape(mockProfile, liveItems);

    expect(competitors.length).toBeGreaterThanOrEqual(5);
    expect(competitors.length).toBeLessThanOrEqual(6);

    const first = competitors[0];
    expect(first.name).toBeDefined();
    expect(first.officialWebsite).toMatch(/^https?:\/\//);
    expect(first.category).toBe(mockProfile.category);
    expect(first.targetAudience).toBeDefined();
    expect(first.coreOffer).toBeDefined();
    expect(first.keyFeatures.length).toBeGreaterThanOrEqual(2);
    expect(first.pricingMarketPosition).toBeDefined();
    expect(first.primaryUsp).toBeDefined();
    expect(first.strengths.length).toBeGreaterThanOrEqual(2);
    expect(first.weaknesses.length).toBeGreaterThanOrEqual(2);
    expect(first.positioningAngle).toBeDefined();
    expect(first.proofSignals.length).toBeGreaterThanOrEqual(1);
    expect(first.howWeDiffer).toContain("The Smarketers");
    expect(first.howWeDiffer).toMatch(/Unlike/i);
    expect(first.evidenceSummary).toBeDefined();
  });

  it("synthesizes skills into normalized findings with verified provenance labels", () => {
    const mockCompetitors = [
      {
        id: "comp-semrush",
        name: "Semrush",
        officialWebsite: "https://semrush.com",
        logoUrl: "",
        category: mockProfile.category,
        targetAudience: "Enterprise teams",
        coreOffer: "Semrush Suite",
        keyFeatures: ["Keyword tracking", "Backlinks"],
        pricingMarketPosition: "Enterprise tiered ($400 - $1,200+/mo)",
        primaryUsp: "Industry standard data scale",
        strengths: ["Brand recognition", "Data scale"],
        weaknesses: ["High enterprise costs", "Complex UI"],
        positioningAngle: "All-in-one search suite",
        proofSignals: ["Market authority"],
        howWeDiffer: "Unlike Semrush, The Smarketers offers automated reporting.",
        evidenceSummary: "Semrush provides all-in-one search tooling.",
        marketShareTier: "market_leader" as const,
        confidenceScore: 92,
      },
    ];

    const { findings, actionItems } = synthesizeSkillsAndFindings(mockProfile, mockCompetitors);

    expect(findings.length).toBeGreaterThanOrEqual(4);
    for (const f of findings) {
      expect(["positive_signal", "issue", "risk", "opportunity", "insight", "action_candidate"]).toContain(f.type);
      expect(["verified", "supported", "inferred", "assumed"]).toContain(f.provenance);
      expect(f.originatingSkills.length).toBeGreaterThanOrEqual(1);
      expect(f.title).toBeDefined();
      expect(f.evidence).toBeDefined();
      expect(f.impact).toBeDefined();
    }

    expect(actionItems.length).toBeGreaterThanOrEqual(4);
    for (const act of actionItems) {
      expect(act.priorityScore).toBeGreaterThan(0);
      expect(act.priorityScore).toBeLessThanOrEqual(100);
      expect(act.originatingSkills.length).toBeGreaterThanOrEqual(2); // Cross-skill merged
      expect(act.goalKpiAlignment).toBeDefined();
      expect(act.concreteNextStep).toBeDefined();
      expect(act.voiceGuardrail).toBeDefined();
    }

    // Critical actions should be ranked top
    expect(actionItems[0].priorityTier).toBe("critical");
    expect(actionItems[0].priorityScore).toBeGreaterThanOrEqual(actionItems[actionItems.length - 1].priorityScore);
  });
});
