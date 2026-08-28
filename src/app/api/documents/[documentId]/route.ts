import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { getProvider } from "@/lib/llm";
import { loadSkillPackWithManifest, type SkillExecutionStep } from "@/lib/skills/loader";
import { getDocumentDefinition, getInternalOperation, mergeSkillChains } from "@/lib/skills/registry";
import { appendCompleteResearchAppendix, estimateTokens } from "@/lib/skills/runner";
import { unwrapStructuredText } from "@/lib/text-format";

const schema = z.object({ prompt: z.string().trim().min(3).max(4000), focused: z.boolean().default(true) });

export async function PATCH(request: Request, context: { params: Promise<{ documentId: string }> }) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to edit a document." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Describe the document change you want." }, { status: 400 });
  const { documentId } = await context.params;
  const document = await db.document.findFirst({ where: { id: documentId, company: { userId: user.id } }, include: { company: { include: { crawlPages: { orderBy: { fetchedAt: "desc" }, take: 48 }, pageSpeedAudits: { orderBy: { createdAt: "desc" }, take: 2 } } } } });
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
  if (document.locked) return Response.json({ error: "Unlock this document before editing it." }, { status: 409 });
  if (user.demoMode) return Response.json({ error: "Demo Mode preserves the prepared documents. Connect a real provider key to edit with AI." }, { status: 409 });
  if (!user.llmProvider || !user.llmApiKeyEnc || !user.llmModel) return Response.json({ error: "Reconnect your AI provider in Settings." }, { status: 403 });

  const definition = getDocumentDefinition(document.type);
  if (!definition) return Response.json({ error: "This document type has no mapped skill chain and cannot be edited." }, { status: 409 });
  const editOperation = getInternalOperation("document-edit");
  const skillChain = mergeSkillChains(definition.skills, editOperation.skills);
  let embeddedSkills: string;
  let executionSteps: SkillExecutionStep[];
  try {
    const skillPack = await loadSkillPackWithManifest(skillChain, 72_000);
    embeddedSkills = skillPack.content;
    executionSteps = skillPack.steps;
  }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "The required skill chain could not be loaded." }, { status: 409 }); }
  const evidence = parsed.data.focused
    ? `CURRENT DOCUMENT\n${document.contentMarkdown}`
    : [`CURRENT DOCUMENT\n${document.contentMarkdown}`, ...document.company.crawlPages.map((page) => `SOURCE ${page.url}\n${page.content.slice(0, 6000)}`)].join("\n\n---\n\n").slice(0, 160_000);
  const system = `You are the document editor inside Smark Connect. Execute the numbered local skill chain in order, including the document's subject skills followed by the editing and source-quality skills. Preserve factual accuracy, source attribution, matrices, research appendix, and the existing structure. ${parsed.data.focused ? "Make the smallest coherent change that satisfies the request. Keep every unrelated section unchanged and return the entire revised document, not only the changed passage." : "Regenerate the full report coherently using every supplied source."} Lead each section with its most important non-obvious finding. Cut filler and repeated findings, connect related findings across modules, and propose a visual only when the evidence contains a genuine comparison, sequence, trend, funnel, or impact/effort relationship. Use SEO, GEO, ICP, PESTEL, SWOT, ROI, KPI, CTR, CTA, AI, API, URL, and B2B in full capitals. Return Markdown only, beginning with one H1 title—never a JSON wrapper or a contentMarkdown field. Never invent metrics, rankings, customers, competitors, or citations.`;
  const prompt = `COMPANY: ${document.company.name}\nDOCUMENT: ${document.title}\nEDIT REQUEST: ${parsed.data.prompt}\nEDIT MODE: ${parsed.data.focused ? "focused patch" : "full regeneration"}\n\nREQUIRED ORDERED SKILL CHAIN\n${embeddedSkills}\n\nOPERATION RULES\n${definition.instructions}\n${editOperation.instructions}\n\n${evidence}`;
  try {
    const rawMarkdown = unwrapStructuredText(await getProvider(user.llmProvider).complete({ apiKey: decryptSecret(user.llmApiKeyEnc), model: user.llmModel, system, messages: [{ role: "user", content: prompt }], maxTokens: parsed.data.focused ? 5000 : 8000, temperature: 0.2 })).trim().replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/, "");
    if (parsed.data.focused && rawMarkdown.length < document.contentMarkdown.length * .55) throw new Error("The provider returned only a fragment. The original document was preserved; try a more specific edit or a larger-output model.");
    const contentMarkdown = appendCompleteResearchAppendix(rawMarkdown, { companyName: document.company.name, websiteUrl: document.company.websiteUrl, pages: document.company.crawlPages, pageSpeed: document.company.pageSpeedAudits });
    const tokenEstimate = estimateTokens(system, prompt, contentMarkdown);
    const updated = await db.$transaction(async (tx) => {
      await tx.documentVersion.create({ data: { documentId: document.id, version: document.version, contentMarkdown: document.contentMarkdown, editPrompt: parsed.data.prompt, editMode: parsed.data.focused ? "focused" : "regenerate", tokenEstimate } });
      const next = await tx.document.update({ where: { id: document.id }, data: { contentMarkdown, skillProvenance: skillChain as unknown as Prisma.InputJsonValue, tokenEstimate, version: { increment: 1 }, metadata: { ...((document.metadata as Record<string, unknown> | null) ?? {}), generationMode: "live-skill-edit", skillExecution: { status: "verified", executedAt: new Date().toISOString(), provider: user.llmProvider, model: user.llmModel, steps: executionSteps }, lastEditPrompt: parsed.data.prompt, lastEditMode: parsed.data.focused ? "focused" : "regenerate" } as Prisma.InputJsonValue } });
      await tx.user.update({ where: { id: user.id }, data: { tokenUsed: { increment: tokenEstimate } } });
      return next;
    });
    return Response.json({ document: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The document could not be edited." }, { status: 400 });
  }
}
