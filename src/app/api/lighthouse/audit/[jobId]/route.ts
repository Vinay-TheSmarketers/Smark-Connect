import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to view Lighthouse reports.", code: "UNAUTHORIZED" }, { status: 401 });
  const { jobId } = await context.params;
  const job = await db.lighthouseAuditJob.findFirst({ where: { id: jobId, userId: user.id } });
  if (!job) return Response.json({ error: "Lighthouse audit job not found.", code: "NOT_FOUND" }, { status: 404 });
  return Response.json({
    jobId: job.id,
    url: job.normalizedUrl,
    strategy: job.strategy,
    status: job.status.toLowerCase(),
    cached: job.cacheHit,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    result: job.result,
    error: job.errorMessage,
    code: job.errorCode,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
