import { describe, expect, it } from "vitest";
import { extractConversationProspects } from "./conversation-mining";

describe("extractConversationProspects", () => {
  it("returns only verified, commercially relevant public conversation authors", () => {
    const prospects = extractConversationProspects([{ agentType: "REDDIT", output: { opportunities: [
      {
        id: "qualified",
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
      {
        id: "placeholder",
        verified: true,
        author: "reddit_user",
        sourceUrl: "https://reddit.com/r/agency/comments/placeholder",
        intent: "BUYING_INTENT",
        score: { total: 95 },
        confidence: 90,
        spamRisk: 0.02,
      },
      {
        id: "low-fit",
        verified: true,
        author: "curious_reader",
        sourceUrl: "https://reddit.com/r/agency/comments/low-fit",
        intent: "GENERAL_DISCUSSION",
        score: { total: 72 },
        confidence: 75,
        spamRisk: 0.1,
      },
    ] } }]);

    expect(prospects).toHaveLength(1);
    expect(prospects[0]).toMatchObject({ identity: "agency_owner", score: 91, matchedIcp: "B2B agency owner" });
  });
});
