"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Copy,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import type { RedditActionFeedOpportunity } from "@/lib/signals/store";
import type { ReplyVariant } from "@/lib/reddit/writer";

function cleanRedditText(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(?:br|\/p|\/div|\/li)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function compactSignal(value: string, fallback: string, maxLength = 46) {
  const normalized = cleanRedditText(value)
    .replace(/^website-researched company\s*/i, "")
    .replace(/[_-]+/g, " ")
    .trim() || fallback;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trimEnd()}…` : normalized;
}

export function RedditOpportunityFeed({
  companyId,
  initialOpportunities,
  onOpportunityUpdated,
}: {
  companyId: string;
  initialOpportunities: RedditActionFeedOpportunity[];
  onOpportunityUpdated?: () => void;
}) {
  const [opportunities, setOpportunities] = useState<RedditActionFeedOpportunity[]>(initialOpportunities);
  const [activePage, setActivePage] = useState(0);
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [openVariantPicker, setOpenVariantPicker] = useState<string | null>(null);
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (opportunities.length === 0 && !scanning) {
      void triggerLiveScan();
    }
  }, [companyId]);

  const pageCount = Math.max(1, opportunities.length);
  const displayedOpportunities = opportunities.slice(activePage, activePage + 1);

  useEffect(() => {
    if (activePage >= opportunities.length) setActivePage(Math.max(0, opportunities.length - 1));
  }, [activePage, opportunities.length]);

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectVariant = (oppId: string, variant: ReplyVariant) => {
    setSelectedVariants((prev) => ({ ...prev, [oppId]: variant.id }));
    setDraftTexts((prev) => ({ ...prev, [oppId]: variant.text }));
  };

  const getActiveDraft = (opp: RedditActionFeedOpportunity) => {
    if (draftTexts[opp.id] !== undefined) return draftTexts[opp.id];
    const selectedVarId = selectedVariants[opp.id];
    const variant = opp.replyVariants.find((v) => v.id === selectedVarId) || opp.replyVariants[0];
    return variant?.text || "";
  };

  const handleCopy = async (opp: RedditActionFeedOpportunity) => {
    const text = getActiveDraft(opp);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(opp.id);
    window.setTimeout(() => setCopiedId(null), 2000);

    // Record copy action for feedback learning
    fetch("/api/agents/reddit/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        opportunityId: opp.id,
        action: "copy",
        selectedVariantId: selectedVariants[opp.id] || opp.replyVariants[0]?.id,
      }),
    }).catch(() => {});
  };

  const handleAction = async (opp: RedditActionFeedOpportunity, action: "replied" | "dismiss" | "regenerate") => {
    setActionLoading((prev) => ({ ...prev, [opp.id]: true }));
    try {
      const res = await fetch("/api/agents/reddit/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          opportunityId: opp.id,
          action,
          opportunity: opp,
          selectedVariantId: selectedVariants[opp.id] || opp.replyVariants[0]?.id,
          customDraft: draftTexts[opp.id],
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (action === "replied") {
          setOpportunities((prev) =>
            prev.map((item) => (item.id === opp.id ? { ...item, lifecycleStatus: "replied" } : item))
          );
        } else if (action === "dismiss") {
          setOpportunities((prev) =>
            prev.map((item) => (item.id === opp.id ? { ...item, lifecycleStatus: "dismissed" } : item))
          );
        } else if (action === "regenerate" && Array.isArray(data.replyVariants)) {
          setOpportunities((prev) =>
            prev.map((item) => (item.id === opp.id ? { ...item, replyVariants: data.replyVariants } : item))
          );
          if (data.replyVariants[0]) {
            handleSelectVariant(opp.id, data.replyVariants[0]);
          }
        }
        onOpportunityUpdated?.();
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [opp.id]: false }));
    }
  };

  const triggerLiveScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/agents/reddit/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (Array.isArray(data.opportunities) && data.opportunities.length > 0) {
        setOpportunities(data.opportunities);
        onOpportunityUpdated?.();
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <section className="reddit-opportunity-system">
      <nav className="reddit-page-toggle" aria-label="Opportunity pages">
        <span>{opportunities.length} opportunities</span>
        <div>
          <button
            type="button"
            onClick={() => setActivePage((page) => Math.max(0, page - 1))}
            disabled={activePage === 0}
            aria-label="Previous opportunity"
            title="Previous opportunity"
          >
            <ChevronLeft size={13} />
          </button>
          <span aria-live="polite">{opportunities.length ? activePage + 1 : 0} / {opportunities.length}</span>
          <button
            type="button"
            onClick={() => setActivePage((page) => Math.min(pageCount - 1, page + 1))}
            disabled={activePage >= pageCount - 1 || opportunities.length === 0}
            aria-label="Next opportunity"
            title="Next opportunity"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </nav>

      {/* Opportunity Cards List */}
      <div className="reddit-opportunity-list">
        {displayedOpportunities.length === 0 ? (
          <div className="reddit-empty-state">
            <Sparkles size={20} />
            <p>No opportunities yet.</p>
            <small>Run a fresh scan to discover newly indexed Reddit discussions.</small>
          </div>
        ) : (
          displayedOpportunities.map((opp) => {
            const isWhyOpen = expandedWhy[opp.id] || false;
            const currentDraft = getActiveDraft(opp);
            const activeVarId = selectedVariants[opp.id] || opp.replyVariants[0]?.id;
            const isCopied = copiedId === opp.id;
            const isReplied = opp.lifecycleStatus === "replied";
            const isDismissed = opp.lifecycleStatus === "dismissed";

            // Tier styling
            const tierClass =
              opp.score.total >= 90
                ? "score-exceptional"
                : opp.score.total >= 80
                ? "score-high"
                : opp.score.total >= 65
                ? "score-medium"
                : "score-low";

            return (
              <article
                key={opp.id}
                className={`reddit-opportunity-card ${tierClass} ${isReplied ? "is-replied" : ""} ${
                  isDismissed ? "is-dismissed" : ""
                }`}
              >
                {/* Header: Subreddit, Signals, Freshness, Score Badge */}
                <div className="card-top-header">
                  <div className="subreddit-identity">
                    <span className="reddit-mark-icon">
                      <Image src="/agent-logos/reddit.svg" alt="Reddit" width={16} height={16} />
                    </span>
                    <span className="subreddit-name-pill">{opp.subreddit}</span>
                    <span className="reddit-engagement-signal">
                      <ArrowUp size={11} /> {opp.upvotes}
                    </span>
                    <span className="reddit-engagement-signal">
                      <MessageSquare size={11} /> {opp.commentsCount}
                    </span>
                    <span className="freshness-tag">
                      <Clock3 size={11} />
                      {opp.publishedAt
                        ? `${Math.max(1, Math.round((Date.now() - new Date(opp.publishedAt).getTime()) / (1000 * 3600)))}h ago`
                        : "Fresh"}
                    </span>
                  </div>

                  {/* Opportunity Score Pill */}
                  <div className="opportunity-score-badge" title="Explainable 8-factor score">
                    <span className="score-number">{opp.score.total}</span>
                    <span className="score-tier">{opp.score.tier.toUpperCase()}</span>
                  </div>
                </div>

                {/* Post Title & Excerpt */}
                <h3 className="opportunity-title">
                  <a href={opp.sourceUrl} target="_blank" rel="noreferrer" title="Open thread on Reddit">
                    {opp.title}
                  </a>
                </h3>

                <blockquote className="opportunity-excerpt">
                  {cleanRedditText(opp.excerpt).slice(0, 280)}
                </blockquote>

                <details className="opportunity-signals">
                  <summary>
                    <span>Match details</span>
                    <small>{opp.competitor ? 4 : 3}</small>
                    <ChevronDown size={12} />
                  </summary>
                  <div className="matched-chips-row">
                    <span className="intent-chip"><strong>Intent</strong>{compactSignal(opp.intentLabel, "Opportunity")}</span>
                    <span className="icp-chip"><strong>Audience</strong>{compactSignal(opp.matchedIcp, "Relevant buyer")}</span>
                    <span className="problem-chip"><strong>Need</strong>{compactSignal(opp.matchedProblem, "Relevant pain point")}</span>
                    {opp.competitor && <span className="competitor-chip"><strong>Competitor</strong>{compactSignal(opp.competitor, "Mentioned")}</span>}
                  </div>
                </details>

                {/* Short AI Explanation: Why this is an opportunity */}
                <div className="why-opportunity-callout">
                  <strong>Why this is an opportunity:</strong>
                  <p>{opp.whyItMatters}</p>
                </div>

                {/* Expandable "Why am I seeing this?" area */}
                <div className="why-seeing-section">
                  <button
                    type="button"
                    className="why-seeing-toggle"
                    onClick={() => toggleWhy(opp.id)}
                    aria-expanded={isWhyOpen}
                  >
                    <HelpCircle size={12} />
                    <span>Why am I seeing this?</span>
                    {isWhyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {isWhyOpen && (
                    <div className="evidence-checklist-box">
                      <div className="score-breakdown-mini">
                        <small>
                          Score breakdown: Intent {opp.score.intent}/25 · Fit {opp.score.productFit}/20 · ICP {opp.score.icpFit}/15 · Rel {opp.score.relevance}/15 · Recency {opp.score.recency}/10 · Eng {opp.score.engagement}/5 · Action {opp.score.actionability}/5
                        </small>
                      </div>
                      <ul className="evidence-checklist">
                        {opp.evidence.map((item, idx) => (
                          <li key={idx} className="evidence-item">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Metadata row: Recommended Approach, Spam Risk, Source link */}
                <div className="approach-meta-row">
                  <div className="approach-badge" title="Recommended action strategy">
                    <strong>Recommended Approach:</strong> <span>{opp.recommendedActionLabel}</span>
                  </div>
                  <div className="spam-risk-badge" title="Promotional and spam probability">
                    <span className={`risk-dot ${opp.spamRisk > 0.3 ? "medium" : "low"}`} />
                    <span>Spam Risk: {Math.round(opp.spamRisk * 100)}%</span>
                  </div>
                  <a
                    href={opp.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="open-reddit-link"
                  >
                    Open on Reddit <ExternalLink size={11} />
                  </a>
                </div>

                {/* Editable AI-Prepared Reply Area with Selectable Variants */}
                <div className="ai-reply-container">
                  <div className="reply-variant-header">
                    <div className="reply-variant-picker">
                      <button
                        type="button"
                        className="variant-magic-btn"
                        aria-label="Choose an AI reply style"
                        aria-expanded={openVariantPicker === opp.id}
                        title="Choose an AI reply style"
                        onClick={() => setOpenVariantPicker((current) => current === opp.id ? null : opp.id)}
                      >
                        <Sparkles size={13} />
                      </button>
                      {openVariantPicker === opp.id && (
                        <div className="variant-options-list" role="listbox" aria-label="AI reply styles">
                          {opp.replyVariants.map((variant) => (
                            <button
                              key={variant.id}
                              type="button"
                              role="option"
                              aria-selected={activeVarId === variant.id}
                              className={`variant-option-btn ${activeVarId === variant.id ? "active" : ""}`}
                              onClick={() => {
                                handleSelectVariant(opp.id, variant);
                                setOpenVariantPicker(null);
                              }}
                              title={variant.reasoning}
                            >
                              <span>{variant.label}</span>
                              {activeVarId === variant.id && <Check size={12} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="reply-quick-actions">
                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={() => handleAction(opp, "regenerate")}
                        disabled={actionLoading[opp.id]}
                        title="Regenerate reply variants"
                      >
                        <RefreshCw size={12} className={actionLoading[opp.id] ? "animate-spin" : ""} />
                        Regenerate
                      </button>
                    </div>
                  </div>

                  <textarea
                    className="ai-reply-textarea"
                    rows={6}
                    value={currentDraft}
                    onChange={(e) => setDraftTexts((prev) => ({ ...prev, [opp.id]: e.target.value }))}
                    placeholder="AI generated response..."
                  />

                  {/* Reply Footer Actions */}
                  <div className="reply-card-footer">
                    <div className="char-count-note">
                      <small>{currentDraft.length} characters · Transparent & non-promotional</small>
                    </div>

                    <div className="action-buttons-group">
                      {/* Open on Reddit */}
                      <a
                        href={opp.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="footer-btn secondary"
                      >
                        <ExternalLink size={13} />
                        Open on Reddit
                      </a>

                      {/* Copy Reply */}
                      <button
                        type="button"
                        className={`footer-btn copy-btn ${isCopied ? "copied" : ""}`}
                        onClick={() => handleCopy(opp)}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        {isCopied ? "Copied to clipboard" : "Copy Reply"}
                      </button>

                      {/* Mark Replied */}
                      <button
                        type="button"
                        className={`footer-btn mark-replied-btn ${isReplied ? "active" : ""}`}
                        onClick={() => handleAction(opp, "replied")}
                        disabled={actionLoading[opp.id]}
                      >
                        <Check size={13} />
                        {isReplied ? "Replied" : "Mark Replied"}
                      </button>

                      {/* Dismiss */}
                      {!isDismissed ? (
                        <button
                          type="button"
                          className="footer-btn dismiss-btn"
                          onClick={() => handleAction(opp, "dismiss")}
                          disabled={actionLoading[opp.id]}
                          title="Dismiss opportunity"
                        >
                          <Trash2 size={13} />
                          Dismiss
                        </button>
                      ) : (
                        <span className="dismissed-label">Dismissed</span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
