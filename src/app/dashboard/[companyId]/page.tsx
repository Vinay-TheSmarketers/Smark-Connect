import { notFound, redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard-client";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ALL_DOCUMENTS } from "@/lib/skills/registry";
import { createCompanyContext } from "@/lib/company-brief";

export default async function DashboardPage({ params }: PageProps<"/dashboard/[companyId]">) {
  const user = await requireUser();
  if (!user.llmVerifiedAt) redirect("/onboarding/ai");
  const { companyId } = await params;
  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    include: {
      documents: { where: { type: { in: ALL_DOCUMENTS.map((document) => document.type) } }, orderBy: { createdAt: "asc" } },
      crawlPages: { orderBy: { fetchedAt: "desc" }, take: 12, select: { url: true, title: true, description: true, content: true } },
      agentRuns: { where: { status: "DONE" }, orderBy: { createdAt: "desc" } },
      _count: { select: { crawlPages: true } },
      auditJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      integrations: { select: { provider: true, status: true, connectedAt: true }, orderBy: { provider: "asc" } },
      agentConfigs: { select: { agentType: true, config: true } },
    },
  });
  if (!company) notFound();
  if (company.status !== "ACTIVE" && company.auditJobs[0]) redirect(`/onboarding/audit/${company.auditJobs[0].id}`);
  const companies = await db.company.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, websiteUrl: true, logoUrl: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  const latestAgents = Array.from(new Map(company.agentRuns.map((run) => [run.agentType, run])).values());
  const companyContext = createCompanyContext({ ...company, intelligenceMarkdown: company.documents.find((document) => document.type === "COMPANY_INTELLIGENCE")?.contentMarkdown, crawlPages: company.crawlPages });
  return <DashboardClient data={{
    company: { id: company.id, name: company.name, websiteUrl: company.websiteUrl, logoUrl: company.logoUrl, category: company.category, companyContext, lastAuditedAt: company.lastAuditedAt?.toISOString() ?? null },
    companies,
    user: { name: user.name, email: user.email, llmProvider: user.llmProvider, llmKeyPreview: user.llmKeyPreview, demoMode: user.demoMode, tokenBudget: user.tokenBudget, tokenUsed: user.tokenUsed },
    documents: company.documents.map((document) => ({ ...document, createdAt: document.createdAt.toISOString(), updatedAt: document.updatedAt.toISOString() })),
    agents: latestAgents.map((run) => ({ id: run.id, agentType: run.agentType, status: run.status, summary: run.summary, output: run.output, sources: run.sources, skills: run.skills, confidence: run.confidence, tokensUsed: run.tokensUsed, error: run.error, createdAt: run.createdAt.toISOString() })),
    integrations: company.integrations.map((integration) => ({ provider: integration.provider, status: integration.status, connectedAt: integration.connectedAt?.toISOString() ?? null })),
    agentConfigs: company.agentConfigs.map((config) => ({ agentType: config.agentType, config: config.config })),
    pagesRead: company._count.crawlPages,
    analysis: company.auditJobs[0] ? { jobId: company.auditJobs[0].id, status: company.auditJobs[0].status, progress: company.auditJobs[0].progress, step: company.auditJobs[0].step } : null,
  }} />;
}
