import { parseMarkdown } from "../documents/content";
import type { ArtifactFormat, ArtifactManifest, ArtifactProfile } from "./types";

const DEFAULT_PROFILE: ArtifactProfile = {
  pdf: "required",
  pptx: "required",
  xlsx: "optional",
  primaryArtifact: "pdf",
  theme: "executive-strategy",
  targetSlides: 16,
  requiredVisuals: ["executive-summary", "priority-matrix", "roadmap"],
  requiredSheets: ["01_Summary", "02_Action_Tracker", "03_Source_Register"],
  appendixRequired: true,
};

export const ARTIFACT_PROFILES: Record<string, ArtifactProfile> = {
  COMPANY_INTELLIGENCE: {
    ...DEFAULT_PROFILE,
    theme: "executive-strategy",
    requiredVisuals: ["offer-value-stack", "positioning-map", "proof-ladder"],
  },
  SEO_AUDIT: {
    ...DEFAULT_PROFILE,
    xlsx: "required",
    theme: "technical-diagnostic",
    targetSlides: 18,
    requiredVisuals: ["seo-health", "severity-matrix", "crawl-architecture", "priority-matrix"],
    requiredSheets: ["01_Summary", "02_Issues", "03_Page_Audit", "04_Technical_Issues", "05_Priority_Backlog", "06_Source_Register"],
  },
  GEO_AUDIT: {
    ...DEFAULT_PROFILE,
    xlsx: "required",
    theme: "search-intelligence",
    targetSlides: 17,
    requiredVisuals: ["ai-readiness", "entity-map", "citation-readiness", "question-coverage"],
    requiredSheets: ["01_Summary", "02_AI_Visibility_Gaps", "03_Question_Coverage", "04_Priority_Backlog", "05_Source_Register"],
  },
  COMPETITOR_ANALYSIS: {
    ...DEFAULT_PROFILE,
    theme: "competitive-intelligence",
    targetSlides: 18,
    requiredVisuals: ["positioning-map", "competitor-matrix", "threat-ranking", "strategic-whitespace"],
    requiredSheets: ["01_Summary", "02_Competitor_Master", "03_Positioning", "04_Strengths_Weaknesses", "05_Opportunity_Gaps", "06_Source_Register"],
  },
  AUDIENCE_ANALYSIS: {
    ...DEFAULT_PROFILE,
    theme: "customer-intelligence",
    targetSlides: 18,
    requiredVisuals: ["icp-comparison", "pain-urgency", "buying-committee", "segment-attractiveness"],
    requiredSheets: ["01_Summary", "02_ICP_Master", "03_Pain_Points", "04_Buying_Committee", "05_Messaging", "06_ICP_Scoring", "07_Source_Register"],
  },
  CONTENT_AUDIT: {
    ...DEFAULT_PROFILE,
    xlsx: "required",
    theme: "growth-strategy",
    targetSlides: 17,
    requiredVisuals: ["content-funnel", "pillar-cluster-map", "content-gap-matrix", "editorial-roadmap"],
    requiredSheets: ["01_Summary", "02_Content_Inventory", "03_Content_Gaps", "04_Content_Ideas", "05_Priority_Backlog", "06_Source_Register"],
  },
  CONTENT_STRATEGY: {
    ...DEFAULT_PROFILE,
    xlsx: "required",
    theme: "growth-strategy",
    targetSlides: 18,
    requiredVisuals: ["topic-ecosystem", "content-funnel", "channel-distribution", "content-roadmap"],
    requiredSheets: ["01_Summary", "02_Content_Calendar", "03_Content_Ideas", "04_Content_Pillars", "05_Keyword_Map", "06_Channel_Strategy", "07_Performance", "08_Source_Register"],
  },
  MARKETING_STRATEGY: {
    ...DEFAULT_PROFILE,
    theme: "executive-strategy",
    targetSlides: 22,
    requiredVisuals: ["executive-dashboard", "cross-functional-priority-map", "integrated-roadmap"],
    requiredSheets: ["01_Summary", "02_Campaigns", "03_Channels", "04_Experiments", "05_Roadmap", "06_KPIs", "07_Owners", "08_Source_Register"],
  },
  PRODUCT_INFO: {
    ...DEFAULT_PROFILE,
    theme: "customer-intelligence",
    requiredVisuals: ["offer-value-stack", "proof-ladder", "objection-map", "package-comparison"],
  },
  DESIGN_GUIDE: {
    ...DEFAULT_PROFILE,
    pptx: "required",
    xlsx: "disabled",
    primaryArtifact: "pptx",
    theme: "executive-strategy",
    requiredVisuals: ["visual-spectrum", "token-system", "template-blueprint"],
    requiredSheets: [],
    appendixRequired: false,
  },
  STRATEGIC_INTELLIGENCE: {
    ...DEFAULT_PROFILE,
    xlsx: "required",
    theme: "executive-strategy",
    targetSlides: 22,
    requiredVisuals: ["executive-dashboard", "cross-functional-priority-map", "integrated-roadmap"],
    requiredSheets: ["01_Summary", "02_Findings", "03_Action_Tracker", "04_Metrics", "05_Source_Register"],
  },
};

type RoutingInput = {
  reportType: string;
  markdown?: string;
  metadata?: unknown;
  competitorCount?: number;
};

function recordCount(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return 0;
  return Object.values(metadata).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0);
}

function structuredSignals(input: RoutingInput) {
  const markdown = input.markdown ?? "";
  const blocks = parseMarkdown(markdown);
  const tables = blocks.filter((block) => block.type === "table");
  const tableRows = tables.reduce((total, table) => total + Math.max(0, table.rows.length - 1), 0);
  const urlCount = new Set(Array.from(markdown.matchAll(/https?:\/\/[^\s)\]>]+/g), (match) => match[0])).size;
  const dateCount = (markdown.match(/\b(?:20\d{2}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})\b/gi) ?? []).length;
  const operationalTerms = (markdown.match(/\b(?:owner|status|due date|publish date|campaign|calendar|schedule|backlog|experiment|priority|score|budget|forecast|keyword|url)\b/gi) ?? []).length;
  const personaCount = (markdown.match(/\b(?:ICP|persona|segment)\s*(?:#|\d|:|-)/gi) ?? []).length;
  return {
    tableRows,
    urlCount,
    dateCount,
    operationalTerms,
    personaCount,
    repeatedMetadataRecords: recordCount(input.metadata),
    competitorCount: input.competitorCount ?? 0,
  };
}

export function getArtifactProfile(reportType: string): ArtifactProfile {
  return ARTIFACT_PROFILES[reportType] ?? DEFAULT_PROFILE;
}

export function resolveArtifactManifest(input: RoutingInput): ArtifactManifest {
  const profile = getArtifactProfile(input.reportType);
  const signals = structuredSignals(input);
  const reusableData = signals.tableRows >= 15
    || signals.dateCount > 0
    || signals.operationalTerms >= 3
    || signals.repeatedMetadataRecords >= 15
    || signals.urlCount >= 8
    || signals.competitorCount > 3
    || signals.personaCount > 1;
  const xlsxEnabled = profile.xlsx === "required" || (profile.xlsx === "optional" && reusableData);
  const reason = xlsxEnabled
    ? profile.xlsx === "required"
      ? "Required by the report profile because the underlying data is operational."
      : "Enabled because the report contains reusable rows, dates, URLs, scores, competitors, or ownership data."
    : profile.xlsx === "disabled"
      ? "Disabled by the report profile because a workbook would not add operational value."
      : "Not enabled because the report does not yet contain reusable structured data.";

  const decision = (format: ArtifactFormat, requirement: ArtifactProfile[ArtifactFormat], enabled: boolean, explanation: string) => ({
    format,
    requirement,
    enabled,
    reason: explanation,
  });

  return {
    reportType: input.reportType,
    primaryArtifact: profile.primaryArtifact,
    theme: profile.theme,
    targetSlides: profile.targetSlides,
    requiredVisuals: profile.requiredVisuals,
    requiredSheets: profile.requiredSheets,
    appendixRequired: profile.appendixRequired,
    decisions: {
      pdf: decision("pdf", profile.pdf, profile.pdf !== "disabled", "The PDF is the detailed analytical source of truth."),
      pptx: decision("pptx", profile.pptx, profile.pptx !== "disabled", "The PPTX is the compressed leadership decision story."),
      xlsx: decision("xlsx", profile.xlsx, xlsxEnabled, reason),
    },
  };
}

export function isArtifactEnabled(manifest: ArtifactManifest, format: ArtifactFormat): boolean {
  return manifest.decisions[format].enabled;
}
