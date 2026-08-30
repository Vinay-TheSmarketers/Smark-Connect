import type { CompanyMemory } from "./company-memory";

export type QueryFamilyType =
  | "direct_product"
  | "recommendation_buying"
  | "pain_problem"
  | "competitor"
  | "jobs_to_be_done"
  | "comparison"
  | "broader_icp";

export type SearchMapQuery = {
  id: string;
  query: string;
  family: QueryFamilyType;
  label: string;
  targetSubreddits?: string[];
  priority: "high" | "medium" | "standard";
  expectedIntent: string;
};

export type RedditOpportunitySearchMap = {
  companyName: string;
  category: string;
  generatedAt: string;
  prioritySubreddits: string[];
  queryFamilies: Record<QueryFamilyType, SearchMapQuery[]>;
  allQueries: SearchMapQuery[];
};

export const DEFAULT_PRIORITY_SUBREDDITS = [
  "r/SEO",
  "r/marketing",
  "r/agency",
  "r/SaaS",
  "r/webdev",
  "r/bigseo",
  "r/digitalmarketing",
  "r/GrowthHacking",
  "r/Entrepreneur",
  "r/smallbusiness",
];

/**
 * Automatically generates and maintains the Reddit Opportunity Search Map
 * across all 7 required query families based on Company Memory and marketing skills.
 */
export function generateRedditSearchMap(
  memory: CompanyMemory,
  customSubreddits?: string[],
  customKeywords?: string[]
): RedditOpportunitySearchMap {
  const compName = memory.companyName;
  const category = memory.category || "SEO & Demand Gen";
  const competitors = memory.competitors.map((c) => c.name).filter(Boolean);
  const primaryCompetitor = competitors[0] || "Screaming Frog";
  const secondaryCompetitor = competitors[1] || "Semrush";

  const subreddits = Array.from(
    new Set([
      ...(customSubreddits || []),
      ...DEFAULT_PRIORITY_SUBREDDITS,
    ])
  ).slice(0, 20);

  // 1. Direct Product/Category Searches
  const directProduct: SearchMapQuery[] = [
    {
      id: "dp-1",
      query: `best SEO audit tool`,
      family: "direct_product",
      label: "Best SEO Audit Tool",
      priority: "high",
      expectedIntent: "BUYING_INTENT",
    },
    {
      id: "dp-2",
      query: `SEO audit software agency`,
      family: "direct_product",
      label: "SEO Audit Software for Agencies",
      priority: "high",
      expectedIntent: "BUYING_INTENT",
    },
    {
      id: "dp-3",
      query: `automated client SEO reporting software`,
      family: "direct_product",
      label: "Automated SEO Reporting Software",
      priority: "high",
      expectedIntent: "BUYING_INTENT",
    },
    {
      id: "dp-4",
      query: `GEO AI search optimization tool`,
      family: "direct_product",
      label: "GEO / AI Search Optimization Tool",
      priority: "medium",
      expectedIntent: "BUYING_INTENT",
    },
  ];

  // 2. Recommendation / Buying Intent Searches
  const recommendationBuying: SearchMapQuery[] = [
    {
      id: "rb-1",
      query: `recommend an SEO tool`,
      family: "recommendation_buying",
      label: "Recommend an SEO Tool",
      priority: "high",
      expectedIntent: "RECOMMENDATION_REQUEST",
    },
    {
      id: "rb-2",
      query: `what tool should I use for SEO audit`,
      family: "recommendation_buying",
      label: "What Tool Should I Use",
      priority: "high",
      expectedIntent: "RECOMMENDATION_REQUEST",
    },
    {
      id: "rb-3",
      query: `looking for client reporting software agency`,
      family: "recommendation_buying",
      label: "Looking For Reporting Software",
      priority: "high",
      expectedIntent: "BUYING_INTENT",
    },
    {
      id: "rb-4",
      query: `best tool for website technical audit`,
      family: "recommendation_buying",
      label: "Best Tool for Website Audits",
      priority: "high",
      expectedIntent: "RECOMMENDATION_REQUEST",
    },
  ];

  // 3. Pain / Problem Searches
  const painProblem: SearchMapQuery[] = [
    {
      id: "pp-1",
      query: `SEO reporting takes too long`,
      family: "pain_problem",
      label: "SEO Reporting Takes Too Long",
      priority: "high",
      expectedIntent: "PAIN_POINT",
    },
    {
      id: "pp-2",
      query: `how do I automate client SEO reports`,
      family: "pain_problem",
      label: "Automate Client Reports",
      priority: "high",
      expectedIntent: "PAIN_POINT",
    },
    {
      id: "pp-3",
      query: `spending hours building SEO reports`,
      family: "pain_problem",
      label: "Hours Building SEO Reports",
      priority: "medium",
      expectedIntent: "PAIN_POINT",
    },
    {
      id: "pp-4",
      query: `struggling with site audit crawls`,
      family: "pain_problem",
      label: "Struggling With Crawl Limits",
      priority: "medium",
      expectedIntent: "PAIN_POINT",
    },
  ];

  // 4. Competitor Searches
  const competitorSearches: SearchMapQuery[] = [
    {
      id: "comp-1",
      query: `${primaryCompetitor} alternative`,
      family: "competitor",
      label: `${primaryCompetitor} Alternative`,
      priority: "high",
      expectedIntent: "COMPETITOR_DISSATISFACTION",
    },
    {
      id: "comp-2",
      query: `${secondaryCompetitor} too expensive`,
      family: "competitor",
      label: `${secondaryCompetitor} Too Expensive`,
      priority: "high",
      expectedIntent: "COMPETITOR_DISSATISFACTION",
    },
    {
      id: "comp-3",
      query: `switching from ${primaryCompetitor}`,
      family: "competitor",
      label: `Switching From ${primaryCompetitor}`,
      priority: "high",
      expectedIntent: "COMPETITOR_DISSATISFACTION",
    },
    {
      id: "comp-4",
      query: `best alternative to ${secondaryCompetitor}`,
      family: "competitor",
      label: `Best Alternative to ${secondaryCompetitor}`,
      priority: "medium",
      expectedIntent: "COMPETITOR_DISSATISFACTION",
    },
  ];

  // 5. Jobs-To-Be-Done (JTBD) Searches
  const jtbdSearches: SearchMapQuery[] = [
    {
      id: "jtbd-1",
      query: `how to audit 50 client websites`,
      family: "jobs_to_be_done",
      label: "How to Audit 50 Client Websites",
      priority: "high",
      expectedIntent: "HOW_TO_QUESTION",
    },
    {
      id: "jtbd-2",
      query: `how agencies automate reporting`,
      family: "jobs_to_be_done",
      label: "How Agencies Automate Reporting",
      priority: "high",
      expectedIntent: "HOW_TO_QUESTION",
    },
    {
      id: "jtbd-3",
      query: `white label SEO client audit workflow`,
      family: "jobs_to_be_done",
      label: "White-Label Client Audit Workflow",
      priority: "medium",
      expectedIntent: "HOW_TO_QUESTION",
    },
  ];

  // 6. Comparison Searches
  const comparisonSearches: SearchMapQuery[] = [
    {
      id: "cmp-1",
      query: `${primaryCompetitor} vs ${secondaryCompetitor}`,
      family: "comparison",
      label: `${primaryCompetitor} vs ${secondaryCompetitor}`,
      priority: "medium",
      expectedIntent: "COMPARISON",
    },
    {
      id: "cmp-2",
      query: `Ahrefs vs Semrush agency reporting`,
      family: "comparison",
      label: "Ahrefs vs Semrush for Agency Reporting",
      priority: "medium",
      expectedIntent: "COMPARISON",
    },
  ];

  // 7. Broader ICP Discussions
  const broaderIcp: SearchMapQuery[] = [
    {
      id: "icp-1",
      query: `SEO agency client retention reporting`,
      family: "broader_icp",
      label: "Agency Client Retention & Reporting",
      priority: "medium",
      expectedIntent: "INDUSTRY_DISCUSSION",
      targetSubreddits: ["r/agency", "r/marketing", "r/SEO"],
    },
    {
      id: "icp-2",
      query: `B2B SaaS demand gen pipeline audit`,
      family: "broader_icp",
      label: "B2B SaaS Pipeline & Audit Strategy",
      priority: "medium",
      expectedIntent: "INDUSTRY_DISCUSSION",
      targetSubreddits: ["r/SaaS", "r/GrowthHacking"],
    },
  ];

  // Add custom keywords if provided
  if (customKeywords && customKeywords.length > 0) {
    customKeywords.slice(0, 10).forEach((kw, idx) => {
      directProduct.push({
        id: `custom-kw-${idx + 1}`,
        query: kw,
        family: "direct_product",
        label: `Custom: ${kw}`,
        priority: "high",
        expectedIntent: "BUYING_INTENT",
      });
    });
  }

  const queryFamilies = {
    direct_product: directProduct,
    recommendation_buying: recommendationBuying,
    pain_problem: painProblem,
    competitor: competitorSearches,
    jobs_to_be_done: jtbdSearches,
    comparison: comparisonSearches,
    broader_icp: broaderIcp,
  };

  const allQueries = [
    ...directProduct,
    ...recommendationBuying,
    ...painProblem,
    ...competitorSearches,
    ...jtbdSearches,
    ...comparisonSearches,
    ...broaderIcp,
  ];

  return {
    companyName: compName,
    category,
    generatedAt: new Date().toISOString(),
    prioritySubreddits: subreddits,
    queryFamilies,
    allQueries,
  };
}
