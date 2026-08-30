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
  Film,
  Layers,
  Smartphone,
  Calendar,
  Share2,
  Lightbulb,
  Eye,
  Sliders,
  CheckCheck,
  Zap,
} from "lucide-react";
import type {
  InstagramOpportunity,
  InstagramOpportunityMap,
  InstagramFormat,
  InstagramOpportunityType,
  CarouselSlide,
  ReelStoryboardStep,
  StoryFrame,
} from "@/lib/instagram/types";

type TabFilter =
  | "all"
  | "high_priority"
  | "reels"
  | "carousels"
  | "stories"
  | "product"
  | "educational"
  | "proof"
  | "competitor"
  | "ready"
  | "published"
  | "dismissed";

export function InstagramOpportunityFeed({
  companyId,
  companyName,
  initialOpportunities,
  opportunityMapSummary,
  onOpportunityUpdated,
}: {
  companyId: string;
  companyName: string;
  initialOpportunities: InstagramOpportunity[];
  opportunityMapSummary?: InstagramOpportunityMap | null;
  onOpportunityUpdated?: () => void;
}) {
  const [opportunities, setOpportunities] = useState<InstagramOpportunity[]>(initialOpportunities);
  const [opportunityMap, setOpportunityMap] = useState<InstagramOpportunityMap | null>(opportunityMapSummary || null);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [expandedViewer, setExpandedViewer] = useState<Record<string, "carousel" | "reel" | "story" | "caption" | "repurpose" | null>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [showMapModal, setShowMapModal] = useState(false);
  const [draftCaptions, setDraftCaptions] = useState<Record<string, string>>({});
  const [repurposeModalOpp, setRepurposeModalOpp] = useState<InstagramOpportunity | null>(null);

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
      reels: nonDismissed.filter((o) => o.recommendedFormat === "REEL").length,
      carousels: nonDismissed.filter((o) => o.recommendedFormat === "CAROUSEL").length,
      stories: nonDismissed.filter((o) => o.recommendedFormat === "STORY").length,
      product: nonDismissed.filter((o) => o.opportunityType === "PRODUCT_EDUCATION").length,
      educational: nonDismissed.filter((o) => o.opportunityType === "EDUCATIONAL_POST" || o.opportunityType === "CHECKLIST" || o.opportunityType === "MYTH_VS_FACT").length,
      proof: nonDismissed.filter((o) => o.opportunityType === "SOCIAL_PROOF" || o.opportunityType === "CASE_STUDY").length,
      competitor: nonDismissed.filter((o) => o.opportunityType === "COMPARISON" || o.signalOrigin.source === "competitor_whitespace").length,
      ready: opportunities.filter((o) => o.lifecycleStatus === "ready").length,
      published: opportunities.filter((o) => o.lifecycleStatus === "published").length,
      dismissed: opportunities.filter((o) => o.lifecycleStatus === "dismissed").length,
    };
  }, [opportunities]);

  const displayedOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (activeTab === "all") return opp.lifecycleStatus !== "dismissed";
      if (activeTab === "high_priority") return opp.score.total >= 80 && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "reels") return opp.recommendedFormat === "REEL" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "carousels") return opp.recommendedFormat === "CAROUSEL" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "stories") return opp.recommendedFormat === "STORY" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "product") return opp.opportunityType === "PRODUCT_EDUCATION" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "educational")
        return (opp.opportunityType === "EDUCATIONAL_POST" || opp.opportunityType === "CHECKLIST" || opp.opportunityType === "MYTH_VS_FACT") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "proof") return (opp.opportunityType === "SOCIAL_PROOF" || opp.opportunityType === "CASE_STUDY") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "competitor") return (opp.opportunityType === "COMPARISON" || opp.signalOrigin.source === "competitor_whitespace") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "ready") return opp.lifecycleStatus === "ready";
      if (activeTab === "published") return opp.lifecycleStatus === "published";
      if (activeTab === "dismissed") return opp.lifecycleStatus === "dismissed";
      return true;
    });
  }, [opportunities, activeTab]);

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleViewer = (id: string, mode: "carousel" | "reel" | "story" | "caption" | "repurpose") => {
    setExpandedViewer((prev) => ({
      ...prev,
      [id]: prev[id] === mode ? null : mode,
    }));
  };

  const triggerLiveScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/agents/instagram/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.opportunities)) {
          setOpportunities(data.opportunities);
        }
        if (data.opportunityMap) {
          setOpportunityMap(data.opportunityMap);
        }
        if (onOpportunityUpdated) onOpportunityUpdated();
      }
    } catch (err) {
      console.error("Failed to run Instagram live scan", err);
    } finally {
      setScanning(false);
    }
  };

  const handleAction = async (oppId: string, actionType: "approve" | "schedule" | "dismiss" | "ready" | "publish") => {
    setActionLoading((prev) => ({ ...prev, [oppId]: true }));
    try {
      const res = await fetch("/api/agents/instagram/action", {
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

  const handleCopyCaption = async (opp: InstagramOpportunity) => {
    const text = draftCaptions[opp.id] || opp.executionPackage.caption;
    await navigator.clipboard.writeText(text);
    setCopiedId(opp.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="instagram-opportunity-feed">
      {/* Header bar */}
      <div className="feed-header-panel">
        <div className="feed-title-block">
          <div className="platform-tag-ig">
            <span className="ig-dot" />
            <strong>INSTAGRAM OPPORTUNITY &amp; CONTENT INTELLIGENCE</strong>
          </div>
          <p className="feed-subtitle">
            Continuous opportunity discovery, multi-format planning, and evidence-verified storyboards grounded in <strong>{companyName}</strong> memory.
          </p>
        </div>

        <div className="feed-actions-top">
          {opportunityMap && (
            <button
              type="button"
              className="map-overview-btn"
              onClick={() => setShowMapModal(true)}
              title="View the generated Instagram Opportunity Map"
            >
              <Lightbulb size={14} />
              <span>Opportunity Map ({opportunityMap.themes.length} Themes)</span>
            </button>
          )}
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
            className={`feed-tab ${activeTab === "reels" ? "active" : ""}`}
            onClick={() => setActiveTab("reels")}
          >
            <Film size={13} className="tab-icon" />
            Reels <em>{counts.reels}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "carousels" ? "active" : ""}`}
            onClick={() => setActiveTab("carousels")}
          >
            <Layers size={13} className="tab-icon" />
            Carousels <em>{counts.carousels}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "stories" ? "active" : ""}`}
            onClick={() => setActiveTab("stories")}
          >
            <Smartphone size={13} className="tab-icon" />
            Stories <em>{counts.stories}</em>
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
            className={`feed-tab ${activeTab === "educational" ? "active" : ""}`}
            onClick={() => setActiveTab("educational")}
          >
            Educational <em>{counts.educational}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "proof" ? "active" : ""}`}
            onClick={() => setActiveTab("proof")}
          >
            Proof <em>{counts.proof}</em>
          </button>
          <button
            type="button"
            className={`feed-tab ${activeTab === "competitor" ? "active" : ""}`}
            onClick={() => setActiveTab("competitor")}
          >
            Competitor / Whitespace <em>{counts.competitor}</em>
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
            <p>No Instagram opportunities match this filter.</p>
            <button type="button" onClick={() => setActiveTab("all")}>
              View all opportunities
            </button>
          </div>
        ) : (
          displayedOpportunities.map((opp) => {
            const isExpandedWhy = expandedWhy[opp.id];
            const activeViewer = expandedViewer[opp.id];
            const scoreClass =
              opp.score.total >= 90
                ? "score-exceptional"
                : opp.score.total >= 80
                ? "score-high"
                : "score-medium";

            return (
              <div
                key={opp.id}
                className={`instagram-opp-card ${opp.lifecycleStatus === "dismissed" ? "is-dismissed" : ""}`}
              >
                {/* Card Header */}
                <div className="opp-header-row">
                  <div className="opp-meta-left">
                    <span className={`format-pill format-${opp.recommendedFormat.toLowerCase()}`}>
                      {opp.recommendedFormat === "REEL" ? (
                        <Film size={12} />
                      ) : opp.recommendedFormat === "CAROUSEL" ? (
                        <Layers size={12} />
                      ) : (
                        <Smartphone size={12} />
                      )}
                      {opp.recommendedFormat}
                    </span>

                    <span className="type-tag">{opp.opportunityType.replace(/_/g, " ")}</span>

                    <span className="signal-source-badge">
                      Origin: <strong>{opp.signalOrigin.source.replace(/_/g, " ")}</strong>
                    </span>
                  </div>

                  <div className="opp-meta-right">
                    <span className={`score-badge ${scoreClass}`} title="11-factor opportunity score">
                      <strong>{opp.score.total}</strong>/100
                      <small>{opp.score.tier.toUpperCase()}</small>
                    </span>

                    <span className="confidence-pill" title="Verification & evidence confidence">
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

                  <div className="opp-target-grid">
                    <div>
                      <span className="target-label">Target Audience</span>
                      <strong>{opp.targetAudience}</strong>
                    </div>
                    <div>
                      <span className="target-label">Problem / Pain Point</span>
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
                          <span>Goal Alignment</span>
                          <strong>{opp.score.strategicGoalAlignment}/15</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>ICP Relevance</span>
                          <strong>{opp.score.icpRelevance}/15</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Pain Match</span>
                          <strong>{opp.score.audiencePainMatch}/15</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Product Fit</span>
                          <strong>{opp.score.productFit}/10</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Evidence Strength</span>
                          <strong>{opp.score.evidenceStrength}/10</strong>
                        </div>
                        <div className="breakdown-item">
                          <span>Visual Potential</span>
                          <strong>{opp.score.visualPotential}/10</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Viewers for Carousel / Reel / Storyboard / Caption */}
                {activeViewer === "carousel" && opp.executionPackage.carouselSlides && (
                  <div className="active-viewer-container carousel-viewer">
                    <div className="viewer-header">
                      <div className="viewer-title">
                        <Layers size={15} />
                        <strong>Carousel Slide Sequence ({opp.executionPackage.carouselSlides.length} Slides)</strong>
                      </div>
                      <span className="viewer-hint">Slide 1 Hook → Slides 2-5 Value/Evidence → Final Slide CTA</span>
                    </div>

                    <div className="slides-carousel-grid">
                      {opp.executionPackage.carouselSlides.map((slide) => (
                        <div key={slide.slideNumber} className="slide-card-item">
                          <div className="slide-card-top">
                            <span className="slide-num">SLIDE {slide.slideNumber}</span>
                            <span className="slide-type-badge">{slide.type.toUpperCase()}</span>
                          </div>
                          <h5 className="slide-headline">{slide.headline}</h5>
                          <p className="slide-body">{slide.bodyContent}</p>
                          <div className="slide-visual-hint">
                            <small><strong>Visual:</strong> {slide.visualDirection}</small>
                          </div>
                          {slide.swipePrompt && (
                            <div className="slide-swipe-prompt">{slide.swipePrompt}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeViewer === "reel" && opp.executionPackage.reelStoryboard && (
                  <div className="active-viewer-container reel-viewer">
                    <div className="viewer-header">
                      <div className="viewer-title">
                        <Film size={15} />
                        <strong>Reel Storyboard (0-3s Hook → Problem → Insight → Proof → CTA)</strong>
                      </div>
                      <span className="viewer-hint">Vertical 9:16 High-Engagement Structure</span>
                    </div>

                    <div className="reel-steps-timeline">
                      {opp.executionPackage.reelStoryboard.map((step, sIdx) => (
                        <div key={sIdx} className="reel-step-row">
                          <div className="step-time-pill">{step.timestamp}</div>
                          <div className="step-content-card">
                            <div className="step-card-header">
                              <span className="step-phase-pill">{step.phase.toUpperCase()}</span>
                              {step.audioTrackSuggestion && (
                                <span className="audio-hint">Audio: {step.audioTrackSuggestion}</span>
                              )}
                            </div>
                            <div className="step-spoken">
                              <strong>Spoken Audio:</strong> {step.spokenAudio}
                            </div>
                            <div className="step-visual">
                              <strong>Visual Action:</strong> {step.visualAction}
                            </div>
                            <div className="step-text-overlay">
                              <strong>On-Screen Text:</strong> {step.onScreenText}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeViewer === "story" && opp.executionPackage.storySequence && (
                  <div className="active-viewer-container story-viewer">
                    <div className="viewer-header">
                      <div className="viewer-title">
                        <Smartphone size={15} />
                        <strong>Interactive Story Sequence</strong>
                      </div>
                      <span className="viewer-hint">Native stickers, polls &amp; conversion links</span>
                    </div>

                    <div className="story-frames-grid">
                      {opp.executionPackage.storySequence.map((frame) => (
                        <div key={frame.frameNumber} className="story-frame-card">
                          <div className="frame-header">FRAME {frame.frameNumber}</div>
                          <p className="frame-text-overlay">&ldquo;{frame.textOverlay}&rdquo;</p>
                          {frame.interactiveElement && (
                            <div className="frame-sticker-box">
                              <span className="sticker-badge">{frame.interactiveElement.type.toUpperCase()} STICKER</span>
                              <div className="sticker-prompt">{frame.interactiveElement.prompt}</div>
                              {frame.interactiveElement.options && (
                                <div className="sticker-options">
                                  {frame.interactiveElement.options.map((opt, oIdx) => (
                                    <span key={oIdx} className="sticker-opt-pill">{opt}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="frame-visual-desc">
                            <small>Visual: {frame.visualPrompt}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeViewer === "caption" && (
                  <div className="active-viewer-container caption-viewer">
                    <div className="viewer-header">
                      <div className="viewer-title">
                        <MessageSquare size={15} />
                        <strong>Caption, Hashtags &amp; SEO Keywords</strong>
                      </div>
                      <button
                        type="button"
                        className="copy-btn-inner"
                        onClick={() => handleCopyCaption(opp)}
                      >
                        {copiedId === opp.id ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedId === opp.id ? "Copied!" : "Copy Caption"}</span>
                      </button>
                    </div>

                    <textarea
                      className="caption-textarea"
                      rows={8}
                      value={draftCaptions[opp.id] ?? opp.executionPackage.caption}
                      onChange={(e) =>
                        setDraftCaptions((prev) => ({ ...prev, [opp.id]: e.target.value }))
                      }
                    />

                    <div className="hashtags-list">
                      <span className="hashtags-label">Hashtags:</span>
                      {opp.executionPackage.hashtags.map((ht, hIdx) => (
                        <span key={hIdx} className="hashtag-item">{ht}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Action Controls Footer */}
                <div className="opp-card-actions-bar">
                  <div className="actions-left-group">
                    {opp.recommendedFormat === "CAROUSEL" && (
                      <button
                        type="button"
                        className={`action-pill-btn ${activeViewer === "carousel" ? "active" : ""}`}
                        onClick={() => toggleViewer(opp.id, "carousel")}
                      >
                        <Layers size={13} />
                        <span>{activeViewer === "carousel" ? "Hide Carousel" : "View Carousel Slides"}</span>
                      </button>
                    )}

                    {opp.recommendedFormat === "REEL" && (
                      <button
                        type="button"
                        className={`action-pill-btn ${activeViewer === "reel" ? "active" : ""}`}
                        onClick={() => toggleViewer(opp.id, "reel")}
                      >
                        <Film size={13} />
                        <span>{activeViewer === "reel" ? "Hide Storyboard" : "View Reel Storyboard"}</span>
                      </button>
                    )}

                    {opp.recommendedFormat === "STORY" && (
                      <button
                        type="button"
                        className={`action-pill-btn ${activeViewer === "story" ? "active" : ""}`}
                        onClick={() => toggleViewer(opp.id, "story")}
                      >
                        <Smartphone size={13} />
                        <span>{activeViewer === "story" ? "Hide Story" : "View Story Frames"}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className={`action-pill-btn ${activeViewer === "caption" ? "active" : ""}`}
                      onClick={() => toggleViewer(opp.id, "caption")}
                    >
                      <MessageSquare size={13} />
                      <span>{activeViewer === "caption" ? "Hide Caption" : "View / Edit Caption"}</span>
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
        <div className="ig-modal-overlay" onClick={() => setRepurposeModalOpp(null)}>
          <div className="ig-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ig-modal-header">
              <div className="ig-modal-title">
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

            <div className="ig-modal-body">
              <p className="repurpose-lead">
                Transform <strong>&ldquo;{repurposeModalOpp.title}&rdquo;</strong> into cross-channel assets without duplicating manual work:
              </p>

              <div className="repurpose-channel-card">
                <div className="channel-title">
                  <Smartphone size={14} />
                  <span>Instagram Stories Angle</span>
                </div>
                <p>{repurposeModalOpp.executionPackage.repurposingPlan.storiesAngle}</p>
              </div>

              <div className="repurpose-channel-card">
                <div className="channel-title">
                  <span>LinkedIn Thought Leadership Post</span>
                </div>
                <pre>{repurposeModalOpp.executionPackage.repurposingPlan.linkedInDraft}</pre>
              </div>

              <div className="repurpose-channel-card">
                <div className="channel-title">
                  <span>X / Twitter Hook &amp; Thread</span>
                </div>
                <pre>{repurposeModalOpp.executionPackage.repurposingPlan.xPostOrThread}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity Map Modal */}
      {showMapModal && opportunityMap && (
        <div className="ig-modal-overlay" onClick={() => setShowMapModal(false)}>
          <div className="ig-modal-box wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ig-modal-header">
              <div className="ig-modal-title">
                <Lightbulb size={16} />
                <strong>Instagram Opportunity Map: {opportunityMap.companyName}</strong>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowMapModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="ig-modal-body">
              <div className="map-pillars-summary">
                <h5>Content Pillar Target Distribution</h5>
                <div className="pillar-chips">
                  {Object.entries(opportunityMap.pillarDistribution).map(([pillar, pct]) => (
                    <span key={pillar} className="pillar-chip">
                      <strong>{pillar}</strong>: {pct}%
                    </span>
                  ))}
                </div>
              </div>

              <div className="map-themes-list">
                <h5>Discovered Strategic Themes ({opportunityMap.themes.length})</h5>
                <div className="theme-cards-grid">
                  {opportunityMap.themes.map((theme) => (
                    <div key={theme.id} className="theme-map-card">
                      <div className="theme-cat-badge">{theme.category.replace(/_/g, " ").toUpperCase()}</div>
                      <h6>{theme.title}</h6>
                      <p>{theme.description}</p>
                      <div className="theme-hooks-preview">
                        <strong>Suggested Hook:</strong>
                        <small>&ldquo;{theme.suggestedHooks[0]}&rdquo;</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
