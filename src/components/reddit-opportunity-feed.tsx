"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  ExternalLink,
  HelpCircle,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import type { RedditActionFeedOpportunity } from "@/lib/signals/store";
import type { ReplyVariant } from "@/lib/reddit/writer";

type TabFilter = "all" | "high_intent" | "recommendations" | "competitor" | "pain_points" | "replied" | "dismissed";

export function RedditOpportunityFeed({
  companyId,
  companyName,
  initialOpportunities,
  searchMapSummary,
  onOpportunityUpdated,
}: {
  companyId: string;
  companyName: string;
  initialOpportunities: RedditActionFeedOpportunity[];
  searchMapSummary?: { queriesCount: number; prioritySubreddits: string[] } | null;
  onOpportunityUpdated?: () => void;
}) {
  const [opportunities, setOpportunities] = useState<RedditActionFeedOpportunity[]>(initialOpportunities);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (opportunities.length === 0 && !scanning) {
      void triggerLiveScan();
    }
  }, [companyId]);

  // Filter calculations
  const counts = useMemo(() => {
    return {
      all: opportunities.filter((o) => o.lifecycleStatus !== "dismissed").length,
      high_intent: opportunities.filter((o) => o.score.total >= 80 && o.lifecycleStatus !== "dismissed").length,
      recommendations: opportunities.filter(
        (o) => (o.intent === "RECOMMENDATION_REQUEST" || o.intent === "BUYING_INTENT") && o.lifecycleStatus !== "dismissed"
      ).length,
      competitor: opportunities.filter(
        (o) => (o.intent === "COMPETITOR_DISSATISFACTION" || o.intent === "COMPARISON") && o.lifecycleStatus !== "dismissed"
      ).length,
      pain_points: opportunities.filter((o) => o.intent === "PAIN_POINT" && o.lifecycleStatus !== "dismissed").length,
      replied: opportunities.filter((o) => o.lifecycleStatus === "replied").length,
      dismissed: opportunities.filter((o) => o.lifecycleStatus === "dismissed").length,
    };
  }, [opportunities]);

  const displayedOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (activeTab === "all") return opp.lifecycleStatus !== "dismissed";
      if (activeTab === "high_intent") return opp.score.total >= 80 && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "recommendations")
        return (opp.intent === "RECOMMENDATION_REQUEST" || opp.intent === "BUYING_INTENT") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "competitor")
        return (opp.intent === "COMPETITOR_DISSATISFACTION" || opp.intent === "COMPARISON") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "pain_points") return opp.intent === "PAIN_POINT" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "replied") return opp.lifecycleStatus === "replied";
      if (activeTab === "dismissed") return opp.lifecycleStatus === "dismissed";
      return true;
    });
  }, [opportunities, activeTab]);

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
      {/* Search Map & Live Scan Banner */}
      <div className="reddit-discovery-bar">
        <div className="discovery-stats">
          <div className="stat-item">
            <span className="live-indicator-dot" />
            <strong>CONTINUOUS OPPORTUNITY SCANNER</strong>
          </div>
          <span className="discovery-meta">
            {searchMapSummary?.queriesCount || 23} Query Families active across {searchMapSummary?.prioritySubreddits?.length || 10} subreddits
          </span>
        </div>
        <button
          type="button"
          className="scan-trigger-btn"
          disabled={scanning}
          onClick={triggerLiveScan}
          title="Rerun Reddit Search Map"
        >
          <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Scanning communities…" : "Scan Now"}
        </button>
      </div>

      {/* Filter Tabs */}
      <nav className="reddit-filter-tabs" aria-label="Opportunity filters">
        <button
          type="button"
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All <span className="tab-badge">{counts.all}</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "high_intent" ? "active" : ""}`}
          onClick={() => setActiveTab("high_intent")}
        >
          High Intent <span className="tab-badge high">{counts.high_intent}</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "recommendations" ? "active" : ""}`}
          onClick={() => setActiveTab("recommendations")}
        >
          Recommendations <span className="tab-badge">{counts.recommendations}</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "competitor" ? "active" : ""}`}
          onClick={() => setActiveTab("competitor")}
        >
          Competitor <span className="tab-badge">{counts.competitor}</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "pain_points" ? "active" : ""}`}
          onClick={() => setActiveTab("pain_points")}
        >
          Pain Points <span className="tab-badge">{counts.pain_points}</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "replied" ? "active" : ""}`}
          onClick={() => setActiveTab("replied")}
        >
          Replied <span className="tab-badge replied">{counts.replied}</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "dismissed" ? "active" : ""}`}
          onClick={() => setActiveTab("dismissed")}
        >
          Dismissed <span className="tab-badge">{counts.dismissed}</span>
        </button>
      </nav>

      {/* Opportunity Cards List */}
      <div className="reddit-opportunity-list">
        {displayedOpportunities.length === 0 ? (
          <div className="reddit-empty-state">
            <Filter size={24} />
            <p>No opportunities in this category right now.</p>
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
                  &ldquo;{opp.excerpt.slice(0, 280)}&rdquo;
                </blockquote>

                {/* Intent & Matched Dimension Chips */}
                <div className="matched-chips-row">
                  <span className="intent-chip" title="Classified Conversation Intent">
                    <Target size={11} /> {opp.intentLabel}
                  </span>
                  <span className="icp-chip" title="Target ICP Fit">
                    👤 {opp.matchedIcp}
                  </span>
                  <span className="problem-chip" title="Matched Customer Pain Point">
                    ⚡ {opp.matchedProblem.slice(0, 42)}…
                  </span>
                  {opp.competitor && (
                    <span className="competitor-chip" title="Detected Competitor Friction">
                      ⚔️ vs {opp.competitor}
                    </span>
                  )}
                </div>

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
                    <div className="variant-pills">
                      <span className="variant-label-prefix">AI Reply Variant:</span>
                      {opp.replyVariants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          className={`variant-pill-btn ${activeVarId === variant.id ? "active" : ""}`}
                          onClick={() => handleSelectVariant(opp.id, variant)}
                          title={variant.reasoning}
                        >
                          {variant.label}
                        </button>
                      ))}
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
