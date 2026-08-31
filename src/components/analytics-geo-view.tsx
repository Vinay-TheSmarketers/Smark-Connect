"use client";

import { useState, useMemo } from "react";
import {
  Globe,
  Bot,
  Sparkles,
  Search,
  Check,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Info,
  Layers,
  FileText,
  Target,
  ArrowUpRight,
  CheckCircle2,
  ListFilter,
  Eye,
} from "lucide-react";
import { analyzeGeoCitability, type AnswerPassage } from "@/lib/seo/geo-citability";

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
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

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

  const cleanHost = useMemo(() => {
    try {
      return new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, "");
    } catch {
      return websiteUrl;
    }
  }, [websiteUrl]);

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  }

  function toggleAction(index: number) {
    setCompletedActions((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  // Filtered passages
  const filteredPassages = useMemo(() => {
    return report.answerPassages.filter((p) => {
      const matchesType = filterType === "all" || p.type === filterType;
      const matchesSearch =
        searchQuery === "" ||
        p.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.passage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.path.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [report.answerPassages, filterType, searchQuery]);

  function getScoreColorClass(val: number) {
    if (val >= 80) return "score-high";
    if (val >= 60) return "score-med";
    return "score-low";
  }

  const platforms = [
    { name: "ChatGPT & SearchGPT", score: report.platformReadiness.chatgpt, dotColor: "#10a37f" },
    { name: "Perplexity AI", score: report.platformReadiness.perplexity, dotColor: "#22b8cf" },
    { name: "Google Gemini", score: report.platformReadiness.gemini, dotColor: "#4285f4" },
    { name: "Microsoft Copilot", score: report.platformReadiness.copilot, dotColor: "#0078d4" },
  ];

  return (
    <div className="analytics-geo-container">
      {/* 1. Header & GEO Score Breakdown Card */}
      <div className="geo-header-card">
        <div className="geo-header-top">
          <div className="geo-title-box">
            <div className="geo-title-row">
              <span className="geo-icon-badge">
                <Globe size={16} />
              </span>
              <h3>GEO &amp; AI Visibility</h3>
            </div>
            <p>Answer Engine Optimization across ChatGPT, Perplexity, Gemini, and Copilot</p>
          </div>

          <div className="geo-stage-pill" title="Current Citation Maturity Stage">
            <span className="live-dot" />
            <span>{report.citationReadinessStage}</span>
          </div>
        </div>

        {/* Circular Donut & Platform Quick Gauges */}
        <div className="geo-overview-grid">
          <div className="geo-donut-box">
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
            <div className="donut-text-col">
              <strong>GEO Score</strong>
              <small>{report.activeSignalsCount} verified citable signals</small>
            </div>
          </div>

          <div className="geo-platform-mini-grid">
            {platforms.map((plat) => (
              <div key={plat.name} className="platform-mini-card">
                <div className="plat-head">
                  <span className="plat-dot" style={{ backgroundColor: plat.dotColor }} />
                  <span className="plat-name">{plat.name}</span>
                </div>
                <div className="plat-score-bar">
                  <strong className={getScoreColorClass(plat.score)}>{plat.score}</strong>
                  <div className="plat-track">
                    <div className="plat-fill" style={{ width: `${plat.score}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Breakdown Bars */}
        <div className="geo-progress-list">
          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>AI Search Visibility</span>
              <strong className={getScoreColorClass(report.aiVisibility)}>{report.aiVisibility}%</strong>
            </div>
            <div className="geo-bar-track">
              <div className="geo-bar-fill" style={{ width: `${report.aiVisibility}%` }} />
            </div>
          </div>

          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>Answer Engine Readiness</span>
              <strong className={getScoreColorClass(report.readinessScore)}>{report.readinessScore}%</strong>
            </div>
            <div className="geo-bar-track">
              <div className="geo-bar-fill" style={{ width: `${report.readinessScore}%` }} />
            </div>
          </div>

          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>Technical Citability &amp; Schema</span>
              <strong className={getScoreColorClass(report.technicalGeoScore)}>{report.technicalGeoScore}%</strong>
            </div>
            <div className="geo-bar-track">
              <div className="geo-bar-fill" style={{ width: `${report.technicalGeoScore}%` }} />
            </div>
          </div>

          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>Ecosystem Authority &amp; Reference Links</span>
              <strong className={getScoreColorClass(report.backlinkAuthorityScore)}>{report.backlinkAuthorityScore}%</strong>
            </div>
            <div className="geo-bar-track">
              <div className="geo-bar-fill" style={{ width: `${report.backlinkAuthorityScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Aggregate Metric Cards */}
      <div className="geo-stats-grid">
        <div className="geo-stat-card">
          <div className="geo-stat-main">{report.aggregateStats.citablePassagesCount}</div>
          <div className="geo-stat-sub">
            <div>
              <small>IMPRESSION INDEX</small>
              <strong>{report.aggregateStats.aiImpressionIndex}</strong>
            </div>
            <div>
              <small>EST. AI SEARCH VOL.</small>
              <strong>{report.aggregateStats.aiSearchVolume}</strong>
            </div>
          </div>
        </div>

        <div className="geo-stat-card">
          <div className="geo-stat-main">{report.entitySignals.totalAuditedPages}</div>
          <div className="geo-stat-sub">
            <div>
              <small>AUDITED CONTENT</small>
              <strong>{report.aggregateStats.totalAuditedWordsFormatted} words</strong>
            </div>
            <div>
              <small>SCHEMA &amp; TABLES</small>
              <strong>{report.entitySignals.structuredListsCount + report.entitySignals.tablesCount} nodes</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Citable Passages & High-Intent Queries */}
      <div className="geo-card-section">
        <div className="card-section-head">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" />
            <h4 className="m-0 font-bold text-sm">Citable Passages &amp; High-Intent AI Queries</h4>
          </div>
          <span className="card-badge">{filteredPassages.length} queries</span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="geo-passages-toolbar">
          <div className="geo-search-input-wrap">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search AI queries, snippets, or paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="geo-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
              >
                &times;
              </button>
            )}
          </div>

          <div className="geo-filter-pills">
            {(["all", "definition", "procedure", "comparison", "faq"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`geo-filter-pill ${filterType === type ? "active" : ""}`}
                onClick={() => setFilterType(type)}
              >
                {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="passages-list">
          {filteredPassages.length === 0 ? (
            <div className="geo-empty-state">
              <Info size={18} />
              <p>No citable passages matched your current filter.</p>
            </div>
          ) : (
            filteredPassages.map((item, idx) => (
              <div key={`${item.query}-${idx}`} className="passage-card-item">
                <div className="passage-top-line">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`passage-type-badge type-${item.type}`}>
                      {item.type.toUpperCase()}
                    </span>
                    <h5 className="passage-query-title">{item.query}</h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="passage-citability-pill">{item.citabilityScore}% Citability</span>
                    <span className="passage-vol-tag">{item.monthlyAiVolume}</span>
                  </div>
                </div>

                <p className="passage-quote-body">&ldquo;{item.passage}&rdquo;</p>

                <div className="passage-footer-row">
                  <span className="passage-url-path" title={item.sourceUrl}>
                    {item.path}
                  </span>

                  <div className="passage-action-buttons">
                    <button
                      type="button"
                      className="passage-action-btn"
                      onClick={() => copyText(item.passage)}
                      title="Copy passage snippet"
                    >
                      {copiedText === item.passage ? (
                        <>
                          <Check size={11} className="text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy Passage</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`https://www.perplexity.ai/search?q=${encodeURIComponent(item.query)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="passage-action-btn test-link"
                      title="Test live citation on Perplexity AI"
                    >
                      <Bot size={11} />
                      <span>Test on Perplexity</span>
                      <ArrowUpRight size={10} />
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Top Citation Sources Table */}
      <div className="geo-card-section">
        <div className="card-section-head">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-600" />
            <h4 className="m-0 font-bold text-sm">Top Citation Sources &amp; Knowledge Ecosystem</h4>
          </div>
          <span className="card-badge">{report.citationSources.length} ecosystem nodes</span>
        </div>

        <div className="citation-table-wrap">
          <div className="citation-table-header">
            <span>DOMAIN &amp; ECOSYSTEM NODE</span>
            <span>EST. AI REFERRAL VOLUME</span>
          </div>

          <div className="citation-table-body">
            {report.citationSources.map((source) => (
              <div key={source.domain} className="citation-table-row">
                <div className="domain-name-col">
                  <span className="source-favicon-dot" style={{ backgroundColor: source.iconBg }} />
                  <strong>{source.domain}</strong>
                  <span className="citation-status-pill">{source.status}</span>
                </div>
                <span className="source-vol-col">{source.volume}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Strategic AI Engine Action Checklist */}
      {report.strategicActions.length > 0 && (
        <div className="geo-card-section">
          <div className="card-section-head">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-blue-600" />
              <h4 className="m-0 font-bold text-sm">Prioritized Answer Engine Actions</h4>
            </div>
            <span className="card-badge">
              {Object.values(completedActions).filter(Boolean).length} / {report.strategicActions.length} Completed
            </span>
          </div>

          <div className="geo-actions-checklist">
            {report.strategicActions.map((action, i) => {
              const isDone = Boolean(completedActions[i]);
              return (
                <div
                  key={i}
                  className={`geo-action-checklist-item ${isDone ? "completed" : ""}`}
                  onClick={() => toggleAction(i)}
                >
                  <button
                    type="button"
                    className={`action-check-box ${isDone ? "checked" : ""}`}
                    aria-label={isDone ? "Mark as pending" : "Mark as completed"}
                  >
                    {isDone && <Check size={12} />}
                  </button>
                  <p className="action-text">{action}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
