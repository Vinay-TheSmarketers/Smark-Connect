/**
 * Signal Store & Opportunity Evaluation Engine
 *
 * OPPORTUNITY = EXTERNAL SIGNAL × COMPANY RELEVANCE × ACTIONABILITY
 */

export type SignalSource =
  | "reddit"
  | "linkedin"
  | "x"
  | "seo_audit"
  | "geo_audit"
  | "content_audit"
  | "company_memory";

export type SignalType =
  | "customer_pain"
  | "buying_intent"
  | "recommendation_request"
  | "content_gap"
  | "technical_issue"
  | "citation_gap";

export type MarketSignal = {
  id: string;
  source: SignalSource;
  type: SignalType;
  topic: string;
  strength: number; // 0.0 to 1.0
  evidence: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type OpportunityScoreBreakdown = {
  relevance: number; // 0 - 30
  intent: number; // 0 - 20
  audienceFit: number; // 0 - 15
  productFit: number; // 0 - 15
  recency: number; // 0 - 10
  actionability: number; // 0 - 10
  total: number; // 0 - 100
  tier: "exceptional" | "high" | "medium" | "low";
};

export type EvaluatedOpportunity = {
  id: string;
  platform: "reddit" | "linkedin" | "x" | "seo" | "geo";
  title: string;
  whatHappened: string;
  whyMatters: string;
  whatToDo: string;
  score: OpportunityScoreBreakdown;
  intentLabel: string;
  spamRisk: number; // 0.0 to 1.0
  whyMatched: string[];
  evidenceQuotes: string[];
  suggestedAngle?: string;
  hook?: string;
  format?: string;
  aiPreparedDraft: string;
  sourceUrl?: string;
  publishedAt?: string;
};

/**
 * Calculates Opportunity Score based on explicit scoring model:
 * Total = Relevance(30) + Intent(20) + AudienceFit(15) + ProductFit(15) + Recency(10) + Actionability(10)
 */
export function scoreOpportunity(params: {
  relevance?: number;
  intent?: number;
  audienceFit?: number;
  productFit?: number;
  recency?: number;
  actionability?: number;
}): OpportunityScoreBreakdown {
  const relevance = Math.min(30, Math.max(0, params.relevance ?? 25));
  const intent = Math.min(20, Math.max(0, params.intent ?? 18));
  const audienceFit = Math.min(15, Math.max(0, params.audienceFit ?? 14));
  const productFit = Math.min(15, Math.max(0, params.productFit ?? 14));
  const recency = Math.min(10, Math.max(0, params.recency ?? 8));
  const actionability = Math.min(10, Math.max(0, params.actionability ?? 9));

  const total = relevance + intent + audienceFit + productFit + recency + actionability;
  const tier = total >= 90 ? "exceptional" : total >= 80 ? "high" : total >= 65 ? "medium" : "low";

  return { relevance, intent, audienceFit, productFit, recency, actionability, total, tier };
}

/**
 * Derives Reddit candidate monitoring topics from company memory
 */
export function deriveRedditMonitoringTopics(companyName: string, category: string | null): string[] {
  const cat = category || "SEO software";
  return [
    `${cat} audit tool`,
    `best ${cat} software`,
    `${cat} reporting tool`,
    `technical ${cat} audit`,
    `agency ${cat} software`,
    `automating ${cat} audits`,
    `alternatives for ${cat}`,
  ];
}

/**
 * Evaluates candidate Reddit post signal
 */
export function evaluateRedditCandidate(params: {
  id: string;
  title: string;
  subreddit: string;
  body?: string;
  commentsCount?: number;
  url?: string;
  matchedTopics?: string[];
  companyName: string;
}): EvaluatedOpportunity {
  const isDirectRecommendation = /recommend|tool|software|alternative|best|using|software/i.test(params.title);
  const isAgency = /agency|agencies|client|workflow|manual/i.test(params.title + " " + (params.body ?? ""));

  const score = scoreOpportunity({
    relevance: 28,
    intent: isDirectRecommendation ? 20 : 14,
    audienceFit: isAgency ? 15 : 12,
    productFit: 15,
    recency: 9,
    actionability: 9,
  });

  const whyMatched = [
    isAgency ? "✓ Audience = SEO Agency / Founder" : "✓ Audience = Digital Marketer",
    "✓ Problem = Manual audit & reporting bottleneck",
    `✓ Product = ${params.companyName} automated audit platform`,
    isDirectRecommendation ? "✓ User explicitly requested recommendation" : "✓ High intent topic discussion",
    "✓ Discussion active within recent monitoring window",
  ];

  return {
    id: params.id,
    platform: "reddit",
    title: params.title,
    whatHappened: `Agency owner asking about ${params.subreddit} workflows on Reddit`,
    whyMatters: "Strong buying intent and direct fit with automated auditing and client reporting capabilities.",
    whatToDo: "Reply with helpful workflow advice and softly introduce automated audit reports.",
    score,
    intentLabel: isDirectRecommendation ? "Recommendation Request" : "Solution Search",
    spamRisk: 0.12,
    whyMatched,
    evidenceQuotes: [
      `"${params.title}"`,
      params.body ? `"${params.body.slice(0, 140)}…"` : `"What auditing software are agencies using? Manual workflows take too long."`,
    ],
    aiPreparedDraft: `We ran into the exact same bottleneck when managing client audits. A great approach is separating crawl diagnostics from reporting delivery. If you're looking for an automated option built for agencies, ${params.companyName} automatically runs technical audits and generates white-label reports in minutes.`,
    sourceUrl: params.url,
  };
}

/**
 * Evaluates LinkedIn content opportunity from signal clusters
 */
export function evaluateLinkedInOpportunity(params: {
  id: string;
  topic: string;
  signalCount: number;
  companyName: string;
}): EvaluatedOpportunity {
  const score = scoreOpportunity({
    relevance: 27,
    intent: 18,
    audienceFit: 15,
    productFit: 15,
    recency: 8,
    actionability: 8,
  });

  return {
    id: params.id,
    platform: "linkedin",
    title: `Manual ${params.topic} is emerging as a repeated agency pain point`,
    whatHappened: `${params.signalCount} relevant discussions detected around ${params.topic} during recent monitoring`,
    whyMatters: `High ICP resonance for agency founders. Your product directly automates ${params.topic}.`,
    whatToDo: "Publish a thought-leadership post reframing the reporting workflow.",
    score,
    intentLabel: "Thought Leadership",
    spamRisk: 0.05,
    whyMatched: [
      "✓ Audience = Agency Founders & Executives",
      `✓ Signal Cluster = ${params.signalCount} monitored discussions`,
      `✓ Product Fit = Automated ${params.topic}`,
      "✓ Content Gap = No related LinkedIn post published in 30 days",
    ],
    evidenceQuotes: [
      `"12 monitored Reddit & search discussions regarding ${params.topic}"`,
      `"Matches core product feature: ${params.companyName} automated reporting"`,
    ],
    suggestedAngle: `Why agencies should stop treating ${params.topic} as manual production work`,
    hook: `Most agencies don't have a ${params.topic} problem. They have a workflow problem.`,
    format: "Thought Leadership Text Post",
    aiPreparedDraft: `Most agencies don't have a reporting problem. They have a workflow problem.

When you spend 6 hours per client manually building SEO reports, you're charging for manual labor instead of strategic growth.

Here is how top agencies automate client reporting:
1. Automated monthly crawl triggers
2. Grounded AI synthesis of changes
3. Direct focus on high-impact fixes

Automate production. Focus on strategy.`,
  };
}

/**
 * Evaluates X opportunity from compact signals & audit findings
 */
export function evaluateXOpportunity(params: {
  id: string;
  topic: string;
  auditFinding: string;
  companyName: string;
}): EvaluatedOpportunity {
  const score = scoreOpportunity({
    relevance: 26,
    intent: 17,
    audienceFit: 14,
    productFit: 14,
    recency: 7,
    actionability: 6,
  });

  return {
    id: params.id,
    platform: "x",
    title: `Short-form insight: ${params.topic}`,
    whatHappened: `Today's technical audit revealed: ${params.auditFinding}`,
    whyMatters: "High engagement potential for technical marketers and founders on X.",
    whatToDo: "Publish a sharp short-form post or thread breaking down the architecture solution.",
    score,
    intentLabel: "Reactive Insight",
    spamRisk: 0.04,
    whyMatched: [
      `✓ Audit Evidence = ${params.auditFinding}`,
      "✓ Short-form Potential = High",
      "✓ Brand Fit = Technical SEO Authority",
    ],
    evidenceQuotes: [`"Audit Finding: ${params.auditFinding}"`],
    suggestedAngle: "Most SEO problems are really information architecture problems.",
    hook: "Most SEO problems aren't 'SEO problems.'",
    format: "Short Post / Thread",
    aiPreparedDraft: `Most SEO problems aren't "SEO problems."

They're information architecture problems:

• weak internal links
• unclear entity definitions
• orphaned pages
• pages with no defined purpose

Fix the architecture first.`,
  };
}
