export const LIGHTHOUSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function isReusableAudit(job: { status: string; expiresAt: Date | null; result: unknown }, now = new Date()) {
  return job.status === "COMPLETED" && job.result !== null && Boolean(job.expiresAt && job.expiresAt.getTime() > now.getTime());
}

export function isActiveDuplicate(job: { status: string } | null | undefined) {
  return job?.status === "QUEUED" || job?.status === "RUNNING";
}
