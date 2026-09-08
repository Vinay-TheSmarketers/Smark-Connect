import { describe, expect, it, vi } from "vitest";
import { loadSkillPackWithManifest } from "./loader";
import { AGENT_DEFINITIONS } from "./registry";
vi.mock("server-only", () => ({}));

describe("complete skill instructions", () => {
  it("keeps every main skill and final quality step even under a small reference budget", async () => {
    const refs = AGENT_DEFINITIONS.find((agent) => agent.type === "INSTAGRAM")!.skills;
    const result = await loadSkillPackWithManifest(refs, 1000);
    expect(result.steps.length).toBe(refs.length);
    const parts = result.content.split("\n\n===== NEXT EMBEDDED SKILL =====\n\n");
    expect(parts).toHaveLength(refs.length);
    parts.forEach((part, index) => expect(part.length).toBe(result.steps[index].charactersProvided));
    expect(parts.at(-1)).toContain(`SKILL: ${refs.at(-1)!.repository}/${refs.at(-1)!.skill}`);
    expect(result.steps.some((step) => step.omittedReferences?.length)).toBe(true);
    expect(result.content).toContain("Do not claim to have read them");
  });
});
