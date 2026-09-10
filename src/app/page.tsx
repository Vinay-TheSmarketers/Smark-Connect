import { currentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SmarkHeroSection } from "@/components/ui/hero-section";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Layers,
  Search,
  Users,
  Compass,
  FileText,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  Globe,
  Lock,
} from "lucide-react";

export default async function Home() {
  const user = await currentUser();

  // If user is authenticated, route into onboarding or dashboard
  if (user) {
    if (!user.llmVerifiedAt) redirect("/onboarding/ai");
    const company = await db.company.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        auditJobs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!company) redirect("/onboarding/company");
    if (company.status !== "ACTIVE" && company.auditJobs[0]) {
      redirect(`/onboarding/audit/${company.auditJobs[0].id}`);
    }
    redirect(`/dashboard/${company.id}`);
  }

  // Complete React Landing Page for visitors
  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0f] font-sans text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Sticky Main Menu Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#0a0a0f]/85 px-6 backdrop-blur-xl md:px-12">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-md shadow-purple-500/30 transition-transform group-hover:scale-105">
              <span className="size-2 rounded-full bg-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">Smark Connect</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a href="#insights" className="transition-colors hover:text-white">
            Insights
          </a>
          <a href="#comparison" className="transition-colors hover:text-white">
            Compare
          </a>
          <Link href="/pricing" className="transition-colors hover:text-white">
            Pricing
          </Link>
          <Link href="/docs" className="transition-colors hover:text-white">
            Docs
          </Link>
        </nav>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
          >
            Sign In
          </Link>
          <Link
            href="/onboarding"
            className="hidden rounded-xl bg-purple-600 px-4.5 py-2 text-xs font-semibold text-white shadow-md shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95 sm:inline-flex"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="pt-16">
        <SmarkHeroSection />
      </div>

      {/* The Paradigm Shift Section */}
      <section id="features" className="relative border-t border-white/10 bg-[#0c0c14] py-24 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
            THE PARADIGM SHIFT
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Why isolated ChatGPT prompts
            <br />
            <span className="text-purple-300 font-serif italic">fail enterprise growth teams</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
            When marketing teams rely on standalone AI prompts, each team member inputs different context. The result is brand voice drift, contradictory messaging, and fragmented agency reporting. Smark Connect enforces a unified evidence foundation.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 text-left">
            {/* Card 1 */}
            <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-lg transition-all duration-300 hover:border-purple-500/40 hover:bg-white/[0.05]">
              <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Shield className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Unified Company Ground Truth</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Single-prompt AI assistants lose brand voice within 3 turns. Smark Connect builds a 20-page web topology baseline so all 12 specialist agents execute from the exact same company truth.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-lg transition-all duration-300 hover:border-indigo-500/40 hover:bg-white/[0.05]">
              <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Zap className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Vector Synthesis Engine</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Generative Engine Optimization (GEO) requires optimizing for LLM vector resolution rather than blue keyword links. Smark Connect extracts machine-readable entity nodes that rank inside ChatGPT and Perplexity.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-lg transition-all duration-300 hover:border-purple-500/40 hover:bg-white/[0.05]">
              <div className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Layers className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Sure-Shot Recommendations</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Trained on high-dimensional marketing frameworks and B2B growth models. Replaces ambiguous dashboard interpretation with high-confidence, prioritized action items.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8-Layer Architecture Grid */}
      <section className="border-t border-white/10 bg-[#09090e] py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
              8-LAYER INFORMATION CAPTURE
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              From raw URL to deterministic strategy
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              Our automated crawler processes your web footprint across 8 specialized layers to assemble a single source of marketing truth.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { id: "01", title: "Network Baseline", desc: "HTTP response timing, TTFB latency, server geography, and asset delivery speeds." },
              { id: "02", title: "Entity Graph", desc: "Structured JSON-LD schema extraction, entity clarity scoring, and AI bot accessibility." },
              { id: "03", title: "Technical Audit", desc: "Self-hosted Lighthouse Core Web Vitals (FCP, LCP, TBT, CLS) and crawl architecture." },
              { id: "04", title: "Competitor Whitespace", desc: "True competitor identification, positioning matrix, and messaging whitespace." },
              { id: "05", title: "Audience ICP", desc: "ICP profiling, buying job identification (JTBD), and objection mapping." },
              { id: "06", title: "Content Topology", desc: "Content inventory, pillar cluster mapping, and 90-day editorial gap roadmap." },
              { id: "07", title: "Live Intent Signals", desc: "100-point social intent lead discovery across Reddit, X, and LinkedIn." },
              { id: "08", title: "CMO Action Plan", desc: "Cross-analysis synthesis returning prioritized 30/60/90-day execution roadmaps." },
            ].map((layer) => (
              <div
                key={layer.id}
                className="rounded-xl border border-white/8 bg-white/[0.02] p-5 transition-all hover:border-purple-500/30 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between text-xs font-mono text-purple-400">
                  <span>LAYER {layer.id}</span>
                  <span className="size-1.5 rounded-full bg-purple-500" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-white">{layer.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{layer.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 Core Connected Analyses */}
      <section className="border-t border-white/10 bg-[#0c0c14] py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
              CONNECTED INTELLIGENCE
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              The 6 Connected Core Analyses
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              Each report covers a distinct strategic dimension while sharing evidence with the others.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: FileText, title: "Company Intelligence", detail: "Offer stack categorization, brand voice parameters, proof ladder architecture, and buyer objections rebuttal." },
              { icon: Search, title: "SEO Technical Audit", detail: "Core Web Vitals health score, heading hierarchy validation, internal link topology, and orphaned page detection." },
              { icon: Globe, title: "GEO & AI Visibility", detail: "AI citation placement depth in ChatGPT and Perplexity, entity clarity scoring, and AI crawler access directives." },
              { icon: Compass, title: "Competitor Whitespace", detail: "True market competitor identification, messaging whitespace isolation, and competitive SWOT breakdowns." },
              { icon: Users, title: "Audience & Personas", detail: "ICP profile segmentation, Jobs-To-Be-Done (JTBD) triggers, and functional procurement risk mapping." },
              { icon: BarChart3, title: "Content Strategy", detail: "Content inventory across funnel stages, pillar topic clusters, and a prioritized 90-day editorial roadmap." },
            ].map((report, idx) => {
              const Icon = report.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md transition-all hover:border-purple-500/40"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">{report.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{report.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 12 Specialist Agents Grid */}
      <section className="border-t border-white/10 bg-[#09090e] py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
              ON-DEMAND EXECUTION
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              12 Specialist Execution Agents
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              Grounded in the same company truth. No briefing, no context drift.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              "SEO Agent", "GEO Agent", "Content Agent", "X (Twitter) Agent",
              "LinkedIn Agent", "Reddit Agent", "Instagram Agent", "Email Agent",
              "YouTube Agent", "Creative Agent", "Competitor Agent", "Outbound Lead Agent",
            ].map((agent, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4 transition-all hover:border-purple-500/30 hover:bg-white/[0.05]"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-xs font-bold text-purple-300">
                  <Bot className="size-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">{agent}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge & Case Studies Bento Grid */}
      <section id="insights" className="border-t border-white/10 bg-[#0c0c14] py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
              RESEARCH & BENCHMARKS
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Insights, Research &amp; Proven Playbooks
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
              Quantitative data and operational frameworks on modern generative engine optimization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-black/60 p-7 backdrop-blur-lg">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-purple-500/20 px-3 py-1 text-[10px] font-bold text-purple-300 uppercase">Featured Whitepaper</span>
                <span className="text-xs text-purple-400 font-semibold">+310% AI Citation Index</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">The Shift from Search to Synthesis: Benchmarking GEO in 2026</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Quantitative research analyzing how ChatGPT, Perplexity, Claude, and Gemini resolve brand authority compared to legacy search engines, introducing our 8-layer entity clarity framework.
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
                <span>0.84 Vector Correlation</span>
                <Link href="/docs" className="text-purple-300 font-semibold hover:underline inline-flex items-center gap-1">
                  Read whitepaper <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-lg">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-slate-500/20 px-3 py-1 text-[10px] font-bold text-slate-300 uppercase">Intent Playbook</span>
                <span className="text-xs text-slate-300 font-semibold">100-Pt Lead Scale</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Commercial Intent Lead Mining: Scoring Social Signals into B2B Pipeline</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Operational guide for tracking active buying intent across Reddit, X, and LinkedIn. Learn how 100-point intent algorithms isolate qualified buyers before form fills.
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
                <span>90+ Pts Priority Outbound</span>
                <Link href="/docs" className="text-purple-300 font-semibold hover:underline inline-flex items-center gap-1">
                  Read playbook <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section id="comparison" className="border-t border-white/10 bg-[#09090e] py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
              PLATFORM COMPARISON
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Why growth leaders choose Smark Connect
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04] text-slate-300">
                  <th className="p-4 font-semibold">Capability Area</th>
                  <th className="p-4 font-bold text-purple-400 bg-purple-500/10 border-x border-purple-500/20">Smark Connect</th>
                  <th className="p-4 font-semibold">Legacy SEO Tools</th>
                  <th className="p-4 font-semibold">Standalone Prompts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-400">
                <tr>
                  <td className="p-4 font-medium text-white">20-Page Web Grounding Baseline</td>
                  <td className="p-4 font-bold text-white bg-purple-500/5 border-x border-purple-500/20">✓ Yes (Automated)</td>
                  <td className="p-4">✗ Keyword list only</td>
                  <td className="p-4">✗ Manual copy-paste</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Generative Engine Optimization (GEO)</td>
                  <td className="p-4 font-bold text-white bg-purple-500/5 border-x border-purple-500/20">✓ Full Entity Clarity</td>
                  <td className="p-4">✗ Legacy SERP only</td>
                  <td className="p-4">✗ Unverified advice</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">12 Specialist Agents in Brand Voice</td>
                  <td className="p-4 font-bold text-white bg-purple-500/5 border-x border-purple-500/20">✓ Shared Context (0% Drift)</td>
                  <td className="p-4">✗ No execution agents</td>
                  <td className="p-4">✗ Voice drifts in 3 turns</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Live B2B Intent Mining (Reddit, X, LinkedIn)</td>
                  <td className="p-4 font-bold text-white bg-purple-500/5 border-x border-purple-500/20">✓ 100-Point Algorithm</td>
                  <td className="p-4">✗ Not supported</td>
                  <td className="p-4">✗ Manual searching</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Board-Ready PDF, PPTX, XLSX Exports</td>
                  <td className="p-4 font-bold text-white bg-purple-500/5 border-x border-purple-500/20">✓ One-Click Sourced Bundles</td>
                  <td className="p-4">✗ Raw CSV dumps</td>
                  <td className="p-4">✗ Markdown only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Teaser Section */}
      <section className="border-t border-white/10 bg-[#0c0c14] py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
            SIMPLE PRICING
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            One plan. <em className="font-serif italic font-normal text-purple-300">Everything included.</em>
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            No feature gating. No per-seat charges. Every workspace gets the full platform.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 text-left">
            {/* Monthly Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-slate-400">MONTHLY</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$59</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">Ideal for teams testing new company scans month-to-month.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  {["Six evidence-led analyses", "AI CMO cross-document synthesis", "12+ specialist agents on demand", "PDF, PPTX, XLSX exports", "2M token workspace budget"].map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-purple-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/onboarding"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 text-xs font-semibold text-white transition-all hover:bg-white/10"
                >
                  Start monthly
                </Link>
                <p className="mt-2 text-center text-[11px] text-slate-500">Cancel any time. No lock-in.</p>
              </div>
            </div>

            {/* Annual Card */}
            <div className="rounded-2xl border border-purple-500/50 bg-gradient-to-b from-purple-950/20 to-white/[0.04] p-8 backdrop-blur-md shadow-xl shadow-purple-950/20 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-4 right-4 rounded-full bg-purple-600 px-3 py-0.5 text-[10px] font-bold text-white">
                SAVE 44%
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider text-purple-300">ANNUAL (RECOMMENDED)</span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$399</span>
                  <span className="text-xs text-slate-400">/ year</span>
                </div>
                <p className="mt-2 text-xs text-purple-200/80">That&apos;s $33/month, billed annually. Saves $309 per year.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  {["Everything in Monthly", "Priority crawler queue", "Unlimited company workspaces", "Self-hosted Lighthouse audits", "Bring your own AI key"].map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-purple-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/onboarding"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-white text-xs font-semibold text-black shadow-lg transition-all hover:bg-slate-200"
                >
                  Start annual
                </Link>
                <p className="mt-2 text-center text-[11px] text-slate-400">Full platform included. 30-day guarantee.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="border-t border-white/10 bg-[#07070a] py-24 px-6 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
            YOUR NEXT MOVE IS IN THE DATA
          </span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Give your marketing
            <br />
            <em className="font-serif italic font-normal text-purple-300">direction.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
            Connect your website. Build your company intelligence. Let an AI CMO and twelve specialist agents do the rest.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/onboarding"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 text-sm font-semibold text-white shadow-xl shadow-purple-600/30 transition-all hover:brightness-110 active:scale-95"
            >
              <span>Start with your website</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Standard Footer */}
      <footer className="border-t border-white/10 bg-[#050508] py-12 px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="flex size-6 items-center justify-center rounded-full bg-purple-600">
              <span className="size-1.5 rounded-full bg-white" />
            </div>
            <span className="font-bold text-slate-300">Smark Connect</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-300">Features</a>
            <a href="#insights" className="hover:text-slate-300">Insights</a>
            <Link href="/pricing" className="hover:text-slate-300">Pricing</Link>
            <Link href="/docs" className="hover:text-slate-300">Docs</Link>
            <Link href="/login" className="hover:text-slate-300">Sign In</Link>
          </div>
          <p>&copy; 2026 Smark Connect. AI-Powered Marketing Intelligence.</p>
        </div>
      </footer>
    </div>
  );
}
