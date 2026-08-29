"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Gauge, RotateCcw, ShieldCheck } from "lucide-react";
import type { LighthouseReport, LighthouseStrategy } from "@/lib/lighthouse/types";

type JobStatus = "idle" | "queued" | "running" | "completed" | "failed";
type JobResponse = {
  jobId: string;
  status: Exclude<JobStatus, "idle">;
  cached?: boolean;
  duplicate?: boolean;
  result?: LighthouseReport | null;
  error?: string | null;
  code?: string | null;
  completedAt?: string | null;
};

function scoreClass(score: number | null) {
  return score === null ? "muted" : score >= 90 ? "good" : score >= 50 ? "warn" : "bad";
}

function formatMetric(value: number | null, kind: "ms" | "bytes" | "count" | "cls") {
  if (value === null) return "—";
  if (kind === "count") return Math.round(value).toLocaleString();
  if (kind === "cls") return value.toFixed(3);
  if (kind === "bytes") return value < 1024 ? `${Math.round(value)} B` : value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.round(value / 1024)} KB`;
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
}

const userFacingErrors: Record<string, string> = {
  INVALID_URL: "Enter a valid public HTTP or HTTPS website URL.",
  PRIVATE_URL: "Private, local, and internal network addresses cannot be audited.",
  UNREACHABLE: "The website could not be reached from the audit server.",
  TIMEOUT: "The website did not finish within the 180-second audit limit.",
  BROWSER_FAILURE: "The audit browser stopped unexpectedly. You can safely retry.",
  UNSUPPORTED_WEBSITE: "This website could not be audited because its response or redirects are unsupported.",
  SERVER_OVERLOAD: "The single audit worker is at capacity. Try again shortly.",
  RATE_LIMITED: "The hourly Lighthouse audit limit has been reached.",
};

function AuditSkeleton({ status }: { status: "queued" | "running" }) {
  return <div className="lighthouse-progress" role="status" aria-live="polite">
    <div className="lighthouse-progress-copy"><span>{status === "queued" ? "Queued behind the current audit" : "Running Lighthouse in an isolated browser"}</span><strong>{status === "queued" ? "Waiting for the audit worker…" : "Measuring page load, accessibility, SEO, and best practices…"}</strong></div>
    <div className="audit-progress-rail"><span className={status} /></div>
    <div className="audit-result-skeleton" aria-hidden="true"><i /><i /><i /><i /><b /><b /><b /><b /></div>
  </div>;
}

export function LighthouseReportView({ report, cacheHit, busy = false, onRunFresh }: { report: LighthouseReport; cacheHit: boolean; busy?: boolean; onRunFresh?: () => void }) {
  const metrics = [
    ["FCP", report.metrics.firstContentfulPaint.value, "ms"],
    ["LCP", report.metrics.largestContentfulPaint.value, "ms"],
    ["CLS", report.metrics.cumulativeLayoutShift.value, "cls"],
    ["TBT", report.metrics.totalBlockingTime.value, "ms"],
    ["Speed Index", report.metrics.speedIndex.value, "ms"],
    ["Interactive", report.metrics.timeToInteractive.value, "ms"],
    ["Page size", report.metrics.totalPageSize.value, "bytes"],
    ["Requests", report.metrics.requestCount.value, "count"],
  ] as const;
  const scores = [
    ["Performance", report.scores.performance],
    ["Accessibility", report.scores.accessibility],
    ["SEO", report.scores.seo],
    ["Best practices", report.scores.bestPractices],
  ] as const;

  return <div className="lighthouse-report">
    <div className="lighthouse-success" role="status"><CheckCircle2 size={15} /><span><strong>Report ready</strong><small>{cacheHit ? "Reused from the 24-hour cache" : `Completed ${new Date(report.fetchedAt).toLocaleString("en-IN")}`}</small></span><button type="button" onClick={onRunFresh} disabled={busy}><RotateCcw size={12} /> Run fresh</button></div>
    <div className="lighthouse-scores">{scores.map(([label, score]) => <div className={scoreClass(score)} key={label}><strong>{score ?? "—"}<small>{score === null ? "" : "%"}</small></strong><span>{label}</span></div>)}</div>
    <div className="lighthouse-metrics">{metrics.map(([label, value, kind]) => <div key={label}><span>{label}</span><strong>{formatMetric(value, kind)}</strong></div>)}</div>
    <details className="lighthouse-findings" open><summary>Top opportunities <span>{report.opportunities.length}</span></summary>{report.opportunities.length ? <ol>{report.opportunities.map((item) => <li key={item.id}><strong>{item.title}</strong><small>{item.displayValue ?? (item.savingsMs ? `Potential savings ${formatMetric(item.savingsMs, "ms")}` : "Review in the audit details")}</small></li>)}</ol> : <p>No scored performance opportunities were returned.</p>}</details>
    <div className="lighthouse-audit-groups"><details><summary>Failed audits <span>{report.failedAudits.length}</span></summary><ul>{report.failedAudits.map((item) => <li key={item.id}>{item.title}</li>)}</ul></details><details><summary>Passed audits <span>{report.passedAudits.length}</span></summary><ul>{report.passedAudits.map((item) => <li key={item.id}>{item.title}</li>)}</ul></details></div>
    {report.warnings.length > 0 && <details className="lighthouse-warnings"><summary><AlertTriangle size={12} /> Diagnostic warnings <span>{report.warnings.length}</span></summary><ul>{report.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
    <div className="lighthouse-report-meta"><ShieldCheck size={12} /><span>Lighthouse {report.lighthouseVersion} · {report.strategy} · lab test, not field data</span><a href={report.finalUrl} target="_blank" rel="noreferrer">Open tested page <ExternalLink size={10} /></a></div>
  </div>;
}

export function LighthouseAuditPanel({ defaultUrl }: { defaultUrl: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [strategy, setStrategy] = useState<LighthouseStrategy>("mobile");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState("");
  const [report, setReport] = useState<LighthouseReport | null>(null);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [cacheHit, setCacheHit] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function poll(nextJobId: string) {
    while (mounted.current) {
      const response = await fetch(`/api/lighthouse/audit/${nextJobId}`, { cache: "no-store" });
      const data = await response.json() as JobResponse;
      if (!response.ok) throw new Error(data.error ?? "The audit status could not be loaded.");
      if (!mounted.current) return;
      setStatus(data.status);
      setCacheHit(Boolean(data.cached));
      if (data.status === "completed" && data.result) { setReport(data.result); return; }
      if (data.status === "failed") {
        setErrorCode(data.code ?? "AUDIT_FAILED");
        setError(userFacingErrors[data.code ?? ""] ?? data.error ?? "Lighthouse could not complete this audit.");
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2500));
    }
  }

  async function startAudit(fresh = false) {
    if (status === "queued" || status === "running") return;
    setStatus("queued");
    setError("");
    setErrorCode("");
    if (fresh) setReport(null);
    try {
      const response = await fetch("/api/lighthouse/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, strategy, fresh }) });
      const data = await response.json() as JobResponse;
      if (!response.ok || !data.jobId) {
        const message = userFacingErrors[data.code ?? ""] ?? data.error ?? "The Lighthouse audit could not start.";
        const requestError = new Error(message) as Error & { code?: string };
        requestError.code = data.code ?? undefined;
        throw requestError;
      }
      setJobId(data.jobId);
      setCacheHit(Boolean(data.cached));
      await poll(data.jobId);
    } catch (cause) {
      if (!mounted.current) return;
      const code = cause instanceof Error && "code" in cause ? String((cause as Error & { code?: string }).code ?? "") : "";
      setStatus("failed");
      setErrorCode(code);
      setError(cause instanceof Error ? cause.message : "The Lighthouse audit could not start.");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void startAudit(false);
  }

  const busy = status === "queued" || status === "running";
  return <section className="lighthouse-panel" aria-labelledby="lighthouse-heading">
    <div className="lighthouse-heading"><span><Gauge size={17} /></span><div><strong id="lighthouse-heading">Self-hosted Lighthouse audit</strong><small>Browser-based lab estimates—no client-site changes or Google API required</small></div></div>
    <form onSubmit={submit} className="lighthouse-form">
      <label htmlFor="lighthouse-url">Public website URL</label>
      <input id="lighthouse-url" type="url" maxLength={2048} required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" disabled={busy} />
      <div><div className="lighthouse-strategy" aria-label="Audit strategy">{(["mobile", "desktop"] as const).map((item) => <button type="button" className={strategy === item ? "active" : ""} onClick={() => setStrategy(item)} disabled={busy} key={item}>{item.slice(0, 1).toUpperCase() + item.slice(1)}</button>)}</div><button className="lighthouse-run" type="submit" disabled={busy}>{busy ? "Audit in progress" : "Run Lighthouse audit"}</button></div>
    </form>

    {busy && <AuditSkeleton status={status} />}
    {status === "failed" && <div className="lighthouse-error" role="alert"><AlertTriangle size={17} /><div><strong>Audit not completed</strong><span>{error}</span>{errorCode && <small>Error code: {errorCode}</small>}</div><button type="button" onClick={() => void startAudit(true)}><RotateCcw size={12} /> Try again</button></div>}
    {status === "completed" && report && <LighthouseReportView report={report} cacheHit={cacheHit} busy={busy} onRunFresh={() => void startAudit(true)} />}
    {jobId && status !== "completed" && <span className="sr-only">Audit job {jobId}</span>}
  </section>;
}
