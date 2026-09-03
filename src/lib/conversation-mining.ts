export type ConversationProspect = {
  id: string;
  platform: "Reddit";
  identity: string;
  community: string;
  title: string;
  intent: string;
  sourceUrl: string;
  score: number;
  confidence: number;
  matchedIcp: string;
  matchedProblem: string;
  matchedProduct: string;
  discoveredAt: string;
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
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
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

export function extractConversationProspects(runs: AgentRunLike[], limit = 8): ConversationProspect[] {
  const redditRun = runs.find((run) => run.agentType === "REDDIT");
  const output = record(redditRun?.output);
  const opportunities = Array.isArray(output?.opportunities) ? output.opportunities : [];
  const seen = new Set<string>();

  return opportunities
    .flatMap((candidate): ConversationProspect[] => {
      const item = record(candidate);
      const score = record(item?.score);
      if (!item || !score || item.verified !== true) return [];

      const identity = text(item.author);
      const sourceUrl = text(item.sourceUrl);
      const intentCode = text(item.intent);
      const total = number(score.total);
      const spamRisk = number(item.spamRisk);
      if (!isUsefulIdentity(identity) || !isPublicUrl(sourceUrl)) return [];
      if (!COMMERCIAL_INTENTS.has(intentCode) || total < 65 || spamRisk > 0.35) return [];

      const identityKey = identity.toLowerCase();
      if (seen.has(identityKey)) return [];
      seen.add(identityKey);

      return [{
        id: text(item.id) || sourceUrl,
        platform: "Reddit",
        identity,
        community: text(item.subreddit) || "Reddit",
        title: text(item.title) || "Relevant public conversation",
        intent: text(item.intentLabel) || intentCode.replaceAll("_", " ").toLowerCase(),
        sourceUrl,
        score: Math.round(total),
        confidence: Math.round(number(item.confidence)),
        matchedIcp: text(item.matchedIcp),
        matchedProblem: text(item.matchedProblem),
        matchedProduct: text(item.matchedProduct),
        discoveredAt: text(item.discoveredAt),
      }];
    })
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, limit);
}
