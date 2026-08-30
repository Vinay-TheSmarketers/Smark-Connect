import "server-only";
import { db } from "@/lib/db";
import { unwrapStructuredText } from "@/lib/text-format";

export type CompanyMemory = {
  companyName: string;
  websiteUrl: string;
  category: string;
  description: string;
  tagline: string;
  productsAndServices: string[];
  featuresAndCapabilities: string[];
  icpsAndPersonas: Array<{
    title: string;
    role: string;
    description: string;
    painPoints: string[];
  }>;
  painPoints: string[];
  jobsToBeDone: string[];
  useCases: string[];
  differentiators: string[];
  competitors: Array<{
    name: string;
    website?: string;
    positioning?: string;
    attributes?: string[];
  }>;
  positioning: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  brandVoice: {
    tone: string;
    principles: string[];
    allowedClaims: string[];
    forbiddenPhrases: string[];
  };
};

function extractBulletPoints(text: string, maxItems = 10): string[] {
  const lines = text.split(/\r?\n/);
  const results: string[] = [];
  for (const line of lines) {
    const cleanLine = line.replace(/^[\s*\-•\d.)\]]+/, "").trim();
    if (cleanLine.length >= 10 && cleanLine.length <= 180 && !cleanLine.startsWith("#")) {
      results.push(cleanLine.replace(/[*_`]/g, ""));
    }
    if (results.length >= maxItems) break;
  }
  return results;
}

function extractSection(markdown: string, headings: string[]): string {
  const pattern = new RegExp(`#{1,4}\\s+(?:${headings.join("|")})[\\s\\S]*?(?=(?:\\n#{1,4}\\s+)|$)`, "i");
  const match = markdown.match(pattern);
  return match ? match[0].replace(/^#{1,4}\s+[^\n]+\n/, "").trim() : "";
}

/**
 * Extracts and synthesizes Company Memory from stored foundation documents and crawled pages.
 */
export async function extractCompanyMemory(companyId: string): Promise<CompanyMemory> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      documents: {
        where: {
          type: {
            in: [
              "COMPANY_INTELLIGENCE",
              "PRODUCT_INFO",
              "AUDIENCE_ANALYSIS",
              "COMPETITOR_ANALYSIS",
              "MARKETING_STRATEGY",
              "SEO_AUDIT",
            ],
          },
        },
      },
      crawlPages: {
        orderBy: { wordCount: "desc" },
        take: 12,
      },
    },
  });

  if (!company) {
    throw new Error(`Company with id ${companyId} not found.`);
  }

  const docMap = new Map(company.documents.map((doc) => [doc.type, doc.contentMarkdown]));
  const companyIntel = docMap.get("COMPANY_INTELLIGENCE") || "";
  const productInfo = docMap.get("PRODUCT_INFO") || "";
  const audienceDoc = docMap.get("AUDIENCE_ANALYSIS") || "";
  const competitorDoc = docMap.get("COMPETITOR_ANALYSIS") || "";
  const strategyDoc = docMap.get("MARKETING_STRATEGY") || "";

  // 1. Basic Info
  const companyName = company.name || "Company";
  const websiteUrl = company.websiteUrl || "";
  const category = company.category || "B2B Marketing & Demand Generation";
  const description =
    company.description ||
    extractSection(companyIntel, ["Executive Summary", "Overview", "What It Does", "Company Overview"]) ||
    company.crawlPages[0]?.description ||
    `${companyName} provides high-performance ${category} solutions.`;

  // 2. Products & Services
  const productSection =
    extractSection(productInfo, ["Products", "Services", "Offerings", "Core Offer", "What We Offer"]) ||
    extractSection(companyIntel, ["Offer", "Products and Services", "Capabilities"]);
  const productsAndServices = extractBulletPoints(productSection, 8);
  if (productsAndServices.length === 0) {
    productsAndServices.push(
      "Full-Funnel Demand Generation",
      "Account-Based Marketing (ABM)",
      "Automated Technical Audits & AI Search Visibility",
      "HubSpot Implementation & RevOps",
    );
  }

  // 3. Features & Capabilities
  const featureSection = extractSection(productInfo, ["Features", "Key Capabilities", "Capabilities"]);
  const featuresAndCapabilities = extractBulletPoints(featureSection, 8);
  if (featuresAndCapabilities.length === 0) {
    featuresAndCapabilities.push(
      "Automated multi-engine search visibility tracking",
      "Continuous competitor gap analysis and monitoring",
      "White-label automated reporting workflows",
      "Evidence-backed ICP and customer journey mapping",
    );
  }

  // 4. ICPs and Personas
  const audienceSection =
    extractSection(audienceDoc, ["Ideal Customer Profiles", "ICPs", "Target Audience", "Segments"]) ||
    extractSection(strategyDoc, ["Target Audience", "Audience"]);
  const icpBullets = extractBulletPoints(audienceSection, 6);
  const icpsAndPersonas = icpBullets.length > 0
    ? icpBullets.map((bullet) => {
        const parts = bullet.split(/[:-]/);
        return {
          title: parts[0]?.trim() || "Marketing Leader",
          role: parts[0]?.trim() || "Growth Executive",
          description: parts[1]?.trim() || bullet,
          painPoints: [
            "Manual reporting and data compilation take too much time",
            "Slow pipeline velocity and inconsistent lead qualification",
            "Lack of visibility into competitor search dominance",
          ],
        };
      })
    : [
        {
          title: "B2B Marketing Agency Owner",
          role: "Agency Founder / CEO",
          description: "Runs a digital agency looking to scale client reporting and automate audit production.",
          painPoints: [
            "Spending 5+ hours per client compiling SEO reports manually",
            "Scaling bottlenecks across multi-client account management",
            "Client churn due to lack of transparent strategic progress",
          ],
        },
        {
          title: "In-House Demand Gen / Growth Lead",
          role: "Head of Marketing / Growth Director",
          description: "Leads demand generation for mid-market B2B SaaS and enterprise tech companies.",
          painPoints: [
            "High customer acquisition costs (CAC) and saturated paid channels",
            "Struggling to track visibility across LLMs and AI search engines",
            "Disconnected tech stack between CRM, SEO, and pipeline reporting",
          ],
        },
        {
          title: "Technical SEO & RevOps Lead",
          role: "Technical Marketing Manager",
          description: "Responsible for technical health, site architecture, and automated analytics operations.",
          painPoints: [
            "Crawling limitations on large complex web estates",
            "Manual diagnostics and diagnostic reproduction taking too long",
            "Difficulty translating technical fixes into executive ROI metrics",
          ],
        },
      ];

  // 5. Pain Points
  const painSection =
    extractSection(audienceDoc, ["Customer Pain Points", "Pain Points", "Tensions", "Challenges"]) ||
    extractSection(strategyDoc, ["Market Gaps", "Friction Points"]);
  const painPoints = extractBulletPoints(painSection, 8);
  if (painPoints.length === 0) {
    painPoints.push(
      "Manual client SEO reporting takes 5+ hours per client every month",
      "Legacy SEO tools are too expensive and lack AI/GEO visibility tracking",
      "Difficulty prioritizing which technical search issues actually drive pipeline",
      "Competitor tools locking key agency features behind massive enterprise tiers",
      "Struggling to automate recurring site crawls across 50+ client domains",
    );
  }

  // 6. Jobs-To-Be-Done (JTBD)
  const jtbdSection = extractSection(audienceDoc, ["Jobs to be Done", "JTBD", "Core Jobs"]);
  const jobsToBeDone = extractBulletPoints(jtbdSection, 8);
  if (jobsToBeDone.length === 0) {
    jobsToBeDone.push(
      "Automate monthly client SEO & AI visibility audits without manual data entry",
      "Find high-intent buyer discussions in relevant communities before competitors",
      "Replace expensive legacy tooling with high-speed automated diagnostics",
      "Demonstrate measurable ROI and strategic fixes to client stakeholders",
    );
  }

  // 7. Differentiators
  const diffSection =
    extractSection(companyIntel, ["Differentiators", "Competitive Advantage", "Why Us", "Proof Ladder"]) ||
    extractSection(productInfo, ["Differentiators", "Value Proposition"]);
  const differentiators = extractBulletPoints(diffSection, 6);
  if (differentiators.length === 0) {
    differentiators.push(
      "Evidence-led architecture that never hallucinates metrics or citations",
      "Unified multi-channel intelligence combining SEO, AI/GEO, and social intent",
      "Built specifically for agencies and modern growth teams with white-label outputs",
    );
  }

  // 8. Competitors
  const competitors: CompanyMemory["competitors"] = [];
  const competitorDocObj = company.documents.find((d) => d.type === "COMPETITOR_ANALYSIS");
  if (competitorDocObj?.metadata && typeof competitorDocObj.metadata === "object") {
    const meta = competitorDocObj.metadata as { competitors?: Array<{ companyName?: string; officialWebsite?: string; positioning?: string; competitiveAttributes?: string[] }> };
    if (Array.isArray(meta.competitors) && meta.competitors.length > 0) {
      for (const comp of meta.competitors) {
        if (comp.companyName) {
          competitors.push({
            name: comp.companyName,
            website: comp.officialWebsite,
            positioning: comp.positioning,
            attributes: comp.competitiveAttributes,
          });
        }
      }
    }
  }

  if (competitors.length === 0) {
    const compSection = extractSection(competitorDoc, ["Direct Competitors", "Competitive Landscape", "Alternatives", "Competitors"]);
    const compBullets = extractBulletPoints(compSection, 8);
    for (const bullet of compBullets) {
      const parts = bullet.split(/[:-]/);
      competitors.push({
        name: parts[0]?.trim() || "Competitor",
        positioning: parts[1]?.trim() || bullet,
      });
    }
  }

  if (competitors.length === 0) {
    competitors.push(
      { name: "Directive Consulting", website: "https://directiveconsulting.com", positioning: "Performance marketing for enterprise SaaS" },
      { name: "Refine Labs", website: "https://refinelabs.com", positioning: "Demand generation and revenue operations" },
      { name: "Ironpaper", website: "https://ironpaper.com", positioning: "B2B lead generation and inbound agency" },
      { name: "New Breed", website: "https://newbreedrevenue.com", positioning: "HubSpot elite partner and revenue operations" },
      { name: "Kalungi", website: "https://kalungi.com", positioning: "Full-service outsourced B2B SaaS marketing" },
      { name: "TripleDart", website: "https://tripledart.com", positioning: "B2B SaaS growth and performance agency" },
    );
  }

  // 9. Keywords
  const primaryKeywords = [
    companyName.toLowerCase(),
    `${companyName.toLowerCase()} marketing`,
    "b2b marketing agency",
    "seo audit tool",
    "automated seo reporting",
    "agency reporting software",
    "ai search optimization",
    "geo audit tool",
  ];

  const secondaryKeywords = [
    "white label seo reports",
    "screaming frog alternative",
    "ahrefs alternative",
    "semrush alternative for agencies",
    "how to automate client seo audits",
    "b2b demand generation agency",
    "abm marketing platform",
    "hubspot agency partner",
  ];

  // 10. Brand Voice
  const brandVoice = {
    tone: "Helpful, technically grounded, authoritative, concise, and transparent.",
    principles: [
      "Answer the exact question directly before introducing any solution.",
      "Never pretend to be an unbiased third-party customer or fake user.",
      "Provide real actionable steps and specific workflow advice.",
      "Disclose affiliation clearly whenever mentioning the company or product.",
      "Never use aggressive sales pitches, clickbait, or fabricated statistics.",
    ],
    allowedClaims: [
      "Automates technical audits, SEO diagnostics, and client reporting workflows.",
      "Combines traditional search diagnostics with AI answer engine (GEO) readiness.",
      "Grounded in verified source evidence and deterministic page speed tests.",
    ],
    forbiddenPhrases: [
      "Best tool in the world",
      "Guaranteed #1 ranking",
      "I've been using this for 5 years (unless true)",
      "Unbeatable 1000x ROI",
      "You MUST buy this now",
    ],
  };

  return {
    companyName,
    websiteUrl,
    category,
    description: unwrapStructuredText(description).slice(0, 500),
    tagline: `Evidence-led ${category} discovery and growth.`,
    productsAndServices,
    featuresAndCapabilities,
    icpsAndPersonas,
    painPoints,
    jobsToBeDone,
    useCases: [
      "Automated agency client SEO reporting",
      "Multi-domain technical audit scheduling",
      "AI & GEO search visibility gap discovery",
      "Target account pipeline acceleration",
    ],
    differentiators,
    competitors,
    positioning: `${companyName} delivers evidence-grounded, high-velocity ${category} that replaces manual production bottlenecks with automated intelligence.`,
    primaryKeywords,
    secondaryKeywords,
    brandVoice,
  };
}
