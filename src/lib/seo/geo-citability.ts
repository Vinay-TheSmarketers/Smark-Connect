import * as cheerio from "cheerio";

export type AnswerPassage = {
  heading: string;
  passage: string;
  type: "definition" | "procedure" | "comparison" | "faq";
  citabilityScore: number;
  sourceUrl: string;
};

export type GeoCitabilityReport = {
  entityClarityScore: number;
  overallCitabilityScore: number;
  answerPassages: AnswerPassage[];
  entitySignals: {
    brandEntityFound: boolean;
    categoryDeclared: boolean;
    clearValueProp: boolean;
    structuredListsCount: number;
    tablesCount: number;
  };
  citationReadinessStage: "Initial Discovery" | "Entity Defined" | "Answer Engine Ready" | "High Authority Citations";
  strategicActions: string[];
};

export function analyzeGeoCitability(
  company: { name: string; websiteUrl: string; category?: string | null; description?: string | null },
  crawlPages: Array<{ url: string; title?: string | null; content: string }>,
): GeoCitabilityReport {
  const brandName = company.name.toLowerCase();
  const passages: AnswerPassage[] = [];
  let structuredListsCount = 0;
  let tablesCount = 0;
  let brandEntityFound = false;
  let categoryDeclared = false;
  let clearValueProp = false;

  for (const page of crawlPages) {
    if (!page.content) continue;
    const $ = cheerio.load(page.content);

    // Count structured elements
    structuredListsCount += $("ul, ol").length;
    tablesCount += $("table").length;

    // Check heading and passage patterns
    $("h1, h2, h3").each((_, element) => {
      const heading = $(element).text().trim();
      if (!heading || heading.length < 5) return;

      const headingLower = heading.toLowerCase();
      if (headingLower.includes(brandName)) brandEntityFound = true;
      if (company.category && headingLower.includes(company.category.toLowerCase())) categoryDeclared = true;

      // Check next paragraph or content
      const nextP = $(element).next("p").text().trim() || $(element).next("div").find("p").first().text().trim();
      if (nextP && nextP.length >= 40 && nextP.length <= 450) {
        let type: AnswerPassage["type"] = "definition";
        let score = 75;

        if (/^(how|steps|guide|ways)/i.test(headingLower) || $(element).next("ol, ul").length > 0) {
          type = "procedure";
          score = 85;
        } else if (/^(vs|difference|compare|alternative)/i.test(headingLower) || $(element).next("table").length > 0) {
          type = "comparison";
          score = 90;
        } else if (/\?$/.test(heading)) {
          type = "faq";
          score = 88;
        }

        if (nextP.toLowerCase().includes(brandName)) {
          score = Math.min(100, score + 8);
          clearValueProp = true;
        }

        passages.push({
          heading,
          passage: nextP,
          type,
          citabilityScore: score,
          sourceUrl: page.url,
        });
      }
    });
  }

  // Deduplicate and rank top answer passages
  const topPassages = passages
    .sort((a, b) => b.citabilityScore - a.citabilityScore)
    .slice(0, 5);

  let entityClarityScore = 60;
  if (brandEntityFound) entityClarityScore += 15;
  if (categoryDeclared || Boolean(company.category)) entityClarityScore += 15;
  if (clearValueProp || Boolean(company.description)) entityClarityScore += 10;
  entityClarityScore = Math.min(100, entityClarityScore);

  let overallCitabilityScore = Math.round(
    entityClarityScore * 0.4 +
      (topPassages.length > 0 ? (topPassages.reduce((sum, p) => sum + p.citabilityScore, 0) / topPassages.length) * 0.4 : 20) +
      Math.min(20, (structuredListsCount + tablesCount * 3) * 2),
  );
  overallCitabilityScore = Math.min(98, Math.max(35, overallCitabilityScore));

  let citationReadinessStage: GeoCitabilityReport["citationReadinessStage"] = "Initial Discovery";
  if (overallCitabilityScore >= 85) citationReadinessStage = "High Authority Citations";
  else if (overallCitabilityScore >= 70) citationReadinessStage = "Answer Engine Ready";
  else if (overallCitabilityScore >= 50) citationReadinessStage = "Entity Defined";

  const strategicActions: string[] = [];
  if (topPassages.length < 3) {
    strategicActions.push("Structure 2–3 explicit Q&A answer passages with 40–80 word direct answer definitions under H2 question headings.");
  }
  if (tablesCount === 0) {
    strategicActions.push("Add comparison and feature-matrix HTML tables — AI models like ChatGPT and Perplexity prioritize tabular data.");
  }
  if (!brandEntityFound) {
    strategicActions.push(`Include explicit entity definitions: '${company.name} is a [Category] that [Core Benefit]' in the top-level H1/H2 intro.`);
  }
  strategicActions.push("Ensure Schema.org Organization markup connects official social profiles (sameAs) for entity verification.");

  return {
    entityClarityScore,
    overallCitabilityScore,
    answerPassages: topPassages,
    entitySignals: {
      brandEntityFound,
      categoryDeclared: categoryDeclared || Boolean(company.category),
      clearValueProp: clearValueProp || Boolean(company.description),
      structuredListsCount,
      tablesCount,
    },
    citationReadinessStage,
    strategicActions: strategicActions.slice(0, 3),
  };
}
