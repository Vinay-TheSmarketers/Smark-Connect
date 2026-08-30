"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
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
  Layers,
  Calendar,
  Share2,
  Lightbulb,
  Eye,
  Sliders,
  CheckCheck,
  Zap,
  Flame,
  FileText,
  Send,
  Wand2,
} from "lucide-react";
import type {
  XOpportunity,
  XOpportunityType,
  XPostFormat,
  ThreadTweet,
} from "@/lib/x/types";

type TabFilter =
  | "all"
  | "high_priority"
  | "insights"
  | "pov"
  | "educational"
  | "product"
  | "threads"
  | "replies"
  | "repurpose"
  | "ready"
  | "published"
  | "dismissed";

export function XOpportunityFeed({
  companyId,
  companyName,
  initialOpportunities,
  onOpportunityUpdated,
}: {
  companyId: string;
  companyName: string;
  initialOpportunities: XOpportunity[];
  onOpportunityUpdated?: () => void;
}) {
  const [opportunities, setOpportunities] = useState<XOpportunity[]>(initialOpportunities);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [expandedMode, setExpandedMode] = useState<Record<string, "thread" | "variants" | "edit" | "repurpose" | null>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});
  const [repurposeModalOpp, setRepurposeModalOpp] = useState<XOpportunity | null>(null);

  useEffect(() => {
    if (opportunities.length === 0 && !scanning) {
      void triggerLiveScan();
    }
  }, [companyId]);

  const counts = useMemo(() => {
    const nonDismissed = opportunities.filter((o) => o.lifecycleStatus !== "dismissed");
    return {
      all: nonDismissed.length,
      high_priority: nonDismissed.filter((o) => o.score.total >= 80).length,
      insights: nonDismissed.filter((o) => o.opportunityType === "INSIGHT" || o.opportunityType === "DATA_POINT").length,
      pov: nonDismissed.filter((o) => o.opportunityType === "CONTRARIAN_POV" || o.opportunityType === "FOUNDER_POV").length,
      educational: nonDismissed.filter((o) => o.opportunityType === "EDUCATIONAL_POST" || o.opportunityType === "FAQ").length,
      product: nonDismissed.filter((o) => o.opportunityType === "PRODUCT_INSIGHT" || o.opportunityType === "COMPARISON").length,
      threads: nonDismissed.filter((o) => o.format === "THREAD" || o.opportunityType === "THREAD").length,
      replies: nonDismissed.filter((o) => o.format === "REPLY" || o.opportunityType === "REPLY").length,
      repurpose: nonDismissed.filter((o) => o.opportunityType === "REPURPOSE").length,
      ready: opportunities.filter((o) => o.lifecycleStatus === "ready").length,
      published: opportunities.filter((o) => o.lifecycleStatus === "published").length,
      dismissed: opportunities.filter((o) => o.lifecycleStatus === "dismissed").length,
    };
  }, [opportunities]);

  const displayedOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (activeTab === "all") return opp.lifecycleStatus !== "dismissed";
      if (activeTab === "high_priority") return opp.score.total >= 80 && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "insights") return (opp.opportunityType === "INSIGHT" || opp.opportunityType === "DATA_POINT") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "pov") return (opp.opportunityType === "CONTRARIAN_POV" || opp.opportunityType === "FOUNDER_POV") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "educational") return (opp.opportunityType === "EDUCATIONAL_POST" || opp.opportunityType === "FAQ") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "product") return (opp.opportunityType === "PRODUCT_INSIGHT" || opp.opportunityType === "COMPARISON") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "threads") return (opp.format === "THREAD" || opp.opportunityType === "THREAD") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "replies") return (opp.format === "REPLY" || opp.opportunityType === "REPLY") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "repurpose") return opp.opportunityType === "REPURPOSE" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "ready") return opp.lifecycleStatus === "ready";
      if (activeTab === "published") return opp.lifecycleStatus === "published";
      if (activeTab === "dismissed") return opp.lifecycleStatus === "dismissed";
      return true;
    });
  }, [opportunities, activeTab]);

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMode = (id: string, mode: "thread" | "variants" | "edit" | "repurpose") => {
    setExpandedMode((prev) => ({
      ...prev,
      [id]: prev[id] === mode ? null : mode,
    }));
  };

  const triggerLiveScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/agents/x/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.opportunities)) {
          setOpportunities(data.opportunities);
        }
        if (onOpportunityUpdated) onOpportunityUpdated();
      }
    } catch (err) {
      console.error("Failed to run X live scan", err);
    } finally {
      setScanning(false);
    }
  };

  const handleAction = async (oppId: string, actionType: "approve" | "publish" | "schedule" | "dismiss" | "ready") => {
    setActionLoading((prev) => ({ ...prev, [oppId]: true }));
    try {
      const res = await fetch("/api/agents/x/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          opportunityId: oppId,
          action: actionType,
        }),
      });

      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => {
            if (o.id === oppId) {
              const newStatus =
                actionType === "approve"
                  ? "ready"
                  : actionType === "schedule"
                  ? "scheduled"
                  : actionType === "publish"
                  ? "published"
                  : actionType === "dismiss"
                  ? "dismissed"
                  : o.lifecycleStatus;
              return { ...o, lifecycleStatus: newStatus as any };
            }
            return o;
          })
        );
        if (onOpportunityUpdated) onOpportunityUpdated();
      }
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [oppId]: false }));
    }
  };

  const handleCopyPost = async (opp: XOpportunity) => {
    const text = customDrafts[opp.id] || opp.executionPackage.postContent;
    await navigator.clipboard.writeText(text);
    setCopiedId(opp.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMakeSharper = (opp: XOpportunity) => {
    const original = customDrafts[opp.id] || opp.executionPackage.postContent;
    const lines = original.split("\n").filter((l) => l.trim().length > 0);
    const punchy = lines.map((l) => l.replace(/^(In order to|Basically,|It is worth noting that)/i, "").trim()).join("\n\n");
    setCustomDrafts((prev) => ({ ...prev, [opp.id]: punchy }));
  };

  return (
    <div className="x-opportunity-feed">
      {/* Header Panel */}
      <div className="feed-header-panel">
        <div className="feed-title-block">
          <div className="platform-tag-x">
            <span className="x-mark-icon">𝕏</span>
            <strong>X WRITER &amp; OPPORTUNITY DISCOVERY</strong>
          </div>
          <p className="feed-subtitle">
            Evidence-led angles, high-velocity hooks, and structured threads continuously surfaced for <strong>{companyName}</strong>.
          </p>
        </div>

        <div className="feed-actions-top">
          <button
            type="button"
            className={`scan-btn ${scanning ? "scanning" : ""}`}
            onClick={triggerLiveScan}
            disabled={scanning}
          >
            <RefreshCw size={14} className={scanning ? "spin" : ""} />
            <span>{scanning ? "Discovering Opportunities…" : "Scan Opportunities"}</span>
          </button>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="feed-tabs-scroller">
        <div className="feed-tabs-bar">
          <button
            type="button"
            className={`feed-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All <em>{counts.all}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "high_priority" ? "active" : ""}`}
            onClick={() => setActiveTab("high_priority")}
          >
            <Sparkles size={13} className="tab-icon" />
            High Priority <em>{counts.high_priority}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "insights" ? "active" : ""}`}
            onClick={() => setActiveTab("insights")}
          >
            <Lightbulb size={13} className="tab-icon" />
            Insights <em>{counts.insights}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "pov" ? "active" : ""}`}
            onClick={() => setActiveTab("pov")}
          >
            <Flame size={13} className="tab-icon" />
            POV <em>{counts.pov}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "educational" ? "active" : ""}`}
            onClick={() => setActiveTab("educational")}
          >
            Educational <em>{counts.educational}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "product" ? "active" : ""}`}
            onClick={() => setActiveTab("product")}
          >
            Product <em>{counts.product}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "threads" ? "active" : ""}`}
            onClick={() => setActiveTab("threads")}
          >
            <Layers size={13} className="tab-icon" />
            Threads <em>{counts.threads}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "replies" ? "active" : ""}`}
            onClick={() => setActiveTab("replies")}
          >
            <MessageSquare size={13} className="tab-icon" />
            Replies <em>{counts.replies}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "repurpose" ? "active" : ""}`}
            onClick={() => setActiveTab("repurpose")}
          >
            <Share2 size={13} className="tab-icon" />
            Repurpose <em>{counts.repurpose}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "ready" ? "active" : ""}`}
            onClick={() => setActiveTab("ready")}
          >
            Ready <em>{counts.ready}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "published" ? "active" : ""}`}
            onClick={() => setActiveTab("published")}
          >
            Published <em>{counts.published}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "dismissed" ? "active" : ""}`}
            onClick={() => setActiveTab("dismissed")}
          >
            Dismissed <em>{counts.dismissed}</em>
          </button>
        </div>
      </div>

      {/* Main Opportunities Feed */}
      <div className="opportunities-stream">
        {displayedOpportunities.length === 0 ? (
          <div className="feed-empty-state">
            <Filter size={24} />
            <p>No X opportunities match this filter.</p>
            <button type="button" onClick={() => setActiveTab("all")}>
              View all opportunities
            </button>
          </div>
        ) : (
          displayedOpportunities.map((opp) => {
            const isExpandedWhy = expandedWhy[opp.id];
            const activeMode = expandedMode[opp.id];
            const currentDraft = customDrafts[opp.id] ?? opp.executionPackage.postContent;
            const scoreClass =
              opp.score.total >= 90
                ? "score-exceptional"
                : opp.score.total >= 80
                ? "score-high"
                : "score-medium";

            return (
              <div
                key={opp.id}
                className={`x-opp-card ${opp.lifecycleStatus === "dismissed" ? "is-dismissed" : ""}`}
              >
                {/* Header Row */}
                <div className="opp-header-row">
                  <div className="opp-meta-left">
                    <span className="type-tag">{opp.opportunityType.replace(/_/g, " ")}</span>
                    <span className="format-pill format-x">
                      {opp.format}
                    </span>
                    <span className="signal-source-badge">
                      Signal: <strong>{opp.signalOrigin.source.replace(/_/g, " ")}</strong>
                    </span>
                  </div>

                  <div className="opp-meta-right">
                    <span className={`score-badge ${scoreClass}`} title="10-factor opportunity score">
                      <strong>{opp.score.total}</strong>/100
                      <small>{opp.score.tier.toUpperCase()}</small>
                    </span>
                    <span className="confidence-pill" title="Evidence confidence">
                      {opp.confidence}% CONF
                    </span>
                  </div>
                </div>

                {/* Main Topic & Hook */}
                <div className="opp-content-body">
                  <h4 className="opp-topic-title">{opp.title}</h4>
                  <div className="opp-hook-quote">
                    <span className="hook-label">HOOK</span>
                    <p className="hook-text">&ldquo;{opp.hookHeadline}&rdquo;</p>
                  </div>

                  {/* Prepared Copy Box */}
                  <div className="prepared-copy-box">
                    <div className="copy-box-header">
                      <span className="copy-label">Prepared Post</span>
                      <button
                        type="button"
                        className="copy-btn-inner"
                        onClick={() => handleCopyPost(opp)}
                      >
                        {copiedId === opp.id ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedId === opp.id ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                    <pre className="post-text-content">{currentDraft}</pre>
                  </div>

                  {/* Target Audience & Expected KPI */}
                  <div className="opp-target-grid">
                    <div>
                      <span className="target-label">Target ICP</span>
                      <strong>{opp.targetAudience}</strong>
                    </div>
                    <div>
                      <span className="target-label">Pain Point</span>
                      <strong>{opp.targetPainPoint}</strong>
                    </div>
                    <div>
                      <span className="target-label">Expected KPI Impact</span>
                      <strong className="kpi-text">{opp.expectedKpiImpact}</strong>
                    </div>
                  </div>
                </div>

                {/* Expandable Why This Matters / Why Am I Seeing This */}
                <div className="opp-explanation-wrapper">
                  <button
                    type="button"
                    className="toggle-why-btn"
                    onClick={() => toggleWhy(opp.id)}
                  >
                    <span>Why this matters &amp; Signal breakdown</span>
                    {isExpandedWhy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpandedWhy && (
                    <div className="expanded-why-panel">
                      <div className="why-grid">
                        <div className="why-cell">
                          <strong>Why this matters:</strong>
                          <p>{opp.whyThisMatters}</p>
                        </div>
                        <div className="why-cell">
                          <strong>Why am I seeing this?</strong>
                          <p>{opp.whyAmISeeingThis}</p>
                        </div>
                      </div>

                      <div className="score-breakdown-subgrid">
                        <div className="breakdown-item">
                          <span>ICP Fit</span>
                          <strong>{opp.score.icpRelevance}/15</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Product Fit</span>
                          <strong>{opp.score.productRelevance}/15</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Evidence Strength</span>
                          <strong>{opp.score.evidenceStrength}/15</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Novelty</span>
                          <strong>{opp.score.novelty}/10</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Conversation</span>
                          <strong>{opp.score.conversationPotential}/10</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Goal Alignment</span>
                          <strong>{opp.score.goalAlignment}/10</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Viewers: Thread / 3 Variants / Edit */}
                {activeMode === "thread" && opp.executionPackage.threadTweets && (
                  <div className="active-viewer-container thread-viewer">
                    <div className="viewer-header">
                      <div className="viewer-title">
                        <Layers size={15} />
                        <strong>X Thread Structure ({opp.executionPackage.threadTweets.length} Tweets)</strong>
                      </div>
                      <span className="viewer-hint">Hook → Context → 3 Actionable Steps → Retweet CTA</span>
                    </div>

                    <div className="thread-tweets-list">
                      {opp.executionPackage.threadTweets.map((tw) => (
                        <div key={tw.tweetNumber} className="thread-tweet-card">
                          <div className="tweet-card-top">
                            <span className="tweet-num">TWEET {tw.tweetNumber}</span>
                            {tw.callToAction && <span className="tweet-cta-badge">{tw.callToAction}</span>}
                          </div>
                          <p className="tweet-body">{tw.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeMode === "variants" && (
                  <div className="active-viewer-container variants-viewer">
                    <div className="viewer-header">
                      <div className="viewer-title">
                        <Sparkles size={15} />
                        <strong>3 Distinct High-Impact Variants</strong>
                      </div>
                      <span className="viewer-hint">Choose your preferred angle</span>
                    </div>

                    <div className="variants-grid">
                      <div
                        className="variant-card"
                        onClick={() => setCustomDrafts((prev) => ({ ...prev, [opp.id]: opp.executionPackage.threeVariants.punchy }))}
                      >
                        <div className="variant-label">⚡ PUNCHY</div>
                        <p>{opp.executionPackage.threeVariants.punchy}</p>
                        <button type="button" className="select-var-btn">Use this variant</button>
                      </div>

                      <div
                        className="variant-card"
                        onClick={() => setCustomDrafts((prev) => ({ ...prev, [opp.id]: opp.executionPackage.threeVariants.observation }))}
                      >
                        <div className="variant-label">🔍 OBSERVATION / FIELD EVIDENCE</div>
                        <p>{opp.executionPackage.threeVariants.observation}</p>
                        <button type="button" className="select-var-btn">Use this variant</button>
                      </div>

                      <div
                        className="variant-card"
                        onClick={() => setCustomDrafts((prev) => ({ ...prev, [opp.id]: opp.executionPackage.threeVariants.contrarian }))}
                      >
                        <div className="variant-label">🔥 CONTRARIAN POV</div>
                        <p>{opp.executionPackage.threeVariants.contrarian}</p>
                        <button type="button" className="select-var-btn">Use this variant</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeMode === "edit" && (
                  <div className="active-viewer-container edit-viewer">
                    <div className="viewer-header">
                      <div className="viewer-title">
                        <MessageSquare size={15} />
                        <strong>Edit Post Draft</strong>
                      </div>
                    </div>
                    <textarea
                      className="edit-textarea"
                      rows={6}
                      value={currentDraft}
                      onChange={(e) =>
                        setCustomDrafts((prev) => ({ ...prev, [opp.id]: e.target.value }))
                      }
                    />
                  </div>
                )}

                {/* Card Action Controls Footer */}
                <div className="opp-card-actions-bar">
                  <div className="actions-left-group">
                    <button
                      type="button"
                      className="action-pill-btn"
                      onClick={() => handleMakeSharper(opp)}
                      title="Remove filler phrases and make copy punchier"
                    >
                      <Wand2 size={13} />
                      <span>Make Sharper</span>
                    </button>

                    <button
                      type="button"
                      className={`action-pill-btn ${activeMode === "thread" ? "active" : ""}`}
                      onClick={() => toggleMode(opp.id, "thread")}
                    >
                      <Layers size={13} />
                      <span>{activeMode === "thread" ? "Hide Thread" : "Create Thread"}</span>
                    </button>

                    <button
                      type="button"
                      className={`action-pill-btn ${activeMode === "variants" ? "active" : ""}`}
                      onClick={() => toggleMode(opp.id, "variants")}
                    >
                      <Sparkles size={13} />
                      <span>{activeMode === "variants" ? "Hide Variants" : "3 Variants"}</span>
                    </button>

                    <button
                      type="button"
                      className={`action-pill-btn ${activeMode === "edit" ? "active" : ""}`}
                      onClick={() => toggleMode(opp.id, "edit")}
                    >
                      <MessageSquare size={13} />
                      <span>{activeMode === "edit" ? "Close Edit" : "Edit"}</span>
                    </button>

                    <button
                      type="button"
                      className="action-pill-btn"
                      onClick={() => setRepurposeModalOpp(opp)}
                    >
                      <Share2 size={13} />
                      <span>Repurpose</span>
                    </button>
                  </div>

                  <div className="actions-right-group">
                    <button
                      type="button"
                      className="btn-approve"
                      disabled={actionLoading[opp.id] || opp.lifecycleStatus === "ready"}
                      onClick={() => handleAction(opp.id, "approve")}
                    >
                      <CheckCircle2 size={13} />
                      <span>{opp.lifecycleStatus === "ready" ? "Approved" : "Approve"}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-schedule"
                      disabled={actionLoading[opp.id]}
                      onClick={() => handleAction(opp.id, "schedule")}
                    >
                      <Calendar size={13} />
                      <span>Add to Calendar</span>
                    </button>

                    <button
                      type="button"
                      className="btn-dismiss"
                      disabled={actionLoading[opp.id]}
                      onClick={() => handleAction(opp.id, "dismiss")}
                      title="Dismiss opportunity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Repurpose Modal */}
      {repurposeModalOpp && (
        <div className="x-modal-overlay" onClick={() => setRepurposeModalOpp(null)}>
          <div className="x-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="x-modal-header">
              <div className="x-modal-title">
                <Share2 size={16} />
                <strong>Multi-Platform Repurposing Plan</strong>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setRepurposeModalOpp(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="x-modal-body">
              <p className="repurpose-lead">
                Transform <strong>&ldquo;{repurposeModalOpp.title}&rdquo;</strong> across channels:
              </p>

              <div className="repurpose-channel-card">
                <div className="channel-title">
                  <span>LinkedIn Post Angle</span>
                </div>
                <pre>{repurposeModalOpp.executionPackage.repurposingPlan.linkedInPost}</pre>
              </div>

              <div className="repurpose-channel-card">
                <div className="channel-title">
                  <span>Instagram Carousel Hook</span>
                </div>
                <p>{repurposeModalOpp.executionPackage.repurposingPlan.instagramCarouselHook}</p>
              </div>

              <div className="repurpose-channel-card">
                <div className="channel-title">
                  <span>Newsletter Angle</span>
                </div>
                <p>{repurposeModalOpp.executionPackage.repurposingPlan.newsletterSnippet}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
