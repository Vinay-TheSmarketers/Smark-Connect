import { after } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { assertPublicUrl, normalizedDomain, normalizeWebsiteUrl } from "@/lib/crawl/url-safety";
import { runInitialAudit } from "@/lib/audit/run-initial-audit";
import { discoverCompanyLogo } from "@/lib/company-logo";

const schema = z.object({ companyName: z.string().trim().min(2).max(120), websiteUrl: z.string().trim().min(4).max(2048) });

export const maxDuration = 1800;

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to add a company." }, { status: 401 });
  if (!user.llmVerifiedAt) return Response.json({ error: "Connect and verify an LLM provider first.", requiresProvider: true }, { status: 403 });
  if (user.demoMode) return Response.json({ error: "Connect and verify a live AI provider before auditing a new company.", requiresProvider: true }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Enter a company name and website." }, { status: 400 });
  try {
    const url = await assertPublicUrl(normalizeWebsiteUrl(parsed.data.websiteUrl));
    const domain = normalizedDomain(url);
    const logoUrl = await discoverCompanyLogo(url).catch(() => null);
    const result = await db.$transaction(async (tx) => {
      const company = await tx.company.upsert({
        where: { userId_normalizedDomain: { userId: user.id, normalizedDomain: domain } },
        update: { name: parsed.data.companyName, websiteUrl: url.href, logoUrl, status: "ONBOARDING", crawlStatus: "QUEUED", crawlProgress: 0, crawlStep: "Queued", crawlError: null },
        create: { userId: user.id, name: parsed.data.companyName, websiteUrl: url.href, normalizedDomain: domain, logoUrl },
      });
      const job = await tx.auditJob.create({ data: { companyId: company.id } });
      return { company, job };
    });
    after(() => runInitialAudit(result.job.id));
    return Response.json({ companyId: result.company.id, jobId: result.job.id }, { status: 202 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "This website could not be reached safely." }, { status: 400 });
  }
}
