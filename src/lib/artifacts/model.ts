import { cleanInlineMarkdown, parseMarkdown, type DocumentBlock } from "../documents/content";
import type { ArtifactManifest, ReportDataModel, ReportFinding, ReportRecommendation, ReportSection } from "./types";

type ModelInput = {
  reportType: string;
  companyName: string;
  companyWebsite?: string;
  companyCategory?: string | null;
  title: string;
  markdown: string;
  updatedAt: Date;
  sourceCount: number;
  competitors?: ReportDataModel["competitors"];
  manifest: ArtifactManifest;
};

const confidence = (value: string): ReportFinding["confidence"] => {
  if (/\bhigh confidence\b/i.test(value)) return "high";
  if (/\bmedium confidence\b/i.test(value)) return "medium";
  if (/\blow confidence\b/i.test(value)) return "low";
  return "unrated";
};

const priority = (value: string): ReportRecommendation["priority"] => {
  if (/\b(?:critical|high|priority 1|p1)\b/i.test(value)) return "high";
  if (/\b(?:medium|priority 2|p2)\b/i.test(value)) return "medium";
  if (/\b(?:low|priority 3|p3)\b/i.test(value)) return "low";
  return "unrated";
};

function prefix(reportType: string) {
  return ({
    SEO_AUDIT: "SEO",
    GEO_AUDIT: "GEO",
    COMPETITOR_ANALYSIS: "COMP",
    AUDIENCE_ANALYSIS: "ICP",
    CONTENT_AUDIT: "CONTENT",
    CONTENT_STRATEGY: "CONTENT",
    MARKETING_STRATEGY: "GTM",
    PRODUCT_INFO: "OFFER",
    COMPANY_INTELLIGENCE: "COMPANY",
    DESIGN_GUIDE: "DESIGN",
    STRATEGIC_INTELLIGENCE: "STRAT",
  } as Record<string, string>)[reportType] ?? "REC";
}

function textOf(block: DocumentBlock): string {
  return block.type === "table" ? block.rows.flat().join(" ") : block.text;
}

function sectionize(blocks: DocumentBlock[]): Array<{ title: string; blocks: DocumentBlock[] }> {
  const sections: Array<{ title: string; blocks: DocumentBlock[] }> = [];
  let current = { title: "Executive summary", blocks: [] as DocumentBlock[] };
  for (const block of blocks) {
    if (block.type === "h1" || block.type === "h2") {
      if (current.blocks.length) sections.push(current);
      current = { title: block.text, blocks: [] };
    } else current.blocks.push(block);
  }
  if (current.blocks.length || sections.length === 0) sections.push(current);
  return sections;
}

function uniqueMatches(markdown: string, pattern: RegExp, limit = 30): string[] {
  return Array.from(markdown.matchAll(pattern), (match) => cleanInlineMarkdown(match[1] ?? match[0]))
    .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
    .slice(0, limit);
}

export function buildReportDataModel(input: ModelInput): ReportDataModel {
  const blocks = parseMarkdown(input.markdown);
  const rawSections = sectionize(blocks);
  const urls = Array.from(input.markdown.matchAll(/https?:\/\/[^\s)\]>]+/g), (match) => match[0].replace(/[.,;:]$/, ""))
    .filter((url, index, values) => values.indexOf(url) === index);
  const sources = urls.map((url, index) => ({ id: `SRC-${String(index + 1).padStart(3, "0")}`, url, label: new URL(url).hostname.replace(/^www\./, "") }));
  const findingSourceIds = sources.map((source) => source.id);
  const recommendationPrefix = prefix(input.reportType);
  const findings: ReportFinding[] = [];
  const recommendations: ReportRecommendation[] = [];
  const sections: ReportSection[] = rawSections.map((section, sectionIndex) => {
    const narrativeBlocks = section.blocks.filter((block) => block.type !== "table");
    const narrative = narrativeBlocks.map(textOf).join(" ").trim();
    const findingId = `${recommendationPrefix}-F${String(sectionIndex + 1).padStart(3, "0")}`;
    if (narrative) findings.push({ id: findingId, title: section.title, narrative, confidence: confidence(narrative), sourceIds: findingSourceIds });
    const actionSection = /\b(?:recommend|action|roadmap|priority|next step|opportunit|plan)\b/i.test(section.title);
    const candidates = section.blocks.filter((block) => block.type === "bullet" || block.type === "number" || (actionSection && block.type === "paragraph"));
    const recommendationIds = candidates.map((block) => {
      const detail = textOf(block);
      const recommendation: ReportRecommendation = {
        id: `${recommendationPrefix}-${String(recommendations.length + 1).padStart(3, "0")}`,
        title: detail.split(/[.:;]/, 1)[0].slice(0, 100),
        detail,
        priority: priority(detail),
        findingIds: narrative ? [findingId] : [],
      };
      recommendations.push(recommendation);
      return recommendation.id;
    });
    return {
      id: `SEC-${String(sectionIndex + 1).padStart(3, "0")}`,
      title: section.title,
      blocks: section.blocks,
      findingIds: narrative ? [findingId] : [],
      recommendationIds,
    };
  });
  const paragraphText = blocks.filter((block) => block.type === "paragraph" || block.type === "quote").map(textOf);
  const metricTokens = uniqueMatches(input.markdown, /(?<![A-Za-z])([$£€]?\d[\d,]*(?:\.\d+)?\s*%?)/g, 12);
  const metrics = metricTokens.map((value, index) => ({ id: `MET-${String(index + 1).padStart(3, "0")}`, label: `Reported metric ${index + 1}`, value, context: paragraphText.find((text) => text.includes(value)) ?? "Reported in the source analysis." }));
  const summarySection = sections.find((section) => /executive|summary|overview/i.test(section.title));
  const executiveSummary = (summarySection?.blocks ?? blocks).filter((block) => block.type !== "table" && !block.type.startsWith("h")).map(textOf).filter(Boolean).slice(0, 5);
  const tables = blocks.filter((block): block is Extract<DocumentBlock, { type: "table" }> => block.type === "table").map((block) => block.rows);
  const narrativeBlocks = blocks.filter((block): block is Exclude<DocumentBlock, { type: "table" }> => block.type !== "table");
  const assumptions = narrativeBlocks.filter((block) => /\b(?:assumption|hypothesis|unknown|validate)\b/i.test(block.text)).map((block) => block.text).slice(0, 20);
  const issues = narrativeBlocks.filter((block) => /\b(?:issue|risk|gap|problem|constraint|blocker)\b/i.test(block.text)).map((block) => block.text).slice(0, 30);
  const opportunities = narrativeBlocks.filter((block) => /\b(?:opportunity|potential|quick win|whitespace|improve)\b/i.test(block.text)).map((block) => block.text).slice(0, 30);
  const appendices = sections.filter((section) => /appendix|source|methodolog/i.test(section.title));

  return {
    reportType: input.reportType,
    company: { name: input.companyName, website: input.companyWebsite, category: input.companyCategory },
    reportPeriod: { updatedAt: input.updatedAt.toISOString(), label: input.updatedAt.toISOString().slice(0, 7) },
    title: input.title,
    executiveSummary: executiveSummary.length ? executiveSummary : ["Review the detailed findings and prioritized recommendations in this report."],
    metrics,
    findings,
    recommendations,
    competitors: input.competitors ?? [],
    keywords: uniqueMatches(input.markdown, /(?:keyword|query)\s*[:|-]\s*([^\n|]+)/gi),
    contentItems: uniqueMatches(input.markdown, /(?:content|article|post|asset)\s*[:|-]\s*([^\n|]+)/gi),
    campaigns: uniqueMatches(input.markdown, /campaign\s*[:|-]\s*([^\n|]+)/gi),
    personas: uniqueMatches(input.markdown, /(?:ICP|persona|segment)\s*(?:#?\d+)?\s*[:|-]\s*([^\n|]+)/gi),
    channels: uniqueMatches(input.markdown, /(?:channel|platform)\s*[:|-]\s*([^\n|]+)/gi),
    issues,
    opportunities,
    roadmap: recommendations,
    scores: metrics.filter((metric) => /%|score/i.test(`${metric.label} ${metric.context}`)),
    sources,
    assumptions,
    confidenceLevels: findings.map((finding) => finding.confidence),
    visualizations: input.manifest.requiredVisuals,
    tables,
    appendices,
    sections,
    lineage: recommendations.map((recommendation, index) => ({
      sourceId: sources[index % Math.max(1, sources.length)]?.id,
      findingId: recommendation.findingIds[0],
      recommendationId: recommendation.id,
      artifactReferences: {
        pdf: `Recommendation ${recommendation.id}`,
        pptx: `Roadmap / ${recommendation.id}`,
        xlsx: `Action Tracker / ${recommendation.id}`,
      },
    })),
  };
}
