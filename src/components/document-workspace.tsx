"use client";

import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, Clock3, Download, FileSpreadsheet, FileText, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { unwrapStructuredText } from "@/lib/text-format";
import { isCoreModule, ModuleIcon } from "./module-icon";

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

export function DocumentWorkspace({ document, onClose, onUpdate }: { document: WorkspaceDocument; onClose: () => void; onUpdate: (document: WorkspaceDocument) => void }) {
  const [tab, setTab] = useState<"document" | "pdf">("document");
  const [focused, setFocused] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const skills = provenance(document.skillProvenance);
  const metadata = documentMetadata(document.metadata);
  const execution = skillExecution(metadata.skillExecution);
  const cleanContent = useMemo(() => unwrapStructuredText(document.contentMarkdown), [document.contentMarkdown]);
  const preparedDemo = metadata.generationMode === "prepared-demo";
  const estimatedEditTokens = useMemo(() => Math.max(700, Math.ceil(((focused ? document.contentMarkdown.length : document.contentMarkdown.length * 2.4) + prompt.length) / 4)), [document.contentMarkdown, focused, prompt]);

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
          <a href={`/api/documents/${document.id}/export?format=docx`}><Download size={14} /> DOCX</a>
          <a className="spreadsheet-action" href={`/api/documents/${document.id}/export?format=xlsx`}><FileSpreadsheet size={14} /> XLSX</a>
          <a href={`/api/documents/${document.id}/export?format=html`}><Download size={14} /> HTML</a>
          <a href={`/api/documents/${document.id}/export?format=pdf`}><Download size={14} /> PDF</a>
          <button type="button" onClick={onClose} aria-label="Close document"><X size={17} /></button>
        </div>
      </header>
      <div className="document-tabs"><button className={tab === "document" ? "active" : ""} onClick={() => setTab("document")}>Document</button><button className={tab === "pdf" ? "active" : ""} onClick={() => setTab("pdf")}>PDF preview</button><span>DOCX · XLSX · HTML · PDF</span></div>
      <div className="document-body">
        {tab === "document" ? <><details className={`skill-receipt ${execution ? "verified" : preparedDemo ? "demo" : "legacy"}`} open><summary><span>{execution ? <ShieldCheck size={15} /> : <Clock3 size={15} />}{execution ? "Verified skill execution receipt" : preparedDemo ? "Prepared demo document" : "Skill execution receipt unavailable"}</span><small>{execution ? `${execution.steps.length} files executed` : `${skills.length} skills mapped`}</small></summary>{execution ? <div className="skill-receipt-body"><div className="receipt-facts"><span><strong>Provider</strong>{providerLabel(execution.provider)}</span><span><strong>Model</strong>{execution.model}</span><span><strong>Executed</strong>{formatTimestamp(execution.executedAt)}</span><span><strong>Status</strong><em><CheckCircle2 size={11} /> Complete</em></span></div><ol>{execution.steps.map((step) => <li key={`${step.step}-${step.repository}-${step.skill}`}><span>{step.step}</span><div><strong>{step.repository}/{step.skill}</strong><small>{step.phase} · {step.reason}</small><code>{step.source} · sha256:{step.digest.slice(0, 12)} · {formatNumber(step.charactersProvided)} chars</code>{step.references.length > 0 && <small>References: {step.references.join(", ")}</small>}</div></li>)}</ol></div> : <div className="skill-receipt-note"><strong>{preparedDemo ? "This is sample content, not a live provider result." : "The ordered skill plan is stored, but this older document predates execution receipts."}</strong><p>{preparedDemo ? "Connect a real API provider and run a new audit to generate a report with file-level hashes and execution metadata." : "Regenerate the document to create a verifiable receipt."}</p></div>}</details><div className="spreadsheet-callout"><FileSpreadsheet size={17} /><div><strong>Spreadsheet-ready</strong><span>Download an editable XLSX with an overview, module sheets, filterable tables, and source register.</span></div><a href={`/api/documents/${document.id}/export?format=xlsx`}>Generate XLSX</a></div><article className="document-page"><div className="document-kicker">THE SMARKETERS / AI CMO REPORT</div><ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent}</ReactMarkdown><footer><span>Smark Connect</span><span>Professionally formatted on export</span></footer></article></> : <iframe title={`${document.title} PDF preview`} key={`${document.id}-${document.version}`} src={`/api/documents/${document.id}/export?format=pdf&preview=1`} />}
      </div>
      <aside className="document-editor">
        <div className="skill-provenance"><span>Ordered skill chain</span><div>{skills.map((skill, index) => <em key={`${skill.repository}-${skill.skill}`} title={skill.reason}>{index + 1}. {skill.skill}</em>)}</div></div>
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
