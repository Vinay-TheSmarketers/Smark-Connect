import { notFound, redirect } from "next/navigation";
import { AuditProgress } from "@/components/audit-progress";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { AUDIT_DOCUMENT_QUEUE, AUDIT_PRIORITY_DOCUMENT_TYPES } from "@/lib/skills/registry";

export default async function AuditPage({ params }: PageProps<"/onboarding/audit/[jobId]">) {
  const user = await requireUser();
  const { jobId } = await params;
  const job = await db.auditJob.findFirst({ where: { id: jobId, company: { userId: user.id } }, include: { company: { include: { documents: { where: { type: { in: AUDIT_DOCUMENT_QUEUE.map((document) => document.type) } }, select: { type: true, title: true } }, _count: { select: { crawlPages: true, agentRuns: true } } } } } });
  if (!job) notFound();
  const priorityReportsReady = AUDIT_PRIORITY_DOCUMENT_TYPES.every((type) => job.company.documents.some((document) => document.type === type));
  if (["DONE", "PARTIAL"].includes(job.status) || (job.status === "RUNNING" && priorityReportsReady)) redirect(`/dashboard/${job.companyId}`);
  const credentialFailure = /api[ -]?key|provider|authentication|unauthorized/i.test(job.error ?? "");
  const providerWasReconnected = Boolean(user.llmVerifiedAt && job.completedAt && user.llmVerifiedAt > job.completedAt);
  const requiresProvider = user.demoMode || !user.llmVerifiedAt || !user.llmProvider || !user.llmApiKeyEnc || !user.llmModel || (credentialFailure && !providerWasReconnected);
  const modelFailure = user.llmProvider === "openrouter" && /model returned no usable content|supports long structured responses|structured report support/i.test(job.error ?? "");
  const requiresModelChange = modelFailure && !providerWasReconnected;
  return <OnboardingLayout activeStep={2}><AuditProgress jobId={job.id} initial={{ status: job.status, progress: job.progress, step: job.step, error: job.error, requiresProvider, requiresModelChange, companyId: job.companyId, companyName: job.company.name, pagesRead: job.company._count.crawlPages, agentsReady: job.company._count.agentRuns, documents: job.company.documents }} /></OnboardingLayout>;
}
