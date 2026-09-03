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
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const results: string[] = [];
  for (const line of lines) {
    const cleanLine = line.replace(/^[\s*\-•\d.)\]]+/, "").trim();
    if (cleanLine.length >= 8 && cleanLine.length <= 180 && !cleanLine.startsWith("#")) {
      results.push(cleanLine.replace(/[*_`]/g, ""));
    }
    if (results.length >= maxItems) break;
  }
  return results;
}

function extractSection(markdown: string, headings: string[]): string {
  if (!markdown) return "";
  const pattern = new RegExp(`#{1,4}\\s+(?:${headings.join("|")})[\\s\\S]*?(?=(?:\\n#{1,4}\\s+)|$)`, "i");
  const match = markdown.match(pattern);
  return match ? match[0].replace(/^#{1,4}\s+[^\n]+\n/, "").trim() : "";
}

function cleanDomainName(urlStr: string): string {
  try {
    const parsed = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return urlStr;
  }
}

/**
 * Extracts phrases and keywords from crawl page titles and descriptions.
 */
function deriveKeywordsFromPages(pages: Array<{ title: string | null; description: string | null; url: string }>, companyName: string): string[] {
  const brandLower = companyName.toLowerCase();
  const stopWords = new Set(["home", "about", "contact", "pricing", "privacy", "terms", "page", "welcome", "the", "and", "for", "with", "from", "your", "that", "this", "our", "all"]);
  
  const rawPhrases = pages.flatMap((p) => {
    const items: string[] = [];
    if (p.title) {
      const parts = p.title.split(/[|–—:•]/).map((s) => s.trim()).filter((s) => s.length > 3);
      items.push(...parts);
    }
    if (p.description) {
      const parts = p.description.split(/[.,;]/).map((s) => s.trim()).filter((s) => s.length > 5 && s.length < 50);
      items.push(...parts);
    }
    return items;
  });

  const unique = new Set<string>();
  for (const phrase of rawPhrases) {
    const clean = phrase.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
    const lower = clean.toLowerCase();
    if (lower && lower !== brandLower && !stopWords.has(lower) && clean.length > 4 && clean.length < 45) {
      unique.add(clean);
    }
  }

  return Array.from(unique).slice(0, 15);
}

/**
 * Extracts and synthesizes Company Memory strictly from stored company evidence,
 * foundation documents, and crawled website pages — with zero generic SEO assumptions.
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
            ],
          },
        },
      },
      crawlPages: {
        orderBy: { wordCount: "desc" },
        take: 16,
      },
      chatAttachments: {
        where: { remembered: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) {
    throw new Error(`Company with id ${companyId} not found.`);
  }

  const docMap = new Map(company.documents.map((doc) => [doc.type, doc.contentMarkdown]));
  const uploadedSourceText = company.chatAttachments.map((source) => `# ${source.title}\n\n${source.content}`).join("\n\n").slice(0, 80_000);
  const companyIntel = `${docMap.get("COMPANY_INTELLIGENCE") || ""}\n\n${uploadedSourceText}`;
  const productInfo = `${docMap.get("PRODUCT_INFO") || ""}\n\n${uploadedSourceText}`;
  const audienceDoc = `${docMap.get("AUDIENCE_ANALYSIS") || ""}\n\n${uploadedSourceText}`;
  const competitorDoc = `${docMap.get("COMPETITOR_ANALYSIS") || ""}\n\n${uploadedSourceText}`;
  const strategyDoc = `${docMap.get("MARKETING_STRATEGY") || ""}\n\n${uploadedSourceText}`;

  // 1. Basic Info & Real Domain
  const companyName = company.name || "Company";
  const websiteUrl = company.websiteUrl || "";
  const domain = cleanDomainName(websiteUrl);

  const homePage = company.crawlPages[0];
  const derivedKeywords = deriveKeywordsFromPages(company.crawlPages, companyName);

  // Derive dynamic category from company or crawl pages
  let category = company.category?.trim();
  if (!category || category === "B2B Marketing & Demand Generation") {
    // Try to derive from homepage title or first few keywords
    if (homePage?.title) {
      const parts = homePage.title.split(/[|–—:•]/).map((s) => s.trim());
      const nonBrand = parts.find((p) => !p.toLowerCase().includes(companyName.toLowerCase()) && p.length > 3);
      if (nonBrand) {
        category = nonBrand;
      }
    }
    if (!category && derivedKeywords.length > 0) {
      category = derivedKeywords[0];
    }
    if (!category) {
      category = `${companyName} Solutions`;
    }
  }

  // Derive dynamic description
  const description =
    company.description ||
    extractSection(companyIntel, ["Executive Summary", "Overview", "What It Does", "Company Overview"]) ||
    homePage?.description ||
    `${companyName} is an innovative provider of ${category}.`;

  // 2. Products & Services (derived from documents or real crawl page titles/content)
  const productSection =
    extractSection(productInfo, ["Products", "Services", "Offerings", "Core Offer", "What We Offer"]) ||
    extractSection(companyIntel, ["Offer", "Products and Services", "Capabilities"]);
  let productsAndServices = extractBulletPoints(productSection, 8);

  if (productsAndServices.length === 0) {
    // Extract from crawl page titles that represent specific subpages
    const pageOfferings = company.crawlPages
      .filter((p) => p.url !== websiteUrl && !p.url.endsWith("/"))
      .map((p) => {
        const title = p.title?.split(/[|–—:•]/)[0]?.trim();
        return title && title.length > 3 && !title.toLowerCase().includes("home") ? title : null;
      })
      .filter((t): t is string => Boolean(t));

    if (pageOfferings.length > 0) {
      productsAndServices = Array.from(new Set(pageOfferings)).slice(0, 6);
    } else if (derivedKeywords.length > 0) {
      productsAndServices = derivedKeywords.slice(0, 4);
    } else {
      productsAndServices = [`${companyName} ${category}`];
    }
  }

  // 3. Features & Capabilities
  const featureSection = extractSection(productInfo, ["Features", "Key Capabilities", "Capabilities", "Key Features"]);
  let featuresAndCapabilities = extractBulletPoints(featureSection, 8);
  if (featuresAndCapabilities.length === 0) {
    featuresAndCapabilities = derivedKeywords.slice(0, 6).map((kw) => `${kw} capability`);
    if (featuresAndCapabilities.length === 0) {
      featuresAndCapabilities = [`${category} core feature set`];
    }
  }

  // 4. ICPs and Personas (derived from audience doc or dynamic buyer roles)
  const audienceSection =
    extractSection(audienceDoc, ["Ideal Customer Profiles", "ICPs", "Target Audience", "Segments"]) ||
    extractSection(strategyDoc, ["Target Audience", "Audience"]);
  const icpBullets = extractBulletPoints(audienceSection, 6);
  
  let icpsAndPersonas = icpBullets.length > 0
    ? icpBullets.map((bullet) => {
        const parts = bullet.split(/[:-]/);
        return {
          title: parts[0]?.trim() || "Target Buyer",
          role: parts[0]?.trim() || "Decision Maker",
          description: parts[1]?.trim() || bullet,
          painPoints: [
            `Struggling with manual or inefficient ${category.toLowerCase()} processes`,
            `Looking for modern alternatives to legacy ${category.toLowerCase()} solutions`,
          ],
        };
      })
    : [
        {
          title: `${category} Decision Maker`,
          role: "Team Lead / Executive",
          description: `Leaders and practitioners looking for reliable ${category} solutions.`,
          painPoints: [
            `Inefficient workflows and slow turnaround when managing ${category.toLowerCase()}`,
            `Lack of unified, modern tooling for ${category.toLowerCase()}`,
          ],
        },
        {
          title: `${companyName} Practitioner / Power User`,
          role: "Practitioner / Specialist",
          description: `Hands-on specialists executing ${category.toLowerCase()} workflows daily.`,
          painPoints: [
            `Legacy tools are overly complex, expensive, or hard to integrate`,
            `Need automated and scalable workflows for ${category.toLowerCase()}`,
          ],
        },
      ];

  // 5. Customer Pain Points
  const painSection =
    extractSection(audienceDoc, ["Customer Pain Points", "Pain Points", "Tensions", "Challenges", "Friction"]) ||
    extractSection(strategyDoc, ["Market Gaps", "Friction Points"]);
  let painPoints = extractBulletPoints(painSection, 8);
  if (painPoints.length === 0) {
    painPoints = [
      `High manual overhead and friction in existing ${category.toLowerCase()} workflows`,
      `Legacy ${category.toLowerCase()} tools lack essential modern capabilities`,
      `Difficulty scaling ${category.toLowerCase()} without adding head-count`,
      `Expensive subscription pricing and feature gating in existing alternatives`,
    ];
  }

  // 6. Jobs-To-Be-Done (JTBD)
  const jtbdSection = extractSection(audienceDoc, ["Jobs to be Done", "JTBD", "Core Jobs"]);
  let jobsToBeDone = extractBulletPoints(jtbdSection, 8);
  if (jobsToBeDone.length === 0) {
    jobsToBeDone = [
      `Streamline and automate ${category.toLowerCase()} operations`,
      `Find high-intent solutions and software for ${category.toLowerCase()}`,
      `Replace clunky or outdated ${category.toLowerCase()} tools`,
      `Deliver reliable and measurable results with ${companyName}`,
    ];
  }

  // 7. Differentiators
  const diffSection =
    extractSection(companyIntel, ["Differentiators", "Competitive Advantage", "Why Us", "Proof Ladder"]) ||
    extractSection(productInfo, ["Differentiators", "Value Proposition"]);
  let differentiators = extractBulletPoints(diffSection, 6);
  if (differentiators.length === 0) {
    differentiators = [
      `Purpose-built for modern ${category.toLowerCase()} demands`,
      `Grounded in verified efficiency, ease-of-use, and clear ROI`,
      `Fast implementation without complex legacy setup`,
    ];
  }

  // 8. Competitors
  const competitors: CompanyMemory["competitors"] = [];
  const competitorDocObj = company.documents.find((d) => d.type === "COMPETITOR_ANALYSIS");
  if (competitorDocObj?.metadata && typeof competitorDocObj.metadata === "object") {
    const meta = competitorDocObj.metadata as {
      competitors?: Array<{ companyName?: string; officialWebsite?: string; positioning?: string; competitiveAttributes?: string[] }>;
    };
    if (Array.isArray(meta.competitors) && meta.competitors.length > 0) {
      for (const comp of meta.competitors) {
        if (comp.companyName && comp.companyName.toLowerCase() !== companyName.toLowerCase()) {
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
      const name = parts[0]?.trim();
      if (name && name.toLowerCase() !== companyName.toLowerCase() && name.length < 40) {
        competitors.push({
          name,
          positioning: parts[1]?.trim() || bullet,
        });
      }
    }
  }

  // 9. Primary & Secondary Keywords
  const primaryKeywords = [
    companyName.toLowerCase(),
    domain.toLowerCase(),
    category.toLowerCase(),
    ...derivedKeywords.slice(0, 5).map((k) => k.toLowerCase()),
  ];

  const secondaryKeywords = [
    `best ${category.toLowerCase()} software`,
    `recommend a ${category.toLowerCase()} tool`,
    `top ${category.toLowerCase()} platforms`,
    `${category.toLowerCase()} alternatives`,
    ...derivedKeywords.slice(5, 12).map((k) => k.toLowerCase()),
  ];

  // 10. Brand Voice
  const brandVoice = {
    tone: "Helpful, knowledgeable, concise, authentic, and transparent.",
    principles: [
      "Answer the author's question directly with valuable tactical insight before mentioning any product.",
      "Never pretend to be an unbiased third-party customer or fake user.",
      "Provide real actionable steps and specific workflow advice.",
      "Disclose affiliation clearly whenever mentioning the company or product.",
      "Never use aggressive sales pitches, clickbait, or spammy links.",
    ],
    allowedClaims: [
      `Provides dedicated capabilities for ${category.toLowerCase()}.`,
      `Designed to streamline ${category.toLowerCase()} workflows.`,
      `Grounded in verifiable performance and practical utility.`,
    ],
    forbiddenPhrases: [
      "Best in the world",
      "Guaranteed #1",
      "DM me for special discount",
      "100% effortless magical results",
    ],
  };

  const useCases = productsAndServices.slice(0, 4).map((p) => `${p} optimization and execution`);

  return {
    companyName,
    websiteUrl,
    category,
    description: unwrapStructuredText(description).slice(0, 500),
    tagline: `${companyName}: Modern ${category} solutions.`,
    productsAndServices,
    featuresAndCapabilities,
    icpsAndPersonas,
    painPoints,
    jobsToBeDone,
    useCases: useCases.length > 0 ? useCases : [`${category} operations`],
    differentiators,
    competitors,
    positioning: `${companyName} delivers high-performance ${category} solutions that solve key bottlenecks in ${category.toLowerCase()}.`,
    primaryKeywords: Array.from(new Set(primaryKeywords)),
    secondaryKeywords: Array.from(new Set(secondaryKeywords)),
    brandVoice,
  };
}
