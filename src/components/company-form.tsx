"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CompanyForm({ additional = false }: { additional?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [requiresProvider, setRequiresProvider] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setRequiresProvider(false);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName: form.get("companyName"), websiteUrl: form.get("websiteUrl") }) });
      const data = await response.json() as { error?: string; jobId?: string; requiresProvider?: boolean };
      setRequiresProvider(Boolean(data.requiresProvider));
      if (!response.ok || !data.jobId) throw new Error(data.error ?? "The company could not be added.");
      router.push(`/onboarding/audit/${data.jobId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The company could not be added.");
      setPending(false);
    }
  }

  return (
    <div className="form-card">
      <p className="eyebrow">{additional ? "NEW COMPANY WORKSPACE" : "COMPANY FOUNDATION"}</p>
      <h2>{additional ? "Add another company" : "Where should we start?"}</h2>
      <p className="form-intro">Add the company website. Smark Connect will crawl its public pages and run six evidence-led marketing analyses in parallel.</p>
      <form onSubmit={submit}>
        <label htmlFor="company-name">Company name</label>
        <input id="company-name" name="companyName" placeholder="Acme, Inc." autoComplete="organization" required minLength={2} />
        <label htmlFor="website-url">Company website</label>
        <div className="url-field"><span aria-hidden="true">↗</span><input id="website-url" name="websiteUrl" type="text" inputMode="url" placeholder="https://yourcompany.com" autoComplete="url" required /></div>
        <div className="audit-preview"><div><span>01</span><p><strong>Crawl</strong><small>Key pages and site copy</small></p></div><div><span>02</span><p><strong>Understand</strong><small>Offer, audience, positioning</small></p></div><div><span>03</span><p><strong>Audit</strong><small>SEO and PageSpeed signals</small></p></div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {requiresProvider && <Link className="provider-action" href="/settings/credits">Connect provider →</Link>}
        <button className="primary-button" type="submit" disabled={pending}>{pending ? "Starting secure audit…" : additional ? "Add and analyze company" : "Analyze my company"}<span>→</span></button>
        <p className="submit-note">Usually takes 1–3 minutes. Progress is saved if you leave this page.</p>
      </form>
    </div>
  );
}
