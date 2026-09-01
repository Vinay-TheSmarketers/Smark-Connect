import * as cheerio from "cheerio";

export type AnswerPassage = {
  heading: string;
  passage: string;
  type: "definition" | "procedure" | "comparison" | "faq";
  citabilityScore: number;
  sourceUrl: string;
  path: string;
  query: string;
  monthlyAiVolume: string;
};

export type CitationSource = {
  domain: string;
  name: string;
  status: "Active Citation" | "Direct Referral" | "Entity Mention" | "Ecosystem Authority";
  volume: string;
  iconBg: string;
};

export type GeoCitabilityReport = {
  geoScore: number;
  overallCitabilityScore: number;
  activeSignalsCount: number;
  aiVisibility: number;
  platformReadiness: {
    composite: number;
    chatgpt: number;
    perplexity: number;
    gemini: number;
    copilot: number;
  };
  readinessScore: number;
  technicalGeoScore: number;
  backlinkAuthorityScore: number;
  answerPassages: AnswerPassage[];
  citationSources: CitationSource[];
  entitySignals: {
    brandEntityFound: boolean;
    categoryDeclared: boolean;
    clearValueProp: boolean;
    structuredListsCount: number;
    tablesCount: number;
    externalReferenceDomains: number;
    totalAuditedPages: number;
    totalAuditedWords: number;
  };
  aggregateStats: {
    citablePassagesCount: number;
    aiImpressionIndex: string;
    aiSearchVolume: string;
    totalAuditedWordsFormatted: string;
  };
  citationReadinessStage: "Initial Discovery" | "Entity Defined" | "Answer Engine Ready" | "High Authority Citations";
  strategicActions: string[];
};

export function analyzeGeoCitability(
  company: { name: string; websiteUrl: string; category?: string | null; description?: string | null },
  crawlPages: Array<{ url: string; title?: string | null; description?: string | null; content: string }>,
): GeoCitabilityReport {
  const brandName = company.name.toLowerCase();
  let cleanHost = "company.com";
  try {
    cleanHost = new URL(company.websiteUrl.startsWith("http") ? company.websiteUrl : `https://${company.websiteUrl}`).hostname.replace(/^www\./, "");
  } catch {}

  const categoryName = company.category || "B2B Solutions";
  const passages: AnswerPassage[] = [];
  let structuredListsCount = 0;
  let tablesCount = 0;
  let brandEntityFound = false;
  let categoryDeclared = false;
  let clearValueProp = false;
  let totalWords = 0;
  const discoveredExternalDomains = new Set<string>();

  for (const page of crawlPages) {
    if (!page.content) continue;
    const wordCount = page.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    totalWords += wordCount;

    const $ = cheerio.load(page.content);

    // Count structured elements
    const lists = $("ul, ol").length;
    const tables = $("table").length;
    structuredListsCount += lists;
    tablesCount += tables;

    // Discover external reference links on page
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.startsWith("http")) {
        try {
          const parsed = new URL(href);
          const domain = parsed.hostname.replace(/^www\./, "");
          if (!domain.includes(cleanHost) && domain.includes(".")) {
            discoveredExternalDomains.add(domain);
          }
        } catch {}
      }
    });

    let pagePath = "/";
    try {
      const parsed = new URL(page.url);
      pagePath = parsed.pathname || "/";
      if (pagePath === "/") pagePath = "/ (homepage)";
    } catch {}

    // Check heading and passage patterns
    $("h1, h2, h3").each((_, element) => {
      const heading = $(element).text().trim();
      if (!heading || heading.length < 5 || heading.length > 120) return;

      const headingLower = heading.toLowerCase();
      if (headingLower.includes(brandName)) brandEntityFound = true;
      if (headingLower.includes(categoryName.toLowerCase())) categoryDeclared = true;

      // Extract next paragraph or content block
      const nextP = $(element).next("p").text().trim() || $(element).next("div").find("p").first().text().trim();
      if (nextP && nextP.length >= 35 && nextP.length <= 480) {
        let type: AnswerPassage["type"] = "definition";
        let score = 72;

        if (/^(how|steps|guide|ways|process)/i.test(headingLower) || $(element).next("ol, ul").length > 0) {
          type = "procedure";
          score = 84;
        } else if (/^(vs|difference|compare|alternative|why)/i.test(headingLower) || $(element).next("table").length > 0) {
          type = "comparison";
          score = 90;
        } else if (/\?$/.test(heading)) {
          type = "faq";
          score = 88;
        }

        if (nextP.toLowerCase().includes(brandName)) {
          score = Math.min(99, score + 8);
          clearValueProp = true;
        }

        let query = heading.replace(/^[#0-9.\s]+/, "").trim();
        if (!query.includes("?") && type === "faq") query = `${query}?`;

        passages.push({
          heading,
          passage: nextP,
          type,
          citabilityScore: score,
          sourceUrl: page.url,
          path: pagePath,
          query: query.toLowerCase(),
          monthlyAiVolume: "Not measured",
        });
      }
    });
  }

  // Deduplicate and rank top answer passages
  const topPassages = passages
    .sort((a, b) => b.citabilityScore - a.citabilityScore)
    .slice(0, 8);

  // Calculate real entity & signal scores
  let activeSignals = 0;
  if (brandEntityFound || Boolean(company.name)) activeSignals++;
  if (categoryDeclared || Boolean(company.category)) activeSignals++;
  if (clearValueProp || Boolean(company.description)) activeSignals++;
  if (structuredListsCount > 0) activeSignals++;
  if (tablesCount > 0) activeSignals++;
  if (crawlPages.length >= 3) activeSignals++;

  let entityClarityScore = 55;
  if (brandEntityFound) entityClarityScore += 18;
  if (categoryDeclared || Boolean(company.category)) entityClarityScore += 15;
  if (clearValueProp || Boolean(company.description)) entityClarityScore += 12;
  entityClarityScore = Math.min(100, entityClarityScore);

  const avgPassageScore = topPassages.length > 0 ? topPassages.reduce((sum, p) => sum + p.citabilityScore, 0) / topPassages.length : 60;
  const structuredScore = Math.min(100, Math.round(structuredListsCount * 8 + tablesCount * 18 + 40));

  // Platform Readiness breakdown
  const chatgptScore = Math.min(100, Math.max(50, Math.round(entityClarityScore * 0.45 + avgPassageScore * 0.35 + (clearValueProp ? 15 : 5))));
  const perplexityScore = Math.min(100, Math.max(45, Math.round((tablesCount > 0 ? 30 : 10) + avgPassageScore * 0.45 + entityClarityScore * 0.25)));
  const geminiScore = Math.min(100, Math.max(50, Math.round(entityClarityScore * 0.5 + structuredScore * 0.3 + 15)));
  const copilotScore = Math.min(100, Math.max(40, Math.round(entityClarityScore * 0.35 + (tablesCount > 0 ? 25 : 10) + avgPassageScore * 0.35)));

  const platformComposite = Math.round((chatgptScore + perplexityScore + geminiScore + copilotScore) / 4);

  const aiVisibility = Math.min(100, Math.round(entityClarityScore * 0.6 + avgPassageScore * 0.4));
  const readinessScore = Math.min(100, Math.round(platformComposite * 0.5 + structuredScore * 0.3 + (crawlPages.length >= 5 ? 20 : 10)));
  const technicalGeoScore = Math.min(100, Math.max(42, Math.round(structuredScore * 0.5 + (crawlPages.length >= 4 ? 30 : 15) + (brandEntityFound ? 20 : 5))));
  const backlinkAuthorityScore = Math.min(100, discoveredExternalDomains.size * 10);

  const geoScore = Math.min(98, Math.max(45, Math.round(
    aiVisibility * 0.25 +
    platformComposite * 0.35 +
    technicalGeoScore * 0.20 +
    backlinkAuthorityScore * 0.20
  )));

  // Citation domains require a connected citation/referral data source. The crawl
  // only exposes outbound links, so do not present them as verified citations.
  const citationSources: CitationSource[] = [];

  let citationReadinessStage: GeoCitabilityReport["citationReadinessStage"] = "Initial Discovery";
  if (geoScore >= 82) citationReadinessStage = "High Authority Citations";
  else if (geoScore >= 68) citationReadinessStage = "Answer Engine Ready";
  else if (geoScore >= 50) citationReadinessStage = "Entity Defined";

  const strategicActions: string[] = [];
  if (topPassages.length < 4) {
    strategicActions.push("Structure 2–3 explicit Q&A answer passages with 40–80 word direct answer definitions under H2 question headings.");
  }
  if (tablesCount === 0) {
    strategicActions.push("Add comparison and feature-matrix HTML tables — AI models like ChatGPT and Perplexity prioritize tabular data.");
  }
  if (!brandEntityFound) {
    strategicActions.push(`Include explicit entity definitions: '${company.name} is a [Category] that [Core Benefit]' in top-level H1/H2 headings.`);
  }
  strategicActions.push("Ensure Schema.org Organization markup connects official social profiles (sameAs) for entity verification.");

  const totalAuditedWordsFormatted = totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}K` : `${totalWords}`;
  const aiImpressionIndex = "Not measured";
  const aiSearchVolume = "Not measured";

  return {
    geoScore,
    overallCitabilityScore: geoScore,
    activeSignalsCount: activeSignals,
    aiVisibility,
    platformReadiness: {
      composite: platformComposite,
      chatgpt: chatgptScore,
      perplexity: perplexityScore,
      gemini: geminiScore,
      copilot: copilotScore,
    },
    readinessScore,
    technicalGeoScore,
    backlinkAuthorityScore,
    answerPassages: topPassages,
    citationSources,
    entitySignals: {
      brandEntityFound,
      categoryDeclared: categoryDeclared || Boolean(company.category),
      clearValueProp: clearValueProp || Boolean(company.description),
      structuredListsCount,
      tablesCount,
      externalReferenceDomains: discoveredExternalDomains.size,
      totalAuditedPages: crawlPages.length,
      totalAuditedWords: totalWords,
    },
    aggregateStats: {
      citablePassagesCount: topPassages.length,
      aiImpressionIndex,
      aiSearchVolume,
      totalAuditedWordsFormatted,
    },
    citationReadinessStage,
    strategicActions: strategicActions.slice(0, 3),
  };
}
