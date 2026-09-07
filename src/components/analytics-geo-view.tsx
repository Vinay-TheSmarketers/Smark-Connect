"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileText,
  Globe,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
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
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPassageIndex, setSelectedPassageIndex] = useState<number | null>(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

  const report = useMemo(() => {
    const pages = crawlPages.map((page) => ({
      url: page.url,
      title: page.title,
      description: page.description,
      content: page.content || "",
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

  const filteredPassages = useMemo(() => report.answerPassages.filter((passage) => {
    const matchesType = filterType === "all" || passage.type === filterType;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [passage.query, passage.passage, passage.path].some((value) => value.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  }), [report.answerPassages, filterType, searchQuery]);

  const selectedPassage = selectedPassageIndex === null ? null : filteredPassages[selectedPassageIndex] ?? filteredPassages[0] ?? null;
  const completedCount = Object.values(completedActions).filter(Boolean).length;

  const platforms = [
    { key: "chatgpt", name: "ChatGPT", score: report.platformReadiness.chatgpt },
    { key: "perplexity", name: "Perplexity", score: report.platformReadiness.perplexity },
    { key: "gemini", name: "Gemini", score: report.platformReadiness.gemini },
    { key: "copilot", name: "Copilot", score: report.platformReadiness.copilot },
  ];

  const evidenceRows = [
    { label: "Pages analyzed", value: `${report.entitySignals.totalAuditedPages}`, good: report.entitySignals.totalAuditedPages > 0 },
    { label: "Extractable passages", value: `${report.answerPassages.length}`, good: report.answerPassages.length > 0 },
    { label: "Entity definition", value: report.entitySignals.brandEntityFound ? "Found" : "Not found", good: report.entitySignals.brandEntityFound },
    { label: "Category context", value: report.entitySignals.categoryDeclared ? "Found" : "Not found", good: report.entitySignals.categoryDeclared },
    { label: "Clear value proposition", value: report.entitySignals.clearValueProp ? "Found" : "Not found", good: report.entitySignals.clearValueProp },
    { label: "Lists and tables", value: `${report.entitySignals.structuredListsCount + report.entitySignals.tablesCount}`, good: report.entitySignals.structuredListsCount + report.entitySignals.tablesCount > 0 },
    { label: "External reference domains", value: `${report.entitySignals.externalReferenceDomains}`, good: report.entitySignals.externalReferenceDomains > 0 },
  ];

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  }

  function selectPassage(index: number) {
    setSelectedPassageIndex(index);
  }

  function toggleAction(index: number) {
    setCompletedActions((current) => ({ ...current, [index]: !current[index] }));
  }

  return (
    <div className="analytics-geo-container geo-inspector geo-single-page">
      <div className="geo-inspector-header">
        <div className="geo-inspector-title">
          <span><Globe size={16} /></span>
          <div><strong>AI/GEO</strong><small>{cleanHost} · {crawlPages.length} pages analyzed</small></div>
        </div>
        <span className="geo-evidence-stage">{report.citationReadinessStage}</span>
      </div>

      <section className="geo-score-ledger">
        <div className="geo-score-primary">
          <span><strong>{report.geoScore}</strong><small>/100</small></span>
          <div><strong>GEO readiness</strong><small>Derived from fetched page evidence</small></div>
        </div>
        <div className="geo-score-track" aria-label={`GEO readiness ${report.geoScore} out of 100`}><span style={{ width: `${report.geoScore}%` }} /></div>
      </section>

      <div className="geo-evidence-ledger geo-primary-evidence">
        {evidenceRows.map((row) => (
          <div className="geo-evidence-row" key={row.label}>
            <span className={row.good ? "good" : "warning"}>{row.good ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}</span>
            <strong>{row.label}</strong><span>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="geo-section-heading"><div><strong>Platform readiness</strong><span>Modeled from the same fetched page evidence</span></div><ShieldCheck size={15} /></div>
      <div className="geo-readiness-list geo-readiness-full">
        {platforms.map((platform) => (
          <div className="geo-readiness-row" key={platform.key}>
            <span>{platform.name}</span><div><span style={{ width: `${platform.score}%` }} /></div><strong>{platform.score}</strong>
          </div>
        ))}
      </div>

      <div className="geo-section-heading"><div><strong>Citable passages</strong><span>Extracted directly from crawled page content</span></div><FileText size={15} /></div>
      <div className="geo-passages-toolbar compact">
        <label className="geo-search-input-wrap"><Search size={13} /><input type="search" placeholder="Search passages or paths" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></label>
        <div className="geo-filter-pills">
          {(["all", "definition", "procedure", "comparison", "faq"] as const).map((type) => <button key={type} type="button" className={filterType === type ? "active" : ""} onClick={() => { setFilterType(type); setSelectedPassageIndex(0); }}>{type === "all" ? "All" : type}</button>)}
        </div>
      </div>

      <div className="geo-passage-ledger expanded">
        {filteredPassages.map((passage, index) => (
          <button type="button" key={`${passage.sourceUrl}-${passage.heading}`} className={selectedPassage === passage ? "selected" : ""} onClick={() => selectPassage(index)}>
            <span className={`geo-passage-score ${passage.citabilityScore >= 80 ? "good" : "warning"}`}>{passage.citabilityScore}</span>
            <span><strong>{passage.query}</strong><small>{passage.path} · {passage.type}</small></span><ChevronRight size={14} />
          </button>
        ))}
        {filteredPassages.length === 0 && <p className="geo-inline-empty"><Search size={15} /> No fetched passages match this filter.</p>}
      </div>

      {selectedPassage && (
        <div className="geo-passage-detail">
          <header><div><strong>{selectedPassage.query}</strong><span>{selectedPassage.citabilityScore}% citable</span></div><button type="button" aria-label="Close passage details" onClick={() => setSelectedPassageIndex(null)}>×</button></header>
          <blockquote>{selectedPassage.passage}</blockquote>
          <div className="geo-passage-source"><span><FileText size={13} /> {selectedPassage.path}</span><strong>{selectedPassage.type}</strong></div>
          <div className="geo-passage-actions">
            <button type="button" onClick={() => copyText(selectedPassage.passage)}>{copiedText === selectedPassage.passage ? <Check size={12} /> : <Copy size={12} />}{copiedText === selectedPassage.passage ? "Copied" : "Copy passage"}</button>
            <a href={`https://www.perplexity.ai/search?q=${encodeURIComponent(selectedPassage.query)}`} target="_blank" rel="noreferrer"><Bot size={12} />Test query<ArrowUpRight size={11} /></a>
          </div>
        </div>
      )}

      {geoSummary && <div className="geo-analysis-summary"><header><Sparkles size={14} /><strong>Skill analysis summary</strong></header><p>{geoSummary}</p></div>}
      <p className="geo-evidence-note"><ShieldCheck size={14} /> Citation-source and referral-volume tables remain hidden until a connected source verifies them.</p>

      <div className="geo-section-heading"><div><strong>Prioritized actions</strong><span>{completedCount} of {report.strategicActions.length} completed</span></div><Target size={15} /></div>
      <div className="geo-actions-ledger">
        {report.strategicActions.map((action, index) => {
          const completed = Boolean(completedActions[index]);
          return <button type="button" key={action} className={completed ? "completed" : ""} onClick={() => toggleAction(index)}><span>{completed && <Check size={12} />}</span><p>{action}</p></button>;
        })}
        {report.strategicActions.length === 0 && <p className="geo-inline-empty"><CheckCircle2 size={15} /> No priority actions were generated from the fetched evidence.</p>}
      </div>
    </div>
  );
}
