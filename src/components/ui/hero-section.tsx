"use client";

import * as React from "react";
import { ArrowRight, Sparkles, Shield, Cpu, Lock, Search } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SonarGrid } from "@/components/ui/sonar-grid";

export interface SmarkHeroProps {
  eyebrow?: string;
  headline?: string;
  headlineEm?: string;
  subline?: string;
  defaultUrl?: string;
  onStartAnalysis?: (url: string) => void;
  className?: string;
}

export function SmarkHeroSection({
  eyebrow = "AI-POWERED MARKETING INTELLIGENCE",
  headline = "Your marketing has a new",
  headlineEm = "command center.",
  subline = "Transform raw web data into evidence-led growth priorities. One URL in, six connected analyses out.",
  defaultUrl = "",
  onStartAnalysis,
  className = "",
}: SmarkHeroProps) {
  const [url, setUrl] = React.useState(defaultUrl);
  const reduce = useReducedMotion();

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: delay * 0.4, ease: [0.22, 1, 0.36, 1] as const },
        };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = url.trim();
    if (trimmed) {
      if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = `https://${trimmed}`;
      }
      if (onStartAnalysis) {
        onStartAnalysis(trimmed);
      } else {
        window.location.href = `/onboarding?url=${encodeURIComponent(trimmed)}`;
      }
    }
  };

  const handleQuickFill = (domain: string) => {
    const formatted = `https://${domain}`;
    setUrl(formatted);
  };

  return (
    <SonarGrid
      id="smark-hero-sonar"
      ringWidth={95}
      speed={250}
      amplitude={2.3}
      pingEvery={2.8}
      interactive={true}
      spacing={26}
      dotRadius={1.3}
      baseOpacity={0.2}
      color="#c084fc"
      pingArea={[0.2, 0.15, 0.8, 0.7]}
      className={`relative flex min-h-[88vh] w-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0f] text-slate-100 ${className}`}
    >
      {/* Radial soft background wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(139,44,224,0.14)_0%,transparent_100%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        {/* Sonar Radar Live Pill */}
        <motion.div
          {...enter(0)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-4 py-1.5 text-[11px] font-semibold tracking-wider text-purple-200 backdrop-blur-md shadow-[0_0_20px_rgba(139,44,224,0.25)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          <span>SONAR RADAR ACTIVE &bull; CLICK ANYWHERE TO PING</span>
        </motion.div>

        {/* Eyebrow Kicker */}
        <motion.div
          {...enter(0.04)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold tracking-wider text-slate-300 backdrop-blur-md"
        >
          <Sparkles className="size-3.5 text-purple-400" />
          <span>{eyebrow}</span>
        </motion.div>

        {/* H1 Main Title */}
        <motion.h1
          {...enter(0.1)}
          className="max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[76px] leading-[1.06]"
        >
          {headline}
          <br />
          <em className="font-serif italic font-normal text-purple-300">
            {headlineEm}
          </em>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...enter(0.18)}
          className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg md:text-xl"
        >
          {subline}
        </motion.p>

        {/* Interactive URL Search Form */}
        <motion.form
          {...enter(0.26)}
          onSubmit={handleSubmit}
          className="mt-10 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Search className="size-4.5" />
            </div>
            <input
              type="text"
              autoComplete="url"
              spellCheck={false}
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your website URL (e.g. stripe.com)"
              className="h-13 w-full rounded-2xl border border-white/12 bg-white/[0.05] pl-11 pr-5 text-sm text-white placeholder-slate-400 backdrop-blur-xl outline-none transition-all duration-200 focus:border-purple-500/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <button
            type="submit"
            className="group inline-flex h-13 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] px-7 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all duration-300 hover:bg-right active:scale-[0.98]"
          >
            <span>Start analysis</span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </motion.form>

        {/* Quick Fill Suggestions */}
        <motion.div
          {...enter(0.32)}
          className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400"
        >
          <span>Try:</span>
          {["stripe.com", "linear.app", "ramp.com"].map((domain) => (
            <button
              key={domain}
              type="button"
              onClick={() => handleQuickFill(domain)}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 transition-colors hover:border-purple-500/40 hover:text-white"
            >
              {domain}
            </button>
          ))}
          <span className="hidden sm:inline">&bull; 3-minute analysis</span>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          {...enter(0.38)}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 border-t border-white/8 pt-8 text-xs font-medium text-slate-400 sm:gap-8"
        >
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-purple-400" />
            <span>Bring your own AI key</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-purple-400" />
            <span>Evidence-led, not invented</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-purple-400" />
            <span>Your data stays yours</span>
          </div>
        </motion.div>
      </div>
    </SonarGrid>
  );
}

export default SmarkHeroSection;
