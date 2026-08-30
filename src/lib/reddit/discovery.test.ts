import { describe, it, expect } from "vitest";
import { generateRedditSearchMap } from "./search-map";
import { runDeterministicPreFilter } from "./pre-filter";
import { evaluateRedditOpportunity } from "./scorer";
import { generateRedditReplyVariants } from "./writer";
import { clusterSignals, type MarketSignal } from "../signals/store";
import type { CompanyMemory } from "./company-memory";

const mockMemory: CompanyMemory = {
  companyName: "The Smarketers",
  websiteUrl: "https://thesmarketers.com",
  category: "B2B Marketing & Demand Generation",
  description: "A B2B marketing agency that handles account-based marketing (ABM) and automated SEO client reporting.",
  tagline: "High-growth B2B demand generation",
  productsAndServices: [
    "Full-Funnel Demand Generation",
    "Account-Based Marketing (ABM)",
    "Automated Technical Audits & SEO Reporting",
  ],
  featuresAndCapabilities: [
    "Automated multi-engine search visibility tracking",
    "White-label client reporting workflows",
  ],
  icpsAndPersonas: [
    {
      title: "B2B Marketing Agency Owner",
      role: "Agency Founder / CEO",
      description: "Runs an agency looking to scale client reporting and audits.",
      painPoints: ["Spending 5+ hours per client compiling SEO reports manually"],
    },
  ],
  painPoints: [
    "Manual client SEO reporting takes 5+ hours per client every month",
    "Legacy SEO tools are too expensive and lack white-label features",
  ],
  jobsToBeDone: [
    "Automate monthly client SEO & AI visibility audits without manual data entry",
  ],
  useCases: ["Automated agency client SEO reporting"],
  differentiators: [
    "Evidence-led architecture that never hallucinates metrics",
    "Built specifically for agencies with white-label outputs",
  ],
  competitors: [
    { name: "Screaming Frog", website: "https://screamingfrog.co.uk" },
    { name: "Semrush", website: "https://semrush.com" },
  ],
  positioning: "The Smarketers automates agency reporting and technical audit production.",
  primaryKeywords: ["the smarketers", "seo audit tool", "automated seo reporting", "agency reporting software"],
  secondaryKeywords: ["screaming frog alternative", "semrush alternative for agencies"],
  brandVoice: {
    tone: "Helpful, authoritative, concise, transparent.",
    principles: ["Answer directly before introducing solution", "Disclose affiliation clearly"],
    allowedClaims: ["Automates technical audits and client reporting"],
    forbiddenPhrases: ["Best tool in the world", "Guaranteed #1 ranking"],
  },
};

describe("Reddit Continuous Opportunity Discovery System", () => {
  it("generates a dynamic Search Map containing all 7 query families", () => {
    const searchMap = generateRedditSearchMap(mockMemory);

    expect(searchMap.queryFamilies.direct_product.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.recommendation_buying.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.pain_problem.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.competitor.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.jobs_to_be_done.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.comparison.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.broader_icp.length).toBeGreaterThan(0);
    expect(searchMap.allQueries.length).toBeGreaterThanOrEqual(15);
    expect(searchMap.prioritySubreddits).toContain("r/SEO");
  });

  it("filters out promotional spam, duplicates, and processed opportunities deterministically", () => {
    const rawCandidates = [
      {
        id: "cand-1",
        url: "https://reddit.com/r/SEO/comments/123/good_tool",
        subreddit: "r/SEO",
        title: "Looking for best automated client SEO reporting tool for agency",
        excerpt: "We spend 5 hours per client on manual SEO audits. Any good tools?",
        author: "seo_guy",
        publishedAt: new Date().toISOString(),
        score: 25,
        numComments: 14,
        query: "best SEO audit tool",
        queryFamily: "direct_product",
        discoverySource: "Reddit RSS",
      },
      {
        // Duplicate URL
        id: "cand-2",
        url: "https://reddit.com/r/SEO/comments/123/good_tool",
        subreddit: "r/SEO",
        title: "Looking for best automated client SEO reporting tool for agency",
        excerpt: "We spend 5 hours per client on manual SEO audits. Any good tools?",
        author: "seo_guy",
        publishedAt: new Date().toISOString(),
        score: 25,
        numComments: 14,
        query: "best SEO audit tool",
        queryFamily: "direct_product",
        discoverySource: "Reddit RSS",
      },
      {
        // Promotional spam
        id: "cand-3",
        url: "https://reddit.com/r/SEO/comments/456/spam",
        subreddit: "r/SEO",
        title: "Use my discount code for cheap backlinks now!",
        excerpt: "Get 50% discount code with affiliate link dm me for price",
        author: "spammer",
        publishedAt: new Date().toISOString(),
        score: 1,
        numComments: 0,
        query: "SEO audit tool",
        queryFamily: "direct_product",
        discoverySource: "Reddit RSS",
      },
    ];

    const processedIds = new Set<string>(["cand-999"]);
    const filtered = runDeterministicPreFilter(rawCandidates, mockMemory, processedIds);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("cand-1");
  });

  it("calculates explainable 8-factor score and classifies intent correctly", () => {
    const candidate = {
      id: "opp-rec-1",
      url: "https://reddit.com/r/agency/comments/789/recommend_tool",
      subreddit: "r/agency",
      title: "Recommend an SEO audit and client reporting tool for growing digital agencies",
      excerpt: "Screaming Frog is too manual for multi-client workflows. We need white-label automated reporting.",
      author: "agency_lead",
      publishedAt: new Date().toISOString(),
      score: 35,
      numComments: 20,
      query: "recommend an SEO tool",
      queryFamily: "recommendation_buying",
      discoverySource: "Reddit JSON",
      passedPreFilter: true as const,
    };

    const evaluated = evaluateRedditOpportunity(candidate, mockMemory);

    expect(evaluated.intent).toBe("RECOMMENDATION_REQUEST");
    expect(evaluated.score.total).toBeGreaterThanOrEqual(80);
    expect(evaluated.score.intent).toBe(24);
    expect(evaluated.score.tier).toMatch(/high|exceptional/);
    expect(evaluated.recommendedAction).toBe("DIRECT_RECOMMENDATION");
    expect(evaluated.evidence.length).toBeGreaterThanOrEqual(4);
    expect(evaluated.spamRisk).toBeLessThan(0.3);
  });

  it("generates 3 distinct reply variants (Helpful, Conversational, Product-Aware)", () => {
    const candidate = {
      id: "opp-rec-1",
      url: "https://reddit.com/r/agency/comments/789/recommend_tool",
      subreddit: "r/agency",
      title: "Recommend an SEO audit and client reporting tool for growing digital agencies",
      excerpt: "Screaming Frog is too manual for multi-client workflows. We need white-label automated reporting.",
      author: "agency_lead",
      publishedAt: new Date().toISOString(),
      score: 35,
      numComments: 20,
      query: "recommend an SEO tool",
      queryFamily: "recommendation_buying",
      discoverySource: "Reddit JSON",
      passedPreFilter: true as const,
    };

    const evaluated = evaluateRedditOpportunity(candidate, mockMemory);
    const variants = generateRedditReplyVariants(evaluated, mockMemory);

    expect(variants.length).toBe(3);
    expect(variants[0].tone).toBe("helpful");
    expect(variants[1].tone).toBe("conversational");
    expect(variants[2].tone).toBe("product_aware");
    expect(variants[2].text).toContain("The Smarketers");
    expect(variants[2].text).toMatch(/disclosure/i);
  });

  it("clusters recurring signals across discussions for cross-agent intelligence", () => {
    const signals: MarketSignal[] = [
      {
        id: "sig-1",
        source: "reddit",
        type: "customer_pain",
        topic: "manual reporting bottleneck",
        strength: 0.9,
        evidence: ["SEO reporting takes too long in r/agency"],
        createdAt: new Date().toISOString(),
      },
      {
        id: "sig-2",
        source: "reddit",
        type: "customer_pain",
        topic: "manual reporting bottleneck",
        strength: 0.85,
        evidence: ["Hours spent on manual client reports in r/SEO"],
        createdAt: new Date().toISOString(),
      },
      {
        id: "sig-3",
        source: "reddit",
        type: "competitor_dissatisfaction",
        topic: "screaming frog pricing",
        strength: 0.8,
        evidence: ["Screaming Frog license limits"],
        createdAt: new Date().toISOString(),
      },
    ];

    const clusters = clusterSignals(signals);
    const reportingCluster = clusters.find((c) => c.topic === "manual reporting bottleneck");

    expect(reportingCluster).toBeDefined();
    expect(reportingCluster?.signals.length).toBe(2);
    expect(reportingCluster?.totalStrength).toBeGreaterThan(0.8);
  });

  it("shifts 100% to company-specific niche (e.g. Shopify / Ecommerce) and avoids generic SEO", () => {
    const ecommerceMemory: CompanyMemory = {
      companyName: "InventorySync Pro",
      websiteUrl: "https://inventorysyncpro.io",
      category: "Shopify Multi-Channel Inventory Management",
      description: "Real-time inventory synchronization across Shopify, Amazon, and eBay stores.",
      tagline: "Automated e-commerce inventory sync",
      productsAndServices: [
        "Real-Time Shopify Inventory Sync",
        "Multi-Store Warehouse Tracking",
        "Automated Stock Level Alerts",
      ],
      featuresAndCapabilities: [
        "Instant webhook updates",
        "Zero overselling stock locks",
      ],
      icpsAndPersonas: [
        {
          title: "Multi-Store Shopify Merchant",
          role: "Ecommerce Operations Director",
          description: "Runs multiple 7-figure Shopify stores selling across channels.",
          painPoints: ["Overselling stock when sales spike on TikTok and Shopify simultaneously"],
        },
      ],
      painPoints: [
        "Overselling stock across multiple Shopify stores",
        "Manual CSV inventory updates take 10+ hours a week",
      ],
      jobsToBeDone: [
        "Sync stock levels between Shopify and Amazon in under 3 seconds",
      ],
      useCases: ["Multi-store Shopify stock sync"],
      differentiators: [
        "Sub-second sync latency",
        "Native Shopify POS integration",
      ],
      competitors: [
        { name: "Stitch Labs", website: "https://stitchlabs.com" },
        { name: "Sellbrite", website: "https://sellbrite.com" },
      ],
      positioning: "The fastest real-time inventory sync platform for high-volume Shopify merchants.",
      primaryKeywords: ["shopify inventory sync", "multi store stock sync", "inventory management app"],
      secondaryKeywords: ["stitch labs alternative", "sellbrite alternative"],
      brandVoice: {
        tone: "Practical, merchant-first, concise.",
        principles: ["Direct answers", "Disclose affiliation clearly"],
        allowedClaims: ["Sub-second sync"],
        forbiddenPhrases: ["Best ever"],
      },
    };

    const searchMap = generateRedditSearchMap(ecommerceMemory);

    // Subreddits should reflect ecommerce & Shopify, NOT SEO
    expect(searchMap.prioritySubreddits).toContain("r/shopify");
    expect(searchMap.prioritySubreddits).toContain("r/ecommerce");

    // All queries must be ecommerce-specific
    const allQueryTexts = searchMap.allQueries.map((q) => q.query.toLowerCase()).join(" ");
    expect(allQueryTexts).toContain("shopify");
    expect(allQueryTexts).toContain("inventory");
    expect(allQueryTexts).not.toContain("seo audit");
    expect(allQueryTexts).not.toContain("screaming frog");
  });
});
