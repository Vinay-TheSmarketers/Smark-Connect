"use client";

import * as React from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getAllBlogs, getAllCategories, BlogPost } from "@/lib/blogs";
import { 
  Search, 
  ArrowRight, 
  Clock, 
  Sparkles, 
  ExternalLink, 
  BookOpen, 
  TrendingUp, 
  Layers, 
  ShieldCheck,
  CheckCircle2,
  Filter
} from "lucide-react";

export default function BlogIndexPage() {
  const allPosts = React.useMemo(() => getAllBlogs(), []);
  const categories = React.useMemo(() => ["All", ...getAllCategories()], []);

  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const filteredPosts = React.useMemo(() => {
    return allPosts.filter((post) => {
      const matchesCat =
        selectedCategory === "All" ||
        post.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesCat;

      const matchesQuery =
        post.title.toLowerCase().includes(query) ||
        post.summary.toLowerCase().includes(query) ||
        post.author.toLowerCase().includes(query) ||
        post.metric.toLowerCase().includes(query) ||
        post.tags.some((t) => t.toLowerCase().includes(query));

      return matchesCat && matchesQuery;
    });
  }, [allPosts, selectedCategory, searchQuery]);

  const featuredPost = allPosts[0];

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 font-sans selection:bg-purple-600/30 selection:text-white">
      {/* Top Header */}
      <SiteHeader activeNav="blog" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6 sm:px-8 lg:px-12 border-b border-white/10 overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-purple-600/20 via-indigo-600/10 to-transparent blur-3xl" 
        />

        <div className="mx-auto max-w-5xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-4 py-1.5 text-xs font-semibold text-purple-300 backdrop-blur-md mb-6 shadow-inner">
            <span className="flex size-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="tracking-wide">AI MARKETING & GEO RESEARCH LAB</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Evidence for the{" "}
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-white bg-clip-text text-transparent">
              Generative Search Era
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            16 in-depth architectural whitepapers, vector citation benchmarks, and marketing frameworks for enterprise growth teams and AI CMOs.
          </p>

          {/* Search & Filter Bar */}
          <div className="mt-10 max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search across 16 articles, metrics, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-white/15 bg-white/[0.04] text-sm text-white placeholder-slate-500 backdrop-blur-md focus:outline-none focus:border-purple-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white hover:border-white/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Whitepaper Card (Shown when not filtering or when matches) */}
      {!searchQuery && selectedCategory === "All" && (
        <section className="py-12 px-6 sm:px-8 lg:px-12 border-b border-white/10">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-purple-400">
              <Sparkles className="size-4" />
              <span>FEATURED RESEARCH BENCHMARK</span>
            </div>

            <div className="relative rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-950/30 via-white/[0.02] to-transparent p-8 md:p-12 backdrop-blur-xl shadow-2xl overflow-hidden group">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                      <span className="rounded-full bg-purple-500/20 px-3 py-1 font-semibold text-purple-300 border border-purple-500/30">
                        {featuredPost.category}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="size-3.5" />
                        {featuredPost.readTime}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-snug group-hover:text-purple-200 transition-colors">
                      <Link href={`/blog/${featuredPost.slug}`}>
                        {featuredPost.title}
                      </Link>
                    </h2>

                    <p className="mt-4 text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-2xl">
                      {featuredPost.summary}
                    </p>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-6 pt-6 border-t border-white/10">
                    <div>
                      <p className="text-xs font-bold text-white">{featuredPost.author}</p>
                      <p className="text-[11px] text-slate-400">{featuredPost.authorRole}</p>
                    </div>

                    <div className="rounded-xl border border-purple-500/30 bg-purple-950/40 px-3.5 py-1.5">
                      <span className="text-[10px] uppercase font-bold text-purple-400 block">KEY FINDING</span>
                      <span className="text-xs font-bold text-white">{featuredPost.metric}</span>
                    </div>

                    <Link
                      href={`/blog/${featuredPost.slug}`}
                      className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black transition-all hover:bg-purple-100 active:scale-95 shadow-lg"
                    >
                      <span>Read Whitepaper</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Telemetry Visual Snippet */}
                <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-black/60 p-5 font-mono text-[11px] text-slate-300 shadow-inner">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-purple-400">
                    <span className="flex items-center gap-1.5 font-bold">
                      <TrendingUp className="size-3.5" />
                      LLM CITATION BENCHMARK
                    </span>
                    <span className="text-[10px] text-slate-500">2026 AUDIT</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Keyword SEO</span>
                        <span>14%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10">
                        <div className="h-1.5 rounded-full bg-rose-500" style={{ width: "14%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Basic Schema</span>
                        <span>38%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10">
                        <div className="h-1.5 rounded-full bg-amber-500" style={{ width: "38%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-purple-300 font-bold mb-1">
                        <span>Smark 8-Layer Graph</span>
                        <span>89% (+535%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10">
                        <div className="h-1.5 rounded-full bg-purple-500" style={{ width: "89%" }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Source: Perplexity & ChatGPT Data</span>
                    <span className="text-emerald-400">Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Catalog Grid of Articles */}
      <section className="py-16 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white">
                {selectedCategory === "All" ? "All Research Articles" : selectedCategory}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Showing {filteredPosts.length} peer-reviewed marketing intelligence papers
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="size-3.5 text-purple-400" />
              <span>High-DR Citations Included</span>
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
              <BookOpen className="size-8 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No articles found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your search query or selecting a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md hover:border-purple-500/40 hover:bg-white/[0.04] transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header meta */}
                    <div className="flex items-center justify-between gap-2 mb-3 text-[11px]">
                      <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-medium text-purple-300">
                        {post.category.split("/")[0].trim()}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="size-3" />
                        {post.readTime}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors leading-snug line-clamp-2">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h3>

                    {/* Summary */}
                    <p className="mt-2.5 text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {post.summary}
                    </p>

                    {/* Primary Metric Pill */}
                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-950/30 px-2.5 py-1 text-[11px] font-medium text-purple-300">
                      <TrendingUp className="size-3 text-purple-400" />
                      <span className="truncate max-w-[240px]">{post.metric}</span>
                    </div>

                    {/* External Citations Pill Preview */}
                    {post.externalCitations && post.externalCitations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-400">
                        <ShieldCheck className="size-3 text-emerald-400" />
                        <span className="truncate">
                          Cited sources: {post.externalCitations.map((c) => c.source.split(" ")[0]).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200 text-[11px]">{post.author}</p>
                      <p className="text-[10px] text-slate-500">{post.date}</p>
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 group-hover:text-purple-300 transition-colors"
                    >
                      <span>Read</span>
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Conversion Banner */}
      <section className="border-t border-white/10 bg-[#090910] py-20 px-6 sm:px-8 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
            APPLY THESE FRAMEWORKS TO YOUR DOMAIN
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Audit your brand across{" "}
            <span className="text-purple-300">6 core intelligence reports.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-400">
            Connect your URL in seconds. Get deterministic LLM vector visibility, competitor whitespace, and 12 execution agents.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/onboarding"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-7 text-xs font-semibold text-white shadow-xl shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95"
            >
              <span>Scan Your Company Website</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Liquid Glass Footer without background */}
      <SiteFooter />
    </div>
  );
}
