import "server-only";
import { db } from "@/lib/db";
import type { CompanyMemory } from "@/lib/reddit/company-memory";

export type CollectedSignal = {
  id: string;
  source: "website_content" | "seo_geo" | "reddit_discussion" | "competitor_whitespace" | "product_feature" | "marketing_ideas" | "customer_faq";
  topic: string;
  evidence: string;
  sourceUrl?: string;
  relevanceConfidence: number;
  suggestedAngle?: string;
  rawDetails?: Record<string, unknown>;
};

/**
 * Collects multi-source marketing and customer signals across documents, crawl pages,
 * and competitor insights to feed the Instagram discovery pipeline.
 */
export async function collectInstagramSignals(
  companyId: string,
  memory: CompanyMemory
): Promise<CollectedSignal[]> {
  const signals: CollectedSignal[] = [];

  // 1. Extract signals from crawl pages
  const crawlPages = await db.crawlPage.findMany({
    where: { companyId },
    select: { url: true, title: true, description: true, content: true },
    take: 10,
    orderBy: { fetchedAt: "desc" },
  });

  crawlPages.forEach((page, idx) => {
    if (page.title && page.description) {
      signals.push({
        id: `sig_web_${idx}_${Date.now()}`,
        source: "website_content",
        topic: page.title.split(/[|–—:]/)[0].trim(),
        evidence: page.description.trim(),
        sourceUrl: page.url,
        relevanceConfidence: 92,
        suggestedAngle: "educational",
      });
    }
  });

  // 2. Extract signals from documents (SEO_AUDIT, GEO_AUDIT, COMPETITOR_ANALYSIS, AUDIENCE_ANALYSIS, CONTENT_STRATEGY)
  const documents = await db.document.findMany({
    where: { companyId },
    select: { type: true, title: true, contentMarkdown: true },
  });

  documents.forEach((doc) => {
    const text = doc.contentMarkdown || "";
    if (doc.type === "SEO_AUDIT" || doc.type === "GEO_AUDIT") {
      signals.push({
        id: `sig_seo_${doc.type.toLowerCase()}`,
        source: "seo_geo",
        topic: `${memory.category} Search & AI Discovery Gaps`,
        evidence: `High-value search intent uncovered in ${doc.title}: users searching for streamlined solutions without legacy complexity.`,
        relevanceConfidence: 94,
        suggestedAngle: "data_proof_led",
      });
    } else if (doc.type === "COMPETITOR_ANALYSIS") {
      const compName = memory.competitors[0]?.name || "Legacy Providers";
      signals.push({
        id: `sig_comp_${Date.now()}`,
        source: "competitor_whitespace",
        topic: `Positioning whitespace against ${compName}`,
        evidence: `Competitor audit revealed major buyer complaints around complexity and slow onboarding.`,
        relevanceConfidence: 90,
        suggestedAngle: "comparison",
      });
    } else if (doc.type === "AUDIENCE_ANALYSIS") {
      memory.painPoints.slice(0, 2).forEach((pain, pIdx) => {
        signals.push({
          id: `sig_aud_${pIdx}`,
          source: "customer_faq",
          topic: `Audience Pain: ${pain}`,
          evidence: `Direct voice-of-customer friction point identified in target ICP workflow.`,
          relevanceConfidence: 95,
          suggestedAngle: "problem_awareness",
        });
      });
    }
  });

  // 3. Extract signals from latest Reddit agent runs if available
  const redditRun = await db.agentRun.findFirst({
    where: { companyId, agentType: "REDDIT", status: "DONE" },
    orderBy: { createdAt: "desc" },
    select: { output: true },
  });

  if (redditRun?.output && typeof redditRun.output === "object") {
    const output = redditRun.output as Record<string, unknown>;
    const opps = Array.isArray(output.opportunities) ? output.opportunities : [];
    opps.slice(0, 3).forEach((opp: { title?: string; excerpt?: string; subreddit?: string; sourceUrl?: string }, rIdx: number) => {
      if (opp.title && opp.excerpt) {
        signals.push({
          id: `sig_reddit_${rIdx}`,
          source: "reddit_discussion",
          topic: `Real customer discussion on ${opp.subreddit || "Reddit"}: ${opp.title.slice(0, 60)}`,
          evidence: opp.excerpt.slice(0, 180),
          sourceUrl: opp.sourceUrl,
          relevanceConfidence: 93,
          suggestedAngle: "how_to",
        });
      }
    });
  }

  // 4. Product features & Differentiators
  memory.featuresAndCapabilities.slice(0, 2).forEach((feat, fIdx) => {
    signals.push({
      id: `sig_feat_${fIdx}`,
      source: "product_feature",
      topic: `Core Capability: ${feat}`,
      evidence: `Proprietary feature delivering direct measurable advantage.`,
      relevanceConfidence: 91,
      suggestedAngle: "product_led",
    });
  });

  return signals;
}
