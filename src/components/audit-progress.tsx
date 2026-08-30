"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModuleIcon } from "./module-icon";

type JobState = { status: string; progress: number; step: string; error?: string | null; requiresProvider: boolean; requiresModelChange: boolean; companyId: string; companyName: string; pagesRead: number; agentsReady: number; documents: Array<{ type: string; title: string }> };

const documentPipeline = [
  ["COMPETITOR_ANALYSIS", "Competitor Landscape and Maps"],
  ["COMPANY_INTELLIGENCE", "Company Intelligence"],
  ["MARKETING_STRATEGY", "Strategic Intelligence Report"],
  ["SEO_AUDIT", "SEO Audit"],
  ["GEO_AUDIT", "GEO and AI Visibility"],
  ["AUDIENCE_ANALYSIS", "Audience Analysis"],
  ["CONTENT_AUDIT", "Content Audit and Strategy"],
  ["DESIGN_GUIDE", "Brand and Visual Design Guide"],
  ["CONTENT_STRATEGY", "Full-Funnel Content Strategy"],
  ["PRODUCT_INFO", "Offer and Product Intelligence"],
] as const;

const priorityDocumentTypes = ["COMPETITOR_ANALYSIS", "COMPANY_INTELLIGENCE"] as const;

export function AuditProgress({ jobId, initial }: { jobId: string; initial: JobState }) {
  const router = useRouter();
  const [job, setJob] = useState(initial);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (["DONE", "PARTIAL", "ERROR"].includes(job.status)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/audits/${jobId}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json() as JobState;
      setJob(next);
      const priorityReportsReady = priorityDocumentTypes.every((type) => next.documents.some((document) => document.type === type));
      if (["DONE", "PARTIAL"].includes(next.status) || priorityReportsReady) {
        window.clearInterval(timer);
        window.setTimeout(() => router.push(`/dashboard/${next.companyId}`), 900);
      }
    }, 1800);
    return () => window.clearInterval(timer);
  }, [job.status, jobId, router]);

  async function retry() {
    setRetrying(true);
    const response = await fetch(`/api/audits/${jobId}`, { method: "POST" });
    const data = await response.json() as { jobId?: string; error?: string; requiresProvider?: boolean; requiresModelChange?: boolean };
    if (response.ok && data.jobId) router.replace(`/onboarding/audit/${data.jobId}`);
    else setJob((current) => ({ ...current, error: data.error ?? "Retry failed.", requiresProvider: Boolean(data.requiresProvider) || current.requiresProvider, requiresModelChange: Boolean(data.requiresModelChange) || current.requiresModelChange }));
    setRetrying(false);
  }

  const finished = ["DONE", "PARTIAL"].includes(job.status);
  const providerError = job.requiresProvider;
  const modelError = job.requiresModelChange;
  const nextDocumentType = documentPipeline.find(([type]) => !job.documents.some((document) => document.type === type))?.[0];
  const errorMessage = modelError
    ? "The saved OpenRouter model cannot produce the long structured responses required by the skill-backed audit. Choose and verify another model, then retry using the saved website evidence."
    : providerError
    ? "Connect and verify a live AI provider to generate this company’s skill-backed documents."
    : job.error;
  return (
    <div className="form-card audit-progress-card">
      <p className="eyebrow">LIVE COMPANY AUDIT</p>
      <h2>{job.status === "ERROR" ? modelError ? "Choose a different OpenRouter model." : providerError ? "Connect your AI provider." : "We hit a snag." : finished ? "Your workspace is ready." : `Learning ${job.companyName}.`}</h2>
      <p className="form-intro">{job.status === "ERROR" ? errorMessage : finished ? "Opening the dashboard with your company intelligence and first recommendations." : job.step}</p>
      <div className="progress-orbit" style={{ "--progress": `${job.progress * 3.6}deg` } as React.CSSProperties}><div><strong>{job.progress}%</strong><span>{job.pagesRead} pages read</span></div></div>
      <div className="progress-track"><span style={{ width: `${job.progress}%` }} /></div>
      <div className="audit-checks"><div className={job.progress >= 8 ? "done" : ""}><span>01</span>Website safety check</div><div className={job.progress >= 28 ? "done" : ""}><span>02</span>Research crawl</div><div className={priorityDocumentTypes.every((type) => job.documents.some((document) => document.type === type)) ? "done" : ""}><span>03</span>Priority intelligence ready</div><div className={job.documents.length >= documentPipeline.length ? "done" : ""}><span>04</span>Background report queue</div></div>
      <div className="document-pipeline"><div className="pipeline-heading"><strong>Sequential background report queue</strong><span>{job.documents.length}/{documentPipeline.length} ready</span></div>{documentPipeline.map(([type, label]) => { const ready = job.documents.some((document) => document.type === type); const running = !ready && type === nextDocumentType && job.progress >= 34 && job.status === "RUNNING"; return <div className={ready ? "ready" : running ? "running" : "queued"} key={type}><ModuleIcon type={type} size={15} /><strong>{label}</strong><small>{ready ? "Ready" : running ? "Generating" : "Queued"}</small><span>{ready ? "✓" : running ? "●" : "○"}</span></div>; })}</div>
      <div className="research-coverage"><span><strong>{job.pagesRead}</strong> pages read</span><span><strong>{job.agentsReady}</strong> agent results stored</span></div>
      {job.status === "ERROR" && (modelError
        ? <Link className="primary-button" href={`/settings/credits?reason=model&returnTo=${encodeURIComponent(`/onboarding/audit/${jobId}`)}`}>Change OpenRouter model<span>→</span></Link>
        : providerError
        ? <Link className="primary-button" href="/settings/credits">Connect provider<span>→</span></Link>
        : <button className="primary-button" type="button" disabled={retrying} onClick={retry}>{retrying ? "Restarting…" : "Retry audit"}<span>↻</span></button>)}
      {!finished && job.status !== "ERROR" && <p className="submit-note">The workspace opens after the first two reports. The remaining queue continues on the server if you refresh or leave.</p>}
    </div>
  );
}
