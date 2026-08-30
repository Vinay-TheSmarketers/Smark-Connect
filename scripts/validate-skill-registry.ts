import { access } from "node:fs/promises";
import path from "node:path";
import { AgentType, DocumentType } from "@prisma/client";
import { AGENT_DEFINITIONS, ALL_DOCUMENTS, INTERNAL_OPERATIONS, type SkillRepository } from "../src/lib/skills/registry";

const roots: Record<Exclude<SkillRepository, "local">, string> = {
  "claude-seo": "claude-seo-main",
  "openclaw-marketing-skills": "openclaw-marketing-skills-main",
  "social-media-skills": "skills-main",
};

async function main() {
  const missingDocuments = Object.values(DocumentType).filter((type) => !ALL_DOCUMENTS.some((document) => document.type === type));
  const missingAgents = Object.values(AgentType).filter((type) => !AGENT_DEFINITIONS.some((agent) => agent.type === type));
  if (missingDocuments.length || missingAgents.length) throw new Error(`Unmapped operations:\nDocuments: ${missingDocuments.join(", ") || "none"}\nAgents: ${missingAgents.join(", ") || "none"}`);
  const operations = [...ALL_DOCUMENTS, ...AGENT_DEFINITIONS, ...Object.values(INTERNAL_OPERATIONS)];
  const malformed = operations.flatMap((operation) => operation.skills.filter((ref) => !ref.phase || !ref.reason).map((ref) => `${ref.repository}/${ref.skill}`));
  if (malformed.length) throw new Error(`Skill steps missing a phase or reason:\n${malformed.join("\n")}`);
  const refs = operations.flatMap((item) => item.skills)
    .filter((ref, index, values) => values.findIndex((candidate) => candidate.repository === ref.repository && candidate.skill === ref.skill) === index);
  const missing: string[] = [];
  for (const ref of refs) {
    const source = ref.repository === "local"
      ? path.resolve(process.cwd(), "skills", ref.skill, "SKILL.md")
      : path.resolve(process.cwd(), "vendor", "skill-repositories", roots[ref.repository], "skills", ref.skill, "SKILL.md");
    try { await access(source); } catch { missing.push(`${ref.repository}/${ref.skill}`); }
  }
  if (missing.length) throw new Error(`Missing embedded skill files:\n${missing.join("\n")}`);
  process.stdout.write(`Validated ${refs.length} unique embedded skills across ${ALL_DOCUMENTS.length} documents, ${AGENT_DEFINITIONS.length} agents, and ${Object.keys(INTERNAL_OPERATIONS).length} internal operations.\n`);
}

main();
