"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, Clock3, Download, FileSpreadsheet, FileText, Presentation, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { unwrapStructuredText } from "@/lib/text-format";
import { formatSkillName } from "@/lib/skills/format";
import { resolveArtifactManifest } from "@/lib/artifacts/config";
import { isCoreModule, ModuleIcon } from "./module-icon";
import { PresentationPreview } from "./presentation-preview";

export type WorkspaceDocument = {
  id: string;
  title: string;
  type: string;
  contentMarkdown: string;
  metadata: unknown;
  skillProvenance: unknown;
  tokenEstimate: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

function provenance(value: unknown): Array<{ repository: string; skill: string; phase?: string; reason?: string }> {
  return Array.isArray(value) ? value.filter((item): item is { repository: string; skill: string; phase?: string; reason?: string } => Boolean(item && typeof item === "object" && "repository" in item && "skill" in item)) : [];
}

type ExecutionStep = { step: number; repository: string; skill: string; phase: string; reason: string; source: string; digest: string; charactersProvided: number; references: string[] };
type SkillExecution = { status: "verified"; executedAt: string; provider: string; model: string; steps: ExecutionStep[] };

function documentMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function skillExecution(value: unknown): SkillExecution | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<SkillExecution>;
  return candidate.status === "verified" && typeof candidate.executedAt === "string" && typeof candidate.provider === "string" && typeof candidate.model === "string" && Array.isArray(candidate.steps) ? candidate as SkillExecution : null;
}

function providerLabel(provider: string) {
  return ({ anthropic: "Anthropic", openai: "OpenAI", openrouter: "OpenRouter", google: "Google Gemini" } as Record<string, string>)[provider] ?? provider;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

const REPORT_STAGES = ["Collecting evidence", "Building executive summary", "Mapping findings", "Generating visualizations", "Building recommendations", "Rendering report", "Final quality check"];

function ReportPreviewSkeleton() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStage((current) => Math.min(current + 1, REPORT_STAGES.length - 1)), 850);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="report-preview-loading" role="status" aria-live="polite" aria-label="Preparing your report">
    <div className="report-loading-message"><Sparkles size={15} /><span><strong>{REPORT_STAGES[stage]}…</strong><small>Constructing the analytical report and checking every rendered page.</small></span><em>{stage + 1}/{REPORT_STAGES.length}</em></div>
    <div className="report-stage-track" aria-hidden="true">{REPORT_STAGES.map((label, index) => <span className={index < stage ? "done" : index === stage ? "active" : ""} key={label}>{label}</span>)}</div>
    <article className="report-skeleton-page" aria-hidden="true">
      <header><i className="skeleton-kicker" /><i className="skeleton-title" /><i className="skeleton-title short" /></header>
      <section className="skeleton-company"><i /><div><b /><b /><b /></div></section>
      <section className="skeleton-context"><i /><b /><b /></section>
      <section className="skeleton-metrics"><span /><span /><span /><span /></section>
      <section className="skeleton-agent-grid"><div><i /><b /><b /></div><div><i /><b /><b /></div></section>
      <section className="skeleton-skill-grid"><span /><span /><span /></section>
      <section className="skeleton-visuals"><div className="skeleton-chart"><i /><i /><i /><i /></div><div className="skeleton-recommendations"><b /><b /><b /><b /></div></section>
    </article>
  </div>;
}

export function DocumentWorkspace({ document, onClose, onUpdate }: { document: WorkspaceDocument; onClose: () => void; onUpdate: (document: WorkspaceDocument) => void }) {
  const [tab, setTab] = useState<"document" | "deck" | "pdf">("document");
  const [slideIndex, setSlideIndex] = useState(0);
  const [focused, setFocused] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pdfError, setPdfError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const pdfUrlRef = useRef("");
  const skills = provenance(document.skillProvenance);
  const metadata = documentMetadata(document.metadata);
  const execution = skillExecution(metadata.skillExecution);
  const cleanContent = useMemo(() => unwrapStructuredText(document.contentMarkdown), [document.contentMarkdown]);
  const artifactManifest = resolveArtifactManifest({ reportType: document.type, markdown: document.contentMarkdown, metadata });
  const xlsxEnabled = artifactManifest.decisions.xlsx.enabled;
  const preparedDemo = metadata.generationMode === "prepared-demo";
  const estimatedEditTokens = useMemo(() => Math.max(700, Math.ceil(((focused ? document.contentMarkdown.length : document.contentMarkdown.length * 2.4) + prompt.length) / 4)), [document.contentMarkdown, focused, prompt]);

  useEffect(() => () => { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current); }, []);

  async function generatePdf(download = false) {
    if (pdfState === "loading") return;
    setPdfState("loading");
    setPdfError("");
    try {
      const response = await fetch(`/api/documents/${document.id}/export?format=pdf&preview=1`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "The PDF could not be generated.");
      }
      const blob = await response.blob();
      if (blob.type !== "application/pdf" && !blob.type.includes("pdf")) throw new Error("The report service returned an invalid PDF response.");
      const nextUrl = URL.createObjectURL(blob);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = nextUrl;
      setPdfUrl(nextUrl);
      setPdfState("ready");
      if (download) {
        const link = window.document.createElement("a");
        link.href = nextUrl;
        link.download = `${document.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "report"}.pdf`;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (cause) {
      setPdfState("error");
      setPdfError(cause instanceof Error ? cause.message : "The PDF could not be generated.");
    }
  }

  function openPdfPreview() {
    setTab("pdf");
    if (pdfState === "idle" || pdfState === "error") void generatePdf(false);
  }

  async function editDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || prompt.trim().length < 3) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, focused }) });
      const data = await response.json() as { document?: WorkspaceDocument; error?: string };
      if (!response.ok || !data.document) throw new Error(data.error ?? "The document could not be edited.");
      onUpdate(data.document);
      setPrompt("");
      setTab("document");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The document could not be edited.");
    } finally {
      setPending(false);
    }
  }

  return <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="document-drawer" role="dialog" aria-modal="true" aria-label={document.title}>
      <header className="document-toolbar">
        <div className="document-title"><span className="document-icon">{isCoreModule(document.type) ? <ModuleIcon type={document.type} size={16} /> : <FileText size={16} />}</span><span><strong>{document.title}</strong><small>Version {document.version} · {formatNumber(document.tokenEstimate)} tokens on last generation</small></span>{execution ? <em className="execution-badge verified"><ShieldCheck size={12} /> Verified skill run</em> : preparedDemo ? <em className="execution-badge demo">Prepared demo</em> : <em className="execution-badge legacy">Skill plan recorded</em>}</div>
        <div className="document-actions">
          <a href={`/api/documents/${document.id}/export?format=pptx`}><Presentation size={14} /> PPTX</a>
          {xlsxEnabled && <a className="spreadsheet-action" href={`/api/documents/${document.id}/export?format=xlsx`}><FileSpreadsheet size={14} /> XLSX</a>}
          <button className="generate-pdf-action" type="button" disabled={pdfState === "loading"} onClick={() => void generatePdf(true)}><Download size={14} /> {pdfState === "loading" ? "Preparing PDF" : "Generate PDF"}</button>
          <button type="button" onClick={onClose} aria-label="Close document"><X size={17} /></button>
        </div>
      </header>
      <div className="document-tabs"><button className={tab === "document" ? "active" : ""} onClick={() => setTab("document")}>Document</button><button className={tab === "deck" ? "active" : ""} onClick={() => setTab("deck")}>Deck preview</button><button className={tab === "pdf" ? "active" : ""} onClick={openPdfPreview}>PDF preview</button><span>PDF · PPTX{xlsxEnabled ? " · XLSX" : ""}</span></div>
      <div className="document-body">
        {tab === "document" ? <><div className="artifact-route"><div><strong>Artifact route</strong><span>{artifactManifest.theme.replace(/-/g, " ")} · {artifactManifest.primaryArtifact.toUpperCase()} primary</span></div>{(["pdf", "pptx", "xlsx"] as const).map((format) => <em className={artifactManifest.decisions[format].enabled ? "enabled" : "disabled"} title={artifactManifest.decisions[format].reason} key={format}>{format.toUpperCase()}<small>{artifactManifest.decisions[format].enabled ? artifactManifest.decisions[format].requirement : "not needed"}</small></em>)}</div><details className={`skill-receipt ${execution ? "verified" : preparedDemo ? "demo" : "legacy"}`} open><summary><span>{execution ? <ShieldCheck size={15} /> : <Clock3 size={15} />}{execution ? "Verified skill execution receipt" : preparedDemo ? "Prepared demo document" : "Skill execution receipt unavailable"}</span><small>{execution ? `${execution.steps.length} files executed` : `${skills.length} skills mapped`}</small></summary>{execution ? <div className="skill-receipt-body"><div className="receipt-facts"><span><strong>Provider</strong>{providerLabel(execution.provider)}</span><span><strong>Model</strong>{execution.model}</span><span><strong>Executed</strong>{formatTimestamp(execution.executedAt)}</span><span><strong>Status</strong><em><CheckCircle2 size={11} /> Complete</em></span></div><ol>{execution.steps.map((step) => <li key={`${step.step}-${step.repository}-${step.skill}`}><span>{step.step}</span><div><strong>{formatSkillName(step.skill)}</strong><small>{step.phase} · {step.reason}</small><code>{step.repository} · {step.source} · sha256:{step.digest.slice(0, 12)} · {formatNumber(step.charactersProvided)} chars</code>{step.references.length > 0 && <small>References: {step.references.join(", ")}</small>}</div></li>)}</ol></div> : <div className="skill-receipt-note"><strong>{preparedDemo ? "This is sample content, not a live provider result." : "The ordered skill plan is stored, but this older document predates execution receipts."}</strong><p>{preparedDemo ? "Connect a real API provider and run a new audit to generate a report with file-level hashes and execution metadata." : "Regenerate the document to create a verifiable receipt."}</p></div>}</details>{xlsxEnabled && <div className="spreadsheet-callout"><FileSpreadsheet size={17} /><div><strong>Operational workbook included</strong><span>Work with filterable tables, recommendation IDs, owners, status, formulas, source links, and lineage.</span></div><a href={`/api/documents/${document.id}/export?format=xlsx`}>Generate XLSX</a></div>}<article className="document-page"><div className="document-kicker">THE SMARKETERS / AI CMO REPORT</div><ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent}</ReactMarkdown><footer><span>Smark Connect</span><span>Professionally formatted on export</span></footer></article></> : tab === "deck" ? <PresentationPreview title={document.title} markdown={cleanContent} theme={artifactManifest.theme} slideIndex={slideIndex} onSlideChange={setSlideIndex} downloadHref={`/api/documents/${document.id}/export?format=pptx`} /> : <div className="pdf-preview-stage">{pdfState === "loading" && <ReportPreviewSkeleton />}{pdfState === "error" && <div className="pdf-preview-error" role="alert"><strong>We couldn’t prepare this PDF.</strong><p>{pdfError}</p><button type="button" onClick={() => void generatePdf(false)}>Try again</button></div>}{pdfState === "ready" && pdfUrl && <><div className="pdf-preview-success" role="status"><CheckCircle2 size={14} /><span>Your PDF is ready to preview and download.</span></div><iframe title={`${document.title} PDF preview`} key={`${document.id}-${document.version}-${pdfUrl}`} src={pdfUrl} /></>}{pdfState === "idle" && <ReportPreviewSkeleton />}</div>}
      </div>
      <aside className="document-editor">
        <div className="skill-provenance"><span>Ordered skill chain</span><div>{skills.map((skill, index) => <em key={`${skill.repository}-${skill.skill}`} title={skill.reason}>{index + 1}. {formatSkillName(skill.skill)}</em>)}</div></div>
        <form onSubmit={editDocument}>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask Smark Connect to strengthen a section, add evidence, change tone, or restructure this report…" rows={3} />
          <div className="editor-controls">
            <label className="focused-toggle" title="Sends only this document and the requested change to reduce token use"><input type="checkbox" checked={focused} onChange={(event) => setFocused(event.target.checked)} /><span /><strong>Focused edit</strong><small>~{formatNumber(estimatedEditTokens)} tokens</small></label>
            <button type="submit" disabled={pending || prompt.trim().length < 3}>{pending ? <RefreshCw className="spin" size={14} /> : <Sparkles size={14} />}{pending ? "Editing…" : "Apply edit"}</button>
          </div>
          {!focused && <p className="regenerate-warning">Full regeneration includes stored website evidence and uses more tokens.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      </aside>
    </section>
  </div>;
}
