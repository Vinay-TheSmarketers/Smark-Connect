"use client";

import { ExternalLink, MessageCircleMore, RefreshCw, Target } from "lucide-react";
import { extractConversationProspects } from "@/lib/conversation-mining";

type AgentRun = { agentType: string; output: unknown };

export function LiveConversationMining({
  agents,
  running,
  onScan,
}: {
  agents: AgentRun[];
  running: boolean;
  onScan: () => void;
}) {
  const prospects = extractConversationProspects(agents, 8);

  return (
    <section className="conversation-mining" aria-labelledby="conversation-mining-title">
      <header className="conversation-mining__header">
        <span className="conversation-mining__icon"><MessageCircleMore size={14} /></span>
        <span className="conversation-mining__title">
          <strong id="conversation-mining-title">Live Conversation Mining</strong>
          <small>{prospects.length ? `${prospects.length} ICP-matched prospective clients` : "Find buyer-intent conversations"}</small>
        </span>
        <button type="button" onClick={onScan} disabled={running} aria-label="Scan live conversations" title="Scan live conversations">
          <RefreshCw size={13} className={running ? "spin" : ""} />
        </button>
      </header>

      <div className="conversation-mining__body">
        {prospects.length ? (
          <div className="conversation-prospect-list">
            {prospects.map((prospect) => (
              <a key={prospect.id} className="conversation-prospect" href={prospect.sourceUrl} target="_blank" rel="noreferrer">
                <span className="conversation-prospect__score">{prospect.score}</span>
                <span className="conversation-prospect__copy">
                  <span><strong>u/{prospect.identity}</strong><em>{prospect.community}</em></span>
                  <b>{prospect.intent}</b>
                  <p>{prospect.title}</p>
                  <small>{prospect.matchedIcp || "ICP overlap verified"}{prospect.matchedProblem ? ` · ${prospect.matchedProblem}` : ""}</small>
                </span>
                <ExternalLink size={11} />
              </a>
            ))}
          </div>
        ) : (
          <div className="conversation-mining__empty">
            <Target size={18} />
            <strong>No qualified conversations yet</strong>
            <p>Scan public discussions to rank real authors by buyer intent, ICP fit, product relevance, confidence, and spam risk.</p>
            <button type="button" onClick={onScan} disabled={running}>
              <RefreshCw size={12} className={running ? "spin" : ""} />
              {running ? "Scanning…" : "Scan conversations"}
            </button>
          </div>
        )}
      </div>
      <footer>Public conversation evidence only. Review identity and context before outreach.</footer>
    </section>
  );
}
