import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SkillRef, SkillRepository } from "./registry";

export type SkillExecutionStep = SkillRef & {
  step: number;
  source: string;
  digest: string;
  charactersProvided: number;
  references: string[];
};

const repositoryDirectories: Record<Exclude<SkillRepository, "local">, string> = {
  "claude-seo": "claude-seo-main",
  "openclaw-marketing-skills": "openclaw-marketing-skills-main",
  "social-media-skills": "skills-main",
};

function repositoryRoot(repository: SkillRepository): string {
  if (repository === "local") {
    return path.resolve(/* turbopackIgnore: true */ process.cwd(), "skills");
  }
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), "vendor", "skill-repositories", repositoryDirectories[repository]);
}

function referencedMarkdown(markdown: string): string[] {
  return Array.from(markdown.matchAll(/(?:\(|`)(references\/[a-z0-9._/-]+\.md)(?:\)|`)/gi), (match) => match[1])
    .filter((value, index, values) => values.indexOf(value) === index);
}

async function loadOneSkill(ref: SkillRef, budget: number, index: number): Promise<{ content: string; step: SkillExecutionStep }> {
  const skillDirectory = ref.repository === "local"
    ? path.join(repositoryRoot(ref.repository), ref.skill)
    : path.join(repositoryRoot(ref.repository), "skills", ref.skill);
  const skillPath = path.join(skillDirectory, "SKILL.md");
  try {
    const main = await readFile(skillPath, "utf8");
    const references: string[] = [];
    const referenceFiles: string[] = [];
    for (const relativePath of referencedMarkdown(main).slice(0, 4)) {
      try {
        const content = await readFile(path.join(skillDirectory, relativePath), "utf8");
        references.push(`DEPENDENCY: ${relativePath}\n${content}`);
        referenceFiles.push(relativePath);
      } catch {
        references.push(`DEPENDENCY UNAVAILABLE: ${relativePath}`);
        referenceFiles.push(`${relativePath} (unavailable)`);
      }
    }
    const source = path.relative(process.cwd(), skillPath).replaceAll("\\", "/");
    const loadedSource = [main, ...references].join("\n\n");
    const content = `SKILL CHAIN STEP ${index + 1}\nPHASE: ${ref.phase}\nSKILL: ${ref.repository}/${ref.skill}\nROLE IN THIS OPERATION: ${ref.reason}\nSOURCE: ${source}\nSHA256: ${createHash("sha256").update(loadedSource).digest("hex")}\n\n${loadedSource}`.slice(0, budget);
    return {
      content,
      step: {
        ...ref,
        step: index + 1,
        source,
        digest: createHash("sha256").update(loadedSource).digest("hex"),
        charactersProvided: content.length,
        references: referenceFiles,
      },
    };
  } catch (error) {
    throw new Error(`Required skill file ${ref.repository}/${ref.skill} could not be loaded: ${error instanceof Error ? error.message : "unknown filesystem error"}`);
  }
}

export async function loadSkillPackWithManifest(refs: SkillRef[], maxCharacters = 64_000): Promise<{ content: string; steps: SkillExecutionStep[] }> {
  if (!refs.length) throw new Error("This operation has no mapped skill chain and cannot run.");
  const unique = refs.filter((ref, index, values) => values.findIndex((candidate) => candidate.repository === ref.repository && candidate.skill === ref.skill) === index);
  const perSkillBudget = Math.max(4_800, Math.floor(maxCharacters / unique.length));
  const loaded: string[] = [];
  const steps: SkillExecutionStep[] = [];
  for (const [index, ref] of unique.entries()) {
    const result = await loadOneSkill(ref, perSkillBudget, index);
    loaded.push(result.content);
    steps.push(result.step);
  }
  return { content: loaded.join("\n\n===== NEXT EMBEDDED SKILL =====\n\n").slice(0, maxCharacters), steps };
}

export async function loadSkillPack(refs: SkillRef[], maxCharacters = 64_000): Promise<string> {
  return (await loadSkillPackWithManifest(refs, maxCharacters)).content;
}
