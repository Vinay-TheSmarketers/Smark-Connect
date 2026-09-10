import * as React from "react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050508] py-12 px-6">
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center rounded-full bg-purple-600">
            <span className="size-1.5 rounded-full bg-white" />
          </div>
          <span className="font-bold text-slate-300">Smark Connect</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/#features" className="transition-colors hover:text-slate-300">
            Features
          </Link>
          <Link href="/#insights" className="transition-colors hover:text-slate-300">
            Insights
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-slate-300">
            Pricing
          </Link>
          <Link href="/docs" className="transition-colors hover:text-slate-300">
            Docs
          </Link>
          <Link href="/login" className="transition-colors hover:text-slate-300">
            Sign In
          </Link>
        </div>
        <p>&copy; 2026 Smark Connect. AI-Powered Marketing Intelligence.</p>
      </div>
    </footer>
  );
}
