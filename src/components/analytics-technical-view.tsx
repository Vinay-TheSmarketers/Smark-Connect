"use client";

import { useState } from "react";
import {
  Code,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { LighthouseAuditPanel } from "./lighthouse-audit-panel";
import { inspectSchemaMarkup, type SchemaInspectionResult } from "@/lib/seo/schema-inspector";

interface AnalyticsTechnicalViewProps {
  company: {
    name: string;
    websiteUrl: string;
    description?: string | null;
    logoUrl?: string | null;
    category?: string | null;
  };
  crawlPages?: Array<{ url: string; content: string }>;
  pagesRead: number;
}

export function AnalyticsTechnicalView({ company, crawlPages = [], pagesRead }: AnalyticsTechnicalViewProps) {
  const [activeTab, setActiveTab] = useState<"lighthouse" | "schema">("lighthouse");
  const [selectedSnippet, setSelectedSnippet] = useState<string>("Organization");
  const [copied, setCopied] = useState(false);

  const schemaResult: SchemaInspectionResult = inspectSchemaMarkup(company, crawlPages);

  function copySnippetCode() {
    const code = schemaResult.generatedSnippets[selectedSnippet] ?? "";
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="analytics-technical-container">
      {/* Tab Switcher */}
      <div className="tech-sub-tabs mb-3 flex gap-1 p-1 bg-slate-900/60 rounded-lg border border-white/5">
        <button
          type="button"
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition ${activeTab === "lighthouse" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
          onClick={() => setActiveTab("lighthouse")}
        >
          Lighthouse &amp; Core Web Vitals
        </button>
        <button
          type="button"
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition flex items-center justify-center gap-1.5 ${activeTab === "schema" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
          onClick={() => setActiveTab("schema")}
        >
          <Code size={13} /> Schema.org Markup ({schemaResult.detectedSchemas.length})
        </button>
      </div>

      {activeTab === "lighthouse" && (
        <>
          <LighthouseAuditPanel defaultUrl={company.websiteUrl} />
          <div className="evidence-note mt-3">
            <strong>{pagesRead} crawl pages inspected</strong>
            <p>
              The full technical diagnosis is stored in the SEO Audit and Technical SEO agent feed.
              Field Core Web Vitals remain separate from lab estimates.
            </p>
          </div>
        </>
      )}

      {activeTab === "schema" && (
        <div className="schema-inspector-view space-y-3">
          {/* Top Score Banner */}
          <div className="source-banner aeo-banner">
            <div>
              <Sparkles size={18} />
              <span>
                <strong>Schema.org Structured Data Inspector</strong>
                <small>{schemaResult.detectedSchemas.length} JSON-LD blocks detected across crawl pages</small>
              </span>
            </div>
            <span className="source-status evidence-badge">Score {schemaResult.score}/100</span>
          </div>

          {/* Detected Schemas */}
          <div className="schema-card p-3 rounded-lg bg-slate-900/40 border border-white/5">
            <div className="card-section-head mb-2 flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Detected On-Page Schemas
              </span>
              <span className="text-[10px] text-slate-400">
                {schemaResult.detectedSchemas.filter((s) => s.isValid).length} Valid
              </span>
            </div>

            {schemaResult.detectedSchemas.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center">
                <FileCode size={20} className="mx-auto mb-1 text-slate-500" />
                No JSON-LD structured data detected on crawled pages.
              </div>
            ) : (
              <div className="space-y-1.5">
                {schemaResult.detectedSchemas.map((schema, idx) => (
                  <div key={`${schema.type}-${idx}`} className="flex items-center justify-between p-2 rounded bg-white/[0.03] border border-white/[0.03]">
                    <div className="flex items-center gap-2">
                      {schema.isValid ? (
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      )}
                      <div>
                        <strong className="text-xs text-white block">{schema.type}</strong>
                        {schema.issues.length > 0 && (
                          <small className="text-[10px] text-amber-300 block">{schema.issues.join(", ")}</small>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                      {(() => { try { return new URL(schema.sourceUrl).pathname || "/"; } catch { return schema.sourceUrl || "/"; } })()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1-Click JSON-LD Generator */}
          <div className="schema-generator-card p-3 rounded-lg bg-slate-900/40 border border-white/5">
            <div className="card-section-head mb-2 flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Zap size={13} className="text-amber-400" /> Recommended JSON-LD Snippets
              </span>
              <button
                type="button"
                className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                onClick={copySnippetCode}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy Code"}
              </button>
            </div>

            {/* Snippet Type Selector */}
            <div className="flex gap-1 mb-2">
              {Object.keys(schemaResult.generatedSnippets).map((snippetKey) => (
                <button
                  key={snippetKey}
                  type="button"
                  className={`text-[10px] px-2 py-1 rounded transition ${selectedSnippet === snippetKey ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-slate-400 hover:text-white"}`}
                  onClick={() => setSelectedSnippet(snippetKey)}
                >
                  {snippetKey}
                </button>
              ))}
            </div>

            {/* Code View */}
            <pre className="p-2.5 rounded bg-black/60 border border-white/5 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[160px] leading-relaxed">
              <code>{schemaResult.generatedSnippets[selectedSnippet]}</code>
            </pre>
          </div>

          <div className="evidence-note">
            <strong>Rich Result Standards</strong>
            <p>
              Generated schema follows Google&apos;s 2026 JSON-LD specification. Add these scripts inside your website&apos;s
              <code>&lt;head&gt;</code> tag to enable rich snippet displays in search engine results.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
