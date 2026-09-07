"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Info,
  Lock,
  MessageCircleMore,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  X,
} from "lucide-react";
import {
  extractConversationProspects,
  type ConversationProspect,
} from "@/lib/conversation-mining";

type AgentRun = { agentType: string; output: unknown };

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Hours

export function LiveConversationMining({
  agents,
  running,
  onScan,
  companyId = "default",
  companyName,
  companyIndustry,
}: {
  agents: AgentRun[];
  running: boolean;
  onScan: () => void;
  companyId?: string;
  companyName?: string;
  companyIndustry?: string;
}) {
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [seenLeadIds, setSeenLeadIds] = useState<string[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<ConversationProspect | null>(null);
  const [copiedHook, setCopiedHook] = useState(false);
  const [lockWarning, setLockWarning] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Load persistence state from localStorage
  useEffect(() => {
    try {
      const storageKeyTime = `smark_miner_last_refreshed_${companyId}`;
      const storageKeySeen = `smark_miner_seen_${companyId}`;

      const savedTime = localStorage.getItem(storageKeyTime);
      if (savedTime) {
        const timeNum = Number.parseInt(savedTime, 10);
        if (!Number.isNaN(timeNum)) setLastRefreshedAt(timeNum);
      }

      const savedSeen = localStorage.getItem(storageKeySeen);
      if (savedSeen) {
        const parsedSeen = JSON.parse(savedSeen);
        if (Array.isArray(parsedSeen)) setSeenLeadIds(parsedSeen.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      // Ignore storage read errors
    }
  }, [companyId]);

  // Update timer tick every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Compute 24-hour refresh status
  const elapsedMs = lastRefreshedAt ? now - lastRefreshedAt : Number.POSITIVE_INFINITY;
  const canRefresh = elapsedMs >= REFRESH_INTERVAL_MS;
  const remainingMs = Math.max(0, REFRESH_INTERVAL_MS - elapsedMs);

  const hoursLeft = Math.floor(remainingMs / (1000 * 60 * 60));
  const minsLeft = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  // Extract 5 to 6 active leads while guaranteeing non-repeating history
  const prospects = extractConversationProspects(agents, 6, seenLeadIds, {
    name: companyName,
    industry: companyIndustry,
  });

  const handleRefreshClick = () => {
    if (running) return;

    if (!canRefresh) {
      const notice = `24-Hour Refresh Restriction active. Next scan available in ${hoursLeft}h ${minsLeft}m to prevent duplicate lead discovery.`;
      setLockWarning(notice);
      setTimeout(() => setLockWarning(null), 6000);
      return;
    }

    // Trigger scan
    const newTimestamp = Date.now();
    setLastRefreshedAt(newTimestamp);
    setLockWarning(null);

    // Save newly seen IDs
    const newSeen = Array.from(new Set([...seenLeadIds, ...prospects.map((p) => p.id), ...prospects.map((p) => p.identity.toLowerCase())]));
    setSeenLeadIds(newSeen);

    try {
      localStorage.setItem(`smark_miner_last_refreshed_${companyId}`, newTimestamp.toString());
      localStorage.setItem(`smark_miner_seen_${companyId}`, JSON.stringify(newSeen));
    } catch {
      // Ignore storage write errors
    }

    onScan();
  };

  const copyHookToClipboard = (hookText: string) => {
    navigator.clipboard.writeText(hookText);
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2500);
  };

  return (
    <section className="conversation-mining" aria-labelledby="conversation-mining-title">
      <header className="conversation-mining__header">
        <span className="conversation-mining__icon">
          <MessageCircleMore size={14} />
        </span>
        <span className="conversation-mining__title">
          <strong id="conversation-mining-title">Live Conversation Miner</strong>
          <small>
            {prospects.length
              ? `${prospects.length} Active Leads Identified · 24h Non-Repeating Stream`
              : "Mine active buyer-intent prospects"}
          </small>
        </span>

        <div className="conversation-mining__controls">
          {lastRefreshedAt && (
            <span
              className={`refresh-timer-badge ${canRefresh ? "ready" : "locked"}`}
              title={canRefresh ? "Refresh available" : `Next refresh available in ${hoursLeft}h ${minsLeft}m`}
            >
              {canRefresh ? (
                <>
                  <Sparkles size={10} /> Ready
                </>
              ) : (
                <>
                  <Clock size={10} /> {hoursLeft}h {minsLeft}m
                </>
              )}
            </span>
          )}

          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={running}
            aria-label={canRefresh ? "Refresh active leads (once per 24h)" : `Locked: available in ${hoursLeft}h ${minsLeft}m`}
            title={canRefresh ? "Refresh active leads (once per 24h)" : `Locked: available in ${hoursLeft}h ${minsLeft}m`}
            className={!canRefresh ? "button-locked" : ""}
          >
            {running ? (
              <RefreshCw size={13} className="spin" />
            ) : canRefresh ? (
              <RefreshCw size={13} />
            ) : (
              <Lock size={12} className="lock-icon" />
            )}
          </button>
        </div>
      </header>

      {lockWarning && (
        <div className="conversation-mining__lock-notice" role="alert">
          <Lock size={12} />
          <span>{lockWarning}</span>
          <button type="button" onClick={() => setLockWarning(null)}>
            ×
          </button>
        </div>
      )}

      <div className="conversation-mining__body">
        {prospects.length ? (
          <div className="conversation-prospect-list">
            {prospects.map((prospect) => (
              <article
                key={prospect.id}
                className="conversation-prospect"
                onClick={() => setSelectedProspect(prospect)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedProspect(prospect);
                }}
              >
                <div className="conversation-prospect__score-col">
                  <span className="conversation-prospect__score" title={`Total Lead Score: ${prospect.score}/100`}>
                    {prospect.score}
                  </span>
                  <span className="conversation-prospect__badge">{prospect.priorityTier}</span>
                </div>

                <div className="conversation-prospect__copy">
                  <div className="conversation-prospect__meta">
                    <strong>{prospect.personRole ? `${prospect.identity} · ${prospect.personRole}` : prospect.identity}</strong>
                    <em>{prospect.community}</em>
                  </div>

                  <div className="conversation-prospect__intent-row">
                    <span className="intent-tag">{prospect.intentCategory}</span>
                    {prospect.contact.confidence === "Verified" && (
                      <span className="contact-tag verified">
                        <ShieldCheck size={9} /> Verified Email
                      </span>
                    )}
                  </div>

                  <p className="conversation-prospect__title">{prospect.title}</p>
                  <p className="conversation-prospect__why-text">{prospect.whyTarget}</p>
                </div>

                <span className="conversation-prospect__chevron" title="Click to view details">
                  <Info size={13} />
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="conversation-mining__empty">
            <Target size={22} />
            <strong>No active leads mined yet</strong>
            <p>Scan public discussions to rank real prospects by buyer intent, ICP fit, trigger events, and public contact information.</p>
            <button type="button" onClick={handleRefreshClick} disabled={running}>
              <RefreshCw size={12} className={running ? "spin" : ""} />
              {running ? "Scanning…" : "Mine 5-6 Active Leads"}
            </button>
          </div>
        )}
      </div>

      <footer className="conversation-mining__footer">
        <span>Showing 5–6 high-intent active leads. Refreshes once per 24 hours without repetition.</span>
      </footer>

      {/* Prospect Intelligence Modal (Minimal Design) */}
      {selectedProspect && (
        <div className="drawer-backdrop lead-modal-backdrop" onClick={() => setSelectedProspect(null)}>
          <div className="lead-modal lead-modal--minimal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Lead Prospect Intelligence">
            <header className="lead-modal__header">
              <div className="lead-modal__title-box">
                <span className="platform-pill">{selectedProspect.platform}</span>
                <h2>{selectedProspect.identity}</h2>
                {selectedProspect.companyName && <p className="company-name">{selectedProspect.companyName} {selectedProspect.personRole ? `· ${selectedProspect.personRole}` : ""}</p>}
                <span className="community-sub">{selectedProspect.community}</span>
              </div>

              <div className="lead-modal__header-right">
                <div className="modal-score-badge">
                  <strong>{selectedProspect.score}</strong>
                  <span>/ 100 ICP Fit</span>
                </div>
                <button type="button" className="close-btn" onClick={() => setSelectedProspect(null)}>
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="lead-modal__body">
              {/* Target Rationale */}
              <div className="lead-modal__section">
                <h4>Why Target This Prospect</h4>
                <p className="why-text-minimal">{selectedProspect.whyTarget}</p>
              </div>

              {/* Signals & Trigger */}
              <div className="lead-modal__section">
                <h4>Signals & Intent Trigger</h4>
                <div className="signal-grid">
                  <div>
                    <label>Intent Category</label>
                    <span className="signal-value">{selectedProspect.intentCategory} ({selectedProspect.intent})</span>
                  </div>
                  <div>
                    <label>Observable Trigger</label>
                    <span className="signal-value">{selectedProspect.observableTrigger}</span>
                  </div>
                  <div>
                    <label>Matched ICP Profile</label>
                    <span className="signal-value">{selectedProspect.matchedIcp}</span>
                  </div>
                  <div>
                    <label>Customer Problem</label>
                    <span className="signal-value">{selectedProspect.matchedProblem}</span>
                  </div>
                </div>

                {selectedProspect.verbatimQuote && (
                  <div className="quote-box-minimal">
                    <label>Quote Evidence</label>
                    <blockquote>"{selectedProspect.verbatimQuote}"</blockquote>
                  </div>
                )}
              </div>

              {/* Score Breakdown */}
              <div className="lead-modal__section">
                <h4>ICP Score Breakdown</h4>
                <div className="score-breakdown-list">
                  <div className="score-item">
                    <span>ICP & Firmographic Fit</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(selectedProspect.scoreBreakdown.icpFit / 25) * 100}%` }} /></div>
                    <strong>{selectedProspect.scoreBreakdown.icpFit}/25</strong>
                  </div>
                  <div className="score-item">
                    <span>Buying Intent Signal</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(selectedProspect.scoreBreakdown.intent / 25) * 100}%` }} /></div>
                    <strong>{selectedProspect.scoreBreakdown.intent}/25</strong>
                  </div>
                  <div className="score-item">
                    <span>Timing & Event Trigger</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(selectedProspect.scoreBreakdown.timing / 15) * 100}%` }} /></div>
                    <strong>{selectedProspect.scoreBreakdown.timing}/15</strong>
                  </div>
                  <div className="score-item">
                    <span>Evidence Strength</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(selectedProspect.scoreBreakdown.evidenceStrength / 10) * 100}%` }} /></div>
                    <strong>{selectedProspect.scoreBreakdown.evidenceStrength}/10</strong>
                  </div>
                  <div className="score-item">
                    <span>Contact Quality</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(selectedProspect.scoreBreakdown.contactQuality / 5) * 100}%` }} /></div>
                    <strong>{selectedProspect.scoreBreakdown.contactQuality}/5</strong>
                  </div>
                </div>
              </div>

              {/* Business Contact */}
              <div className="lead-modal__section">
                <h4>Business Contact</h4>
                <div className="contact-details-grid">
                  {selectedProspect.contact.email && (
                    <div className="contact-field">
                      <label>Email ({selectedProspect.contact.confidence})</label>
                      <code>{selectedProspect.contact.email}</code>
                    </div>
                  )}
                  {selectedProspect.contact.linkedinUrl && (
                    <div className="contact-field">
                      <label>LinkedIn</label>
                      <a href={selectedProspect.contact.linkedinUrl} target="_blank" rel="noreferrer" className="modal-link">
                        View Profile <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                  <div className="contact-field">
                    <label>Public Source URL</label>
                    <a href={selectedProspect.sourceUrl} target="_blank" rel="noreferrer" className="modal-link">
                      View Discussion <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Personalized Outreach Hook */}
              <div className="lead-modal__section hook-section-minimal">
                <div className="hook-header">
                  <h4>Personalized Outreach Hook</h4>
                  <button type="button" className="copy-btn" onClick={() => copyHookToClipboard(selectedProspect.outreachAngle)}>
                    {copiedHook ? <Check size={12} /> : <Copy size={12} />}
                    {copiedHook ? "Copied!" : "Copy Hook"}
                  </button>
                </div>
                <div className="hook-content">{selectedProspect.outreachAngle}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
