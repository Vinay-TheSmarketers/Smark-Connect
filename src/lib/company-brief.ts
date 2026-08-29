type CompanyBriefSource = {
  name?: string | null;
  websiteUrl?: string | null;
  category?: string | null;
  description?: string | null;
  productsOrServices?: string | null;
  targetAudience?: string | null;
  geographicMarket?: string | null;
};

const FALLBACK = "Company information was not available for this section.";

function clean(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function withTerminalPunctuation(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function conciseFact(value: string) {
  const firstSentence = value.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? value;
  return firstSentence.length > 220 ? `${firstSentence.slice(0, 217).trimEnd()}…` : firstSentence;
}

export function createCompanyBrief(source: CompanyBriefSource): string {
  const name = clean(source.name);
  const website = clean(source.websiteUrl);
  const category = clean(source.category);
  const description = clean(source.description);
  const offering = clean(source.productsOrServices);
  const audience = clean(source.targetAudience);
  const market = clean(source.geographicMarket);
  if (!name && !website && !category && !description && !offering && !audience && !market) return FALLBACK;

  const identity = [
    name || "This company",
    category ? `is a ${category} company` : "is the organization covered by this report",
    audience ? `serving ${audience}` : "",
    market ? `in ${market}` : "",
  ].filter(Boolean).join(" ");
  const sentences = [withTerminalPunctuation(identity)];
  if (offering) sentences.push(`Its primary offering includes ${withTerminalPunctuation(offering)}`);
  if (description && !identity.toLowerCase().includes(description.toLowerCase())) sentences.push(withTerminalPunctuation(conciseFact(description)));
  if (website) {
    try { sentences.push(`The public website reviewed for this analysis is ${new URL(website).hostname.replace(/^www\./, "")}.`); }
    catch { /* The stored website is omitted if it is no longer parseable. */ }
  }
  sentences.push("This analysis evaluates its current digital presence, performance, visibility, and opportunities for improvement.");
  return sentences.slice(0, 4).join(" ");
}

export { FALLBACK as COMPANY_BRIEF_FALLBACK };
