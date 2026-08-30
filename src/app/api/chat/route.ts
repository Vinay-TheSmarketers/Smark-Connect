import { z } from "zod";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { getProvider } from "@/lib/llm";
import { loadSkillPack } from "@/lib/skills/loader";
import { getInternalOperation } from "@/lib/skills/registry";

const schema = z.object({ companyId: z.string().min(1), sessionId: z.string().optional(), message: z.string().trim().min(1).max(5000) });

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to chat." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a message." }, { status: 400 });
  if (user.demoMode) return Response.json({ error: "Demo Mode — connect a real provider key in Settings to chat live." }, { status: 409 });
  if (!user.llmProvider || !user.llmApiKeyEnc || !user.llmModel) return Response.json({ error: "Reconnect your provider key in Settings." }, { status: 403 });
  if (user.tokenBudget > 0 && user.tokenUsed >= user.tokenBudget) {
    return Response.json({ error: "Your token budget has been reached. Update your token limit in Settings to continue." }, { status: 403 });
  }
  const company = await db.company.findFirst({ where: { id: parsed.data.companyId, userId: user.id }, include: { documents: true, agentRuns: { where: { status: "DONE" }, orderBy: { createdAt: "desc" }, take: 8 }, chatAttachments: { where: { remembered: true }, take: 6 } } });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });
  let session = parsed.data.sessionId ? await db.chatSession.findFirst({ where: { id: parsed.data.sessionId, companyId: company.id }, include: { messages: { orderBy: { createdAt: "asc" }, take: 12 } } }) : null;
  if (!session) session = await db.chatSession.create({ data: { companyId: company.id, title: parsed.data.message.slice(0, 80) }, include: { messages: true } });
  await db.chatMessage.create({ data: { sessionId: session.id, role: "user", content: parsed.data.message } });
  const context = [
    `Company: ${company.name}\nWebsite: ${company.websiteUrl}\nDescription: ${company.description ?? ""}`,
    ...company.documents.map((document) => `DOCUMENT — ${document.title}\n${document.contentMarkdown}`),
    ...company.agentRuns.map((run) => `AGENT — ${run.agentType}\n${JSON.stringify(run.output)}`),
    ...company.chatAttachments.map((attachment) => `REMEMBERED ATTACHMENT — ${attachment.title}\n${attachment.content}`),
  ].join("\n\n---\n\n").slice(0, 70_000);
  const history = session.messages.slice(-10).map((message) => ({ role: message.role === "assistant" ? "assistant" as const : "user" as const, content: message.content }));
  try {
    const operation = getInternalOperation("ai-cmo-chat");
    const embeddedSkills = await loadSkillPack(operation.skills, 48_000);
    const content = await getProvider(user.llmProvider).complete({ apiKey: decryptSecret(user.llmApiKeyEnc), model: user.llmModel, system: `You are the AI CMO inside Smark Connect. Execute the numbered local skill chain in order; do not substitute an improvised marketing framework. Give direct guidance grounded in the supplied company context, distinguish evidence from recommendations, and never invent company facts.\n\nREQUIRED SKILL CHAIN\n${embeddedSkills}\n\nOPERATION RULES\n${operation.instructions}\n\nCOMPANY CONTEXT\n${context}`, messages: [...history, { role: "user", content: parsed.data.message }], maxTokens: 1200, temperature: 0.35 });
    await db.chatMessage.create({ data: { sessionId: session.id, role: "assistant", content } });
    const estimatedTokens = Math.max(250, Math.ceil((context.length + content.length + parsed.data.message.length) / 4));
    await db.user.update({ where: { id: user.id }, data: { tokenUsed: { increment: estimatedTokens } } });
    return Response.json({ sessionId: session.id, content });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The provider request failed." }, { status: 400 });
  }
}
