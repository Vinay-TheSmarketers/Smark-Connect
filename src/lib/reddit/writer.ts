import type { EvaluatedRedditOpportunity } from "./scorer";
import type { CompanyMemory } from "./company-memory";

export type ReplyVariant = {
  id: string;
  label: string;
  tone: "helpful" | "conversational" | "product_aware";
  text: string;
  reasoning: string;
};

/**
 * Generates 2-3 native, transparent, high-value Reddit response variants
 * tailored to the original discussion, subreddit context, company memory, and brand voice.
 */
export function generateRedditReplyVariants(
  opportunity: EvaluatedRedditOpportunity,
  memory: CompanyMemory
): ReplyVariant[] {
  const compName = memory.companyName;
  const sub = opportunity.subreddit;
  const isRecRequest = opportunity.intent === "RECOMMENDATION_REQUEST" || opportunity.intent === "BUYING_INTENT";
  const isCompetitor = opportunity.intent === "COMPETITOR_DISSATISFACTION";

  // Variant 1: Helpful / Educational (Pure value, actionable workflow)
  let helpfulText = "";
  if (opportunity.title.toLowerCase().includes("report") || opportunity.matchedProblem.toLowerCase().includes("report")) {
    helpfulText = `When handling technical audits and client reporting at scale, separating crawler diagnostics from reporting delivery is usually the biggest time saver.

A reliable 3-step workflow:
1. **Automate the crawl trigger:** Run automated monthly site audits so diagnostics are ready before you start client work.
2. **Highlight delta fixes:** Clients don't want raw 100-page issue dumps; summarize only the top 3 high-impact architectural fixes with before/after benchmarks.
3. **Template the executive summary:** Keep the strategic narrative consistent while letting automated systems compile the technical tables.

Saves about 4-5 hours per client every month.`;
  } else if (opportunity.title.toLowerCase().includes("crawl") || opportunity.title.toLowerCase().includes("audit")) {
    helpfulText = `If you're dealing with slow site crawls or hitting memory limits on large sites, a few quick architectural adjustments make a huge difference:

1. **Exclude non-canonical parameters** (like tracking tags and internal search paths) at the crawler configuration stage.
2. **Run headless browser rendering only on pages that require client-side JS**, rather than the entire domain.
3. **Separate Core Web Vitals lab runs from internal link validation** so you don't bottle-neck your audit pipeline.

Focusing on internal link depth and orphan page detection usually uncovers 80% of actionable crawl errors.`;
  } else {
    helpfulText = `Great question. The most practical way to tackle this is to break down the process into diagnostic vs execution phases.

1. First, establish a clear baseline using reliable objective metrics (like response times and structured entity graphs).
2. Prioritize fixes by commercial impact rather than raw issue volume.
3. Document each change with verifiable proof so stakeholders clearly understand the value.

Hope this breakdown helps point you in the right direction!`;
  }

  const variantHelpful: ReplyVariant = {
    id: `${opportunity.id}-var-helpful`,
    label: "Helpful / Educational",
    tone: "helpful",
    text: helpfulText,
    reasoning: "Focuses 100% on actionable workflow value without promotional language. Ideal for establishing domain credibility.",
  };

  // Variant 2: Conversational / Clarifying (Empathetic, shares rule of thumb)
  let conversationalText = "";
  if (isCompetitor) {
    conversationalText = `Ran into the exact same frustration with ${opportunity.competitor || "legacy SEO platforms"} last year. The pricing jumps once you add team seats or multi-client workspaces are brutal.

Are you looking primarily for the deep technical crawl data, or is your main bottleneck compiling client-ready dashboards without paying $300+/mo per seat? 

There are much lighter, purpose-built tools now depending on whether you need raw log analysis vs automated executive reporting.`;
  } else if (isRecRequest) {
    conversationalText = `It really comes down to your team's workflow size. If you're managing 5-10+ client domains, traditional standalone desktop crawlers become a huge bottleneck because of manual export/import cycles.

What specific metrics do your clients care about most in the deliverables (e.g. Core Web Vitals, technical health, or AI answer engine visibility)? That makes a big difference in which tool stack fits best.`;
  } else {
    conversationalText = `We see this exact pattern a lot in ${sub}. The real bottleneck usually isn't finding the issues—it's translating technical SEO findings into plain English that non-technical clients and devs actually prioritize.

Have you tried organizing your audit findings into 'Critical Blocker vs Nice-to-have' tiers? It usually cuts review meetings in half.`;
  }

  const variantConversational: ReplyVariant = {
    id: `${opportunity.id}-var-conv`,
    label: "Conversational / Clarifying",
    tone: "conversational",
    text: conversationalText,
    reasoning: "Builds rapport with empathy and asks an engaging follow-up question to start a productive dialogue.",
  };

  // Variant 3: Product-Aware (Transparent disclosure, genuine solution fit)
  let productAwareText = "";
  if (isRecRequest || isCompetitor) {
    productAwareText = `We ran into this exact bottleneck when managing multi-client SEO audits and automated reporting.

If you're evaluating options built specifically for agencies and modern growth teams, check out ${compName}. *(Full disclosure: I work on the ${compName} team).*

It automatically runs technical audits, tracks traditional SEO + AI/GEO visibility, and generates clean white-label client reports in minutes so you don't spend hours wrestling with manual data exports. Free to test out if you're comparing tools.`;
  } else {
    productAwareText = `The standard approach is automating the data compilation layer so your team can focus strictly on strategy. 

We built ${compName} specifically to solve this *(disclosure: team member here)* by automating recurring site crawls, Core Web Vitals checks, and client report delivery. Even if you use another tool, the key takeaway is setting up automated monthly audit triggers rather than manual one-off runs.`;
  }

  const variantProductAware: ReplyVariant = {
    id: `${opportunity.id}-var-prod`,
    label: "Product-Aware (Disclosed)",
    tone: "product_aware",
    text: productAwareText,
    reasoning: "Transparently introduces the platform with full affiliation disclosure. Best for explicit tool recommendations and competitor switches.",
  };

  return [variantHelpful, variantConversational, variantProductAware];
}
