import "server-only";
import { db } from "../db";
import { deriveResearchTopics } from "../skills/runner";
import { discoverLiveResearch } from "../research/live-discovery";
import { buildCompanyStrategicProfile } from "./company-profiler";
import { analyzeCompetitorLandscape } from "./analyzer";
import { synthesizeSkillsAndFindings } from "./skills-synthesizer";
import type { CompetitorIntelligencePayload } from "./types";

/**
 * Runs the end-to-end continuous Competitor Intelligence Pipeline
 * starting strictly from the company URL as the primary source of truth.
 */
export async function runCompetitorIntelligencePipeline(args: {
  companyId: string;
  userId: string;
}): Promise<CompetitorIntelligencePayload> {
  const company = await db.company.findFirst({
    where: { id: args.companyId, userId: args.userId },
    include: {
      crawlPages: { orderBy: { wordCount: "desc" }, take: 24 },
      documents: {
        where: { type: "COMPETITOR_ANALYSIS" },
        take: 1,
      },
    },
  });

  if (!company) {
    throw new Error(`Company with id ${args.companyId} not found.`);
  }

  // 1. Build Company Strategic Profile (Source of Truth)
  const companyProfile = await buildCompanyStrategicProfile(company.id);

  // 2. Discover live competitor signals across public web index
  const topics = deriveResearchTopics(company.crawlPages, company.name);
  const liveItems = await discoverLiveResearch({
    agentType: "COMPETITOR",
    companyName: company.name,
    websiteUrl: company.websiteUrl,
    topics: topics.length > 0 ? topics : [companyProfile.category],
  });

  // 3. Extract existing document competitor metadata if available
  const compDoc = company.documents[0];
  const docMeta = compDoc?.metadata as {
    competitors?: Array<{ companyName?: string; officialWebsite?: string; positioning?: string; competitiveAttributes?: string[] }>;
  } | undefined;

  // 4. Analyze and build 5-6 distinct Competitor Profiles
  const competitors = await analyzeCompetitorLandscape(
    companyProfile,
    liveItems,
    docMeta?.competitors
  );

  // 5. Run Skills Synthesis across installed skills into normalized findings and merged action items
  const { findings, actionItems } = synthesizeSkillsAndFindings(companyProfile, competitors);

  // 6. Formulate high-level summaries
  const compNames = competitors.map((c) => c.name).join(", ");
  const executiveSummary = `${companyProfile.companyName} operates in the ${companyProfile.category} market, competing against ${competitors.length} key market alternatives (${compNames}). Strategic analysis indicates strong offer-to-pain alignment with opportunities to widen competitive moats by weaponizing deployment velocity, transparent pricing, and structured AI search readiness against legacy incumbent overhead.`;
  
  const companyPositioningSummary = `${companyProfile.positioning} Grounded in ${companyProfile.proofPoints[0] || "verified operational performance"}, the company addresses ${companyProfile.painPoints[0]?.toLowerCase() || "core market bottlenecks"} for ${companyProfile.icpsAndPersonas[0]?.role || "modern teams"}.`;

  return {
    companyProfile,
    competitors,
    executiveSummary,
    companyPositioningSummary,
    findings,
    actionItems,
    generatedAt: new Date().toISOString(),
    analyzedSourcesCount: liveItems.length + company.crawlPages.length,
  };
}
