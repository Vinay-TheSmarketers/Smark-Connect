"use client";

import { useState } from "react";
import {
  Sparkles,
  Link2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Network,
  Compass,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { analyzeLinkStructure, type BacklinksIntelligence } from "@/lib/seo/backlinks";

interface AnalyticsLinksViewProps {
  companyUrl: string;
  crawlPages?: Array<{ url: string; title?: string | null; content: string }>;
}

export function AnalyticsLinksView({ companyUrl, crawlPages = [] }: AnalyticsLinksViewProps) {
  const [selectedAnchorTab, setSelectedAnchorTab] = useState<string>("all");
  const data: BacklinksIntelligence = analyzeLinkStructure(companyUrl, crawlPages);

  const cleanHost = (() => {
    try {
      return new URL(companyUrl.startsWith("http") ? companyUrl : `https://${companyUrl}`).hostname.replace(/^www\./, "");
    } catch {
      return companyUrl;
    }
  })();

  return (
    <div className="analytics-links-container">
      {/* 1. Top Header Banner */}
      <div className="source-banner aeo-banner">
        <div>
          <Sparkles size={18} />
          <span>
            <strong>Common Crawl &amp; Internal Link Graph</strong>
            <small>{data.inspectedPages} pages analyzed · {data.totalInternalLinks} internal link edges</small>
          </span>
        </div>
        <span className="source-status evidence-badge">Evidence-Led (0.85)</span>
      </div>

      {/* 2. Top Summary Cards */}
      <div className="link-summary-cards-grid margin-top">
        <div className="link-stat-card">
          <div className="stat-head">
            <span>Link Health Score</span>
            <ShieldCheck size={14} className="text-emerald-400" />
          </div>
          <strong className="stat-value">{data.healthScore}/100</strong>
          <small className="stat-sub">Based on internal topology &amp; graph safety</small>
        </div>

        <div className="link-stat-card">
          <div className="stat-head">
            <span>Common Crawl Rank</span>
            <Compass size={14} className="text-blue-400" />
          </div>
          <strong className="stat-value">PR ~{data.commonCrawl.estimatedPageRank ?? "—"}</strong>
          <small className="stat-sub">{data.commonCrawl.inboundDomainRange}</small>
        </div>

        <div className="link-stat-card">
          <div className="stat-head">
            <span>Harmonic Centrality</span>
            <Network size={14} className="text-purple-400" />
          </div>
          <strong className="stat-value">{data.commonCrawl.harmonicCentrality ?? "—"}</strong>
          <small className="stat-sub">Domain web-graph connectivity</small>
        </div>
      </div>

      {/* 3. Anchor Text Distribution Breakdown */}
      <div className="anchor-distribution-card margin-top">
        <div className="card-section-head">
          <span className="flex items-center gap-1.5 font-semibold text-xs tracking-wider uppercase">
            <Share2 size={13} /> Anchor Text Naturalness Profile
          </span>
          <span className="text-[10px] text-slate-400">Target: Branded &gt; 35%</span>
        </div>

        <div className="anchor-progress-bars">
          {data.anchorDistribution.map((item) => (
            <div key={item.type} className="anchor-bar-row">
              <div className="anchor-bar-label">
                <span className="capitalize">{item.type}</span>
                <strong>{item.percentage}% ({item.count})</strong>
              </div>
              <div className="anchor-track">
                <div
                  className={`anchor-fill ${item.type === "branded" ? "bg-emerald-500" : item.type === "exact" ? "bg-amber-500" : item.type === "generic" ? "bg-blue-500" : "bg-slate-500"}`}
                  style={{ width: `${Math.max(4, item.percentage)}%` }}
                />
              </div>
              {item.examples.length > 0 && (
                <div className="anchor-examples">
                  <small>Examples: {item.examples.join(", ")}</small>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Internal Link Architecture (Hubs & Orphans) */}
      <div className="internal-topology-card margin-top">
        <div className="card-section-head">
          <span className="flex items-center gap-1.5 font-semibold text-xs tracking-wider uppercase">
            <Layers size={13} /> Crawled Page Linking Distribution
          </span>
          <span className="text-[10px] text-slate-400">{data.internalLinkGraph.length} pages mapped</span>
        </div>

        <div className="topology-list">
          {data.internalLinkGraph.slice(0, 8).map((page) => {
            let path = "/";
            try {
              path = new URL(page.url).pathname || "/";
            } catch {}
            return (
              <div key={page.url} className="topology-row">
                <div className="page-path-col">
                  <span className="font-mono text-xs text-slate-200">{path}</span>
                  {page.title && <small className="text-[10px] text-slate-400 truncate block">{page.title}</small>}
                </div>
                <div className="page-tags-col">
                  {page.isHub && <span className="tag-hub">Hub ({page.outboundCount} out)</span>}
                  {page.isOrphan && <span className="tag-orphan">Orphan (0 in)</span>}
                  {!page.isHub && !page.isOrphan && (
                    <span className="tag-normal">{page.inboundCount} in · {page.outboundCount} out</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Warnings & Opportunities */}
      {(data.warnings.length > 0 || data.recommendations.length > 0) && (
        <div className="link-recommendations-card margin-top">
          <div className="card-section-head">
            <span className="flex items-center gap-1.5 font-semibold text-xs tracking-wider uppercase">
              <AlertTriangle size={13} className="text-amber-400" /> Link Profile Recommendations
            </span>
          </div>
          <ul className="rec-list">
            {data.warnings.map((w, idx) => (
              <li key={`w-${idx}`} className="rec-item warn">
                <AlertTriangle size={12} className="shrink-0 text-amber-400 mt-0.5" />
                <span>{w}</span>
              </li>
            ))}
            {data.recommendations.map((r, idx) => (
              <li key={`r-${idx}`} className="rec-item rec">
                <CheckCircle2 size={12} className="shrink-0 text-emerald-400 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Honest Verification Notice */}
      <div className="evidence-note margin-top">
        <strong>Common Crawl Open-Graph Standards</strong>
        <p>
          Domain ranking signals and link counts are derived from Common Crawl hyperlink graphs and on-page DOM crawling.
          External backlink referring domains and anchor distributions are grounded in open datasets and are never fabricated.
        </p>
      </div>
    </div>
  );
}
