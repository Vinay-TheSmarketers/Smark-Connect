import { after } from "next/server";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { runInitialAudit } from "@/lib/audit/run-initial-audit";
import { CORE_DOCUMENTS } from "@/lib/skills/registry";

function requiresProviderReconnect(user: { demoMode: boolean; llmVerifiedAt: Date | null; llmProvider: string | null; llmApiKeyEnc: string | null; llmModel: string | null }, job: { error: string | null; completedAt: Date | null }) {
  if (user.demoMode || !user.llmVerifiedAt || !user.llmProvider || !user.llmApiKeyEnc || !user.llmModel) return true;
  const credentialFailure = /api[ -]?key|provider|authentication|unauthorized/i.test(job.error ?? "");
  return credentialFailure && (!job.completedAt || user.llmVerifiedAt <= job.completedAt);
}

function requiresModelChange(user: { llmProvider: string | null; llmVerifiedAt: Date | null }, job: { error: string | null; completedAt: Date | null }) {
  const modelFailure = user.llmProvider === "openrouter" && /model returned no usable content|supports long structured responses|structured report support/i.test(job.error ?? "");
  const modelWasChanged = Boolean(user.llmVerifiedAt && job.completedAt && user.llmVerifiedAt > job.completedAt);
  return modelFailure && !modelWasChanged;
}

export async function GET(_request: Request, context: RouteContext<"/api/audits/[jobId]">) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await context.params;
  const job = await db.auditJob.findFirst({ where: { id: jobId, company: { userId: user.id } }, include: { company: { include: { documents: { where: { type: { in: CORE_DOCUMENTS.map((document) => document.type) } }, select: { type: true, title: true } }, _count: { select: { crawlPages: true, agentRuns: true } } } } } });
  if (!job) return Response.json({ error: "Audit not found" }, { status: 404 });
  return Response.json({ status: job.status, progress: job.progress, step: job.step, error: job.error, requiresProvider: requiresProviderReconnect(user, job), requiresModelChange: requiresModelChange(user, job), companyId: job.companyId, companyName: job.company.name, pagesRead: job.company._count.crawlPages, agentsReady: job.company._count.agentRuns, documents: job.company.documents });
}

export async function POST(_request: Request, context: RouteContext<"/api/audits/[jobId]">) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await context.params;
  const previous = await db.auditJob.findFirst({ where: { id: jobId, company: { userId: user.id } } });
  if (!previous) return Response.json({ error: "Audit not found" }, { status: 404 });
  if (requiresProviderReconnect(user, previous)) {
    return Response.json({ error: "Connect and verify a live AI provider before retrying this audit.", requiresProvider: true }, { status: 409 });
  }
  if (requiresModelChange(user, previous)) {
    return Response.json({ error: "Choose and verify a different OpenRouter model before retrying this audit.", requiresModelChange: true }, { status: 409 });
  }
  const reuseEvidence = previous.progress >= 28;
  const job = await db.auditJob.create({ data: { companyId: previous.companyId, progress: reuseEvidence ? 28 : 0, step: reuseEvidence ? "Reusing saved website evidence" : "Queued" } });
  await db.company.update({ where: { id: previous.companyId }, data: { status: "ONBOARDING", crawlStatus: "QUEUED", crawlProgress: reuseEvidence ? 28 : 0, crawlStep: reuseEvidence ? "Reusing saved website evidence" : "Queued", crawlError: null } });
  after(() => runInitialAudit(job.id));
  return Response.json({ jobId: job.id }, { status: 202 });
}
