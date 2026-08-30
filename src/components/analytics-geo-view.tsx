"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
  ExternalLink,
  Bot,
  Zap,
  Globe,
  Compass,
  FileText,
  Target,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { analyzeGeoCitability } from "@/lib/seo/geo-citability";

interface AnalyticsGeoViewProps {
  companyName: string;
  websiteUrl: string;
  category?: string | null;
  description?: string | null;
  crawlPages?: Array<{ url: string; title?: string | null; description?: string | null; content?: string }>;
  geoSummary?: string | null;
}

export function AnalyticsGeoView({
  companyName,
  websiteUrl,
  category,
  description,
  crawlPages = [],
  geoSummary,
}: AnalyticsGeoViewProps) {
  const [platformOpen, setPlatformOpen] = useState(true);
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  // Compute real evidence-based GEO analysis
  const report = useMemo(() => {
    const pages = crawlPages.map((p) => ({
      url: p.url,
      title: p.title,
      description: p.description,
      content: p.content || "",
    }));
    return analyzeGeoCitability({ name: companyName, websiteUrl, category, description }, pages);
  }, [companyName, websiteUrl, category, description, crawlPages]);

  const cleanHost = (() => {
    try {
      return new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, "");
    } catch {
      return websiteUrl;
    }
  })();

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedQuery(text);
    setTimeout(() => setCopiedQuery(null), 1800);
  }

  // Ring stroke calculation
  const strokeDashoffset = 100 - report.geoScore;

  function scoreColorClass(val: number) {
    if (val >= 80) return "text-emerald-400";
    if (val >= 60) return "text-amber-400";
    return "text-rose-400";
  }

  function barFillClass(val: number) {
    if (val >= 80) return "bg-emerald-500";
    if (val >= 60) return "bg-amber-500";
    return "bg-rose-500";
  }

  return (
    <div className="analytics-geo-container">
      {/* 1. Header & GEO Score Breakdown */}
      <div className="geo-header-section">
        <div className="geo-title-wrap">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-emerald-400" />
            <h3>GEO Score</h3>
          </div>
          <p>AI engine discoverability across ChatGPT, Perplexity, Gemini, and Copilot</p>
        </div>

        {/* Circular Donut Score Card */}
        <div className="geo-donut-card">
          <div className="donut-ring-wrap">
            <svg className="donut-svg" viewBox="0 0 36 36">
              <path
                className="donut-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="donut-fill"
                strokeDasharray={`${report.geoScore}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="donut-score-text">{report.geoScore}</span>
          </div>
          <div className="donut-label-wrap">
            <strong>GEO Score</strong>
            <small>{report.activeSignalsCount} active signals verified</small>
          </div>
        </div>

        {/* Progress Bar Breakdown List */}
        <div className="geo-progress-list">
          {/* AI Visibility */}
          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>AI Visibility</span>
              <strong className={scoreColorClass(report.aiVisibility)}>{report.aiVisibility}</strong>
            </div>
            <div className="geo-bar-track">
              <div className={`geo-bar-fill ${barFillClass(report.aiVisibility)}`} style={{ width: `${report.aiVisibility}%` }} />
            </div>
          </div>

          {/* Platform Readiness (Collapsible) */}
          <div className="geo-bar-row">
            <button
              type="button"
              className="bar-label-line platform-toggle-btn"
              onClick={() => setPlatformOpen((v) => !v)}
            >
              <span className="flex items-center gap-1">
                Platform Readiness {platformOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
              <strong className={scoreColorClass(report.platformReadiness.composite)}>{report.platformReadiness.composite}</strong>
            </button>
            <div className="geo-bar-track">
              <div className={`geo-bar-fill ${barFillClass(report.platformReadiness.composite)}`} style={{ width: `${report.platformReadiness.composite}%` }} />
            </div>

            {platformOpen && (
              <div className="platform-sub-bars">
                {/* ChatGPT */}
                <div className="sub-bar-row">
                  <div className="sub-bar-label">
                    <span className="platform-dot bg-emerald-400" /> ChatGPT / SearchGPT
                  </div>
                  <strong className={scoreColorClass(report.platformReadiness.chatgpt)}>{report.platformReadiness.chatgpt}</strong>
                  <div className="sub-bar-track">
                    <div className={`sub-bar-fill ${barFillClass(report.platformReadiness.chatgpt)}`} style={{ width: `${report.platformReadiness.chatgpt}%` }} />
                  </div>
                </div>

                {/* Perplexity */}
                <div className="sub-bar-row">
                  <div className="sub-bar-label">
                    <span className="platform-dot bg-emerald-400" /> Perplexity AI
                  </div>
                  <strong className={scoreColorClass(report.platformReadiness.perplexity)}>{report.platformReadiness.perplexity}</strong>
                  <div className="sub-bar-track">
                    <div className={`sub-bar-fill ${barFillClass(report.platformReadiness.perplexity)}`} style={{ width: `${report.platformReadiness.perplexity}%` }} />
                  </div>
                </div>

                {/* Gemini */}
                <div className="sub-bar-row">
                  <div className="sub-bar-label">
                    <span className="platform-dot bg-emerald-400" /> Google Gemini
                  </div>
                  <strong className={scoreColorClass(report.platformReadiness.gemini)}>{report.platformReadiness.gemini}</strong>
                  <div className="sub-bar-track">
                    <div className={`sub-bar-fill ${barFillClass(report.platformReadiness.gemini)}`} style={{ width: `${report.platformReadiness.gemini}%` }} />
                  </div>
                </div>

                {/* Copilot */}
                <div className="sub-bar-row">
                  <div className="sub-bar-label">
                    <span className="platform-dot bg-amber-400" /> Microsoft Copilot
                  </div>
                  <strong className={scoreColorClass(report.platformReadiness.copilot)}>{report.platformReadiness.copilot}</strong>
                  <div className="sub-bar-track">
                    <div className={`sub-bar-fill ${barFillClass(report.platformReadiness.copilot)}`} style={{ width: `${report.platformReadiness.copilot}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Readiness */}
          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>Answer Engine Readiness</span>
              <strong className={scoreColorClass(report.readinessScore)}>{report.readinessScore}</strong>
            </div>
            <div className="geo-bar-track">
              <div className={`geo-bar-fill ${barFillClass(report.readinessScore)}`} style={{ width: `${report.readinessScore}%` }} />
            </div>
          </div>

          {/* Technical GEO */}
          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>Technical GEO &amp; Schema</span>
              <strong className={scoreColorClass(report.technicalGeoScore)}>{report.technicalGeoScore}</strong>
            </div>
            <div className="geo-bar-track">
              <div className={`geo-bar-fill ${barFillClass(report.technicalGeoScore)}`} style={{ width: `${report.technicalGeoScore}%` }} />
            </div>
          </div>

          {/* Backlink Authority */}
          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>Ecosystem Authority &amp; Links</span>
              <strong className={scoreColorClass(report.backlinkAuthorityScore)}>{report.backlinkAuthorityScore}</strong>
            </div>
            <div className="geo-bar-track">
              <div className={`geo-bar-fill ${barFillClass(report.backlinkAuthorityScore)}`} style={{ width: `${report.backlinkAuthorityScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Aggregate Metric Cards */}
      <div className="geo-metric-cards-grid">
        <div className="geo-metric-card">
          <div className="metric-large-num">{report.aggregateStats.citablePassagesCount}</div>
          <div className="metric-sub-row">
            <div>
              <small>IMPR. INDEX</small>
              <strong>{report.aggregateStats.aiImpressionIndex}</strong>
            </div>
            <div>
              <small>AI SEARCH VOL.</small>
              <strong>{report.aggregateStats.aiSearchVolume}</strong>
            </div>
          </div>
        </div>

        <div className="geo-metric-card">
          <div className="metric-large-num">{report.entitySignals.totalAuditedPages}</div>
          <div className="metric-sub-row">
            <div>
              <small>AUDITED CONTENT</small>
              <strong>{report.aggregateStats.totalAuditedWordsFormatted} words</strong>
            </div>
            <div>
              <small>READINESS STAGE</small>
              <strong>{report.citationReadinessStage}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top Citation Sources Table */}
      <div className="geo-citation-sources-card">
        <div className="card-section-head">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Top Citation Sources &amp; Knowledge Ecosystem</span>
          </div>
          <span title="Platforms and referral sources frequently cited by LLMs for domain topics">
            <Info size={13} className="text-slate-400" />
          </span>
        </div>

        <div className="citation-table-header">
          <span>DOMAIN &amp; ECOSYSTEM NODE</span>
          <span>EST. AI VOL./MO</span>
        </div>

        <div className="citation-table-body">
          {report.citationSources.map((source) => (
            <div key={source.domain} className="citation-table-row">
              <div className="domain-name-col">
                <span className="source-favicon-dot" style={{ backgroundColor: source.iconBg }} />
                <span>{source.domain}</span>
                <small className="citation-status-pill">{source.status}</small>
              </div>
              <span className="source-vol-col">{source.volume}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. High-Intent AI Queries & URL Passages */}
      <div className="geo-passages-card">
        <div className="card-section-head">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-rose-400" />
            <span>Citable URL Passages &amp; High-Intent AI Queries</span>
          </div>
          <span title="Structured passages identified on company subpages citable by LLM answer engines">
            <Info size={13} className="text-slate-400" />
          </span>
        </div>

        <div className="passages-list">
          {report.answerPassages.map((item, idx) => (
            <div key={`${item.query}-${idx}`} className="passage-row-item">
              <div className="passage-left">
                <div className="passage-head-line">
                  <h4 className="passage-query">{item.query}</h4>
                  <span className={`passage-type-badge type-${item.type}`}>{item.type.toUpperCase()}</span>
                  <span className="passage-score-badge">{item.citabilityScore}% Citability</span>
                </div>
                <p className="passage-snippet">&ldquo;{item.passage}&rdquo;</p>
                <div className="passage-path-wrap">
                  <span className="passage-path">{item.path}</span>
                  <button
                    type="button"
                    className="passage-copy-btn"
                    onClick={() => copyText(item.passage)}
                    title="Copy passage text"
                  >
                    {copiedQuery === item.passage ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <Copy size={11} />
                    )}
                    <small>{copiedQuery === item.passage ? "Copied" : "Copy Passage"}</small>
                  </button>
                </div>
              </div>
              <div className="passage-vol">{item.monthlyAiVolume}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Strategic AI Engine Recommendations */}
      {report.strategicActions.length > 0 && (
        <div className="geo-actions-card">
          <div className="card-section-head">
            <div className="flex items-center gap-1.5">
              <Target size={14} className="text-sky-400" />
              <span>Prioritized AI Answer Engine Actions</span>
            </div>
          </div>
          <div className="geo-actions-list">
            {report.strategicActions.map((action, i) => (
              <div key={i} className="geo-action-row">
                <span className="action-num-badge">{i + 1}</span>
                <p>{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
