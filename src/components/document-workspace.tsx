"use client";

import { FormEvent, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Presentation,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { unwrapStructuredText } from "@/lib/text-format";
import { normalizeDocumentMarkdown } from "@/lib/documents/content";
import { prepareFrameworks, readFramework } from "@/lib/documents/frameworks";
import { FrameworkVisual } from "./framework-visual";
import { resolveArtifactManifest } from "@/lib/artifacts/config";
import { isCoreModule, ModuleIcon } from "./module-icon";
import { PresentationPreview } from "./presentation-preview";

export type WorkspaceDocument = {
  id: string;
  title: string;
  type: string;
  contentMarkdown: string;
  metadata: unknown;
  tokenEstimate: number;
  version: number;
  locked?: boolean;
  createdAt: string;
  updatedAt: string;
};

function documentMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function SinglePdfProgressBar() {
  return <div className="single-pdf-loader-container" role="status" aria-live="polite">
    <div className="single-pdf-loader-card"><RefreshCw className="spin" size={22} />
      <strong>Preparing your PDF</strong><p>Formatting the report and checking the exported pages. This can take a moment.</p>
    </div>
  </div>;
}
export function DocumentWorkspace({
  document,
  onClose,
  onUpdate,
}: {
  document: WorkspaceDocument;
  onClose: () => void;
  onUpdate: (document: WorkspaceDocument) => void;
}) {
  const [tab, setTab] = useState<"document" | "deck" | "pdf">("document");
  const [slideIndex, setSlideIndex] = useState(0);
  const [focused, setFocused] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"xlsx" | "pptx" | null>(null);
  const [exportError, setExportError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pdfError, setPdfError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const pdfUrlRef = useRef("");
  const metadata = documentMetadata(document.metadata);
  const cleanContent = useMemo(
    () => normalizeDocumentMarkdown(unwrapStructuredText(document.contentMarkdown)),
    [document.contentMarkdown]
  );
  const visualContent = useMemo(() => prepareFrameworks(cleanContent), [cleanContent]);
  const artifactManifest = resolveArtifactManifest({ reportType: document.type, markdown: document.contentMarkdown, metadata });
  const pdfEnabled = artifactManifest.decisions.pdf.enabled;
  const pptxEnabled = artifactManifest.decisions.pptx.enabled;
  const xlsxEnabled = artifactManifest.decisions.xlsx.enabled;
  const enabledFormats = (["pdf", "pptx", "xlsx"] as const)
    .filter((format) => artifactManifest.decisions[format].enabled)
    .map((format) => format.toUpperCase())
    .join(" · ");
  const estimatedEditTokens = useMemo(
    () =>
      Math.max(
        700,
        Math.ceil(((focused ? document.contentMarkdown.length : document.contentMarkdown.length * 2.4) + prompt.length) / 4)
      ),
    [document.contentMarkdown, focused, prompt]
  );

  useEffect(() => () => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
  }, []);

  async function generatePdf(download = false) {
    if (pdfState === "loading") return;
    setPdfState("loading");
    setPdfError("");

    try {
      const response = await fetch(`/api/documents/${document.id}/export?format=pdf&preview=1`, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "The PDF could not be generated.");
      }
      const blob = await response.blob();
      if (blob.type !== "application/pdf" && !blob.type.includes("pdf"))
        throw new Error("The report service returned an invalid PDF response.");
      const nextUrl = URL.createObjectURL(blob);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = nextUrl;
      setPdfUrl(nextUrl);

      setPdfState("ready");

      if (download) {
        const link = window.document.createElement("a");
        link.href = nextUrl;
        link.download = `${
          document.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "report"
        }.pdf`;
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

  async function downloadOffice(format: "xlsx" | "pptx") {
    if (exporting) return;
    setExporting(format);
    setExportError("");
    try {
      const response = await fetch(`/api/documents/${document.id}/export?format=${format}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `The ${format.toUpperCase()} could not be prepared.`);
      }
      const blob = await response.blob();
      const expected = format === "xlsx" ? "spreadsheetml.sheet" : "presentationml.presentation";
      if (!blob.type.includes(expected)) throw new Error("The download returned an unexpected file type. Please retry.");
      const downloadUrl = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = `${document.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "report"}.${format}`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : "The download could not be prepared.");
    } finally { setExporting(null); }
  }

  async function editDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || document.locked || prompt.trim().length < 3) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, focused }),
      });
      const data = (await response.json()) as { document?: WorkspaceDocument; error?: string };
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

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="document-drawer" role="dialog" aria-modal="true" aria-label={document.title}>
        <header className="document-toolbar">
          <div className="document-title">
            <span className="document-icon">
              {isCoreModule(document.type) ? <ModuleIcon type={document.type} size={16} /> : <FileText size={16} />}
            </span>
            <span>
              <strong>{document.title}</strong>
              <small>
                Version {document.version} · Updated {new Date(document.updatedAt).toLocaleDateString()}
              </small>
            </span>

          </div>
          <div className="document-actions">
            {pptxEnabled && (
              <button className="office-download" type="button" disabled={Boolean(exporting)} data-primary={artifactManifest.primaryArtifact === "pptx"} onClick={() => void downloadOffice("pptx")}>
                <Presentation size={14} /> {exporting === "pptx" ? "Preparing PPTX" : "PPTX"}
              </button>
            )}
            {xlsxEnabled && (
              <button type="button" disabled={Boolean(exporting)} data-primary={artifactManifest.primaryArtifact === "xlsx"} className="spreadsheet-action office-download" onClick={() => void downloadOffice("xlsx")}>
                <FileSpreadsheet size={14} /> {exporting === "xlsx" ? "Preparing XLSX" : "XLSX"}
              </button>
            )}
            {pdfEnabled && (
              <button
                className="generate-pdf-action"
                data-primary={artifactManifest.primaryArtifact === "pdf"}
                type="button"
                disabled={pdfState === "loading"}
                onClick={() => void generatePdf(true)}
              >
                <Download size={14} /> {pdfState === "loading" ? "Preparing PDF" : "Download PDF"}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close document">
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="document-tabs">
          <button className={tab === "document" ? "active" : ""} onClick={() => setTab("document")}>
            Document
          </button>
          {pptxEnabled && (
            <button className={tab === "deck" ? "active" : ""} onClick={() => setTab("deck")}>
              Deck preview
            </button>
          )}
          {pdfEnabled && (
            <button className={tab === "pdf" ? "active" : ""} onClick={openPdfPreview}>
              PDF preview
            </button>
          )}
          <span>{enabledFormats}</span>
        </div>

        <div className="document-body">
          {exportError && <p className="form-error" role="alert">{exportError}</p>}
          {pdfState === "error" && tab !== "pdf" && <p className="form-error" role="alert">{pdfError}</p>}
          {tab === "document" ? (
            <>
              <div className="artifact-route">
                <div>
                  <strong>Download options</strong>
                  <span>
                    {artifactManifest.primaryArtifact === "xlsx" ? "Excel workbook recommended for this working plan" : artifactManifest.primaryArtifact === "pptx" ? "Presentation recommended for this visual guide" : "PDF recommended for reading and sharing"}
                  </span>
                </div>
                {(["pdf", "pptx", "xlsx"] as const).filter((format) => artifactManifest.decisions[format].enabled).map((format) => (
                  <em
                    className="enabled"
                    title={artifactManifest.decisions[format].reason}
                    key={format}
                  >
                    {format.toUpperCase()}
                    <small>
                      {artifactManifest.primaryArtifact === format ? "Recommended" : "Also available"}
                    </small>
                  </em>
                ))}
              </div>



              {xlsxEnabled && (
                <div className="spreadsheet-callout">
                  <FileSpreadsheet size={17} />
                  <div>
                    <strong>{artifactManifest.primaryArtifact === "xlsx" ? "Your plan is an Excel workbook" : "Editable workbook available"}</strong>
                    <span>
                      Open the working tables, assign actions, track progress, and review the supporting sources.
                    </span>
                  </div>
                  <button type="button" disabled={Boolean(exporting)} onClick={() => void downloadOffice("xlsx")}>{exporting === "xlsx" ? "Preparing XLSX" : "Download XLSX"}</button>
                </div>
              )}

              <article className="document-page">
                <div className="document-kicker">THE SMARKETERS / AI CMO REPORT</div>
                <div className="markdown-render-flow">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre({ children }) {
                        if (isValidElement<{ className?: string; children?: unknown }>(children) && children.props.className === "language-framework") {
                          const framework = readFramework(String(children.props.children ?? ""));
                          if (framework) return <FrameworkVisual framework={framework} />;
                        }
                        return <pre>{children}</pre>;
                      },
                      table: ({ children }) => (
                        <div className="responsive-table-wrapper">
                          <table>{children}</table>
                        </div>
                      ),
                    }}
                  >
                    {visualContent}
                  </ReactMarkdown>
                </div>
                <footer>
                  <span>Smark Connect</span>
                  <span>Professionally formatted on export</span>
                </footer>
              </article>
            </>
          ) : tab === "deck" ? (
            <PresentationPreview
              title={document.title}
              markdown={cleanContent}
              theme={artifactManifest.theme}
              slideIndex={slideIndex}
              onSlideChange={setSlideIndex}
              downloadHref={`/api/documents/${document.id}/export?format=pptx`}
            />
          ) : (
            <div className="pdf-preview-stage">
              {(pdfState === "loading" || pdfState === "idle") && (
                <SinglePdfProgressBar />
              )}
              {pdfState === "error" && (
                <div className="pdf-preview-error" role="alert">
                  <strong>We couldn’t prepare this PDF.</strong>
                  <p>{pdfError}</p>
                  <button type="button" onClick={() => void generatePdf(false)}>
                    Try again
                  </button>
                </div>
              )}
              {pdfState === "ready" && pdfUrl && (
                <>
                  <div className="pdf-preview-success" role="status">
                    <CheckCircle2 size={14} />
                    <span>Your A4 Smarketers Executive PDF is ready to preview and download.</span>
                  </div>
                  <iframe
                    title={`${document.title} PDF preview`}
                    key={`${document.id}-${document.version}-${pdfUrl}`}
                    src={pdfUrl}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <aside className="document-editor">
          {document.locked ? (
            <div
              className="document-locked-banner"
              style={{
                padding: "16px",
                background: "var(--color-surface, #F9FAFB)",
                borderRadius: "8px",
                border: "1px solid var(--color-border, #E5E7EB)",
                textAlign: "center",
                margin: "12px 0",
              }}
            >
              <Lock size={20} style={{ margin: "0 auto 8px", color: "var(--color-primary, #7C3AED)" }} />
              <strong style={{ display: "block", fontSize: "12px" }}>This document is locked</strong>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#6B7280" }}>
                Click &ldquo;Locked&rdquo; in the toolbar above to unlock before applying new AI edits.
              </p>
            </div>
          ) : (
            <form onSubmit={editDocument}>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask Smark Connect to strengthen a section, add evidence, change tone, or restructure this report…"
                rows={3}
              />
              <div className="editor-controls">
                <label
                  className="focused-toggle"
                  title="Sends only this document and the requested change to reduce token use"
                >
                  <input type="checkbox" checked={focused} onChange={(event) => setFocused(event.target.checked)} />
                  <span />
                  <strong>Focused edit</strong>
                  <small>~{formatNumber(estimatedEditTokens)} tokens</small>
                </label>
                <button type="submit" disabled={pending || prompt.trim().length < 3}>
                  {pending ? <RefreshCw className="spin" size={14} /> : <Sparkles size={14} />}
                  {pending ? "Editing…" : "Apply edit"}
                </button>
              </div>
              {!focused && (
                <p className="regenerate-warning">
                  Full regeneration includes stored website evidence and uses more tokens.
                </p>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          )}
        </aside>
      </section>
    </div>
  );
}
