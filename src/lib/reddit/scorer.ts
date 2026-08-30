import type { FilteredCandidate } from "./pre-filter";
import type { CompanyMemory } from "./company-memory";

export type OpportunityIntent =
  | "BUYING_INTENT"
  | "RECOMMENDATION_REQUEST"
  | "COMPETITOR_DISSATISFACTION"
  | "PAIN_POINT"
  | "HOW_TO_QUESTION"
  | "COMPARISON"
  | "INDUSTRY_DISCUSSION"
  | "CONTENT_SIGNAL"
  | "IRRELEVANT";

export type DecisionAction =
  | "DO_NOT_ENGAGE"
  | "MONITOR"
  | "EDUCATIONAL_REPLY"
  | "ASK_FOLLOW_UP"
  | "SOFT_PRODUCT_MENTION"
  | "DIRECT_RECOMMENDATION";

export type OpportunityScoreFactors = {
  intent: number; // 0 - 25
  productFit: number; // 0 - 20
  icpFit: number; // 0 - 15
  relevance: number; // 0 - 15
  recency: number; // 0 - 10
  engagement: number; // 0 - 5
  actionability: number; // 0 - 5
  confidence: number; // 0 - 5
  total: number; // 0 - 100
  tier: "exceptional" | "high" | "medium" | "low";
};

export type EvaluatedRedditOpportunity = {
  id: string;
  sourceUrl: string;
  subreddit: string;
  title: string;
  excerpt: string;
  author: string;
  intent: OpportunityIntent;
  intentLabel: string;
  matchedIcp: string;
  matchedProblem: string;
  matchedProduct: string;
  competitor: string | null;
  score: OpportunityScoreFactors;
  confidence: number;
  spamRisk: number; // 0.0 to 1.0
  whyItMatters: string;
  evidence: string[];
  recommendedAction: DecisionAction;
  recommendedActionLabel: string;
  discoveredAt: string;
  publishedAt: string | null;
  upvotes: number;
  commentsCount: number;
  queryFamily: string;
};

/**
 * Classifies the intent of a Reddit candidate discussion.
 */
function classifyIntent(title: string, excerpt: string): { intent: OpportunityIntent; label: string } {
  const text = `${title} ${excerpt}`.toLowerCase();

  if (
    /recommend|what tool|which tool|looking for|best software|best tool|any tool that|what are you using for/i.test(text)
  ) {
    return { intent: "RECOMMENDATION_REQUEST", label: "Recommendation Request" };
  }

  if (
    /buy|pricing|budget|subscription|hire|contractor|vendor|purchase|trial|switching to/i.test(text)
  ) {
    return { intent: "BUYING_INTENT", label: "High Buying Intent" };
  }

  if (
    /too expensive|hate|broken|clunky|pricing increased|switched from|alternative to|unhappy with|leaving/i.test(text) &&
    /semrush|ahrefs|screaming frog|brightlocal|moz|hubspot|agencyanalytics/i.test(text)
  ) {
    return { intent: "COMPETITOR_DISSATISFACTION", label: "Competitor Dissatisfaction" };
  }

  if (
    /vs|compared to|difference between|versus|alternative/i.test(text)
  ) {
    return { intent: "COMPARISON", label: "Comparison / Evaluation" };
  }

  if (
    /takes too long|manual|frustrated|struggling|headache|bottleneck|waste of time|slow|impossible/i.test(text)
  ) {
    return { intent: "PAIN_POINT", label: "Customer Pain Point" };
  }

  if (
    /how do i|how to|best practice|guide|workflow|how do you guys|tutorial/i.test(text)
  ) {
    return { intent: "HOW_TO_QUESTION", label: "How-To Question" };
  }

  if (
    /discussion|future of|ai in seo|trends|opinion|hot take|state of/i.test(text)
  ) {
    return { intent: "INDUSTRY_DISCUSSION", label: "Industry Discussion" };
  }

  return { intent: "CONTENT_SIGNAL", label: "Content Signal" };
}

/**
 * Evaluates a candidate Reddit post against Company Memory using the explainable 8-factor score.
 */
export function evaluateRedditOpportunity(
  candidate: FilteredCandidate,
  memory: CompanyMemory,
  adaptiveWeights?: { boostedSubreddits?: string[]; boostedIntents?: string[]; dismissedCount?: number }
): EvaluatedRedditOpportunity {
  const text = `${candidate.title} ${candidate.excerpt} ${candidate.subreddit}`.toLowerCase();
  const { intent, label: intentLabel } = classifyIntent(candidate.title, candidate.excerpt);

  // 1. ICP Matching
  const isAgency = /agency|agencies|client|freelance|consultant|multi-account|whitelabel|white-label/i.test(text);
  const isSaasMarketer = /b2b|saas|demand gen|growth|pipeline|abm|product marketing/i.test(text);
  const isTechSeo = /technical seo|crawl|schema|core web vitals|rendering|indexation|lighthouse|site speed/i.test(text);

  let matchedIcp = memory.icpsAndPersonas[0]?.title || "B2B Marketing Agency Owner";
  if (isAgency) matchedIcp = "B2B Marketing Agency Owner";
  else if (isSaasMarketer) matchedIcp = "In-House Demand Gen / Growth Lead";
  else if (isTechSeo) matchedIcp = "Technical SEO & RevOps Lead";

  // 2. Problem Matching
  let matchedProblem = memory.painPoints[0] || "Manual client SEO reporting takes too much time";
  if (/report|reporting|dashboard|client presentation|hours/i.test(text)) {
    matchedProblem = "Manual client SEO reporting takes 5+ hours per client every month";
  } else if (/crawl|audit|slow|broken|architecture/i.test(text)) {
    matchedProblem = "Slow and limited multi-domain technical audits and crawl diagnostics";
  } else if (/expensive|price|cost|billing|tier/i.test(text)) {
    matchedProblem = "Legacy SEO tooling locking essential multi-client features behind high prices";
  } else if (/geo|ai search|perplexity|chatgpt|citations/i.test(text)) {
    matchedProblem = "Lack of visibility and readiness for AI answer engines (GEO)";
  }

  // 3. Product Match
  const matchedProduct = memory.productsAndServices[0] || `${memory.companyName} Automated Intelligence Platform`;

  // 4. Competitor Detection
  let detectedCompetitor: string | null = null;
  for (const comp of memory.competitors) {
    if (comp.name && new RegExp(`\\b${comp.name.toLowerCase()}\\b`, "i").test(text)) {
      detectedCompetitor = comp.name;
      break;
    }
  }
  if (!detectedCompetitor) {
    const commonComps = ["Screaming Frog", "Semrush", "Ahrefs", "BrightLocal", "Moz", "AgencyAnalytics"];
    for (const comp of commonComps) {
      if (new RegExp(`\\b${comp.toLowerCase()}\\b`, "i").test(text)) {
        detectedCompetitor = comp;
        break;
      }
    }
  }

  // 5. Calculate 8-Factor Score (0-100)
  // Factor 1: Intent (0 - 25)
  let intentScore = 14;
  if (intent === "BUYING_INTENT") intentScore = 25;
  else if (intent === "RECOMMENDATION_REQUEST") intentScore = 24;
  else if (intent === "COMPETITOR_DISSATISFACTION") intentScore = 22;
  else if (intent === "PAIN_POINT") intentScore = 20;
  else if (intent === "HOW_TO_QUESTION") intentScore = 16;
  else if (intent === "COMPARISON") intentScore = 18;
  else if (intent === "INDUSTRY_DISCUSSION") intentScore = 12;

  // Factor 2: Product / Problem Fit (0 - 20)
  let productFitScore = 12;
  if (
    /audit|report|automated|crawl|demand gen|abm|white-label/i.test(text)
  ) {
    productFitScore = 19;
  } else if (/seo|marketing|tools|software/i.test(text)) {
    productFitScore = 16;
  }

  // Factor 3: ICP Fit (0 - 15)
  let icpFitScore = 10;
  if (isAgency) icpFitScore = 15;
  else if (isSaasMarketer || isTechSeo) icpFitScore = 14;
  else if (/founder|owner|marketer|growth/i.test(text)) icpFitScore = 12;

  // Factor 4: Relevance (0 - 15)
  const relevanceTermsCount = memory.primaryKeywords.filter((kw) => text.includes(kw.toLowerCase())).length;
  const relevanceScore = Math.min(15, 10 + relevanceTermsCount * 2);

  // Factor 5: Recency (0 - 10)
  let recencyScore = 8;
  if (candidate.publishedAt) {
    const ageDays = (Date.now() - new Date(candidate.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 1) recencyScore = 10;
    else if (ageDays <= 3) recencyScore = 9;
    else if (ageDays <= 7) recencyScore = 8;
    else if (ageDays <= 14) recencyScore = 6;
    else recencyScore = 4;
  }

  // Factor 6: Conversation & Engagement Potential (0 - 5)
  let engagementScore = 3;
  if (candidate.numComments > 10 || candidate.score > 20) engagementScore = 5;
  else if (candidate.numComments >= 3 || candidate.score >= 5) engagementScore = 4;

  // Factor 7: Actionability (0 - 5)
  let actionabilityScore = 3;
  if (["BUYING_INTENT", "RECOMMENDATION_REQUEST", "COMPETITOR_DISSATISFACTION"].includes(intent)) {
    actionabilityScore = 5;
  } else if (["PAIN_POINT", "HOW_TO_QUESTION"].includes(intent)) {
    actionabilityScore = 4;
  }

  // Factor 8: Confidence (0 - 5)
  const confidenceScore = candidate.url && candidate.title.length > 20 ? 5 : 4;

  // Adaptive feedback weighting boost
  let adaptiveBoost = 0;
  if (adaptiveWeights?.boostedSubreddits?.includes(candidate.subreddit)) adaptiveBoost += 2;
  if (adaptiveWeights?.boostedIntents?.includes(intent)) adaptiveBoost += 2;

  const totalRaw = intentScore + productFitScore + icpFitScore + relevanceScore + recencyScore + engagementScore + actionabilityScore + confidenceScore + adaptiveBoost;
  const total = Math.min(100, Math.max(0, totalRaw));

  let tier: OpportunityScoreFactors["tier"] = "low";
  if (total >= 90) tier = "exceptional";
  else if (total >= 80) tier = "high";
  else if (total >= 65) tier = "medium";

  const scoreFactors: OpportunityScoreFactors = {
    intent: intentScore,
    productFit: productFitScore,
    icpFit: icpFitScore,
    relevance: relevanceScore,
    recency: recencyScore,
    engagement: engagementScore,
    actionability: actionabilityScore,
    confidence: confidenceScore,
    total,
    tier,
  };

  // 6. Spam Risk Calculation (0.0 to 1.0)
  let spamRisk = 0.08;
  if (/promo|affiliate|discount|hire me/i.test(text)) spamRisk += 0.35;
  if (candidate.score <= 1 && candidate.numComments === 0) spamRisk += 0.1;
  if (candidate.author === "reddit_user" || !candidate.author) spamRisk += 0.05;
  spamRisk = Math.min(0.95, Math.max(0.02, spamRisk));

  // 7. Decision Engine Action Selection
  let recommendedAction: DecisionAction = "EDUCATIONAL_REPLY";
  let recommendedActionLabel = "Educational Workflow Reply";

  if (spamRisk > 0.6 || tier === "low") {
    recommendedAction = "DO_NOT_ENGAGE";
    recommendedActionLabel = "Do Not Engage (Low relevance / high risk)";
  } else if (intent === "RECOMMENDATION_REQUEST" || intent === "BUYING_INTENT") {
    if (productFitScore >= 18) {
      recommendedAction = "DIRECT_RECOMMENDATION";
      recommendedActionLabel = "Direct Recommendation (with transparent disclosure)";
    } else {
      recommendedAction = "SOFT_PRODUCT_MENTION";
      recommendedActionLabel = "Helpful Answer + Soft Solution Mention";
    }
  } else if (intent === "COMPETITOR_DISSATISFACTION") {
    recommendedAction = "SOFT_PRODUCT_MENTION";
    recommendedActionLabel = "Acknowledge Friction + Contrast Alternative";
  } else if (intent === "PAIN_POINT" || intent === "HOW_TO_QUESTION") {
    recommendedAction = "EDUCATIONAL_REPLY";
    recommendedActionLabel = "Provide Step-by-Step Educational Solution";
  } else if (intent === "COMPARISON") {
    recommendedAction = "ASK_FOLLOW_UP";
    recommendedActionLabel = "Clarify Specific Use Case & Criteria";
  } else {
    recommendedAction = "MONITOR";
    recommendedActionLabel = "Monitor Conversation Trend";
  }

  // 8. Evidence Checklist
  const evidence: string[] = [
    isAgency ? "✓ Matches Agency ICP (High Commercial Fit)" : "✓ Matches Target B2B Marketer Profile",
    intent === "RECOMMENDATION_REQUEST" ? "✓ User explicitly requesting tool recommendations" :
    intent === "BUYING_INTENT" ? "✓ Explicit commercial / buying intent detected" :
    intent === "COMPETITOR_DISSATISFACTION" ? `✓ Competitor dissatisfaction detected (${detectedCompetitor || "Legacy tool"})` :
    "✓ Stated problem aligns with core platform capability",
    `✓ Product directly automates: ${matchedProblem.slice(0, 50)}…`,
    candidate.publishedAt ? `✓ Fresh discussion active within monitoring window` : "✓ Discovered through live search index",
  ];

  // 9. Why It Matters synthesis
  const whyItMatters =
    intent === "RECOMMENDATION_REQUEST"
      ? `The author is actively evaluating solutions in ${candidate.subreddit}. Recommending ${memory.companyName} with helpful context will establish authority and capture high-intent demand.`
      : intent === "COMPETITOR_DISSATISFACTION"
      ? `Frustration with ${detectedCompetitor || "current tooling"} creates an ideal opportunity to highlight your automated workflow and transparent pricing.`
      : intent === "PAIN_POINT"
      ? `Addresses the exact operational bottleneck (${matchedProblem}) that ${memory.companyName} solves, offering high value without being overly promotional.`
      : `Relevant discussion in ${candidate.subreddit} touching core domain capabilities. Replying with actionable advice builds brand trust.`;

  return {
    id: candidate.id,
    sourceUrl: candidate.url,
    subreddit: candidate.subreddit,
    title: candidate.title,
    excerpt: candidate.excerpt,
    author: candidate.author,
    intent,
    intentLabel,
    matchedIcp,
    matchedProblem,
    matchedProduct,
    competitor: detectedCompetitor,
    score: scoreFactors,
    confidence: Math.round((confidenceScore / 5) * 100),
    spamRisk,
    whyItMatters,
    evidence,
    recommendedAction,
    recommendedActionLabel,
    discoveredAt: new Date().toISOString(),
    publishedAt: candidate.publishedAt,
    upvotes: candidate.score,
    commentsCount: candidate.numComments,
    queryFamily: candidate.queryFamily,
  };
}
