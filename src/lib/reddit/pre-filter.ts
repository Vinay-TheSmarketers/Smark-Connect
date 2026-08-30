import type { RawRedditCandidate } from "./fetcher";
import type { CompanyMemory } from "./company-memory";

export type FilteredCandidate = RawRedditCandidate & {
  passedPreFilter: true;
};

const SPAM_PATTERNS = [
  /\b(discount code|promo code|affiliate link|coupon code|buy crypto|telegram group|whatsapp group|dm me for price)\b/i,
  /\b(onlyfans|casino|betting|airdrop|free money|work from home fast cash)\b/i,
  /\b(upvote for upvote|karma farming|sub4sub)\b/i,
  /\b(cheapest smm panel|buy followers|buy backlinks cheap)\b/i,
];

const REMOVED_PATTERNS = [
  /^\[removed\]$/i,
  /^\[deleted\]$/i,
  /this post was removed by/i,
  /post has been removed/i,
];

/**
 * Deterministic fast pre-filter for candidate Reddit posts.
 * Runs before LLM/scoring to ensure zero wasted tokens and high precision.
 */
export function runDeterministicPreFilter(
  candidates: RawRedditCandidate[],
  memory: CompanyMemory,
  processedIds: Set<string>,
  maxAgeDays = 30
): FilteredCandidate[] {
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>(processedIds);
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const relevantKeywords = new Set([
    ...memory.primaryKeywords.map((k) => k.toLowerCase()),
    ...memory.secondaryKeywords.map((k) => k.toLowerCase()),
    "seo",
    "audit",
    "crawl",
    "agency",
    "reporting",
    "ranking",
    "search",
    "semrush",
    "ahrefs",
    "screaming frog",
    "tool",
    "software",
    "automation",
    "client",
    "workflow",
    "marketing",
    "b2b",
    "saas",
    "demand gen",
    "leads",
    "pipeline",
  ]);

  const filtered: FilteredCandidate[] = [];

  for (const candidate of candidates) {
    // 1. Normalized URL & ID Deduplication
    const normUrl = candidate.url.replace(/^https?:\/\/(?:www\.)?reddit\.com/i, "").toLowerCase();
    if (seenUrls.has(normUrl) || seenIds.has(candidate.id)) {
      continue;
    }

    // 2. Minimum content check
    if (!candidate.title || candidate.title.length < 12) {
      continue;
    }

    // 3. Removed/Deleted post filter
    if (
      REMOVED_PATTERNS.some((pat) => pat.test(candidate.title) || pat.test(candidate.excerpt))
    ) {
      continue;
    }

    // 4. Obvious promotional spam / bot filter
    if (
      SPAM_PATTERNS.some((pat) => pat.test(candidate.title) || pat.test(candidate.excerpt))
    ) {
      continue;
    }

    // 5. Recency / Staleness filter
    if (candidate.publishedAt) {
      const pubTime = new Date(candidate.publishedAt).getTime();
      const ageMs = now - pubTime;
      // Allow slightly older posts (>30d) only if they have significant engagement (>40 upvotes or >25 comments)
      if (ageMs > maxAgeMs && candidate.score < 40 && candidate.numComments < 25) {
        continue;
      }
    }

    // 6. Semantic Relevance check (Must touch at least one domain keyword)
    const combinedText = `${candidate.title} ${candidate.excerpt} ${candidate.subreddit}`.toLowerCase();
    const hasRelevance = Array.from(relevantKeywords).some((kw) => combinedText.includes(kw));
    if (!hasRelevance) {
      continue;
    }

    // Passed all pre-filter checks
    seenUrls.add(normUrl);
    seenIds.add(candidate.id);
    filtered.push({
      ...candidate,
      passedPreFilter: true,
    });
  }

  return filtered;
}
