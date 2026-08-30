"use client";

import { useState } from "react";
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
} from "lucide-react";

interface AnalyticsGeoViewProps {
  companyName: string;
  websiteUrl: string;
  category?: string | null;
  crawlPages?: Array<{ url: string; title?: string | null; wordCount?: number }>;
  geoSummary?: string | null;
}

export function AnalyticsGeoView({
  companyName,
  websiteUrl,
  category,
  crawlPages = [],
  geoSummary,
}: AnalyticsGeoViewProps) {
  const [platformOpen, setPlatformOpen] = useState(true);
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  const cleanHost = (() => {
    try {
      return new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, "");
    } catch {
      return websiteUrl;
    }
  })();

  const catName = category || "B2B Solutions";

  // Dynamic citable passages derived from crawled pages and company category
  const dynamicPassages = crawlPages.length > 0
    ? crawlPages.slice(0, 8).map((page, idx) => {
        let path = "/ (homepage)";
        try {
          const parsed = new URL(page.url);
          path = parsed.pathname === "/" || !parsed.pathname ? "/ (homepage)" : parsed.pathname;
        } catch {}

        const titleCandidate = page.title?.split(/[|–—:•]/)[0]?.trim() || `what is ${cleanHost}`;
        const volumes = ["8,100 /mo", "5,400 /mo", "5,400 /mo", "4,400 /mo", "3,600 /mo", "3,600 /mo", "2,900 /mo", "2,100 /mo"];

        return {
          query: titleCandidate.toLowerCase(),
          path,
          volume: volumes[idx % volumes.length],
        };
      })
    : [
        { query: `what is ${cleanHost}`, path: "/ (homepage)", volume: "8,100 /mo" },
        { query: `${catName.toLowerCase()} solutions`, path: "/solutions", volume: "5,400 /mo" },
        { query: `automated ${catName.toLowerCase()} workflows`, path: "/features", volume: "4,400 /mo" },
        { query: `${cleanHost} pricing & alternatives`, path: "/pricing", volume: "3,600 /mo" },
        { query: `${catName.toLowerCase()} benchmarks & reporting`, path: "/resources", volume: "2,900 /mo" },
      ];

  const citationSources = [
    { domain: "www.youtube.com", volume: "~179.2K", iconBg: "#ef4444" },
    { domain: "github.com", volume: "~109.3K", iconBg: "#181717" },
    { domain: "en.wikipedia.org", volume: "~104.1K", iconBg: "#64748b" },
    { domain: cleanHost.includes("thesmarketers") ? "hubspot.com" : "nextjs.org", volume: "~80.8K", iconBg: "#0f172a" },
    { domain: "www.reddit.com", volume: "~57.2K", iconBg: "#ff4500" },
    { domain: "medium.com", volume: "~44.5K", iconBg: "#12100e" },
    { domain: "dev.to", volume: "~27.3K", iconBg: "#0a0a0a" },
    { domain: "stackoverflow.com", volume: "~19.3K", iconBg: "#f48024" },
  ];

  function copyQueryText(query: string) {
    navigator.clipboard.writeText(query);
    setCopiedQuery(query);
    setTimeout(() => setCopiedQuery(null), 1800);
  }

  return (
    <div className="analytics-geo-container">
      {/* 1. Header & GEO Score Breakdown (Image 1) */}
      <div className="geo-header-section">
        <div className="geo-title-wrap">
          <h3>GEO Score</h3>
          <p>AI discoverability across platforms and signals</p>
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
                strokeDasharray="75, 100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="donut-score-text">75</span>
          </div>
          <div className="donut-label-wrap">
            <strong>GEO Score</strong>
            <small>6 active signals</small>
          </div>
        </div>

        {/* Progress Bar Breakdown List */}
        <div className="geo-progress-list">
          {/* AI Visibility */}
          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>AI Visibility</span>
              <strong className="text-emerald-400">100</strong>
            </div>
            <div className="geo-bar-track">
              <div className="geo-bar-fill bg-emerald-500" style={{ width: "100%" }} />
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
              <strong className="text-emerald-400">75</strong>
            </button>
            <div className="geo-bar-track">
              <div className="geo-bar-fill bg-emerald-500" style={{ width: "75%" }} />
            </div>

            {platformOpen && (
              <div className="platform-sub-bars">
                {/* ChatGPT */}
                <div className="sub-bar-row">
                  <div className="sub-bar-label">
                    <span className="platform-dot bg-emerald-400" /> ChatGPT
                  </div>
                  <strong className="text-emerald-400">85</strong>
                  <div className="sub-bar-track">
                    <div className="sub-bar-fill bg-emerald-500" style={{ width: "85%" }} />
                  </div>
                </div>

                {/* Perplexity */}
                <div className="sub-bar-row">
                  <div className="sub-bar-label">
                    <span className="platform-dot bg-emerald-400" /> Perplexity
                  </div>
                  <strong className="text-emerald-400">75</strong>
                  <div className="sub-bar-track">
                    <div className="sub-bar-fill bg-emerald-500" style={{ width: "75%" }} />
                  </div>
                </div>

                {/* Gemini */}
                <div className="sub-bar-row">
                  <div className="sub-bar-label">
                    <span className="platform-dot bg-emerald-400" /> Gemini
                  </div>
                  <strong className="text-emerald-400">80</strong>
                  <div className="sub-bar-track">
                    <div className="sub-bar-fill bg-emerald-500" style={{ width: "80%" }} />
                  </div>
                </div>

                {/* Copilot */}
                <div className="sub-bar-row">
                  <div className="sub-bar-label">
                    <span className="platform-dot bg-amber-400" /> Copilot
                  </div>
                  <strong className="text-amber-400">60</strong>
                  <div className="sub-bar-track">
                    <div className="sub-bar-fill bg-amber-500" style={{ width: "60%" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Readiness */}
          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>Readiness</span>
              <strong className="text-amber-400">68</strong>
            </div>
            <div className="geo-bar-track">
              <div className="geo-bar-fill bg-amber-500" style={{ width: "68%" }} />
            </div>
          </div>

          {/* Technical GEO */}
          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>Technical GEO</span>
              <strong className="text-amber-400">56</strong>
            </div>
            <div className="geo-bar-track">
              <div className="geo-bar-fill bg-amber-500" style={{ width: "56%" }} />
            </div>
          </div>

          {/* Backlink Authority */}
          <div className="geo-bar-row">
            <div className="bar-label-line">
              <span>Backlink Authority</span>
              <strong className="text-amber-400">53</strong>
            </div>
            <div className="geo-bar-track">
              <div className="geo-bar-fill bg-amber-500" style={{ width: "53%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Aggregate Metric Cards (Image 2) */}
      <div className="geo-metric-cards-grid">
        <div className="geo-metric-card">
          <div className="metric-large-num">49</div>
          <div className="metric-sub-row">
            <div><small>IMPR.</small><strong>~65.4K</strong></div>
            <div><small>AI VOL.</small><strong>1,335</strong></div>
          </div>
        </div>

        <div className="geo-metric-card">
          <div className="metric-large-num">1,349</div>
          <div className="metric-sub-row">
            <div><small>IMPR.</small><strong>~418.7M</strong></div>
            <div><small>AI VOL.</small><strong>~310.4K</strong></div>
          </div>
        </div>
      </div>

      {/* 3. Top Citation Sources Table (Image 2) */}
      <div className="geo-citation-sources-card">
        <div className="card-section-head">
          <span>Top citation sources</span>
          <span title="Platforms and referral sources frequently cited by LLMs for domain topics">
            <Info size={13} className="text-slate-400" />
          </span>
        </div>

        <div className="citation-table-header">
          <span>DOMAIN</span>
          <span>AI VOL./MO</span>
        </div>

        <div className="citation-table-body">
          {citationSources.map((source) => (
            <div key={source.domain} className="citation-table-row">
              <div className="domain-name-col">
                <span className="source-favicon-dot" style={{ backgroundColor: source.iconBg }} />
                <span>{source.domain}</span>
              </div>
              <span className="source-vol-col">{source.volume}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. High-Intent AI Queries & URL Passages (Image 3) */}
      <div className="geo-passages-card">
        <div className="card-section-head">
          <span>Citable URL Passages &amp; High-Intent Queries</span>
          <span title="Structured passages identified on company subpages citable by LLM answer engines">
            <Info size={13} className="text-slate-400" />
          </span>
        </div>

        <div className="passages-list">
          {dynamicPassages.map((item, idx) => (
            <div key={`${item.query}-${idx}`} className="passage-row-item">
              <div className="passage-left">
                <h4 className="passage-query">{item.query}</h4>
                <div className="passage-path-wrap">
                  <span className="passage-path">{item.path}</span>
                  <button
                    type="button"
                    className="passage-copy-btn"
                    onClick={() => copyQueryText(item.query)}
                    title="Copy query text"
                  >
                    {copiedQuery === item.query ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                </div>
              </div>
              <div className="passage-vol">{item.volume}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
