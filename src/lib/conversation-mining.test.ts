import { describe, expect, it } from "vitest";
import { extractConversationProspects } from "./conversation-mining";

describe("extractConversationProspects", () => {
  it("returns 5-6 active leads with proper whyTarget rationale and Universal Lead scoring", () => {
    const prospects = extractConversationProspects([
      {
        agentType: "REDDIT",
        output: {
          opportunities: [
            {
              id: "qualified-1",
              verified: true,
              author: "agency_owner",
              sourceUrl: "https://reddit.com/r/agency/comments/qualified",
              subreddit: "r/agency",
              title: "Looking for a reporting platform",
              intent: "BUYING_INTENT",
              intentLabel: "High Buying Intent",
              score: { total: 91 },
              confidence: 88,
              spamRisk: 0.05,
              matchedIcp: "B2B agency owner",
              matchedProblem: "Manual reporting",
              matchedProduct: "Automated reporting",
              discoveredAt: "2026-09-03T10:00:00.000Z",
            },
          ],
        },
      },
    ], 6);

    expect(prospects.length).toBeGreaterThanOrEqual(5);
    expect(prospects.length).toBeLessThanOrEqual(6);
    const found = prospects.find((p) => p.identity === "agency_owner");
    expect(found).toBeDefined();
    expect(found).toMatchObject({
      identity: "agency_owner",
      score: 91,
      matchedIcp: "B2B agency owner",
    });
    expect(found?.whyTarget).toContain("Targeting u/agency_owner");
    expect(found?.contact).toBeDefined();
    expect(found?.scoreBreakdown.total).toBe(91);
  });

  it("extracts prospects across multi-source platforms including LinkedIn, X, and Reddit", () => {
    const prospects = extractConversationProspects([
      {
        agentType: "LINKEDIN",
        output: {
          opportunities: [
            {
              id: "li-1",
              author: "Priya Sharma",
              companyName: "CloudScale Inc",
              role: "Head of Growth",
              sourceUrl: "https://www.linkedin.com/posts/priyasharma-growth",
              platform: "LinkedIn",
              title: "Searching for live conversation mining platform",
              intent: "BUYING_INTENT",
              score: { total: 93 },
              matchedIcp: "B2B SaaS Growth Head",
              matchedProblem: "Dark social attribution",
            },
          ],
        },
      },
      {
        agentType: "X",
        output: {
          opportunities: [
            {
              id: "x-1",
              author: "tech_founder_x",
              sourceUrl: "https://x.com/tech_founder_x/status/198273",
              platform: "X",
              title: "Looking for pipeline reporting tools",
              intent: "RECOMMENDATION_REQUEST",
              score: { total: 89 },
              matchedIcp: "SaaS Founder",
              matchedProblem: "Manual reporting",
            },
          ],
        },
      },
    ], 6);

    const linkedinLead = prospects.find((p) => p.identity === "Priya Sharma");
    const xLead = prospects.find((p) => p.identity === "tech_founder_x");

    expect(linkedinLead).toBeDefined();
    expect(linkedinLead?.platform).toBe("LinkedIn");
    expect(linkedinLead?.whyTarget).toContain("LinkedIn");

    expect(xLead).toBeDefined();
    expect(xLead?.identity).toBe("tech_founder_x");
    expect(xLead?.whyTarget).toContain("@tech_founder_x");
  });
});

