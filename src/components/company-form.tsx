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
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10 backdrop-blur-xl shadow-2xl text-slate-100">
      <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
        {additional ? "NEW COMPANY WORKSPACE" : "COMPANY FOUNDATION"}
      </span>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {additional ? "Add another company" : "Where should we start?"}
      </h2>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Add the company website. Smark Connect will crawl its public pages and run six evidence-led marketing analyses in parallel.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="company-name" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Company name
          </label>
          <input
            id="company-name"
            name="companyName"
            placeholder="Acme, Inc."
            autoComplete="organization"
            required
            minLength={2}
            className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        <div>
          <label htmlFor="website-url" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Company website
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400" aria-hidden="true">
              &nearr;
            </span>
            <input
              id="website-url"
              name="websiteUrl"
              type="text"
              inputMode="url"
              placeholder="https://yourcompany.com"
              autoComplete="url"
              required
              className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.05] pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
          <div className="rounded-lg bg-white/5 p-2.5">
            <span className="text-purple-400 font-bold text-[10px]">01</span>
            <strong className="block text-[11px] text-white mt-1">Crawl</strong>
            <small className="block text-[10px] text-slate-400">Pages & copy</small>
          </div>
          <div className="rounded-lg bg-white/5 p-2.5">
            <span className="text-purple-400 font-bold text-[10px]">02</span>
            <strong className="block text-[11px] text-white mt-1">Understand</strong>
            <small className="block text-[10px] text-slate-400">Offer & ICPs</small>
          </div>
          <div className="rounded-lg bg-white/5 p-2.5">
            <span className="text-purple-400 font-bold text-[10px]">03</span>
            <strong className="block text-[11px] text-white mt-1">Audit</strong>
            <small className="block text-[10px] text-slate-400">SEO & GEO</small>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300" role="alert">
            {error}
          </div>
        )}

        {requiresProvider && (
          <Link
            className="block text-center text-xs font-semibold text-purple-400 hover:text-purple-300"
            href="/settings/credits"
          >
            Connect provider &rarr;
          </Link>
        )}

        <button
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 disabled:opacity-50 cursor-pointer"
          type="submit"
          disabled={pending}
        >
          <span>{pending ? "Starting secure audit…" : additional ? "Add and analyze company" : "Analyze my company"}</span>
          <span>&rarr;</span>
        </button>

        <p className="text-center text-[11px] text-slate-500">
          Usually takes 1–3 minutes. Progress is saved if you leave this page.
        </p>
      </form>
    </div>
  );
}
