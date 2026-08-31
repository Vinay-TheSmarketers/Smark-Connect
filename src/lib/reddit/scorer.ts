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
    /alternative to|leaving|cancelled|terrible support|too expensive|buggy|slow|switching from|hate/i.test(text)
  ) {
    return { intent: "COMPETITOR_DISSATISFACTION", label: "Competitor Dissatisfaction" };
  }

  if (
    /vs|compare|or|difference between|pros and cons/i.test(title.toLowerCase())
  ) {
    return { intent: "COMPARISON", label: "Tool / Approach Comparison" };
  }

  if (
    /struggling with|problem with|how do you solve|bottleneck|takes too long|manual|frustrated|failing/i.test(text)
  ) {
    return { intent: "PAIN_POINT", label: "Specific Pain Point" };
  }

  if (
    /how do i|how to|best practice|guide|workflow|how do you guys|tutorial/i.test(text)
  ) {
    return { intent: "HOW_TO_QUESTION", label: "How-To Question" };
  }

  if (
    /discussion|future of|trends|opinion|hot take|state of/i.test(text)
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

  // 1. ICP Matching from Company Memory
  let matchedIcp = memory.icpsAndPersonas[0]?.title || `${memory.category || "Target"} Decision Maker`;
  for (const icp of memory.icpsAndPersonas) {
    const roleWords = `${icp.title} ${icp.role} ${icp.description}`.toLowerCase().split(/\s+/);
    if (roleWords.some((w) => w.length > 3 && text.includes(w))) {
      matchedIcp = icp.title;
      break;
    }
  }

  // 2. Problem Matching from Company Memory
  let matchedProblem = memory.painPoints[0] || `Managing ${memory.category || "core"} workflows takes too much time`;
  for (const pain of memory.painPoints) {
    const painWords = pain.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    if (painWords.some((w) => text.includes(w))) {
      matchedProblem = pain;
      break;
    }
  }

  // 3. Product Match
  const matchedProduct = memory.productsAndServices[0] || `${memory.companyName} ${memory.category || "Platform"}`;

  // 4. Competitor Detection from Company Memory
  let detectedCompetitor: string | null = null;
  for (const comp of memory.competitors) {
    if (comp.name && new RegExp(`\\b${comp.name.toLowerCase()}\\b`, "i").test(text)) {
      detectedCompetitor = comp.name;
      break;
    }
  }

  // -------------------------------------------------------------
  // Factor 1: Intent Score (0 - 25)
  // -------------------------------------------------------------
  let intentScore = 10;
  if (intent === "BUYING_INTENT") intentScore = 25;
  else if (intent === "RECOMMENDATION_REQUEST") intentScore = 24;
  else if (intent === "COMPETITOR_DISSATISFACTION") intentScore = 22;
  else if (intent === "COMPARISON") intentScore = 19;
  else if (intent === "PAIN_POINT") intentScore = 18;
  else if (intent === "HOW_TO_QUESTION") intentScore = 14;
  else if (intent === "INDUSTRY_DISCUSSION") intentScore = 11;
  else intentScore = 8;

  // -------------------------------------------------------------
  // Factor 2: Product Fit (0 - 20)
  // -------------------------------------------------------------
  let productFitScore = 10;
  const productTerms = [
    memory.companyName,
    memory.category,
    ...memory.productsAndServices,
    ...memory.featuresAndCapabilities,
    ...(memory.primaryKeywords || []),
    ...(memory.painPoints || []),
  ].flatMap((t) => t.toLowerCase().split(/[\s,&/]+/)).filter((w) => w.length > 3 && !["with", "that", "this", "from", "your", "more", "most", "about", "into"].includes(w));

  let matchesCount = 0;
  for (const term of new Set(productTerms)) {
    if (text.includes(term)) matchesCount += 1;
  }

  if (matchesCount >= 3) productFitScore = 20;
  else if (matchesCount >= 2) productFitScore = 18;
  else if (matchesCount === 1) productFitScore = 14;
  else productFitScore = 10;

  // -------------------------------------------------------------
  // Factor 3: ICP Fit (0 - 15)
  // -------------------------------------------------------------
  let icpFitScore = 10;
  if (matchedIcp) icpFitScore = 14;

  // -------------------------------------------------------------
  // Factor 4: Relevance (0 - 15)
  // -------------------------------------------------------------
  let relevanceScore = 8;
  const painTerms = memory.painPoints.map((p) => p.toLowerCase());
  if (painTerms.some((p) => text.includes(p))) relevanceScore += 4;
  if (detectedCompetitor) relevanceScore += 3;
  relevanceScore = Math.min(15, relevanceScore);

  // -------------------------------------------------------------
  // Factor 5: Recency (0 - 10)
  // -------------------------------------------------------------
  let recencyScore = 8;
  if (candidate.publishedAt) {
    const ageDays = (Date.now() - new Date(candidate.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 1) recencyScore = 10;
    else if (ageDays <= 3) recencyScore = 9;
    else if (ageDays <= 7) recencyScore = 8;
    else if (ageDays <= 14) recencyScore = 6;
    else recencyScore = 4;
  }

  // -------------------------------------------------------------
  // Factor 6: Conversation & Engagement Potential (0 - 5)
  // -------------------------------------------------------------
  let engagementScore = 3;
  if (candidate.numComments > 10 || candidate.score > 20) engagementScore = 5;
  else if (candidate.numComments >= 3 || candidate.score >= 5) engagementScore = 4;

  // -------------------------------------------------------------
  // Factor 7: Actionability (0 - 5)
  // -------------------------------------------------------------
  let actionabilityScore = 3;
  if (["BUYING_INTENT", "RECOMMENDATION_REQUEST", "COMPETITOR_DISSATISFACTION"].includes(intent)) {
    actionabilityScore = 5;
  } else if (["PAIN_POINT", "HOW_TO_QUESTION"].includes(intent)) {
    actionabilityScore = 4;
  }

  // -------------------------------------------------------------
  // Factor 8: Confidence (0 - 5)
  // -------------------------------------------------------------
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
    `✓ Aligns with target ICP: ${matchedIcp}`,
    intent === "RECOMMENDATION_REQUEST" ? "✓ User explicitly requesting tool recommendations" :
    intent === "BUYING_INTENT" ? "✓ Explicit commercial / buying intent detected" :
    intent === "COMPETITOR_DISSATISFACTION" ? `✓ Competitor dissatisfaction detected (${detectedCompetitor || "Legacy tool"})` :
    "✓ Stated problem aligns with core platform capability",
    `✓ Product addresses: ${matchedProblem.slice(0, 50)}…`,
    candidate.publishedAt ? `✓ Fresh discussion active within monitoring window` : "✓ Discovered through live search index",
  ];

  // 9. Why It Matters synthesis
  const whyItMatters =
    intent === "RECOMMENDATION_REQUEST"
      ? `The author is actively evaluating solutions in ${candidate.subreddit}. Recommending ${memory.companyName} with helpful context will establish authority and capture high-intent demand.`
      : intent === "COMPETITOR_DISSATISFACTION"
      ? `Frustration with ${detectedCompetitor || "current tooling"} creates an ideal opportunity to highlight your automated workflow and transparent capabilities.`
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
