"use client";

import { useState, useEffect } from "react";
import {
  ExternalLink,
  RefreshCw,
  Check,
  Copy,
  Target,
  ShieldAlert,
  Zap,
  TrendingUp,
  Award,
  Sparkles,
  Layers,
  Users,
  DollarSign,
  Compass,
  ArrowRight,
  Flame,
  CheckCircle2,
  Info,
} from "lucide-react";
import type {
  CompetitorIntelligencePayload,
  CompetitorProfile,
  NormalizedFinding,
  PrioritizedActionItem,
} from "@/lib/competitors/types";

interface CompetitorAgentViewerProps {
  companyId: string;
  companyName: string;
  websiteUrl: string;
  initialPayload?: CompetitorIntelligencePayload | null;
  onRefreshParent?: () => void;
}

export function CompetitorAgentViewer({
  companyId,
  companyName,
  websiteUrl,
  initialPayload,
  onRefreshParent,
}: CompetitorAgentViewerProps) {
  const [payload, setPayload] = useState<CompetitorIntelligencePayload | null>(initialPayload || null);
  const [loading, setLoading] = useState(!initialPayload);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"landscape" | "positioning" | "findings" | "actions">("actions");
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    if (!initialPayload) {
      fetchData();
    }
  }, [companyId, initialPayload]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/competitor/analysis?companyId=${companyId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.payload) {
          setPayload(json.payload);
        }
      }
    } catch (err) {
      console.error("Failed to load competitor intelligence", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/agents/competitor/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.payload) {
          setPayload(json.payload);
          if (onRefreshParent) onRefreshParent();
        }
      }
    } catch (err) {
      console.error("Failed to refresh competitor intelligence", err);
    } finally {
      setRefreshing(false);
    }
  }

  function handleCopyAction(action: PrioritizedActionItem) {
    const brief = `### ACTION BRIEF: ${action.title}
**Priority Score:** ${action.priorityScore}/100 (${action.priorityTier.toUpperCase()})
**Contributing Skills:** ${action.originatingSkills.join(", ")}
**Goal / KPI:** ${action.goalKpiAlignment}
**Expected Impact:** ${action.expectedImpact} | **Estimated Effort:** ${action.estimatedEffort}

**What should be done:**
${action.whatShouldBeDone}

**Why it matters:**
${action.whyItMatters}

**Evidence:**
${action.evidence}

**Concrete Next Step:**
${action.concreteNextStep}

**Voice Builder Guardrail:**
${action.voiceGuardrail}
${action.experimentOutline ? `\n**Experiment Outline:**\n- Hypothesis: ${action.experimentOutline.hypothesis}\n- Channel: ${action.experimentOutline.testChannel}\n- Success Metric: ${action.experimentOutline.successMetric}` : ""}`;

    navigator.clipboard.writeText(brief);
    setCopiedActionId(action.id);
    setTimeout(() => setCopiedActionId(null), 2000);
  }

  function toggleCompleteAction(id: string) {
    setCompletedActions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="competitor-viewer-loading">
        <RefreshCw size={24} className="spin text-blue-500" />
        <p>Scanning company URL &amp; synthesizing 12-dimension competitor intelligence...</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="competitor-viewer-empty">
        <p>No competitor intelligence available yet.</p>
        <button type="button" onClick={handleRefresh} className="btn-primary">
          <Zap size={14} /> Run Competitor Analysis
        </button>
      </div>
    );
  }

  const { companyProfile, competitors, findings, actionItems, executiveSummary, companyPositioningSummary } = payload;

  const filteredFindings = filterCategory === "all"
    ? findings
    : findings.filter((f) => f.type === filterCategory || f.category === filterCategory);

  return (
    <div className="competitor-agent-viewer">
      {/* Top Header Bar */}
      <div className="viewer-header">
        <div className="header-meta">
          <div className="company-badge-row">
            <span className="source-truth-tag">
              <CheckCircle2 size={12} className="text-emerald-400" /> Company URL Truth Engine
            </span>
            <span className="category-pill">{companyProfile.category}</span>
          </div>
          <h2>{companyName} Competitive Intelligence &amp; Action System</h2>
          <p className="header-subtext">
            Continuous market posture, rival USP diagnostics, and cross-skill prioritized action engine.
          </p>
        </div>

        <div className="header-controls">
          <div className="stats-pill-group">
            <div className="stat-item">
              <strong>{competitors.length}</strong>
              <small>Rivals Monitored</small>
            </div>
            <div className="stat-item">
              <strong>{actionItems.length}</strong>
              <small>Action Systems</small>
            </div>
          </div>
          <button
            type="button"
            className="refresh-btn"
            disabled={refreshing}
            onClick={handleRefresh}
          >
            <RefreshCw size={13} className={refreshing ? "spin" : ""} />
            {refreshing ? "Synthesizing..." : "Re-Analyze"}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="viewer-nav-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "actions" ? "active" : ""}`}
          onClick={() => setActiveTab("actions")}
        >
          <Flame size={14} /> Prioritized Actions ({actionItems.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "landscape" ? "active" : ""}`}
          onClick={() => setActiveTab("landscape")}
        >
          <Compass size={14} /> Competitor Landscape ({competitors.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "positioning" ? "active" : ""}`}
          onClick={() => setActiveTab("positioning")}
        >
          <Layers size={14} /> Company Positioning &amp; Memory
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "findings" ? "active" : ""}`}
          onClick={() => setActiveTab("findings")}
        >
          <TrendingUp size={14} /> Key Strategic Findings ({findings.length})
        </button>
      </div>

      {/* Executive Summary Callout */}
      <div className="executive-summary-banner">
        <div className="summary-icon-col">
          <Sparkles size={20} className="text-amber-400" />
        </div>
        <div className="summary-content">
          <h4>Executive Strategy Summary</h4>
          <p>{executiveSummary}</p>
          <div className="summary-tags">
            <span><strong>Target KPI:</strong> {companyProfile.goalsAndKpis[0]?.targetKpi || "Customer Acquisition"}</span>
            <span><strong>Core Advantage:</strong> {companyProfile.differentiators[0] || "Workflow Velocity"}</span>
          </div>
        </div>
      </div>

      {/* TAB 1: PRIORITIZED ACTIONS */}
      {activeTab === "actions" && (
        <div className="actions-tab-content">
          <div className="section-head">
            <div>
              <h3>Prioritized Cross-Skill Action Items</h3>
              <p>
                Synthesized across Product Marketing Context, Brand Profile, Voice Builder, Marketing Ideas, and Competitor Analysis.
              </p>
            </div>
          </div>

          <div className="action-items-grid">
            {actionItems.map((action, idx) => {
              const isCompleted = completedActions.has(action.id);
              const isCopied = copiedActionId === action.id;

              return (
                <article key={action.id} className={`action-card ${isCompleted ? "completed" : ""} tier-${action.priorityTier}`}>
                  <div className="action-card-header">
                    <div className="action-score-badge">
                      <span className="score-num">{action.priorityScore}</span>
                      <small>{action.priorityTier.toUpperCase()}</small>
                    </div>

                    <div className="action-title-area">
                      <div className="action-pills">
                        <span className={`impact-pill impact-${action.expectedImpact.toLowerCase()}`}>
                          Impact: {action.expectedImpact}
                        </span>
                        <span className="effort-pill">Effort: {action.estimatedEffort}</span>
                        <span className="kpi-pill">
                          <Target size={11} /> {action.goalKpiAlignment}
                        </span>
                      </div>
                      <h4>{action.title}</h4>
                    </div>

                    <div className="action-header-actions">
                      <button
                        type="button"
                        className="action-copy-btn"
                        onClick={() => handleCopyAction(action)}
                        title="Copy structured action brief"
                      >
                        {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        {isCopied ? "Copied Brief" : "Copy Brief"}
                      </button>
                      <button
                        type="button"
                        className={`action-check-btn ${isCompleted ? "active" : ""}`}
                        onClick={() => toggleCompleteAction(action.id)}
                        title={isCompleted ? "Mark as pending" : "Mark as completed"}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="action-body">
                    <div className="action-block">
                      <strong>What should be done:</strong>
                      <p>{action.whatShouldBeDone}</p>
                    </div>

                    <div className="action-block">
                      <strong>Why it matters:</strong>
                      <p>{action.whyItMatters}</p>
                    </div>

                    <div className="action-meta-columns">
                      <div className="meta-col">
                        <strong>Evidence backing:</strong>
                        <p>{action.evidence}</p>
                      </div>
                      <div className="meta-col">
                        <strong>Concrete Next Step:</strong>
                        <p className="next-step-text">
                          <ArrowRight size={12} className="inline mr-1 text-blue-400" />
                          {action.concreteNextStep}
                        </p>
                      </div>
                    </div>

                    {action.voiceGuardrail && (
                      <div className="voice-guardrail-callout">
                        <Info size={13} className="text-purple-400 shrink-0" />
                        <div>
                          <strong>Voice Builder Guardrail:</strong> <span>{action.voiceGuardrail}</span>
                        </div>
                      </div>
                    )}

                    {action.experimentOutline && (
                      <div className="experiment-box">
                        <div className="exp-head">
                          <Zap size={12} className="text-amber-400" /> Marketing Ideas Experiment Outline
                        </div>
                        <div className="exp-grid">
                          <div><strong>Hypothesis:</strong> {action.experimentOutline.hypothesis}</div>
                          <div><strong>Test Channel:</strong> {action.experimentOutline.testChannel}</div>
                          <div><strong>Success Metric:</strong> {action.experimentOutline.successMetric}</div>
                        </div>
                      </div>
                    )}

                    <div className="action-footer">
                      <div className="skills-provenance">
                        <small>Originating Skills:</small>
                        {action.originatingSkills.map((skill) => (
                          <span key={skill} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                      <span className="confidence-chip">Confidence {action.confidence}%</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: COMPETITOR LANDSCAPE (12-DIMENSION CARDS) */}
      {activeTab === "landscape" && (
        <div className="landscape-tab-content">
          <div className="section-head">
            <div>
              <h3>12-Dimension Competitor Intelligence Cards</h3>
              <p>Detailed analysis of 5–6 key market rivals with direct positioning contrasts and "How we differ" breakdowns.</p>
            </div>
          </div>

          <div className="competitor-cards-grid">
            {competitors.map((comp) => (
              <article key={comp.id} className="competitor-card-rich">
                <div className="card-top-head">
                  <div className="comp-ident">
                    {comp.logoUrl ? (
                      <img src={comp.logoUrl} alt={comp.name} className="comp-logo-img" />
                    ) : (
                      <div className="comp-logo-fallback">{comp.name.charAt(0)}</div>
                    )}
                    <div>
                      <div className="comp-name-row">
                        <h4>{comp.name}</h4>
                        <span className={`market-tier-badge tier-${comp.marketShareTier}`}>
                          {comp.marketShareTier.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </div>
                      <a href={comp.officialWebsite} target="_blank" rel="noreferrer" className="comp-link">
                        {comp.officialWebsite.replace(/^https?:\/\//i, "")} <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Primary USP & Positioning */}
                <div className="comp-usp-box">
                  <div className="usp-label"><Award size={12} /> PRIMARY USP</div>
                  <p className="usp-text">{comp.primaryUsp}</p>
                  <small className="pos-angle">"{comp.positioningAngle}"</small>
                </div>

                {/* Core Offer & Key Features */}
                <div className="comp-features-section">
                  <span className="section-label">Core Offer &amp; Capabilities</span>
                  <div className="feature-tags">
                    {comp.keyFeatures.map((feat) => (
                      <span key={feat} className="feature-pill">{feat}</span>
                    ))}
                  </div>
                </div>

                {/* Pricing / Market Tier */}
                <div className="comp-pricing-row">
                  <DollarSign size={13} className="text-emerald-400" />
                  <div>
                    <strong>Pricing &amp; Position:</strong>
                    <span>{comp.pricingMarketPosition}</span>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="sw-grid">
                  <div className="strength-col">
                    <span className="sw-label text-emerald-400">Strengths</span>
                    <ul>
                      {comp.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="weakness-col">
                    <span className="sw-label text-amber-400">Weaknesses / Gaps</span>
                    <ul>
                      {comp.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* HOW WE DIFFER (Highlight Section) */}
                <div className="how-we-differ-callout">
                  <div className="differ-title">
                    <Zap size={13} className="text-blue-400" /> How We Differ &amp; Win
                  </div>
                  <p>{comp.howWeDiffer}</p>
                </div>

                {/* Proof & Evidence Summary */}
                <div className="comp-card-footer">
                  <div className="proof-signals">
                    <small>Trust signals:</small>
                    <span>{comp.proofSignals[0]}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMPANY POSITIONING & MEMORY */}
      {activeTab === "positioning" && (
        <div className="positioning-tab-content">
          <div className="section-head">
            <div>
              <h3>Company Strategic Foundation &amp; Memory</h3>
              <p>The ground truth extracted from {websiteUrl} and used across all marketing skills.</p>
            </div>
          </div>

          <div className="memory-grid">
            {/* Core Offer Stack */}
            <div className="memory-card">
              <div className="card-title"><Layers size={14} /> Core Offer Stack</div>
              <ul>
                {companyProfile.coreOfferStack.map((offer, i) => (
                  <li key={i}><strong>{offer}</strong></li>
                ))}
              </ul>
            </div>

            {/* Target Personas */}
            <div className="memory-card">
              <div className="card-title"><Users size={14} /> Ideal Customer Profiles (ICPs)</div>
              {companyProfile.icpsAndPersonas.map((icp, i) => (
                <div key={i} className="icp-sub-item">
                  <strong>{icp.title} ({icp.role})</strong>
                  <p>{icp.description}</p>
                </div>
              ))}
            </div>

            {/* Customer Pain Points */}
            <div className="memory-card">
              <div className="card-title"><ShieldAlert size={14} /> Solved Pain Points</div>
              <ul>
                {companyProfile.painPoints.map((pain, i) => (
                  <li key={i}>{pain}</li>
                ))}
              </ul>
            </div>

            {/* Differentiators & Proof */}
            <div className="memory-card">
              <div className="card-title"><Award size={14} /> Core Differentiators &amp; Proof</div>
              <ul>
                {companyProfile.differentiators.map((diff, i) => (
                  <li key={i}>{diff}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs text-slate-400">
                <strong>Proof:</strong> {companyProfile.proofPoints[0]}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KEY STRATEGIC FINDINGS */}
      {activeTab === "findings" && (
        <div className="findings-tab-content">
          <div className="section-head">
            <div>
              <h3>Normalized Strategic Findings</h3>
              <p>Deterministic observations grouped by signal type and verified provenance.</p>
            </div>
            <div className="filter-pills">
              {["all", "positive_signal", "issue", "opportunity", "risk", "insight"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-btn ${filterCategory === cat ? "active" : ""}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat.replace(/_/g, " ").toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="findings-grid">
            {filteredFindings.map((finding) => (
              <div key={finding.id} className={`finding-card type-${finding.type}`}>
                <div className="finding-card-top">
                  <span className={`finding-type-pill type-${finding.type}`}>
                    {finding.type.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span className={`provenance-pill prov-${finding.provenance}`}>
                    {finding.provenance.toUpperCase()}
                  </span>
                </div>
                <h4>{finding.title}</h4>
                <p className="finding-evidence">{finding.evidence}</p>
                <div className="finding-impact">
                  <strong>Impact:</strong> <span>{finding.impact}</span>
                </div>
                <div className="finding-footer">
                  <div className="skills-row">
                    {finding.originatingSkills.map((s) => (
                      <span key={s} className="skill-mini-tag">{s}</span>
                    ))}
                  </div>
                  <span className="conf-score">Confidence {finding.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
