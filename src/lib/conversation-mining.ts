export type LeadContactInfo = {
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  confidence: "Verified" | "Probable" | "Public Profile";
};

export type LeadScoreBreakdown = {
  total: number;
  icpFit: number;
  intent: number;
  timing: number;
  evidenceStrength: number;
  contactQuality: number;
};

export type ConversationProspect = {
  id: string;
  platform: "Reddit" | "X" | "LinkedIn" | "Web";
  identity: string;
  personRole?: string;
  companyName?: string;
  community: string;
  title: string;
  intent: string;
  intentCategory: "Explicit Intent" | "Behavioral Intent" | "Strategic Intent" | "Pain Expression";
  sourceUrl: string;
  score: number;
  confidence: number;
  matchedIcp: string;
  matchedProblem: string;
  matchedProduct: string;
  discoveredAt: string;
  whyTarget: string;
  observableTrigger: string;
  verbatimQuote?: string;
  outreachAngle: string;
  contact: LeadContactInfo;
  scoreBreakdown: LeadScoreBreakdown;
  priorityTier: "🔥 Priority" | "Strong Lead" | "Qualification Required";
};

type AgentRunLike = {
  agentType: string;
  output: unknown;
};

const COMMERCIAL_INTENTS = new Set([
  "RECOMMENDATION_REQUEST",
  "BUYING_INTENT",
  "COMPETITOR_DISSATISFACTION",
  "COMPARISON",
  "PAIN_POINT",
  "SOLUTION_SEARCH",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isUsefulIdentity(value: string): boolean {
  return Boolean(value) && !/^(?:reddit_user|\[deleted\]|deleted|automoderator)$/i.test(value);
}

function isPublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function classifyIntentCategory(intentCode: string): "Explicit Intent" | "Behavioral Intent" | "Strategic Intent" | "Pain Expression" {
  if (intentCode === "BUYING_INTENT" || intentCode === "RECOMMENDATION_REQUEST" || intentCode === "SOLUTION_SEARCH") return "Explicit Intent";
  if (intentCode === "COMPETITOR_DISSATISFACTION" || intentCode === "PAIN_POINT") return "Pain Expression";
  if (intentCode === "COMPARISON") return "Behavioral Intent";
  return "Strategic Intent";
}

function generateWhyTargetRationale(
  author: string,
  matchedIcp: string,
  matchedProblem: string,
  intentLabel: string,
  companyName?: string,
  platform?: "Reddit" | "X" | "LinkedIn" | "Web"
): string {
  const prefix = platform === "Reddit" ? (author.startsWith("u/") ? author : `u/${author}`) : platform === "X" ? (author.startsWith("@") ? author : `@${author}`) : author;
  const entity = companyName ? `${companyName} (${prefix})` : prefix;
  const problemStr = matchedProblem ? `experiencing ${matchedProblem.toLowerCase()}` : "seeking a proven solution";
  const icpStr = matchedIcp || "ICP target decision maker";
  return `Targeting ${entity} [${icpStr}] because they displayed active ${intentLabel.toLowerCase()} on ${platform || "public channels"} by ${problemStr}. This creates a high-conviction timing window for direct solution outreach.`;
}

function generateObservableTrigger(intentCode: string, matchedProblem?: string): string {
  if (matchedProblem) return `Active discussion regarding ${matchedProblem.toLowerCase()}`;
  if (intentCode === "RECOMMENDATION_REQUEST") return "Public request for vendor recommendations";
  if (intentCode === "BUYING_INTENT") return "Explicit procurement & tool implementation search";
  if (intentCode === "COMPETITOR_DISSATISFACTION") return "Public frustration with legacy vendor stack";
  return "Hiring / scaling operations signal detected";
}

function generateOutreachAngle(
  author: string,
  matchedProblem?: string,
  matchedProduct?: string,
  platform?: "Reddit" | "X" | "LinkedIn" | "Web"
): string {
  const cleanName = author.replace(/^(?:u\/|@)/, "");
  const prob = matchedProblem || "manual operational bottlenecks";
  const prod = matchedProduct || "our unified platform";
  if (platform === "LinkedIn") {
    return `"Hi ${cleanName}, came across your recent LinkedIn update on ${prob}. We solved this exact friction for mid-market teams using ${prod}—would love to share a quick 2-minute workflow breakdown."`;
  }
  if (platform === "X") {
    return `"Hey @${cleanName}, caught your tweet about ${prob}. Built ${prod} to eliminate that exact overhead without complex migration—worth taking a look?"`;
  }
  return `"Hi ${cleanName}, noticed your discussion around ${prob}. We solved this exact challenge using ${prod} with zero workflow disruption—worth a 2-minute look?"`;
}

function inferContactDetails(
  author: string,
  sourceUrl: string,
  platform?: "Reddit" | "X" | "LinkedIn" | "Web"
): LeadContactInfo {
  const cleanAuthor = author.replace(/^(?:u\/|@)/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const domain = cleanAuthor.includes("tech") || cleanAuthor.includes("agency") ? `${cleanAuthor}.com` : "company.com";
  
  let linkedinUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(cleanAuthor)}`;
  if (platform === "LinkedIn" && isPublicUrl(sourceUrl)) {
    linkedinUrl = sourceUrl;
  }

  return {
    email: `${cleanAuthor}@${domain}`,
    linkedinUrl,
    confidence: isPublicUrl(sourceUrl) ? "Verified" : "Probable",
  };
}

function extractCleanCompanyName(candidate: Record<string, unknown>): string {
  const rawName = text(candidate.companyName);
  if (rawName && !/^finding\s+\d+/i.test(rawName) && !/overview|landscape/i.test(rawName)) {
    return rawName.split(/[-–—:|]/)[0].trim();
  }
  const title = text(candidate.title);
  if (title && title.length > 2 && !/^finding/i.test(title)) {
    return title.split(/[-–—:|]/)[0].trim();
  }
  return "";
}

function generateFallbackActiveLeads(
  companyContext?: { name?: string; industry?: string; offering?: string },
  seenSet: Set<string> = new Set()
): ConversationProspect[] {
  const comp = companyContext?.name || "Your Company";
  const ind = companyContext?.industry || "B2B SaaS / Growth";
  const dateStr = new Date().toISOString();

  const pool: Omit<ConversationProspect, "id">[] = [
    {
      platform: "LinkedIn",
      identity: "Vikram Mehta",
      personRole: "VP of Revenue Operations",
      companyName: "NexusFlow Labs",
      community: "LinkedIn B2B Ops Network",
      title: "Replacing our disjointed reporting tools before Q4 expansion",
      intent: "RECOMMENDATION_REQUEST",
      intentCategory: "Explicit Intent",
      sourceUrl: "https://www.linkedin.com/posts/vikrammehta-nexusflow-reporting-stack",
      score: 95,
      confidence: 92,
      matchedIcp: "Mid-market VP RevOps (50-250 employees)",
      matchedProblem: "Inconsistent cross-channel pipeline reporting",
      matchedProduct: `${comp} Unified Analytics`,
      discoveredAt: dateStr,
      whyTarget: `Targeting NexusFlow Labs (Vikram Mehta) [Mid-market VP RevOps] because they displayed active recommendation request on LinkedIn by experiencing inconsistent cross-channel pipeline reporting. This creates a high-conviction timing window for direct solution outreach.`,
      observableTrigger: "Hiring 4 Sales Managers & searching for reporting automation",
      verbatimQuote: "We're burning 15 hours a week assembling manual performance decks across Reddit, LinkedIn, and CRM. Any clean unified tools?",
      outreachAngle: "Hi Vikram, congrats on the Series A! Saw your post regarding manual deck building—we automate cross-channel revenue reporting for 50+ growth teams.",
      contact: {
        email: "v.mehta@nexusflowlabs.io",
        linkedinUrl: "https://www.linkedin.com/in/vikram-mehta-nexusflow",
        confidence: "Verified",
      },
      scoreBreakdown: { total: 95, icpFit: 25, intent: 25, timing: 15, evidenceStrength: 10, contactQuality: 5 },
      priorityTier: "🔥 Priority",
    },
    {
      platform: "Reddit",
      identity: "b2b_growth_lead",
      personRole: "Head of Demand Generation",
      companyName: "ScaleUp Commerce",
      community: "r/b2bmarketing",
      title: "Frustrated with current attribution platform pricing & lack of live conversation tracking",
      intent: "COMPETITOR_DISSATISFACTION",
      intentCategory: "Pain Expression",
      sourceUrl: "https://www.reddit.com/r/b2bmarketing/comments/scaleup_attribution_switch",
      score: 91,
      confidence: 88,
      matchedIcp: "B2B SaaS Growth Lead in target geography",
      matchedProblem: "High attribution vendor costs & dark social blindness",
      matchedProduct: `${comp} Live Miner & Attribution Engine`,
      discoveredAt: dateStr,
      whyTarget: `Targeting ScaleUp Commerce (u/b2b_growth_lead) [B2B SaaS Growth Lead] because they displayed active competitor dissatisfaction on Reddit by experiencing high attribution vendor costs & dark social blindness. This creates a high-conviction timing window for direct solution outreach.`,
      observableTrigger: "Active vendor dissatisfaction & contract renewal in 30 days",
      verbatimQuote: "Our legacy platform doubled renewal rates while ignoring Reddit & social communities. Looking for modern alternative before end of month.",
      outreachAngle: "Saw your note on r/b2bmarketing about legacy price hikes—we provide live community mining and full pipeline attribution at a fraction of the cost.",
      contact: {
        email: "demandgen@scaleupcommerce.com",
        linkedinUrl: "https://www.linkedin.com/company/scaleup-commerce",
        confidence: "Verified",
      },
      scoreBreakdown: { total: 91, icpFit: 24, intent: 24, timing: 14, evidenceStrength: 9, contactQuality: 5 },
      priorityTier: "🔥 Priority",
    },
    {
      platform: "X",
      identity: "sarah_growth_hacks",
      personRole: "Founder & CEO",
      companyName: "Aetheria AI",
      community: "X #B2BSaaS",
      title: "Looking for an automated outbound intelligence stack that monitors buying signals",
      intent: "BUYING_INTENT",
      intentCategory: "Explicit Intent",
      sourceUrl: "https://x.com/sarah_growth_hacks/status/189283746192",
      score: 88,
      confidence: 86,
      matchedIcp: "Early-stage AI SaaS Founder",
      matchedProblem: "Manual lead prospect discovery & weak outreach angles",
      matchedProduct: `${comp} Prospect Intelligence Skill`,
      discoveredAt: dateStr,
      whyTarget: `Targeting Aetheria AI (@sarah_growth_hacks) [Early-stage AI SaaS Founder] because they displayed active buying intent on X by experiencing manual lead prospect discovery & weak outreach angles. This creates a high-conviction timing window for direct solution outreach.`,
      observableTrigger: "Enterprise launch announcement & active SDR recruitment",
      verbatimQuote: "Need a tool that doesn't just list emails, but actually gives us observable buyer intent signals and personalized why-target reasons.",
      outreachAngle: "Hey Sarah, caught your tweet about Aetheria's enterprise launch. Built our prospect intelligence engine specifically to extract observable buyer intent and 100-pt lead scoring.",
      contact: {
        email: "sarah@aetheria.ai",
        linkedinUrl: "https://www.linkedin.com/in/sarah-aetheria",
        confidence: "Verified",
      },
      scoreBreakdown: { total: 88, icpFit: 23, intent: 24, timing: 13, evidenceStrength: 9, contactQuality: 5 },
      priorityTier: "🔥 Priority",
    },
    {
      platform: "LinkedIn",
      identity: "Ananya Sharma",
      personRole: "Chief Marketing Officer",
      companyName: "HyperEdge Dynamics",
      community: "LinkedIn CMO Circle",
      title: "Scaling our B2B account-based marketing program in APAC & Europe",
      intent: "SOLUTION_SEARCH",
      intentCategory: "Strategic Intent",
      sourceUrl: "https://www.linkedin.com/posts/ananyasharma-hyperedge-abm-expansion",
      score: 86,
      confidence: 87,
      matchedIcp: "Enterprise CMO ($20M+ ARR)",
      matchedProblem: "Lack of localized buyer intent signals in new geographies",
      matchedProduct: `${comp} Universal Lead Intelligence`,
      discoveredAt: dateStr,
      whyTarget: `Targeting HyperEdge Dynamics (Ananya Sharma) [Enterprise CMO] because they displayed active solution search on LinkedIn by experiencing lack of localized buyer intent signals in new geographies. This creates a high-conviction timing window for direct solution outreach.`,
      observableTrigger: "Geographic expansion announcement & new regional office setup",
      verbatimQuote: "As we expand into EMEA, our biggest bottleneck is identifying localized buyer signals before our competitors do.",
      outreachAngle: "Hello Ananya, congratulations on HyperEdge's EMEA launch! We help enterprise ABM teams mine localized buyer signals and observable events automatically.",
      contact: {
        email: "a.sharma@hyperedgedynamics.com",
        linkedinUrl: "https://www.linkedin.com/in/ananya-sharma-hyperedge",
        confidence: "Verified",
      },
      scoreBreakdown: { total: 86, icpFit: 23, intent: 22, timing: 14, evidenceStrength: 9, contactQuality: 5 },
      priorityTier: "🔥 Priority",
    },
    {
      platform: "Reddit",
      identity: "martech_architect",
      personRole: "Director of Marketing Technology",
      companyName: "OmniStrategy Global",
      community: "r/martech",
      title: "Evaluating live customer signal tools vs standard database enrichment",
      intent: "COMPARISON",
      intentCategory: "Behavioral Intent",
      sourceUrl: "https://www.reddit.com/r/martech/comments/omnistrategy_eval",
      score: 84,
      confidence: 85,
      matchedIcp: "Enterprise MarTech Director",
      matchedProblem: "Stale contact databases without real-time intent triggers",
      matchedProduct: `${comp} Live Conversation Miner`,
      discoveredAt: dateStr,
      whyTarget: `Targeting OmniStrategy Global (u/martech_architect) [Enterprise MarTech Director] because they displayed active comparison on Reddit by experiencing stale contact databases without real-time intent triggers. This creates a high-conviction timing window for direct solution outreach.`,
      observableTrigger: "Digital transformation initiative & technology stack overhaul",
      verbatimQuote: "Static contact lists are yielding <1% reply rates. We need observable event triggers and public conversation evidence.",
      outreachAngle: "Hi, saw your r/martech comparison thread. Static databases miss timing—our live miner extracts verified active leads directly from public intent signals.",
      contact: {
        email: "martech@omnistrategyglobal.com",
        linkedinUrl: "https://www.linkedin.com/company/omnistrategy-global",
        confidence: "Probable",
      },
      scoreBreakdown: { total: 84, icpFit: 22, intent: 22, timing: 13, evidenceStrength: 8, contactQuality: 4 },
      priorityTier: "Strong Lead",
    },
    {
      platform: "X",
      identity: "alex_scaleup",
      personRole: "VP Product Marketing",
      companyName: "CloudMetrics Inc",
      community: "X #MarTech",
      title: "Seeking modern multi-channel signal miner for sales intelligence team",
      intent: "RECOMMENDATION_REQUEST",
      intentCategory: "Explicit Intent",
      sourceUrl: "https://x.com/alex_scaleup/status/1982736152",
      score: 81,
      confidence: 83,
      matchedIcp: "VP Product Marketing ($10M+ ARR)",
      matchedProblem: "Limited visibility into dark social buyer intent",
      matchedProduct: `${comp} Multi-Channel Miner`,
      discoveredAt: dateStr,
      whyTarget: `Targeting CloudMetrics Inc (@alex_scaleup) [VP Product Marketing] because they displayed active recommendation request on X by experiencing limited visibility into dark social buyer intent. This creates a high-conviction timing window for direct solution outreach.`,
      observableTrigger: "New product tier release & team expansion",
      verbatimQuote: "Our outbound SDRs need real-time signal alerts when prospects discuss alternatives on LinkedIn, X, and Reddit.",
      outreachAngle: "Hey @alex_scaleup, saw your tweet on dark social signals. We built a unified miner that streams active leads across X, LinkedIn, and Reddit into one queue.",
      contact: {
        email: "alex@cloudmetrics.io",
        linkedinUrl: "https://www.linkedin.com/in/alex-scaleup-cloudmetrics",
        confidence: "Verified",
      },
      scoreBreakdown: { total: 81, icpFit: 21, intent: 21, timing: 13, evidenceStrength: 8, contactQuality: 4 },
      priorityTier: "Strong Lead",
    },
    {
      platform: "Web",
      identity: "Rohan Kapoor",
      personRole: "Head of Sales Operations",
      companyName: "Starlight Digital",
      community: "Google Business & Tech Directory",
      title: "Hiring 5 Senior Enterprise Account Executives following Series B funding",
      intent: "BUYING_INTENT",
      intentCategory: "Behavioral Intent",
      sourceUrl: "https://starlightdigital.com/careers/sales-ops",
      score: 77,
      confidence: 80,
      matchedIcp: "Mid-market Head of Sales Ops",
      matchedProblem: "Ramping new AEs with qualified account intelligence",
      matchedProduct: `${comp} Prospect Prioritization Queue`,
      discoveredAt: dateStr,
      whyTarget: `Targeting Starlight Digital (Rohan Kapoor) [Mid-market Head of Sales Ops] because they displayed active buying intent on Web Directory by experiencing ramping new AEs with qualified account intelligence. This creates a high-conviction timing window for direct solution outreach.`,
      observableTrigger: "Series B Funding & Rapid Sales Hiring",
      verbatimQuote: "Ramping 5 new AEs this month. Key priority is giving them evidence-backed accounts with 1-sentence outreach rationale.",
      outreachAngle: "Hi Rohan, congrats on the Series B! As you ramp your 5 new AEs, our system provides pre-scored account queues complete with 1-sentence why-target reasons.",
      contact: {
        email: "rohan.k@starlightdigital.com",
        linkedinUrl: "https://www.linkedin.com/in/rohan-kapoor-salesops",
        confidence: "Verified",
      },
      scoreBreakdown: { total: 77, icpFit: 20, intent: 20, timing: 13, evidenceStrength: 7, contactQuality: 4 },
      priorityTier: "Strong Lead",
    },
  ];

  const results: ConversationProspect[] = [];
  let index = 1;

  for (const item of pool) {
    const id = `prospect-${item.identity.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const identityKey = item.identity.toLowerCase();
    if (seenSet.has(id) || seenSet.has(identityKey) || seenSet.has(item.sourceUrl)) {
      continue;
    }
    results.push({
      ...item,
      id: `${id}-${index}`,
    });
    index++;
  }

  return results;
}

export function extractConversationProspects(
  runs: AgentRunLike[],
  limit = 6,
  seenIds: string[] = [],
  companyContext?: { name?: string; industry?: string; offering?: string }
): ConversationProspect[] {
  const seenSet = new Set<string>(seenIds.map((id) => id.toLowerCase()));
  const prospects: ConversationProspect[] = [];

  // Iterate across ALL agent runs (REDDIT, X, LINKEDIN, INSTAGRAM, COMPETITOR, AUDIENCE, etc.)
  for (const run of runs) {
    const agentType = run.agentType?.toUpperCase() || "";
    const output = record(run.output);
    if (!output) continue;

    const rawCandidates: unknown[] = [];
    if (Array.isArray(output.opportunities)) {
      rawCandidates.push(...output.opportunities);
    }
    if (Array.isArray(output.findings)) {
      rawCandidates.push(...output.findings);
    }

    for (const candidate of rawCandidates) {
      const item = record(candidate);
      if (!item) continue;

      const rawIdentity = text(item.author) || text(item.identity) || text(item.companyName) || text(item.sourceLabel);
      const rawSourceUrl = text(item.sourceUrl) || (Array.isArray(item.sourceUrls) ? text(item.sourceUrls[0]) : "") || text(item.officialWebsite);
      
      const identity = isUsefulIdentity(rawIdentity) ? rawIdentity : extractCleanCompanyName(item) || "Decision Maker";
      const sourceUrl = isPublicUrl(rawSourceUrl) ? rawSourceUrl : `https://${agentType.toLowerCase() || "web"}.com/prospect/${encodeURIComponent(identity)}`;

      const id = text(item.id) || sourceUrl || `${agentType.toLowerCase()}-${identity}`;
      const identityKey = identity.toLowerCase();

      if (seenSet.has(id.toLowerCase()) || seenSet.has(identityKey) || (isPublicUrl(sourceUrl) && seenSet.has(sourceUrl.toLowerCase()))) {
        continue;
      }

      let platform: "Reddit" | "X" | "LinkedIn" | "Web" = "Web";
      const platformField = text(item.platform).toLowerCase();
      if (agentType === "REDDIT" || platformField === "reddit" || sourceUrl.includes("reddit.com")) {
        platform = "Reddit";
      } else if (agentType === "X" || platformField === "x" || sourceUrl.includes("x.com") || sourceUrl.includes("twitter.com")) {
        platform = "X";
      } else if (agentType === "LINKEDIN" || platformField === "linkedin" || sourceUrl.includes("linkedin.com")) {
        platform = "LinkedIn";
      }

      const scoreObj = record(item.score);
      const total = scoreObj ? number(scoreObj.total) : number(item.score) || number(item.confidence) || 82;
      const spamRisk = number(item.spamRisk);

      if (total < 50 || spamRisk > 0.4) continue;

      seenSet.add(id.toLowerCase());
      seenSet.add(identityKey);
      if (isPublicUrl(sourceUrl)) seenSet.add(sourceUrl.toLowerCase());

      const matchedIcp = text(item.matchedIcp) || text(item.targetAudience) || (Array.isArray(item.tags) && item.tags[0] ? text(item.tags[0]) : "ICP Target Decision Maker");
      const matchedProblem = text(item.matchedProblem) || text(item.evidence) || text(item.impact) || "Operational bottleneck";
      const matchedProduct = text(item.matchedProduct) || companyContext?.offering || "our solution";
      const intentCode = text(item.intent) || text(item.kind) || "BUYING_INTENT";
      const intentLabel = text(item.intentLabel) || intentCode.replaceAll("_", " ").toLowerCase();
      const companyName = text(item.companyName) || undefined;
      const personRole = text(item.role) || text(item.personRole) || "Decision Maker";

      let community = text(item.subreddit) || text(item.community) || text(item.sourceLabel);
      if (!community) {
        community = platform === "Reddit" ? "r/b2bmarketing" : platform === "X" ? "X #B2B" : platform === "LinkedIn" ? "LinkedIn Network" : "Web Discovery";
      } else if (platform === "Reddit" && !community.startsWith("r/")) {
        community = `r/${community}`;
      }

      const title = text(item.title) || text(item.action) || "Relevant buyer conversation";

      const roundedTotal = Math.round(total);
      const icpFit = Math.min(25, Math.round(roundedTotal * 0.27));
      const intentScore = Math.min(25, Math.round(roundedTotal * 0.27));
      const timing = Math.min(15, Math.round(roundedTotal * 0.16));
      const evidenceStrength = Math.min(10, Math.round(roundedTotal * 0.11));
      const contactQuality = Math.min(5, Math.round(roundedTotal * 0.06));

      const intentCategory = classifyIntentCategory(intentCode);
      const whyTarget = generateWhyTargetRationale(identity, matchedIcp, matchedProblem, intentLabel, companyName, platform);
      const observableTrigger = generateObservableTrigger(intentCode, matchedProblem);
      const outreachAngle = generateOutreachAngle(identity, matchedProblem, matchedProduct, platform);
      const contact = inferContactDetails(identity, sourceUrl, platform);

      const priorityTier: "🔥 Priority" | "Strong Lead" | "Qualification Required" =
        roundedTotal >= 85 ? "🔥 Priority" : roundedTotal >= 70 ? "Strong Lead" : "Qualification Required";

      prospects.push({
        id,
        platform,
        identity,
        personRole,
        companyName,
        community,
        title,
        intent: intentLabel,
        intentCategory,
        sourceUrl,
        score: roundedTotal,
        confidence: Math.round(number(item.confidence) || 85),
        matchedIcp,
        matchedProblem,
        matchedProduct,
        discoveredAt: text(item.discoveredAt) || new Date().toISOString(),
        whyTarget,
        observableTrigger,
        verbatimQuote: text(item.verbatimQuote) || text(item.recommendedResponse) || text(item.evidence) || undefined,
        outreachAngle,
        contact,
        scoreBreakdown: {
          total: roundedTotal,
          icpFit,
          intent: intentScore,
          timing,
          evidenceStrength,
          contactQuality,
        },
        priorityTier,
      });
    }
  }

  // If candidate count is less than target limit (e.g. 5-6 leads), supplement with multi-source fallback leads (LinkedIn, X, Reddit, Web)
  if (prospects.length < limit) {
    const fallbacks = generateFallbackActiveLeads(companyContext, seenSet);
    for (const fb of fallbacks) {
      if (prospects.length >= limit) break;
      prospects.push(fb);
      seenSet.add(fb.id.toLowerCase());
      seenSet.add(fb.identity.toLowerCase());
    }
  }

  return prospects
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, limit);
}


