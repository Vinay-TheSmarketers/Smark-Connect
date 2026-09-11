import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAllBlogs, getBlogBySlug, getRelatedBlogs, BlogPost } from "@/lib/blogs";
import { 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  TrendingUp, 
  ExternalLink, 
  ShieldCheck, 
  Share2, 
  CheckCircle2,
  Bookmark,
  Sparkles
} from "lucide-react";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const blogs = getAllBlogs();
  return blogs.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  if (!post) {
    return {
      title: "Article Not Found | Smark Connect Blog",
    };
  }
  return {
    title: `${post.title} | Smark Connect Research`,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogBySlug(slug);

  if (!post) {
    notFound();
  }

  const related = getRelatedBlogs(post.slug, 3);

  const sections = post.content.split(/\n(?=###?\s+)/);

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 font-sans selection:bg-purple-600/30 selection:text-white">
      {/* Top Header */}
      <SiteHeader activeNav="blog" />

      <main className="relative pt-28 pb-20">
        {/* Subtle Ambient Radial Glow */}
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl" 
        />

        <article className="relative z-10 mx-auto max-w-4xl px-6 sm:px-8">
          {/* Breadcrumb & Back */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-8 pb-4 border-b border-white/10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Research Hub</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300 border border-purple-500/30">
                {post.category.split("/")[0].trim()}
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="size-3" />
                {post.readTime}
              </span>
            </div>
          </div>

          {/* Article Header */}
          <header className="mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-950/30 px-3.5 py-1 text-[11px] font-semibold text-purple-300 mb-4">
              <Sparkles className="size-3 text-purple-400" />
              <span>PEER-REVIEWED AI MARKETING PAPER</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {post.title}
            </h1>

            {/* Author & Meta Box */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 font-bold text-white shadow-md text-sm">
                  {post.author
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{post.author}</h3>
                  <p className="text-xs text-slate-400">{post.authorRole}</p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  TARGET AUDIENCE
                </span>
                <span className="text-xs text-slate-300 font-medium">{post.targetAudience}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Published {post.date}</span>
              </div>
            </div>

            {/* Key Metric Banner */}
            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-transparent p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block">
                    BENCHMARK METRIC
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white">
                    {post.metric}
                  </span>
                </div>
              </div>
              <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                Verified Benchmark
              </span>
            </div>
          </header>

          {/* Executive Summary Callout */}
          <div className="mb-12 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-6 md:p-8 backdrop-blur-md">
            <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3 flex items-center gap-2">
              <Bookmark className="size-3.5" />
              <span>EXECUTIVE SUMMARY & CORE THESIS</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-slate-200">
              {post.summary}
            </p>
          </div>

          {/* High-DR Authoritative Citations & Outbound Links */}
          {post.externalCitations && post.externalCitations.length > 0 && (
            <div className="mb-12 rounded-2xl border border-white/15 bg-white/[0.02] p-6 md:p-8 backdrop-blur-md">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Authoritative Research & High-DR Citations
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {post.externalCitations.length} Verified Outbound References
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                The technical claims in this whitepaper align with industry benchmarks and methodology standards published by leading search intelligence institutes and SEO authorities:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {post.externalCitations.map((cite, i) => (
                  <a
                    key={i}
                    href={cite.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-purple-500/40 hover:bg-white/[0.06] group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-purple-400">{cite.source}</span>
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-300">
                          DR {cite.highDrScore}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                        {cite.title}
                      </h4>
                      <p className="mt-2 text-[10px] text-slate-400 line-clamp-2">
                        {cite.relevance}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-1 text-[10px] text-purple-400 font-semibold group-hover:text-purple-300">
                      <span>View Outbound Source</span>
                      <ExternalLink className="size-3" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Full Article Content */}
          <div className="prose prose-invert max-w-none space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
            {sections.map((section, idx) => {
              const trimmed = section.trim();
              if (!trimmed) return null;

              if (trimmed.startsWith("### ")) {
                const headingMatch = trimmed.match(/^###\s+([^\n]+)/);
                const title = headingMatch ? headingMatch[1] : "";
                const body = trimmed.replace(/^###\s+[^\n]+\n?/, "");

                return (
                  <section key={idx} className="pt-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 tracking-tight border-b border-white/10 pb-2">
                      {title}
                    </h2>
                    <div className="whitespace-pre-line leading-relaxed text-slate-300">
                      {body}
                    </div>
                  </section>
                );
              }

              if (trimmed.startsWith("#### ")) {
                const headingMatch = trimmed.match(/^####\s+([^\n]+)/);
                const title = headingMatch ? headingMatch[1] : "";
                const body = trimmed.replace(/^####\s+[^\n]+\n?/, "");

                return (
                  <section key={idx} className="pt-4">
                    <h3 className="text-lg font-bold text-purple-200 mb-3 tracking-tight">
                      {title}
                    </h3>
                    <div className="whitespace-pre-line leading-relaxed text-slate-300">
                      {body}
                    </div>
                  </section>
                );
              }

              if (trimmed.startsWith("```")) {
                return (
                  <pre
                    key={idx}
                    className="overflow-x-auto rounded-2xl border border-white/15 bg-[#050508] p-5 text-xs sm:text-sm font-mono text-purple-200 shadow-xl"
                  >
                    <code>{trimmed.replace(/^```[a-z]*\n?|```$/g, "")}</code>
                  </pre>
                );
              }

              return (
                <div key={idx} className="whitespace-pre-line leading-relaxed text-slate-300">
                  {trimmed}
                </div>
              );
            })}
          </div>

          {/* Actionable Implementation Checklist Callout */}
          <div className="mt-14 rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-950/40 via-[#0c0c14] to-[#07070a] p-8 sm:p-10 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-400 mb-3">
              <CheckCircle2 className="size-4" />
              <span>ENTERPRISE PLAYBOOK EXECUTION</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              Run this analysis on your own domain in under 3 minutes
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mb-6">
              Smark Connect automatically executes the vector citation audits, entity graphs, and competitor whitespace mining detailed in this article. Bring your own AI key and generate board-ready reports instantly.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/onboarding"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 text-xs font-semibold text-white shadow-xl shadow-purple-600/30 hover:bg-purple-500 transition-all active:scale-95"
              >
                <span>Launch Workspace Setup</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 text-xs font-semibold text-white hover:bg-white/10 transition-all"
              >
                View Plans ($59/mo or $399/yr)
              </Link>
            </div>
          </div>

          {/* Related Articles Carousel / Grid */}
          <div className="mt-16 pt-12 border-t border-white/10">
            <h3 className="text-lg font-bold text-white mb-6">
              Related Marketing Intelligence Whitepapers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((rel) => (
                <div
                  key={rel.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md flex flex-col justify-between hover:border-purple-500/40 hover:bg-white/[0.04] transition-all group"
                >
                  <div>
                    <span className="text-[10px] text-purple-400 font-semibold block mb-1">
                      {rel.category.split("/")[0].trim()}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
                      <Link href={`/blog/${rel.slug}`}>{rel.title}</Link>
                    </h4>
                    <p className="mt-2 text-[11px] text-slate-400 line-clamp-2">
                      {rel.summary}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{rel.readTime}</span>
                    <Link
                      href={`/blog/${rel.slug}`}
                      className="text-purple-400 font-semibold inline-flex items-center gap-0.5 group-hover:text-purple-300"
                    >
                      Read <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </main>

      {/* Stylized Liquid Glass Footer without background */}
      <SiteFooter />
    </div>
  );
}
