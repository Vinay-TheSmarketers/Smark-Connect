import "server-only";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { runCompetitorIntelligencePipeline } from "@/lib/competitors/pipeline";
import type { CompetitorIntelligencePayload } from "@/lib/competitors/types";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to view competitor intelligence." }, { status: 401 });

  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  if (!companyId) return Response.json({ error: "companyId is required" }, { status: 400 });

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true, name: true, websiteUrl: true },
  });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  // Get latest COMPETITOR AgentRun
  const latestRun = await db.agentRun.findFirst({
    where: { companyId: company.id, agentType: "COMPETITOR", status: "DONE" },
    orderBy: { createdAt: "desc" },
  });

  const output = latestRun?.output && typeof latestRun.output === "object" ? (latestRun.output as Record<string, unknown>) : null;

  const hasInvalidCompetitors = Array.isArray(output?.competitors) && (output.competitors as Array<Record<string, unknown>>).some((c) => {
    const site = String(c.officialWebsite || c.website || "").toLowerCase();
    const name = String(c.name || c.companyName || "").toLowerCase();
    return (
      site.includes("merriam-webster") ||
      site.includes("key-test") ||
      site.includes("keyboard-tester") ||
      site.includes("dictionary") ||
      site === "key.com" ||
      site.includes("ibx.key.com") ||
      name.includes("definition") ||
      name.includes("tester") ||
      name.includes("keybank") ||
      name.includes("meaning")
    );
  });

  if (output && output.competitors && output.companyProfile && !hasInvalidCompetitors) {
    return Response.json({
      payload: output as unknown as CompetitorIntelligencePayload,
      runId: latestRun?.id ?? null,
      lastAnalyzedAt: latestRun?.completedAt ?? null,
    });
  }

  // If no previous run or legacy format, generate on-the-fly
  try {
    const payload = await runCompetitorIntelligencePipeline({
      companyId: company.id,
      userId: user.id,
    });

    return Response.json({
      payload,
      runId: latestRun?.id ?? null,
      lastAnalyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate competitor intelligence.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to run competitor intelligence." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const companyId = body.companyId;
  if (!companyId) return Response.json({ error: "companyId is required" }, { status: 400 });

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true, name: true },
  });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  try {
    const payload = await runCompetitorIntelligencePipeline({
      companyId: company.id,
      userId: user.id,
    });

    return Response.json({
      success: true,
      payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run competitor intelligence pipeline.";
    return Response.json({ error: message }, { status: 500 });
  }
}
