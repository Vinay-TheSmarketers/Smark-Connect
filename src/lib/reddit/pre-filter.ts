import { hasVerifiedRedditIdentity, type RawRedditCandidate } from "./fetcher";
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

const RELEVANCE_STOPWORDS = new Set([
  "about", "agency", "and", "are", "best", "business", "client", "company", "consulting", "for", "from", "help", "how", "into", "looking",
  "management", "modern", "platform", "provider", "service", "services", "software", "solution", "solutions",
  "system", "team", "the", "tool", "tools", "using", "what", "with", "workflow", "workflows", "your",
]);

function normalizedPhrase(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ").replace(/\s+/g, " ").trim();
}

function distinctiveTerms(values: string[]): string[] {
  return Array.from(new Set(values.flatMap((value) => normalizedPhrase(value).split(/[\s/&,-]+/))))
    .filter((term) => term.length >= 3 && !RELEVANCE_STOPWORDS.has(term));
}

/**
 * Deterministic fast pre-filter for candidate Reddit posts.
 * Runs before LLM/scoring to ensure zero wasted tokens and high precision.
 */
export function runDeterministicPreFilter(
  candidates: RawRedditCandidate[],
  memory: CompanyMemory,
  processedIds: Set<string>,
  maxAgeDays = 1095
): FilteredCandidate[] {
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>(processedIds);
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const evidenceValues = [
    memory.category,
    ...memory.productsAndServices,
    ...memory.featuresAndCapabilities,
    ...memory.primaryKeywords,
    ...memory.secondaryKeywords,
    ...memory.competitors.map((competitor) => competitor.name),
  ];
  const relevantPhrases = Array.from(new Set(evidenceValues.map(normalizedPhrase)))
    .filter((phrase) => phrase.length >= 5 && phrase.split(" ").length >= 2 && !RELEVANCE_STOPWORDS.has(phrase));
  const relevantTerms = distinctiveTerms(evidenceValues);

  const filtered: FilteredCandidate[] = [];

  for (const candidate of candidates) {
    // Only verified Reddit post identities are eligible for the action feed.
    if (!hasVerifiedRedditIdentity(candidate)) continue;

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
      const score = candidate.score ?? 0;
      const comments = candidate.numComments ?? 0;
      if (ageMs > maxAgeMs && score < 40 && comments < 25) {
        continue;
      }
    }

    // 6. Evidence relevance: require a specific offer phrase or at least two distinctive domain terms.
    const combinedText = `${candidate.title} ${candidate.excerpt} ${candidate.subreddit}`.toLowerCase();
    const exactPhraseMatch = relevantPhrases.some((phrase) => combinedText.includes(phrase));
    const matchedTerms = relevantTerms.filter((term) => combinedText.includes(term));
    const hasRelevance = exactPhraseMatch || matchedTerms.length >= 1;
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
